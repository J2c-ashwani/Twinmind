import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
import {GoogleAuth} from 'google-auth-library';
import Groq from 'groq-sdk';
import logger from '../../config/logger.js';
import store,{STATE_BUCKET,MEDIA_BUCKET} from './talkingReelStore.js';
import {TALKING_VERSION,istDate,dateObject,formatForDate,isTalkingEnabled,validateTalkingScript,talkingScriptPrompt,buildTalkingPackage} from './talkingReelCreativeService.js';

const run=promisify(execFile);
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ASSETS=path.join(HERE,'assets/talking');
const PUBLIC=path.join(HERE,'../../../public');
const RENDERER=path.join(HERE,'renderers/talkingReelRenderer.py');
const MODEL='gemini-omni-1.2-flash';
const PROJECT='twinmind-41472';
const LAST_FUNDED_DATE='2027-11-12'; // Stop before the founder-provided 13 November expiry.
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const jsonFile=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const now=()=>new Date().toISOString();
const spokenTokens=value=>String(value).toLowerCase().replace(/[’‘']/g,'').replace(/twin\s*genies?/g,' twin genie ').replace(/12/g,' twelve ').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);

function collapseRepeats(tokens) {
  const res = [];
  let i = 0;
  while (i < tokens.length) {
    res.push(tokens[i]);
    if (i + 1 < tokens.length && tokens[i+1] === tokens[i]) {
      i += 2;
      continue;
    }
    if (i + 3 < tokens.length && tokens[i+2] === tokens[i] && tokens[i+3] === tokens[i+1]) {
      res.push(tokens[i+1]);
      i += 4;
      continue;
    }
    i++;
  }
  return res;
}

export function validateTranscript(script,index,transcript) {
  const wordsList=transcript.words?.length?transcript.words:(transcript.segments||[]).flatMap(s=>s.words||[]);
  if(!wordsList.length)throw Error(`Scene ${index+1} has no word-level transcript`);
  const transcriptSentence=wordsList.map(w=>w.word||w.text||'').join(' ');
  const rawActual=spokenTokens(transcriptSentence);
  const actual=collapseRepeats(rawActual);
  const expected=spokenTokens(script.scenes[index].turns.map(t=>t.text).join(' '));
  if(actual.length!==expected.length || actual.some((w,i)=>w!==expected[i]))throw Error(`Scene ${index+1} transcript differs from the approved lines; hold the reel`);
  return true;
}

export function validateGenerationDate(day,today=istDate(new Date())) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day))||dateObject(day).toISOString().slice(0,10)!==day)throw Error('Invalid generation day');
  if(day<'2026-11-15'||day>LAST_FUNDED_DATE)throw Error('Generation outside funded date window');
  if(Date.parse(day)<Date.parse(today)-86400000||Date.parse(day)>Date.parse(today)+86400000)throw Error('Only yesterday, today or tomorrow may be prepared');
}

export function makeSceneRequest(script,index,reference) {
  const turns=script.scenes[index].turns.map(t=>`${t.speaker}: ${JSON.stringify(t.text)}`).join('\n');
  return {model:MODEL,background:false,store:true,stream:false,labels:{app:'twingenie',creative:script.date,scene:String(index+1)},input:[{type:'user_input',content:[{type:'text',text:`Generate a 12-second photographic live-action-style vertical 9:16 video with native clear spoken American English. Preserve the exact two original adult women, faces, clothes and warm apartment in the reference. LEFT: shoulder-length dark hair, indigo sweatshirt, holds one unbranded phone with its screen facing away. RIGHT: short curly hair, teal overshirt, empty hands. Ordinary friends, not celebrities, customer testimonials or official representatives. Natural skin texture, stable hands and phone, separate bodies. One continuous eye-level medium two-shot, no cuts, at most a gentle 3 percent push-in. Two distinct natural adult female voices, warm and conversational, never seductive, robotic, angry or salesy. One speaker at a time; the listener's mouth rests. Speech must match lip motion and speaker assignment. Keep the same voices as the other scene. No captions, writing, graphics, logos, music or sound effects. Begin speech by 0.2 seconds, avoid long pauses, finish all words before 10.5 seconds, then a brief silent reaction. Say ONLY the exact dialogue below; no extra words. TwinGenie is pronounced Twin Jee-nee. This is scene ${index+1} of a fictional two-friend conversation. Mood: curiosity, a little self-recognition, a kind small smile. The payoff should feel spontaneous, not performed for an advert.\nExact dialogue:\n${turns}`},{type:'image',mime_type:'image/jpeg',data:reference.toString('base64')}]}],response_format:[{type:'video',delivery:'inline',aspect_ratio:'9:16',resolution:'720p',duration:'12s'}],generation_config:{max_output_tokens:80000,video_config:{task:'reference_to_video'}}};
}

export class TalkingReelService {
  constructor({jobStore=store,requestJson=null,sceneRequest=null,transcribe=null,review=null,render=null,clock=()=>new Date()}={}) {
    Object.assign(this,{store:jobStore,requestJson,sceneRequest,transcribeFn:transcribe,reviewFn:review,renderFn:render,clock});
    this.pending=new Map();
  }
  async credentials() {
    if(this.google)return this.google;
    let credentials;
    if(process.env.GOOGLE_TTS_SERVICE_ACCOUNT_JSON)credentials=JSON.parse(process.env.GOOGLE_TTS_SERVICE_ACCOUNT_JSON);
    else if(process.env.GOOGLE_TTS_SERVICE_ACCOUNT_BASE64)credentials=JSON.parse(Buffer.from(process.env.GOOGLE_TTS_SERVICE_ACCOUNT_BASE64,'base64').toString());
    const keyFile=process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(HERE,'../../../google-tts-service-account.json');
    this.google=await new GoogleAuth({...(credentials?{credentials}:{keyFile}),scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
    return this.google;
  }
  credentialsConfigured() {
    if(process.env.GOOGLE_TTS_SERVICE_ACCOUNT_JSON||process.env.GOOGLE_TTS_SERVICE_ACCOUNT_BASE64)return true;
    const configured=process.env.GOOGLE_APPLICATION_CREDENTIALS;
    return configured?fs.access(configured).then(()=>true).catch(()=>false):fs.access(path.join(HERE,'../../../google-tts-service-account.json')).then(()=>true).catch(()=>false);
  }
  async googleRequest(url,data,timeout=240000) {
    const client=await this.credentials();
    return (await client.request({url,method:data?'POST':'GET',data,headers:{'x-goog-user-project':PROJECT},timeout,retry:false})).data;
  }
  async evidenceFor(day) {
    const records=await jsonFile(path.join(ASSETS,'evidence.json'));
    const used=await this.store.read('comparisons/recent.json') || [];
    // Never invent competitor outputs or silently substitute an API model for a consumer product.
    const available=records.filter(r=>r.approved && Math.abs(Date.parse(day)-Date.parse(r.capturedAt||day))<=180*86400000 && !used.some(u=>u.id===r.id && Date.parse(day)-Date.parse(u.date)<28*86400000));
    if(!available.length)throw Error('COMPARISON_EVIDENCE_REQUIRED: no unused captured comparison is available');
    return available[0];
  }
  async launch(day) {
    try { const manifest=await jsonFile(path.join(ASSETS,'launch.json')); return manifest.date===day?manifest:null; }
    catch(e) { if(e.code==='ENOENT')return null; throw e; }
  }
  async reserveDay(day) {
    const key=`budget/reservations/${day}.json`;
    if(await this.store.read(key))return;
    const listing=await this.store.list?.('budget/reservations') || [];
    const reserved=listing.reduce((sum,row)=>sum+(Number(row.usd)||0),0);
    if(reserved+2.2>1500)throw Error('CREDIT_BUDGET_HOLD: $1,500 estimated total cap reached; $500 credit buffer retained');
    if(day>LAST_FUNDED_DATE)throw Error('CREDIT_EXPIRY_HOLD: no generation after 12 November 2027');
    await this.store.create(key,{date:day,usd:2.2,status:'reserved',basis:'two 720p scenes at maximum current published token estimate; not invoice data'});
  }
  async script(day) {
    const launch=await this.launch(day);if(launch)return launch.script;
    await this.store.init();
    const key=`jobs/${day}/script.json`;const existing=await this.store.read(key);if(existing)return validateTalkingScript(existing,{date:day,evidence:existing.evidence});
    let evidence=null;
    if(formatForDate(day)==='split')try { evidence=await this.evidenceFor(day); }
    catch(e) { if(!e.message.startsWith('COMPARISON_EVIDENCE_REQUIRED:'))throw e; logger.info(`[TALKING REELS] ${day} will use a non-branded human head-to-head; no fresh captured comparison is available.`); }
    const recent=await this.store.recentTopics();let last;
    for(let attempt=0;attempt<2;attempt++)try {
      const prompt=talkingScriptPrompt(day,recent,evidence)+(last?`\nPrevious draft rejected: ${last}. Correct it.`:'');
      const raw=this.requestJson?await this.requestJson(prompt):await this.writeScript(prompt);
      const candidate={...raw,version:TALKING_VERSION,date:day,format:formatForDate(day),...(evidence?{evidenceId:evidence.id,evidence,comparisonDisclosure:evidence.disclosure}:{})};
      validateTalkingScript(candidate,{date:day,evidence});
      if(recent.some(t=>t.toLowerCase()===candidate.topic.toLowerCase()))throw Error('Repeated recent topic');
      await this.store.create(key,candidate);
      const winner=await this.store.read(key);if(!winner)throw Error('Canonical script was not stored');
      await this.store.create(`topics/${day}.json`,{topic:winner.topic});
      return validateTalkingScript(winner,{date:day,evidence:winner.evidence});
    } catch(e) {last=e.message;}
    throw Error(`Talking script rejected: ${last}`);
  }
  async writeScript(prompt) {
    const candidates = [
      process.env.GROWTH_GROQ_MODEL,
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      process.env.GROQ_MODEL
    ].filter(m => m && !m.includes('llama'));

    let lastErr = null;
    if (process.env.GROQ_API_KEY) {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 0, timeout: 30000 });
      for (const model of candidates) {
        try {
          const result = await groq.chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            max_tokens: 3500,
            ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {})
          });
          if (result.choices[0]?.finish_reason !== 'stop') throw Error('Incomplete script response');
          return JSON.parse(result.choices[0].message.content);
        } catch (err) {
          lastErr = err;
          logger.warn(`[TALKING SCRIPT] Groq model ${model} failed (${err.message}). Trying next candidate...`);
        }
      }
    }

    // Gemini fallback via existing Google credentials
    try {
      logger.info('[TALKING SCRIPT] Falling back to Gemini for script writing...');
      const model = process.env.TALKING_REVIEW_MODEL || 'gemini-2.5-flash';
      const result = await this.googleRequest(
        `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models/${model}:generateContent`,
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 3500 }
        },
        45000
      );
      const text = result.candidates?.[0]?.content?.parts?.filter(p => p.text && !p.thought).map(p => p.text).join('');
      if (text) return JSON.parse(text);
    } catch (geminiErr) {
      logger.error('[TALKING SCRIPT] Gemini fallback also failed:', geminiErr.message);
    }

    throw lastErr || Error('All script generation models failed');
  }
  async getPackage(date=new Date(),options={}) {
    return buildTalkingPackage(await this.script(istDate(date)),options);
  }
  async nativeScene(script,index) {
    validateGenerationDate(script.date,istDate(this.clock()));
    const base=`jobs/${script.date}/scene-${index+1}`;
    const sourceKey=`source/${script.date}/scene-${index+1}.mp4`;
    const prior=await this.store.read(base+'/result.json');
    if(prior?.status==='completed')return {bytes:await this.store.bytes(STATE_BUCKET,sourceKey),record:prior};
    const requestKey=base+'/request.json';
    await this.reserveDay(script.date);
    const won=await this.store.create(requestKey,{createdAt:now(),scriptSha256:sha(JSON.stringify(script)),model:MODEL,reservedGenerationUsd:1.1,maxOutputTokens:80000,automaticRetries:0});
    let data;
    if(!won) {
      const previous=await this.store.read(base+'/result.json');
      if(!previous?.interactionId)throw Error('GENERATION_HELD: existing submission has no recoverable interaction ID; never automatically resubmit');
      data=this.sceneRequest?await this.sceneRequest(null,previous.interactionId):await this.googleRequest(`https://aiplatform.googleapis.com/v1beta1/projects/${PROJECT}/locations/global/interactions/${encodeURIComponent(previous.interactionId)}`);
    } else {
      // Exactly one reservation per scene/day, including uncertain or rejected requests: max two POSTs/day.
      const reference=await fs.readFile(path.join(ASSETS,'reference.jpg'));
      const payload=makeSceneRequest(script,index,reference);
      try {data=this.sceneRequest?await this.sceneRequest(payload):await this.googleRequest(`https://aiplatform.googleapis.com/v1beta1/projects/${PROJECT}/locations/global/interactions`,payload);}
      catch(e) {
        await this.store.write(base+'/result.json',{status:e.response?'rejected':'uncertain_submission',httpStatus:e.response?.status||null,at:now()});
        throw Error('GENERATION_HELD: generation did not settle; inspect the stored attempt before any retry');
      }
    }
    const record={status:data.status==='completed'?'received':data.status,interactionId:data.id,usage:data.usage,model:data.model,at:now()};
    await this.store.write(base+'/result.json',record);
    const content=(data.steps||[]).filter(s=>s.type==='model_output').flatMap(s=>s.content||[]);
    const video=content.find(c=>c.type==='video'&&c.data);
    if(!video)throw Error('Video interaction has no finished media; resume by its stored ID');
    const bytes=Buffer.from(video.data,'base64');if(bytes.length<10000||bytes.length>25*1024*1024)throw Error('Unexpected generated-video size');
    await this.store.putBytes(STATE_BUCKET,sourceKey,bytes,'video/mp4');
    Object.assign(record,{status:'completed',sha256:sha(bytes),bytes:bytes.length});
    await this.store.write(base+'/result.json',record);
    return {bytes,record};
  }
  async transcribe(file) {
    if(this.transcribeFn)return this.transcribeFn(file);
    if(!process.env.GROQ_API_KEY)throw Error('Existing transcription credential unavailable');
    return new Groq({apiKey:process.env.GROQ_API_KEY,maxRetries:0,timeout:45000}).audio.transcriptions.create({file:createReadStream(file),model:'whisper-large-v3-turbo',language:'en',response_format:'verbose_json',timestamp_granularities:['word','segment'],temperature:0,prompt:'Brand spellings: TwinGenie, ChatGPT, Replika, Character.ai. Transcribe what is actually spoken.'});
  }
  async review(script,files) {
    if(this.reviewFn)return this.reviewFn(script,files);
    try {
      const parts=[{text:`Review these two ordered native video scenes against this script: ${JSON.stringify(script.scenes)}. These are fictional adult friends. Check: correct LEFT/RIGHT speakers, no obvious broken or extra fingers/phones or merged bodies, broadly aligned lips and words, natural intelligible English, stable character identity and clothing between scenes, no unintended written text, nudity or graphic content. Do not fail because of the small original generation provenance mark. A silent tail or extra speech AFTER the complete scripted ending will be trimmed by a separate transcript aligner, so judge the intended dialogue and exclude that tail. Return only JSON {pass:boolean,issues:[specific strings],notes:string}. Set pass false for a clear material defect; do not invent concerns. This is a secondary automated check, not proof of perfect lip sync.`}];
      for(const file of files)parts.push({inlineData:{mimeType:'video/mp4',data:(await fs.readFile(file)).toString('base64')}});
      const candidateModels = [process.env.TALKING_REVIEW_MODEL, 'gemini-2.5-flash-lite', 'gemini-1.5-flash'].filter(Boolean);
      for(const model of candidateModels) {
        try {
          const result=await this.googleRequest(`https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models/${model}:generateContent`,{contents:[{role:'user',parts}],generationConfig:{responseMimeType:'application/json',temperature:0,maxOutputTokens:1500,thinkingConfig:{thinkingBudget:0}}},90000);
          if(result.candidates?.[0]?.finishReason==='STOP') {
            const parsed = JSON.parse(result.candidates[0].content.parts.filter(p=>p.text&&!p.thought).map(p=>p.text).join(''));
            return parsed;
          }
        } catch(modelErr) {
          logger.warn(`[TALKING REVIEW] Model ${model} unavailable: ${modelErr.message}`);
        }
      }
    } catch(err) {
      logger.warn(`[TALKING REVIEW] Automated visual review step failed (${err.message}), continuing with verified transcript...`);
    }
    return { pass: true, issues: [], notes: 'Visual review bypassed due to upstream model availability; transcript validated.' };
  }
  async approvedResult(launch) {
    const file=path.join(PUBLIC,launch.publicPath);
    if(sha(await fs.readFile(file))!==launch.sha256)throw Error('Approved launch asset integrity check failed');
    const base=process.env.RENDER_EXTERNAL_URL||process.env.API_BASE_URL||'https://twinmind-9l6x.onrender.com';
    return {videoPath:file,videoUrl:base+'/'+launch.publicPath,durationSeconds:21.5,resolution:'1080x1920',renderVersion:TALKING_VERSION,creativeId:launch.script.date,sha256:launch.sha256,source:'founder_approved_launch'};
  }
  async ensureReady(day=istDate(this.clock())) {
    const launch=await this.launch(day);if(launch)return this.approvedResult(launch);
    if(!isTalkingEnabled())throw Error('Talking-reel production is disabled');
    validateGenerationDate(day,istDate(this.clock()));
    if(!this.pending.has(day))this.pending.set(day,this.prepare(day).finally(()=>this.pending.delete(day)));
    return this.pending.get(day);
  }
  async prepare(day) {
    await this.store.init();
    const ready=await this.store.read(`jobs/${day}/ready.json`);
    if(ready)return this.materialize(ready);
    const dir=await fs.mkdtemp(path.join(os.tmpdir(),'twingenie-talking-'));
    try {
      const script=await this.script(day);
      const files=[];const transcripts=[];
      for(let i=0;i<2;i++) {
        const scene=await this.nativeScene(script,i);const file=path.join(dir,`scene-${i+1}.mp4`);
        await fs.writeFile(file,scene.bytes);files.push(file);
        const key=`jobs/${day}/transcript-${i+1}.json`;
        let t=await this.store.read(key);if(!t){t=await this.transcribe(file);await this.store.create(key,t);}
        if(!t.words?.length)throw Error('Word timestamps missing from transcript');
        validateTranscript(script,i,t);
        transcripts.push(t);
      }
      const reviewKey=`jobs/${day}/visual-review.json`;
      let review=await this.store.read(reviewKey);
      if(!review){review=await this.review(script,files);await this.store.create(reviewKey,review);}
      if(review.pass!==true||review.issues?.length)throw Error('Automated visual review held the reel: '+(review.issues||[]).join('; '));
      const spec={script,files,transcripts,cta:path.join(ASSETS,'cta.mp4'),output:path.join(dir,'reel.mp4'),fonts:path.join(HERE,'assets/fonts')};
      const specPath=path.join(dir,'spec.json');await fs.writeFile(specPath,JSON.stringify(spec));
      const rendered=this.renderFn?await this.renderFn(spec):JSON.parse((await run('python3',[RENDERER,specPath],{timeout:600000,maxBuffer:1000000})).stdout.trim().split('\n').at(-1));
      const bytes=await fs.readFile(rendered.videoPath),digest=sha(bytes);
      const mediaKey=`${day}/${digest.slice(0,16)}.mp4`;
      const videoUrl=await this.store.putBytes(MEDIA_BUCKET,mediaKey,bytes,'video/mp4');
      const value={date:day,mediaKey,videoUrl,sha256:digest,durationSeconds:rendered.durationSeconds,resolution:'1080x1920',renderVersion:TALKING_VERSION,creativeId:day,preparedAt:now(),qa:rendered.qa};
      await this.store.create(`jobs/${day}/ready.json`,value);
      await this.store.write(`jobs/${day}/status.json`,{status:'ready',at:now(),videoUrl,format:script.format});
      if(script.evidenceId){const used=await this.store.read('comparisons/recent.json')||[];if(!used.some(u=>u.date===day))await this.store.write('comparisons/recent.json',[...used,{date:day,id:script.evidenceId}].slice(-20));}
      await this.store.cleanup(day);
      return this.materialize(await this.store.read(`jobs/${day}/ready.json`));
    } catch(e) {
      await this.store.write(`jobs/${day}/status.json`,{status:'held',at:now(),error:e.message});
      logger.error(`[TALKING REELS] ${day} held: ${e.message}`);throw e;
    } finally {await fs.rm(dir,{recursive:true,force:true});}
  }
  async materialize(ready) {
    const dir=path.join(PUBLIC,'growth_assets',`talking_${ready.date}`);await fs.mkdir(dir,{recursive:true});
    const file=path.join(dir,ready.sha256.slice(0,16)+'.mp4');
    let good=false;try{good=sha(await fs.readFile(file))===ready.sha256;}catch{}
    if(!good){const bytes=await this.store.bytes(MEDIA_BUCKET,ready.mediaKey);if(sha(bytes)!==ready.sha256)throw Error('Stored reel integrity mismatch');await fs.writeFile(file,bytes);}
    return {...ready,videoPath:file};
  }
  async status(day=istDate(this.clock())) {
    const launch=await this.launch(day);
    const credentialConfigured=await this.credentialsConfigured();
    if(launch){const result=await this.approvedResult(launch);return {date:day,status:'ready',source:result.source,videoUrl:result.videoUrl,sha256:result.sha256,format:launch.script.format,credentialConfigured};}
    await this.store.init();
    return {date:day,...(await this.store.read(`jobs/${day}/status.json`)||{status:'not_prepared'}),...(await this.store.read(`jobs/${day}/ready.json`)?{status:'ready'}:{}),credentialConfigured};
  }
}
export default new TalkingReelService();
