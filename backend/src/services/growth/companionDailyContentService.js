import crypto from 'crypto';
import {execFile} from 'child_process';
import {promisify} from 'util';
const runFile=promisify(execFile);
import {GoogleGenerativeAI} from '@google/generative-ai';
import Groq from 'groq-sdk';
import supabaseAdmin from '../../config/supabase.js';
import logger from '../../config/logger.js';
import {buildSocialPilotPackage, validateCreative} from './reelCreativeService.js';
import {validateLinkedInEditorial} from './linkedinEditorialService.js';

const identity = date => {
  const h=crypto.createHash('sha256').update(`twingenie:daily-companion:${date}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
};
export function companionPrompt(base, recentTopics=[]) {
  return `Write a specific, warm, surprising short video for TwinGenie, an AI companion for everyday adults. It is not only for founders or employees.
Feature today: ${base.featureName}. Feature description: ${base.problem}.
Fixed illustration: ${base.heroAsset}. Write spoken dialogue and overlay text, never camera directions or actions. Nothing in the illustration changes. Do not describe a new place, a smiling AI, or a user action the image cannot show.
Avoid these recent topics and close paraphrases: ${JSON.stringify(recentTopics)}.
Return only JSON with: topic (8–65 chars), hooks (2 specific curiosity hooks about the person’s moment, each <=70 chars and <=9 words; never mention AI, the app, or the brand in the hook), question (<=65 chars and <=10 words), reply (<=90 chars and <=10 words), followupText (user's second message, <=65 chars and <=9 words), payoffText (AI's second reply, <=85 chars and <=10 words), action (<=80 chars), actionTitle (<=60 chars), discussion (one real question <=100 chars), inputText (<=35 chars), narration (6 lines, each <=10 words, all lines together <=45 words).
Hook the viewer with a recognisable tension or unexpected detail. Avoid generic question hooks such as Ever chatted, What if, or Need someone. Start inside the situation. For chat, make one ordinary personal moment turn into a small funny or unexpected exchange. The payoff must be a specific callback or surprising question, never an abstract lesson or slogan about fresh perspectives, personal growth, or embracing anything. Narration is [a short hook <=6 words, question, reply, followupText, payoffText, "TwinGenie. Try one conversation."]. We will use the exact dialogue fields in the final speech and message bubbles. No vague poetic language like gentle pause, soft glow, city sighs, or lights the way.
For other features, narration shows one situation, one illustrative exchange, what the feature does and one modest invitation. Do not list every feature.
Verified features: Life Coach has guided sessions/exercises; perspectives are Normal/Reflective/Honest/Future; mood is self-reported reflection; memory retrieves relevant earlier context; Twin Match compares personality only after an accepted invitation.
For memory include memoryEarlier/memoryLater (<=65 chars each) for two moments of the SAME story. For Twin Match include matchA/matchB (<=45 chars each) for two preferences. Do not include these fields for other features.
No founder anecdotes, testimonials, real-user claims, outcomes, diagnoses, privacy guarantees, competitor claims, statistics, LinkedIn copy or invented features. This is an illustrative conversation. Make the dialogue concise and natural.`;
}

export function normalizeDailyCompanion(raw, base) {
  // Normalize punctuation unsupported by the bundled display font, before deriving speech.
  if(raw)raw=JSON.parse(JSON.stringify(raw).replace(/[\u2010-\u2013]/g,'-').replace(/[\u00a0\u202f]/g,' '));
  if (!raw || typeof raw.topic!=='string' || raw.topic.length>65 || raw.topic.length<8 || !Array.isArray(raw.hooks) || raw.hooks.length!==2) throw new Error('Invalid daily story');
  const fields=['question','reply','action','actionTitle','discussion','inputText','narration','followupText','payoffText','memoryEarlier','memoryLater','matchA','matchB'];
  const allowed=Object.fromEntries(fields.filter(k=>raw[k]!==undefined).map(k=>[k,raw[k]]));
  // Use a model-written editorial only if it is safe and matches the actual exchange.
  // Reviewed feature copy supplies the alternative; invented anecdotes are discarded.
  let editorial;
  try {
    const candidate=validateLinkedInEditorial(raw.linkedinEditorial);
    if(candidate.includes(raw.question) && candidate.includes(raw.reply)) editorial=candidate;
  } catch {}
  const c={...base,...allowed,hooks:raw.hooks,hook:raw.hooks[0],hookVariant:'A',topic:raw.topic,contentSource:'daily_generated'};
  delete c.linkedinEditorial;
  if(editorial)c.linkedinEditorial=editorial;
  // Derive speech and chat bubbles from the same values, eliminating paraphrase drift.
  if(c.editStyle==='dialogue_reveal') c.narration=[raw.hooks[0],raw.question,raw.reply,raw.followupText,raw.payoffText,'TwinGenie. Try one conversation.'];
  if (c.hooks.some(h=>typeof h!=='string' || h.length>90 || h.length<8) || c.hooks[0]===c.hooks[1]) throw new Error('Invalid daily hooks');
  if (/\b(?:AI|TwinGenie)\b/i.test(c.hooks[0])) throw new Error('Hook must start with the human situation');
  for (const [key,max] of Object.entries({question:80,reply:110,action:100,actionTitle:65,discussion:120,inputText:45,followupText:100,payoffText:100,memoryEarlier:100,memoryLater:100,matchA:45,matchB:45})) {
    if (c[key]!==undefined && (typeof c[key]!=='string' || c[key].length>max)) throw new Error(`Invalid daily ${key}`);
  }
  c.sceneTitles=[c.hook,'A moment to talk',c.featureName,c.actionTitle,c.actionTitle,'Try one conversation.'];
  if (!Array.isArray(c.narration) || c.narration.length!==6 || c.narration.some(s=>typeof s!=='string'||s.split(/\s+/).length>12) || c.narration.join(' ').split(/\s+/).length>50) throw new Error('Daily narration too long');
  if (c.feature==='memory' && (!raw.memoryEarlier || !raw.memoryLater)) throw new Error('Missing memory continuity');
  if (c.feature==='twin_match' && (!raw.matchA || !raw.matchB)) throw new Error('Missing comparison details');
  const publicCopy=JSON.stringify([c.hooks,c.question,c.reply,c.narration,c.linkedinEditorial,c.action]);
  if (/\b(?:startup owners?|every founder|entrepreneurs? only|cure|diagnos\w*|guarantee\w*|therapist|100% private|never forgets|rewir\w*|subconscious trigger|instant\w* heal)\b/i.test(publicCopy)) throw new Error('Unsupported daily story claim');
  // No stale social captions or inherited voiceover script may describe a different situation.
  delete c.socialCaption; delete c.threadText;
  c.creativeRevision='daily_'+crypto.createHash('sha256').update(JSON.stringify({...c,creativeRevision:undefined})).digest('hex').slice(0,12);
  return validateCreative(c);
}

export class CompanionDailyContentService {
  constructor({db=supabaseAdmin, requestJson=null,validateLayout=null}={}) {this.db=db;this.requestJson=requestJson;this.pending=new Map();this.validateLayout=validateLayout || (async creative=>{await runFile('python3',[new URL('./renderers/motionReelRenderer.py',import.meta.url).pathname,'--check-layout',JSON.stringify({creative})],{timeout:20000,maxBuffer:1000000});});}
  async _read(id) {
    const {data,error}=await this.db.from('usage_tracking').select('action_type').eq('id',id).maybeSingle();
    if(error) throw new Error('Daily creative store unavailable');
    if(!data?.action_type) return null;
    const prefixEnd=data.action_type.indexOf(':', 'growth_creative:'.length);
    return prefixEnd<0 ? null : JSON.parse(data.action_type.slice(prefixEnd+1));
  }
  async _recent() {
    const {data,error}=await this.db.from('usage_tracking').select('action_type').like('action_type','growth_topic:%').order('created_at',{ascending:false}).limit(60);
    if(error) throw new Error('Recent topic history unavailable');
    return [...new Set((data||[]).map(r=>r.action_type.slice('growth_topic:'.length)))];
  }
  async _request(prompt) {
    const failures=[];
    // Prefer the working configured Groq writer. Gemini is an independent fallback.
    for (const provider of ['groq','gemini']) {
      try {
        if (provider==='groq' && process.env.GROQ_API_KEY) {
          const model=process.env.GROWTH_GROQ_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
          const client=new Groq({apiKey:process.env.GROQ_API_KEY,timeout:25000,maxRetries:0});
          const result=await client.chat.completions.create({model,messages:[{role:'user',content:prompt}],response_format:{type:'json_object'},max_tokens:3000,...(model.startsWith('openai/gpt-oss') ? {reasoning_effort:'low'} : {})});
          if(result.choices[0].finish_reason==='length')throw new Error('Truncated story');
          return JSON.parse(result.choices[0].message.content);
        }
        if (provider==='gemini' && process.env.GEMINI_API_KEY) {
          const model=new GoogleGenerativeAI(process.env.GEMINI_API_KEY).getGenerativeModel({model:process.env.GROWTH_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',generationConfig:{responseMimeType:'application/json'}});
          const result=await model.generateContent(prompt,{timeout:20000});
          return JSON.parse(result.response.text());
        }
      } catch {failures.push(provider);}
    }
    throw new Error('Daily writing providers unavailable'+(failures.length ? `: ${failures.join(', ')}` : ''));
  }
  async get(date=new Date(), options={}) {
    const dateStr=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(date);
    // Offline QA must never read/write production history or call model providers.
    if(options._skipExternalLlm) return {...buildSocialPilotPackage(date).facebook.creative,contentSource:'reviewed_fallback'};
    if(!this.pending.has(dateStr)) {
      const pending=this._generate(date,dateStr).catch(error=>{this.pending.delete(dateStr);throw error;});
      this.pending.set(dateStr,pending);
      if(this.pending.size>8) this.pending.delete(this.pending.keys().next().value);
    }
    return this.pending.get(dateStr);
  }
  /** Generate and validate a previewable draft; no database access or publication. */
  async draft(date=new Date(),recent=[]) {
    const base=buildSocialPilotPackage(date,{hookVariant:'A'}).facebook.creative;
    let creative;
    let rejection="";
    for(let attempt=0;attempt<2 && !creative;attempt++) try {
      const raw=await (this.requestJson ? this.requestJson(companionPrompt(base,recent)+(rejection ? '\nPrevious draft rejected: '+rejection+'. Correct this while keeping the story brief.' : '')) : this._request(companionPrompt(base,recent)+(rejection ? '\nPrevious draft rejected: '+rejection+'. Correct this while keeping the story brief.' : '')));
      if(recent.some(t=>t.trim().toLowerCase()===raw.topic?.trim().toLowerCase())) throw new Error('Repeated recent topic');
      creative=normalizeDailyCompanion(raw,base);
      await this.validateLayout(creative);
    } catch(error) {
      rejection=error.message;creative=null;
      if (attempt===1) logger.warn('[COMPANION DAILY] New story unavailable or rejected; using a reviewed feature story.');
    }
    return creative || {...base,contentSource:'reviewed_fallback'};
  }
  async _generate(date,dateStr) {
    const id=identity(dateStr);const base=buildSocialPilotPackage(date,{hookVariant:'A'}).facebook.creative;
    try {const stored=await this._read(id);if(stored) return validateCreative(stored);} catch {logger.warn('[COMPANION DAILY] Canonical store read unavailable; using process cache.');}
    let recent=[];try {recent=await this._recent();} catch {logger.warn('[COMPANION DAILY] Recent-topic history unavailable.');}
    let creative=await this.draft(date,recent);
    try {
      const {data:users}=await this.db.from('users').select('id').limit(1);
      if(users?.length) {
        const {error}=await this.db.from('usage_tracking').insert({id,user_id:users[0].id,action_type:`growth_creative:${dateStr}:${JSON.stringify(creative)}`,count:1,period_start:new Date().toISOString(),period_end:new Date().toISOString()});
        if(error && error.code!=='23505') throw new Error('Daily creative could not be stored');
        // A deterministic primary key makes concurrent workers use the first stored draft.
        const winner=await this._read(id);if(winner) creative=validateCreative(winner);
        await this.db.from('usage_tracking').insert({id:identity(dateStr+':topic'),user_id:users[0].id,action_type:`growth_topic:${creative.topic || creative.problem}`,count:1,period_start:new Date().toISOString(),period_end:new Date().toISOString()});
      }
    } catch {logger.warn('[COMPANION DAILY] Durable creative storage unavailable; draft remains cached locally.');}
    return creative;
  }
}
export default new CompanionDailyContentService();
