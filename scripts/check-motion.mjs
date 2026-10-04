import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import reference from './reference-appear.cjs';
import {build,read,selectorCanMatch} from './build.mjs';
const {output}=await build();
const load=async file=>JSON.parse((await fs.readFile(output+file,'utf8')).replace(/^window.MORO_MOTION=/,'').replace(/;$/,''));
// The recovered reference values themselves, independent of which elements a page still uses.
const source={...JSON.parse(await read('src/motion/effects.json')),appear:JSON.parse(await read('src/motion/appear.json'))};
const spec=name=>source.appear['/'].entries.find(e=>e.selector===name).variants.default;
assert.deepEqual(spec('.design-15u04nt-container').animate.transition,{bounce:0,delay:.6,duration:1.1,type:'spring'});
assert.deepEqual(spec('.design-1k0wel8').animate.transition,{bounce:0,delay:1,duration:1,type:'spring'});
const pill=source.effects.filter(e=>e.kind==='loop'&&['.design-1lzp4vz-container','.design-1sdlkyc-container','.design-1cmo1xf-container','.design-1ngvhld-container'].includes(e.selector));
assert.equal(pill.length,4);pill.forEach(p=>{assert.equal(p.transition.duration,2.2);assert.equal(p.repeatType,'mirror');});
const mouse=source.mouse.find(m=>m.selector==='.design-15u04nt-container');assert.deepEqual([mouse.tracking,mouse.momentum,mouse.scale],[190,.3,5]);
// Every page loads its own content-named motion file with every animation that can apply to it.
const motionFile=html=>(html.match(/<script src="(\/scripts\/motion\/[0-9a-f]+\.js)"/)||[])[1];
const files=(await fs.readdir(output+'/scripts/motion')).map(name=>'/scripts/motion/'+name);
const pages=await Promise.all(files.map(load));
const scriptClasses=(await read('src/scripts/site.js')+await read('src/scripts/motion.js')).match(/design-v-[a-z0-9]+/g)||[];
let kept=0;
for(const route of JSON.parse(await fs.readFile(output+'/routes.json','utf8'))){
  const html=await fs.readFile(output+route.replace(/\/$/,'')+'/index.html','utf8');
  const file=motionFile(html);
  assert.ok(files.includes(file),`${route} must load an existing per-page motion file`);
  const data=pages[files.indexOf(file)];
  assert.ok(Object.keys(data.appear).length<=1,`${route} must load only its own entrance animations`);
  const classes=new Set([...scriptClasses,...[...html.matchAll(/class="([^"]*)"/g)].flatMap(m=>m[1].split(/\s+/))]);
  for(const kind of ['effects','components','mouse']){
    const selectors=new Set(data[kind].map(item=>item.selector));
    for(const item of source[kind])if(selectorCanMatch(item.selector,classes)){assert.ok(selectors.has(item.selector),`${route} dropped ${kind} for ${item.selector}`);kept++;}
  }
}
let count=0,maxError=0;
const sample=(frames,time,duration)=>{const position=Math.min(1,time/duration)*(frames.length-1);const i=Math.floor(position);const a=frames[i],b=frames[Math.min(i+1,frames.length-1)];return typeof a==='number'?a+(b-a)*(position-i):a;};
for(const page of pages.flatMap(file=>Object.values(file.appear)))for(const entry of page.entries)for(const value of Object.values(entry.variants)){
 if(!value)continue;
 let expected;
 reference.animateAppearEffects({animation:{default:structuredClone(value)}},(_s,keyframes,options)=>{expected={keyframes,options};},'motion','__Appear_Animation_Transform__',false);
 assert.deepEqual(value.frames,expected,`${entry.selector} generated frames differ from source sampler`);
 for(const [property,frames]of Object.entries(value.frames.keyframes)){
   const options=value.frames.options[property];
   assert.ok(Number.isFinite(options.duration)&&options.duration>0);
   for(let time=0;time<=options.duration;time+=1000/60){
     const actual=sample(frames,time,options.duration),original=sample(expected.keyframes[property],time,expected.options[property].duration);
     if(typeof actual==='number')maxError=Math.max(maxError,Math.abs(actual-original));else assert.equal(actual,original);
     count++;
   }
 }
}
const allHTML=(await fs.readFile(output+'/index.html','utf8'));
assert.ok(!allHTML.includes('data-framer-hydrate'));
assert.ok(allHTML.includes('/scripts/motion.js'));
const script=await read('src/scripts/motion.js');assert.ok(!script.includes("translate:'0 30px'"),'Generic phase-one reveal remains');
console.log(`Motion passed: reference values match; ${files.length} per-page motion files keep all ${kept} applicable effects; ${count} sampled entrance values at 60fps match the reference sampler; max numeric error ${maxError}.`);
