import {serviceActionContent, serviceLabel} from './service-actions.mjs';

// About is a narrative page. Its content stays separate from the service catalogue.
export function aboutPage(page, e) {
  const lines = value => e(value).replace(/\n/g, '<br>');
  const eyebrow = text => `<p class="ast-eyebrow">${e(text)}</p>`;
  const heading = (part, id) => `${eyebrow(part.eyebrow)}<h2${id ? ` id="${id}"` : ''}>${lines(part.title)}</h2>`;
  const action = (item, secondary = false) => `<a class="ast-action svc-motion${secondary ? ' ast-action--outline' : ''}" href="${e(item.href)}">${serviceActionContent(item.label, e)}</a>`;
  const image = (src, alt, cls = '', eager = false) => `<img class="${cls}" src="${e(src)}" alt="${e(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
  const media = part => part.video ? `<video data-about-process-film controls playsinline preload="none" poster="${e(part.image)}" aria-label="${e(part.alt)}"><source src="${e(part.video)}" type="video/mp4"></video>` : part.detailImage ? `<div class="ast-brochure-screens"><div class="ast-brochure-cabin">${image(part.image,part.alt)}</div><div class="ast-brochure-features">${image(part.detailImage,part.detailAlt)}</div></div>` : image(part.image,part.alt);
  const heroLines = (page.hero.titleLines || [page.hero.title]);
  const heroTitle = heroLines.map((line,i)=>i===heroLines.length-1?`<span>${e(line)}</span>`:e(line)).join('<br>');
  const person = member => `<article class="ast-founder ast-reveal"><div class="ast-founder-portrait" style="--portrait-position:${e(member.portraitPosition || 'center')};--portrait-scale:${e(member.portraitScale || '1')}">${image(member.portrait,member.portraitAlt)}</div><div class="ast-founder-info"><h3>${e(member.name)}</h3><p class="ast-founder-role">${e(member.role)}</p><p class="ast-founder-bio">${e(member.bio)}</p></div></article>`;
  const logoSlug = name => name.toLowerCase().replace(/\s+/g, '-');
  return `<div class="ast-page svc-page about-company">
    <section class="ast-hero showreel-hero" data-about-reel aria-labelledby="about-title">
      <div class="showreel-frame"><video muted loop playsinline preload="metadata" poster="/assets/projects/avatr/key-visuals/visual-02.webp" aria-label="NMESIS automotive showreel"><source src="/assets/video/nmesis-showreel.mp4" type="video/mp4"></video><div class="ast-hero-shade"></div></div>
      <div class="ast-hero-content ast-wrap">${eyebrow(page.hero.eyebrow)}<h1 id="about-title">${heroTitle}</h1><p class="ast-hero-description">${e(page.hero.description)}</p></div>
      <div class="ast-hero-bottom ast-wrap"><a class="ast-story-link" href="#our-story">${serviceActionContent(page.hero.scrollLabel, e, '↘')}</a><div class="ast-reel-controls"><button type="button" data-about-pause aria-label="Pause film" aria-pressed="false"><span aria-hidden="true" data-about-pause-icon>Ⅱ</span><span data-about-pause-label>Pause film</span></button><button type="button" data-about-sound aria-label="Turn sound on" aria-pressed="false"><span class="ast-sound-dot" aria-hidden="true"></span><span data-about-sound-label>Sound off</span></button></div></div>
    </section>

    <section class="ast-section ast-wrap" id="our-story" aria-labelledby="origin-title"><div class="ast-editorial"><div class="ast-reveal">${heading(page.origin, 'origin-title')}</div><div class="ast-body ast-reveal">${page.origin.paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}<a class="ast-text-link svc-motion-link" href="#team-section">${serviceActionContent('Meet the people behind NMESIS', e, '↘')}</a></div></div><figure class="ast-origin-visual ast-reveal">${image(page.origin.image,page.origin.alt)}<figcaption>${e(page.origin.caption)}</figcaption></figure></section>

    <section class="ast-evolution ast-section" id="our-craft" aria-labelledby="evolution-title"><div class="ast-wrap"><div class="ast-editorial ast-reveal"><div>${heading(page.evolution, 'evolution-title')}</div><p class="ast-body">${e(page.evolution.description)}</p></div><div class="ast-evolution-story" data-service-group><div class="ast-evolution-tabs" style="--stage-count:${page.evolution.stages.length}" role="tablist" aria-label="Explore our craft">${page.evolution.stages.map((s,i)=>`<button id="evolution-tab-${i}" type="button" role="tab" aria-selected="${i===0}" aria-controls="evolution-panel-${i}" tabindex="${i===0?0:-1}"><span class="ast-stage-number">${e(s.number)}</span>${serviceLabel(s.title,e)}</button>`).join('')}</div><div class="ast-evolution-panels">${page.evolution.stages.map((s,i)=>`<div id="evolution-panel-${i}" class="ast-evolution-panel" role="tabpanel" aria-labelledby="evolution-tab-${i}" tabindex="0"${i===0?'':' hidden'}><div class="ast-stage-copy"><span class="ast-stage-count">${e(s.number)} / ${String(page.evolution.stages.length).padStart(2,'0')}</span><h3>${e(s.title)}</h3><p>${e(s.description)}</p><a class="ast-text-link svc-motion-link" href="${e(s.action.href)}">${serviceActionContent(s.action.label,e)}</a></div><figure class="ast-stage-media">${media(s)}<figcaption>${e(s.caption)}</figcaption></figure></div>`).join('')}</div></div></div></section>

    <section class="ast-principles ast-section"><div class="ast-wrap ast-editorial"><div class="ast-reveal">${heading(page.principles, 'principles-title')}</div><div class="ast-principle-list">${page.principles.items.map((p,i)=>`<article class="ast-principle ast-reveal"><span class="ast-index">0${i+1}</span><div><h3>${e(p.title)}</h3><p>${e(p.description)}</p></div></article>`).join('')}</div></div></section>

    <section class="ast-stats ast-wrap" aria-label="${e(page.stats.eyebrow)}">${page.stats.items.map(s=>`<div class="ast-stat ast-reveal"><p class="ast-stat-value">${e(s.value)}${s.unit?` <span>${e(s.unit)}</span>`:''}</p><p>${e(s.description)}</p></div>`).join('')}</section>

    <section class="ast-clients ast-section ast-wrap" aria-labelledby="clients-title"><div class="ast-editorial ast-reveal"><div>${heading(page.clients,'clients-title')}</div><p class="ast-body">${e(page.clients.description)}</p></div><div class="ast-logos">${page.clients.names.map(name=>`<div class="ast-logo ast-reveal"><span class="client-logo client-logo--${logoSlug(name)}" role="img" aria-label="${e(name)}"></span></div>`).join('')}</div></section>

    <section class="ast-people ast-section ast-wrap" id="team-section" aria-labelledby="people-title"><div class="ast-editorial ast-reveal"><div>${heading(page.people,'people-title')}</div><p class="ast-body">${e(page.people.description)}</p></div><div class="ast-founder-grid">${page.people.members.map(person).join('')}</div></section>

    <section class="ast-working ast-section"><div class="ast-wrap"><div class="ast-editorial ast-reveal"><div>${heading(page.working,'working-title')}</div><div class="ast-body"><p>${e(page.working.description)}</p><p>${e(page.working.closing)}</p></div></div><figure class="ast-working-visual ast-reveal">${media(page.working)}</figure></div></section>

    <section class="ast-mission ast-section ast-wrap" id="our-mission" aria-labelledby="mission-title"><div class="ast-editorial"><div class="ast-reveal">${heading(page.mission,'mission-title')}</div><div class="ast-body ast-reveal">${page.mission.paragraphs.map(p=>`<p>${e(p)}</p>`).join('')}<a class="ast-text-link svc-motion-link" href="${e(page.mission.action.href)}">${serviceActionContent(page.mission.action.label,e)}</a></div></div><figure class="ast-mission-visual ast-reveal">${media(page.mission)}<figcaption>${e(page.mission.caption)}</figcaption></figure></section>

    <section class="ast-locations ast-wrap" aria-label="${e(page.locations.eyebrow)}">${eyebrow(page.locations.eyebrow)}<div>${page.locations.items.map((l,i)=>`<p class="ast-reveal"><span>${e(l.city)}</span><span class="ast-country">${e(l.country)}</span></p>`).join('')}</div></section>

    <section class="ast-final" aria-labelledby="final-title">${image(page.cta.image,'', 'ast-final-image')}<div class="ast-final-shade"></div><div class="ast-final-content ast-wrap ast-reveal">${heading(page.cta,'final-title')}<p>${e(page.cta.description)}</p><div class="ast-final-actions">${action(page.cta.primaryAction)}${action(page.cta.secondaryAction,true)}</div></div></section>
    <script src="/scripts/about.js" defer></script>
  </div>`;
}
