import test from 'node:test';
import assert from 'node:assert/strict';
import {formatForDate,archetypeForDate,ARCHETYPES,validateTalkingScript,buildTalkingPackage} from '../src/services/growth/talkingReelCreativeService.js';
import {validateTranscript,makeSceneRequest} from '../src/services/growth/talkingReelService.js';

const script={version:'talking_reels_v1',date:'2026-11-16',format:'story',hook:'A message can wait ten minutes',topic:'Overthinking a reply',featureName:'Everyday chat',discussion:'What story would you check before replying?',scenes:[
  {turns:[{speaker:'LEFT',text:'I was going to send that message tonight because the silence made me guess what my friend meant.'},{speaker:'RIGHT',text:'TwinGenie can help you slow down and look at another perspective before deciding what to do.'}]},
  {turns:[{speaker:'LEFT',text:'That is better than rereading the same short reply all evening.'},{speaker:'RIGHT',text:'What would you ask yourself before you hit send?'}]}
]};

test('weekly reel calendar starts with the locked Sunday head-to-head, then rotates formats',()=>{
  assert.equal(formatForDate('2026-11-15'),'split');
  assert.equal(formatForDate('2026-11-16'),'story');
  assert.equal(formatForDate('2026-11-17'),'archetype');
  assert.equal(formatForDate('2026-11-22'),'split');
});

test('archetype rotation assigns diverse characters and settings across days',()=>{
  assert.equal(archetypeForDate('2026-11-15').referenceFile, 'ref_dating_cafe.jpg');
  assert.equal(archetypeForDate('2026-11-16').referenceFile, 'ref_coworkers_mixed.jpg');
  assert.equal(archetypeForDate('2026-11-17').referenceFile, 'ref_friends_habit.jpg');
  assert.equal(archetypeForDate('2026-11-20').referenceFile, 'reference.jpg');
  assert.match(archetypeForDate('2026-11-16').characters, /charcoal crewneck/i);
  assert.match(archetypeForDate('2026-11-15').characters, /olive knit sweater/i);
});

test('makeSceneRequest incorporates dynamic character archetype into prompt',()=>{
  const dummyBuffer = Buffer.from('fake-jpeg-data');
  const req = makeSceneRequest(script, 0, dummyBuffer);
  const promptText = req.input[0].content[0].text;
  assert.match(promptText, /charcoal crewneck/i);
  assert.match(promptText, /office pantry/i);
});

test('script validator permits non-branded split stories and rejects unsupported competitor comparisons',()=>{
  assert.equal(validateTalkingScript(script,{date:script.date}),script);
  const competitor={...script,format:'split',hook:'ChatGPT versus TwinGenie',scenes:script.scenes};
  assert.throws(()=>validateTalkingScript(competitor,{date:script.date}),/captured evidence/);
});

test('word timestamp transcript must match the exact intended spoken line',()=>{
  const one={scenes:[{turns:[{speaker:'LEFT',text:'I was going to send the message tonight.'}]}]};
  const transcript={words:['I','was','going','to','send','the','message','tonight'].map((word,i)=>({word,start:i*.2,end:i*.2+.1}))};
  assert.equal(validateTranscript(one,0,transcript),true);
  assert.throws(()=>validateTranscript(one,0,{words:[...transcript.words.slice(0,7),{word:'tomorrow'}]}),/differs/);
});

test('daily package carries the Android CTA, YouTube pinned comment, and iOS comment prompt',()=>{
  const pkg=buildTalkingPackage(script);
  assert.equal(pkg.creativeVersion,'talking_reels_v1');
  assert.match(pkg.instagram.caption,/Download TwinGenie on Google Play/);
  assert.match(pkg.instagram.caption,/Comment iOS/);
  assert.equal(pkg.linkedin.format,'video');
  assert.match(pkg.youtube.description, /Download TwinGenie on Google Play/i);
  assert.match(pkg.youtube.pinnedComment, /Download TwinGenie on Google Play/i);
});
