// Turns a supplied light-on-dark logo sheet into an alpha mask.
// Luminance masks (mask-mode) are ignored by WebKit and older Android browsers,
// which then show the opaque sheet as a solid box. Alpha masks work everywhere.
// Usage: node scripts/logo-mask.mjs src/logos/supplied-client-sheet.png public/assets/clients/client-logos-mask.png
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {decodePNG, encodePNG} from './png.mjs';

// White gray+alpha PNG.
export function encodeMask({width, height, alpha}) {
  const pixels = Buffer.alloc(width * height * 2);
  for (let i = 0; i < width * height; i++) { pixels[i * 2] = 255; pixels[i * 2 + 1] = alpha[i]; }
  return encodePNG({width, height, channels: 2, pixels});
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [source, target] = process.argv.slice(2);
  if (!source || !target) { console.error('Usage: node scripts/logo-mask.mjs source.png output.png'); process.exit(1); }
  const mask = luminanceToAlpha(decodePNG(await fs.readFile(source)));
  await fs.writeFile(target, encodeMask(mask));
  console.log(`Wrote ${target} (${mask.width}×${mask.height} alpha mask).`);
}
