// Fixed geometry avoids platform-dependent font/emoji fallbacks on phones.
export function playIcon() {
  return '<svg class="media-play-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
}
export function mediaArrow(direction) {
  return `<svg class="media-nav-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"${direction==='previous'?' transform="rotate(180 12 12)"':''}/></svg>`;
}
export function filmPoster(src, escape) {
  return src ? `<img class="case-film-poster" src="${escape(src)}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : '';
}
