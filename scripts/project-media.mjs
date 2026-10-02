import {projectCollection} from './project-collection.mjs';
// Optional, content-driven media blocks shared by all project pages.
export function projectMedia(project, escape) {
  const e = escape;
  if(project.mediaLayout === 'collection')return projectCollection(project,e,projectMedia);
  const heading = (label, title, description='') => `<header class="case-section-heading"><div><span class="case-eyebrow">${e(label)}</span><h2>${e(title)}</h2></div>${description ? `<p>${e(description)}</p>` : ''}</header>`;
  const films = (project.films || []).map((film, i) => `<section class="case-section" id="film-${i+1}">${heading('In motion',film.title,film.description)}<div class="case-film"><video data-case-film controls playsinline preload="metadata" aria-label="${e(film.title)}"${film.poster ? ` poster="${e(film.poster)}"` : ''} src="${e(film.src)}"></video><button class="case-film-start" type="button" aria-label="Play ${e(film.title)}"><span class="case-play-icon" aria-hidden="true">▶</span><span>Play film</span></button></div></section>`).join('');
  const experiences = (project.experiences || []).map((item,i) => {
    const url = new URL(item.url);
    if (url.protocol !== 'https:') throw new Error(`${project.slug}: interactive embeds must use HTTPS`);
    const width = Number(item.width) || 1920, height = Number(item.height) || 1080;
    if(width <= 0 || height <= 0)throw new Error('Embed dimensions must be positive');
    return `<section class="case-section" id="experience-${i+1}">${heading(item.type || 'Interactive experience',item.title,item.description)}<div class="case-capsule" data-embed-capsule data-embed-width="${width}" data-embed-height="${height}" style="--embed-ratio:${width}/${height}"><div class="case-capsule-toolbar"><span><i aria-hidden="true"></i> ${e(item.type || 'Interactive experience')}</span><div><button type="button" data-embed-fullscreen>Fullscreen ↗</button><a href="${e(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${e(item.title)} in a new tab">Open separately ↗</a></div></div><div class="case-embed-stage"><iframe data-embed-src="${e(item.url)}" title="${e(item.title)}" width="${width}" height="${height}" allow="fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" tabindex="-1" hidden></iframe><div class="case-embed-cover"><span class="case-eyebrow">Explore it yourself</span><h3>${e(item.title)}</h3><p>Discover the vehicle, inside and out.</p><button class="case-action" type="button" data-embed-launch>Launch experience <span aria-hidden="true">↗</span></button></div></div><p class="case-embed-note">Drag to explore. For a closer look, use fullscreen or open separately.</p></div></section>`;
  }).join('');
  const groups=(project.galleries || [{title:project.galleryTitle,description:project.galleryDescription,images:project.gallery || []}]).filter(group=>group.images?.length);
  const gallery=groups.map((group,groupIndex)=>{
  const images=group.images;
  const hasVideo=images.some(item=>item.type==='video');
  return images.length ? `<section class="case-section${group.layout==='mixed'?' case-mixed-gallery':''}" id="${groupIndex ? `project-gallery-${groupIndex+1}` : 'project-gallery'}" data-case-gallery>${heading(group.label || 'Selected visuals',group.title || 'A closer look.',group.description || 'Explore the details behind the experience.')}<div class="case-gallery">${images.map((item,i)=>{
    const isVideo=item.type==='video';
    return `<figure><a href="${e(item.src)}" data-gallery-image${isVideo?' data-gallery-type="video"':''} data-caption="${e(item.caption || item.alt)}" aria-label="${isVideo?'Play video':'View fullscreen image'} ${i+1}: ${e(item.alt)}"><img src="${e(isVideo?item.poster:(item.thumbnail || item.src))}" alt="${e(item.alt)}" width="${Number(item.width)||1600}" height="${Number(item.height)||1200}" loading="lazy">${hasVideo?`<span class="case-media-type">${isVideo?'Breakdown film':'Key visual'}</span>`:''}<span class="case-gallery-expand" aria-hidden="true">${isVideo?'▶':galleryExpandIcon()}</span></a><figcaption><span>${String(i+1).padStart(2,'0')}</span>${e(item.caption || item.alt)}</figcaption></figure>`;
  }).join('')}</div>${projectGalleryDialog(hasVideo)}</section>` : '';
  }).join('');
  const jumps=[...(project.films?.length ? [['film-1',project.films.length>1 ? `Watch films (${project.films.length})` : 'Watch film']] : []),...(project.experiences?.length ? [['experience-1',project.experiences.length>1 ? `Explore interactive (${project.experiences.length})` : 'Explore interactive']] : []),...(groups.length ? [['project-gallery',groups.length>1 ? `View galleries (${groups.length})` : 'View gallery']] : [])];
  return {media: films+experiences+gallery, navigation:`<nav class="case-jumps" aria-label="Project sections">${jumps.map(([id,label])=>`<a href="#${id}">${label} <span aria-hidden="true">↘</span></a>`).join('')}</nav>`};
}

// The same accessible viewer is used by service samples and project galleries.
export function projectGalleryDialog(hasVideo=false) {
  return `<dialog class="case-lightbox" aria-label="${hasVideo?'Project media gallery':'Project image gallery'}" data-lenis-prevent><div class="case-lightbox-bar"><span data-gallery-count aria-live="polite"></span><button type="button" data-gallery-close aria-label="Close gallery">Close ×</button></div><img data-gallery-full alt="">${hasVideo?'<video data-gallery-video controls playsinline preload="none" hidden></video>':''}<div class="case-lightbox-bar"><button type="button" data-gallery-prev aria-label="Previous ${hasVideo?'item':'image'}">←</button><p data-gallery-caption aria-live="polite"></p><button type="button" data-gallery-next aria-label="Next ${hasVideo?'item':'image'}">→</button></div></dialog>`;
}

// Four corners distinguish image viewing from navigation to another page.
export function galleryExpandIcon() {
  return '<svg class="gallery-expand-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/></svg>';
}
