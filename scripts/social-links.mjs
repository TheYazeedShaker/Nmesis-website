const icons = {
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>',
  linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>'
};
export function socialLinks(links, escape) {
  return `<div class="nmesis-social-links" aria-label="Follow NMESIS">${links.map(link=>`<a href="${escape(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="NMESIS on ${escape(link.label)}" title="${escape(link.label)}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[link.icon]}</svg></a>`).join('')}</div>`;
}
