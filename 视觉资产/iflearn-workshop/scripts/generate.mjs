import {spawn} from 'node:child_process';
import {copyFile, cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = resolve(process.argv[2] || join(skillRoot, 'content.example.json'));
const outputDir = resolve(process.argv[3] || join(process.cwd(), 'iflearn-output'));
const configDir = dirname(configPath);
const config = JSON.parse(await readFile(configPath, 'utf8'));
const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);
const resolveInput = path => path && (path.startsWith('/') ? path : resolve(configDir, path));
const titleEnSize = () => {
  const length = Array.from(config.TITLE_EN || '').length;
  if (length <= 10) return 86;
  if (length <= 16) return 82;
  if (length <= 22) return 72;
  return 62;
};
const titleZhSize = () => Array.from(config.TITLE_ZH || '').length <= 12 ? 41 : 34;

await mkdir(outputDir, {recursive: true});
await cp(join(skillRoot, 'assets'), join(outputDir, 'assets'), {recursive: true});

async function copyInput(input, destinationName) {
  const source = resolveInput(input);
  if (!source) return '';
  const destination = join(outputDir, 'assets', destinationName || `custom${extname(source)}`);
  await copyFile(source, destination);
  return destination;
}

const organizerLogoPath = await copyInput(config.ORGANIZER_LOGO, `organizer-logo${extname(config.ORGANIZER_LOGO || '')}`);
const organizerLogoHtml = organizerLogoPath
  ? `<img class="organizer-logo" src="assets/${organizerLogoPath.split('/').pop()}" alt="${escapeHtml(config.ORGANIZER)} Logo">`
  : '';

const qrPath = await copyInput(config.QR_IMAGE, `course-qr${extname(config.QR_IMAGE || '')}`);
const qrHtml = qrPath
  ? `<img src="assets/${qrPath.split('/').pop()}" alt="课程报名二维码">`
  : '<div class="qr-placeholder">二维码待补充</div>';

let illustrationHtml = '';
const illustrationSource = config.ILLUSTRATION_FILE
  ? resolveInput(config.ILLUSTRATION_FILE)
  : join(skillRoot, 'assets', 'illustrations', `${config.ILLUSTRATION || 'cube'}.svg`);
if (config.ILLUSTRATION_FILE || config.ILLUSTRATION !== 'cube') {
  if (extname(illustrationSource).toLowerCase() === '.svg') {
    illustrationHtml = await readFile(illustrationSource, 'utf8');
  } else {
    const copied = await copyInput(illustrationSource, `theme-art${extname(illustrationSource)}`);
    illustrationHtml = `<img src="assets/${copied.split('/').pop()}" alt="${escapeHtml(config.TITLE_ZH)}主题插画">`;
  }
} else {
  illustrationHtml = '<img src="assets/illustrations/cube.png" alt="IF.Learn 橙色立体模块">';
}

const schedule = Array.isArray(config.SCHEDULE)
  ? config.SCHEDULE
  : [config.BENEFIT_1, config.BENEFIT_2, config.BENEFIT_3].filter(Boolean).map(title => ({title, description: ''}));
const scheduleHtml = schedule.map((item, index) => `<div class="schedule-row"><h3><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description || '')}</p></div>`).join('');
const organizerStyle = config.ORGANIZER_STYLE || 'logo-only';
const organizerParts = [];
if (organizerStyle !== 'none') organizerParts.push(organizerLogoHtml);
if (organizerStyle === 'text') {
  if (config.ORGANIZER_LABEL) organizerParts.push(`<span class="organizer-label">${escapeHtml(config.ORGANIZER_LABEL)}</span>`);
  if (config.ORGANIZER) organizerParts.push(`<span class="organizer">${escapeHtml(config.ORGANIZER)}</span>`);
}
const bannerOrganizerName = config.BANNER_ORGANIZER ?? config.ORGANIZER ?? '';
const bannerOrganizerParts = [];
if (organizerStyle !== 'none' && organizerLogoPath) bannerOrganizerParts.push(organizerLogoHtml);
if (bannerOrganizerName) bannerOrganizerParts.push(`<span>${escapeHtml(bannerOrganizerName)}</span>`);
const steps = [1, 2, 3].map(index => ({
  title: config[`STEP${index}_TITLE`] ?? schedule[index - 1]?.title ?? '',
  desc: config[`STEP${index}_DESC`] ?? schedule[index - 1]?.description ?? ''
}));
const stepValues = Object.fromEntries(steps.flatMap((step, index) => [
  [`STEP${index + 1}_TITLE`, step.title],
  [`STEP${index + 1}_DESC`, step.desc]
]));
const derived = {
  TITLE_EN_SIZE: titleEnSize(),
  TITLE_ZH_SIZE: titleZhSize(),
  ORGANIZER_LOGO_HTML: organizerLogoHtml,
  ORGANIZER_BLOCK_HTML: organizerParts.join(''),
  BANNER_ORGANIZER_HTML: bannerOrganizerParts.join(''),
  QR_HTML: qrHtml,
  ILLUSTRATION_HTML: illustrationHtml,
  ROLLUP_SLOGAN: config.ROLLUP_SLOGAN || '用 AI，把想法做成作品',
  SCHEDULE_HTML: scheduleHtml,
  TOP_LINE: config.TOP_LINE || `${config.DURATION || ''} · 现场做出作品`,
  ...stepValues
};
const values = {...config, ...derived};

function fillTemplate(template, html) {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (token, key) => {
    if (!(key in values)) throw new Error(`Missing content field: ${key}`);
    const value = String(values[key]);
    return html && !Object.keys(derived).includes(key) ? escapeHtml(value) : value;
  });
}

const required = ['TITLE_EN', 'TITLE_ZH', 'DATE', 'TIME', 'LOCATION', 'REGISTRATION'];
const missingRequired = required.filter(field => !config[field] || !String(config[field]).trim());
if (missingRequired.length > 0) {
  console.log('缺少以下活动信息，先向用户确认（参考 references/intake.md）：');
  for (const field of missingRequired) console.log(`  - ${field}`);
  process.exit(1);
}

const templates = [
  ['horizontal.html', 'horizontal.html', true],
  ['rollup.html', 'rollup.html', true],
  ['banner.html', 'banner.html', true],
  ['wechat-forward.txt', 'wechat-forward.txt', false]
];
for (const [templateName, outputName, html] of templates) {
  const template = await readFile(join(skillRoot, 'templates', templateName), 'utf8');
  const result = fillTemplate(template, html);
  if (/{{[A-Z0-9_]+}}/.test(result)) throw new Error(`Unresolved placeholder in ${outputName}`);
  await writeFile(join(outputDir, outputName), result);
}

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = 9400 + process.pid % 400;
const chromeProfile = join(outputDir, '.chrome-render');
const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${chromeProfile}`,
  '--force-device-scale-factor=1',
  '--window-size=1280,720',
  'about:blank'
], {stdio: 'ignore'});

let ws;
try {
  let pages;
  for (let i = 0; i < 80; i++) {
    try {
      pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      break;
    } catch {
      await sleep(100);
    }
  }
  if (!pages) throw new Error('Chrome did not start');
  const page = pages.find(item => item.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolveSocket, rejectSocket) => {
    ws.onopen = resolveSocket;
    ws.onerror = rejectSocket;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const handlers = pending.get(message.id);
      pending.delete(message.id);
      message.error ? handlers.reject(message.error) : handlers.resolve(message.result);
    }
  };
  const call = (method, params = {}) => new Promise((resolveCall, rejectCall) => {
    const nextId = ++id;
    pending.set(nextId, {resolve: resolveCall, reject: rejectCall});
    ws.send(JSON.stringify({id: nextId, method, params}));
  });
  await call('Page.enable');

  const fitExpression = `(() => {
    const result = {};
    for (const selector of ['.title-orange', '.title-black']) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const preferred = parseFloat(getComputedStyle(element).fontSize);
      let low = 18;
      let high = preferred;
      const fits = size => {
        element.style.fontSize = size + 'px';
        return element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight;
      };
      if (fits(preferred)) { element.style.fontSize = preferred + 'px'; result[selector] = preferred; continue; }
      if (!fits(low)) { element.style.fontSize = low + 'px'; result[selector] = low; continue; }
      while (high - low > 0.6) {
        const middle = (low + high) / 2;
        if (fits(middle)) low = middle; else high = middle;
      }
      const finalSize = Math.floor(low * 10) / 10;
      element.style.fontSize = finalSize + 'px';
      result[selector] = finalSize;
    }
    return result;
  })()`;

  async function fitTitles(htmlName) {
    const evaluation = await call('Runtime.evaluate', {expression: fitExpression, returnByValue: true});
    const fitted = evaluation.result.value || {};
    const report = Object.entries(fitted).map(([selector, size]) => `${selector.slice(1)}=${size}px`).join(' ');
    if (htmlName === 'horizontal.html') console.log(`  字号实测: ${report || '无标题块'}`);
    return fitted;
  }

  async function capture(htmlName, outputName, width, height, deviceScaleFactor) {
    await call('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor, mobile: false});
    await call('Page.navigate', {url: pathToFileURL(join(outputDir, htmlName)).href});
    let ready = false;
    for (let i = 0; i < 100; i++) {
      const result = await call('Runtime.evaluate', {
        expression: 'window.posterReady && window.posterReady()',
        returnByValue: true
      });
      if (result.result.value) {
        ready = true;
        break;
      }
      await sleep(100);
    }
    if (!ready) throw new Error(`Assets did not finish loading: ${htmlName}`);
    const fitted = await fitTitles(htmlName);
    const screenshot = await call('Page.captureScreenshot', {format: 'png', fromSurface: true});
    await writeFile(join(outputDir, outputName), Buffer.from(screenshot.data, 'base64'));
  }

  await capture('horizontal.html', 'horizontal.png', 1280, 720, 1);
  await capture('horizontal.html', 'horizontal@2x.png', 1280, 720, 2);
  await capture('rollup.html', 'rollup.png', 800, 2000, 1);
  await capture('rollup.html', 'rollup@2x.png', 1600, 4000, 1);
  await capture('banner.html', 'banner.png', 1500, 250, 1);
  await capture('banner.html', 'banner@2x.png', 3000, 500, 1);
} finally {
  if (ws) ws.close();
  chrome.kill('SIGTERM');
  await sleep(300);
  await rm(chromeProfile, {recursive: true, force: true});
}

const pending = [];
for (const [field, label] of [
  ['DATE', '活动日期'], ['TIME', '活动时间'], ['LOCATION', '活动地点'],
  ['REGISTRATION', '报名方式与开放时间'], ['TAKEAWAY_TITLE', '课程核心收获']
]) {
  if (/待补|待定|占位|XX/i.test(String(config[field] || ''))) pending.push(`${label}（${field}）`);
}
if (!config.QR_IMAGE) pending.push('报名二维码（QR_IMAGE）未提供，海报上是占位框');
if (!config.ORGANIZER) pending.push('主办方名称（ORGANIZER）未填写');
const banned = Array.isArray(config.BANNED_TERMS) ? config.BANNED_TERMS : [];
if (banned.length > 0) {
  const produced = await Promise.all(templates.map(([, outputName]) => readFile(join(outputDir, outputName), 'utf8')));
  const hits = banned.filter(term => term && produced.some(text => text.includes(term)));
  if (hits.length > 0) console.log(`⚠️ 产物中出现禁止词：${hits.join('、')}`);
}
if (pending.length > 0) {
  console.log('\n以下信息仍待与用户确认（不要当作已完成交付）：');
  for (const item of pending) console.log(`  - ${item}`);
}

console.log(`IF.Learn workshop package generated: ${outputDir}`);
console.log('horizontal.png / horizontal@2x.png');
console.log('rollup.png / rollup@2x.png');
console.log('banner.png / banner@2x.png');
console.log('wechat-forward.txt');
