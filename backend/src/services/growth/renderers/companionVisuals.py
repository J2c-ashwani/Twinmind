"""Approved companion artwork with layered motion; all text remains rendered, not baked into art."""
import math
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
W,H=1080,1920
ROOT=Path(__file__).resolve().parent.parent
ART={}
def artwork(name):
 if name not in ['night-chat.png','life-coach.png','everyday-joy.png']:raise ValueError('Unknown companion artwork')
 if name not in ART:ART[name]=Image.open(ROOT/'assets/companion'/name).convert('RGB')
 return ART[name]
FONTS={}
MASKS={}
def font(size):
 if size not in FONTS:FONTS[size]=ImageFont.truetype(str(ROOT/'assets/fonts/Font-Black.ttf'),size)
 return FONTS[size]
def text(d,value,x,y,size=56,width=900,max_lines=3,color='#FFFFFF'):
 lines=[];line='';f=font(size)
 for word in str(value).split():
  attempt=(line+' '+word).strip()
  if d.textlength(word,font=f)>width:raise ValueError('Unbreakable word exceeds frame')
  if d.textlength(attempt,font=f)>width and line:lines.append(line);line=word
  else:line=attempt
 if line:lines.append(line)
 if len(lines)>max_lines:raise ValueError(f'Companion text exceeds {max_lines} lines: {value}')
 for row in lines:d.text((x,y),row,font=f,fill=color);y+=int(size*1.21)
 return y

def card(im,value,x,y,width=900,size=52,fill='#AFF6D8',color='#101725',label=None,max_lines=3):
 d=ImageDraw.Draw(im);top=y+40
 if label:top+=46
 # Measure using the same layout function on a disposable small canvas.
 end=text(ImageDraw.Draw(Image.new('RGB',(1,1))),value,0,top,size,width-80,max_lines,color)
 bottom=end+40
 if bottom>1490:raise ValueError('Companion card collides with captions')
 d.rounded_rectangle((x,y,x+width,bottom),radius=32,fill=fill)
 if label:d.text((x+40,y+26),label,font=font(24),fill='#827A91')
 text(d,value,x+40,top,size,width-80,max_lines,color)
 return bottom

def render_companion_frame(c,scene,p,t,caption):
 source=artwork(c['heroAsset']);iw,ih=source.size
 scale=max(W/iw,H/ih)*(1.025+.035*p)
 rw,rh=round(iw*scale),round(ih*scale)
 # Bicubic gives smooth, subtle camera movement with bounded render time.
 resized=source.resize((rw,rh),Image.Resampling.BICUBIC)
 left=int((rw-W)/2+math.sin(t*.35)*min(12,(rw-W)/2));top=int((rh-H)/2)
 im=resized.crop((left,top,left+W,top+H));resized.close()
 # An 8-bit reusable alpha mask avoids three full-size RGBA buffers per frame.
 dark=scene in (2,3,4)
 if dark not in MASKS:
  mask=Image.new('L',(W,H));md=ImageDraw.Draw(mask)
  for y in range(H):
   a=int(max(max(0,1-y/850)*215,max(0,(y-1170)/750)*225))
   md.line((0,y,W,y),fill=max(a,65) if dark else a)
  MASKS[dark]=mask
 im.paste((9,14,27),(0,0,W,H),MASKS[dark]);d=ImageDraw.Draw(im)
 if scene==0:
  d.text((82,183),'12:47 AM' if c['heroAsset']=='night-chat.png' else 'AN EVERYDAY MOMENT',font=font(26),fill='#AFF6D8')
  text(d,c['hook'],82,300,80,900,3)
 else:
  d.text((82,163),'TwinGenie',font=font(44),fill='#FFFFFF')
  d.text((82,220),'AI companion · Illustrative conversation',font=font(24),fill='#AFF6D8')
  title='The message she sent.' if c.get('editStyle')=='dialogue_reveal' and scene<5 else c.get('sceneTitles',[c['hook']]*6)[scene]
  text(d,title,82,320,65,900,3)
 if scene==0:
  typed=c.get('inputText',c['question']);shown=typed[:max(1,int(len(typed)*min(1,p*2)))]
  if c.get('editStyle')=='dialogue_reveal' and p>.55:shown=typed[:max(0,int(len(typed)*(1-(p-.55)/.45)))] or '…'
  card(im,shown,82,1120,900,58,'#FFFFFF','#171B27','DRAFT',2)
 elif c.get('editStyle')=='dialogue_reveal' and scene<5:
  card(im,c['question'],234,590,760,54,'#7967E8','#FFFFFF',max_lines=2)
  if scene==1:
   d=ImageDraw.Draw(im)
   for j in range(3):
    y=961+int(math.sin(t*7+j)*5);d.ellipse((122+j*42,y,142+j*42,y+20),fill='#AFF6D8')
  elif scene in (2,3):
   end=card(im,c['reply'],82,900,900,54,max_lines=3)
   if scene==3:card(im,c['followupText'],360,end+45,634,45,'#7967E8','#FFFFFF',max_lines=2)
  else:
   card(im,c['followupText'],360,910,634,45,'#7967E8','#FFFFFF',max_lines=2)
   card(im,c['payoffText'],82,1150,900,54,max_lines=3)
 elif scene==1:
  card(im,c.get('inputText',c['question']),82,1070,900,62,'#FFFFFF','#171B27',max_lines=3)
 elif scene==2:
  end=card(im,c['question'],234,660,760,47,'#7967E8','#FFFFFF',max_lines=3)
  card(im,c['reply'],82,end+40,900,52,max_lines=3)
 elif scene==3:
  feature=c['feature']
  if feature=='memory':
   card(im,c.get('memoryEarlier','I want more time outside.'),82,720,900,47,'#FFFFFF','#171B27','EARLIER',2)
   card(im,c.get('memoryLater','I tried that walk.'),82,1030,900,47,'#AFF6D8','#171B27','LATER',2)
  elif feature=='twin_match':
   card(im,c.get('matchA','Everyone over for dinner'),82,660,900,46,'#FFFFFF','#171B27','YOU',2)
   card(im,c.get('matchB','A quiet afternoon'),82,940,900,46,'#AFF6D8','#171B27','YOUR FRIEND',2)
   text(ImageDraw.Draw(im),'Invite → accept → compare',82,1270,37,900,1,color='#AFF6D8')
  elif feature=='perspectives':
   for j,label in enumerate(['Normal','Reflective','Honest','Future']):card(im,label,82,630+j*175,900,43,'#AFF6D8' if j==3 else '#FFFFFF','#171B27',max_lines=1)
  elif feature=='mood':
   d=ImageDraw.Draw(im)
   for j,color in enumerate(['#7967E8','#FFAD8C','#AFF6D8','#F6D38A','#9FCFFF']):d.rounded_rectangle((82+j*181,840,222+j*181,1080),28,fill=color)
   text(d,'Self-reported mood · illustrative view',82,1150,29,900,2)
  else:
   card(im,c['action'],82,920,900,60,max_lines=4)
 elif scene==4:
  card(im,c['action'],82,1000,900,62,max_lines=4)
 else:
  card(im,c.get('cta','Try one conversation'),82,1260,900,53,max_lines=2)
  d=ImageDraw.Draw(im);d.text((115,1465),'AI companion · Google Play',font=font(28),fill='#FFFFFF')
 if caption:
  d=ImageDraw.Draw(im);f=font(44);cap_width=min(910,math.ceil(d.textlength(caption,font=f))+64)
  # Word-boundary groups can contain a long word. Wrap rather than clip them.
  measure=ImageDraw.Draw(Image.new('RGB',(1,1)));end=text(measure,caption,0,1560,44,850,2)
  d.rounded_rectangle(((W-cap_width)//2,1540,(W+cap_width)//2,end+20),22,fill='#0C1324')
  text(d,caption,(W-cap_width)//2+30,1560,44,cap_width-60,2)
 return im

def render_companion_slide(slide,index,total,output):
 im=artwork(slide.get('heroAsset','night-chat.png')).resize((1080,1620),Image.Resampling.LANCZOS).crop((0,120,1080,1470)).convert('RGBA')
 overlay=Image.new('RGBA',im.size,(9,14,27,150));im=Image.alpha_composite(im,overlay).convert('RGB');d=ImageDraw.Draw(im)
 d.text((72,75),'TwinGenie',font=font(38),fill='#FFFFFF');d.text((870,85),f'{index}/{total}',font=font(28),fill='#AFF6D8')
 text(d,slide.get('tag','AN EVERYDAY MOMENT'),72,164,24,930,2,color='#AFF6D8')
 text(d,slide.get('title','Your turn'),72,255,76,930,3)
 if index==2:
  end=card(im,slide.get('subtitle',''),190,580,818,43,'#7967E8','#FFFFFF',max_lines=3)
  card(im,slide.get('content',''),72,end+35,936,47,max_lines=3)
 elif index==4:
  text(d,slide.get('question',''),72,600,59,900,5)
 else:
  card(im,slide.get('subtitle',''),72,710,936,54,max_lines=4)
 d=ImageDraw.Draw(im);d.text((72,1210),'AI companion · Illustrative example',font=font(25),fill='#AFF6D8')
 im.save(output,'PNG');return im
