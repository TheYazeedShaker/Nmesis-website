import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build,root,read} from './build.mjs';
import {decodePNG} from './logo-mask.mjs';

const {routes,output}=await build();
const errors=[];
const exists=async file=>{try{await fs.access(file);return true;}catch{return false;}};
async function checkURL(value,page){
  if(!value || /^(#|mailto:|tel:|https?:|data:)/.test(value))return;
  const url=new URL(value,'https://site.local'+page);
  const clean=decodeURIComponent(url.pathname);
  const file=path.join(output,clean);
  if(!await exists(file) && !await exists(path.join(file,'index.html'))) errors.push(`${page}: missing ${value}`);
}
for(const route of routes){
  const html=await fs.readFile(path.join(output,decodeURIComponent(route),'index.html'),'utf8');
  if(/\{\{/.test(html))errors.push(`${route}: unresolved template`);
  if(/data-framer-hydrate|data-design-hydrate|script[^>]+\.mjs/.test(html))errors.push(`${route}: unexpected framework runtime`);
  for(const match of html.matchAll(/(?:src|href)="([^"]*)"/g))await checkURL(match[1],route);
}
assert.equal(errors.length,0,errors.join('\n'));
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
console.log(`Passed: ${routes.length} routes, local file/link references, no framework hydration, mobile-safe logo masks, and brand/project edit propagation.`);
