"""Caption and assemble two transcript-checked native scenes plus the fixed CTA."""
from pathlib import Path
import json, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

W,H,FPS=1080,1920,24
WHITE=(249,249,253);MINT=(177,246,220)
def run(args): subprocess.run(args,check=True)
def words_of(transcript):
    if transcript.get('words'): return transcript['words']
    return [w for seg in transcript.get('segments',[]) for w in seg.get('words',[])]
def wrap_text(text,draw,f,width):
    lines=[];line=''
    for word in text.split():
        trial=(line+' '+word).strip()
        if line and draw.textbbox((0,0),trial,font=f)[2]>width:lines.append(line);line=word
        else:line=trial
    if line:lines.append(line)
    return lines
def main(spec_path):
    spec=json.loads(Path(spec_path).read_text());script=spec['script'];out=Path(spec['output']);tmp=out.parent/'render';tmp.mkdir(parents=True,exist_ok=True)
    fonts=Path(spec['fonts']);regular_path=str(fonts/'Inter-Variable.ttf');bold_path=str(fonts/'Font-Bold.ttf')
    normalized=[];durations=[]
    for i,(source,transcript,scene) in enumerate(zip(spec['files'],spec['transcripts'],script['scenes'])):
        ws=words_of(transcript);expected=[w for turn in scene['turns'] for w in turn['text'].split()]
        if len(ws)<max(1,int(len(expected)*0.85)):raise RuntimeError(f'Scene {i+1}: transcript is shorter than scripted speech')
        ws=ws[:len(expected)]
        end=float(ws[-1].get('end',0));start=float(ws[0].get('start',0))
        if end<1.0 or end>11.8 or start>1.5:raise RuntimeError(f'Scene {i+1}: speech timing outside quality bounds')
        duration=min(12.0,end+.42);durations.append(duration)
        total_expected=max(1,len(expected));offset_exp=0;turn_windows=[]
        for t_idx, turn in enumerate(scene['turns']):
            count=len(turn['text'].split())
            start_idx=min(int(round(offset_exp*len(ws)/total_expected)),len(ws)-1)
            a=max(0,float(ws[start_idx].get('start',0))-.03)
            is_last=(t_idx==len(scene['turns'])-1)
            end_idx=len(ws)-1 if is_last else min(max(start_idx,int(round((offset_exp+count)*len(ws)/total_expected))-1),len(ws)-1)
            b=float(ws[end_idx].get('end',a))+.12
            offset_exp+=count
            turn_windows.append((a,b,turn['text']))
        target=tmp/f'scene-{i+1}.mp4'
        decode=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-i',str(source),'-t',str(duration),'-vf',f'scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS}','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],stdout=subprocess.PIPE)
        encode=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',str(source),'-map','0:v:0','-map','1:a:0','-t',str(duration),'-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ar','48000','-movflags','+faststart',str(target)],stdin=subprocess.PIPE)
        regular=ImageFont.truetype(regular_path,43);heavy=ImageFont.truetype(bold_path,46);frame_size=W*H*3
        frame_ix=0
        while True:
            raw=decode.stdout.read(frame_size)
            if len(raw)!=frame_size:break
            local=frame_ix/FPS;frame_ix+=1
            image=Image.frombytes('RGB',(W,H),raw).convert('RGBA');d=ImageDraw.Draw(image)
            if i==0 and local<2.8:
                lines=wrap_text(script['hook'],d,heavy,W-130);d.rounded_rectangle((42,78,W-42,78+len(lines)*58+35),radius=20,fill=(8,12,20,190))
                for j,line in enumerate(lines):d.text((64,96+j*58),line,font=heavy,fill=WHITE)
            active=next((txt for a,b,txt in turn_windows if a<=local<=b),None)
            if active:
                caption_font=regular;lines=wrap_text(active,d,caption_font,W-150)
                if len(lines)>2:caption_font=ImageFont.truetype(bold_path,36);lines=wrap_text(active,d,caption_font,W-150)
                lineh=52;y=H-245-len(lines)*lineh
                d.rounded_rectangle((58,y-15,W-58,y+len(lines)*lineh+12),radius=18,fill=(5,9,17,224))
                for j,line in enumerate(lines):
                    bounds=d.textbbox((0,0),line,font=caption_font);x=(W-(bounds[2]-bounds[0]))//2;d.text((x,y+j*lineh),line,font=caption_font,fill=MINT)
            encode.stdin.write(image.convert('RGB').tobytes())
        decode.stdout.close();encode.stdin.close()
        if decode.wait()!=0 or encode.wait()!=0:raise RuntimeError('Caption/video rendering failed')
        normalized.append(target)
    normalized.append(Path(spec['cta']));durations.append(5.0)
    args=['ffmpeg','-hide_banner','-loglevel','error','-y']
    for p in normalized:args+=['-i',str(p)]
    filters=[];v=[];a=[]
    for i,duration in enumerate(durations):
        filters.append(f'[{i}:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS},format=yuv420p[v{i}]')
        filters.append(f'[{i}:a]aresample=48000,apad,atrim=duration={duration:.3f},asetpts=PTS-STARTPTS[a{i}]')
        v.append(f'[v{i}]');a.append(f'[a{i}]')
    filters += [''.join(v)+f'concat=n={len(v)}:v=1:a=0[vout]',''.join(a)+f'concat=n={len(a)}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=9[aout]']
    args += ['-filter_complex',';'.join(filters),'-map','[vout]','-map','[aout]','-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(out)]
    run(args)
    info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(out)]));total=float(info['format']['duration'])
    if not 7<=total<=30:raise RuntimeError(f'Reel duration outside 7-30 seconds: {total}')
    print(json.dumps({'videoPath':str(out),'durationSeconds':total,'resolution':'1080x1920','qa':{'speechTranscriptChecked':True,'timedCaptions':True,'fixedAndroidCTA':True}}))
if __name__=='__main__':main(sys.argv[1])
