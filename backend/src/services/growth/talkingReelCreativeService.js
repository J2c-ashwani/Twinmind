import {getLinkedInFormat} from './linkedinEditorialService.js';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const TALKING_VERSION = 'talking_reels_v1';
// 15 Nov 2026 launch is the split-screen pilot; continue with the other six
// formats Monday-Saturday, then resume the weekly loop on Sunday.
export const FORMAT_CALENDAR = Object.freeze({0:'split',1:'story',2:'archetype',3:'council',4:'genz',5:'year_in_pixels',6:'receipt'});
export const FORMAT_NOTES = Object.freeze({
  split:'A two-character head-to-head built around a real everyday dilemma: show two honest reactions or choices, then let TwinGenie offer a useful next question. When comparing against named AI competitors, hit their core user pain point: ChatGPT giving a lengthy, generic, multi-paragraph essay with bullet points; Replika giving superficial, overly agreeable flattery; Character.ai giving dramatic fantasy roleplay instead of real adult help. In contrast, TwinGenie is always spot-on, concise, cutting through the noise with a sharp, sweet-spot reflective question.',
  story:'A relatable everyday story/POV: one friend notices what the other is avoiding saying. Make TwinGenie chat or a guided Life Coach session a specific next action.',
  archetype:'A funny recognisable personality habit. Personality reflection starts a conversation, without diagnosing anyone or inventing a validated personality result.',
  council:'A person considers one ordinary decision through Normal, Reflective, Honest and Future perspectives in TwinGenie. These are sequential perspectives, not a simultaneous group chat.',
  genz:'A light, kind reality check about an everyday contradiction. Make it funny without humiliating anyone. The app only knows information a person deliberately shares.',
  year_in_pixels:'Two friends look back at a mixed week using self-reported mood reflection in TwinGenie. Example entries are staged, not inferred from device activity.',
  receipt:'A kind, funny memory callback: an earlier statement and a later plan conflict. Describe an illustrative TwinGenie memory conversation, never claim it remembers everything.'
});

export const ARCHETYPES = Object.freeze({
  0: Object.freeze({
    id: 'split_dating_cafe',
    format: 'split',
    name: 'Dating & Texting Dilemma',
    referenceFile: 'ref_dating_cafe.jpg',
    setting: 'a cozy corner table in a warm modern coffee shop',
    characters: 'LEFT: woman with shoulder-length dark brown hair in an olive knit sweater, holding an unbranded smartphone with its screen facing away. RIGHT: woman with wavy honey-blonde hair in a cream-colored cardigan, listening attentively with empty hands.',
    speakers: { LEFT: 'olive sweater', RIGHT: 'cream cardigan' },
    mood: 'sharp realization, kind small smile, spontaneous honest reality check'
  }),
  1: Object.freeze({
    id: 'story_coworkers_pantry',
    format: 'story',
    name: 'Workplace & Career Overthinking',
    referenceFile: 'ref_coworkers_mixed.jpg',
    setting: 'a bright, modern sunlit office pantry and lounge with natural window light',
    characters: 'LEFT: young adult man in a charcoal crewneck sweater, holding an unbranded smartphone with its screen facing away. RIGHT: young adult woman with pulled-back dark hair in an olive blouse, empty hands.',
    speakers: { LEFT: 'charcoal crewneck', RIGHT: 'olive blouse' },
    mood: 'workplace empathy, relieving career pressure, finding practical clarity'
  }),
  2: Object.freeze({
    id: 'archetype_friends_bar',
    format: 'archetype',
    name: 'Habits & Pattern Recognition',
    referenceFile: 'ref_friends_habit.jpg',
    setting: 'a modern espresso bar with warm wood accents',
    characters: 'LEFT: stylish woman with auburn hair in a black minimalist turtleneck, holding an unbranded smartphone with its screen facing away. RIGHT: friend with natural curly dark hair in a rust-orange denim jacket, empty hands.',
    speakers: { LEFT: 'black turtleneck', RIGHT: 'rust jacket' },
    mood: 'recognizing an overthinking habit, humorous self-awareness, supportive insight'
  }),
  3: Object.freeze({
    id: 'council_coworkers_perspectives',
    format: 'council',
    name: 'The 4 Perspectives Council',
    referenceFile: 'ref_coworkers_mixed.jpg',
    setting: 'a modern sunlit office lounge with calm ambient light',
    characters: 'LEFT: young adult man in a charcoal crewneck sweater, holding an unbranded smartphone with its screen facing away. RIGHT: young adult woman with pulled-back dark hair in an olive blouse, offering thoughtful perspective with empty hands.',
    speakers: { LEFT: 'charcoal crewneck', RIGHT: 'olive blouse' },
    mood: 'grounded wisdom, calm emotional perspective, thoughtful realization'
  }),
  4: Object.freeze({
    id: 'genz_dating_cafe',
    format: 'genz',
    name: 'Humorous Everyday Contradictions',
    referenceFile: 'ref_dating_cafe.jpg',
    setting: 'a cozy corner table in a warm modern coffee shop',
    characters: 'LEFT: woman with shoulder-length dark brown hair in an olive knit sweater, holding an unbranded smartphone facing away. RIGHT: woman with wavy honey-blonde hair in a cream cardigan, smiling playfully with empty hands.',
    speakers: { LEFT: 'olive sweater', RIGHT: 'cream cardigan' },
    mood: 'playful callout, light-hearted reality check, authentic everyday contradiction'
  }),
  5: Object.freeze({
    id: 'year_in_pixels_apartment',
    format: 'year_in_pixels',
    name: 'Weekend Wind-Down Friends',
    referenceFile: 'reference.jpg',
    setting: 'a warm, cozy living room apartment with soft ambient lighting',
    characters: 'LEFT: shoulder-length dark hair, indigo sweatshirt, holds one unbranded phone with its screen facing away. RIGHT: short curly hair, teal overshirt, empty hands.',
    speakers: { LEFT: 'indigo sweatshirt', RIGHT: 'teal overshirt' },
    mood: 'warm weekend reflection, vulnerability, small mutual smile'
  }),
  6: Object.freeze({
    id: 'receipt_friends_bar',
    format: 'receipt',
    name: 'Weekend Receipt Callback',
    referenceFile: 'ref_friends_habit.jpg',
    setting: 'a modern espresso bar with warm wood accents',
    characters: 'LEFT: stylish woman with auburn hair in a black minimalist turtleneck, holding an unbranded smartphone facing away. RIGHT: friend with natural curly dark hair in a rust-orange denim jacket, laughing with kind accountability.',
    speakers: { LEFT: 'black turtleneck', RIGHT: 'rust jacket' },
    mood: 'laughing at past self, holding a gentle mirror, kind accountability'
  })
});

export const istDate = date => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(date);
export const dateObject = day => new Date(day+'T12:00:00+05:30');
export const formatForDate = day => FORMAT_CALENDAR[dateObject(day).getUTCDay()];
export const archetypeForDate = day => ARCHETYPES[dateObject(day).getUTCDay()] || ARCHETYPES[5];
const HERE=path.dirname(fileURLToPath(import.meta.url));
const hasVertexCredential=()=>Boolean(process.env.GOOGLE_TTS_SERVICE_ACCOUNT_JSON||process.env.GOOGLE_TTS_SERVICE_ACCOUNT_BASE64||process.env.GOOGLE_APPLICATION_CREDENTIALS||existsSync(path.join(HERE,'../../../google-tts-service-account.json')));
export const isTalkingEnabled = () => process.env.REEL_RENDERER_VERSION !== 'legacy' && process.env.TALKING_REELS_ENABLED !== 'false' && (process.env.TALKING_REELS_ENABLED === 'true' || (process.env.NODE_ENV === 'production' && hasVertexCredential()));
export const words = text => text.trim().split(/\s+/).filter(Boolean);

export function validateTalkingScript(script, {date, evidence=null}={}) {
  if(!script || script.version!==TALKING_VERSION || !/^\d{4}-\d{2}-\d{2}$/.test(script.date) || (date && script.date!==date)) throw Error('Invalid talking-reel date/version');
  if(!Object.values(FORMAT_CALENDAR).includes(script.format))throw Error('Unknown talking-reel format');
  for(const [key,max] of Object.entries({hook:55,topic:90,featureName:50,discussion:140})) if(typeof script[key]!=='string' || script[key].trim().length<5 || script[key].length>max)throw Error(`Invalid talking-reel ${key}`);
  if(!Array.isArray(script.scenes) || script.scenes.length!==2)throw Error('Exactly two bounded talking scenes required');
  for(const scene of script.scenes) {
    if(!Array.isArray(scene.turns)||scene.turns.length<2||scene.turns.length>5)throw Error('Two to five spoken turns required per scene');
    if(words(scene.turns.map(t=>t.text).join(' ')).length>34)throw Error('Scene exceeds native speaking budget');
    for(const t of scene.turns)if(!['LEFT','RIGHT'].includes(t.speaker)||typeof t.text!=='string'||!t.text.trim()||t.text.length>185||/[\n\r]/.test(t.text))throw Error('Invalid native dialogue');
  }
  const dialogue=script.scenes.flatMap(s=>s.turns).map(t=>t.text).join(' ');
  if(!/Twin\s?Genie/i.test(dialogue))throw Error('TwinGenie must have a spoken role before the CTA');
  if(words(dialogue).length<28 || words(dialogue).length>68)throw Error('Talking story length outside budget');
  if(/\b(?:cures?|diagnos\w*|guaranteed|never forgets|zero memory|100% private|clinical\w* proven|therapist.grade|subconscious trigger)\b/i.test(JSON.stringify(script)))throw Error('Unsupported talking-reel claim');
  if(/ChatGPT|Replika|Character\s?\.\s?ai/i.test(dialogue+' '+script.hook)) {
    if(script.format!=='split'||!evidence||script.evidenceId!==evidence.id)throw Error('Named comparison requires captured evidence');
    const quotes=script.scenes.flatMap(s=>s.turns).filter(t=>t.source);
    if(quotes.length!==2 || !quotes.some(t=>t.source==='competitor') || !quotes.some(t=>t.source==='twingenie'))throw Error('Both exact response excerpts required');
    for(const t of quotes)if(t.text!==(t.source==='competitor'?evidence.competitor.excerpt:evidence.twingenie.excerpt))throw Error('Comparison excerpt differs from evidence');
  }
  return script;
}

export function talkingScriptPrompt(day, recentTopics=[], evidence=null) {
  const format=formatForDate(day);
  const archetype=archetypeForDate(day);
  const isSplit=format==='split';
  return `Write an English-only, emotionally engaging organic short film for TwinGenie, an AI companion for all adults, not just founders or workers. Format: ${format}. ${FORMAT_NOTES[format]}
Characters & Setting: In ${archetype.setting}, two friends/adults are talking: ${archetype.characters}
Mood: ${archetype.mood}. They talk naturally with a kind, specific payoff.

CEO Growth Directives (Hook & Reality Check):
- HOOK VELOCITY: Begin immediately inside a high-stakes, familiar tension or dilemma in the first 2.5 seconds (0.2s - 2.5s). Zero greetings or pleasantries (no "Hey...", no "So I was thinking...").
- SHOW THE EMOTIONAL TRUTH: TwinGenie must be named naturally and do something useful BEFORE the ending. The spoken TwinGenie response must be razor-sharp, emotionally resonant, and quote-worthy—cutting straight to the truth without corporate fluff or generic clichés.
${isSplit ? (evidence ? '- HEAD-TO-HEAD REALITY CHECK: Highlight user frustration with competitor pain points. Read each excerpt verbatim with source attribution.' : '- HEAD-TO-HEAD REALITY CHECK: Contrast generic AI superficial agreeable flattery and robotic over-explaining with TwinGenie being spot-on, concise, and hitting the sweet spot of emotional truth with a sharp, reflective question. Do not name competitor brands without verified evidence.') : '- REALITY CHECK: Make the interaction expose an everyday human contradiction, avoidance pattern, or overthinking cycle, resolved with TwinGenie\'s grounded clarity.'}
- Avoid generic slogans, sales monologues, artificial slang and seductive voices. The friends discuss or read the app, not pretend to be actual customers. Do not promise an in-app talking video avatar.

Exactly two scenes; 2–5 turns per scene; at most 30 words per scene, 28–60 words total. No CTA in the dialogue; a fixed 5-second Android download card is appended. Each turn is {speaker:"LEFT"|"RIGHT",text:"exact speech"}. Optional source:"competitor"|"twingenie" only for actual evidence excerpts. No stage directions inside speech. No camera changes or new locations are needed. Hook <=55 chars, topic <=90 chars, featureName <=50 chars, discussion one question <=140 chars. Return JSON {hook,topic,featureName,discussion,scenes:[{turns:[...]},{turns:[...]}]}.
Use verified features only: ordinary chat; guided Life Coach sessions/exercises; four switchable perspectives; self-reported mood reflection; relevant prior conversation memory; personality reflection. Do not invent automatic screen-time access, diagnoses, private user stories, testimonials, statistics or guaranteed outcomes. Examples are illustrative. For receipt, make the earlier statement explicitly part of the fictional scene. For council, identify each perspective in speech or the adjacent source label; do not omit the four perspectives. For mood, make a real emotional shift rather than a feature list.
Avoid repeating these recent story topics: ${JSON.stringify(recentTopics.slice(0,45))}.
${evidence ? `Comparison evidence ID ${evidence.id}: ${JSON.stringify(evidence)}. Read EACH excerpt exactly once, verbatim with source on that turn; react to the actual difference in this one test. Do not claim general superiority. Do not omit setup limitations from captions.` : 'No competitor evidence supplied: do not name or quote another AI product. Keep the two-character head-to-head about different human reactions, choices, or TwinGenie perspectives.'}`;
}

export function buildTalkingPackage(script, options={}) {
  const turns=script.scenes.flatMap(s=>s.turns),question=turns[0].text;
  const direct=turns.find(t=>t.source==='twingenie')?.text || turns.at(-1).text;
  const limits=script.comparisonDisclosure || 'AI-generated fictional scene. Illustrative conversation; responses vary.';
  const link=n=>`https://www.twingenie.app/download?utm_source=${n}&utm_medium=organic&utm_campaign=talking_${script.date}_${script.format}`;
  const playStoreLink = link('youtube_shorts');
  const caption=script.captions?.instagram || `${script.hook}\n\n${script.discussion}\n\nTwinGenie is an AI companion for everyday conversations and reflection.\nDownload TwinGenie on Google Play — link in bio. On iPhone? Comment iOS.\n\n${limits}\n#TwinGenie #AICompanion`;
  const linkedinFormat=getLinkedInFormat(dateObject(script.date));
  const slides=[
    {type:'cover',title:script.hook,subtitle:script.topic,tag:script.featureName.toUpperCase(),takeaways:[question,direct,script.discussion]},
    {type:'insight',title:'A familiar moment',subtitle:question,content:direct,tag:'ILLUSTRATIVE EXAMPLE'},
    {type:'insight',title:'A conversation worth starting',subtitle:`Explore ${script.featureName.toLowerCase()} in TwinGenie.`,content:`TwinGenie is an AI companion for everyday conversations and reflection. ${script.discussion}`,tag:'TWINGENIE'},
    {type:'discussion',title:'Your perspective',question:script.discussion,tag:'TWINGENIE'}
  ];
  const linkedinCaption=script.captions?.linkedin || (
    linkedinFormat==='video'
      ? `${script.hook}\n\n${script.topic}\n\nIn this fictional scene, two friends use TwinGenie to explore an everyday question. ${script.discussion}\n\nTwinGenie is an AI companion for everyday conversations and reflection.\n\n${limits}\n\n#TwinGenie #AICompanion`
      : linkedinFormat==='carousel_pdf'
        ? `${script.hook}\n\n${script.topic}\n\nSwipe through this quick breakdown on how ${script.featureName.toLowerCase()} helps turn everyday overthinking into clarity.\n\n${script.discussion}\n\nTwinGenie is an AI companion for everyday conversations and reflection.\n\n#TwinGenie #AICompanion`
        : `${script.hook}\n\n${script.topic}\n\nAn illustrative reflection:\n“${question}”\n“${direct}”\n\n${script.discussion}\n\nTwinGenie is an AI companion for everyday conversations and reflection.\n\n#TwinGenie #AICompanion`
  );
  const ytDescription = `${script.hook}\n\n${script.topic}\n\n📲 Download TwinGenie on Google Play: ${playStoreLink}\n(On iPhone? Visit twingenie.app)\n\n💬 Daily Reflection Question:\n${script.discussion}\nDrop your answer below 👇\n\n${limits}\n\n#TwinGenie #AICompanion #Shorts #PersonalGrowth`;
  const creative={...script};
  return {
    topic:script.topic,
    hook:script.hook,
    themeId:`talking_${script.format}_${script.date}`,
    category:'EVERYDAY AI COMPANION',
    mode:'dark',
    modeName:script.featureName,
    format:'reel',
    formatType:script.format,
    creativeVersion:TALKING_VERSION,
    istDateStr:script.date,
    contentSource:script.contentSource||'daily_talking_script',
    includeCaptionLink:false,
    chatDialogue:{userDilemma:question,twinModeReply:direct},
    linkedin:{title:script.hook,caption:linkedinCaption,slides,format:linkedinFormat,contentVersion:'linkedin_talking_v1'},
    facebook:{title:script.hook,caption,slides,creative,firstComment:null},
    instagram:{caption,creative,firstComment:null},
    threads:{text:script.captions?.threads || `${script.hook}\n\n${script.discussion}\n\nTwinGenie: conversations for everyday life.`},
    youtube:{
      title:script.captions?.youtubeTitle || script.hook,
      description:script.captions?.youtube || ytDescription,
      pinnedComment:`Download TwinGenie on Google Play: ${playStoreLink} — What's the hardest truth an AI ever told you? Drop a comment below!`,
      creative
    }
  };
}
