import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/render-monthly.mjs --content content.json [--output build] [--template templates/monthly.html] [--allow-example]');
  process.exit(0);
}
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const contentPath = path.resolve(root, option('--content', 'content.example.json'));
const templatePath = path.resolve(root, option('--template', 'templates/monthly.html'));
const output = path.resolve(root, option('--output', 'build'));
const allowExample = args.includes('--allow-example');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
if (content.example !== false && !allowExample) {
  throw new Error('This is example content. Copy it, replace every placeholder, and set "example" to false. Use --allow-example only for preview.');
}
const requiredArrays = [
  ['intro.cards', 2, 'two intro cards'],
  ['hero.facts', 3, 'three hero facts'],
  ['awards.items', 3, 'three award cards'],
  ['support.items', 4, 'four support cards'],
  ['timeline.items', 4, 'four timeline stages'],
  ['plaza.paths', 2, 'two project paths']
];
const get = (scope, key) => {
  if (key === '.') return scope['.'] ?? scope;
  return key.split('.').reduce((value, part) => value?.[part], scope);
};
for (const [key, length, label] of requiredArrays) {
  const value = get(content, key);
  if (!Array.isArray(value) || value.length !== length) throw new Error(`Expected ${label} in ${key}`);
}
if (!content.article?.title || !content.issue?.number || !content.issue?.year) {
  throw new Error('article.title, issue.number, and issue.year are required');
}
const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const interpolate = (text, scope) => text
  .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, key) => {
    const value = get(scope, key);
    if (value === undefined) throw new Error(`Missing template value: ${key}`);
    return String(value);
  })
  .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = get(scope, key);
    if (value === undefined) throw new Error(`Missing template value: ${key}`);
    return escapeHtml(value);
  });
const render = (text, scope) => {
  let output = text;
  for (let depth = 0; depth < 20; depth++) {
    const before = output;
    output = output.replace(/\{\{([#^])([\w.]+)\}\}([\s\S]*?)\{\{\/\2\}\}/g, (_, type, key, body) => {
      const value = get(scope, key);
      if (type === '^') return !value || (Array.isArray(value) && value.length === 0) ? render(body, scope) : '';
      if (Array.isArray(value)) {
        return value.map((item, index) => render(body, {
          ...scope,
          ...(item && typeof item === 'object' ? item : {}),
          '.': item,
          index: String(index + 1).padStart(2, '0')
        })).join('');
      }
      return value ? render(body, scope) : '';
    });
    if (before === output) return interpolate(output, scope);
  }
  throw new Error('Template section nesting is too deep');
};

content.timeline.items = content.timeline.items.map((item, index) => ({
  ...item,
  color: ['red', 'yellow', 'blue', 'ink'][index]
}));
content.awards.items = content.awards.items.map((item, index) => ({
  ...item,
  color: ['red', 'yellow', 'blue'][index]
}));
const ids = new Set();
content.projects = (content.projects || []).map((project, index) => {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(project.id || '')) throw new Error(`Invalid project id: ${project.id}`);
  if (ids.has(project.id)) throw new Error(`Duplicate project id: ${project.id}`);
  ids.add(project.id);
  const result = {
    ...project,
    index: String(index + 1).padStart(2, '0'),
    alt: project.alt || `${project.name}项目图片`,
    hasImage: Boolean(project.image),
    imageSrc: '',
    remoteImage: project.remoteImage || ''
  };
  if (project.image) {
    const source = path.resolve(path.dirname(contentPath), project.image);
    if (!fs.existsSync(source) || !fs.statSync(source).isFile()) throw new Error(`Project image not found: ${source}`);
    const extension = path.extname(source).toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(extension)) throw new Error(`Unsupported project image format: ${extension}`);
    const filename = `${project.id}${extension}`;
    const destination = path.join(output, 'assets/projects', filename);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (path.resolve(source) !== path.resolve(destination)) fs.copyFileSync(source, destination);
    result.imageSrc = `assets/projects/${filename}`;
    if (result.remoteImage && !result.remoteImage.startsWith('https://')) throw new Error(`remoteImage must use HTTPS: ${project.id}`);
  }
  return result;
});
content.creditsLine = (content.credits || []).map(person => `${person.role}：${person.name}`).join(' · ');
if (!content.creditsLine) throw new Error('At least one credit is required');
fs.mkdirSync(output, { recursive: true });
fs.cpSync(path.join(root, 'assets/brand'), path.join(output, 'assets/brand'), { recursive: true, force: false, errorOnExist: false });
const rendered = render(fs.readFileSync(templatePath, 'utf8'), content);
if (/\{\{[#/^]?[\w.]+\}\}/.test(rendered)) throw new Error('Unresolved template placeholders remain');
fs.writeFileSync(path.join(output, 'monthly.html'), rendered);
fs.writeFileSync(path.join(output, 'content.json'), JSON.stringify(content, null, 2) + '\n');
const credits = (content.credits || []).map(person => ({
  role: person.role,
  lines: [person.name.includes('@') ? person.name : `IF.Link@${person.name}`]
}));
fs.writeFileSync(path.join(output, 'credits.json'), JSON.stringify(credits, null, 2) + '\n');
const manifest = {
  title: content.article.title,
  example: content.example !== false,
  source: 'monthly.html',
  content: 'content.json',
  credits: 'credits.json',
  projectCount: content.projects.length,
  imageCount: content.projects.filter(project => project.hasImage).length,
  remoteImageCount: content.projects.filter(project => project.remoteImage).length
};
fs.writeFileSync(path.join(output, 'render-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
