/** Local runtime preflight: never publishes or contacts the database. */
import fs from 'fs';
import {spawnSync} from 'child_process';
import {LINKEDIN_FORMAT_CALENDAR} from '../src/services/growth/linkedinEditorialService.js';
const checks=[];
for(const [command,args] of [['python3',['-c','import PIL,edge_tts; print("Pillow and edge-tts available")']],['ffmpeg',['-version']],['ffprobe',['-version']]]) {
 const r=spawnSync(command,args,{encoding:'utf8',timeout:10000});checks.push({check:command,passed:r.status===0});
}
for(const name of ['night-chat.png','life-coach.png','everyday-joy.png'])checks.push({check:name,passed:fs.existsSync(new URL('../src/services/growth/assets/companion/'+name,import.meta.url))});
checks.push({check:'font',passed:fs.existsSync(new URL('../src/services/growth/assets/fonts/Font-Black.ttf',import.meta.url))});
console.log(JSON.stringify({passed:checks.every(c=>c.passed),checks,linkedinCalendar:LINKEDIN_FORMAT_CALENDAR,dailyWriting:'Existing Groq/Gemini credentials; reviewed fallback',artwork:'Reused approved images',publishes:false},null,2));
if(checks.some(c=>!c.passed))process.exitCode=1;
