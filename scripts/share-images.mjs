// Regenerates the link-preview images in public/assets/share/ (LinkedIn, WhatsApp, X, Slack...).
// Each is the page's sharpest key visual, cropped to 1600×840 (1.91:1), with a soft bottom shade and the
// NMESIS wordmark, saved as a JPEG under WhatsApp's ~300 KB preview limit.
// Needs a Chromium browser (Edge or Chrome) to decode and draw the WebP/AVIF artwork; set CHROME_PATH to choose one.
// Usage: npm run share-images [-- home.jpg project-byd.jpg]
import fs from 'node:fs/promises';
import {closeSync, existsSync, openSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const json = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const size = {width: 1600, height: 840};
const maxBytes = 280 * 1024;

// Page artwork; `x`/`y` move the crop focus (0 = left/top, 1 = right/bottom).
const pages = {
  'home.jpg': {src: '/assets/projects/avatr/key-visuals/visual-02.webp'},
  'about.jpg': {src: '/assets/projects/avatr/key-visuals/visual-03.webp'},
  'services.jpg': {src: '/assets/projects/im-motors/launch-key-visual.webp'},
  'automotive-cgi.jpg': {src: '/assets/projects/byd/ti7-campaign.jpeg'},
  'contact.jpg': {src: '/assets/projects/soueast-egypt/key-visuals/s06-08dm-kv.webp', y: .45},
  'projects.jpg': {src: '/assets/project-cta/cadillac.webp'},
};

// Projects use the larger of their cover and hero artwork.
const imageWidth = async src => {
  const bytes = await fs.readFile(path.join(root, 'public', src));
  if (bytes.toString('latin1', 1, 4) === 'PNG') return bytes.readUInt32BE(16);
  if (bytes.toString('latin1', 8, 12) === 'WEBP') {
    const chunk = bytes.toString('latin1', 12, 16);
    if (chunk === 'VP8X') return 1 + bytes.readUIntLE(24, 3);
    if (chunk === 'VP8 ') return bytes.readUInt16LE(26) & 0x3fff;
    return (bytes.readUInt32LE(21) & 0x3fff) + 1;
  }
  for (let i = 2; i < bytes.length;) {
    const marker = bytes[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) return bytes.readUInt16BE(i + 7);
    i += 2 + bytes.readUInt16BE(i + 2);
  }
  return 0;
};
const jobs = Object.entries(pages).map(([name, job]) => ({name, ...job}));
for (const file of await fs.readdir(path.join(root, 'content/projects'))) {
  const project = await json(`content/projects/${file}`);
  if (!project.shareImage) continue;
  const candidates = [...new Set([project.cover, project.heroCover])].filter(src => /\.(webp|jpe?g|png)$/i.test(src || ''));
  const widths = await Promise.all(candidates.map(imageWidth));
  const src = candidates[widths.indexOf(Math.max(...widths))];
  jobs.push({name: path.basename(project.shareImage), src, ...project.shareFocus});
}
const only = process.argv.slice(2);
const selected = only.length ? jobs.filter(job => only.includes(job.name)) : jobs;
if (!selected.length) throw new Error(`No share image matches ${only.join(', ')}`);

const browser = [process.env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(candidate => candidate && existsSync(candidate));
if (!browser) throw new Error('No Chromium browser found. Set CHROME_PATH to Edge or Chrome.');

// The page draws every image into a canvas and leaves the JPEGs in the DOM for --dump-dom.
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'nmesis-share-'));
const file = src => pathToFileURL(path.join(root, 'public', src)).href;
const page = `<!doctype html><meta charset="utf-8"><body>
<img id="wordmark" src="${file('/assets/brand/nmesis-wordmark.png')}">
${selected.map((job, i) => `<img id="source-${i}" src="${file(job.src)}">`).join('\n')}
<script>
addEventListener('load', () => {
  const jobs = ${JSON.stringify(selected.map(({name, x = .5, y = .5}) => ({name, x, y})))};
  const W = ${size.width}, H = ${size.height}, maxBytes = ${maxBytes};
  const mark = document.getElementById('wordmark'), result = {};
  try { jobs.forEach((job, i) => {
    const image = document.getElementById('source-' + i);
    const canvas = Object.assign(document.createElement('canvas'), {width: W, height: H});
    const context = canvas.getContext('2d');
    const scale = Math.max(W / image.naturalWidth, H / image.naturalHeight);
    const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, (W - w) * job.x, (H - h) * job.y, w, h);
    const shade = context.createLinearGradient(0, H * .5, 0, H);
    shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,.62)');
    context.fillStyle = shade; context.fillRect(0, H * .5, W, H * .5);
    const markWidth = 212, markHeight = markWidth * mark.naturalHeight / mark.naturalWidth;
    context.drawImage(mark, 64, H - 64 - markHeight, markWidth, markHeight);
    let quality = .92, data;
    do { data = canvas.toDataURL('image/jpeg', quality); quality -= .03; } while (data.length * .75 > maxBytes && quality > .6);
    result[job.name] = data;
  }); } catch (error) { result.error = String(error); }
  const out = document.createElement('script');
  out.type = 'application/json'; out.id = 'result'; out.textContent = JSON.stringify(result);
  document.body.append(out);
});
</script>`;
await fs.writeFile(path.join(work, 'share.html'), page);
// Edge on Windows only writes --dump-dom output to a real file handle, not to a pipe.
const dump = path.join(work, 'dom.html');
const handle = openSync(dump, 'w');
const exit = await new Promise(resolve => spawn(browser, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files',
  `--user-data-dir=${path.join(work, 'profile')}`, '--virtual-time-budget=30000', '--dump-dom',
  pathToFileURL(path.join(work, 'share.html')).href,
], {stdio: ['ignore', handle, 'ignore']}).on('close', resolve));
closeSync(handle);
if (exit !== 0) throw new Error(`The browser exited with code ${exit}`);
const dom = await fs.readFile(dump, 'utf8');
const match = dom.match(/<script type="application\/json" id="result">([\s\S]*?)<\/script>/);
if (!match) throw new Error(`The browser did not return any images:\n${dom.slice(0, 500)}`);
const images = JSON.parse(match[1]);
if (images.error) throw new Error(`Drawing failed in the browser: ${images.error}`);
for (const job of selected) {
  const bytes = Buffer.from(images[job.name].split(',')[1], 'base64');
  await fs.writeFile(path.join(root, 'public/assets/share', job.name), bytes);
  console.log(`${job.name.padEnd(28)} ${String(Math.round(bytes.length / 1024)).padStart(4)} KB  ← ${job.src}`);
}
await fs.rm(work, {recursive: true, force: true});
