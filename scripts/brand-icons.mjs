// Raster icons (favicon.ico, Apple touch icon, web-app icons) drawn from the simple
// brand mark in public/assets/brand/nmesis-n.svg: a rounded square with a stroked "N".
// Usage: node scripts/brand-icons.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {encodePNG} from './png.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hex = value => {
  const digits = value.slice(1).length === 3 ? [...value.slice(1)].map(c => c + c).join('') : value.slice(1);
  return [0, 2, 4].map(i => parseInt(digits.slice(i, i + 2), 16));
};
// Absolute M/L/H/V path commands as a list of points.
const polyline = d => {
  const points = [];
  for (const [, command, args] of d.matchAll(/([MLHV])\s*([\d.\s,]+)/g)) {
    const values = args.trim().split(/[\s,]+/).map(Number), [x, y] = points.at(-1) || [0, 0];
    if (command === 'H') points.push([values[0], y]);
    else if (command === 'V') points.push([x, values[0]]);
    else for (let i = 0; i < values.length; i += 2) points.push([values[i], values[i + 1]]);
  }
  return points;
};

export async function readMark() {
  const svg = await fs.readFile(path.join(root, 'public/assets/brand/nmesis-n.svg'), 'utf8');
  const attr = (tag, name) => (svg.match(new RegExp(`<${tag}\\b[^>]*\\s${name}="([^"]+)"`)) || [])[1];
  const box = Number(svg.match(/viewBox="0 0 ([\d.]+)/)[1]);
  return {box, radius: Number(attr('rect', 'rx')), background: hex(attr('rect', 'fill')), stroke: hex(attr('path', 'stroke')), width: Number(attr('path', 'stroke-width')), points: polyline(attr('path', 'd'))};
}

// Distance from a point to a segment; round caps and joins follow from the distance test.
const segmentDistance = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

// Draw the mark at `size` pixels with 4x4 supersampling; `square` fills the corners (Apple rounds its own).
export function drawMark(mark, size, {square = false} = {}) {
  const pixels = Buffer.alloc(size * size * 4), samples = 4, scale = mark.box / size, r = square ? 0 : mark.radius;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let cover = 0, line = 0;
    for (let sy = 0; sy < samples; sy++) for (let sx = 0; sx < samples; sx++) {
      const px = (x + (sx + .5) / samples) * scale, py = (y + (sy + .5) / samples) * scale;
      const cx = Math.min(Math.max(px, r), mark.box - r), cy = Math.min(Math.max(py, r), mark.box - r);
      if (Math.hypot(px - cx, py - cy) > r) continue;
      cover++;
      if (mark.points.slice(1).some((point, i) => segmentDistance(px, py, mark.points[i], point) <= mark.width / 2)) line++;
    }
    const i = (y * size + x) * 4, n = samples * samples, mix = cover ? line / cover : 0;
    for (let c = 0; c < 3; c++) pixels[i + c] = Math.round(mark.background[c] * (1 - mix) + mark.stroke[c] * mix);
    pixels[i + 3] = Math.round(255 * cover / n);
  }
  return encodePNG({width: size, height: size, channels: 4, pixels});
}

// An .ico file holding PNG images (supported by every current browser).
export function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({size, png}, i) => {
    const entry = 6 + i * 16;
    header[entry] = size % 256;header[entry + 1] = size % 256;header.writeUInt16LE(1, entry + 4);header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map(image => image.png)]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mark = await readMark();
  const out = name => path.join(root, 'public', name);
  await fs.writeFile(out('favicon.ico'), ico([16, 32, 48].map(size => ({size, png: drawMark(mark, size)}))));
  await fs.writeFile(out('apple-touch-icon.png'), drawMark(mark, 180, {square: true}));
  for (const size of [192, 512]) await fs.writeFile(out(`icon-${size}.png`), drawMark(mark, size));
  console.log('Wrote favicon.ico, apple-touch-icon.png, icon-192.png and icon-512.png in public/.');
}
