import {serviceActionContent} from './service-actions.mjs';

// Privacy and terms share one editorial layout; their wording lives in content/pages/*.json.
export function legalPage(page, e, site) {
  const number = i => String(i + 1).padStart(2, '0');
  const item = entry => typeof entry === 'string' ? `<li>${e(entry)}</li>` : `<li><strong>${e(entry.term)}</strong> ${e(entry.text)}</li>`;
  const toc = page.sections.map((section, i) => `<li><a href="#${e(section.id)}"><span>${number(i)}</span>${e(section.title)}</a></li>`).join('');
  const summary = page.summary?.length ? `<section class="legal-summary" aria-labelledby="legal-summary-title"><h2 id="legal-summary-title" class="svc-kicker">${e(page.summaryTitle || 'At a glance')}</h2><ul>${page.summary.map(point => `<li><h3>${e(point.title)}</h3><p>${e(point.text)}</p></li>`).join('')}</ul></section>` : '';
  const sections = page.sections.map((section, i) => `<section class="legal-section" id="${e(section.id)}" aria-labelledby="${e(section.id)}-title"><span class="legal-number" aria-hidden="true">${number(i)}</span><div><h2 id="${e(section.id)}-title">${e(section.title)}</h2>${(section.paragraphs || []).map(p => `<p>${e(p)}</p>`).join('')}${section.items?.length ? `<ul>${section.items.map(item).join('')}</ul>` : ''}${(section.after || []).map(p => `<p>${e(p)}</p>`).join('')}</div></section>`).join('');
  const related = page.related ? `<a class="sd-text-link svc-motion-link" href="${e(page.related.href)}">${serviceActionContent(page.related.label, e)}</a>` : '';
  return `<div class="svc-page sd-page legal-page">
    <section class="svc-hero sd-hero legal-hero" aria-labelledby="legal-title">
      <div class="svc-wrap">
        <nav class="sd-breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">${e(page.breadcrumb)}</span></nav>
        <h1 id="legal-title">${e(page.title)}</h1>
        <div class="svc-hero-intro"><h2>${e(page.headline)}</h2><p>${e(page.intro)}</p></div>
        <dl class="legal-meta"><div><dt>Last updated</dt><dd>${e(page.updated)}</dd></div><div><dt>Applies to</dt><dd>${e(page.appliesTo)}</dd></div><div><dt>Questions</dt><dd><a href="mailto:${e(site.email)}">${e(site.email)}</a></dd></div></dl>
      </div>
    </section>
    <div class="svc-wrap legal-layout">
      <aside class="legal-toc"><nav aria-labelledby="legal-toc-title"><p class="svc-kicker" id="legal-toc-title">On this page</p><ol>${toc}</ol></nav></aside>
      <div class="legal-body">
        <details class="legal-toc-mobile"><summary>On this page <span>${page.sections.length} sections</span></summary><ol>${toc}</ol></details>
        ${summary}
        ${sections}
        <section class="sd-contact legal-contact" aria-labelledby="legal-contact-title"><p class="svc-kicker">${e(page.contact.eyebrow)}</p><h2 id="legal-contact-title">${e(page.contact.title)}</h2><p>${e(page.contact.text)}</p><div><a class="sd-button sd-button--green svc-motion" href="mailto:${e(site.email)}?subject=${encodeURIComponent(page.contact.subject)}">${serviceActionContent(page.contact.action, e)}</a>${related}</div></section>
      </div>
    </div>
  </div>`;
}
