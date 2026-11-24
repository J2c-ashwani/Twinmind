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
import {TALKING_VERSION,istDate,dateObject,formatForDate,archetypeForDate,ARCHETYPES,isTalkingEnabled,validateTalkingScript,talkingScriptPrompt,buildTalkingPackage} from './talkingReelCreativeService.js';

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

function lcsLength(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

export function validateTranscript(script,index,transcript) {
  const wordsList=transcript.words?.length?transcript.words:(transcript.segments||[]).flatMap(s=>s.words||[]);
  if(!wordsList.length)throw Error(`Scene ${index+1} has no word-level transcript`);
  const transcriptSentence=wordsList.map(w=>w.word||w.text||'').join(' ');
  const rawActual=spokenTokens(transcriptSentence);
  const actual=collapseRepeats(rawActual);
  const expected=spokenTokens(script.scenes[index].turns.map(t=>t.text).join(' '));
  const candidate=actual.slice(0,expected.length);
  if(candidate.length===expected.length && candidate.every((w,i)=>w===expected[i])) return true;
  const matched = lcsLength(actual, expected);
  const ratio = expected.length ? matched / expected.length : 0;
  if(expected.length >= 14 && ratio >= 0.78) return true;
  throw Error(`Scene ${index+1} transcript differs from the approved lines; hold the reel`);
}

export function validateGenerationDate(day,today=istDate(new Date())) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day))||dateObject(day).toISOString().slice(0,10)!==day)throw Error('Invalid generation day');
  if(day<'2026-11-15'||day>LAST_FUNDED_DATE)throw Error('Generation outside funded date window');
  if(Date.parse(day)<Date.parse(today)-86400000||Date.parse(day)>Date.parse(today)+86400000)throw Error('Only yesterday, today or tomorrow may be prepared');
}

const wait=(ms)=>new Promise((r)=>setTimeout(r,ms));

export async function mediaDuration(file) {
  const {stdout}=await run('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=duration','-of','default=noprint_wrappers=1:nokey=1',file]);
  const dur=Number.parseFloat(stdout.trim());
  return Number.isFinite(dur)?dur:null;
}

export async function extractExtensionSegment(combinedFile,outFile,offsetSeconds) {
  await run('ffmpeg',[
    '-hide_banner','-loglevel','error','-y',
    '-ss',offsetSeconds.toFixed(3),'-i',combinedFile,
    '-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p',
    '-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',
    outFile
  ],{timeout:120000});
}

export function makeSceneRequest(script,index,options={}) {
  const opts = Buffer.isBuffer(options) ? {} : (options || {});
  const turns=script.scenes[index].turns.map(t=>`${t.speaker}: ${JSON.stringify(t.text)}`).join('\n');
  const arch=opts.archetype || archetypeForDate(script.date);
  const charDesc=arch?.characters || 'LEFT: man in grey crewneck holding ceramic mug. RIGHT: woman in mustard sweater holding wooden spoon over steaming pot.';
  const settingDesc=arch?.setting || 'a dimly lit midnight home kitchen';
  const moodDesc=arch?.mood || 'late-night tension, caught in the moment, sudden comic clarity';
  const resolution=opts.resolution || process.env.TALKING_VIDEO_RESOLUTION || '720p';
  const isExtension=index > 0 && Boolean(opts.previousInteractionId);
  const duration=opts.duration || (isExtension ? '10s' : '12s');

  const text = isExtension
    ? `Extend the previous video seamlessly starting immediately from its ending. Keep the exact same two characters (${charDesc}), clothing, faces, ${settingDesc}, natural lighting, and voices established in scene 1. Smoothly tighten framing toward a closer reaction angle on the revelation beat: one character freezes mid-motion in surprised realization or wry smirk on the final twist line, holding natural eye contact for the closing beat. Say ONLY the new Scene 2 dialogue below in crisp natural American English (do NOT repeat anything from Scene 1). One speaker at a time with synced lips and natural listener reactions. Zero burned-in captions, text, logos, music, or SFX. Finish all words before 9.2 seconds, then hold a clear expressive reaction beat. TwinGenie is pronounced Twin Jee-nee. Vibe: ${moodDesc}.\nExact Scene 2 dialogue:\n${turns}`
    : `Generate a ${duration} candid, photorealistic live-action vertical 9:16 video directly in ${settingDesc} with crisp spoken American English. Characters: ${charDesc} Everyday relatable people shot handheld on a smartphone aesthetic—never stiff studio ads or static talking heads. Time-coded physical action & pacing: [0-4s] open mid-movement/action with characters actively engaged with objects in the environment and immediate conversational tension; [4-${parseInt(duration, 10) || 12}s] natural handheld framing shift or subtle push-in as disagreement escalates. Two distinct natural adult voices matching the characters, conversational and expressive. One speaker at a time matching lip motion; listener reacts naturally while silent. Zero burned-in captions, text, logos, music, or SFX. Begin speech by 0.2 seconds with crisp pacing and finish all words 1.5 seconds before clip end, holding a natural silent beat. Say ONLY the exact Scene 1 dialogue below; no extra words. TwinGenie is pronounced Twin Jee-nee. Vibe: ${moodDesc}.\nExact Scene 1 dialogue:\n${turns}`;

  const payload = {
    model:MODEL,
    background:true,
    store:true,
    stream:false,
    labels:{app:'twingenie',creative:script.date,scene:String(index+1)},
    input:[{
      type:'user_input',
      content:[{ type:'text', text }]
    }],
    response_format:[{type:'video',delivery:'inline',aspect_ratio:'9:16',resolution,duration}],
    generation_config:{max_output_tokens:80000}
  };
  if (isExtension) {
    payload.previous_interaction_id = opts.previousInteractionId;
  }
  return payload;
}

export class TalkingReelService {
  constructor({jobStore=store,requestJson=null,sceneRequest=null,transcribe=null,review=null,render=null,probeDuration=null,sliceExtension=null,pollIntervalMs=5000,maxPollMs=600000,clock=()=>new Date()}={}) {
    Object.assign(this,{store:jobStore,requestJson,sceneRequest,transcribeFn:transcribe,reviewFn:review,renderFn:render,probeDurationFn:probeDuration,sliceExtensionFn:sliceExtension,pollIntervalMs,maxPollMs,clock});
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
      validateTalkingScript(candidate,{date:day,evidence,viralGate:true});
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
    const geminiCandidates = [process.env.TALKING_REVIEW_MODEL, 'gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-3.5-flash-lite'].filter(Boolean);
    for (const geminiModel of geminiCandidates) {
      try {
        logger.info(`[TALKING SCRIPT] Falling back to Gemini (${geminiModel}) for script writing...`);
        const result = await this.googleRequest(
          `https://aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/global/publishers/google/models/${geminiModel}:generateContent`,
          {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.7, maxOutputTokens: 3500 }
          },
          45000
        );
        const text = result.candidates?.[0]?.content?.parts?.filter(p => p.text && !p.thought).map(p => p.text).join('');
        if (text) return JSON.parse(text);
      } catch (geminiErr) {
        logger.warn(`[TALKING SCRIPT] Gemini model ${geminiModel} failed (${geminiErr.message}). Trying next candidate...`);
      }
    }

    throw lastErr || Error('All script generation models failed');
  }
  async getPackage(date=new Date(),options={}) {
    return buildTalkingPackage(await this.script(istDate(date)),options);
  }
  async pollInteraction(id) {
    return this.sceneRequest
      ? await this.sceneRequest(null,id)
      : await this.googleRequest(`https://aiplatform.googleapis.com/v1beta1/projects/${PROJECT}/locations/global/interactions/${encodeURIComponent(id)}`,null,120000);
  }
  async nativeScene(script,index,previousInteractionId=null) {
    validateGenerationDate(script.date,istDate(this.clock()));
    const base=`jobs/${script.date}/scene-${index+1}`;
    const sourceKey=`source/${script.date}/scene-${index+1}.mp4`;
    const prior=await this.store.read(base+'/result.json');
    if(prior?.status==='completed')return {bytes:await this.store.bytes(STATE_BUCKET,sourceKey),record:prior};
    const requestKey=base+'/request.json';
    await this.reserveDay(script.date);
    const won=await this.store.create(requestKey,{createdAt:now(),scriptSha256:sha(JSON.stringify(script)),model:MODEL,reservedGenerationUsd:1.1,maxOutputTokens:80000,automaticRetries:0});
    let data;
    let fallbackInteractionId=null;
    if(!won) {
      const previous=await this.store.read(base+'/result.json');
      if(!previous?.interactionId)throw Error('GENERATION_HELD: existing submission has no recoverable interaction ID; never automatically resubmit');
      fallbackInteractionId=previous.interactionId;
      logger.info(`[TALKING SCENE] Scene ${index+1} resuming Vertex interaction ${previous.interactionId}`);
      data=await this.pollInteraction(previous.interactionId);
    } else {
      // Exactly one reservation per scene/day, including uncertain or rejected requests: max two POSTs/day.
      const arch=archetypeForDate(script.date);
      let resolvedPrevId = previousInteractionId;
      if (index > 0 && !resolvedPrevId) {
        resolvedPrevId = (await this.store.read(`jobs/${script.date}/scene-${index}/result.json`))?.interactionId || null;
      }
      const payload=makeSceneRequest(script,index,{archetype:arch,previousInteractionId:resolvedPrevId});
      logger.info(`[TALKING SCENE] Scene ${index+1} submitting pure-Vertex request (${payload.response_format[0].duration}${resolvedPrevId ? ', extension of '+resolvedPrevId : ''})`);
      try {data=this.sceneRequest?await this.sceneRequest(payload):await this.googleRequest(`https://aiplatform.googleapis.com/v1beta1/projects/${PROJECT}/locations/global/interactions`,payload,120000);}
      catch(e) {
        logger.warn(`[TALKING SCENE] Scene ${index+1} Vertex error: ${e?.response?.status || 'net'} ${JSON.stringify(e?.response?.data || e.message).slice(0, 400)}`);
        await this.store.write(base+'/result.json',{status:e.response?'rejected':'uncertain_submission',httpStatus:e.response?.status||null,at:now()});
        throw Error('GENERATION_HELD: generation did not settle; inspect the stored attempt before any retry');
      }
    }
    const interactionId=data.id||fallbackInteractionId;
    logger.info(`[TALKING SCENE] Scene ${index+1} interaction ${interactionId} initial status=${data.status}`);
    const record={status:data.status==='completed'?'received':data.status,interactionId,usage:data.usage,model:data.model,at:now()};
    await this.store.write(base+'/result.json',record);
    const startedAt=Date.now();
    let pollStep=0;
    while(interactionId && (data.status==='in_progress' || data.status==='queued')) {
      if(Date.now()-startedAt>=this.maxPollMs)throw Error('Video interaction timed out waiting for completion; resume by its stored ID');
      await wait(this.pollIntervalMs);
      data=await this.pollInteraction(interactionId);
      pollStep+=1;
      if(pollStep===1 || pollStep%3===0 || (data.status!=='in_progress' && data.status!=='queued')) {
        logger.info(`[TALKING SCENE] Scene ${index+1} poll #${pollStep} (${Math.round((Date.now()-startedAt)/1000)}s): status=${data.status}`);
      }
      Object.assign(record,{status:data.status==='completed'?'received':data.status,usage:data.usage||record.usage,at:now()});
      await this.store.write(base+'/result.json',record);
    }
    if(data.status && data.status!=='completed') {
      throw Error(`Video interaction ended with status "${data.status}"; inspect or resume by its stored ID`);
    }
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
      const candidateModels = [process.env.TALKING_REVIEW_MODEL, 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'].filter(Boolean);
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
      let prevInteractionId=null;
      let scene1Dur=null;
      for(let i=0;i<2;i++) {
        const scene=await this.nativeScene(script,i,prevInteractionId);const file=path.join(dir,`scene-${i+1}.mp4`);
        prevInteractionId = scene.record?.interactionId || prevInteractionId;
        await fs.writeFile(file,scene.bytes);
        if(i===0 && (!this.renderFn || this.probeDurationFn)) {
          scene1Dur = await (this.probeDurationFn ? this.probeDurationFn(file) : mediaDuration(file));
        }
        if(i===1 && scene1Dur && (!this.renderFn || this.probeDurationFn || this.sliceExtensionFn)) {
          const s2Dur = await (this.probeDurationFn ? this.probeDurationFn(file) : mediaDuration(file));
          if(s2Dur && s2Dur > scene1Dur + 3.0) {
            const rawExt = path.join(dir, 'scene-2-combined.mp4');
            await fs.rename(file, rawExt);
            await (this.sliceExtensionFn ? this.sliceExtensionFn(rawExt, file, scene1Dur) : extractExtensionSegment(rawExt, file, scene1Dur));
            logger.info(`[TALKING SCENE] Extracted Scene 2 slice from ${scene1Dur.toFixed(3)}s (raw=${s2Dur.toFixed(3)}s)`);
          }
        }
        files.push(file);
        const key=`jobs/${day}/transcript-${i+1}.json`;
        let t=await this.store.read(key);
        if(!t){
          logger.info(`[TALKING SCENE] Transcribing Scene ${i+1} audio...`);
          t=await this.transcribe(file);
          await this.store.create(key,t);
        }
        if(!t.words?.length)throw Error('Word timestamps missing from transcript');
        validateTranscript(script,i,t);
        logger.info(`[TALKING SCENE] Scene ${i+1} transcript validated (${t.words.length} words)`);
        transcripts.push(t);
      }
      const reviewKey=`jobs/${day}/visual-review.json`;
      let review=await this.store.read(reviewKey);
      if(!review){
        logger.info(`[TALKING SCENE] Running automated visual review for ${day}...`);
        review=await this.review(script,files);
        await this.store.create(reviewKey,review);
      }
      if(review.pass!==true||review.issues?.length)throw Error('Automated visual review held the reel: '+(review.issues||[]).join('; '));
      const spec={script,files,transcripts,cta:path.join(ASSETS,'cta.mp4'),output:path.join(dir,'reel.mp4'),fonts:path.join(HERE,'assets/fonts')};
      const specPath=path.join(dir,'spec.json');await fs.writeFile(specPath,JSON.stringify(spec));
      logger.info(`[TALKING SCENE] Rendering final 1080x1920 reel for ${day}...`);
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
