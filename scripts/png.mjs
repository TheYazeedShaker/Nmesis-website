// Minimal dependency-free PNG reading and writing for build tools (8-bit, non-interlaced).
import zlib from 'node:zlib';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const paeth = (left, up, corner) => {
  const p = left + up - corner, pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - corner);
  return pa <= pb && pa <= pc ? left : pb <= pc ? up : corner;
};

// Decode to RGBA so callers handle one layout.
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
      const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, corner)][filter];
      if (predictor === undefined) throw new Error(`Unsupported PNG filter ${filter}.`);
      pixels[i] = (line[x] + predictor) & 255;
    }
  }
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

// Encode gray+alpha (2 channels) or RGBA (4 channels); each row uses the filter with the smallest output.
export function encodePNG({width, height, channels, pixels}) {
  const stride = width * channels, rows = [];
  for (let y = 0; y < height; y++) {
    let best;
    for (let filter = 0; filter < 5; filter++) {
      const line = Buffer.alloc(stride + 1);line[0] = filter;let score = 0;
      for (let x = 0; x < stride; x++) {
        const i = y * stride + x;
        const left = x >= channels ? pixels[i - channels] : 0, up = y ? pixels[i - stride] : 0, corner = y && x >= channels ? pixels[i - stride - channels] : 0;
        const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, corner)][filter];
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
  header.writeUInt32BE(width, 0);header.writeUInt32BE(height, 4);header[8] = 8;header[9] = {2: 4, 4: 6}[channels];
  return Buffer.concat([signature, chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), {level: 9})), chunk('IEND', Buffer.alloc(0))]);
}
