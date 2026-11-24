import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {formatForDate,archetypeForDate,ARCHETYPES,validateTalkingScript,talkingScriptPrompt,buildTalkingPackage} from '../src/services/growth/talkingReelCreativeService.js';
import {validateTranscript,makeSceneRequest} from '../src/services/growth/talkingReelService.js';

const legacyScript={version:'talking_reels_v1',date:'2026-11-16',format:'story',hook:'A message can wait ten minutes',topic:'Overthinking a reply',featureName:'Everyday chat',discussion:'What story would you check before replying?',scenes:[
  {turns:[{speaker:'LEFT',text:'I was going to send that message tonight because the silence made me guess what my friend meant.'},{speaker:'RIGHT',text:'TwinGenie can help you slow down and look at another perspective before deciding what to do.'}]},
  {turns:[{speaker:'LEFT',text:'That is better than rereading the same short reply all evening.'},{speaker:'RIGHT',text:'What would you ask yourself before you hit send?'}]}
]};

const viralStoryScript={
  version:'talking_reels_v1',
  date:'2026-11-26',
  format:'genz',
  hook:'Wait—why did you leave her on read?',
  contextSticker:'Send to your friend who overthinks 😭',
  topic:'Catching a contradiction before texting back',
  featureName:'Honest perspective',
  discussion:'Would you reply immediately or wait till morning?',
  scenes:[
    {turns:[
      {speaker:'LEFT',text:'You swore yesterday you did not care if she texted back, yet you opened it four times.'},
      {speaker:'RIGHT',text:'I was checking for typos, not waiting by the phone.'}
    ]},
    {turns:[
      {speaker:'LEFT',text:'Rule for tonight: zero decisions after eleven PM. Since when am I the wise one?'},
      {speaker:'RIGHT',text:'Okay fine—TwinGenie Honest mode roasted me first and told me to put the phone down.'}
    ]}
  ]
};

test('weekly reel calendar starts with the locked Sunday head-to-head, then rotates formats',()=>{
  assert.equal(formatForDate('2026-11-15'),'split');
  assert.equal(formatForDate('2026-11-16'),'story');
  assert.equal(formatForDate('2026-11-17'),'archetype');
  assert.equal(formatForDate('2026-11-22'),'split');
});

test('archetype rotation assigns 7 unique everyday casts and settings with zero office/cafe lock-in',()=>{
  const files = Object.values(ARCHETYPES).map(a=>a.referenceFile);
  assert.equal(new Set(files).size, 7);
  for (const file of files) {
    assert.ok(fs.existsSync(path.join(process.cwd(), 'src/services/growth/assets/talking', file)), `Missing asset ${file}`);
  }
  assert.equal(archetypeForDate('2026-11-15').referenceFile, 'ref_park_afternoon.jpg');
  assert.equal(archetypeForDate('2026-11-16').referenceFile, 'ref_gym_friends.jpg');
  assert.equal(archetypeForDate('2026-11-17').referenceFile, 'ref_midnight_kitchen.jpg');
  assert.equal(archetypeForDate('2026-11-18').referenceFile, 'ref_parked_car_night.jpg');
  assert.equal(archetypeForDate('2026-11-19').referenceFile, 'ref_supermarket_aisle.jpg');
  assert.equal(archetypeForDate('2026-11-20').referenceFile, 'ref_living_floor_laundry.jpg');
  assert.equal(archetypeForDate('2026-11-21').referenceFile, 'ref_hallway_getting_ready.jpg');
});

test('makeSceneRequest builds distinct kinetic directions for scene 1 and scene 2',()=>{
  const dummyBuffer = Buffer.from('fake-jpeg-data');
  const req1 = makeSceneRequest(legacyScript, 0, dummyBuffer);
  const req2 = makeSceneRequest(legacyScript, 1, dummyBuffer);
  const text1 = req1.input[0].content[0].text;
  const text2 = req2.input[0].content[0].text;
  assert.match(text1, /slate-blue athletic t-shirt/i);
  assert.match(text1, /neighborhood gym/i);
  assert.notEqual(text1, text2);
  assert.match(text2, /Tighter framing/i);
});

test('script validator enforces viralGate rules on new generations while remaining backwards compatible',()=>{
  assert.equal(validateTalkingScript(legacyScript,{date:legacyScript.date}),legacyScript);
  assert.equal(validateTalkingScript(viralStoryScript,{date:viralStoryScript.date,viralGate:true}),viralStoryScript);

  const competitor={...legacyScript,format:'split',hook:'ChatGPT versus TwinGenie',scenes:legacyScript.scenes};
  assert.throws(()=>validateTalkingScript(competitor,{date:legacyScript.date}),/captured evidence/);

  assert.throws(()=>validateTalkingScript(legacyScript,{date:legacyScript.date,viralGate:true}),/Scene 1 must stay 100% human story/);
  assert.throws(()=>validateTalkingScript({...viralStoryScript,hook:'TwinGenie helps you stop overthinking'},{date:viralStoryScript.date,viralGate:true}),/Curiosity hook must not reveal/);
  assert.throws(()=>validateTalkingScript({...viralStoryScript,topic:'Startup founder promotion panic'},{date:viralStoryScript.date,viralGate:true}),/everyday human life/);
});

test('talkingScriptPrompt primes everyday human conflicts instead of startups or coworkers',()=>{
  const prompt = talkingScriptPrompt('2026-11-26');
  assert.doesNotMatch(prompt, /not just founders or workers/i);
  assert.match(prompt, /ZERO AD SCENT IN SCENE 1/);
  assert.match(prompt, /EARN THE SAVE/);
});

test('word timestamp transcript must match the exact intended spoken line',()=>{
  const one={scenes:[{turns:[{speaker:'LEFT',text:'I was going to send the message tonight.'}]}]};
  const transcript={words:['I','was','going','to','send','the','message','tonight'].map((word,i)=>({word,start:i*.2,end:i*.2+.1}))};
  assert.equal(validateTranscript(one,0,transcript),true);
  assert.throws(()=>validateTranscript(one,0,{words:[...transcript.words.slice(0,7),{word:'tomorrow'}]}),/differs/);
});

test('daily package carries curiosity YouTube title, category 22, Android CTA, and iOS comment prompt',()=>{
  const pkg=buildTalkingPackage(viralStoryScript);
  assert.equal(pkg.creativeVersion,'talking_reels_v1');
  assert.equal(pkg.youtube.title,'Wait—why did you leave her on read?');
  assert.equal(pkg.youtube.categoryId,'22');
  assert.match(pkg.instagram.caption,/Download TwinGenie on Google Play/);
  assert.match(pkg.instagram.caption,/Comment iOS/);
  assert.match(pkg.youtube.description,/Download TwinGenie on Google Play/i);
  assert.match(pkg.youtube.pinnedComment,/Download TwinGenie on Google Play/i);
});
