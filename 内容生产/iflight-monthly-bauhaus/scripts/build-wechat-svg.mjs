import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.resolve(root, process.env.MONTHLY_BUILD_DIR || 'build');
const content = JSON.parse(fs.readFileSync(path.join(buildDir, 'content.json'), 'utf8'));
const source = path.join(buildDir, 'monthly.html');
const suffix = process.argv[2] || '';
const svgPath = path.join(buildDir, `monthly-wechat${suffix}.svg`);
const previewPath = path.join(buildDir, `monthly-preview${suffix}.html`);
const profile = path.resolve(root, `.tmp/wechat-svg-chrome-${process.pid}`);
const sourceLogo = fs.readFileSync(path.join(root, 'assets/brand/iflight-logo.svg'), 'utf8');
const communityLogoMarkup = [...fs.readFileSync(path.join(root, 'assets/brand/iflink-logo.svg'), 'utf8').matchAll(/<path\b[^>]*>/g)].map(match => match[0]).join('');
const bannerMarkup = fs.readFileSync(path.join(root, 'assets/brand/banner.svg'), 'utf8').match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)[1];
const bannerPartMarkup = Object.fromEntries(['top', 'middle', 'bottom'].map(part => [part, fs.readFileSync(path.join(root, `assets/brand/banner-${part}.svg`), 'utf8').match(/<svg\b[^>]*>([\s\S]*)<\/svg>/)[1]]));
const projectCovers = Object.fromEntries((content.projects || []).filter(project => project.remoteImage).map(project => [project.id, project.remoteImage]));
const expectedImages = (content.projects || []).filter(project => project.hasImage).length;
if (expectedImages !== Object.keys(projectCovers).length) {
  throw new Error('Every project with a local image needs a remoteImage hosted on the WeChat image CDN before SVG export. Upload new assets; do not reuse a previous issue image.');
}
const seenPaths = new Set();
const logoPaths = new Map();
for (const match of sourceLogo.matchAll(/<path\b[^>]*>/g)) {
  const tag = match[0];
  if (/fill-opacity="0"/.test(tag)) continue;
  const d = tag.match(/\bd="([^"]+)"/)?.[1];
  if (!d) continue;
  const compact = d.replace(/-?\d*\.?\d+/g, value => String(Math.round(Number(value))));
  const fill = tag.match(/\bfill="([^"]+)"/)?.[1] || '#000';
  const key = `${compact}|${fill}`;
  if (seenPaths.has(key)) continue;
  seenPaths.add(key);
  const color = fill === 'rgb(0,0,0)' ? '#000' : fill;
  if (!logoPaths.has(color)) logoPaths.set(color, []);
  logoPaths.get(color).push(compact);
}
const logoMarkup = [...logoPaths].map(([fill, paths]) => `<path d="${paths.join('')}" fill="${fill}" fill-rule="evenodd"/>`).join('');
const compactLogoMarkup = logoMarkup.replace(/\bd="([^"]+)"/g, (_, d) => `d="${d.split(/(?=M)/).map(part => {
  const values = (part.match(/-?\d*\.?\d+/g) || []).map(Number);
  if ((part.match(/C/g) || []).length !== 4 || values.length < 8) return part;
  const xs = values.filter((_, index) => index % 2 === 0), ys = values.filter((_, index) => index % 2 === 1);
  const width = Math.max(...xs) - Math.min(...xs), height = Math.max(...ys) - Math.min(...ys);
  if (width > 20 || Math.abs(width - height) > 1) return part;
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, radius = (width + height) / 4;
  const round = value => Math.round(value * 10) / 10;
  return `M${round(cx - radius)} ${round(cy)}a${round(radius)} ${round(radius)} 0 1 0 ${round(radius * 2)} 0a${round(radius)} ${round(radius)} 0 1 0 ${round(-radius * 2)} 0`;
}).join('')}"`);

function serializePage() {
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const n = value => Math.round(value * 100) / 100;
  const px = value => Number.parseFloat(value) || 0;
  const rgb = value => {
    if (!value || value === 'transparent') return { color: 'none', opacity: 0 };
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return { color: value, opacity: 1 };
    const values = match[1].split(/[ ,/]+/).map(Number);
    return { color: `rgb(${values[0]},${values[1]},${values[2]})`, opacity: values[3] ?? 1 };
  };
  const paint = (name, value) => {
    const color = rgb(value);
    return color.color === 'none' ? '' : ` ${name}="${color.color}"${color.opacity < 1 ? ` ${name}-opacity="${n(color.opacity)}"` : ''}`;
  };
  const matrix = (value, precision = 6) => `matrix(${[value.a, value.b, value.c, value.d, value.e, value.f].map(value => Math.round(value * 10 ** precision) / 10 ** precision).join(' ')})`;
  const affine = value => [value.m13, value.m23, value.m31, value.m32, value.m34, value.m43].every(v => Math.abs(v) < .0001) && Math.abs(value.m33 - 1) < .0001 && Math.abs(value.m44 - 1) < .0001;
  const textFamily = value => value.replace(/"/g, "'");
  const metrics = new Map();
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const font = style => `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const fontMetric = style => {
    const key = font(style);
    if (!metrics.has(key)) {
      context.font = key;
      const measure = context.measureText('Hg国IF.Light');
      metrics.set(key, {
        ascent: measure.fontBoundingBoxAscent || px(style.fontSize) * .96,
        descent: measure.fontBoundingBoxDescent || px(style.fontSize) * .24
      });
    }
    return metrics.get(key);
  };
  const measure = (value, style) => {
    context.font = font(style);
    return context.measureText(value).width + Math.max(0, [...value].length - 1) * px(style.letterSpacing);
  };
  const records = new Map();
  const transformed = [];
  const all = [$('#poster'), ...$('#poster').querySelectorAll('*')].filter(el => !(el instanceof SVGElement));
  for (const el of all) {
    const style = getComputedStyle(el);
    records.set(el, { style, transform: style.transform, origin: style.transformOrigin });
    if (style.transform !== 'none') transformed.push(el);
  }
  for (const el of transformed) el.style.setProperty('transform', 'none', 'important');
  void document.body.offsetHeight;
  const worldCache = new Map();
  const localTransform = (rect, transform, origin) => {
    if (transform === 'none') return new DOMMatrix();
    const [x = 0, y = 0, z = 0] = origin.split(' ').map(px);
    return new DOMMatrix().translate(rect.x + x, rect.y + y, z).multiply(new DOMMatrix(transform)).translate(-rect.x - x, -rect.y - y, -z);
  };
  const world = el => {
    if (!el || el === $('#poster') || el === document.body || el === document.documentElement) return new DOMMatrix();
    if (worldCache.has(el)) return worldCache.get(el);
    const record = records.get(el);
    const result = world(el.parentElement).multiply(localTransform(record.rect, record.transform, record.origin));
    worldCache.set(el, result);
    return result;
  };
  for (const [el, record] of records) record.rect = el.getBoundingClientRect();
  const visible = style => style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
  const polygon = (clip, rect) => {
    const points = clip.match(/polygon\(([^)]+)\)/)?.[1];
    if (!points) return null;
    return points.split(',').map(point => {
      const [x, y] = point.trim().split(/\s+/);
      return `${n(rect.x + (x.endsWith('%') ? px(x) / 100 * rect.width : px(x)))} ${n(rect.y + (y.endsWith('%') ? px(y) / 100 * rect.height : px(y)))}`;
    }).join(' ');
  };
  let clipId = 0;
  const clipGroup = (content, points, transform) => {
    const id = `iflight-clip-${++clipId}`;
    const d = `M${points.replace(/(\S+\s+\S+)\s+/g, '$1L')}Z`;
    return `<g transform="${matrix(transform)}"><defs><clipPath id="${id}" clipPathUnits="userSpaceOnUse"><path d="${d}"/></clipPath></defs><g clip-path="url(#${id})"><g transform="${matrix(transform.inverse())}">${content}</g></g></g>`;
  };
  const project = (rect, transform, points) => {
    const corners = points ? points.split(' ').map(Number).reduce((pairs, value, index, values) => { if (index % 2 === 0) pairs.push([value, values[index + 1]]); return pairs; }, []) : [[rect.x, rect.y], [rect.x + rect.width, rect.y], [rect.x + rect.width, rect.y + rect.height], [rect.x, rect.y + rect.height]];
    return corners.map(([x, y]) => {
      const point = new DOMPoint(x, y, 0, 1).matrixTransform(transform);
      return `${n(point.x / point.w)} ${n(point.y / point.w)}`;
    }).join(' ');
  };
  const shadow = (style, shape) => {
    let output = '';
    const silhouette = shape.replace(/\s(?:fill|stroke)(?:-opacity)?="[^"]*"/g, '');
    const regex = /((?:rgba?\([^)]*\)|#[\da-fA-F]+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?)/g;
    for (const match of style.boxShadow.matchAll(regex)) {
      const spread = px(match[5]);
      output += `<g transform="translate(${n(px(match[2]) + spread)} ${n(px(match[3]) + spread)})"${paint('fill', match[1])}${paint('stroke', match[1])}>${silhouette}</g>`;
    }
    const drop = style.filter.match(/drop-shadow\(\s*(-?[\d.]+)px\s+(-?[\d.]+)px\s+[\d.]+px\s+([^)]+)\)/);
    if (drop) output += `<g transform="translate(${drop[1]} ${drop[2]})"${paint('fill', drop[3])}${paint('stroke', drop[3])}>${silhouette}</g>`;
    return output;
  };
  const background = (rect, style) => {
    const image = style.backgroundImage;
    let output = '';
    if (image.includes('linear-gradient(rgba(255, 255, 255, 0.08) 1px') || image.includes('linear-gradient(rgba(21, 21, 21, 0.055) 1px')) {
      const color = image.includes('255, 255, 255') ? 'rgba(255,255,255,.08)' : 'rgba(21,21,21,.055)';
      let d = '';
      for (let x = 32; x < rect.width; x += 32) d += `M${n(rect.x + x)} ${n(rect.y)}V${n(rect.y + rect.height)}`;
      for (let y = 32; y < rect.height; y += 32) d += `M${n(rect.x)} ${n(rect.y + y)}H${n(rect.x + rect.width)}`;
      output += `<path d="${d}" fill="none"${paint('stroke', color)} stroke-width="1"/>`;
    }
    if (image.includes('linear-gradient(166deg') || image.includes('linear-gradient(-166deg')) {
      const reverse = image.includes('-166deg');
      const y1 = rect.y + rect.height / 2 + (reverse ? -1 : 1) * rect.width * .121;
      const y2 = rect.y + rect.height / 2 + (reverse ? 1 : -1) * rect.width * .121;
      output += `<path d="M${n(rect.x)} ${n(y1)}L${n(rect.x + rect.width)} ${n(y2)}" fill="none" stroke="#151515" stroke-width="3"/>`;
    }
    if (image.includes('radial-gradient(circle at 90% 4%')) output += `<circle cx="${n(rect.x + rect.width * .9)}" cy="${n(rect.y + rect.height * .04)}" r="90" fill="rgba(36,84,215,.1)"/>`;
    if (image.includes('radial-gradient(circle at 8% 26%')) {
      output += `<circle cx="${n(rect.x + rect.width * .08)}" cy="${n(rect.y + rect.height * .26)}" r="34" fill="#f4ca3f"/>`;
      output += `<path d="M${n(rect.x + rect.width * .08)} ${n(rect.y)}V${n(rect.y + rect.height)}" fill="none" stroke="rgba(21,21,21,.06)" stroke-width="1"/>`;
    }
    return output;
  };
  const shape = (rect, style, transform, precision = 6) => {
    const clipped = polygon(style.clipPath, rect);
    const borderWidth = Math.max(px(style.borderTopWidth), px(style.borderRightWidth), px(style.borderBottomWidth), px(style.borderLeftWidth));
    let geometry;
    if (clipped) geometry = `<polygon points="${clipped}"/>`;
    else {
      const radius = style.borderTopLeftRadius;
      const rx = radius.endsWith('%') ? rect.width * px(radius) / 100 : px(radius);
      const ry = radius.endsWith('%') ? rect.height * px(radius) / 100 : px(radius);
      geometry = `<rect x="${n(rect.x)}" y="${n(rect.y)}" width="${n(rect.width)}" height="${n(rect.height)}"${rx ? ` rx="${n(rx)}"` : ''}${ry ? ` ry="${n(ry)}"` : ''}/>`;
    }
    const fill = style.backgroundColor;
    const borderColors = [style.borderTopColor, style.borderRightColor, style.borderBottomColor, style.borderLeftColor];
    const borderWidths = [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].map(px);
    const uniformBorder = borderWidths.every(width => width > 0 && width === borderWidths[0]) && borderColors.every(color => color === borderColors[0]);
    const stroke = uniformBorder && style.borderTopStyle !== 'none' ? borderColors[0] : 'transparent';
    const base = geometry.replace('/>', `${paint('fill', fill)}${paint('stroke', stroke)}${uniformBorder ? ` stroke-width="${n(borderWidth)}"` : ''}${style.borderTopStyle === 'dashed' ? ' stroke-dasharray="6 4"' : ''}${style.borderTopStyle === 'dotted' ? ' stroke-dasharray="1 3" stroke-linecap="round"' : ''}/>`);
    let output = shadow(style, base) + base;
    if (!clipped && !uniformBorder) {
      const sides = [
        { width: borderWidths[0], color: borderColors[0], d: `M${n(rect.x)} ${n(rect.y + borderWidths[0] / 2)}H${n(rect.x + rect.width)}` },
        { width: borderWidths[1], color: borderColors[1], d: `M${n(rect.x + rect.width - borderWidths[1] / 2)} ${n(rect.y)}V${n(rect.y + rect.height)}` },
        { width: borderWidths[2], color: borderColors[2], d: `M${n(rect.x)} ${n(rect.y + rect.height - borderWidths[2] / 2)}H${n(rect.x + rect.width)}` },
        { width: borderWidths[3], color: borderColors[3], d: `M${n(rect.x + borderWidths[3] / 2)} ${n(rect.y)}V${n(rect.y + rect.height)}` }
      ];
      for (const side of sides) if (side.width) output += `<path d="${side.d}" fill="none"${paint('stroke', side.color)} stroke-width="${side.width}"/>`;
    }
    if (clipped && !affine(transform) && style.backgroundImage.includes('repeating-linear-gradient')) {
      for (let x = rect.x + 54; x < rect.x + rect.width; x += 57) {
        const bottomX = Math.max(rect.x + rect.width * .3, Math.min(rect.x + rect.width * .7, x));
        output += `<polygon points="${project(rect, transform, `${x} ${rect.y} ${bottomX} ${rect.y + rect.height}`)}" fill="none" stroke="#d8d1c3" stroke-width="3"/>`;
      }
    }
    if (background(rect, style)) output += `<g transform="${matrix(transform, precision)}">${background(rect, style)}</g>`;
    return affine(transform) ? `<g transform="${matrix(transform, precision)}">${output}</g>` : `<polygon points="${project(rect, transform, clipped)}"${paint('fill', fill)}${paint('stroke', stroke)}${borderWidth ? ` stroke-width="${n(borderWidth)}"` : ''}/>`;
  };
  const text = (value, x, y, width, style, transform) => {
    const trimmed = value.replace(/\s+/g, ' ').trim();
    if (!trimmed) return '';
    const outline = px(style.webkitTextStrokeWidth) ? `${paint('stroke', style.webkitTextStrokeColor)} stroke-width="${px(style.webkitTextStrokeWidth)}" paint-order="stroke fill" stroke-linejoin="round"` : '';
    const inlineFont = `font-family:${esc(textFamily(style.fontFamily))};font-size:${px(style.fontSize)};font-weight:${style.fontWeight};font-style:${style.fontStyle}${px(style.letterSpacing) ? `;letter-spacing:${px(style.letterSpacing)}` : ''}`;
    const attrs = `font-family="${esc(textFamily(style.fontFamily))}" font-size="${px(style.fontSize)}" font-weight="${style.fontWeight}" font-style="${style.fontStyle}"${paint('fill', style.color)}${outline}${px(style.letterSpacing) ? ` letter-spacing="${px(style.letterSpacing)}"` : ''} style="${inlineFont}"${width > 1 && trimmed.length > 1 ? ` textLength="${n(width)}" lengthAdjust="spacing"` : ''}`;
    const content = esc(trimmed);
    let shadows = '';
    const shadowMatch = style.textShadow.match(/(rgba?\([^)]*\)|#[\da-fA-F]+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px/);
    if (shadowMatch) shadows = `<text x="${n(x + px(shadowMatch[2]))}" y="${n(y + px(shadowMatch[3]))}" ${attrs.replace(/ fill(?:-opacity)?="[^"]*"/g, '')}${paint('fill', shadowMatch[1])}>${content}</text>`;
    return `<g transform="${matrix(transform)}">${shadows}<text x="${n(x)}" y="${n(y)}" ${attrs}>${content}</text></g>`;
  };
  const logo = (el, rect, transform) => {
    if (el.classList.contains('project-cover')) {
      const href = window.__projectCovers[el.dataset.project];
      if (!href) throw new Error(`Unknown project cover: ${el.dataset.project}`);
      const ratio = el.dataset.fit === 'cover' ? 'xMidYMid slice' : 'xMidYMid meet';
      return `<g transform="${matrix(transform)}"><image x="${n(rect.x)}" y="${n(rect.y)}" width="${n(rect.width)}" height="${n(rect.height)}" preserveAspectRatio="${ratio}" href="${href}" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${href}"/></g>`;
    }
    if (el.classList.contains('bottom-banner-image')) {
      const scaled = transform.multiply(new DOMMatrix().translate(rect.x, rect.y)).multiply(new DOMMatrix().scale(rect.width / 900, rect.height / 373));
      const markup = window.__bannerPart ? window.__bannerPartMarkup[window.__bannerPart] : window.__bannerMarkup;
      return `<g transform="${matrix(scaled)}">${markup}</g>`;
    }
    const community = el.classList.contains('iflink-logo');
    const scaled = transform.multiply(new DOMMatrix().translate(rect.x, rect.y)).multiply(new DOMMatrix().scale(rect.width / (community ? 573 : 1128), rect.height / (community ? 151 : 432)));
    const markup = community ? window.__communityLogoMarkup : window.__compactLogo ? window.__compactLogoMarkup : window.__logoMarkup;
    const halo = !community && !window.__compactLogo && el.classList.contains('hero-logo') ? `<g transform="translate(4 4)" opacity=".65">${markup.replaceAll('fill="#000"', 'fill="#fffdf7"')}</g>` : '';
    return `<g transform="${matrix(scaled)}">${halo}${markup}</g>`;
  };
  const qr = (rect, transform) => {
    const matrix29 = window.__qrMatrix;
    let d = '';
    matrix29.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        if (row[x] !== '1') { x++; continue; }
        const start = x;
        while (row[x] === '1') x++;
        d += `M${start} ${y}h${x - start}v1h-${x - start}z`;
      }
    });
    const scaled = transform.multiply(new DOMMatrix().translate(rect.x, rect.y)).multiply(new DOMMatrix().scale(rect.width / 37, rect.height / 37));
    return `<g transform="${matrix(scaled)}" shape-rendering="crispEdges"><rect width="37" height="37" fill="#fff"/><g transform="translate(4 4)"><path d="${d}" fill="#000"/></g></g>`;
  };
  const pseudoRecord = (el, pseudo) => {
    if (el.matches('.hero-title .english') && pseudo === '::after') return null;
    const style = getComputedStyle(el, pseudo);
    if (style.content === 'none' || !visible(style)) return null;
    const parent = records.get(el);
    const rect = parent.rect;
    const originX = rect.x + px(parent.style.borderLeftWidth);
    const originY = rect.y + px(parent.style.borderTopWidth);
    const innerWidth = rect.width - px(parent.style.borderLeftWidth) - px(parent.style.borderRightWidth);
    const innerHeight = rect.height - px(parent.style.borderTopWidth) - px(parent.style.borderBottomWidth);
    const content = style.content.length >= 2 ? style.content.slice(1, -1).replace(/\\a/gi, '\n').replace(/\\"/g, '"') : '';
    const contentLines = content.split('\n');
    const lineHeight = style.lineHeight === 'normal' ? px(style.fontSize) * 1.15 : px(style.lineHeight);
    const naturalWidth = style.left !== 'auto' && style.right !== 'auto' ? innerWidth - px(style.left) - px(style.right) : Math.max(0, ...contentLines.map(line => measure(line, style)));
    const naturalHeight = style.top !== 'auto' && style.bottom !== 'auto' ? innerHeight - px(style.top) - px(style.bottom) : contentLines.length * lineHeight;
    const width = (style.width === 'auto' ? naturalWidth : px(style.width)) + (style.boxSizing === 'content-box' ? px(style.paddingLeft) + px(style.paddingRight) + px(style.borderLeftWidth) + px(style.borderRightWidth) : 0);
    const ratio = style.aspectRatio.match(/^(\d*\.?\d+)(?:\s*\/\s*(\d*\.?\d+))?$/);
    const aspectHeight = ratio ? width * Number(ratio[2] || 1) / Number(ratio[1]) : naturalHeight;
    const height = (style.height === 'auto' ? aspectHeight : px(style.height)) + (style.boxSizing === 'content-box' ? px(style.paddingTop) + px(style.paddingBottom) + px(style.borderTopWidth) + px(style.borderBottomWidth) : 0);
    const paperFunnel = el.matches('.finale .section-head') && pseudo === '::after' && style.position === 'static';
    if (!width || !height || (style.position !== 'absolute' && !paperFunnel)) return null;
    const left = style.left === 'auto' ? originX + innerWidth - width - px(style.right) : originX + px(style.left);
    const top = style.top === 'auto' ? originY + innerHeight - height - px(style.bottom) : originY + px(style.top);
    const box = paperFunnel ? { x: rect.x + (rect.width - width) / 2, y: rect.bottom - height - px(style.marginBottom), width, height } : { x: left, y: top, width, height };
    const transformOrigin = style.width === 'auto' && style.transformOrigin === '0px 0px' ? `${width / 2}px ${height / 2}px` : style.transformOrigin;
    const transform = world(el).multiply(localTransform(box, style.transform, transformOrigin));
    let output = shape(box, style, transform);
    if (el.classList.contains('belt') && pseudo === '::after') {
      let stripes = '';
      for (let x = box.x - 100; x < box.x + box.width + 100; x += 50) stripes += `<rect x="${n(x)}" y="${n(box.y)}" width="21" height="${n(box.height)}" fill="#f5f2e9"/><rect x="${n(x + 21)}" y="${n(box.y)}" width="4" height="${n(box.height)}" fill="#777"/><rect x="${n(x + 25)}" y="${n(box.y)}" width="25" height="${n(box.height)}" fill="#f5f2e9"/>`;
      output += `<g clip-path="path('M${n(box.x)} ${n(box.y)}H${n(box.x + box.width)}V${n(box.y + box.height)}H${n(box.x)}Z')"><g><animateTransform attributeName="transform" type="translate" from="0 0" to="50 0" dur="1.1s" repeatCount="indefinite"/>${stripes}</g></g>`;
    }
    if (content) {
      const lines = content.split('\n');
      const centered = style.display === 'grid' || style.display === 'flex' || style.textAlign === 'center';
      const lineHeight = style.lineHeight === 'normal' ? px(style.fontSize) * 1.15 : px(style.lineHeight);
      const startY = centered && style.display === 'grid' ? box.y + (box.height - lineHeight * lines.length) / 2 : box.y + px(style.paddingTop) + px(style.borderTopWidth);
      lines.forEach((line, index) => {
        const lineWidth = measure(line, style);
        const x = centered ? box.x + (box.width - lineWidth) / 2 : box.x + px(style.paddingLeft) + px(style.borderLeftWidth);
        const y = startY + index * lineHeight + fontMetric(style).ascent;
        output += text(line, x, y, lineWidth, style, transform);
      });
    }
    if (el.classList.contains('project-art') && pseudo === '::after') output = `<g><animateTransform attributeName="transform" type="translate" values="0 0;8 -8;0 0" dur="3.8s" repeatCount="indefinite"/>${output}</g>`;
    if (el.classList.contains('hero-title') && pseudo === '::before') output = `<g opacity="0"><animate attributeName="opacity" values="0;1" begin="1.95s" dur=".4s" fill="freeze"/><animateTransform attributeName="transform" type="translate" values="-15 20;0 0" begin="1.95s" dur=".4s" fill="freeze"/>${output}</g>`;
    if (el.classList.contains('opening-stage') && pseudo === '::after') output = `<g opacity="0"><animate attributeName="opacity" values="0;1" begin="1.4s" dur=".35s" fill="freeze"/>${output}</g>`;
    if (el.classList.contains('award-card') && pseudo === '::before') output = `<g opacity="1"><animate attributeName="opacity" values="0;1" begin="1.6s" dur=".4s" fill="freeze"/>${output}</g>`;
    if (el.classList.contains('podium-scene') && pseudo === '::after') output = `<g><animateTransform attributeName="transform" type="translate" values="-80 85;7 -7;0 0" keyTimes="0;.65;1" begin="click" dur=".95s" fill="freeze" restart="never"/>${output}</g>`;
    if (parent.style.overflow === 'hidden') {
      const parentTransform = world(el);
      const points = polygon(parent.style.clipPath, rect) || `${n(rect.x)} ${n(rect.y)} ${n(rect.x + rect.width)} ${n(rect.y)} ${n(rect.x + rect.width)} ${n(rect.y + rect.height)} ${n(rect.x)} ${n(rect.y + rect.height)}`;
      output = clipGroup(output, points, parentTransform);
    }
    return { output, z: Number.parseFloat(style.zIndex) || 0 };
  };
  const centerAnimation = (content, rect, type, values, begin, dur, extra = '') => {
    const x = n(rect.x + rect.width / 2), y = n(rect.y + rect.height / 2);
    return `<g transform="translate(${x} ${y})"><g><animateTransform attributeName="transform" type="${type}" values="${values}" begin="${begin}" dur="${dur}" fill="freeze"${extra}/><g transform="translate(${-x} ${-y})">${content}</g></g></g>`;
  };
  const route = el => {
    const record = records.get(el);
    const rect = record.rect;
    const transform = world(el).multiply(new DOMMatrix().scale(rect.width / 100, rect.height / 100));
    return `<g opacity=".35"><g transform="${matrix(transform)}"><path d="M8 0L84 8L20 19L83 30L15 42L85 53L18 65L82 76L20 88L86 100" fill="none" stroke="#151515" stroke-width="15" opacity=".12" stroke-linejoin="bevel"/><circle cx="8" cy="0" r="5" fill="#ed4933"/><circle cx="86" cy="100" r="5" fill="#2454d7"/></g></g>`;
  };
  let textLines = 0;
  const textNode = node => {
    const parent = node.parentElement;
    const style = getComputedStyle(parent);
    if (!visible(style) || !node.textContent.trim()) return '';
    const lines = [];
    for (let index = 0; index < node.textContent.length; index++) {
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const rect = range.getBoundingClientRect();
      if (!rect.width) continue;
      const previous = lines.at(-1);
      if (!previous || Math.abs(previous.rect.y - rect.y) > 1) lines.push({ value: node.textContent[index], rect });
      else {
        previous.value += node.textContent[index];
        previous.rect.width = rect.right - previous.rect.x;
      }
    }
    const transform = world(parent);
    const metric = fontMetric(style);
    let output = '';
    for (const line of lines) {
      output += text(line.value, line.rect.x, line.rect.y + metric.ascent, line.rect.width, style, transform);
      textLines++;
    }
    return output;
  };
  const render = el => {
    const record = records.get(el);
    if (!record || !visible(record.style) || el.closest('.preview-controls') || el.matches('.escape-shapes i:first-child')) return '';
    if (el.matches('.escape-shapes i:nth-child(2)')) record.transform = 'translate(160px, 24px)';
    const { rect, style } = record;
    if (style.display === 'contents') return [...el.childNodes].map(node => node.nodeType === Node.TEXT_NODE ? textNode(node) : node.nodeType === Node.ELEMENT_NODE ? render(node) : '').join('');
    if (!rect.width || !rect.height) return '';
    if (el.tagName === 'IMG') {
      const content = { x: rect.x + px(style.paddingLeft) + px(style.borderLeftWidth), y: rect.y + px(style.paddingTop) + px(style.borderTopWidth), width: rect.width - px(style.paddingLeft) - px(style.paddingRight) - px(style.borderLeftWidth) - px(style.borderRightWidth), height: rect.height - px(style.paddingTop) - px(style.paddingBottom) - px(style.borderTopWidth) - px(style.borderBottomWidth) };
      return shape(rect, style, world(el)) + (el.closest('.qr-frame') ? qr(content, world(el)) : logo(el, content, world(el)));
    }
    if (el.tagName.toLowerCase() === 'svg') return route(el);
    const parts = [];
    parts.push({ z: -Infinity, output: shape(rect, style, world(el)) });
    const before = pseudoRecord(el, '::before');
    if (before) parts.push({ ...before, order: -1 });
    let order = 0;
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) parts.push({ z: 0, order: order++, output: textNode(node) });
      if (node.nodeType === Node.ELEMENT_NODE) {
        const childStyle = records.get(node)?.style;
        if (!childStyle) continue;
        parts.push({ z: Number.parseFloat(childStyle.zIndex) || 0, order: order++, output: render(node) });
      }
    }
    const after = pseudoRecord(el, '::after');
    if (after) parts.push({ ...after, order: order++ });
    parts.sort((a, b) => a.z - b.z || a.order - b.order);
    let content = parts.map(part => part.output).join('');
    if (style.overflow === 'hidden' && !el.classList.contains('poster') && !el.classList.contains('package-lane')) {
      const transform = world(el);
      const points = polygon(style.clipPath, rect) || `${n(rect.x)} ${n(rect.y)} ${n(rect.x + rect.width)} ${n(rect.y)} ${n(rect.x + rect.width)} ${n(rect.y + rect.height)} ${n(rect.x)} ${n(rect.y + rect.height)}`;
      content = clipGroup(content, points, transform);
    }
    if (Number(style.opacity) < 1) content = `<g opacity="${style.opacity}">${content}</g>`;
    if (el.matches('.topline span:first-child')) content += `<rect x="${n(rect.x)}" y="${n(rect.y + (rect.height - 10) / 2)}" width="10" height="10" fill="#f4ca3f"/>`;
    if (el.classList.contains('drop-parcel')) {
      content = `<g opacity="0"><animate attributeName="opacity" values="0;1;1" keyTimes="0;.12;1" begin=".3s" dur="1.15s" fill="freeze"/><animateTransform attributeName="transform" type="translate" values="0 -240;0 12;0 -7;0 0" keyTimes="0;.7;.85;1" begin=".3s" dur="1.15s" fill="freeze"/>${content}</g>`;
    }
    if (el.classList.contains('parcel-lid')) content = centerAnimation(content, rect, 'scale', '1 1;1 -.14', '1.42s', '.5s');
    if (el.classList.contains('burst')) content = centerAnimation(content, rect, 'scale', '.05 .05;1 1', '1.45s', '.65s');
    if (el.classList.contains('english')) content = centerAnimation(content, rect, 'scale', '.06 .06;1.09 1.09;.98 .98;1 1', '1.7s', '.8s', ' keyTimes="0;.62;.82;1"');
    if (el.classList.contains('intro-card')) content = `<g><animateTransform attributeName="transform" type="translate" values="${el.matches(':first-child') ? '65 -120' : '-65 -120'};0 0" begin="2s" dur=".7s" fill="freeze"/>${content}</g>`;
    if (el.classList.contains('fold-panel')) {
      content = `<g><animateTransform attributeName="transform" type="translate" values="0 24;0 0" begin="click" dur=".78s" fill="freeze" restart="never"/><animateTransform attributeName="transform" type="skewX" values="-5;0" additive="sum" begin="click" dur=".78s" fill="freeze" restart="never"/><animate attributeName="opacity" values=".65;1" begin="click" dur=".5s" fill="freeze" restart="never"/>${content}<rect x="${n(rect.x)}" y="${n(rect.y)}" width="${n(rect.width)}" height="${n(rect.height)}" fill="#fff" opacity="0" pointer-events="all"/></g>`;
    }
    if (el.classList.contains('support-no')) content = centerAnimation(content, rect, 'scale', '.6 .6;1.16 1.16;1 1', '1.2s', '.55s', ' keyTimes="0;.65;1"');
    const feedbackItem = matchMedia('(max-width: 520px)').matches ? 'SPAN' : 'B';
    if (el.closest('.feedback-loop') && el.tagName === feedbackItem) {
      const index = [...el.parentElement.querySelectorAll(feedbackItem.toLowerCase())].indexOf(el);
      content = `<g opacity=".35"><animate attributeName="opacity" values=".35;1;.35" begin="${index * .25}s" dur="1.6s" repeatCount="indefinite"/>${content}</g>`;
    }
    if (el.classList.contains('vote-number')) content = centerAnimation(content, rect, 'scale', '.6 .6;1.07 1.07;1 1', '1.4s', '.6s', ' keyTimes="0;.7;1"');
    if (el.classList.contains('podium-unit')) {
      content = `<g><animateTransform attributeName="transform" type="translate" values="0 -65;0 0" begin="click" dur="1.05s" fill="freeze" restart="never"/><animateTransform attributeName="transform" type="skewX" values="-16;0" additive="sum" begin="click" dur="1.05s" fill="freeze" restart="never"/>${content}<rect x="${n(rect.x)}" y="${n(rect.y - 25)}" width="${n(rect.width + 18)}" height="${n(rect.height + 25)}" fill="#fff" opacity="0" pointer-events="all"/></g>`;
    }
    return content;
  };
  const renderOpening = () => {
    const parts = [...$('.opening-stage').children].map((el, order) => ({ el, order, z: Number.parseFloat(records.get(el).style.zIndex) || 0 })).sort((a, b) => a.z - b.z || a.order - b.order);
    const stage = $('.opening-stage');
    const before = pseudoRecord(stage, '::before');
    const after = pseudoRecord(stage, '::after');
    return `<g><animateTransform attributeName="transform" type="translate" values="0 0;-4 3;4 -2;-2 1;0 0" keyTimes="0;.25;.5;.75;1" begin="1.34s" dur=".42s" fill="freeze"/>${shape(records.get(stage).rect, records.get(stage).style, world(stage))}${before?.output || ''}${parts.map(part => render(part.el)).join('')}${after?.output || ''}</g>`;
  };
  const renderConveyor = () => {
    const wrap = $('.conveyor-wrap');
    const rect = records.get(wrap).rect;
    const track = $('.package-track');
    const trackWidth = records.get(track).rect.width;
    const children = [...track.querySelectorAll('.mini-parcel')].map(render).join('');
    const laneTransform = world($('.package-lane'));
    const lane = `<g transform="${matrix(laneTransform)}"><g><animateTransform attributeName="transform" type="translate" from="0 0" to="-${n(trackWidth / 2)} 0" dur="14s" repeatCount="indefinite"/><g transform="${matrix(laneTransform.inverse())}">${children}</g></g></g>`;
    const content = `${pseudoRecord(wrap,'::before')?.output || ''}${pseudoRecord(wrap,'::after')?.output || ''}${render($('.conveyor-meta'))}${lane}${render($('.belt'))}${render($('.belt-label'))}`;
    const points = `${n(rect.x)} ${n(rect.y)} ${n(rect.right)} ${n(rect.y)} ${n(rect.right)} ${n(rect.bottom)} ${n(rect.x)} ${n(rect.bottom)}`;
    return `${shape(rect, records.get(wrap).style, world(wrap))}${clipGroup(content, points, world(wrap))}`;
  };
  const pieces = [shape(records.get($('#poster')).rect, records.get($('#poster')).style, world($('#poster'))), shape(records.get($('.hero')).rect, records.get($('.hero')).style, world($('.hero'))), render($('.topline')), renderConveyor(), renderOpening(), render($('.monthly')), render($('.plaza')), render($('.finale')), render($('.about'))];
  const makeParts = () => {
    window.__compactLogo = true;
    const entries = [];
    const add = (el, markup, host, top, bottom) => {
      const rect = records.get(el)?.rect || el.getBoundingClientRect();
      entries.push({ el, markup, host, top: top ?? rect.top, bottom: bottom ?? rect.bottom, bytes: new TextEncoder().encode(markup).length });
    };
    add($('.topline'), render($('.topline')), '.hero');
    add($('.conveyor-wrap'), renderConveyor(), '.hero');
    const openingFx = ['.burst', '.drop-parcel', '.escape-shapes', '.hero-title'].map(selector => render($(selector))).join('') + (pseudoRecord($('.opening-stage'), '::after')?.output || '');
    add($('.opening-stage'), openingFx, '.opening-stage', 302, $('.hero-title').getBoundingClientRect().bottom);
    const handled = new Set();
    const selector = '.hero-subtitle,.intro-grid,.intro-cta,.hero-facts,.section-head,.fold-route,.fold-panel,.fold-joint,.timeline-head,.path-grid,.project-label,.project-card,.plaza-note,.plaza-cta,.about-logo,.community-logo,.about-lead,.about-copy,.stats,.podium-scene,.final-cta,.qr-block,.final-note,.final-credits,.bottom-banner-image,.footer';
    for (const el of $( '#poster').querySelectorAll(selector)) {
      if (handled.has(el)) continue;
      const host = el.closest('.section') ? `.${[...el.closest('.section').classList].join('.')}` : '.opening-stage';
      if (el.classList.contains('fold-joint')) {
        const panel = el.nextElementSibling;
        if (panel?.classList.contains('fold-panel')) {
          handled.add(panel);
          add(el, render(el) + render(panel), host, records.get(el).rect.top, records.get(panel).rect.bottom);
          continue;
        }
      }
      if (el.classList.contains('bottom-banner-image')) {
        const rect = records.get(el).rect;
        for (const [part, start, end] of [['top', 0, 220], ['middle', 220, 308], ['bottom', 308, 373]]) {
          window.__bannerPart = part;
          add(el, render(el), host, rect.top + rect.height * start / 373, rect.top + rect.height * end / 373);
        }
        delete window.__bannerPart;
        continue;
      }
      add(el, render(el), host);
    }
    entries.sort((a, b) => a.top - b.top);
    const backdrop = (host, first) => {
      const el = $(host);
      if (!el) return '';
      const record = records.get(el);
      const poster = $('#poster');
      const hero = $('.hero');
      let output = shape(records.get(poster).rect, records.get(poster).style, world(poster));
      if (el === hero || el.closest('.hero')) output += shape(records.get(hero).rect, records.get(hero).style, world(hero));
      output += shape(record.rect, record.style, world(el));
      if (first && el.classList.contains('monthly')) output += pseudoRecord(el, '::before')?.output || '';
      if (first && el.classList.contains('plaza')) output += pseudoRecord(el, '::after')?.output || '';
      return output;
    };
    const groups = [];
    for (const entry of entries) {
      if (entry.el.matches('.bottom-banner-image,.project-card')) {
        groups.push({ host: entry.host, items: [entry], top: entry.top, bottom: entry.bottom, bytes: entry.bytes, standalone: true });
        continue;
      }
      const previous = groups.at(-1);
      if (previous && !previous.standalone && previous.host === entry.host && previous.bytes + entry.bytes <= 26000) {
        previous.items.push(entry);
        previous.bytes += entry.bytes;
        previous.bottom = Math.max(previous.bottom, entry.bottom);
      } else {
        groups.push({ host: entry.host, items: [entry], top: entry.top, bottom: entry.bottom, bytes: entry.bytes });
      }
    }
    const parts = groups.map((group, index) => {
      const top = index === 0 ? 0 : groups[index - 1].end;
      const end = index === groups.length - 1 ? Math.ceil($('#poster').getBoundingClientRect().height) : groups[index + 1].host === group.host ? Math.ceil(groups[index + 1].top) : Math.ceil($(groups[index + 1].host).getBoundingClientRect().top);
      group.end = end;
      const host = $(group.host);
      const backgroundColor = host && getComputedStyle(host).backgroundColor !== 'rgba(0, 0, 0, 0)' ? getComputedStyle(host).backgroundColor : '#f4f1e8';
      const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="375" height="${Math.max(1, end - top)}" viewBox="0 ${top} 375 ${Math.max(1, end - top)}" overflow="hidden" style="display:block;float:none;max-width:100%;height:auto;margin:0 auto"><rect x="0" y="${top}" width="375" height="${Math.max(1, end - top)}" fill="${backgroundColor}"/>${backdrop(group.host, index === 0 || groups[index - 1].host !== group.host)}${group.items.map(item => item.markup).join('')}</svg>`;
      return { index: index + 1, top, bottom: end, bytes: new TextEncoder().encode(markup).length, svg: markup };
    });
    window.__compactLogo = false;
    return parts;
  };
  const parts = makeParts();
  for (const el of transformed) el.style.removeProperty('transform');
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="375" height="${Math.ceil($('#poster').getBoundingClientRect().height)}" viewBox="0 0 375 ${Math.ceil($('#poster').getBoundingClientRect().height)}" role="img" aria-label="${esc(window.__articleTitle)}" overflow="hidden" style="display:block;float:none;max-width:100%;height:auto;margin:0 auto"><rect width="375" height="${Math.ceil($('#poster').getBoundingClientRect().height)}" fill="#f4f1e8"/>${pieces.join('')}</svg>`,
    parts,
    stats: { textLines, logoPaths: (window.__logoMarkup.match(/<path/g) || []).length, domElements: all.length }
  };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});
fs.mkdirSync(profile, { recursive: true });
const chrome = spawn(process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', `--remote-debugging-port=${port}`,
  '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, 'about:blank'
], { stdio: 'ignore' });
let socket;
try {
  let endpoint;
  for (let i = 0; i < 100; i++) {
    try { endpoint = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; break; }
    catch { await sleep(100); }
  }
  if (!endpoint) throw new Error('Chrome did not start');
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let id = 0;
  let sessionId;
  const pending = new Map();
  const events = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callback = pending.get(message.id);
      if (!callback) return;
      pending.delete(message.id);
      if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
      else callback.resolve(message.result);
    } else if (events.has(message.method)) {
      events.get(message.method)(message.params);
      events.delete(message.method);
    }
  });
  const send = (method, params = {}, session = true) => new Promise((resolve, reject) => {
    const next = ++id;
    pending.set(next, { resolve, reject });
    socket.send(JSON.stringify({ id: next, method, params, ...(session ? { sessionId } : {}) }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const created = await send('Target.createTarget', { url: 'about:blank' }, false);
  sessionId = (await send('Target.attachToTarget', { targetId: created.targetId, flatten: true }, false)).sessionId;
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: true });
  const loaded = new Promise(resolve => events.set('Page.loadEventFired', resolve));
  await send('Page.navigate', { url: `${pathToFileURL(source).href}?static=1` });
  await loaded;
  await evaluate(`document.fonts.ready.then(() => [...document.images].every(img => img.complete))`);
  const qrDataUri = `data:image/png;base64,${fs.readFileSync(path.join(root, 'assets/brand/forum-qr.png')).toString('base64')}`;
  const qr = await evaluate(`(async() => {
    const image = new Image();
    image.src=${JSON.stringify(qrDataUri)};
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d'); context.drawImage(image,0,0);
    const data = context.getImageData(0,0,canvas.width,canvas.height).data;
    let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
    for (let y=0;y<canvas.height;y++) for (let x=0;x<canvas.width;x++) {
      if (data[(y*canvas.width+x)*4] >= 128) continue;
      minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
    if (maxX < 0 || maxY < 0) throw new Error('No QR modules found');
    const rows = [];
    const width=maxX-minX+1,height=maxY-minY+1;
    for (let y=0;y<29;y++) { let row=''; for (let x=0;x<29;x++) { const offset = (Math.floor(minY+(y+.5)*height/29)*canvas.width + Math.floor(minX+(x+.5)*width/29))*4; row += data[offset] < 128 ? '1' : '0'; } rows.push(row); }
    return rows;
  })()`);
  await evaluate(`window.__articleTitle=${JSON.stringify(content.article.title)};window.__logoMarkup=${JSON.stringify(logoMarkup)};window.__compactLogoMarkup=${JSON.stringify(compactLogoMarkup)};window.__communityLogoMarkup=${JSON.stringify(communityLogoMarkup)};window.__bannerMarkup=${JSON.stringify(bannerMarkup)};window.__bannerPartMarkup=${JSON.stringify(bannerPartMarkup)};window.__projectCovers=${JSON.stringify(projectCovers)};window.__qrMatrix=${JSON.stringify(qr)}`);
  const result = await evaluate(`(${serializePage})()`);
  if (!result?.svg) throw new Error('No SVG was generated');
  for (const markup of [result.svg, ...result.parts.map(part => part.svg)]) {
    if ((markup.match(/<svg\b/g) || []).length !== 1) throw new Error('Nested SVG viewport found');
  }
  const parseError = await evaluate(`(() => { const doc = new DOMParser().parseFromString(${JSON.stringify(result.svg)}, 'image/svg+xml'); return doc.querySelector('parsererror')?.textContent || ''; })()`);
  if (parseError) throw new Error(`Invalid SVG XML: ${parseError}`);
  const partErrors = await evaluate(`(${JSON.stringify(result.parts.map(part => part.svg))}).map(svg => new DOMParser().parseFromString(svg,'image/svg+xml').querySelector('parsererror')?.textContent || '')`);
  if (partErrors.some(Boolean)) throw new Error(`Invalid SVG fragment: ${partErrors.find(Boolean)}`);
  const oversized = result.parts.filter(part => part.bytes > 30000);
  if (oversized.length) throw new Error(`Oversized SVG fragments: ${JSON.stringify(oversized.map(part => ({ index: part.index, bytes: part.bytes })))}`);
  const partsDir = path.join(buildDir, `wechat-parts${suffix}`);
  fs.mkdirSync(partsDir, { recursive: true });
  for (const file of fs.readdirSync(partsDir)) if (/^\d+\.svg$/.test(file)) fs.unlinkSync(path.join(partsDir, file));
  const manifest = [];
  for (const part of result.parts) {
    const name = `${String(part.index).padStart(2, '0')}.svg`;
    fs.writeFileSync(path.join(partsDir, name), part.svg);
    manifest.push({ file: name, bytes: part.bytes, top: part.top, height: part.bottom - part.top });
  }
  const importHtml = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IF.Light 月榜赛 · 秀米分段稿</title></head><body style="margin:0;background:#f4f1e8"><main style="width:375px;max-width:100%;margin:0 auto;line-height:0;font-size:0">${result.parts.map(part => `<section style="margin:0;padding:0;line-height:0;font-size:0">${part.svg}</section>`).join('')}</main></body></html>`;
  fs.writeFileSync(path.join(buildDir, 'monthly-segments.html'), importHtml);
  fs.writeFileSync(path.join(partsDir, 'manifest.json'), JSON.stringify({ title: content.article.title, parts: manifest }, null, 2) + '\n');
  fs.writeFileSync(svgPath, result.svg);
  const preview = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IF.Light 月榜赛 · 微信 SVG</title>
<style>body{margin:0;background:#242424;font-family:Arial,"Microsoft YaHei",sans-serif}.toolbar{position:fixed;z-index:5;right:12px;bottom:12px;display:flex;gap:8px}.toolbar button{padding:10px 12px;border:2px solid #151515;background:#b1fa63;color:#151515;font-weight:700;cursor:pointer}.toolbar button:last-child{background:#fffdf7}.poster{width:375px;max-width:100%;margin:0 auto;background:#f4f1e8;line-height:0}.poster svg{display:block;max-width:100%;height:auto}</style></head>
<body><div class="toolbar"><button type="button" id="copy">复制 SVG</button><button type="button" id="motion">暂停动效</button></div><main class="poster">${result.svg}</main>
<script>
const svg=document.querySelector('.poster svg');
async function copySvg(){
  const text=new XMLSerializer().serializeToString(svg);
  try{await navigator.clipboard.writeText(text);return true}catch{}
  const textarea=document.createElement('textarea');
  textarea.value=text;textarea.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
  document.body.append(textarea);textarea.select();textarea.setSelectionRange(0,text.length);
  try{return document.execCommand('copy')}catch{return false}finally{textarea.remove()}
}
document.getElementById('copy').onclick=async()=>{const button=document.getElementById('copy');const success=await copySvg();button.textContent=success?'已复制':'请使用 SVG 文件';if(success)setTimeout(()=>button.textContent='复制 SVG',1600)};
document.getElementById('motion').onclick=event=>{if(svg.animationsPaused()){svg.unpauseAnimations();event.target.textContent='暂停动效'}else{svg.pauseAnimations();event.target.textContent='继续动效'}};
if(matchMedia('(prefers-reduced-motion:reduce)').matches){svg.pauseAnimations();svg.setCurrentTime(20)}
</script></body></html>`;
  fs.writeFileSync(previewPath, preview);
  console.log(JSON.stringify({ svg: path.basename(svgPath), preview: path.basename(previewPath), bytes: Buffer.byteLength(result.svg), ...result.stats, parts: manifest }, null, 2));
  await send('Browser.close', {}, false);
} finally {
  if (socket) socket.close();
  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/PID', String(chrome.pid), '/T', '/F'], { encoding: 'utf8' });
    if (result.status !== 0) console.warn(`Chrome cleanup: ${result.stdout || result.stderr}`);
  } else if (!chrome.killed) chrome.kill();
  await sleep(1000);
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 500 });
}
