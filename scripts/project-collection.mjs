import {playIcon,mediaArrow,filmPoster} from './media-icons.mjs';
import {projectExperiences} from './project-experiences.mjs';
import {projectBrochures} from './project-brochures.mjs';
// An opt-in collection layout; legacy project pages and the local builder stay compatible.
export function projectCollection(project, e, renderMedia) {
  const brand=project.brand || project.title.replace(/\.$/,'');
  const label=project.title.replace(/\.$/,'');
  const header=(number,title,description)=>`<header class="case-section-heading"><div><span class="case-eyebrow">${number} / ${e(label)}</span><h2>${e(title)}</h2></div><p>${e(description)}</p></header>`;
  const player=(film)=>`<div class="case-film collection-player"><video data-case-film controls playsinline preload="none" aria-label="${e(film.title)}" poster="${e(film.poster)}" src="${e(film.src)}"></video><button class="case-film-start" type="button" aria-label="Play ${e(film.title)}">${filmPoster(film.poster,e)}<span class="case-play-icon" aria-hidden="true">${playIcon()}</span><span>Play film</span></button></div>`;
  const films=project.films || [],infographics=project.infographics || [],walkthroughs=project.walkthroughs || [];
  const videoSection=(items,{id,prefix,number,title,description,format})=>{
    if(!items.length)return '';
    const caption=film=>`<div class="collection-film-caption"><h3>${e(film.title)}</h3><span>${e(film.format || format)}</span></div>`;
    if(items.length===1)return `<section class="case-section" id="${id}">${header(number,title,description)}<div class="collection-screen">${player(items[0])}${caption(items[0])}</div></section>`;
    return `<section class="case-section collection-films" id="${id}" data-service-group data-carousel>${header(number,title,description)}<div class="collection-screen">${items.map((film,i)=>`<div role="tabpanel" id="${prefix}-panel-${i}" aria-labelledby="${prefix}-tab-${i}" ${i?'hidden':''}>${player(film)}${caption(film)}</div>`).join('')}</div><div class="collection-film-picker" style="--film-columns:${Math.max(3,Math.min(5,items.length))}" data-carousel-track role="tablist" aria-label="${e(title.replace(/\.$/,''))}">${items.map((film,i)=>`<button type="button" role="tab" id="${prefix}-tab-${i}" aria-label="${e(film.title)}" aria-controls="${prefix}-panel-${i}" aria-selected="${i===0}" tabindex="${i?-1:0}"><span class="collection-thumb"><img src="${e(film.poster)}" alt="" loading="lazy"><span aria-hidden="true">↗</span></span><span class="collection-thumb-title"><small>${String(i+1).padStart(2,'0')}</small>${e(film.title)}</span></button>`).join('')}</div></section>`;
  };
  const cinematic=videoSection(films,{id:'film-1',prefix:'cinematic',number:'01',title:project.cinematicTitle || 'Cinematic films.',description:project.cinematicDescription || `From the first reveal to the finest detail. Explore our ${brand} launch films and campaign edits.`,format:'Launch film'});
  const infographic=videoSection(infographics,{id:'infographics',prefix:'infographic',number:'02',title:'Infographic animations.',description:project.infographicDescription || 'Make complex technology clear. Visual storytelling that helps customers understand how the vehicle works.',format:'Technology explained'});
  const galleries=(project.galleries || []).filter(group=>group.images?.length);
  let galleryIndex=0;
  const gallery=renderMedia({slug:project.slug,galleries},e).media
    .replaceAll('class="case-section"',`class="case-section collection-visuals${project.galleryShape==='landscape'?' collection-visuals-landscape':''}" data-carousel`)
    .replaceAll('<div class="case-gallery">',()=>{const group=galleries[galleryIndex++];const name=group.navigationLabel || 'Key visuals';return `<div class="collection-rail-toolbar"><p>Drag to explore · Select a visual to enlarge</p><div><span data-carousel-count aria-live="polite">01 / ${group.images.length}</span><button type="button" data-carousel-prev aria-label="Previous ${e(name.toLowerCase())}">${mediaArrow('previous')}</button><button type="button" data-carousel-next aria-label="Next ${e(name.toLowerCase())}">${mediaArrow('next')}</button></div></div><div class="case-gallery" data-carousel-track tabindex="0" role="region" aria-label="${e(name)} carousel">`;});
  const experiences=project.experiences || [];
  const walkthrough=videoSection(walkthroughs,{id:'configurator-walkthrough',prefix:'walkthrough',number:String((films.length?1:0)+(infographics.length?1:0)+galleries.length+1).padStart(2,'0'),title:project.walkthroughTitle || 'Explore the configurator.',description:project.walkthroughDescription || 'Watch a recorded tour of the configurator experience.',format:'Configurator walkthrough'});
  const brochures=project.brochures || [];
  const brochureSection=projectBrochures(project,e,header,String((films.length?1:0)+(infographics.length?1:0)+galleries.length+(walkthroughs.length?1:0)+1).padStart(2,'0'));
  const interactive=projectExperiences(project,e,header,String((films.length?1:0)+(infographics.length?1:0)+galleries.length+(walkthroughs.length?1:0)+(brochures.length?1:0)+1).padStart(2,'0'));
  const experienceCount=experiences.length+(project.experienceGroups || []).reduce((n,group)=>n+group.experiences.length,0);
  const links=[
    ...(films.length?[['film-1',`${project.cinematicNavigationLabel || 'Cinematic films'} (${films.length})`]]:[]),
    ...(infographics.length?[['infographics',`Infographic animations${infographics.length>1?` (${infographics.length})`:''}`]]:[]),
    ...galleries.map((group,i)=>[i?`project-gallery-${i+1}`:'project-gallery',`${group.navigationLabel || 'Key visuals'} (${group.images.length})`]),
    ...(walkthroughs.length?[['configurator-walkthrough','Configurator walkthrough']]:[]),
    ...(brochures.length?[['interactive-brochures',`Interactive brochures (${brochures.length})`]]:[]),
    ...(experienceCount?[['experience-1',`Configurators (${experienceCount})`]]:[])
  ];
  return {media:cinematic+infographic+gallery+walkthrough+brochureSection+interactive,navigation:`<nav class="case-jumps" aria-label="Project sections">${links.map(([id,label])=>`<a href="#${id}">${e(label)} <span aria-hidden="true">↘</span></a>`).join('')}</nav>`};
}
