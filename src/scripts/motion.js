/* Motion settings were recovered from the published reference, not generic presets.
   See src/motion/*.json and MOTION.md for provenance and validation limits. */
(() => {
  'use strict';
  const data=window.MORO_MOTION, M=window.Motion;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  if(!data||!M||reduce.matches){document.documentElement.classList.remove('motion-ready');return;}
  const all=selector=>[...document.querySelectorAll(selector)];
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const identity={opacity:1,x:0,y:0,scale:1,rotate:0,rotateX:0,rotateY:0,skewX:0,skewY:0};
  const states=new WeakMap(), running=new Set(), scrollEffects=[];
  const active=el=>el.getClientRects().length>0&&getComputedStyle(el).display!=='none';
  function state(el){
    if(!states.has(el)){
      const t=getComputedStyle(el).transform;
      states.set(el,{base:t==='none'?'':t,channels:new Map(),animations:new Map()});
    }
    return states.get(el);
  }
  function paint(el){
    const s=state(el);let opacity=1,transforms=[];
    for(const v of s.channels.values()){
      if(typeof v.opacity==='number')opacity*=v.opacity;
      let t='';
      if(v.x||v.y)t+=` translate(${v.x||0}px,${v.y||0}px)`;
      if(v.scale!==undefined&&v.scale!==1)t+=` scale(${v.scale})`;
      for(const k of ['rotate','rotateX','rotateY','skewX','skewY'])if(v[k])t+=` ${k}(${v[k]}deg)`;
      transforms.push(t);
    }
    const transform=(s.base+transforms.join('')).trim()||'none',alpha=String(clamp(opacity));
    if(s.transform!==transform){el.style.transform=transform;s.transform=transform;}
    if(s.opacity!==alpha){el.style.opacity=alpha;s.opacity=alpha;}
  }
  function set(el,key,v){state(el).channels.set(key,v);paint(el);if(!el.hasAttribute('data-motion-ready'))el.dataset.motionReady='';}
  function mix(from,to,p){const result={};for(const k of Object.keys(identity)){let a=from[k]??identity[k],b=to[k]??identity[k];result[k]=a+(b-a)*p;}return result;}
  function transition(t={}){const result={...t};delete result.nativeEase;if(result.type==='tween')result.type='keyframes';return result;}
  function tween(el,key,from,to,t={}){
    state(el).animations.get(key)?.stop();
    set(el,key,from);
    const animation=M.animate(0,1,{...transition(t),restDelta:.001,restSpeed:.01,onUpdate:p=>set(el,key,mix(from,to,p)),onComplete:()=>{set(el,key,to);running.delete(animation);}});
    state(el).animations.set(key,animation);running.add(animation);return animation;
  }
  function observe(el,amount,callback,once=true){
    let started=false;
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting&&active(el)&&entry.intersectionRatio+0.00001>=amount){
        if(!started){started=true;callback(true);}
        if(once)io.disconnect();
      }else if(started){started=false;callback(false);}
    }),{threshold:amount});io.observe(el);return io;
  }
  // Mount entrances include the original breakpoint-specific transform templates.
  const path=decodeURI(location.pathname).replace(/\/$/,'')||'/';
  const appearance=data.appear[path==='/services'?'/':path]||data.appear[path.startsWith('/projects/')?'/projects/tenfold-s-first-sneaker-release':path.startsWith('/blog/')?'/blog/the-anatomy-of-a-strong-brand-launch':'/404'];
  const pageAppear=new Set();
  // Capture underlying transforms before any entrance animation changes computed styles.
  for(const entry of appearance?.entries||[])for(const el of all(entry.selector))if(active(el))state(el);
  for(const effect of data.effects)for(const el of all(effect.selector))state(el);
  for(const entry of appearance?.entries||[]){
    let spec=entry.variants.default;
    for(const bp of appearance.breakpoints)if(entry.variants[bp.hash]&&matchMedia(bp.mediaQuery).matches)spec=entry.variants[bp.hash];
    for(const el of all(entry.selector)){
      if(!active(el))continue;
      if(spec.transformTemplate)state(el).base=spec.transformTemplate.replace('__Appear_Animation_Transform__','').trim();
      pageAppear.add(el);el.dataset.motionKind='appear';
      el.dataset.motionReady='';
      for(const [property,keyframes] of Object.entries(spec.frames.keyframes)){
        const opt=spec.frames.options[property];
        const ease=Array.isArray(opt.ease)?`cubic-bezier(${opt.ease})`:(opt.ease||'linear');
        const animation=el.animate({[property]:keyframes},{duration:opt.duration,delay:opt.delay||0,easing:ease,fill:'both'});
        animation.onfinish=()=>{animation.cancel();if(property==='opacity')el.style.opacity=spec.animate.opacity;};
      }
    }
  }
  for(const effect of data.effects){
    for(const el of all(effect.selector)){
      el.dataset.motionKind=effect.kind;
      if(effect.kind==='reveal'){
        const from=effect.from||identity,to={...identity,...effect.to};
        set(el,'reveal',from);
        observe(el,effect.threshold,()=>tween(el,'reveal',from,to,effect.to?.transition));
      }else if(effect.kind==='loop'){
        const animation=tween(el,'loop',identity,effect.to,{...effect.transition,repeat:Infinity,repeatType:effect.repeatType==='mirror'?'reverse':'loop'});
        if(effect.pauseOffscreen){animation.pause();observe(el,0,inView=>inView?animation.play():animation.pause(),false);}
      }else if(effect.kind==='scroll'||effect.kind==='parallax'){
        state(el);scrollEffects.push({el,effect,targets:effect.target?all(effect.target):[el]});
      }else if(effect.kind==='text'){
        // Line tokenization uses actual line positions after fonts have loaded.
        const textEl=el.querySelector('p,h1,h2,h3')||el;
        const from=effect.effect||identity;
        if(effect.tokenization==='element'){
          set(textEl,'text',from);observe(el,effect.threshold??0,()=>tween(textEl,'text',from,identity,{...effect.transition,delay:effect.startDelay||0}));
        }else{
          const content=textEl.textContent;const fragment=document.createDocumentFragment();
          for(const word of content.split(/(\s+)/)){
            if(/^\s+$/.test(word)){fragment.append(document.createTextNode(word));continue;}
            const wrap=document.createElement('span');wrap.className='motion-word';
            for(const char of word){const letter=document.createElement('span');letter.className='motion-letter';letter.textContent=char;wrap.append(letter);}
            fragment.append(wrap);
          }
          textEl.replaceChildren(fragment);
          const letters=allWithin(textEl,'.motion-letter');
          letters.forEach(letter=>set(letter,'text',from));
          observe(el,effect.threshold??0,()=>{
            const lines=new Map();
            const tops=letters.map(letter=>letter.offsetTop);
            letters.forEach((letter,i)=>{const top=tops[i];if(!lines.has(top))lines.set(top,lines.size);tween(letter,'text',from,identity,{...effect.transition,delay:(effect.startDelay||0)+lines.get(top)*(effect.transition?.delay||0)});});
          });
        }
      }
    }
  }
  function allWithin(el,selector){return [...el.querySelectorAll(selector)];}
  function offsetTop(el){let n=0;for(let e=el;e&&e!==document.documentElement;e=e.offsetParent)n+=e.offsetTop;return n;}
  // Keep layout reads out of the scrolling hot path. Measure every target before
  // painting any effect, then reuse that geometry until the page layout changes.
  let geometryDirty=true,scrollDirty=true,scrollFrame=0,lenis;
  function measureScroll(){
    const visibility=new Map(),geometry=new Map();
    const visible=el=>{if(!visibility.has(el))visibility.set(el,active(el));return visibility.get(el);};
    for(const item of scrollEffects){
      const {el,effect,targets}=item;
      const target=targets.find(visible);
      item.enabled=visible(el)&&!!target;
      if(!item.enabled||effect.kind==='parallax')continue;
      if(!geometry.has(target))geometry.set(target,{top:offsetTop(target),height:target.clientHeight});
      const {top,height}=geometry.get(target),inView=effect.trigger==='onInView';
      item.start=Math.max(0,top-(inView?0:1)-innerHeight*(inView?1:effect.threshold));
      item.end=Math.max(item.start+1,top-(inView?0:1)+height-innerHeight*(inView?1:effect.threshold));
    }
    geometryDirty=false;
  }
  function updateScroll(){
    if(geometryDirty)measureScroll();
    const y=scrollY;
    for(const item of scrollEffects){
      if(!item.enabled)continue;
      const {el,effect}=item;
      const progress=effect.kind==='parallax'?y:clamp((y-item.start)/(item.end-item.start));
      if(progress===item.progress)continue;
      item.progress=progress;
      set(el,'scroll',effect.kind==='parallax'?{y:progress*(1-effect.speed/100)}:mix(effect.from,effect.to,progress));
    }
    scrollDirty=false;
  }
  function tickScroll(time){
    scrollFrame=0;
    // Lenis and scroll-linked effects use the same frame and scroll position.
    if(lenis){const previous=scrollY;lenis.raf(time);if(scrollY!==previous)scrollDirty=true;}
    if(scrollDirty||geometryDirty)updateScroll();
    if(lenis&&!reduce.matches)scrollFrame=requestAnimationFrame(tickScroll);
  }
  function scheduleScroll(){scrollDirty=true;if(!scrollFrame)scrollFrame=requestAnimationFrame(tickScroll);}
  function invalidateScroll(){geometryDirty=true;scheduleScroll();}
  addEventListener('scroll',scheduleScroll,{passive:true});
  addEventListener('resize',invalidateScroll,{passive:true});
  document.fonts.ready.then(invalidateScroll);
  document.addEventListener('load',invalidateScroll,true);
  document.addEventListener('loadedmetadata',invalidateScroll,true);
  document.addEventListener('toggle',invalidateScroll,true);
  const scrollResize=new ResizeObserver(invalidateScroll);
  const layoutNodes=new Set([document.documentElement,document.body]);
  for(const {el,targets}of scrollEffects){layoutNodes.add(el);targets.forEach(target=>layoutNodes.add(target));}
  layoutNodes.forEach(el=>scrollResize.observe(el));
  // Tabs and responsive variants can swap visibility without resizing the page.
  new MutationObserver(records=>{
    if(records.some(record=>record.target!==document.documentElement))invalidateScroll();
  }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
  updateScroll();
  // Exact reference mouse mapping and spring: damping 38, stiffness 76, mass .95.
  const pointers=[];
  for(const spec of data.mouse)for(const container of all(spec.selector)){
    const img=container.querySelector('[data-parallax]');if(!img)continue;
    const el=img.parentElement;state(el);
    const options={damping:20+spec.momentum*60,stiffness:100-spec.momentum*80,mass:.5+spec.momentum*1.5};
    const input={x:M.motionValue(0),y:M.motionValue(0),scale:M.motionValue(1)};
    const smooth={x:M.springValue(input.x,options),y:M.springValue(input.y,options),scale:M.springValue(input.scale,options)};
    const paintPointer=()=>set(el,'pointer',{x:smooth.x.get(),y:smooth.y.get(),scale:smooth.scale.get()});
    Object.values(smooth).forEach(v=>v.on('change',paintPointer));pointers.push({spec,input});
  }
  addEventListener('mousemove',e=>{
    const x=(e.clientX/innerWidth-.5)*2,y=(e.clientY/innerHeight-.5)*2,size=Math.min(innerWidth,innerHeight)*.1;
    pointers.forEach(({spec,input})=>{input.x.set(x*size*spec.tracking/100);input.y.set(y*size*spec.tracking/100);input.scale.set(1+spec.scale/100*y);});
  },{passive:true});
  document.addEventListener('mouseleave',()=>pointers.forEach(({input})=>{input.x.set(0);input.y.set(0);input.scale.set(1);}));
  // Reuse the reference's embedded Lenis 1.1.2 implementation and intensity 10.
  if(window.ReferenceLenis){
    lenis=new ReferenceLenis({duration:1});
    document.addEventListener('nmesis:scroll-to',event=>{
      const target=event.detail?.target;
      if(!(target instanceof Element))return;
      event.preventDefault();
      const destination=window.scrollY+target.getBoundingClientRect().top-(parseFloat(getComputedStyle(target).scrollMarginTop)||0);
      // A focused thumbnail may have moved the browser before Lenis received its scroll event.
      lenis.scrollTo(window.scrollY,{immediate:true});
      lenis.scrollTo(destination);
    });
    scheduleScroll();
    new MutationObserver(()=>document.documentElement.style.overflow==='hidden'?lenis.stop():lenis.start()).observe(document.documentElement,{attributes:true,attributeFilter:['style']});
    document.addEventListener('click',event=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const link=event.target.closest('a[href]');
      if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
      const url=new URL(link.href);
      if(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search||!url.hash)return;
      let id;try{id=decodeURIComponent(url.hash.slice(1));}catch{return;}
      const target=document.getElementById(id);
      if(target){
        event.preventDefault();history.pushState(null,'',url.hash);
        document.dispatchEvent(new CustomEvent('nmesis:scroll-to',{cancelable:true,detail:{target}}));
      }
    });
  }
  // Component hover transitions: original variant styles plus FLIP for layout changes.
  const componentSpecs=new Map(data.components.map(c=>[c.selector,c.transition]));
  const roots=new Map();
  function addRoot(el,t){if(!roots.has(el))roots.set(el,{transition:t,styles:[]});return roots.get(el);}
  for(const c of data.components)for(const el of all(c.selector)){
    if(el.matches('a,button,[data-part="Default"]')||el.querySelector('[data-part="hover animation"]'))addRoot(el,c.transition);
  }
  // Card arrow controls start hidden in the published component.
  for(const el of all('.design-1voml8r-container'))el.style.opacity=0;
  for(const h of data.hovers)for(const el of all(h.selector)){
    const root=el.closest(h.root);if(!root)continue;
    const item=addRoot(root,h.transition?.duration!==undefined?h.transition:{duration:.4,ease:[.44,0,.56,1]});
    const original={};for(const key of Object.keys(h.to))original[key]=key==='scale'?1:getComputedStyle(el).getPropertyValue(key.startsWith('--')?key:key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()));
    for(const k of Object.keys(original))if(k in identity)original[k]=k==='scale'?1:Number.parseFloat(original[k]);
    state(el);
    item.styles.push({el,to:h.to,original});
  }
  for(const [root,spec]of roots){
    let hovered=false;const animations=[];
    function hover(on){
      if(root.getAttribute('aria-disabled')==='true')on=false;
      if(on===hovered)return;hovered=on;
      const nodes=[root,...root.querySelectorAll('[class]')].filter(e=>active(e)&&!e.matches('svg,svg *'));
      const before=new Map(nodes.map(e=>[e,{rect:e.getBoundingClientRect(),transform:getComputedStyle(e).transform}]));
      animations.splice(0).forEach(a=>a.cancel?.());
      root.classList.toggle('hover',on);
      const ink=root.querySelector(':scope > .design-owwx6i');
      if(ink)ink.style.transform=on?'none':'translateX(-50%)';
      const navInk=root.querySelector(':scope > .design-1ljapm1');
      if(navInk)navInk.style.transform=on?'translateX(-50%)':'none';
      const duration=(spec.transition.duration??.4)*1000,delay=(spec.transition.delay||0)*1000;
      const ease=spec.transition.nativeEase|| (Array.isArray(spec.transition.ease)?`cubic-bezier(${spec.transition.ease})`:'linear');
      for(const node of nodes){
        const old=before.get(node),next=node.getBoundingClientRect();
        if(!old.rect.width||!old.rect.height||!next.width||!next.height)continue;
        const dx=old.rect.left-next.left,dy=old.rect.top-next.top,sx=old.rect.width/next.width,sy=old.rect.height/next.height;
        if(Math.abs(dx)+Math.abs(dy)+Math.abs(sx-1)+Math.abs(sy-1)<.01)continue;
        // Only animate the highest changed ancestor to avoid double transforms on children.
        if(nodes.some(parent=>parent!==node&&parent.contains(node)&&parent.dataset.flipActive==='1'))continue;
        node.dataset.flipActive='1';
        const base=getComputedStyle(node).transform==='none'?'':getComputedStyle(node).transform;
        // Convert screen-space movement into the parent’s coordinate system (the
        // previous pricing arrow is inside a 180-degree rotated container).
        let axes=new DOMMatrix();
        for(let parent=node.parentElement;parent;parent=parent.parentElement){const t=getComputedStyle(parent).transform;if(t!=='none')axes=new DOMMatrix(t).multiply(axes);}
        const inverse=new DOMMatrix([axes.a,axes.b,axes.c,axes.d,0,0]).inverse();
        const local=inverse.transformPoint(new DOMPoint(dx,dy));
        const a=node.animate([{transformOrigin:'0 0',transform:`${base} translate(${local.x}px,${local.y}px) scale(${sx},${sy})`},{transformOrigin:'0 0',transform:base||'none'}],{duration,delay,easing:ease});
        a.onfinish=a.oncancel=()=>delete node.dataset.flipActive;animations.push(a);
      }
      for(const item of spec.styles){
        const to=on?item.to:item.original;
        const transform={};for(const k of Object.keys(identity))if(k in to&&typeof to[k]==='number')transform[k]=to[k];
        if(Object.keys(transform).length){const from=state(item.el).channels.get('hover')||{...identity,...Object.fromEntries(Object.entries(item.original).filter(([k])=>k in identity))};tween(item.el,'hover',from,{...identity,...transform},spec.transition);}
        const css={};for(const [key,value]of Object.entries(to))if(!(key in identity)&&typeof value!=='object')css[key]=value;
        if(Object.keys(css).length)M.animate(item.el,css,transition(spec.transition));
      }
    }
    const link=root.closest('a');
    if(link&&link!==root){link.dataset.hoverReady='';link.addEventListener('focusin',()=>hover(true));link.addEventListener('focusout',e=>{if(!link.contains(e.relatedTarget))hover(false);});}
    root.dataset.hoverReady='';
    root.addEventListener('pointerenter',()=>hover(true));root.addEventListener('pointerleave',()=>hover(false));root.addEventListener('focusin',()=>hover(true));root.addEventListener('focusout',e=>{if(!root.contains(e.relatedTarget))hover(false);});
  }
  // Desktop services: connector growth, then labels fade in 400ms later.
  for(const el of all('.design-KzayI.design-v-sytqi9')){
    const connectors=allWithin(el,'.design-q6mjfo,.design-1b8i16e,.design-127pk3,.design-1ccm1e8');
    const labels=el.querySelector('.design-54npr4');if(labels)labels.style.opacity=0;
    const target=document.querySelector('#service-trigger')||el;
    observe(target,.5,()=>{
      el.classList.remove('design-v-sytqi9');el.classList.add('design-v-1qn62t9');
      connectors.forEach(c=>c.animate([{height:'1px'},{height:'160px'}],{duration:400,easing:'cubic-bezier(.86,.01,.47,.99)'}));
      if(labels)M.animate(labels,{opacity:[0,1]},{delay:.4,duration:.4,ease:[.86,.01,.47,.99]});
      setTimeout(()=>{el.classList.remove('design-v-1qn62t9');el.classList.add('design-v-1ah431c');},400);
    });
  }
  // The result meter lights seven dots, 150ms apart; it replays on re-entry.
  for(const el of all('.design-1ef5sba-container')){
    let timers=[];const dots=allWithin(el,'[aria-label^="Brick "]');
    observe(el,.5,on=>{
      timers.forEach(clearTimeout);timers=[];dots.forEach(dot=>dot.style.background='var(--color-border)');
      if(on)dots.slice(0,7).forEach((dot,i)=>timers.push(setTimeout(()=>dot.style.background='var(--color-ink)',10+(i+1)*150)));
    },false);
  }
  // Follow Cursor: the original grid uses smoothing 18, footer 65, damping 100.
  for(const layer of all('div[style]').filter(el=>el.style.maskImage?.includes('closest-side'))){
    const host=layer.parentElement,smoothing=layer.offsetWidth>1000?65:18;
    const options={damping:100,stiffness:2000+smoothing/100*(50-2000)};
    const x=M.motionValue(0),y=M.motionValue(0),sx=M.springValue(x,options),sy=M.springValue(y,options);
    let started=false,lastScrollX=scrollX,lastScrollY=scrollY;
    layer.style.opacity=0;
    const paintGlow=()=>{layer.style.transform=`translate(${sx.get().toFixed(3)}px,${sy.get().toFixed(3)}px)`;};
    sx.on('change',paintGlow);sy.on('change',paintGlow);
    addEventListener('pointermove',event=>{
      const r=host.getBoundingClientRect(),tx=event.clientX-r.left-layer.offsetWidth/2,ty=event.clientY-r.top-layer.offsetHeight/2;
      x.set(tx);y.set(ty);lastScrollX=scrollX;lastScrollY=scrollY;
      if(!started){started=true;sx.jump(tx);sy.jump(ty);paintGlow();M.animate(layer,{opacity:1},{type:'spring',duration:.2,bounce:0});}
    },{passive:true});
    addEventListener('scroll',()=>{if(!started)return;x.set(x.get()+scrollX-lastScrollX);y.set(y.get()+scrollY-lastScrollY);lastScrollX=scrollX;lastScrollY=scrollY;},{passive:true});
  }
  // Expose only the shared UI motion needed by site.js.
  window.MoroMotion={
    menu(el,opening){
      el._menuAnimation?.stop();el._menuFinish?.();
      return new Promise(resolve=>{
        el._menuFinish=resolve;
        const paintMenu=p=>{
          el._menuProgress=p;
          el.style.clipPath=`inset(0 0 ${(1-clamp(p))*Math.max(0,el.clientHeight-66)}px 0)`;
          el.style.backgroundColor=`rgba(var(--menu-rgb,255,255,255),${clamp(p)})`;
          const lines=el.querySelectorAll('.menu-close span');
          if(lines.length===2){
            lines[0].style.width=`${20-4*clamp(p)}px`;
            lines[1].style.width=`${12+4*clamp(p)}px`;
            lines[0].style.transform=`translateY(${-4*(1-clamp(p))}px) rotate(${-45*clamp(p)}deg)`;
            lines[1].style.transform=`translateY(${4*(1-clamp(p))}px) rotate(${45*clamp(p)}deg)`;
          }
        };
        paintMenu(el._menuProgress??(opening?0:1));
        el._menuAnimation=M.animate(el._menuProgress,opening?1:0,{type:'spring',duration:.4,bounce:.2,onUpdate:paintMenu,onComplete:()=>{
          paintMenu(opening?1:0);
          if(opening)el.style.clipPath='';
          el._menuAnimation=null;el._menuFinish=null;resolve();
        }});
      });
    },
    faq(answer,opening){
      const current=answer.hidden?0:answer.getBoundingClientRect().height;
      const opacity=answer.hidden?0:Number(getComputedStyle(answer).opacity);
      const interrupted=Boolean(answer._faqAnimation);
      answer._faqAnimation?.cancel();
      answer.hidden=false;answer.style.height='auto';answer.style.opacity='1';
      // Measure the fractional border box: scrollHeight rounds and caused an end-frame snap.
      const natural=answer.getBoundingClientRect().height;
      answer.style.overflow='hidden';
      const animation=answer.animate([{height:current+'px',opacity},{height:(opening?natural:0)+'px',opacity:opening?1:0}],{duration:300,delay:interrupted?0:100,easing:'cubic-bezier(1,.01,.56,1)',fill:'both'});
      answer._faqAnimation=animation;
      animation.onfinish=()=>{
        if(answer._faqAnimation!==animation)return;
        answer.hidden=!opening;answer.style.height='';answer.style.opacity=opening?'1':'0';answer.style.overflow='';
        animation.cancel();answer._faqAnimation=null;
      };
    }
  };
  reduce.addEventListener('change',()=>{if(reduce.matches){running.forEach(a=>a.stop());lenis?.destroy();location.reload();}});
  document.documentElement.classList.remove('motion-ready');
})();
