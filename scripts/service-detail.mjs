import {playIcon,filmPoster} from './media-icons.mjs';
import {projectMedia} from './project-media.mjs';
import {serviceLabel, serviceArrow, serviceActionContent} from './service-actions.mjs';

// The first detail page establishes the reusable structure for future services.
export function serviceDetail(page, e) {
  const index=page.formats.map((format,i)=>`<a href="#${e(format.id)}"><span class="sd-number">${String(i+1).padStart(2,'0')}</span><h2>${serviceLabel(format.label,e)}</h2><p>${e(format.short)}</p><span class="sd-index-arrow">${serviceArrow('↘')}</span></a>`).join('');
  const formats=page.formats.map((format,i)=>{
    const films=(format.films || []).map(film=>`<figure class="sd-film-item"><div class="case-film svc-film"><video data-case-film controls playsinline preload="none" src="${e(film.src)}" poster="${e(film.poster)}" aria-label="${e(film.title)}"></video><button class="case-film-start" type="button" aria-label="Play ${e(film.title)}">${filmPoster(film.poster,e)}<span class="case-play-icon" aria-hidden="true">${playIcon()}</span><span class="svc-film-label">${serviceLabel('Watch film',e)}</span></button></div><figcaption><h3>${e(film.title)}</h3><p>${e(film.description)}</p></figcaption></figure>`).join('');
    const gallery=format.images?.length ? projectMedia({slug:'automotive-cgi',galleries:[{title:'Selected campaign imagery.',description:'Open an image for a closer look.',images:format.images}]},e).media.replace('id="project-gallery"',`id="${e(format.id)}-gallery"`) : '';
    return `<section class="sd-format" id="${e(format.id)}" aria-labelledby="${e(format.id)}-heading"><header class="svc-chapter-heading"><div><p class="svc-kicker"><span class="sd-number">${String(i+1).padStart(2,'0')}</span>${e(format.label)}</p><h2 id="${e(format.id)}-heading">${e(format.headline)}</h2></div><p class="svc-description">${e(format.description)}</p></header><div class="sd-format-guidance"><div><span class="sd-label">When to choose it</span><p>${e(format.fit)}</p></div><div><span class="sd-label">What we can deliver</span><ul>${format.deliverables.map(item=>`<li>${e(item)}</li>`).join('')}</ul></div></div>${films?`<div class="sd-films ${format.films.length===1?'sd-films--single':''}">${films}</div>`:''}${gallery}<div class="sd-format-foot"><span>See the work in context.</span><a class="svc-project-link svc-motion-link" href="${e(format.project)}">${serviceActionContent(format.projectLabel,e)}</a></div></section>`;
  }).join('');
  const steps=page.steps.map((step,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span><h3>${e(step.title)}</h3><p>${e(step.text)}</p></li>`).join('');
  const inputs=page.inputs.map(item=>`<div><h3>${e(item.title)}</h3><p>${e(item.text)}</p></div>`).join('');
  const faqs=page.faqs.map((item,i)=>`<div class="sd-faq-row" data-accordion><button class="sd-faq-trigger" type="button" data-accordion-trigger aria-expanded="false"><span class="sd-faq-number">${String(i+1).padStart(2,'0')}</span><span>${e(item.q)}</span><span class="sd-faq-icon" aria-hidden="true"></span></button><div data-accordion-answer hidden><div class="sd-faq-answer"><p>${e(item.a)}</p></div></div></div>`).join('');
  return {index,formats,steps,inputs,faqs};
}
