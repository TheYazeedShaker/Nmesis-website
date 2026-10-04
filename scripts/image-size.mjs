// Intrinsic pixel size from an image file's header (PNG, JPEG, WebP, AVIF), without decoding it.
import fs from 'node:fs/promises';

export function imageSize(buffer) {
  // PNG: IHDR is always the first chunk.
  if (buffer.readUInt32BE(0) === 0x89504e47) return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)};
  // JPEG: walk the markers to the first start-of-frame.
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    for (let i = 2; i + 9 < buffer.length;) {
      if (buffer[i] !== 0xff) { i++; continue; }
      const marker = buffer[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return {width: buffer.readUInt16BE(i + 7), height: buffer.readUInt16BE(i + 5)};
      i += 2 + buffer.readUInt16BE(i + 2);
    }
  }
  // WebP: lossy (VP8 ), lossless (VP8L) and extended (VP8X) headers.
  if (buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') {
    const chunk = buffer.toString('latin1', 12, 16);
    if (chunk === 'VP8 ') return {width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff};
    if (chunk === 'VP8L') { const bits = buffer.readUInt32LE(21); return {width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1}; }
    if (chunk === 'VP8X') return {width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1};
  }
  // AVIF/HEIF: the first image spatial extent ('ispe') box holds the size.
  if (buffer.toString('latin1', 4, 8) === 'ftyp') {
    const at = buffer.indexOf('ispe', 0, 'latin1');
    if (at > 0) return {width: buffer.readUInt32BE(at + 8), height: buffer.readUInt32BE(at + 12)};
  }
  return null;
}

const cache = new Map();
export async function imageFileSize(file) {
  if (!cache.has(file)) {
    const handle = await fs.open(file, 'r');
    try {
      const buffer = Buffer.alloc(256 * 1024);
      const {bytesRead} = await handle.read(buffer, 0, buffer.length, 0);
      cache.set(file, imageSize(buffer.subarray(0, bytesRead)));
    } finally { await handle.close(); }
  }
  return cache.get(file);
}
