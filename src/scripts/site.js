/* Vanilla JavaScript; no framework, remote modules, or hydration. */
(() => {
  'use strict';
  const config = JSON.parse(document.getElementById('site-config')?.textContent || '{}');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const easing = 'cubic-bezier(.22,1,.36,1)';
  // Clean URLs keep all original relative anchor behavior predictable on static hosts.
  const cleanPath = location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '') || '/';
  if (cleanPath !== location.pathname) history.replaceState(null,'',cleanPath+location.search+location.hash);

  // The wordmark adapts to a new brand name instead of keeping the old logo's fixed dimensions.
  const fitWordmarks=()=>document.querySelectorAll('[data-wordmark]').forEach(el=>{
    const text=el.firstElementChild;if(!el.clientWidth)return;
    text.style.fontSize='100px';
    const width=text.getBoundingClientRect().width;
    if(width)text.style.fontSize=`${el.clientWidth/width*100}px`;
  });
  document.fonts.ready.then(fitWordmarks);
  const wordmarkResize=new ResizeObserver(fitWordmarks);
  document.querySelectorAll('[data-wordmark]').forEach(el=>wordmarkResize.observe(el));
  const clock=document.querySelector('[data-clock]');
  if(clock){const update=()=>clock.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:config.timezone||'America/Los_Angeles',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date());update();setInterval(update,1000);}

  // Navigation labels/links are regular HTML; the mobile overlay supports Escape and focus return.
  const menu = document.querySelector('.mobile-menu');
  const brand = document.createElement('span');
  brand.className = 'menu-brand';
  if(config.logo){const logo=document.createElement('img');logo.src=config.logo;logo.alt=config.brandName;brand.append(logo);}else brand.textContent=config.brandName;
  menu.prepend(brand);
  const menuContact=document.querySelector('nav .design-gzg5v.design-v-hyui4n')?.cloneNode(true);
  if(menuContact){menuContact.classList.add('menu-contact');menu.append(menuContact);}
  let opener,menuEpoch=0,previousOverflow='',previousGutter='';
  const alignMenuHeader=()=>{
    const nav=opener?.closest('nav');
    if(!nav)return;
    const position=(element,prefix,offset=0)=>{
      if(!element)return;
      const rect=element.getBoundingClientRect();
      menu.style.setProperty(`--menu-${prefix}-x`,`${rect.left-offset}px`);
      menu.style.setProperty(`--menu-${prefix}-y`,`${rect.top}px`);
      menu.style.setProperty(`--menu-${prefix}-width`,`${rect.width}px`);
      menu.style.setProperty(`--menu-${prefix}-height`,`${rect.height}px`);
    };
    position(nav.querySelector('.brand-image'),'logo');
    position(opener,'toggle',12);
    position(nav.querySelector('.design-gzg5v'),'contact');
  };
  for (const toggle of document.querySelectorAll('nav [data-part="default"]')) {
    toggle.setAttribute('role','button'); toggle.setAttribute('tabindex','0');
    toggle.setAttribute('aria-label','Open navigation');toggle.setAttribute('aria-expanded','false');
    const open = () => {
      if(menu.open)return;
      menuEpoch++;menu.dataset.state='open';
      opener=toggle;alignMenuHeader();
      const root=document.documentElement;
      previousOverflow=root.style.overflow;previousGutter=root.style.scrollbarGutter;
      menu.style.width=innerWidth+'px';
      menu.style.setProperty('--menu-gutter',Math.max(0,innerWidth-root.clientWidth)+'px');
      root.style.scrollbarGutter='stable';root.style.overflow='hidden';
      opener=toggle;toggle.setAttribute('aria-expanded','true');
      menu.style.clipPath=window.MoroMotion?'inset(0 0 '+Math.max(0,innerHeight-66)+'px 0)':'';
      root.classList.add('navigation-open');
      menu.showModal();menu.scrollTop=0;
      window.MoroMotion?.menu(menu,true);
    };
    toggle.addEventListener('click',open);
    toggle.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
  }
  const closeMenu=async()=>{const epoch=++menuEpoch;menu.dataset.state='closing';if(window.MoroMotion)await MoroMotion.menu(menu,false);if(epoch!==menuEpoch)return;menu.dataset.state='closed';menu.close();};
  menu.querySelector('.menu-close').addEventListener('click',closeMenu);
  menu.addEventListener('cancel',event=>{event.preventDefault();closeMenu();});
  menu.addEventListener('close',()=>{
    const root=document.documentElement;root.style.overflow=previousOverflow;root.style.scrollbarGutter=previousGutter;
    menu.style.clipPath='';menu.style.backgroundColor='';menu._menuProgress=0;
    root.classList.remove('navigation-open');
    opener?.setAttribute('aria-expanded','false');opener?.focus({preventScroll:true});
  });
  window.addEventListener('resize',()=>{if(menu.open){menu.style.width=innerWidth+'px';alignMenuHeader();}},{passive:true});
  const desktopMenu=matchMedia('(min-width:1200px)');
  desktopMenu.addEventListener('change',event=>{if(event.matches&&menu.open)closeMenu();});
  if (config.logo) {
    for (const p of document.querySelectorAll('nav p')) {
      if (p.textContent.trim()===config.brandName) {const img=document.createElement('img');img.src=config.logo;img.alt=config.brandName;img.className='brand-image';p.replaceChildren(img);}
    }
  }
  // A loop is active whenever any portion of the reel is visible.
  const showreel=document.querySelector('[data-showreel]');
  if(showreel){
    const sound=document.querySelector('[data-showreel-sound]');
    let visible=false,leaving=false;
    showreel.muted=true;
    const shouldPlay=()=>visible&&!document.hidden&&!leaving;
    const syncPlayback=()=>{
      if(shouldPlay()){
        const attempt=showreel.play();
        attempt?.then(()=>{if(!shouldPlay())showreel.pause();}).catch(()=>{});
      }else showreel.pause();
    };
    const observer=new IntersectionObserver(entries=>{
      const entry=entries[entries.length-1];
      visible=entry.isIntersecting&&entry.intersectionRect.width>0&&entry.intersectionRect.height>0;
      syncPlayback();
    },{threshold:[0,Number.EPSILON]});
    // Observe the clipping frame: the enlarged film extends beyond its visible bounds.
    observer.observe(showreel.closest('.showreel-frame'));
    showreel.addEventListener('play',()=>{if(!shouldPlay())showreel.pause();});
    sound.addEventListener('click',()=>{
      showreel.muted=!showreel.muted;
      const enabled=!showreel.muted;
      sound.setAttribute('aria-pressed',String(enabled));
      sound.setAttribute('aria-label',`Turn showreel sound ${enabled?'off':'on'}`);
      sound.querySelector('[data-sound-state]').textContent=enabled?'on':'off';
      syncPlayback();
    });
    document.addEventListener('visibilitychange',syncPlayback);
    window.addEventListener('pagehide',()=>{leaving=true;showreel.pause();});
    window.addEventListener('pageshow',()=>{leaving=false;syncPlayback();});
  }
  // Project previews loop as soon as their card is visible, independent of hover. They have no
  // autoplay attribute, so hidden responsive copies never download, and reduced motion keeps the poster.
  const projectLoops=[...document.querySelectorAll('[data-project-loop]')];
  if(projectLoops.length){
    const visible=new Set();
    let leaving=false;
    const shouldPlay=video=>visible.has(video)&&!document.hidden&&!leaving&&!reducedMotion.matches;
    reducedMotion.addEventListener('change',()=>projectLoops.forEach(sync));
    const sync=video=>{
      if(shouldPlay(video))video.play()?.then(()=>{if(!shouldPlay(video))video.pause();}).catch(()=>{});
      else video.pause();
    };
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(entry.isIntersecting&&entry.intersectionRect.width>0&&entry.intersectionRect.height>0)visible.add(entry.target);
        else visible.delete(entry.target);
        sync(entry.target);
      }
    },{threshold:[0,Number.EPSILON]});
    for(const video of projectLoops){
      video.muted=true;
      video.addEventListener('play',()=>{if(!shouldPlay(video))video.pause();});
      observer.observe(video);
    }
    document.addEventListener('visibilitychange',()=>projectLoops.forEach(sync));
    window.addEventListener('pagehide',()=>{leaving=true;projectLoops.forEach(sync);});
    window.addEventListener('pageshow',()=>{leaving=false;projectLoops.forEach(sync);});
  }
  // Brand project details are also available by tap and keyboard, without hover.
  document.querySelectorAll('.design-c6og6u .design-Cyg5M').forEach((card,index)=>{
    const details=card.querySelector('[data-part="Hover"]');
    const brand=card.querySelector('[role="img"]')?.getAttribute('aria-label');
    if(!details)return;
    details.id=`client-details-${index}`;
    card.setAttribute('role','button');card.tabIndex=0;
    card.setAttribute('aria-label',`${brand}: show project details`);
    card.setAttribute('aria-controls',details.id);card.setAttribute('aria-expanded','false');
    const toggle=(open)=>{
      card.classList.toggle('client-details-open',open);
      card.setAttribute('aria-expanded',String(open));
      card.setAttribute('aria-label',`${brand}: ${open?'hide':'show'} project details`);
    };
    card.addEventListener('click',()=>toggle(!card.classList.contains('client-details-open')));
    card.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle(!card.classList.contains('client-details-open'));}
      if(event.key==='Escape')toggle(false);
    });
  });

  // FAQ state is accessible; motion uses the original row's transition.
  document.querySelectorAll('[data-accordion]').forEach((item,index)=>{
    const trigger=item.querySelector('[data-accordion-trigger]'),answer=item.querySelector('[data-accordion-answer]');
    answer.id=`faq-answer-${index}`;trigger.setAttribute('aria-controls',answer.id);
    function toggle(){const open=trigger.getAttribute('aria-expanded')!=='true';trigger.setAttribute('aria-expanded',String(open));item.classList.toggle('design-v-ej89yt',!open);item.classList.toggle('design-v-1kj9gq8',open);item.dataset.part=open?'Open':'Closed';if(window.MoroMotion)MoroMotion.faq(answer,open);else {answer.hidden=!open;answer.style.opacity=open?'1':'0';}}
    trigger.addEventListener('click',toggle);
    if(!trigger.matches('button'))trigger.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
  });
  // Both arrows alternate the two original stacked pricing variants.
  document.querySelectorAll('.design-hWt2h:not(.design-v-14xrnpc)').forEach(section=>{
    const one=section.querySelector('.design-1j1pwuj-container');
    const monthly=section.querySelector('.design-fp0vd4-container');
    if(!one||!monthly)return;
    const cards=[one,monthly];
    let selected=1;
    const status=document.createElement('span');status.className='sr-only';status.setAttribute('aria-live','polite');section.append(status);
    const select=index=>{
      selected=index;section.dataset.pricingSelected=index===0?'one-off':'monthly';
      section.classList.toggle('design-v-xt6m0d',index===0);
      section.classList.toggle('design-v-111aj9f',index===1);
      cards.forEach((card,n)=>{
        const front=n===index;card.dataset.pricingFront=String(front);
        const inner=card.firstElementChild;inner.dataset.part=front?'Active':'Default';
        inner.setAttribute('aria-label',inner.querySelector('h3')?.textContent.trim()+(front?' — selected':' — select plan'));
        inner.tabIndex=front?-1:0;
        for(const link of card.querySelectorAll('a')){
          link.setAttribute('aria-disabled',String(!front));link.tabIndex=front?0:-1;
          link.classList.toggle('design-v-rrfsoj',!front);link.classList.toggle('design-v-1govnkm',front);
          if(!front)link.classList.remove('hover');
        }
      });
      status.textContent=cards[index].querySelector('h3')?.textContent.trim()+' selected';
    };
    cards.forEach((card,index)=>{
      card.addEventListener('click',event=>{if(selected!==index){event.preventDefault();event.stopPropagation();select(index);}},true);
      card.firstElementChild.addEventListener('keydown',event=>{if(event.target===card.firstElementChild&&(event.key==='Enter'||event.key===' ')){event.preventDefault();select(index);}});
    });
    section.querySelectorAll('.design-1qkxpsn .design-2RKOK').forEach((button,index)=>{
      button.setAttribute('role','button');button.tabIndex=0;button.setAttribute('aria-label',index?'Next pricing plan':'Previous pricing plan');
      button.addEventListener('click',()=>select(1-selected));
      button.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(1-selected);}});
    });
    select(selected);
  });
  // The contact form sends through the site's endpoint. When that is unavailable it prepares a
  // reviewable email in the visitor's own app instead, never claiming a delivery that did not happen.
  const contactForm=document.querySelector('.contact-brief');
  const prepareEmail=(form,open)=>{
    const data=new FormData(form);
    const labels={Name:'Name',Email:'Email',Service:'Service',Referral:'How you heard about us',message:'Message'};
    const body=Object.entries(labels).map(([key,label])=>label+': '+(String(data.get(key)||'').trim()||'Not specified')).join('\n\n');
    const subject='NMESIS enquiry: '+String(data.get('Service'));
    form.querySelector('[data-contact-mail]').href='mailto:'+form.dataset.email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    form.querySelector('[data-contact-preview]').value=body;
    form.querySelector('[data-contact-status]').textContent=open?'Email app didn’t open? Use the link below or copy your message.':'We couldn’t send your message just now. Open it in your email app or copy it below.';
    form.querySelector('[data-contact-ready]').hidden=false;
    if(open)window.location.href=form.querySelector('[data-contact-mail]').href;
  };
  if(contactForm){
    const ready=contactForm.querySelector('[data-contact-ready]'),sent=contactForm.querySelector('[data-contact-sent]');
    contactForm.addEventListener('input',()=>{ready.hidden=true;sent.hidden=true;});
    // Submissions within seconds of the page loading are almost always automated.
    contactForm.elements.started.value=String(Date.now());
    if(!config.forms?.contactEndpoint)contactForm.querySelector('[data-contact-help]').textContent='Opens your email app to send your message to '+contactForm.dataset.email+'.';
    contactForm.querySelector('[data-contact-another]').addEventListener('click',()=>{sent.hidden=true;contactForm.elements.Name.focus();});
    contactForm.querySelector('[data-contact-copy]').addEventListener('click',async()=>{
      const preview=contactForm.querySelector('[data-contact-preview]');
      const status=contactForm.querySelector('[data-contact-status]');
      try{await navigator.clipboard.writeText(preview.value);status.textContent='Enquiry copied. Paste it into your email and send it to '+contactForm.dataset.email+'.';}
      catch{preview.hidden=false;preview.focus();preview.select();status.textContent='Select and copy your message below, then paste it into your email.';}
    });
  }
  const notice=document.querySelector('.form-notice');
  function notify(text){notice.textContent=text;notice.hidden=false;clearTimeout(notice.dismissTimer);notice.dismissTimer=setTimeout(()=>notice.hidden=true,9000);}
  document.addEventListener('submit',async event=>{
    const form=event.target;if(!(form instanceof HTMLFormElement))return;
    event.preventDefault();
    const endpoint=config.forms?.[form.dataset.form==='contact'?'contactEndpoint':'newsletterEndpoint'];
    if(form.matches('.contact-brief')){
      if(!form.reportValidity())return;
      if(!endpoint){prepareEmail(form,true);return;}
      const button=form.querySelector('[type=submit]'),help=form.querySelector('[data-contact-help]'),helpText=help.textContent;
      const sent=form.querySelector('[data-contact-sent]'),data=new FormData(form);
      button.disabled=true;form.setAttribute('aria-busy','true');help.textContent='Sending your message…';
      form.querySelector('[data-contact-ready]').hidden=true;sent.hidden=true;
      try{
        const response=await fetch(endpoint,{method:'POST',body:data,headers:{Accept:'application/json'}});
        const result=await response.json().catch(()=>({}));
        if(response.ok&&result.ok){
          const name=String(data.get('Name')||'').trim().split(/\s+/)[0];
          form.querySelector('[data-contact-sent-text]').textContent=`Thank you${name?', '+name:''}. Your message is with the NMESIS team, and we’ll reply to ${String(data.get('Email')).trim()}.`;
          form.reset();form.elements.started.value=String(Date.now());
          help.textContent=helpText;sent.hidden=false;sent.focus();
        }else if(response.status===400&&result.message){
          help.textContent=result.message;form.elements[result.field]?.focus();
        }else{
          // Not configured yet: the email app opens as before. Any other failure offers it without claiming delivery.
          help.textContent=helpText;prepareEmail(form,response.status===503);
        }
      }catch{help.textContent=helpText;prepareEmail(form,false);}
      finally{button.disabled=false;form.removeAttribute('aria-busy');}
      return;
    }
    if(!endpoint){notify('This form is not connected. Please contact us by email.');return;}
    const button=form.querySelector('[type=submit]');if(button)button.disabled=true;
    try {const response=await fetch(endpoint,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});if(!response.ok)throw new Error();notify('Thank you. Your message has been sent.');form.reset();}
    catch{notify('Your message could not be sent. Please try again or use the email link.');}
    finally{if(button)button.disabled=false;}
  });
})();

// Project media remains optional, so other routes need no special initialization.
(() => {
  for (const film of document.querySelectorAll('[data-case-film]')) {
    const start=film.parentElement.querySelector('.case-film-start');
    // Native mobile play overlays must not compete with the custom poster control.
    const showPoster=()=>{
      film.controls=false;
      film.parentElement.classList.toggle('is-awaiting-play',Boolean(start.querySelector('.case-film-poster')));
      start.hidden=false;
    };
    showPoster();
    start.addEventListener('click',()=>{film.play().catch(showPoster);});
    film.addEventListener('error',showPoster);
    film.addEventListener('play',()=>{
      film.parentElement.classList.remove('is-awaiting-play');
      film.controls=true;
      start.hidden=true;
      for(const other of document.querySelectorAll('[data-case-film]'))if(other!==film)other.pause();
    });
    // User starts playback; leaving the page never leaves sound running.
    document.addEventListener('visibilitychange',()=>{if(document.hidden)film.pause();});
    new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)film.pause();},{threshold:0}).observe(film);
  }
  for(const capsule of document.querySelectorAll('[data-embed-capsule]')) {
    const stage=capsule.querySelector('.case-embed-stage'),frame=stage.querySelector('iframe');
    const cover=stage.querySelector('.case-embed-cover'),full=capsule.querySelector('[data-embed-fullscreen]');
    const width=Number(capsule.dataset.embedWidth),height=Number(capsule.dataset.embedHeight);
    const resize=()=>frame.style.setProperty('--embed-scale',Math.min(stage.clientWidth/width,stage.clientHeight/height));
    new ResizeObserver(resize).observe(stage);resize();
    const launchButton=capsule.querySelector('[data-embed-launch]');
    const launchLabel=launchButton.innerHTML;
    const setEmbedLabel=(button,text)=>{
      const labels=button.querySelectorAll('.svc-button-label>span');
      if(labels.length)labels.forEach(label=>{label.textContent=text;});
      else button.textContent=text;
    };
    const note=capsule.querySelector('.case-embed-note'),noteText=note.textContent;
    const fallback=document.createElement('a');fallback.href=frame.dataset.embedSrc;fallback.target='_blank';fallback.rel='noopener noreferrer';
    fallback.className='case-action case-embed-fallback';fallback.textContent='Open experience ↗';fallback.hidden=true;cover.append(fallback);
    let loadingTimer;
    const reset=()=>{
      clearTimeout(loadingTimer);launchButton.disabled=false;launchButton.hidden=false;launchButton.innerHTML=launchLabel;fallback.hidden=true;note.textContent=noteText;
      capsule.removeAttribute('aria-busy');
    };
    frame.addEventListener('load',()=>{
      if(!frame.hasAttribute('src'))return;
      reset();cover.hidden=true;frame.style.opacity='1';resize();
    });
    capsule.addEventListener('embed-reset',reset);
    const launch=()=>{
      frame.hidden=false;frame.removeAttribute('tabindex');resize();
      if(cover.hidden)return;
      reset();frame.style.opacity='0';capsule.setAttribute('aria-busy','true');
      launchButton.disabled=true;setEmbedLabel(launchButton,'Loading experience…');
      frame.src=frame.dataset.embedSrc;
      loadingTimer=setTimeout(()=>{
        reset();
        launchButton.hidden=true;fallback.hidden=false;
        note.textContent='This embed is taking longer than expected. Open the experience in a new tab to continue.';
      },12000);
    };
    launchButton.addEventListener('click',launch);
    if(!document.fullscreenEnabled)full.hidden=true;
    full.addEventListener('click',async()=>{
      try {if(document.fullscreenElement===capsule)await document.exitFullscreen();else {launch();await capsule.requestFullscreen();}}
      catch {capsule.querySelector('.case-embed-note').textContent='Fullscreen is unavailable here. Open separately for the larger experience.';}
    });
    document.addEventListener('fullscreenchange',()=>{const active=document.fullscreenElement===capsule;setEmbedLabel(full,full.querySelector('.svc-button-label')?(active?'Exit fullscreen':'Fullscreen'):(active?'Exit fullscreen ↙':'Fullscreen ↗'));resize();});
  }
  for(const group of document.querySelectorAll('[data-case-gallery]')) {
  const dialog=group.querySelector('.case-lightbox'),links=[...group.querySelectorAll('[data-gallery-image]')];
  if(!dialog || !links.length)continue;
  let index=0,opener,overflow='';
  const video=dialog.querySelector('[data-gallery-video]');
  const stopVideo=()=>{if(video){video.pause();video.removeAttribute('src');video.load();}};
  const show=i=>{
    index=(i+links.length)%links.length;
    const link=links[index],img=dialog.querySelector('[data-gallery-full]');
    const isVideo=link.dataset.galleryType==='video';
    stopVideo();img.hidden=isVideo;
    if(video)video.hidden=!isVideo;
    if(isVideo&&video){
      video.src=link.href;video.poster=link.querySelector('img').src;
      video.setAttribute('aria-label',link.dataset.caption);
      document.querySelectorAll('[data-case-film]').forEach(film=>film.pause());
      video.play().catch(()=>{});
    }else{img.src=link.href;img.alt=link.querySelector('img').alt;}
    dialog.querySelector('[data-gallery-caption]').textContent=link.dataset.caption;
    dialog.querySelector('[data-gallery-count]').textContent=`${index+1} / ${links.length}`;
  };
  links.forEach((link,i)=>link.addEventListener('click',event=>{
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();opener=link;show(i);overflow=document.documentElement.style.overflow;
    document.documentElement.style.overflow='hidden';dialog.showModal();
  }));
  dialog.querySelector('[data-gallery-close]').addEventListener('click',()=>dialog.close());
  dialog.querySelector('[data-gallery-prev]').addEventListener('click',()=>show(index-1));
  dialog.querySelector('[data-gallery-next]').addEventListener('click',()=>show(index+1));
  dialog.addEventListener('keydown',event=>{
    if(event.target===video)return;
    if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(index+(event.key==='ArrowLeft'?-1:1));}
  });
  dialog.addEventListener('close',()=>{stopVideo();document.documentElement.style.overflow=overflow;opener?.focus({preventScroll:true});});
  }
})();

// Service formats: accessible tabs, independent within each service family.
(() => {
  for(const group of document.querySelectorAll('[data-service-group]')) {
    const tabs=[...group.querySelectorAll('[role="tab"]')].filter(tab=>tab.closest('[data-service-group]')===group);
    const select=tab=>{
      tab.closest('.collection-format-tabs')?.style.setProperty('--format-index',String(tabs.indexOf(tab)));
      for(const button of tabs) {
        const active=button===tab,panel=document.getElementById(button.getAttribute('aria-controls'));
        button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
        panel.hidden=!active;
        if(!active) {
          panel.querySelectorAll('video').forEach(video=>video.pause());
          // Release a launched experience when switching formats, so it cannot run unseen.
          panel.querySelectorAll('[data-embed-capsule]').forEach(capsule=>{
            capsule.dispatchEvent(new Event('embed-reset'));
            const frame=capsule.querySelector('iframe');frame.removeAttribute('src');frame.hidden=true;frame.tabIndex=-1;
            capsule.querySelector('.case-embed-cover').hidden=false;
          });
        }
      }
    };
    tabs.forEach((tab,index)=>{
      tab.addEventListener('click',()=>{
        if(tab.getAttribute('aria-selected')!=='true')select(tab);
        const screen=[...group.querySelectorAll('.collection-screen')].find(el=>el.closest('[data-service-group]')===group);
        if(screen) {
          // Let the active smooth-scroll controller own the animation.
          const request=new CustomEvent('nmesis:scroll-to',{cancelable:true,detail:{target:screen}});
          if(document.dispatchEvent(request))screen.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
        }
      });
      tab.addEventListener('keydown',event=>{
        let next;
        if(event.key==='ArrowRight')next=(index+1)%tabs.length;
        if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;
        if(event.key==='Home')next=0;
        if(event.key==='End')next=tabs.length-1;
        if(next!==undefined){event.preventDefault();select(tabs[next]);tabs[next].focus();}
      });
    });
  }
})();

// Media rails preserve click-to-open, while supporting mouse drag, touch and keys.
(() => {
  for(const group of document.querySelectorAll('[data-carousel]')) {
    const track=group.querySelector('[data-carousel-track]');
    if(!track)continue;
    const items=[...track.children],previous=group.querySelector('[data-carousel-prev]'),next=group.querySelector('[data-carousel-next]'),counter=group.querySelector('[data-carousel-count]');
    const step=()=>items.length>1?items[1].offsetLeft-items[0].offsetLeft:track.clientWidth;
    const update=()=>{
      if(previous)previous.disabled=track.scrollLeft<2;
      if(next)next.disabled=track.scrollLeft>=track.scrollWidth-track.clientWidth-2;
      if(counter)counter.textContent=`${String(Math.min(items.length,Math.round(track.scrollLeft/step())+1)).padStart(2,'0')} / ${items.length}`;
    };
    const move=direction=>track.scrollBy({left:direction*step(),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    previous?.addEventListener('click',()=>move(-1));next?.addEventListener('click',()=>move(1));
    track.addEventListener('scroll',update,{passive:true});new ResizeObserver(update).observe(track);update();
    // Keep horizontal wheel gestures native; vertical gestures continue to page scrolling.
    track.addEventListener('wheel',event=>{
      if(Math.abs(event.deltaX)>Math.abs(event.deltaY)||event.shiftKey)event.stopPropagation();
    },{passive:true});
    track.addEventListener('keydown',event=>{
      if(event.target!==track)return;
      if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}
    });
    let pointer=null,dragged=false,suppressUntil=0;
    track.addEventListener('dragstart',event=>event.preventDefault());
    track.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='mouse'||event.button!==0)return;
      pointer={id:event.pointerId,x:event.clientX,scroll:track.scrollLeft};dragged=false;
    });
    track.addEventListener('pointermove',event=>{
      if(!pointer||event.pointerId!==pointer.id)return;
      const delta=event.clientX-pointer.x;
      if(!dragged&&Math.abs(delta)>6){dragged=true;track.classList.add('is-dragging');track.setPointerCapture(event.pointerId);}
      if(dragged){event.preventDefault();track.scrollLeft=pointer.scroll-delta;}
    });
    const finish=()=>{
      if(dragged)suppressUntil=performance.now()+250;
      if(pointer&&track.hasPointerCapture(pointer.id))track.releasePointerCapture(pointer.id);
      pointer=null;track.classList.remove('is-dragging');
    };
    track.addEventListener('pointerup',finish);track.addEventListener('pointercancel',finish);
    track.addEventListener('lostpointercapture',()=>{pointer=null;track.classList.remove('is-dragging');});
    track.addEventListener('pointerleave',()=>{if(!dragged)pointer=null;});
    track.addEventListener('click',event=>{if(performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
  }
})();

// Brochure highlights stay local; the live website loads only in the reader.
(() => {
  const sections=[...document.querySelectorAll('[data-brochure-section]')];
  if(!sections.length)return;
  const dialog=document.createElement('dialog');
  dialog.className='brochure-dialog';dialog.setAttribute('aria-labelledby','brochure-reader-title');dialog.setAttribute('data-lenis-prevent','');
  dialog.innerHTML='<header class="brochure-dialog-bar"><h2 class="brochure-dialog-title" id="brochure-reader-title"></h2><div class="brochure-dialog-actions"><a data-brochure-external target="_blank" rel="noopener noreferrer">Open in a new tab ↗</a><button type="button" data-brochure-close autofocus aria-label="Close brochure">Close ×</button></div></header><div class="brochure-dialog-body"><div class="brochure-dialog-status" role="status"><p>Opening your brochure…</p><a data-brochure-fallback target="_blank" rel="noopener noreferrer">Open in a new tab ↗</a></div></div>';
  document.body.append(dialog);
  const title=dialog.querySelector('h2'),body=dialog.querySelector('.brochure-dialog-body'),status=dialog.querySelector('.brochure-dialog-status'),close=dialog.querySelector('[data-brochure-close]');
  let opener,frame,loadingTimer,overflow='';
  const visible=new Set(),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)'),highlights=[];
  const selectScene=(state,index)=>{
    state.index=index;clearTimeout(state.timer);state.timer=null;
    state.scenes.forEach((scene,i)=>{
      scene.classList.toggle('is-active',i===index);scene.setAttribute('aria-hidden',String(i!==index));
      const video=scene.querySelector('[data-brochure-scene-video]');
      if(video){video.pause();if(i===index&&video.readyState>0)video.currentTime=0;}
    });
    state.buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  };
  const updatePreviews=()=>{
    sections.forEach(section=>{
      const active=[...section.querySelectorAll('.brochure-preview')].some(preview=>visible.has(preview)&&!preview.closest('.brochure-panel').hidden);
      section.dataset.previewActive=String(active&&!document.hidden&&!dialog.open);
    });
    highlights.forEach(state=>{
      const hidden=state.panel.hidden;
      // Every newly selected model starts with its exterior, independent of other media tabs.
      if(state.hidden&&!hidden)selectScene(state,0);
      state.hidden=hidden;
      const playing=!hidden&&visible.has(state.preview)&&!document.hidden&&!dialog.open&&state.section.dataset.previewPaused!=='true'&&!reducedMotion.matches;
      state.window.dataset.playing=String(playing);
      state.scenes.forEach((scene,index)=>{
        const video=scene.querySelector('[data-brochure-scene-video]');if(!video)return;
        if(!playing||index!==state.index){video.pause();return;}
        // A scene's motion asset is requested only when its visible preview can play.
        if(!video.hasAttribute('src')){video.muted=true;video.src=video.dataset.src;}
        if(video.paused)video.play().catch(()=>{});
      });
      if(!playing){clearTimeout(state.timer);state.timer=null;}
      else if(!state.timer&&state.scenes.length>1)state.timer=setTimeout(()=>{selectScene(state,(state.index+1)%state.scenes.length);updatePreviews();},4500);
    });
  };
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)visible.add(entry.target);else visible.delete(entry.target);}updatePreviews();},{threshold:0});
  sections.forEach(section=>{
    section.querySelectorAll('.brochure-preview').forEach(preview=>observer.observe(preview));
    section.querySelectorAll('[data-brochure-highlights]').forEach(window=>{
      const panel=window.closest('.brochure-panel'),preview=window.closest('.brochure-preview');
      const state={window,panel,preview,section,index:0,timer:null,hidden:panel.hidden,scenes:[...window.querySelectorAll('[data-brochure-scene]')],buttons:[...preview.querySelectorAll('[data-brochure-scene-select]')]};
      highlights.push(state);
      state.buttons.forEach((button,index)=>button.addEventListener('click',()=>{selectScene(state,index);updatePreviews();}));
    });
    new MutationObserver(updatePreviews).observe(section,{subtree:true,attributes:true,attributeFilter:['hidden']});
    section.querySelectorAll('[data-brochure-preview-toggle]').forEach(button=>button.addEventListener('click',()=>{
      const paused=section.dataset.previewPaused!=='true';section.dataset.previewPaused=String(paused);
      section.querySelectorAll('[data-brochure-preview-toggle]').forEach(toggle=>{toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Resume brochure preview':'Pause brochure preview');});
      updatePreviews();
    }));
    section.querySelectorAll('[data-brochure-open]').forEach(button=>button.addEventListener('click',()=>{
      const url=new URL(button.dataset.brochureUrl);if(url.protocol!=='https:')return;
      opener=button;overflow=document.documentElement.style.overflow;
      title.textContent=button.dataset.brochureTitle;
      dialog.querySelectorAll('a').forEach(link=>link.href=url.href);
      status.hidden=false;status.querySelector('p').textContent='Opening your brochure…';
      document.querySelectorAll('video').forEach(video=>video.pause());
      document.documentElement.style.overflow='hidden';dialog.showModal();close.focus({preventScroll:true});updatePreviews();
      frame=document.createElement('iframe');frame.className='brochure-dialog-frame';frame.title=button.dataset.brochureTitle;frame.allow='autoplay; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
      const openedFrame=frame;
      frame.addEventListener('load',()=>{
        if(!dialog.open||frame!==openedFrame)return;
        // An initial blank document is not the brochure finishing its navigation.
        try { if(openedFrame.contentWindow.location.href==='about:blank')return; } catch { /* A loaded external document is cross-origin. */ }
        clearTimeout(loadingTimer);status.hidden=true;
      });
      loadingTimer=setTimeout(()=>{status.querySelector('p').textContent='Taking a little longer? Open the full brochure in a new tab.';},12000);
      frame.src=url.href;body.prepend(frame);
    }));
  });
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    clearTimeout(loadingTimer);frame?.remove();frame=null;status.hidden=false;
    document.documentElement.style.overflow=overflow;opener?.focus({preventScroll:true});updatePreviews();
  });
  document.addEventListener('visibilitychange',updatePreviews);
  reducedMotion.addEventListener('change',updatePreviews);
})();

// Legal pages: mark the section being read in the contents list.
(() => {
  const links=[...document.querySelectorAll('.legal-toc a,.legal-toc-mobile a')];
  if(!links.length)return;
  const sections=[...new Set(links.map(link=>document.getElementById(decodeURIComponent(link.hash.slice(1)))))].filter(Boolean);
  const visible=new Set();
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries)entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target);
    const current=sections.find(section=>visible.has(section));
    if(!current)return;
    for(const link of links)link.hash==='#'+current.id?link.setAttribute('aria-current','true'):link.removeAttribute('aria-current');
  },{rootMargin:'-15% 0px -65% 0px'});
  sections.forEach(section=>observer.observe(section));
  // The compact list closes after a choice so the section is immediately visible.
  document.querySelector('.legal-toc-mobile')?.addEventListener('click',event=>{if(event.target.closest('a'))event.currentTarget.open=false;});
})();
