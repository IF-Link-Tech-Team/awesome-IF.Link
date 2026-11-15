#!/usr/bin/env python3
"""Download source article images and preserve an ordered provenance manifest."""
import argparse,json,re,urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin,urlparse
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('url');p.add_argument('--output',required=True);p.add_argument('--html');p.add_argument('--include-pattern');a=p.parse_args()
out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
class Images(HTMLParser):
 def __init__(self):super().__init__();self.items=[];self.context=[]
 def handle_data(self,s):
  if s.strip():self.context=(self.context+[s.strip()])[-6:]
 def handle_starttag(self,t,attrs):
  if t!='img':return
  d=dict(attrs);u=d.get('data-src') or d.get('data-original') or d.get('src')
  if not u or u.startswith('data:'):return
  u=urljoin(a.url,u)
  if urlparse(u).scheme not in ('http','https'):return
  if a.include_pattern and not re.search(a.include_pattern,u):return
  if not a.include_pattern and re.search(r'logo|favicon|avatar|icon',u,re.I):return
  if any(x['source_url']==u for x in self.items):return
  self.items.append({'source_url':u,'alt':d.get('alt',''),'nearby_text':' '.join(self.context)[-800:]})
html=Path(a.html).read_text() if a.html else urllib.request.urlopen(a.url,timeout=35).read().decode('utf-8')
f=Images();f.feed(html)
def download(pair):
 i,item=pair;item=dict(item);item['index']=i+1
 try:
  req=urllib.request.Request(item['source_url'],headers={'User-Agent':'Mozilla/5.0','Referer':a.url})
  blob=urllib.request.urlopen(req,timeout=40).read();tmp=out/f'{i+1:02d}.download';tmp.write_bytes(blob)
  with Image.open(tmp) as im:
   suffix='jpg' if im.format=='JPEG' else 'png' if im.format=='PNG' else im.format.lower();item['width'],item['height']=im.size
  dest=out/f'{i+1:02d}.{suffix}';tmp.rename(dest);item.update(status='downloaded',local_path=str(dest.resolve()))
 except Exception as e:item.update(status='failed',error=str(e))
 return item
with ThreadPoolExecutor(max_workers=6) as ex:results=list(ex.map(download,enumerate(f.items)))
(out/'manifest.json').write_text(json.dumps({'article_url':a.url,'images':results},ensure_ascii=False,indent=2))
print(json.dumps({'found':len(results),'downloaded':sum(x['status']=='downloaded' for x in results)},ensure_ascii=False))
if not results or any(x['status']=='failed' for x in results):raise SystemExit('Image inventory incomplete: request the missing original images before rendering affected steps.')
