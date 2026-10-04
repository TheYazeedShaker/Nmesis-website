// Search and AI discoverability: social previews, structured data, sitemap entries,
// robots.txt and llms.txt, all generated from the same content as the pages.
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {imageFileSize} from './image-size.mjs';

const clean = text => String(text || '').replace(/\.$/, '');
const list = items => items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items.join('');

// Open Graph and Twitter card tags for one page.
export async function socialMeta({site, root, url, title, description, image, imageAlt, escape: e}) {
  const size = await imageFileSize(path.join(root, 'public', image));
  if (!size) throw new Error(`Share image is missing or unreadable: ${image}`);
  const absolute = new URL(image, site.baseUrl).href;
  const properties = [
    ['og:type', 'website'], ['og:site_name', site.seo.siteName], ['og:locale', 'en_US'], ['og:url', url],
    ['og:title', title], ['og:description', description],
    ['og:image', absolute], ['og:image:width', size.width], ['og:image:height', size.height], ['og:image:alt', imageAlt],
  ];
  const names = [['twitter:card', 'summary_large_image'], ['twitter:title', title], ['twitter:description', description], ['twitter:image', absolute], ['twitter:image:alt', imageAlt]];
  return [...properties.map(([p, c]) => `<meta property="${p}" content="${e(c)}">`), ...names.map(([n, c]) => `<meta name="${n}" content="${e(c)}">`)].join('\n  ');
}

// Organization and website facts shared by every page's structured data.
function organization(site, about) {
  const base = site.baseUrl, absolute = p => new URL(p, base).href;
  return [{
    '@type': 'Organization',
    '@id': base + '#organization',
    name: site.brandName,
    alternateName: site.seo.alternateNames,
    url: base,
    logo: {'@type': 'ImageObject', url: absolute('/icon-512.png'), width: 512, height: 512},
    image: absolute(site.seo.shareImage),
    description: site.description,
    email: site.email,
    sameAs: site.social.map(link => link.url),
    founder: (about?.people?.members || []).map(member => ({'@type': 'Person', name: member.name, jobTitle: member.role, image: absolute(member.portrait)})),
    location: site.seo.locations.map(place => ({'@type': 'Place', name: `${place.city}, ${place.countryName}`, address: {'@type': 'PostalAddress', addressLocality: place.city, addressCountry: place.country}})),
    areaServed: site.seo.areaServed.map(name => ({'@type': 'Country', name})),
    knowsAbout: site.seo.knowsAbout,
    contactPoint: {'@type': 'ContactPoint', contactType: 'sales', email: site.email, url: absolute('/contact'), areaServed: site.seo.areaServed},
  }, {
    '@type': 'WebSite', '@id': base + '#website', url: base, name: site.seo.siteName, alternateName: site.brandName,
    description: site.description, publisher: {'@id': base + '#organization'}, inLanguage: 'en',
  }];
}

// The JSON-LD graph for a page: organization, website, the page, its breadcrumb and its subject.
export function structuredData({site, about, route, title, description, image, template, page, project, projects}) {
  const base = site.baseUrl, absolute = p => new URL(p, base).href, url = absolute(route);
  const org = {'@id': base + '#organization'};
  const graph = organization(site, about);
  const pageType = {about: 'AboutPage', contact: 'ContactPage', projects: 'CollectionPage', services: 'CollectionPage'}[template] || 'WebPage';
  const webpage = {'@type': pageType, '@id': url + '#webpage', url, name: title, description, isPartOf: {'@id': base + '#website'}, primaryImageOfPage: {'@type': 'ImageObject', url: absolute(image)}, inLanguage: 'en'};
  if (route === '/' || template === 'about') webpage.about = org;
  graph.push(webpage);
  // Breadcrumbs for every page below the home page.
  if (route !== '/') {
    const trail = [['Home', base]];
    if (project) trail.push(['Projects', absolute('/projects')]);
    if (template === 'service-detail') trail.push(['Services', absolute('/services')]);
    trail.push([clean(project?.title || page.serviceName || page.breadcrumb || title), url]);
    webpage.breadcrumb = {'@id': url + '#breadcrumb'};
    graph.push({'@type': 'BreadcrumbList', '@id': url + '#breadcrumb', itemListElement: trail.map(([name, item], i) => ({'@type': 'ListItem', position: i + 1, name, item}))});
  }
  const service = (name, text, link) => ({'@type': 'Service', name, serviceType: name, description: text, url: link, provider: org, areaServed: site.seo.areaServed.map(country => ({'@type': 'Country', name: country}))});
  const faq = items => ({'@type': 'FAQPage', '@id': url + '#faq', mainEntity: items.map(({question, answer}) => ({'@type': 'Question', name: question, acceptedAnswer: {'@type': 'Answer', text: answer}}))});
  if (route === '/' && page.faq?.items?.length) graph.push(faq(page.faq.items));
  if (template === 'services') {
    webpage.mainEntity = {'@type': 'ItemList', itemListElement: page.groups.map((group, i) => ({'@type': 'ListItem', position: i + 1, item: service(group.label, group.description, group.detailUrl ? absolute(group.detailUrl) : `${url}#${group.id}`)}))};
  }
  if (template === 'service-detail') {
    graph.push({...service(page.serviceName, page.intro, url), '@id': url + '#service', hasOfferCatalog: {'@type': 'OfferCatalog', name: `${page.serviceName} formats`, itemListElement: page.formats.map(format => ({'@type': 'Offer', itemOffered: {'@type': 'Service', name: format.label, description: format.short}}))}});
    graph.push(faq(page.faqs.map(item => ({question: item.q, answer: item.a}))));
  }
  if (template === 'projects') {
    webpage.mainEntity = {'@type': 'ItemList', itemListElement: projects.map((item, i) => ({'@type': 'ListItem', position: i + 1, url: absolute(`/projects/${item.slug}`), name: clean(item.title)}))};
  }
  if (project) {
    const videos = projectVideos(project).filter(video => video.poster).map(video => ({
      '@type': 'VideoObject', name: video.title, description: video.description || description,
      thumbnailUrl: absolute(video.poster), contentUrl: absolute(video.src), uploadDate: project.published || site.seo.published,
    }));
    const market = /confirmed|not market/i.test(project.market || '') ? undefined : project.market;
    graph.push({
      '@type': 'CreativeWork', '@id': url + '#work', name: clean(project.title), headline: project.seoTitle || title,
      description: project.description, abstract: project.subtitle, url, image: absolute(project.heroCover || project.cover),
      creator: org, publisher: org, datePublished: project.published || site.seo.published, inLanguage: 'en',
      keywords: project.tags.join(', '), about: {'@type': 'Brand', name: clean(project.brand || project.title)},
      ...(market ? {contentLocation: {'@type': 'Place', name: market}} : {}),
      ...(project.client ? {sourceOrganization: {'@type': 'Organization', name: project.client}} : {}),
      ...(videos.length ? {video: videos} : {}),
    });
    webpage.mainEntity = {'@id': url + '#work'};
  }
  return `<script type="application/ld+json">${JSON.stringify({'@context': 'https://schema.org', '@graph': graph}).replace(/</g, '\\u003c')}</script>`;
}

// Films, infographics and walkthroughs that a project page plays.
export function projectVideos(project) {
  return ['films', 'infographics', 'walkthroughs'].flatMap(key => project[key] || []).filter(video => video.src);
}

// Last commit date of a page's sources; omitted when history is unavailable or shallow.
export function lastModified(root, files) {
  try {
    if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], {cwd: root, encoding: 'utf8'}).trim() !== 'false') return '';
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...files], {cwd: root, encoding: 'utf8'}).trim();
  } catch { return ''; }
}

export function sitemap(site, entries, escape) {
  const e = escape, absolute = p => e(new URL(p, site.baseUrl).href);
  const urls = entries.map(entry => [
    `<url><loc>${absolute(entry.route)}</loc>`,
    entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : '',
    ...entry.images.map(image => `<image:image><image:loc>${absolute(image)}</image:loc></image:image>`),
    ...entry.videos.map(video => `<video:video><video:thumbnail_loc>${absolute(video.poster)}</video:thumbnail_loc><video:title>${e(video.title)}</video:title><video:description>${e(video.description || entry.description)}</video:description><video:content_loc>${absolute(video.src)}</video:content_loc></video:video>`),
    '</url>',
  ].join('')).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${urls}</urlset>`;
}

// Search and AI crawlers are welcome; the sitemap lists every public page.
export function robots(site) {
  const assistants = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot'];
  return `User-agent: *\nAllow: /\n\n# AI search and assistant crawlers are welcome.\n${assistants.map(name => `User-agent: ${name}`).join('\n')}\nAllow: /\n` + (site.baseUrl ? `\nSitemap: ${new URL('/sitemap.xml', site.baseUrl).href}\n` : '');
}

// llms.txt: a plain summary of who NMESIS is and where each answer lives, for AI assistants.
export function llmsText({site, home, about, services, detail, projects, full = false}) {
  const absolute = p => new URL(p, site.baseUrl).href;
  const stats = Object.values(home.stats || {}).map(stat => `${stat.value} ${stat.label.toLowerCase()}`).join(', ');
  const clients = Object.keys(home.clients?.details || {}).length;
  const lines = [
    `# ${site.seo.siteName}`, '',
    `> ${site.brandName} (${site.seo.siteName}) is an automotive studio based in ${site.seo.locations.map(place => `${place.city}, ${place.countryName}`).join(' and ')}. It builds accurate vehicle digital twins and turns them into automotive CGI (launch films, key visuals and infographic animations), light and pixel-streaming car configurators, and interactive brochures for automotive brands and their authorised distributors in ${list(site.seo.areaServed)}.`, '',
    `- Website: ${absolute('/')}`,
    `- Contact: ${site.email} (${absolute('/contact')})`,
    `- Locations: ${site.seo.locations.map(place => `${place.city} (${place.countryName})`).join(', ')}`,
    `- Founders: ${about.people.members.map(member => `${member.name} (${member.role})`).join(', ')}`,
    `- Track record: ${stats}${clients ? `; work with ${clients} automotive brands and distributors` : ''}.`,
    `- Social: ${site.social.map(link => `${link.label} ${link.url}`).join(', ')}`,
    '', '## Services', '',
    ...services.groups.map(group => `- [${group.label}](${group.detailUrl ? absolute(group.detailUrl) : absolute(`/services#${group.id}`)}): ${group.description}`),
    '', '## Projects', '',
    ...projects.map(project => `- [${clean(project.title)}](${absolute(`/projects/${project.slug}`)}): ${project.metaDescription || project.description}`),
    '', '## Company', '',
    `- [About ${site.brandName}](${absolute('/about')}): ${about.metaDescription || about.hero.description}`,
    `- [Contact](${absolute('/contact')}): start a project by email at ${site.email}.`,
  ];
  if (full) {
    lines.push('', '## Frequently asked questions', '', ...home.faq.items.flatMap(item => [`### ${item.question}`, '', item.answer, '']));
    lines.push(`## ${detail.serviceName}`, '', detail.intro, '', ...detail.formats.flatMap(format => [`### ${format.label}`, '', format.description, '', `When to choose it: ${format.fit}`, '']));
    lines.push(...detail.faqs.flatMap(item => [`### ${item.q}`, '', item.a, '']));
    lines.push('## Project details', '', ...projects.flatMap(project => [`### ${clean(project.title)}`, '', `- Client: ${project.client}`, `- Scope: ${project.scope}`, `- Market: ${project.market}`, `- Page: ${absolute(`/projects/${project.slug}`)}`, '', project.description, '']));
  }
  lines.push('', '## Optional', '', `- [Full detail for AI assistants](${absolute('/llms-full.txt')})`, `- [Privacy policy](${absolute('/privacy-policy')})`, `- [Terms of service](${absolute('/terms')})`);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}
