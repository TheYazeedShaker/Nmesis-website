import {projectBrochures} from './project-brochures.mjs';
import {experienceCapsule} from './project-experiences.mjs';
import {projectGalleryDialog,galleryExpandIcon} from './project-media.mjs';
import {serviceLabel,serviceArrow,serviceActionContent} from './service-actions.mjs';

// Editable service families and formats live in content/pages/services.json.
// Brochure samples reuse project content so the two pages stay in sync.
export function serviceShowcase(page, e, projects = {}) {
  const arrow=serviceArrow();
  const roll=text=>serviceLabel(text,e);
  const media=item=>{
    if(item.type==='experience') {
      const project=projects[item.project];
      const items=item.group ? project?.experienceGroups?.find(group=>group.id===item.group)?.experiences : project?.experiences;
      const experience=items?.find(experience=>experience.model===item.model);
      if(!experience)throw new Error(`Missing service configurator: ${item.project}/${item.model}`);
      return `<div class="svc-media svc-interactive-sample">${experienceCapsule(experience,e,text=>serviceActionContent(text,e))}</div>`;
    }
    let content='';
    if(item.type==='video') content=`<div class="case-film svc-film"><video data-case-film controls playsinline preload="none" poster="${e(item.poster)}" src="${e(item.src)}" aria-label="${e(item.caption)}"></video><button class="case-film-start" type="button" aria-label="Play ${e(item.caption)}"><span class="case-play-icon" aria-hidden="true">▶</span><span class="svc-film-label">${roll('Watch sample')}</span></button></div>`;
    else content=`<a class="svc-image" href="${e(item.src)}" data-gallery-image data-caption="${e(item.caption || item.alt)}" aria-label="View fullscreen image: ${e(item.alt)}"><img src="${e(item.src)}" alt="${e(item.alt)}" loading="lazy" width="1600" height="1000"><span class="svc-enlarge svc-motion">${roll('View fullscreen')}${galleryExpandIcon()}</span></a>`;
    const live=item.liveUrl ? `<a class="svc-live-link svc-motion" href="${e(item.liveUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${e(item.liveLabel || 'Try the live experience')}">${roll(item.liveLabel || 'Try the live experience')}${arrow}</a>` : '';
    return `<figure class="svc-media" ${item.type==='image'?'data-case-gallery':''}>${content}<figcaption><span class="svc-sample-dot" aria-hidden="true"></span>${e(item.caption)}</figcaption>${live}${item.type==='image'?projectGalleryDialog():''}</figure>`;
  };
  const heading=(g,i)=>`<header class="svc-chapter-heading"><div><p class="svc-kicker"><span>${String(i+1).padStart(2,'0')}</span>${e(g.label)}</p><h2 id="${e(g.id)}-heading">${e(g.title)}</h2></div><p class="svc-description">${e(g.description)}</p></header>`;
  const foot=g=>`<div class="svc-chapter-foot">${g.detailUrl ? `<a class="svc-detail-link svc-motion" href="${e(g.detailUrl)}" aria-label="Explore this service">${roll('Explore this service')}${arrow}</a>` : g.variants?.length>1 ? '<span>Find the right format for your audience.</span>' : `<a class="svc-project-link svc-motion-link" href="${e(g.project)}">${serviceActionContent(g.projectLabel,e)}</a>`}<a class="svc-motion-link" href="/contact">${serviceActionContent('Let’s talk about '+g.label.toLowerCase(),e)}</a></div>`;
  const navigation=page.groups.map((g,i)=>`<a href="#${e(g.id)}"><span>${String(i+1).padStart(2,'0')}</span>${serviceActionContent(g.label,e,'↘')}</a>`).join('');
  const sections=page.groups.map((g,i)=>{
    if(g.brochureProject) {
      const project=projects[g.brochureProject];
      if(!project?.brochures?.length)throw new Error(`Missing service brochure samples: ${g.brochureProject}`);
      return `<div class="svc-brochure-chapter">${projectBrochures(project,e,()=>heading(g,i),i+1)}${foot(g)}</div>`;
    }
    const multiple=g.variants.length>1;
    const tabs=multiple?`<div class="svc-tabs" role="tablist" aria-label="${e(g.label)} formats">${g.variants.map((v,n)=>`<button id="${e(g.id)}-tab-${n}" type="button" role="tab" aria-label="${e(v.label)}" aria-selected="${n===0}" aria-controls="${e(g.id)}-panel-${n}" tabindex="${n===0?'0':'-1'}">${roll(v.label)}</button>`).join('')}</div>`:'';
    const panels=g.variants.map((v,n)=>`<div id="${e(g.id)}-panel-${n}" class="svc-panel${v.media.type==='experience'?' svc-panel--experience':''}" ${multiple?`role="tabpanel" aria-labelledby="${e(g.id)}-tab-${n}" tabindex="0"`:''} ${n?'hidden':''}><div class="svc-panel-copy"><h3>${e(v.title)}</h3><p>${e(v.description)}</p><ul>${v.points.map(p=>`<li>${e(p)}</li>`).join('')}</ul>${multiple?`<a class="svc-project-link svc-motion-link" href="${e(v.project || g.project)}">${serviceActionContent(v.projectLabel || g.projectLabel,e)}</a>`:''}</div>${media(v.media)}</div>`).join('');
    return `<section class="svc-chapter" id="${e(g.id)}" aria-labelledby="${e(g.id)}-heading" data-service-group>${heading(g,i)}${tabs}${panels}${foot(g)}</section>`;
  }).join('');
  const process=page.steps.map((s,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span><h3>${e(s.title)}</h3><p>${e(s.text)}</p></li>`).join('');
  return {navigation,sections,process};
}
