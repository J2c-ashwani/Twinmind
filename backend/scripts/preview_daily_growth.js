/** Preview only. Does not publish, invoke the scheduler or write database history. */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import {spawnSync} from 'child_process';
import {buildSocialPilotPackage} from '../src/services/growth/reelCreativeService.js';
import {CompanionDailyContentService} from '../src/services/growth/companionDailyContentService.js';
const args=Object.fromEntries(process.argv.slice(2).map(v=>v.replace(/^--/,'').split('=')));
if(!args.output || !path.isAbsolute(args.output))throw new Error('Use --output=/absolute/preview/path');
const out=args.output;fs.mkdirSync(out,{recursive:true});
const date=new Date((args.date||'2026-11-16')+'T09:00:00+05:30');
let creative=buildSocialPilotPackage(date,{hookVariant:'A'}).facebook.creative;
if(args.offline!=='true') {
 const service=new CompanionDailyContentService();
 creative=await service.draft(date);
}
const pkg=buildSocialPilotPackage(date,{creative,includeCaptionLink:true});
fs.writeFileSync(path.join(out,'package.json'),JSON.stringify(pkg,null,2));
fs.writeFileSync(path.join(out,'LinkedIn_Caption.txt'),pkg.linkedin.caption);
fs.writeFileSync(path.join(out,'spec.json'),JSON.stringify({creative},null,2));
const result=spawnSync('python3',[new URL('../src/services/growth/renderers/motionReelRenderer.py',import.meta.url).pathname,JSON.stringify({creative}),path.join(out,'Daily_Companion.mp4')],{encoding:'utf8',timeout:240000,maxBuffer:1000000});
fs.writeFileSync(path.join(out,'render.json'),result.stdout||'');fs.writeFileSync(path.join(out,'error.txt'),result.stderr||'');
if(result.status!==0)throw new Error('Preview rendering failed; see error.txt');
console.log(JSON.stringify({success:true,source:creative.contentSource||'reviewed_fallback',format:pkg.linkedin.format,topic:pkg.topic,video:path.join(out,'Daily_Companion.mp4'),databaseWrites:false,socialPublishing:false}));
