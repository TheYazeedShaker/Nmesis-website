// Vercel Image Optimization: local raster images are requested through /_vercel/image, which
// resizes them to the width each screen needs and serves AVIF or WebP. The widths and quality
// must match the "images" settings in vercel.json. The local preview serves the original file.
import path from 'node:path';
import {imageFileSize} from './image-size.mjs';

export const imageWidths = [320, 480, 640, 768, 1080, 1280, 1600, 1920, 2560];
export const imageQuality = 75;
const raster = /^\/assets\/[^?#]+\.(png|jpe?g|webp|avif)$/i;

export const optimizedImage = (src, width) => `/_vercel/image?url=${encodeURIComponent(src)}&w=${width}&q=${imageQuality}`;

// The source path behind an optimized URL (or the URL itself), for checks and the local preview.
export function imageSource(value) {
  const url = new URL(value, 'https://site.local');
  return url.pathname === '/_vercel/image' ? url.searchParams.get('url') : url.pathname;
}

// Candidate widths up to the image's own width; a final candidate covers the full source,
// which the optimizer serves at its real size rather than upscaling.
function candidates(width) {
  const below = imageWidths.filter(w => w < width);
  const cover = imageWidths.find(w => w >= width);
  return [...below.map(w => [w, w]), ...(cover ? [[cover, width]] : [])];
}

export async function optimizeImages(html, root) {
  const attribute = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
  const sizeOf = src => imageFileSize(path.join(root, 'public', decodeURIComponent(src)));
  let out = '', last = 0;
  for (const match of html.matchAll(/<img\b[^>]*>|<video\b[^>]*\sposter="[^"]*"[^>]*>/g)) {
    let tag = match[0];
    if (tag.startsWith('<img')) {
      const src = attribute(tag, 'src');
      // Images with their own srcset already choose between prepared sizes.
      if (src && raster.test(src) && !attribute(tag, 'srcset')) {
        const size = await sizeOf(src);
        if (size) {
          const options = candidates(size.width);
          const fallback = [...options].reverse().find(([w]) => w <= 1280) || options[0];
          // Without its own sizes, an image keeps its natural width as its layout size (as before
          // srcset), and never asks for more than that on wide screens.
          tag = tag.replace(/\ssrc="[^"]*"/, ` src="${optimizedImage(src, fallback[0])}" srcset="${options.map(([w, real]) => `${optimizedImage(src, w)} ${real}w`).join(', ')}"${attribute(tag, 'sizes') ? '' : ` sizes="(max-width: ${size.width}px) 100vw, ${size.width}px"`}`);
        }
      }
    } else {
      const poster = attribute(tag, 'poster');
      if (raster.test(poster)) {
        const size = await sizeOf(poster);
        const width = size ? (imageWidths.find(w => w >= Math.min(size.width, 1920)) || imageWidths.at(-1)) : 1920;
        tag = tag.replace(/\sposter="[^"]*"/, ` poster="${optimizedImage(poster, width)}"`);
      }
    }
    out += html.slice(last, match.index) + tag;
    last = match.index + match[0].length;
  }
  return out + html.slice(last);
}
