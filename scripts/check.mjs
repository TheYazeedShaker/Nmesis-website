import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build,root,read} from './build.mjs';
import {decodePNG} from './png.mjs';
import {imageSource,imageWidths,imageQuality} from './image-optimization.mjs';

const {routes,output}=await build();
const errors=[];
const exists=async file=>{try{await fs.access(file);return true;}catch{return false;}};
// Optimized images must name an existing local image and a width/quality vercel.json allows.
const vercel=JSON.parse(await read('vercel.json'));
assert.deepEqual(vercel.images.sizes,imageWidths,'vercel.json image sizes must match scripts/image-optimization.mjs');
assert.ok(vercel.images.qualities.includes(imageQuality),'vercel.json must allow the image quality the build requests');
async function checkURL(value,page){
  if(!value || /^(#|mailto:|tel:|https?:|data:)/.test(value))return;
  let url=new URL(value,'https://site.local'+page);
  if(url.pathname==='/_vercel/image'){
    if(!imageWidths.includes(Number(url.searchParams.get('w')))||Number(url.searchParams.get('q'))!==imageQuality)errors.push(`${page}: image width or quality not allowed by vercel.json: ${value}`);
    url=new URL(imageSource(value),'https://site.local');
  }
  const clean=decodeURIComponent(url.pathname);
  const file=path.join(output,clean);
  if(!await exists(file) && !await exists(path.join(file,'index.html'))) errors.push(`${page}: missing ${value}`);
}
for(const route of routes){
  const html=await fs.readFile(path.join(output,decodeURIComponent(route),'index.html'),'utf8');
  if(/\{\{/.test(html))errors.push(`${route}: unresolved template`);
  if(/data-framer-hydrate|data-design-hydrate|script[^>]+\.mjs/.test(html))errors.push(`${route}: unexpected framework runtime`);
  for(const match of html.matchAll(/(?:src|href|poster)="([^"]*)"/g))await checkURL(match[1],route);
  for(const match of html.matchAll(/srcset="([^"]*)"/g))for(const candidate of match[1].split(/,\s+/))await checkURL(candidate.trim().split(/\s+/)[0],route);
}
assert.equal(errors.length,0,errors.join('\n'));
// Search essentials on every page: one h1, a title, a description that fits results, a share image and structured data.
for(const route of routes){
  const html=await fs.readFile(path.join(output,decodeURIComponent(route),'index.html'),'utf8');
  const meta=pattern=>(html.match(pattern)||[])[1]?.replace(/&amp;/g,'&').replace(/&#39;/g,"'");
  assert.equal((html.match(/<h1\b/g)||[]).length,1,`${route} must have exactly one h1`);
  assert.ok((meta(/<title>([^<]*)<\/title>/)||'').length>=15,`${route} needs a descriptive title`);
  const description=meta(/<meta name="description" content="([^"]*)"/)||'';
  assert.ok(description.length>=50&&description.length<=165,`${route} description must be 50–165 characters (${description.length})`);
  const image=meta(/<meta property="og:image" content="([^"]+)"/);
  assert.ok(image&&await exists(path.join(output,new URL(image).pathname)),`${route} needs an existing share image`);
  const graph=JSON.parse(meta(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)||'{}')['@graph']||[];
  assert.ok(graph.some(node=>node['@type']==='Organization')&&graph.some(node=>node['@id']?.endsWith('#webpage')),`${route} needs organization and page structured data`);
}
const homeHTML=await fs.readFile(path.join(output,'index.html'),'utf8');
if(homeHTML.includes('/_vercel/image'))assert.ok(homeHTML.includes("image.removeAttribute('srcset')"),'Optimized images need the fallback to their original files');
assert.match(await fs.readFile(path.join(output,'robots.txt'),'utf8'),/^Sitemap: https:\/\/.+\/sitemap\.xml$/m,'robots.txt must point to the sitemap');
const llms=await fs.readFile(path.join(output,'llms.txt'),'utf8');
for(const route of routes.filter(route=>route.startsWith('/projects/')))assert.ok(llms.includes(route),`llms.txt must list ${route}`);
// WebKit ignores mask-mode:luminance for images, so an opaque mask renders as a solid box on iPhones.
const theme=await read('src/styles/theme.css');
assert.ok(!/mask-mode\s*:\s*luminance/.test(theme),'Use alpha masks: WebKit ignores luminance image masks');
for(const [,url] of theme.matchAll(/(?<!-webkit-)mask-image:url\('([^']+\.png)'\)/g)){
  const {rgba}=decodePNG(await fs.readFile(path.join(root,'public',url)));
  let transparent=false;for(let i=3;i<rgba.length&&!transparent;i+=4)transparent=rgba[i]<255;
  assert.ok(transparent,`${url} needs transparency to work as an alpha mask`);
  assert.ok(theme.includes(`-webkit-mask-image:url('${url}')`),`${url} needs a -webkit-mask-image declaration`);
}
// Integration check: one content edit must update both the case study and its cards.
const site=JSON.parse(await read('content/site.json'));
const key=site.projectOrder[0];
const temp='.check-build';
try {
  const result=await build({outDir:temp,overrides:{brandName:'Example Studio'},projectOverrides:{[key]:{title:'Updated Case Study & Identity'}}});
  for(const route of [`/projects/${key}`,'/projects']){
    const html=await fs.readFile(path.join(result.output,route,'index.html'),'utf8');
    assert.ok(html.includes('Updated Case Study &amp; Identity'),`Project title did not propagate to ${route}`);
    assert.ok(html.includes('Example Studio'),`Brand did not propagate to ${route}`);
  }
} finally {await fs.rm(path.join(root,temp),{recursive:true,force:true});}
console.log(`Passed: ${routes.length} routes, local file/link references, no framework hydration, search metadata, mobile-safe logo masks, and brand/project edit propagation.`);
