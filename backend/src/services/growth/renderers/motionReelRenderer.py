#!/usr/bin/env python3
"""Original layered 2D motion reels. Bounded memory, real narration timing, no stock/competitor assets."""
import asyncio, bisect, hashlib, json, math, os, subprocess, sys, time, wave
from array import array
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
FONTS = ROOT.parent / 'assets/fonts'
W, H, FPS = 1080, 1920, 30
NAVY, CREAM, MINT, ORANGE, PURPLE = '#172033', '#FFF5E5', '#9EF2CE', '#FF8661', '#7967E8'
FONT_CACHE = {}
def font(size, bold=True):
    key=(size,bold)
    if key not in FONT_CACHE:
        FONT_CACHE[key]=ImageFont.truetype(str(FONTS / ('Font-Black.ttf' if bold else 'Font-Bold.ttf')),size)
    return FONT_CACHE[key]
def ease(x): return 1-(1-max(0,min(1,x)))**3
def box(draw,rect,fill,r=28,outline=None,width=2): draw.rounded_rectangle(tuple(int(v) for v in rect),r,fill=fill,outline=outline,width=width)
def words(draw,text,xy,size,color,max_width=850,max_lines=3):
    f=font(size); lines=[];line=''
    for word in str(text).split():
        test=(line+' '+word).strip()
        if draw.textlength(test,font=f)>max_width and line:lines.append(line);line=word
        else:line=test
    if line:lines.append(line)
    if len(lines)>max_lines:
        raise ValueError(f'Text does not fit {max_lines} lines: {text}')
    x,y=xy
    for line in lines:draw.text((x,y),line,font=f,fill=color);y+=int(size*1.22)
    return y

def character(im,x,y,scale=1,smile=False,t=0,phone=False):
    """One consistent, original character. Pose changes; no frame-by-frame illustration generation."""
    layer=Image.new('RGBA',(500,600));d=ImageDraw.Draw(layer)
    bob=int(math.sin(t*3)*4)
    d.ellipse((75,535,425,575),fill=(23,32,51,25))
    box(d,(150,420,205,555),NAVY,23);box(d,(285,420,340,555),NAVY,23)
    box(d,(92,235,408,450),PURPLE,86)
    # arms, neck and head
    d.line((128,300,80,415),fill='#FFCCA8',width=48)
    d.line((370,300,420,355 if phone else 415),fill='#FFCCA8',width=48)
    box(d,(218,206+bob,278,270+bob),'#F7B88D',18)
    d.ellipse((142,35+bob,358,255+bob),fill='#FFCCA8')
    d.pieslice((132,14+bob,370,214+bob),180,355,fill=NAVY)
    d.ellipse((137,83+bob,173,190+bob),fill=NAVY)
    d.ellipse((198,139+bob,212,157+bob),fill=NAVY)
    d.ellipse((286,139+bob,300,157+bob),fill=NAVY)
    d.line((190,122+bob,219,118+bob),fill=NAVY,width=5)
    d.line((279,118+bob,307,124+bob),fill=NAVY,width=5)
    if smile:d.arc((220,162+bob,280,210+bob),8,172,fill=NAVY,width=5)
    else:d.arc((224,179+bob,276,216+bob),195,340,fill=NAVY,width=5)
    d.text((214,315),'T',font=font(58),fill=CREAM)
    if phone:
        box(d,(392,265,458,384),NAVY,15);box(d,(400,277,450,369),MINT,8)
    size=(int(500*scale),int(600*scale));layer=layer.resize(size,Image.Resampling.LANCZOS)
    im.paste(layer,(int(x-size[0]/2),int(y-size[1]/2)),layer)

def background(dark=False):
    im=Image.new('RGB',(W,H),NAVY if dark else CREAM);d=ImageDraw.Draw(im)
    c='#242F44' if dark else '#F0E5D5'
    for x in range(60,W,120):
        for y in range(220,1670,120):d.ellipse((x,y,x+3,y+3),fill=c)
    return im
BACKGROUNDS=[background(False),background(True)]

def render_frame(c,scene,p,t,caption):
    dark=scene in (1,3);im=BACKGROUNDS[int(dark)].copy();d=ImageDraw.Draw(im)
    fg=CREAM if dark else NAVY; accent=MINT if dark else PURPLE
    d.ellipse((82,157,110,185),fill=accent);d.text((128,145),'TwinGenie',font=font(33),fill=fg)
    d.text((82,192),'A DIFFERENT PERSPECTIVE',font=font(17),fill=accent)
    # Sparse progress marks, clear of platform controls.
    for j in range(6):box(d,(82+j*149,245,210+j*149,251),accent if j<=scene else ('#35415B' if dark else '#E0D5C7'),3)
    enter=ease(p*7);dy=int((1-enter)*45)
    if scene==0:
        words(d,c['hook'],(82,305+dy),91,NAVY,870,3)
        character(im,540,1110,1.15 + .28*(1-ease(p*3)),False,t)
        d=ImageDraw.Draw(im)
        for j,label in enumerate(['ONE MORE TAB','NEW PLAN','MORE RESEARCH']):
            arrival=ease(max(0,p*5-j*.65))
            x=(82 if j!=1 else 700)+int((1-arrival)*(-180 if j!=1 else 180));y=760+j*170+int(math.sin(t*1.5+j)*9)
            box(d,(x,y,x+282,y+98),MINT if j==0 else '#FFFFFF',22,outline='#DDD1C0')
            d.text((x+16,y+34),label,font=font(18),fill=NAVY)
        d.text((82,1370),'Sound familiar?',font=font(33),fill=PURPLE)
    elif scene==1:
        words(d,'Busy doesn’t always mean moving.',(82,310+dy),77,CREAM,850,3)
        # A moving bead on a loop visualizes the problem, rather than describing it in a text wall.
        cx,cy,r=540,1010,260
        d.arc((cx-r,cy-r,cx+r,cy+r),0,359,fill='#52617E',width=25)
        a=t*1.7;x=cx+math.cos(a)*r;y=cy+math.sin(a)*r
        d.ellipse((x-27,y-27,x+27,y+27),fill=ORANGE)
        for j,label in enumerate(['PLAN','RESEARCH','RESTART']):
            a=j*math.pi*2/3-math.pi/2;x=cx+math.cos(a)*r;y=cy+math.sin(a)*r
            box(d,(x-140,y-40,x+140,y+40),MINT,19)
            d.text((x-d.textlength(label,font=font(25))/2,y-14),label,font=font(25),fill=NAVY)
        words(d,'What is the next actual step?',(130,1350),40,MINT,820,2)
    elif scene==2:
        words(d,'Ask a different question.',(82,310+dy),78,NAVY,850,2)
        phone_y=595+int((1-enter)*100)
        box(d,(150,phone_y,930,phone_y+790),NAVY,55)
        box(d,(168,phone_y+18,912,phone_y+772),'#FFFFFF',42)
        d.text((220,phone_y+72),'TwinGenie',font=font(36),fill=NAVY)
        d.text((220,phone_y+125),'Illustrative conversation',font=font(22),fill='#736B83')
        box(d,(285,phone_y+210,865,phone_y+367),PURPLE,25)
        words(d,c['question'],(318,phone_y+242),35,'#FFFFFF',515,3)
        if p>.20:
            sy=phone_y+410+int((1-ease((p-.20)*5))*45)
            box(d,(213,sy,848,sy+245),MINT,25)
            words(d,c['reply'],(247,sy+34),38,NAVY,563,4)
        d.text((220,phone_y+706),'Example, not a user testimonial',font=font(21),fill='#736B83')
    elif scene==3:
        words(d,'Same thought. New perspective.',(82,310+dy),77,CREAM,855,3)
        labels=[('NORMAL','Think it through'),('REFLECTIVE','Make space'),('HONEST','Question the excuse'),('FUTURE','See the bigger picture')]
        selected={'normal':0,'reflective':1,'dark':2,'future':3}.get(c.get('mode'),0)
        for j,(title,sub) in enumerate(labels):
            x=82+(j%2)*459;y=760+(j//2)*243
            active=j==selected
            yy=y+int(math.sin(t*2+j)*5)
            box(d,(x,yy,x+425,yy+205),MINT if active else '#29364E',27)
            color=NAVY if active else CREAM
            d.text((x+28,yy+40),title,font=font(30),fill=color)
            words(d,sub,(x+28,yy+104),27,color,370,2)
        d.text((82,1350),'Choose what helps you reflect.',font=font(34),fill=MINT)
    elif scene==4:
        words(d,'Make it smaller.',(82,310+dy),91,NAVY,870,2)
        box(d,(82,630,960,1250),MINT,46)
        d.text((130,700),'ONE NEXT STEP',font=font(27),fill=NAVY)
        words(d,c['action'],(130,790),66,NAVY,770,4)
        progress=ease(p*1.2)
        box(d,(130,1130,910,1150),'#74CFA8',10)
        if progress>0:box(d,(130,1130,130+780*progress,1150),NAVY,10)
        d.text((130,1185),'Small enough to try today.',font=font(26),fill=NAVY)
        words(d,'A suggestion to explore, not a diagnosis.',(82,1340),29,PURPLE,850,2)
    else:
        words(d,'A clearer next step.',(82,310+dy),85,NAVY,870,2)
        character(im,540,925,1.05,True,t,True);d=ImageDraw.Draw(im)
        box(d,(148,1260,932,1380),PURPLE,35)
        d.text((540-d.textlength('Meet TwinGenie',font=font(48))/2,1290),'Meet TwinGenie',font=font(48),fill='#FFFFFF')
        d.text((540-d.textlength('Google Play · Link in bio',font=font(28))/2,1415),'Google Play · Link in bio',font=font(28),fill=NAVY)
    # Actual word-boundary subtitles: high contrast, no collision with product UI.
    if caption:
        cap=caption.strip();f=font(44);width=min(900,int(d.textlength(cap,font=f)+64))
        box(d,((W-width)//2,1550,(W+width)//2,1650),NAVY,22)
        d.text(((W-d.textlength(cap,font=f))//2,1573),cap,font=f,fill='#FFFFFF')
    return im

def duration(path):
    return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(path)],text=True).strip())

async def voice(text,path,voice_name):
    import edge_tts
    timings=[]
    async def generate():
        with open(path,'wb') as f:
            async for chunk in edge_tts.Communicate(text,voice_name,rate='+0%',boundary='WordBoundary',connect_timeout=10,receive_timeout=30).stream():
                if chunk['type']=='audio':f.write(chunk['data'])
                elif chunk['type']=='WordBoundary':timings.append({'start':chunk['offset']/10000000,'end':(chunk['offset']+chunk['duration'])/10000000,'text':chunk['text']})
    await asyncio.wait_for(generate(),45)
    if not timings:raise RuntimeError('Narration word timing unavailable; refusing an unsynchronised export')
    return timings

def srt_time(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'

def render(spec,output):
    started=time.monotonic();c=spec['creative'];out=Path(output);out.parent.mkdir(parents=True,exist_ok=True)
    if c.get('version')!='motion_v2' or len(c.get('narration',[]))!=6:raise ValueError('Six-scene motion_v2 creative required')
    cache=out.parent/'.narration';cache.mkdir(exist_ok=True)
    clips=[];ends=[];caps=[];offset=0
    for text in c['narration']:
        digest=hashlib.sha256((text+'en-US-GuyNeural').encode()).hexdigest()[:20]
        p=cache/(digest+'.mp3');timing_path=cache/(digest+'.json')
        if not p.exists() or not timing_path.exists():
            timing=asyncio.run(voice(text,p,'en-US-GuyNeural'));timing_path.write_text(json.dumps(timing))
        else:timing=json.loads(timing_path.read_text())
        length=duration(p)
        if length>6.5:raise ValueError('Scene narration too long; shorten this script')
        for j in range(0,len(timing),4):
            group=timing[j:j+4]
            caps.append({'start':offset+group[0]['start'],'end':offset+group[-1]['end']+.10,'text':' '.join(w['text'] for w in group)})
        clips.append(p);offset+=length;ends.append(offset)
    if not 12<=offset<=36:raise ValueError(f'Unexpected reel duration {offset:.1f}s')
    captions_path=out.with_suffix('.srt');captions_path.write_text('\n\n'.join(f'{i+1}\n{srt_time(x["start"])} --> {srt_time(x["end"])}\n{x["text"]}' for i,x in enumerate(caps)))
    timeline=out.with_suffix('.storyboard.json');timeline.write_text(json.dumps({'creative':c,'sceneEnds':ends,'captions':caps},indent=2))
    concat=out.parent/'narration_concat.txt';concat.write_text(''.join("file '"+str(p.resolve()).replace("'","'\\''")+"'\n" for p in clips))
    narration=out.parent/'narration.wav'
    subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(concat),'-ar','48000','-ac','1',str(narration)],check=True)
    # An original soft sound bed and beat accents, not unlicensed trend music.
    sfx=out.parent/'sound_design.wav';rate=24000;audio=array('h')
    for i in range(math.ceil(offset*rate)):
        t=i/rate;fade=min(t/0.25,1,(offset-t)/.35)
        value=.012*math.sin(2*math.pi*110*t)+.008*math.sin(2*math.pi*164.81*t)
        for start in [0]+ends[:-1]:
            dt=t-start
            if 0<=dt<.13:value+=.06*math.sin(2*math.pi*(560-1500*dt)*dt)*math.exp(-30*dt)
        audio.append(int(max(-1,min(1,value*max(0,fade)))*32767))
    with wave.open(str(sfx),'wb') as f:f.setnchannels(1);f.setsampwidth(2);f.setframerate(rate);f.writeframes(audio.tobytes())
    cmd=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',str(narration),'-i',str(sfx),'-filter_complex','[1:a][2:a]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=7[a]','-map','0:v','-map','[a]','-c:v','libx264','-preset','veryfast','-crf','20','-threads','2','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-t',str(offset),'-movflags','+faststart',str(out)]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=subprocess.PIPE)
    cap_starts=[x['start'] for x in caps]
    try:
        for frame in range(math.ceil(offset*FPS)):
            t=frame/FPS;scene=min(5,bisect.bisect_right(ends,t));start=ends[scene-1] if scene else 0;p=(t-start)/(ends[scene]-start)
            ci=bisect.bisect_right(cap_starts,t)-1;caption=caps[ci]['text'] if ci>=0 and t<=caps[ci]['end'] else ''
            image=render_frame(c,scene,p,t,caption)
            if abs(p-.5)<1/((ends[scene]-start)*FPS):image.save(out.parent/f'scene_{scene+1}.jpg',quality=90)
            proc.stdin.write(image.tobytes())
        proc.stdin.close();err=proc.stderr.read().decode();code=proc.wait()
        if code:raise RuntimeError('Video encoder failed: '+err[-1000:])
    except Exception:
        proc.kill();proc.wait();raise
    actual=duration(out)
    return {'success':True,'videoPath':str(out),'durationSeconds':round(actual,2),'resolution':f'{W}x{H}','fps':FPS,'hasVoiceover':True,'renderVersion':'motion_v2','sceneCount':6,'creativeId':c['id'],'hookVariant':c['hookVariant'],'captionsPath':str(captions_path),'storyboardPath':str(timeline),'renderSeconds':round(time.monotonic()-started,2)}



def render_motion_slide(slide,index,total,output):
    """Matching mobile-readable carousel art; legacy carousel layouts are not modified."""
    dark=index in (2,4);bg=NAVY if dark else CREAM;fg=CREAM if dark else NAVY
    im=Image.new('RGB',(1080,1350),bg);d=ImageDraw.Draw(im);accent=MINT if dark else PURPLE
    d.ellipse((72,92,96,116),fill=accent);d.text((115,81),'TwinGenie',font=font(30),fill=fg)
    d.text((875,85),f'{index:02} / {total:02}',font=font(26),fill=accent)
    d.text((72,161),slide.get('tag','A DIFFERENT PERSPECTIVE'),font=font(24),fill=accent)
    if index==1:
        words(d,slide['title'],(72,260),86,fg,930,3)
        words(d,slide.get('subtitle',''),(72,590),41,fg,880,3)
        box(d,(72,865,495,1145),MINT,35)
        d.text((112,910),'PAUSE.',font=font(55),fill=NAVY)
        d.text((112,1005),'ONE NEXT STEP.',font=font(30),fill=NAVY)
        character(im,770,1010,.7,False,0)
    elif index==2:
        words(d,'Ask a different question.',(72,260),78,fg,930,3)
        box(d,(72,530,1008,1110),'#FFFFFF',40)
        d.text((112,573),'Illustrative conversation',font=font(28),fill=NAVY)
        box(d,(330,660,958,815),PURPLE,25)
        words(d,slide.get('subtitle',''),(365,696),39,'#FFFFFF',550,2)
        box(d,(112,865,923,1040),MINT,25)
        words(d,slide.get('content',''),(148,895),43,NAVY,735,3)
    elif index==3:
        words(d,'Make it smaller.',(72,260),86,fg,930,2)
        box(d,(72,560,1008,1100),MINT,40)
        d.text((116,619),'TRY THIS TODAY',font=font(29),fill=NAVY)
        words(d,slide.get('subtitle',''),(116,728),65,NAVY,830,4)
        box(d,(116,1015,959,1036),NAVY,10)
    else:
        words(d,'Your turn.',(72,260),92,fg,930,2)
        words(d,slide.get('question',''),(72,510),65,fg,930,4)
        box(d,(72,940,1008,1110),PURPLE,35)
        d.text((122,980),'A different perspective.',font=font(48),fill='#FFFFFF')
    d=ImageDraw.Draw(im)
    d.text((72,1220),'twingenie.app',font=font(28),fill=accent)
    d.text((700,1220),'Google Play',font=font(28),fill=accent)
    im.save(output,'PNG');return im


if __name__=='__main__':
    try:print(json.dumps(render(json.loads(sys.argv[1]),sys.argv[2])))
    except Exception as e:print(json.dumps({'success':False,'error':str(e)}),file=sys.stderr);sys.exit(1)
