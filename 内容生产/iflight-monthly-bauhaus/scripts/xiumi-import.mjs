import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.resolve(root, process.env.MONTHLY_BUILD_DIR || 'build');
const action = process.argv[2] || 'inspect';
const option = name => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
if (process.argv.includes('--help')) {
  console.log('Usage: node scripts/xiumi-import.mjs <inspect|new|probe|insert|save|sync> [--target-id ID]');
  console.log('Environment: XIUMI_CDP_ENDPOINT, XIUMI_TARGET_ID, MONTHLY_BUILD_DIR');
  process.exit(0);
}
if (!['inspect', 'new', 'probe', 'insert', 'save', 'sync'].includes(action)) throw new Error(`Unknown action: ${action}`);
const content = JSON.parse(fs.readFileSync(path.join(buildDir, 'content.json'), 'utf8'));
if (content.example !== false && action !== 'inspect' && action !== 'new') throw new Error('Example content cannot be inserted, saved, or synchronized');
const endpoint = process.env.XIUMI_CDP_ENDPOINT || 'http://127.0.0.1:9444';
const targetId = option('--target-id') || process.env.XIUMI_TARGET_ID;
if (!['inspect', 'new'].includes(action) && !targetId) throw new Error('Provide --target-id or XIUMI_TARGET_ID; do not overwrite a previous article by guessing');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const version = await (await fetch(`${endpoint}/json/version`)).json();
const pages = await (await fetch(`${endpoint}/json/list`)).json();
const socket = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let serial = 0;
let sessionId;
const pending = new Map();
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(JSON.stringify(message.error)));
  else request.resolve(message.result);
});
const send = (method, params = {}, session = true) => new Promise((resolve, reject) => {
  const id = ++serial;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params, ...(session ? { sessionId } : {}) }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: action !== 'inspect' });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const canvasExpression = `[...document.querySelectorAll('[contenteditable="true"],.tn-cell[contenteditable]')].map(el=>({el,r:el.getBoundingClientRect()})).filter(item=>item.r.width>300&&item.r.height>0&&item.r.left>=600).sort((a,b)=>Number(!!b.el.querySelector('svg'))-Number(!!a.el.querySelector('svg'))||Number(b.el.innerText.length>100)-Number(a.el.innerText.length>100)||b.r.width-a.r.width)[0]?.el`;
const shareLinks = `(()=>[...document.querySelectorAll('.tn-dialog-wxarticleurl')].sort((a,b)=>Number(b.style.zIndex)-Number(a.style.zIndex)).map(e=>e.querySelector('a[href]')?.href.replace(/^http:/,'https:')).filter(Boolean))()`;

try {
  let id = targetId;
  if (action === 'new') {
    id = (await send('Target.createTarget', { url: 'https://xiumi.us/studio/v5#/paper/for/new/cube/0' }, false)).targetId;
    fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
    fs.writeFileSync(path.join(root, '.tmp/draft-target.json'), JSON.stringify({ id }));
    console.log(JSON.stringify({ id, next: `node scripts/xiumi-import.mjs probe --target-id ${id}` }));
  } else if (action === 'inspect') {
    console.log(JSON.stringify(pages.filter(page => page.type === 'page' && page.url.includes('xiumi.us/studio/v5')).map(page => ({ id: page.id, title: page.title, url: page.url })), null, 2));
  } else {
    const page = pages.find(page => page.id === id && page.url.includes('xiumi.us/studio/v5'));
    if (!page) throw new Error('The selected Xiumi editor target is not open');
    sessionId = (await send('Target.attachToTarget', { targetId: id, flatten: true }, false)).sessionId;
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    if (action === 'probe' || action === 'insert') {
      const svg = fs.readFileSync(path.join(buildDir, 'monthly-wechat.svg'), 'utf8');
      const result = await evaluate(`(() => {
        const target=${canvasExpression};
        if(!target) throw new Error('Editable canvas not found');
        const scope=angular.element(target).scope();
        scope.cell.text=${JSON.stringify(svg)};
        scope.$apply();
        return {svgCount:target.querySelectorAll('svg').length,imageCount:target.querySelectorAll('svg image').length,textCount:target.querySelectorAll('svg text').length,titleMatches:document.title.includes(${JSON.stringify(content.article.title)})};
      })()`);
      console.log(JSON.stringify(result, null, 2));
      if (result.svgCount !== 1) throw new Error(`Expected one assembled SVG root, found ${result.svgCount}`);
    } else if (action === 'save') {
      const result = await evaluate(`(async()=>{
        const target=${canvasExpression};
        if(!target) throw new Error('Editable canvas not found');
        if(!document.title.includes(${JSON.stringify(content.article.title)})) throw new Error('The editor title differs from this issue');
        const scope=angular.element(target).scope();
        await scope.onBtnClickSave();
        return {saved:true,title:document.title,images:[...target.querySelectorAll('svg image')].map(i=>i.getAttribute('href'))};
      })()`);
      console.log(JSON.stringify(result, null, 2));
    } else if (action === 'sync') {
      const before = await evaluate(shareLinks);
      const result = await evaluate(`(()=>{
        const target=${canvasExpression};
        if(!target) throw new Error('Editable canvas not found');
        if(!document.title.includes(${JSON.stringify(content.article.title)})) throw new Error('The editor title differs from this issue');
        const scope=angular.element(target).scope();
        scope.authorConfig.wxSyncArticleUrl=true;
        scope.$apply();
        scope.onBtnClickSend('origin');
        return true;
      })()`);
      if (!result) throw new Error('Synchronization did not start');
      let links = [];
      for (let attempt = 0; attempt < 40; attempt++) {
        await sleep(500);
        links = await evaluate(shareLinks);
        if (links.some(link => !before.includes(link))) break;
      }
      const shareUrl = links.find(link => !before.includes(link));
      if (!shareUrl) throw new Error('No new preview link was returned');
      fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
      fs.writeFileSync(path.join(root, '.tmp/latest-share-url.txt'), shareUrl + '\n');
      console.log(JSON.stringify({ shareUrl, published: false }));
    }
  }
} finally {
  socket.close();
}
