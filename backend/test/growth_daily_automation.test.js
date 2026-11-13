import {describe,it,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {getLinkedInFormat,validateLinkedInEditorial} from '../src/services/growth/linkedinEditorialService.js';
import {buildMotionCreative,buildSocialPilotPackage} from '../src/services/growth/reelCreativeService.js';
import {CompanionDailyContentService,normalizeDailyCompanion} from '../src/services/growth/companionDailyContentService.js';
import {uploadLinkedInVideo} from '../src/services/growth/linkedinVideoService.js';
import linkedin from '../src/services/growth/adapters/linkedinAdapter.js';
import orchestrator from '../src/services/growth/growthOrchestratorService.js';
import media from '../src/services/growth/mediaRendererService.js';
import generator from '../src/services/growth/contentGeneratorService.js';
import packages from '../src/services/growth/approvedContentPackageService.js';
import {respondToGrowthJob} from '../src/services/growth/growthWebhookService.js';
import slots from '../src/services/growth/publicationSlotService.js';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'twingenie-linkedin-qa-'));
const mp4=path.join(tmp,'sample.mp4');fs.writeFileSync(mp4,Buffer.alloc(100000,7));
after(()=>{fs.rmSync(tmp,{recursive:true,force:true});setTimeout(()=>process.exit(0),50);});
function response(data={},status=200,headers={}) {return {ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data),headers:{get:key=>headers[key.toLowerCase()] || null}};}
function rawStory() {
 const question='Can I say something unfinished?';const reply='Start anywhere. Which part is on your mind?';
 return {topic:'Room for an unfinished thought',hooks:['The sentence you started three times.','You can start before it makes sense.'],question,reply,followupText:'I am happy for them. And jealous.',payoffText:'Both can be true. Which would you like to explore?',action:'Start with the unfinished version.',actionTitle:'A little room for the real thought.',discussion:'What helps you start a difficult conversation?',inputText:'Never mind.',sceneTitles:['An unfinished thought.','Start anywhere.','A little room to talk.','Two feelings at once.','Get curious about both.','Try one conversation.'],narration:['You typed, never mind.',question,reply,'I am happy for them. And jealous.','Both can be true. Which would you like to explore?','TwinGenie. Try one conversation.'],linkedinEditorial:`An unfinished thought can still be a useful place to begin.\n\nAn illustrative exchange: “${question}” “${reply}”\n\nA conversational app does not need to rush every uncertain sentence into a complete plan. Leaving room for someone to find their words is one small design choice that matters. TwinGenie is an AI companion for everyday conversations, including the ones that begin a little awkwardly.\n\nWhat makes a reply feel attentive to you?\n\n#TwinGenie #AICompanion`};
}
function memoryDb(recent=[]) {
 const records=new Map();
 return {records,from(table) {let key;return {select(){return this;},eq(k,v){key=v;return this;},like(){return this;},order(){return this;},limit:async()=>({data:table==='users'?[{id:'owner'}]:recent.map(t=>({action_type:'growth_topic:'+t}))}),maybeSingle:async()=>({data:records.has(key)?records.get(key):null}),insert:async row=>{if(records.has(row.id))return {error:{code:'23505'}};records.set(row.id,row);return {error:null};}};}};
}
function uploadFetch({failProcessing=false,failPost=false}={}) {
 const calls=[];let polls=0;
 const fetchFn=async(url,options={})=>{
  calls.push({url,method:options.method,headers:options.headers,body:typeof options.body==='string'?JSON.parse(options.body):null});
  if(url.includes('action=initializeUpload'))return response({value:{video:'urn:li:video:test',uploadToken:'',uploadInstructions:[{firstByte:0,lastByte:49999,uploadUrl:'https://uploads.example.invalid/one'},{firstByte:50000,lastByte:99999,uploadUrl:'https://uploads.example.invalid/two'}]}});
  if(url.startsWith('https://uploads.')) {let bytes=0;for await(const chunk of options.body)bytes+=chunk.length;assert.equal(bytes,50000);assert(!options.headers.Authorization);return response({},200,{etag:url.endsWith('one')?'"first"':'"second"'});}
  if(url.includes('action=finalizeUpload')) {assert.deepEqual(JSON.parse(options.body).finalizeUploadRequest.uploadedPartIds,['first','second']);return response({},204);}
  if(url.includes('/rest/videos/'))return response({status:failProcessing?'PROCESSING_FAILED':(++polls===1?'PROCESSING':'AVAILABLE')});
  if(url.endsWith('/rest/posts')) {if(failPost)throw new Error('timeout');return response({},201,{'x-restli-id':'urn:li:share:test'});}
  throw new Error('Unexpected request');
 };
 return {fetchFn,calls};
}

describe('Daily companion and mixed LinkedIn publishing',()=>{
 it('selects three videos, three documents and one text post with IST date boundaries',()=>{
  const counts={video:0,carousel_pdf:0,text:0};for(let i=0;i<7;i++)counts[getLinkedInFormat(new Date(Date.UTC(2026,10,16+i,6)))]++;
  assert.deepEqual(counts,{video:3,carousel_pdf:3,text:1});
  assert.equal(getLinkedInFormat(new Date('2026-11-15T18:29:59Z')),'carousel_pdf');
  assert.equal(getLinkedInFormat(new Date('2026-11-15T18:30:00Z')),'video');
 });
 it('generates once across concurrent callers and persists the same canonical draft across restarts',async()=>{
  const db=memoryDb(['A topic already published']);let calls=0;let prompt;
  const service=new CompanionDailyContentService({db,requestJson:async p=>{calls++;prompt=p;return rawStory();}});
  const date=new Date('2026-11-16T09:00:00+05:30');const results=await Promise.all([service.get(date),service.get(date),service.get(date)]);
  assert.equal(calls,1);assert(prompt.includes('A topic already published'));assert.equal(results[0].contentSource,'daily_generated');assert.deepEqual(results[0],results[2]);
  const restarted=new CompanionDailyContentService({db,requestJson:async()=>{throw new Error('Must not generate twice');}});
  assert.deepEqual(await restarted.get(date),results[0]);
  assert.equal([...db.records.values()].filter(r=>r.action_type.startsWith('growth_topic:')).length,1);
 });
 it('rejects repeated topics and unsafe or mismatched dialogue, retaining a reviewed outage fallback',async()=>{
  const raw=rawStory();const service=new CompanionDailyContentService({db:memoryDb([raw.topic]),requestJson:async()=>raw});
  assert.equal((await service.get(new Date('2026-11-16T09:00:00+05:30'))).contentSource,'reviewed_fallback');
  const base=buildMotionCreative({episodeId:'midnight_chat'});
  assert.equal(normalizeDailyCompanion({...raw,narration:['Intro','Wrong question',...raw.narration.slice(2)]},base).narration[1],raw.question);
  assert.throws(()=>validateLinkedInEditorial('I suffered from anxiety and this app guaranteed it would eliminate the problem forever. '.repeat(2)));
  assert.equal(normalizeDailyCompanion({...raw,payoffText:'Try moon‑cheese toast.'},base).payoffText,'Try moon-cheese toast.');
  assert.throws(()=>normalizeDailyCompanion({...raw,hooks:['Ever chatted with a night owl AI?',raw.hooks[1]]},base));
 });
 it('keeps the declared offline mode free from database and provider calls',async()=>{
  const service=new CompanionDailyContentService({db:{from(){throw new Error('Database touched');}},requestJson:async()=>{throw new Error('Provider touched');}});
  const c=await service.get(new Date(),{_skipExternalLlm:true});assert.equal(c.contentSource,'reviewed_fallback');
 });
 it('uploads exact byte ranges without sending the bearer to signed upload URLs and waits for availability',async()=>{
  const mock=uploadFetch();const urn=await uploadLinkedInVideo({accessToken:'test',authorUrn:'urn:li:person:test',filePath:mp4,fetchFn:mock.fetchFn,sleep:async()=>{}});
  assert.equal(urn,'urn:li:video:test');assert.equal(mock.calls.filter(c=>c.url.includes('/rest/videos/')).length,2);
 });
 it('creates exactly one native video feed post and no automated comment',async()=>{
  const mock=uploadFetch();const oldFetch=linkedin._fetch;const oldSleep=linkedin._videoSleep;
  try {
   linkedin._fetch=mock.fetchFn;linkedin._videoSleep=async()=>{};
   const result=await linkedin.publish({target:'personal',accessToken:'test',authorUrn:'urn:li:person:test',videoPath:mp4,caption:'A real product example',skipFirstComment:true});
   assert.equal(result.success,true);assert.equal(result.mediaType,'video');
   const posts=mock.calls.filter(c=>c.url.endsWith('/rest/posts'));assert.equal(posts.length,1);assert.equal(posts[0].body.content.media.id,'urn:li:video:test');
   assert.equal(posts[0].body.distribution.feedDistribution,'MAIN_FEED');assert(!mock.calls.some(c=>c.url.includes('/comments')));
  } finally {linkedin._fetch=oldFetch;linkedin._videoSleep=oldSleep;}
 });
 it('does not create a feed post if video processing fails, and propagates an ambiguous feed result for reconciliation',async()=>{
  const oldFetch=linkedin._fetch;const oldSleep=linkedin._videoSleep;
  try {
   linkedin._videoSleep=async()=>{};let mock=uploadFetch({failProcessing:true});linkedin._fetch=mock.fetchFn;
   const failed=await linkedin.publish({target:'personal',accessToken:'test',authorUrn:'urn:li:person:test',videoPath:mp4,caption:'Example'});
   assert.equal(failed.success,false);assert(!mock.calls.some(c=>c.url.endsWith('/rest/posts')));
   mock=uploadFetch({failPost:true});linkedin._fetch=mock.fetchFn;
   await assert.rejects(()=>linkedin.publish({target:'personal',accessToken:'test',authorUrn:'urn:li:person:test',videoPath:mp4,caption:'Example'}),/reconciliation required/);
   assert.equal(mock.calls.filter(c=>c.url.endsWith('/rest/posts')).length,1);
  } finally {linkedin._fetch=oldFetch;linkedin._videoSleep=oldSleep;}
 });
 it('renders the actual daily creative for video, keeps documents for approved legacy packages, and skips rendering text',async()=>{
  const oldReel=media.renderReel,oldCarousel=media.renderCarousel;const calls=[];
  try {
   media.renderReel=async spec=>{calls.push(spec);return {videoPath:mp4};};media.renderCarousel=async spec=>{calls.push(spec);return {pdfPath:'example.pdf'};};
   const pkg=buildSocialPilotPackage(new Date('2026-11-16T09:00:00+05:30'));
   assert.equal((await orchestrator.renderLinkedInContent(pkg,'campaign','post')).format,'video');assert.deepEqual(calls[0].creative,pkg.facebook.creative);
   assert.equal((await orchestrator.renderLinkedInContent({linkedin:{caption:'Approved old document',slides:[]}},'campaign','post')).format,'carousel_pdf');
   const before=calls.length;assert.deepEqual(await orchestrator.renderLinkedInContent({linkedin:{format:'text'}},'campaign','post'),{format:'text'});assert.equal(calls.length,before);
  } finally {media.renderReel=oldReel;media.renderCarousel=oldCarousel;}
 });
 it('includes v3 format and creative in package integrity without changing legacy hashes',()=>{
  const legacy=packages.getApprovedPackage('linkedin','2026-11-07').package;assert.equal(packages.computePackageHash(legacy),legacy.integrityHash);
  const v3={...legacy,contentVersion:'linkedin_editorial_v3',format:'video',creative:buildMotionCreative()};assert.notEqual(packages.computePackageHash(v3),packages.computePackageHash({...v3,format:'text'}));
 });
 it('runs the scheduled LinkedIn path once, stores its real format, and retains the existing no-comment policy',async()=>{
  const targets=[orchestrator,slots,generator,media,packages,linkedin];const originals=targets.map(t=>Object.getOwnPropertyDescriptors(t));
  const flag=process.env.LINKEDIN_CONTENT_EXPERIMENT_V2;let dispatched=0,saved;
  try {
   process.env.LINKEDIN_CONTENT_EXPERIMENT_V2='true';
   orchestrator.state={posts:[],campaigns:[],isPaused:false};orchestrator._publishingLocks={linkedin:false};orchestrator._lastPublishedTimestamps={linkedin:0};
   orchestrator.isSystemPaused=()=>false;orchestrator.checkDurableLedger=async()=>({isBlocked:false});orchestrator.acquireDurableLock=async()=>{};orchestrator.releaseDurableLock=async()=>{};orchestrator.commitDurableLedger=async()=>{};orchestrator._transitionSlot=async()=>{};orchestrator._saveState=()=>{};
   slots.claimSlot=async()=>({granted:true,slotKey:'test'});slots.releaseSlot=async()=>{};linkedin.hasPublishedTodayIST=async()=>false;
   packages.getApprovedPackage=()=>({valid:false,reason:'offline test'});packages.saveApprovedPackage=p=>{saved=p;};
   const pkg=buildSocialPilotPackage(new Date('2026-11-16T09:00:00+05:30'),{includeCaptionLink:true});generator.getOrGenerateDailyContent=async()=>pkg;
   media.renderReel=async spec=>{assert.deepEqual(spec.creative,pkg.facebook.creative);return {videoPath:mp4,creativeRevision:'test'};};
   linkedin.postToPersonalProfile=async p=>{dispatched++;assert.equal(p.videoPath,mp4);assert.equal(p.skipFirstComment,true);assert.equal(p.firstComment,null);return {success:true,postId:'urn:li:share:test',url:'https://example.invalid/post'};};
   const first=await orchestrator.publishDailyLinkedInPersonal(false);assert.equal(first.success,true);assert.equal(orchestrator.state.posts[0].format,'video');assert.equal(saved.format,'video');
   assert.equal((await orchestrator.publishDailyLinkedInPersonal(false)).reason,'recently_published');assert.equal(dispatched,1);
   orchestrator._lastPublishedTimestamps.linkedin=0;orchestrator.state.posts=[];const transitions=[];orchestrator._transitionSlot=async(_claim,status)=>transitions.push(status);
   linkedin.postToPersonalProfile=async()=>{const error=new Error('timeout');error.code='LINKEDIN_PUBLISH_AMBIGUOUS';throw error;};
   const uncertain=await orchestrator.publishDailyLinkedInPersonal(false);assert.equal(uncertain.needsVerification,true);assert(transitions.includes('verifying'));assert(!transitions.includes('failed'));
   assert.equal((await orchestrator.publishDailyLinkedInPersonal(false)).reason,'publish_outcome_unknown');
  } finally {
   for(let i=0;i<targets.length;i++) {for(const key of Reflect.ownKeys(targets[i]))if(!Object.hasOwn(originals[i],key))delete targets[i][key];Object.defineProperties(targets[i],originals[i]);}
   if(flag===undefined)delete process.env.LINKEDIN_CONTENT_EXPERIMENT_V2;else process.env.LINKEDIN_CONTENT_EXPERIMENT_V2=flag;
  }
 });
 it('shares a successful motion render across platform callers and rebuilds a missing file',async()=>{
  const old=media._renderReel,oldCache=media._motionCache;let calls=0;
  const file=path.join(tmp,'shared.mp4');
  try {
   media._motionCache=new Map();media._renderReel=async()=>{calls++;await new Promise(r=>setTimeout(r,5));fs.writeFileSync(file,'rendered');return {videoPath:file};};
   const creative=buildMotionCreative();
   const results=await Promise.all(['linkedin','facebook','instagram','youtube'].map(postId=>media.renderReel({postId,creative})));
   assert.equal(calls,1);assert(results.every(r=>r.videoPath===file));fs.unlinkSync(file);
   await media.renderReel({creative});assert.equal(calls,2);
  } finally {media._renderReel=old;media._motionCache=oldCache;}
 });

 it('acknowledges a background webhook before slow work completes and preserves synchronous callers',async()=>{
  let complete,calls=0,finished=false;
  const pending=new Promise(r=>{complete=r;});
  const res={statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
  await respondToGrowthJob({query:{async:'true'}},res,async()=>{calls++;await pending;finished=true;return {success:true};},{platform:'linkedin'});
  assert.equal(res.statusCode,202);assert.equal(res.body.status,'in_progress');assert.equal(calls,1);assert.equal(finished,false);
  complete();await new Promise(r=>setImmediate(r));assert.equal(finished,true);
  const sync={...res,body:null};await respondToGrowthJob({query:{}},sync,async()=>({success:true,postId:'verified'}),{platform:'linkedin'});
  assert.equal(sync.body.result.postId,'verified');
 });

 it('serializes distinct render workers and continues after one render fails',async()=>{
  const original=media._renderQueue;let active=0,peak=0;
  const task=async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,5));active--;return 'ok';};
  try {
   media._renderQueue=null;
   const bad=media._queueRender(async()=>{throw Error('render rejected');});
   const good=Promise.all([media._queueRender(task),media._queueRender(task)]);
   await assert.rejects(bad,/render rejected/);assert.deepEqual(await good,['ok','ok']);assert.equal(peak,1);
  } finally {media._renderQueue=original;}
 });

});
