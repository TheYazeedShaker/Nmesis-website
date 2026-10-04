// Turns a supplied light-on-dark logo sheet into an alpha mask.
// Luminance masks (mask-mode) are ignored by WebKit and older Android browsers,
// which then show the opaque sheet as a solid box. Alpha masks work everywhere.
// Usage: node scripts/logo-mask.mjs src/logos/supplied-client-sheet.png public/assets/clients/client-logos-mask.png
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function decodePNG(file) {
  if (!file.subarray(0, 8).equals(signature)) throw new Error('Not a PNG file.');
  let offset = 8, header, idat = [];
  while (offset < file.length) {
    const length = file.readUInt32BE(offset), type = file.toString('latin1', offset + 4, offset + 8);
    const data = file.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') header = {width: data.readUInt32BE(0), height: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12]};
    if (type === 'IDAT') idat.push(data);
    offset += 12 + length;
  }
  const channels = {0: 1, 2: 3, 4: 2, 6: 4}[header?.color];
  if (!channels || header.depth !== 8 || header.interlace) throw new Error('Use an 8-bit, non-interlaced grayscale or RGB(A) PNG.');
  const {width, height} = header, stride = width * channels, raw = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const i = y * stride + x;
      const left = x >= channels ? pixels[i - channels] : 0, up = y ? pixels[i - stride] : 0, corner = y && x >= channels ? pixels[i - stride - channels] : 0;
      const p = left + up - corner, pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - corner);
      const predictor = [0, left, up, (left + up) >> 1, pa <= pb && pa <= pc ? left : pb <= pc ? up : corner][filter];
      if (predictor === undefined) throw new Error(`Unsupported PNG filter ${filter}.`);
      pixels[i] = (line[x] + predictor) & 255;
    }
  }
  // Expand to RGBA so callers handle one layout.
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const s = i * channels, gray = channels < 3;
    rgba[i * 4] = pixels[s];
    rgba[i * 4 + 1] = pixels[gray ? s : s + 1];
    rgba[i * 4 + 2] = pixels[gray ? s : s + 2];
    rgba[i * 4 + 3] = channels === 4 ? pixels[s + 3] : channels === 2 ? pixels[s + 1] : 255;
  }
  return {width, height, rgba};
}

// White gray+alpha PNG; each row uses the filter with the smallest output.
export function encodeMask({width, height, alpha}) {
  const stride = width * 2, rows = [];
  const pixels = Buffer.alloc(stride * height);
  for (let i = 0; i < width * height; i++) { pixels[i * 2] = 255; pixels[i * 2 + 1] = alpha[i]; }
  for (let y = 0; y < height; y++) {
    let best;
    for (let filter = 0; filter < 5; filter++) {
      const line = Buffer.alloc(stride + 1);line[0] = filter;let score = 0;
      for (let x = 0; x < stride; x++) {
        const i = y * stride + x;
        const left = x >= 2 ? pixels[i - 2] : 0, up = y ? pixels[i - stride] : 0, corner = y && x >= 2 ? pixels[i - stride - 2] : 0;
        const p = left + up - corner, pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - corner);
        const predictor = [0, left, up, (left + up) >> 1, pa <= pb && pa <= pc ? left : pb <= pc ? up : corner][filter];
        line[x + 1] = (pixels[i] - predictor) & 255;
        score += line[x + 1] < 128 ? line[x + 1] : 256 - line[x + 1];
      }
      if (!best || score < best.score) best = {line, score};
    }
    rows.push(best.line);
  }
  const chunk = (type, data) => {
    const length = Buffer.alloc(4), crc = Buffer.alloc(4), body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    length.writeUInt32BE(data.length);crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);header.writeUInt32BE(height, 4);header[8] = 8;header[9] = 4;
  return Buffer.concat([signature, chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}

// The CSS luminance-mask coefficients keep the result identical to mask-mode:luminance.
export function luminanceToAlpha({width, height, rgba}) {
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) {
    const [r, g, b, a] = rgba.subarray(i * 4, i * 4 + 4);
    alpha[i] = Math.round((0.2125 * r + 0.7154 * g + 0.0721 * b) * a / 255);
  }
  return {width, height, alpha};
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/').split('/').pop())) {
  const [source, target] = process.argv.slice(2);
  if (!source || !target) { console.error('Usage: node scripts/logo-mask.mjs source.png output.png'); process.exit(1); }
  const mask = luminanceToAlpha(decodePNG(await fs.readFile(source)));
  await fs.writeFile(target, encodeMask(mask));
  console.log(`Wrote ${target} (${mask.width}×${mask.height} alpha mask).`);
}
