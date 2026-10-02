import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {themeSurfaces} from './theme-surfaces.mjs';
const source=await fs.readFile(new URL('../src/scripts/color-theme.js',import.meta.url),'utf8');
function page(saved,blocked=false){
  const root={dataset:{},style:{}},listeners={},events={},store=new Map(saved?[['nmesis-color-theme',saved]]:[]);
  const buttons=Array.from({length:3},()=>({label:{},attrs:{},setAttribute(k,v){this.attrs[k]=v;},querySelector(){return this.label;},addEventListener(k,fn){this[k]=fn;}}));
  const meta={setAttribute(k,v){this[k]=v;}};
  vm.runInNewContext(source,{document:{documentElement:root,querySelector:()=>meta,querySelectorAll:()=>buttons,addEventListener:(k,fn)=>listeners[k]=fn},window:{addEventListener:(k,fn)=>events[k]=fn},localStorage:{getItem:k=>{if(blocked)throw Error('blocked');return store.get(k);},setItem:(k,v)=>{if(blocked)throw Error('blocked');store.set(k,v);}}});
  assert.ok(['light','dark'].includes(root.dataset.theme),'Choose palette before DOMContentLoaded to prevent a light flash.');
  listeners.DOMContentLoaded();return {root,buttons,store,events,meta};
}
for(const blocked of [false,true]){
 const p=page(undefined,blocked);assert.equal(p.root.dataset.theme,'dark');
 p.buttons[1].click();assert.equal(p.root.dataset.theme,'light');
 assert.ok(p.buttons.every(b=>b.attrs['aria-label']==='Switch to dark mode'&&b.label.textContent==='Dark mode'));
 assert.equal(p.meta.content,'#f7f8f6');
 p.buttons[2].click();assert.equal(p.root.dataset.theme,'dark');
}
assert.equal(page('light').root.dataset.theme,'light');
assert.equal(page('invalid').root.dataset.theme,'dark');
const p=page('dark');p.events.storage({key:'nmesis-color-theme',newValue:'light'});assert.equal(p.root.dataset.theme,'light');
p.events.storage({key:'nmesis-color-theme',newValue:'invalid'});assert.equal(p.root.dataset.theme,'light');
const css='a{color:var(--color-white,#fff);background:var(--color-white,#fff)}b{background-image:linear-gradient(var(--color-ink,#141414),transparent)}';
assert.equal(themeSurfaces(css),'a{color:var(--color-white,#fff);background:var(--surface-card,#fff)}b{background-image:linear-gradient(var(--surface-deep,#141414),transparent)}');
const layout=await fs.readFile(new URL('../src/templates/layout.html',import.meta.url),'utf8');
assert.ok(layout.indexOf('/scripts/color-theme.js')<layout.indexOf('rel="stylesheet"'));
console.log('Theme passed: initial palette, persistence, blocked storage, synchronized controls, cross-tab updates, accessible labels, and independent surface/text tokens.');
