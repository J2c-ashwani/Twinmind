import fs from 'fs';
import {buildLinkedInEditorial} from './linkedinEditorialService.js';
export const MOTION_VERSION = 'motion_v2';
// Reviewed visual templates and outage stories. Live daily writing is separate.
export const EPISODES = JSON.parse(fs.readFileSync(new URL('./assets/companion/episodes.json', import.meta.url), 'utf8'));
export const FEATURE_CALENDAR = Object.freeze({0:6,1:0,2:1,3:2,4:3,5:4,6:5});
export function validateCreative(c) {
  if (!c || c.version !== MOTION_VERSION || !EPISODES.some(e=>e.id===c.id && e.feature===c.feature && e.heroAsset===c.heroAsset)) throw new Error('Unknown motion creative');
  for (const key of ['hook','problem','question','reply','action']) {
    if (typeof c[key]!=='string' || !c[key].trim() || c[key].length>160) throw new Error(`Invalid creative ${key}`);
  }
  if (!Array.isArray(c.narration) || c.narration.length!==6 || c.narration.some(x=>typeof x!=='string' || !x.trim() || x.trim().split(/\s+/).length>16)) throw new Error('Narration must have six short scenes');
  if (/therapist.grade|\bcure\b|guaranteed|chatgpt|replika|zero.memory/i.test(JSON.stringify(c))) throw new Error('Unsupported creative claim');
  return c;
}
export function buildMotionCreative(spec={}) {
  if(spec.creative) return validateCreative(spec.creative);
  const found=EPISODES.find(e=>e.id===spec.episodeId || e.hooks.includes(spec.hook) || e.question===spec.userExcuse);
  const e=found || EPISODES.find(e=>e.mode===spec.mode) || EPISODES[0];
  const variant=spec.hookVariant==='B' || (found && e.hooks[1]===spec.hook) ? 'B' : 'A';
  const narration=[...e.narration];if(variant==='B')narration[0]=e.hooks[1];
  return validateCreative({...e,version:MOTION_VERSION,hook:e.hooks[variant==='B'?1:0],hookVariant:variant,narration,storyStyle:'companion_cinema',voice:'en-US-JennyNeural',disclosure:'Illustrative conversation',cta:e.cta||'Meet TwinGenie',url:'https://www.twingenie.app/download'});
}
export function buildSocialPilotPackage(date=new Date(),options={}) {
  const ist=new Date(date.getTime()+330*60000),day=Math.floor(Date.UTC(ist.getUTCFullYear(),ist.getUTCMonth(),ist.getUTCDate())/86400000);
  const base=options.creative || buildMotionCreative({episodeId:EPISODES[FEATURE_CALENDAR[ist.getUTCDay()]].id});
  const variant=options.hookVariant || 'A';
  const narration=[...base.narration];if(variant!==base.hookVariant)narration[0]=base.hooks[variant==='B'?1:0];
  const creative=validateCreative({...base,hook:base.hooks[variant==='B'?1:0],hookVariant:variant,narration});
  const campaign=`companion_${creative.creativeRevision||creative.id}_${variant.toLowerCase()}`;
  const link=n=>`https://www.twingenie.app/download?utm_source=${n}&utm_medium=organic&utm_campaign=${campaign}`;
  const caption=creative.socialCaption || `${creative.hook}\n\n${creative.question}\n${creative.reply}\n\n${creative.discussion}\n\nTwinGenie is an AI companion for everyday life. Try a conversation — Google Play, link in bio.\nThe conversation shown is an illustrative example.\n#TwinGenie #AICompanion`;
  const slides=[
    {type:'hook',title:creative.hook,subtitle:creative.problem,tag:creative.featureName.toUpperCase()},
    {type:'insight',title:'A moment to talk',subtitle:creative.question,content:creative.reply,tag:'ILLUSTRATIVE EXAMPLE'},
    {type:'insight',title:creative.actionTitle,subtitle:creative.action,tag:'TRY THIS'},
    {type:'discussion',title:'Your turn',question:creative.discussion,tag:'TWINGENIE'}
  ].map(s=>({...s,visualStyle:MOTION_VERSION,heroAsset:creative.heroAsset}));
  const linkedin=buildLinkedInEditorial(creative,date,{includeCaptionLink:Boolean(options.includeCaptionLink),utmLink:options.utmLink||link('linkedin'),slides});
  return {topic:creative.topic||creative.problem,hook:creative.hook,themeId:creative.id,category:'EVERYDAY AI COMPANION',mode:creative.mode,modeName:creative.featureName,format:'reel',formatType:MOTION_VERSION,creativeVersion:MOTION_VERSION,contentSource:creative.contentSource||'reviewed_fallback',istDateStr:ist.toISOString().slice(0,10),dayNumber:day,includeCaptionLink:Boolean(options.includeCaptionLink),utmLink:options.utmLink||link('linkedin'),chatDialogue:{userDilemma:creative.question,twinModeReply:creative.reply,shift:creative.action},linkedin,facebook:{title:creative.hook,caption,slides,creative,firstComment:`Try TwinGenie: ${link('facebook')}`},instagram:{caption,creative,firstComment:`Try TwinGenie: ${link('instagram')}`},threads:{text:creative.threadText||`${creative.hook}\n\n${creative.question}\n\n${creative.discussion}`},youtube:{title:creative.hook,description:`${creative.question}\n\n${creative.reply}\n\nIllustrative conversation.\n${link('youtube')}`,creative},experiment:{id:campaign,variant,episode:creative.id,changedVariable:'opening_hook',baselineSkipRateSource:'founder_reported_unverified'}};
}
