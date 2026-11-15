#!/usr/bin/env python3
"""Render IF.Link editorial carousel from JSON. Requires Pillow; no network."""
import argparse,json,re,subprocess,sys
from functools import lru_cache
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageFilter
ROOT=Path(__file__).resolve().parents[1]
W,H=1242,1656
SLOGAN='Link the IFs, Connect the Dots.'
INK='#242021';GREEN='#B1FA63';ORANGE='#FE7733';PURPLE='#B2A1FF';PAPER='#F7F7F2'
parser=argparse.ArgumentParser();parser.add_argument('input');parser.add_argument('--output',required=True);parser.add_argument('--font');parser.add_argument('--page',type=int);args=parser.parse_args()
font_path=args.font or str(ROOT/'assets/NotoSansSC.ttf')
@lru_cache(maxsize=32)
def font(size,weight=450):
 f=ImageFont.truetype(font_path,size)
 try:f.set_variation_by_axes([weight])
 except (OSError,ValueError,AttributeError):pass
 return f

def wrap(draw,text,f,width):
 lines=[]
 for para in text.split('\n'):
  line=''
  for c in re.findall(r'[A-Za-z0-9][A-Za-z0-9./:+_-]*|.',para):
   if draw.textlength(c,font=f)>width:raise ValueError(f'Token exceeds text width: {c}')
   if draw.textlength(line+c,font=f)>width and line:
    if c in '，。！？；：、）》”’' and len(line)>1:
     tail=re.search(r'[A-Za-z0-9][A-Za-z0-9./:+_-]*$',line)
     carry=tail.group(0) if tail else line[-1]
     lines.append(line[:-len(carry)]);line=carry+c
    else:lines.append(line);line=c.lstrip()
   else:line+=c
  lines.append(line)
 return lines

def text(draw,xy,s,size=48,fill=INK,width=1058,weight=450,leading=1.43,align="left",highlights=None,number_accent=False):
 x,y=xy;f=font(size,weight);lines=wrap(draw,s,f,width)
 flattened=''.join(lines);ranges=[]
 mapping=[i for i,c in enumerate(flattened) if not c.isspace()]
 compact=''.join(flattened[i] for i in mapping)
 for phrase in highlights or []:
  start=0;found=False;needle=''.join(phrase.split())
  if not needle:raise ValueError('Highlight must contain visible text')
  while True:
   pos=compact.find(needle,start)
   if pos<0:break
   ranges.append((mapping[pos],mapping[pos+len(needle)-1]+1,GREEN));start=pos+len(needle);found=True
  if not found:raise ValueError(f'Highlight not rendered: {phrase}')
 if number_accent:
  number=re.match(r'^\d+(?=\s)',flattened)
  if number:ranges.append((0,len(number.group()),ORANGE))
 offset=0
 for line in lines:
  tx=x+(width-draw.textlength(line,font=f))/2 if align=='center' else x
  baseline_y=y-f.getbbox(line,anchor='la')[1]
  colors=[fill]*len(line)
  for start,end,color in ranges:
   for k in range(max(0,start-offset),min(len(line),end-offset)):colors[k]=color
  k=0
  while k<len(line):
   end=k+1
   while end<len(line) and colors[end]==colors[k]:end+=1
   draw.text((tx+draw.textlength(line[:k],font=f),baseline_y),line[k:end],font=f,fill=colors[k],anchor='la')
   k=end
  offset+=len(line);y+=round(size*leading)
 return y

def logo(im,name,xy,height,dark=False):
 p=ROOT/'assets'/f'{name} {"Dark" if dark else "Light"} Background.png'
 a=Image.open(p).convert('RGBA');a=a.crop(a.getbbox());a.thumbnail((round(height*a.width/a.height),height),Image.Resampling.LANCZOS);im.paste(a,xy,a)

def footer(im,draw,n,total,dark=False):
 asset=Image.open(ROOT/'assets'/f'IF.Link {"Dark" if dark else "Light"} Background.png').convert('RGBA')
 asset=asset.crop(asset.getbbox());lw=round(35*asset.width/asset.height)
 logo(im,'IF.Link',((W-lw)//2,1540),35,dark)

def sticker(im,title,y=202,size=36):
 d=ImageDraw.Draw(im);f=font(size,650)
 width=int(d.textlength(title,font=f))+51
 if width>650:raise ValueError('Shorten label to a compact tag')
 d.rectangle((92,y,92+width,y+78),fill=ORANGE)
 text(d,(116,y+20),title,size,INK,width=width-48,weight=650,leading=1.1)
 return y+78

def grid(d,box,color):
 x0,y0,x1,y1=box
 for x in range(x0,x1+1,42):d.line((x,y0,x,y1),fill=color,width=1)
 for y in range(y0,y1+1,42):d.line((x0,y,x1,y),fill=color,width=1)

def frame(im,box,fill,ending=False,body=False):
 x0,y0,x1,y1=map(int,box);fw,fh=x1-x0,y1-y0
 shadow=Image.new('RGBA',im.size,(0,0,0,0))
 ImageDraw.Draw(shadow).rounded_rectangle((x0+8,y0+12,x1+8,y1+12),radius=42,fill=(0,0,0,100))
 shadow=shadow.filter(ImageFilter.GaussianBlur(9));im.paste(shadow,(0,0),shadow)
 tile=Image.new('RGBA',(fw,fh),fill);q=ImageDraw.Draw(tile)
 alpha=42 if ending else 100
 for x in range(0,fw,42) if not body else []:q.line((x,0,x,fh),fill=(255,255,255,alpha),width=1)
 for y in range(0,fh,42) if not body else []:q.line((0,y,fw,y),fill=(255,255,255,alpha),width=1)
 # Composite the white grid onto the solid color before applying corner alpha.
 bg=Image.new('RGBA',(fw,fh),fill);bg=Image.alpha_composite(bg,tile)
 mask=Image.new('L',(fw,fh));ImageDraw.Draw(mask).rounded_rectangle((0,0,fw-1,fh-1),radius=42,fill=255)
 im.paste(bg,(x0,y0),mask)
 ImageDraw.Draw(im).rounded_rectangle((x0,y0,x1-1,y1-1),radius=42,outline=GREEN if body else '#F5F5F0',width=10 if body else 2)

def picture(im,d,page,y,box_height=630):
 spec=page['image'];p=Path(spec['path'])
 if not p.is_absolute():p=INPUT_DIR/p
 a=Image.open(p).convert('RGB')
 if spec.get('crop'):
  x0,y0,x1,y1=spec['crop']
  if not (0<=x0<x1<=a.width and 0<=y0<y1<=a.height):raise ValueError('Invalid crop')
  a=a.crop((x0,y0,x1,y1))
 # Mask before resizing; coordinates are relative to the selected crop.
 for r in spec.get('redactions',[]):ImageDraw.Draw(a).rectangle(r,fill=INK)
 # Keep the outer frame aligned to the full content width on every page.
 body=page['type']=='body'
 padding=40 if body else 20
 inner_w=1058-2*padding
 inner_h=min(round(a.height*inner_w/a.width),max(120,box_height-2*padding))
 scale=min(inner_w/a.width,inner_h/a.height)
 a=a.resize((round(a.width*scale),round(a.height*scale)),Image.Resampling.LANCZOS)
 panel_w,panel_h=1058,inner_h+2*padding
 x0=92
 frame(im,(x0,y,x0+panel_w,y+panel_h),'#151515',body=body)
 # Preserve complete UI content inside a fixed full-width viewport.
 # Match the screenshot background when containment needs side space.
 viewport=Image.new('RGB',(inner_w,inner_h),a.getpixel((0,0)))
 viewport.paste(a,((inner_w-a.width)//2,(inner_h-a.height)//2))
 im.paste(viewport,(x0+padding,y+padding))
 end=y+panel_h
 return end

def block_text(block):
 lead=block.get('lead','')
 return f'{lead}：{block["text"]}' if lead else block['text']

def quote_panel(im,d,block,y,n):
 # Reuse exactly the screenshot panel: full width, black fill, green 10px
 # border, 42px corners, 40px padding and the same shadow.
 if block.get('highlights'):
  raise ValueError('Quoted material uses white text; move prose highlights outside the panel')
 parts=block.get('parts') or [{'text':block['text']}]
 width=978;line_height=round(44*1.36);height=80
 if block.get('heading'):
  height+=len(wrap(d,block['heading'],font(40,680),width))*round(40*1.3)+18
 for i,part in enumerate(parts):
  if part.get('heading'):
   height+=len(wrap(d,part['heading'],font(40,680),width))*round(40*1.3)+14
  height+=len(wrap(d,block_text(part),font(44,430),width))*line_height
  if i<len(parts)-1:height+=20
 if y+height>1460:
  raise ValueError(f'Page {n}: quoted material overflow; rearrange without reducing font size')
 frame(im,(92,y,1150,y+height),'#151515',body=True)
 cursor=y+40
 if block.get('heading'):
  cursor=text(d,(132,cursor),block['heading'],40,GREEN,width=width,weight=680,leading=1.3)+18
 for i,part in enumerate(parts):
  if part.get('heading'):
   cursor=text(d,(132,cursor),part['heading'],40,GREEN,width=width,weight=680,leading=1.3)+14
  lead=part.get('lead','')
  cursor=text(d,(132,cursor),block_text(part),44,'#FFFFFF',width=width,weight=430,leading=1.36,
   highlights=[lead+'：'] if lead else [])
  if i<len(parts)-1:cursor+=20
 return y+height+32

def render(page,n,total):
 cover=page['type']=='cover';green=page['type']=='ending'
 im=Image.new('RGB',(W,H),GREEN if cover or green else INK);d=ImageDraw.Draw(im)
 if cover or green:
  grid(d,(0,0,W,H),'#A6EC5A')
 if cover:
  if re.search(r'第\s*[0-9一二三四五六七八九十]+\s*期|[上下]篇',page.get('kicker','')):
   raise ValueError('Cover tag must contain topic keywords, not installment labels')
  logo(im,META.get('logo','IF.Link'),(92,86),56,False)
  y=sticker(im,page.get('kicker','学习笔记'),y=222)
  y=text(d,(92,y+44),page['title'],108,INK,weight=760,leading=1.22)
  if y>805:raise ValueError(f'Page {n} title overflow')
  y=text(d,(92,y+40),page.get('subtitle',''),40,INK,weight=430)+44
  if page.get('image'):
   end=picture(im,d,page,y,box_height=1390-y)
   if end>1490:raise ValueError(f'Page {n} image overflow')
 elif green:
  logo(im,META.get('logo','IF.Link'),(92,78),42,False)
  y=sticker(im,page.get('label','本篇总结'))
  y=text(d,(92,y+48),page['title'],84,INK,weight=740,leading=1.25)+48
  blocks=[]
  for block in page.get('blocks',[]):
   if block.get('text','').strip()==SLOGAN:continue
   if SLOGAN in block.get('text',''):
    raise ValueError('Keep the fixed slogan outside ending blocks')
   blocks.append(block)
  if not blocks:raise ValueError('Ending panel must include a concrete summary')
  panel_top=y-24
  content_height=0
  for block in blocks:
   if block.get('heading'):content_height+=len(wrap(d,block['heading'],font(40,740),1018))*round(40*1.43)+16
   content_height+=len(wrap(d,block['text'],font(44,450),1018))*round(44*1.47)+34
  panel_bottom=max(1210,panel_top+content_height+80)
  if panel_bottom>1300:raise ValueError(f'Page {n}: ending panel overflow; reserve space for the outside slogan')
  frame(im,(92,panel_top,1150,panel_bottom),'#151515',ending=True)
  y=panel_top+round((panel_bottom-panel_top-content_height)/2)
  for block in blocks:
   if block.get('heading'):y=text(d,(112,y),block['heading'],40,ORANGE,weight=740,width=1018,align=block.get('align','center'))+16
   y=text(d,(112,y),block['text'],44,'#FFFFFF',width=1018,leading=1.47,align=block.get('align','center'))+34
  if y>panel_bottom-20:raise ValueError(f'Page {n} ending overflow')
  # Brand slogan is always separate from the content summary and preview.
  text(d,(92,1380),SLOGAN,44,INK,width=1058,align='center',leading=1.3)
 else:
  logo(im,META.get('logo','IF.Link'),(92,78),42,not green)
  y=text(d,(92,214),page['title'],76,'#FFFFFF',weight=740,leading=1.25,number_accent=True)+40
  if page.get('subtitle'):y=text(d,(106,y),page['subtitle'],36,'#C4C0C1')+24
  for block in page.get('blocks',[]):
   if block.get('type') in ('quote','code'):
    y=quote_panel(im,d,block,y,n)
    continue
   if block.get('heading'):y=text(d,(106,y),block['heading'],40,GREEN,weight=680)+16
   highlights=list(block.get('highlights',[]))
   if block.get('lead'):highlights.insert(0,block['lead']+'：')
   y=text(d,(106,y),block_text(block),44,'#FFFFFF',width=1030,weight=430,leading=1.47,highlights=highlights)+32
  if page.get('image'):
   if y>1170:raise ValueError(f'Page {n}: insufficient room for readable image')
   end=picture(im,d,page,y+6,box_height=1455-y-60)
   if end>1490:raise ValueError(f'Page {n} image overflow')
  if y>1490:raise ValueError(f'Page {n} content overflow')
 footer(im,d,n,total,not (cover or green));return im
INPUT_DIR=Path(args.input).resolve().parent
data=json.loads(Path(args.input).read_text());META=data.get('meta',{});pages=data['pages'];
if not 1<=len(pages)<=18:raise ValueError('Each carousel must have 1–18 pages including cover and ending')
if len(META.get('series','IF.LEARN'))>16 or len(META.get('badge','IF.LINK'))>18:raise ValueError('Shorten series/badge metadata')
out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
if args.page:
 if not 1<=args.page<=len(pages):raise ValueError('Page outside range')
 render(pages[args.page-1],args.page,len(pages)).save(out/f'{args.page:02d}.png')
 sys.exit(0)
# Isolate each page to bound Pillow/FreeType memory usage on long tutorials.
for i in range(1,len(pages)+1):
 command=[sys.executable,str(Path(__file__).resolve()),str(Path(args.input).resolve()),'--output',str(out.resolve()),'--page',str(i)]
 if args.font:command+=['--font',args.font]
 subprocess.run(command,check=True)
thumbw,thumbh=310,414
sheet=Image.new('RGB',(thumbw*4,thumbh*((len(pages)+3)//4)), '#DEDED8')
for i in range(len(pages)):
 with Image.open(out/f'{i+1:02d}.png') as im:
  sheet.paste(im.resize((thumbw,thumbh),Image.Resampling.LANCZOS),((i%4)*thumbw,(i//4)*thumbh))
sheet.save(out/'contact-sheet.jpg',quality=93)
print(f'Rendered {len(pages)} pages, {W}x{H}; no content overflow.')
