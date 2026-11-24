import {getLinkedInFormat} from './linkedinEditorialService.js';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const TALKING_VERSION = 'talking_reels_v1';
// 15 Nov 2026 launch is the split-screen pilot; continue with the other six
// formats Monday-Saturday, then resume the weekly loop on Sunday.
export const FORMAT_CALENDAR = Object.freeze({0:'split',1:'story',2:'archetype',3:'council',4:'genz',5:'year_in_pixels',6:'receipt'});
export const FORMAT_NOTES = Object.freeze({
  split:'A high-contrast reality check between what comforting flattery/friends tell you vs the uncomfortable truth you actually needed to hear. Scene 1 acts out the delusion or rationalizing excuse cleanly; Scene 2 delivers one razor-sharp perspective shift + TwinGenie reveal at the end. Only name other AI products if verified comparison evidence is supplied.',
  story:'An in-media-res everyday human conflict (caught texting at 1 AM, flaking, overthinking a dry reply, people-pleasing). Scene 1 builds tension with zero app mention; Scene 2 drops a save-worthy 1-sentence mental test, revealing TwinGenie only in the final turn as the unexpected twist.',
  archetype:'A hilarious, hyper-specific everyday contradiction viewers immediately tag their friends in ("bro this is literally you"). Dramatize catching a pattern live while doing something everyday—reveal TwinGenie only in the final turn.',
  council:'Someone stuck on a burning personal dilemma expects simple validation, gets hit sequentially by comforting instinct vs Honest truth vs Future-self clarity acted out in witty dialogue—ending with a saveable takeaway and late TwinGenie reveal.',
  genz:'Sharp, playful everyday callout on dating, texting, ghosting, or 2 AM delusions that splits comments 50/50. Zero corporate tone; natural spoken rhythm; reveal TwinGenie naturally only at the end.',
  year_in_pixels:'An emotional pattern expose while unwinding or packing/sorting things ("Why am I exhausted every single weekend?"). Connects recurring self-sabotage/people-pleasing patterns with one concrete boundary script viewers want to bookmark.',
  receipt:'Comedy/drama contradiction callback: Character brags they are "totally over it / changed this month" until reminded of their own exact words from days ago. Pure DM-share fuel with TwinGenie revealed at the climax.'
});

export const ARCHETYPES = Object.freeze({
  0: Object.freeze({
    id: 'split_park_afternoon',
    format: 'split',
    name: 'Park Walk Reality Check',
    referenceFile: 'ref_park_afternoon.jpg',
    setting: 'a sunlit city park path beside a stone wall and leafy trees',
    characters: 'LEFT: young man in a beige canvas jacket holding an unbranded iced coffee cup and a matte smartphone facing away, gesturing mid-thought. RIGHT: Black woman with pulled-back braids in a bright coral knit sweater, crossing arms lightly with a sharp, amused knowing smile.',
    speakers: { LEFT: 'beige jacket', RIGHT: 'coral sweater' },
    mood: 'playful skepticism, busted excuse, sudden comic realization'
  }),
  1: Object.freeze({
    id: 'story_gym_friends',
    format: 'story',
    name: 'Gym Bench Memory Receipt',
    referenceFile: 'ref_gym_friends.jpg',
    setting: 'the quiet edge of a neighborhood gym beside dumbbells and benches',
    characters: 'LEFT: South Asian man in a faded slate-blue athletic t-shirt sitting sideways on a bench holding a matte-black unbranded phone facing away. RIGHT: Black man in an olive pullover hoodie holding a clear reusable water bottle, leaning with a raised eyebrow and half-smirk.',
    speakers: { LEFT: 'slate t-shirt', RIGHT: 'olive hoodie' },
    mood: 'brotherly roast, caught red-handed in a contradiction, infectious laugh'
  }),
  2: Object.freeze({
    id: 'archetype_midnight_kitchen',
    format: 'archetype',
    name: '1 AM Kitchen Overthinking',
    referenceFile: 'ref_midnight_kitchen.jpg',
    setting: 'a dimly lit midnight home apartment kitchen counter with a steaming pot',
    characters: 'LEFT: young man with curly brown hair in a grey crewneck sweatshirt leaning on the counter holding a ceramic mug, looking stressed. RIGHT: young woman with a claw clip in an oversized mustard sweater stirring a steaming bowl with a wooden spoon in playful disbelief.',
    speakers: { LEFT: 'grey crewneck', RIGHT: 'mustard sweater' },
    mood: 'late-night chaos, exasperated disbelief, sharp grounding turnaround'
  }),
  3: Object.freeze({
    id: 'council_parked_car',
    format: 'council',
    name: 'Nighttime Car Heart-to-Heart',
    referenceFile: 'ref_parked_car_night.jpg',
    setting: 'the front seats of a parked car at night under warm amber streetlights and light rain',
    characters: 'LEFT: Hispanic woman in the driver seat wearing a burgundy bomber jacket, hand near steering wheel, reacting intensely. RIGHT: young man in a dark green corduroy overshirt in the passenger seat holding a flat unbranded phone facing down, calm and deadpan.',
    speakers: { LEFT: 'burgundy jacket', RIGHT: 'green overshirt' },
    mood: 'raw emotional vulnerability turning into stunned, grounded clarity'
  }),
  4: Object.freeze({
    id: 'genz_supermarket_debate',
    format: 'genz',
    name: 'Grocery Aisle Texting Debate',
    referenceFile: 'ref_supermarket_aisle.jpg',
    setting: 'a bright neighborhood supermarket grocery aisle lined with colorful shelves',
    characters: 'LEFT: East Asian woman in a tan knit cardigan holding an unbranded yellow snack bag mid-debate. RIGHT: curly reddish-blonde woman in a vintage navy denim jacket resting one hand on a silver grocery basket and holding a matte phone facing away in amused shock.',
    speakers: { LEFT: 'tan cardigan', RIGHT: 'denim jacket' },
    mood: 'animated banter, 50/50 dating/friendship debate, relatable shock'
  }),
  5: Object.freeze({
    id: 'pixels_living_floor',
    format: 'year_in_pixels',
    name: 'Unpacking & Boundary Pattern',
    referenceFile: 'ref_living_floor_laundry.jpg',
    setting: 'a sunlit living room woven rug beside folded laundry and an open weekend duffel bag',
    characters: 'LEFT: South Asian woman in a soft sage-green sweatshirt holding an unbranded matte phone up near her ear while kneeling by folded sweaters. RIGHT: mixed-race man in a terracotta flannel overshirt holding a folded t-shirt with an earnest, half-guilty grin.',
    speakers: { LEFT: 'sage sweatshirt', RIGHT: 'terracotta flannel' },
    mood: 'candid everyday honesty, recognizing people-pleasing burnout, dry humor'
  }),
  6: Object.freeze({
    id: 'receipt_hallway_ready',
    format: 'receipt',
    name: 'Hallway Before Heading Out',
    referenceFile: 'ref_hallway_getting_ready.jpg',
    setting: 'a warm apartment front hallway near a mirror and wooden front door',
    characters: 'LEFT: brown-skinned woman in a camel coat over black holding house keys, pausing mid-step with sudden candid fatigue. RIGHT: woman with a short dark bob in a charcoal knit polo leaning on the doorway holding a coat, watching with quiet knowing honesty.',
    speakers: { LEFT: 'camel coat', RIGHT: 'charcoal polo' },
    mood: 'exhausted mask dropping for 2 seconds, raw truth, quiet bittersweet realization'
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

export function validateTalkingScript(script, {date, evidence=null, viralGate=false}={}) {
  if(!script || script.version!==TALKING_VERSION || !/^\d{4}-\d{2}-\d{2}$/.test(script.date) || (date && script.date!==date)) throw Error('Invalid talking-reel date/version');
  if(!Object.values(FORMAT_CALENDAR).includes(script.format))throw Error('Unknown talking-reel format');
  for(const [key,max] of Object.entries({hook:55,topic:90,featureName:50,discussion:140})) if(typeof script[key]!=='string' || script[key].trim().length<5 || script[key].length>max)throw Error(`Invalid talking-reel ${key}`);
  if(script.contextSticker!==undefined && (typeof script.contextSticker!=='string' || script.contextSticker.trim().length<4 || script.contextSticker.length>48 || /[\n\r]/.test(script.contextSticker)))throw Error('Invalid talking-reel contextSticker');
  if(!Array.isArray(script.scenes) || script.scenes.length!==2)throw Error('Exactly two bounded talking scenes required');
  for(const scene of script.scenes) {
    if(!Array.isArray(scene.turns)||scene.turns.length<2||scene.turns.length>5)throw Error('Two to five spoken turns required per scene');
    if(words(scene.turns.map(t=>t.text).join(' ')).length>34)throw Error('Scene exceeds native speaking budget');
    for(const t of scene.turns)if(!['LEFT','RIGHT'].includes(t.speaker)||typeof t.text!=='string'||!t.text.trim()||t.text.length>185||/[\n\r]/.test(t.text))throw Error('Invalid native dialogue');
  }
  const scene1Speech=script.scenes[0].turns.map(t=>t.text).join(' ');
  const scene2Speech=script.scenes[1].turns.map(t=>t.text).join(' ');
  const dialogue=`${scene1Speech} ${scene2Speech}`;
  if(!/Twin\s?Genie/i.test(dialogue))throw Error('TwinGenie must have a spoken role before the CTA');
  if(words(dialogue).length<24 || words(dialogue).length>68)throw Error('Talking story length outside budget');
  if(!viralGate && words(dialogue).length<28)throw Error('Talking story length outside budget');
  if(/\b(?:cures?|diagnos\w*|guaranteed|never forgets|zero memory|100% private|clinical\w* proven|therapist.grade|subconscious trigger)\b/i.test(JSON.stringify(script)))throw Error('Unsupported talking-reel claim');
  if(viralGate) {
    if(!evidence && /\b(?:twin\s?genie|ai\b|chatbot|app\b)\b/i.test(script.hook))throw Error('Curiosity hook must not reveal TwinGenie or AI upfront');
    if(!evidence && /\b(?:twin\s?genie|play store|download|chatbot)\b/i.test(scene1Speech))throw Error('Scene 1 must stay 100% human story; reveal TwinGenie only in Scene 2');
    if(/\b(?:startup|founders?|entrepreneurs?|ceo|executives?|standups?|kpi|quarters?|workplace|coworkers?|office|managers?|boss(?:es)?|promotions?|resign)\b/i.test(JSON.stringify({hook:script.hook,topic:script.topic,discussion:script.discussion,scenes:script.scenes})))throw Error('Keep story grounded in everyday human life, not startups or office work');
    if(words(scene1Speech).length>28)throw Error('Scene 1 exceeds 12s speaking budget (max 28 words)');
    if(words(scene2Speech).length>20)throw Error('Scene 2 exceeds 10s extension speaking budget (max 20 words)');
    if(words(dialogue).length<24 || words(dialogue).length>48)throw Error('Talking story length outside tight pacing budget');
  }
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
  return `Write a gripping, fast-paced, English-only short film for YouTube Shorts and Instagram Reels that hooks regular everyday people (friends, couples, students, roommates, siblings, family) immediately. Format: ${format}. ${FORMAT_NOTES[format]}
Setting & Characters: In ${archetype.setting}: ${archetype.characters}
Emotional Vibe: ${archetype.mood}. Characters must feel like real humans actively caught in a moment—NOT actors reading an advertisement.

VIRAL RETENTION & SHARE/SAVE RULES (STRICT):
1. ZERO AD SCENT IN SCENE 1: Scene 1 MUST NOT mention TwinGenie, an app, or AI (unless captured comparison evidence is supplied below). Start in second 0.2 mid-conflict, mid-roast, or mid-panic (e.g., stopping a friend from sending a 3-paragraph text, catching a white lie, calling out a 1 AM spiral). Zero greetings ("Hey", "So...").
2. EARN THE SHARE: Include sharp humor, a caught-red-handed contradiction, or an undeniable everyday relationship/friendship truth that makes viewers DM the video to a friend saying "bro this is literally you".
3. EARN THE SAVE: Before ending Scene 2, one character delivers a crisp, concrete 1-sentence mental test, comeback, or rule a viewer actually wants to bookmark for real life.
4. LATE TWIST REVEAL (FINAL 1-2 TURNS OF SCENE 2): Only at the end of Scene 2 does the other character ask where they got that sudden clarity or receipt—revealing "TwinGenie" naturally in 1 punchy line (e.g. "Asked TwinGenie Honest mode—someone had to stop lying to you." or "TwinGenie pulled up what you swore Tuesday.").
5. EVERYDAY LIFE ONLY: Zero startups, zero CEOs/bosses/coworkers/office jargon. Focus strictly on love, texting, friendships, family guilt, sleep, overthinking, people-pleasing, habits, or self-respect.
6. ANTI-CLICHÉ BAN: Never write brochure lines like "TwinGenie can suggest a small habit", "no fluff", "enjoy the sip", "whisper the truth", "find calm", "fresh angle", or "let's try the Normal view". Write raw, spoken dialogue people say aloud.
7. PURE CURIOSITY TITLE: "hook" (<=55 chars) MUST read like an irresistible story curiosity title with ZERO mention of "TwinGenie" or "AI" (unless evidence comparison below). "contextSticker" (<=42 chars, plain text with ZERO emojis so fonts never show missing boxes) is a punchy 5-8 word creator screen caption (e.g. "Send this to your overthinking friend" or "Wait for what she says at the end"). "discussion" (<=140 chars) is a 50/50 comment debate question people want to argue about in comments.
${isSplit ? (evidence ? 'Comparison rule: Read EACH verified excerpt once verbatim with source attribution, keeping reaction natural and sharp.' : 'Contrast generic flattering validation vs one piercing, honest reality check without naming any other AI product.') : ''}

Timing & Structure: Exactly two scenes; 2–5 turns per scene; Scene 1 at most 26 words, Scene 2 at most 20 words (punchy twist so TwinGenie never clips inside the 10s extension), 24–46 words total. No CTA in dialogue. Each turn is {speaker:"LEFT"|"RIGHT",text:"exact speech"}. Optional source:"competitor"|"twingenie" only for actual evidence excerpts. No stage directions inside speech. topic <=90 chars, featureName <=50 chars.
Return strictly JSON: {hook,contextSticker,topic,featureName,discussion,scenes:[{turns:[...]},{turns:[...]}]}.
Verified app capabilities (only reference accurately at the twist): ordinary chat; Honest/Reflective/Future/Normal perspectives; Guided Life Coach exercises; self-reported mood patterns; earlier conversation memory callbacks. No medical diagnoses, guarantees, testimonials, or statistics.
Avoid repeating recent story topics: ${JSON.stringify(recentTopics.slice(0,45))}.
${evidence ? `Comparison evidence ID ${evidence.id}: ${JSON.stringify(evidence)}. Read EACH excerpt verbatim once with source on that turn; do not omit setup context from captions.` : 'No competitor evidence supplied: never name ChatGPT, Replika, Character.ai, or any other AI brand.'}`;
}

export function buildTalkingPackage(script, options={}) {
  const turns=script.scenes.flatMap(s=>s.turns),question=turns[0].text;
  const direct=turns.find(t=>t.source==='twingenie')?.text || turns.at(-1).text;
  const limits=script.comparisonDisclosure || 'AI-generated fictional scene. Illustrative conversation; responses vary.';
  const link=n=>`https://www.twingenie.app/download?utm_source=${n}&utm_medium=organic&utm_campaign=talking_${script.date}_${script.format}`;
  const playStoreLink = link('youtube_shorts');
  const igLead = `${script.hook}\n\n${script.discussion}`;
  const caption=script.captions?.instagram || `${igLead}\n\n(Wait for the end 👀)\nDownload TwinGenie on Google Play — link in bio. On iPhone? Comment iOS.\n\n${limits}\n#relatable #overthinking #relationships #mindset #TwinGenie`;
  const linkedinFormat=getLinkedInFormat(dateObject(script.date));
  const slides=[
    {type:'cover',title:script.hook,subtitle:script.topic,tag:script.featureName.toUpperCase(),takeaways:[question,direct,script.discussion]},
    {type:'insight',title:'A familiar moment',subtitle:question,content:direct,tag:'ILLUSTRATIVE EXAMPLE'},
    {type:'insight',title:'A conversation worth starting',subtitle:`Explore ${script.featureName.toLowerCase()} in TwinGenie.`,content:`TwinGenie is an AI companion for everyday conversations and reflection. ${script.discussion}`,tag:'TWINGENIE'},
    {type:'discussion',title:'Your perspective',question:script.discussion,tag:'TWINGENIE'}
  ];
  const linkedinCaption=script.captions?.linkedin || (
    linkedinFormat==='video'
      ? `${script.hook}\n\n${script.topic}\n\nIn this fictional scene, two friends explore an everyday dilemma using TwinGenie. ${script.discussion}\n\nTwinGenie is an AI companion for everyday conversations and reflection.\n\n${limits}\n\n#TwinGenie #AICompanion`
      : linkedinFormat==='carousel_pdf'
        ? `${script.hook}\n\n${script.topic}\n\nSwipe through this quick breakdown on how ${script.featureName.toLowerCase()} helps turn everyday overthinking into clarity.\n\n${script.discussion}\n\nTwinGenie is an AI companion for everyday conversations and reflection.\n\n#TwinGenie #AICompanion`
        : `${script.hook}\n\n${script.topic}\n\nAn illustrative reflection:\n“${question}”\n“${direct}”\n\n${script.discussion}\n\nTwinGenie is an AI companion for everyday conversations and reflection.\n\n#TwinGenie #AICompanion`
  );
  const ytDescription = `${script.hook}\n\n${script.discussion} Drop your answer in the comments 👇\n\n📲 Download TwinGenie on Google Play: ${playStoreLink}\n(On iPhone? Visit twingenie.app)\n\n${limits}\n\n#Shorts #Relatable #Overthinking #Relationships #TwinGenie`;
  const creative={...script};
  return {
    topic:script.topic,
    hook:script.hook,
    themeId:`talking_${script.format}_${script.date}`,
    category:'EVERYDAY HUMAN STORIES',
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
    threads:{text:script.captions?.threads || `${script.hook}\n\n${script.discussion}\n\nTwinGenie: honest conversations for everyday life.`},
    youtube:{
      title:script.captions?.youtubeTitle || script.hook,
      description:script.captions?.youtube || ytDescription,
      pinnedComment:`Wait—are they right or overreacting? 👇 Drop your take below!\n\nDownload TwinGenie on Google Play: ${playStoreLink}`,
      tags:['Shorts','Relatable','Overthinking','Relationships','Storytime','SelfAwareness','TwinGenie'],
      categoryId:'22',
      creative
    }
  };
}
