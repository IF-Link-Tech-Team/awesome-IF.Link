import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.resolve(root, process.env.MONTHLY_BUILD_DIR || 'build');
const content = JSON.parse(fs.readFileSync(path.join(buildDir, 'content.json'), 'utf8'));
const expectedImages = (content.projects || []).filter(project => project.hasImage).length;
const profile = path.resolve(root, `.tmp/export-chrome-${process.pid}`);
const tiles = path.resolve(root, `.tmp/export-tiles-${process.pid}`);
const scale = 1080 / 375;
const tileHeight = 1200;
fs.rmSync(profile, { recursive: true, force: true });
fs.rmSync(tiles, { recursive: true, force: true });
fs.mkdirSync(tiles, { recursive: true });
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-pipe', `--user-data-dir=${profile}`, 'about:blank'
], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
let serial = 0;
let sessionId;
let buffer = '';
const pending = new Map();
const events = new Map();
chrome.stdio[4].on('data', chunk => {
  buffer += chunk.toString();
  let index;
  while ((index = buffer.indexOf('\0')) >= 0) {
    const message = JSON.parse(buffer.slice(0, index));
    buffer = buffer.slice(index + 1);
    if (message.id) {
      const callback = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
      else callback.resolve(message.result);
    } else if (events.has(message.method)) {
      events.get(message.method)(message.params);
      events.delete(message.method);
    }
  }
});
const send = (method, params = {}, session = true) => new Promise((resolve, reject) => {
  const id = ++serial;
  pending.set(id, { resolve, reject });
  chrome.stdio[3].write(JSON.stringify({ id, method, params, ...(session ? { sessionId } : {}) }) + '\0');
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const outputs = [];
try {
  const target = await send('Target.createTarget', { url: 'about:blank' }, false);
  sessionId = (await send('Target.attachToTarget', { targetId: target.targetId, flatten: true }, false)).sessionId;
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const sources = [
    { name: 'HTML', url: `${pathToFileURL(path.join(buildDir, 'monthly.html')).href}?static=1` },
    { name: 'SVG', url: pathToFileURL(path.join(buildDir, 'monthly-preview.html')).href }
  ];
  for (const source of sources) {
    const loaded = new Promise(resolve => events.set('Page.loadEventFired', resolve));
    await send('Page.navigate', { url: source.url });
    await loaded;
    const state = await evaluate(`(async () => {
      await document.fonts.ready;
      document.querySelector('.preview-controls')?.remove();
      document.querySelector('.toolbar')?.remove();
      const svg = document.querySelector('main.poster > svg');
      if (svg) {
        svg.pauseAnimations();
        svg.setCurrentTime(20);
        for (const animation of svg.querySelectorAll('animate[attributeName="opacity"][repeatCount="indefinite"]')) {
          animation.parentElement.setAttribute('opacity', '1');
          animation.remove();
        }
      }
      const rect = el => { const r = el.getBoundingClientRect(); return { width: r.width, height: r.height }; };
      return {
        width: document.querySelector('#poster,.poster').getBoundingClientRect().width,
        height: svg ? Number(svg.getAttribute('height')) : document.querySelector('#poster').getBoundingClientRect().height,
        support: [...document.querySelectorAll('.support-card')].map(rect),
        timeline: [...document.querySelectorAll('.timeline-card')].map(rect),
        events: [...document.querySelectorAll('.event-row')].map(el => {
          const name = el.querySelector('.event-name').getBoundingClientRect();
          const date = el.querySelector('.event-date').getBoundingClientRect();
          return { text: el.innerText.replace(/\\n/g, ' '), gap: date.left - name.right };
        }),
        projects: [...document.querySelectorAll('.project-card')].map(el => {
          const bounds = el.getBoundingClientRect();
          const image = el.querySelector('img');
          return { width: bounds.width, height: bounds.height, loaded: !image || image.complete && image.naturalWidth > 0 };
        }),
        embeddedImages: svg ? svg.querySelectorAll('image').length : null,
        textCount: svg ? svg.querySelectorAll('text').length : null,
        visibleTextCount: svg ? [...svg.querySelectorAll('text')].filter(el => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getBBox().width > 0 && el.getBBox().height > 0).length : null
      };
    })()`);
    if (state.width !== 375 || !state.height) throw new Error(`Unexpected page dimensions: ${JSON.stringify(state)}`);
    if (state.textCount !== null && state.textCount !== state.visibleTextCount) throw new Error(`Hidden SVG text: ${JSON.stringify(state)}`);
    if (state.events.some(event => event.gap < 0)) throw new Error(`Event name overlaps its date: ${JSON.stringify(state.events)}`);
    if (state.projects.some(project => project.width < 300 || !project.loaded)) throw new Error(`Project card layout or image failed: ${JSON.stringify(state.projects)}`);
    if (state.embeddedImages !== null && state.embeddedImages !== expectedImages) throw new Error(`Expected ${expectedImages} project images: ${state.embeddedImages}`);
    const height = Math.ceil(state.height);
    const output = path.join(buildDir, `monthly-${source.name}-1080.png`);
    const files = [];
    for (let y = 0; y < height; y += tileHeight) {
      const clipHeight = Math.min(tileHeight, height - y);
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y, width: 375, height: clipHeight, scale } });
      const file = path.join(tiles, `${source.name}-${y}.png`);
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      files.push({ file, y, height: clipHeight });
    }
    outputs.push({ name: source.name, output, files, height, state });
    console.log(`${source.name}: ${height}px design height, ${state.textCount ?? 'DOM'} texts, ${state.visibleTextCount ?? 'rendered'} visible`);
  }
  const pythonSource = `
from PIL import Image
from pathlib import Path
import json, sys
result = []
for item in json.loads(sys.argv[1]):
    height = round(item['height'] * ${scale})
    canvas = Image.new('RGB', (1080, height), '#f4f1e8')
    for part in item['files']:
        with Image.open(part['file']) as image:
            if image.width != 1080:
                raise ValueError(f"Unexpected tile width: {image.size}")
            canvas.paste(image.convert('RGB'), (0, round(part['y'] * ${scale})))
    canvas.save(item['output'], optimize=True)
    result.append({'file': str(item['output']), 'width': canvas.width, 'height': canvas.height, 'bytes': Path(item['output']).stat().st_size})
print(json.dumps(result, ensure_ascii=False, indent=2))
`;
  const pythonCommand = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  const merged = spawnSync(pythonCommand, ['-c', pythonSource, JSON.stringify(outputs)], { encoding: 'utf8' });
  if (merged.status !== 0) throw new Error(merged.stderr || 'PNG stitching failed');
  console.log(merged.stdout);
  await send('Browser.close', {}, false);
} finally {
  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { encoding: 'utf8' });
    if (result.status !== 0) console.warn(`Chrome cleanup: ${result.stdout || result.stderr}`);
  } else if (!chrome.killed) chrome.kill();
  await new Promise(resolve => setTimeout(resolve, 1000));
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 500 });
  fs.rmSync(tiles, { recursive: true, force: true, maxRetries: 20, retryDelay: 500 });
}
