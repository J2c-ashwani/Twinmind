import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {formatForDate,archetypeForDate,ARCHETYPES,SUPERNOVA_ARCHETYPES,SUPERNOVA_START_DATE,validateTalkingScript,talkingScriptPrompt,buildTalkingPackage} from '../src/services/growth/talkingReelCreativeService.js';
import {validateTranscript,makeSceneRequest,TalkingReelService} from '../src/services/growth/talkingReelService.js';

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
      {speaker:'LEFT',text:'Wait, since when are you wise about texting back?'},
      {speaker:'RIGHT',text:'TwinGenie roasted me first. Put the phone down.'}
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

test('makeSceneRequest builds pure image-free text-to-video for scene 1 and previous_interaction_id extension for scene 2',()=>{
  const req1 = makeSceneRequest(legacyScript, 0);
  const req2 = makeSceneRequest(legacyScript, 1, { previousInteractionId: 'v1_scene1_abc' });
  const text1 = req1.input[0].content[0].text;
  const text2 = req2.input[0].content[0].text;
  assert.equal(req1.input[0].content.length, 1);
  assert.equal(req2.input[0].content.length, 1);
  assert.equal(req1.background, true);
  assert.equal(req2.background, true);
  assert.equal(req1.previous_interaction_id, undefined);
  assert.equal(req2.previous_interaction_id, 'v1_scene1_abc');
  assert.equal(req1.response_format[0].duration, '12s');
  assert.equal(req2.response_format[0].duration, '10s');
  assert.equal(req1.generation_config.video_config, undefined);
  assert.match(text1, /slate-blue athletic t-shirt/i);
  assert.match(text1, /neighborhood gym/i);
  assert.match(text2, /Extend the previous video seamlessly/i);
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

test('script validator caps Scene 2 at 20 words under viralGate so 10s extension never clips TwinGenie',()=>{
  const bloated={
    ...viralStoryScript,
    scenes:[
      viralStoryScript.scenes[0],
      {turns:[
        {speaker:'LEFT',text:'One two three four five six seven eight nine ten eleven twelve.'},
        {speaker:'RIGHT',text:'TwinGenie thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twenty-one.'}
      ]}
    ]
  };
  assert.throws(()=>validateTalkingScript(bloated,{date:viralStoryScript.date,viralGate:true}),/Scene 2 exceeds 10s extension/);
});

test('TalkingReelService polls async background Vertex interactions and slices combined Scene 2 extension',async()=>{
  const docs=new Map();
  const blobs=new Map();
  const day='2026-11-26';
  const memStore={
    async init(){},
    async read(k){return docs.has(k)?structuredClone(docs.get(k)):null;},
    async create(k,v){if(docs.has(k))return false;docs.set(k,structuredClone(v));return true;},
    async write(k,v){docs.set(k,structuredClone(v));},
    async list(prefix){return [...docs.entries()].filter(([k])=>k.startsWith(prefix)).map(([,v])=>v);},
    async recentTopics(){return [];},
    async putBytes(b,k,buf){blobs.set(`${b}/${k}`,Buffer.from(buf));return `https://cdn.example.com/${b}/${k}`;},
    async bytes(b,k){return Buffer.from(blobs.get(`${b}/${k}`));},
    async cleanup(){}
  };
  await memStore.create(`jobs/${day}/script.json`,{...viralStoryScript,date:day});
  const fakeClip=(label)=>Buffer.from(label.repeat(2000));
  const calls=[];
  let pollCount=0;
  const slicedTargets=[];
  const svc=new TalkingReelService({
    jobStore:memStore,
    pollIntervalMs:1,
    clock:()=>new Date(`${day}T06:00:00Z`),
    sceneRequest:async(payload,pollId)=>{
      calls.push({payload,pollId});
      if(payload){
        assert.equal(payload.background,true);
        const sceneNum=payload.labels.scene;
        return {id:`int_scene_${sceneNum}`,status:'in_progress',model:'models/gemini-omni-1.2-flash'};
      }
      pollCount+=1;
      return {
        id:pollId,
        status:'completed',
        steps:[{type:'model_output',content:[{type:'video',data:fakeClip(pollId).toString('base64')}]}]
      };
    },
    probeDuration:async(file)=>file.endsWith('scene-1.mp4')?12.0:22.0,
    sliceExtension:async(rawExt,outFile,offset)=>{
      slicedTargets.push({rawExt,outFile,offset});
      await fs.promises.writeFile(outFile,fakeClip('sliced_s2'));
    },
    transcribe:async(file)=>{
      const turns=file.endsWith('scene-1.mp4')?viralStoryScript.scenes[0].turns:viralStoryScript.scenes[1].turns;
      const ws=turns.flatMap(t=>t.text.split(/\s+/)).map((word,i)=>({word,start:i*0.3,end:i*0.3+0.25}));
      return {words:ws};
    },
    review:async()=>({pass:true,issues:[]}),
    render:async(spec)=>{
      await fs.promises.writeFile(spec.output,fakeClip('rendered_final'));
      return {videoPath:spec.output,durationSeconds:17.2,qa:{ok:true}};
    }
  });
  const ready=await svc.prepare(day);
  assert.equal(ready.creativeId,day);
  assert.equal(pollCount,2);
  assert.equal(calls.filter(c=>c.payload).length,2);
  assert.equal(calls.find(c=>c.payload?.labels?.scene==='2').payload.previous_interaction_id,'int_scene_1');
  assert.equal(slicedTargets.length,1);
  assert.equal(slicedTargets[0].offset,12.0);
});

test('Supernova 80/20 playbook activates strictly on 2026-11-27+ with Indian multi-generation casts and keeps 2026-11-26 intact',()=>{
  assert.equal(SUPERNOVA_START_DATE, '2026-11-27');
  // 2026-11-26 stays on legacy cast
  assert.equal(archetypeForDate('2026-11-26').id, 'genz_supermarket_debate');
  // 2026-11-27 (Friday) launches Father & Son Confrontation with warm natural Indian English
  const fri = archetypeForDate('2026-11-27');
  assert.equal(fri.id, 'supernova_dad_son_table');
  assert.match(fri.characters, /52-year-old Indian father/i);
  assert.equal(fri.voiceStyle, 'warm natural Indian English');

  // Saturday -> Mother & Daughter, Sunday -> Head-to-Head Split (~20%)
  const sat = archetypeForDate('2026-11-28');
  assert.equal(sat.id, 'supernova_mom_daughter_hallway');
  const sun = archetypeForDate('2026-11-29');
  assert.equal(formatForDate('2026-11-29'), 'split');
  assert.equal(sun.id, 'supernova_park_split_proof');

  // Verify makeSceneRequest injects warm Indian English + frame-0.1s tension instead of American English lock
  const dadScript = {...viralStoryScript, date: '2026-11-27', format: 'story'};
  const scene1 = makeSceneRequest(dadScript, 0);
  const scene2 = makeSceneRequest(dadScript, 1, { previousInteractionId: 'int_dad_1' });
  assert.match(scene1.input[0].content[0].text, /warm natural Indian English/);
  assert.doesNotMatch(scene1.input[0].content[0].text, /American English/);
  assert.match(scene1.input[0].content[0].text, /IMMEDIATE visual tension at frame 0\.1s/);
  assert.match(scene2.input[0].content[0].text, /warm natural Indian English/);

  // Verify prompt & packaging on 2026-11-27 include Supernova openers, Indian discovery tags, and non-robotic LinkedIn copy
  const prompt = talkingScriptPrompt('2026-11-27');
  assert.match(prompt, /SUPERNOVA 80\/20 VIRAL PLAYBOOK/);
  assert.match(prompt, /PARENT CONFRONTATION/);
  const pkg = buildTalkingPackage(dadScript);
  assert.ok(pkg.youtube.tags.includes('RelatableIndia'));
  assert.ok(pkg.youtube.tags.includes('IndianParents'));
  assert.doesNotMatch(pkg.linkedin.caption, /In this fictional scene, two friends/);
  assert.equal(Object.keys(SUPERNOVA_ARCHETYPES).length, 7);
});
