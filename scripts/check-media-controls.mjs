import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the shipped player lifecycle without relying on a desktop browser's
// native control styling: only one owner of the play affordance may be visible.
const source=await fs.readFile(new URL('../src/scripts/site.js',import.meta.url),'utf8');
const setup=source.slice(source.indexOf('  for (const film of document.querySelectorAll(\'[data-case-film]\'))'),source.indexOf('  for(const capsule of document.querySelectorAll(\'[data-embed-capsule]\'))'));
assert.ok(setup.includes('showPoster'),'Player initialization must be present');
const makeFilm=()=>{
  const events={},clicks={},classes=new Set();
  const start={hidden:false,querySelector:()=>({}),addEventListener:(name,fn)=>clicks[name]=fn};
  const film={controls:true,paused:true,parentElement:{querySelector:()=>start,classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),toggle:(n,on)=>on?classes.add(n):classes.delete(n)}},addEventListener:(name,fn)=>events[name]=fn,pause(){this.paused=true;},play(){this.paused=false;events.play();return Promise.resolve();}};
  return {film,start,events,clicks,classes};
};
const a=makeFilm(),b=makeFilm();
vm.runInNewContext(setup,{document:{querySelectorAll:()=>[a.film,b.film],addEventListener(){}},IntersectionObserver:class {observe(){}}});
assert.equal(a.film.controls,false);
assert.equal(a.start.hidden,false);
assert.ok(a.classes.has('is-awaiting-play'));
a.clicks.click();
assert.equal(a.film.controls,true);
assert.equal(a.start.hidden,true);
assert.ok(!a.classes.has('is-awaiting-play'));
a.film.pause();
assert.equal(a.film.controls,true,'Native controls remain available when paused');
assert.equal(a.start.hidden,true,'Pausing must not stack the custom control on native controls');
b.clicks.click();
assert.equal(a.film.paused,true,'Starting another film pauses the first');
a.events.error();
assert.equal(a.film.controls,false);
assert.equal(a.start.hidden,false);
a.film.play=()=>Promise.reject(new Error('Playback unavailable'));
a.clicks.click();
await new Promise(resolve=>setImmediate(resolve));
assert.equal(a.film.controls,false);
assert.equal(a.start.hidden,false,'Failed playback leaves an accessible retry control');

// Project card loops: nothing downloads until a card is visible, and reduced motion keeps the poster.
const loopSetup=source.slice(source.indexOf('  // Project previews loop'),source.indexOf('  // Brand project details'));
const html=await fs.readFile(new URL('../dist/projects/index.html',import.meta.url),'utf8').catch(()=>'');
for(const tag of html.match(/<video data-project-loop[^>]*>/g)||[])assert.ok(!/\sautoplay\b/.test(tag)&&/preload="none"/.test(tag),'Card loops must not autoplay or preload before they are visible');
function loops(reduced){
  let observe;const listeners={};
  const make=()=>({muted:false,paused:true,plays:0,addEventListener(){},play(){this.plays++;this.paused=false;return Promise.resolve();},pause(){this.paused=true;}});
  const shown=make(),hidden=make();
  vm.runInNewContext(loopSetup,{document:{hidden:false,querySelectorAll:()=>[shown,hidden],addEventListener(){}},window:{addEventListener(){}},reducedMotion:{matches:reduced,addEventListener:(k,fn)=>listeners[k]=fn},IntersectionObserver:class {constructor(fn){observe=fn;}observe(){}}});
  observe([{target:shown,isIntersecting:true,intersectionRect:{width:300,height:200}},{target:hidden,isIntersecting:false,intersectionRect:{width:0,height:0}}]);
  return {shown,hidden};
}
const motion=loops(false);
assert.equal(motion.shown.plays,1,'A visible card loop starts playing');
assert.equal(motion.hidden.plays,0,'A hidden responsive copy never starts (and never downloads)');
assert.ok(motion.shown.muted,'Card loops are muted');
assert.equal(loops(true).shown.plays,0,'Reduced motion keeps the card poster still');
console.log('Media controls passed: one initial play control, native playback/pause controls, independent players, failure recovery, and visible-only card loops.');
