import fs from 'node:fs/promises';
import {themeSurfaces} from './theme-surfaces.mjs';
import {socialLinks as renderSocialLinks} from './social-links.mjs';
import {aboutPage} from './about-page.mjs';
import {projectMedia} from './project-media.mjs';
import {serviceShowcase} from './service-showcase.mjs';
import {serviceDetail} from './service-detail.mjs';
import {serviceActionContent,serviceLabel,serviceArrow} from './service-actions.mjs';
import referenceAppear from './reference-appear.cjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Windows checkouts may use CRLF; normalize so local and production output match.
export const read = async name => (await fs.readFile(path.join(root, name), 'utf8')).replace(/\r\n?/g, '\n');
const json = async name => JSON.parse(await read(name));
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lookup = (context, key) => key.split('.').reduce((value, part) => value?.[part], context);
export function render(template, context) {
  return template.replace(/(<\/(?:span|strong|em)>)[ \t]*\n[ \t]*(<(?:span|strong|em)\b)/g,'$1 $2').replace(/>[ \t]*\n[ \t]*</g,'><').replace(/\{\{\{\s*([^{}]+?)\s*\}\}\}|\{\{\s*([^{}]+?)\s*\}\}/g, (_, raw, escaped) => {
    const value = lookup(context, raw || escaped);
    if (value === undefined) throw new Error(`Missing template field: ${raw || escaped}`);
    return raw ? String(value ?? '') : escapeHTML(value);
  });
}
async function collection(folder) {
  const items = {};
  for (const file of await fs.readdir(path.join(root, folder))) {
    if (file.endsWith('.json')) {
      const item = await json(`${folder}/${file}`);
      if (!item.slug || /[/.\\]/.test(item.slug)) throw new Error(`Invalid slug in ${file}`);
      if (items[item.slug]) throw new Error(`Duplicate slug: ${item.slug}`);
      items[item.slug] = item;
    }
  }
  return items;
}
function ordered(items, preferred) {
  return [...new Set([...preferred, ...Object.keys(items)])].filter(key => items[key]).map(key => items[key]);
}
export function deploymentBaseURL(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('SITE_URL must be an absolute HTTPS URL.'); }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || /[?#]/.test(value)) {
    throw new Error('SITE_URL must use HTTPS without credentials, a query or a fragment.');
  }
  return url.href;
}
export async function build({outDir = 'dist', overrides = {}, projectOverrides = {}} = {}) {
  const site = {...await json('content/site.json'), ...overrides};
  if (process.env.SITE_URL) site.baseUrl = deploymentBaseURL(process.env.SITE_URL);
  const shared = await json('content/shared.json');
  const projects = await collection('content/projects');
  for (const [slug, patch] of Object.entries(projectOverrides)) { if (projects[slug]) Object.assign(projects[slug], patch); }
  const blog = await collection('content/articles');
  const projectList = ordered(projects, site.projectOrder);
  const articleList = ordered(blog, site.articleOrder);
  for (const item of projectList) {
    const brand = {'soueast-egypt':'soueast',byd:'byd',avatr:'avatr',cadillac:'cadillac',chevrolet:'chevrolet',gac:'gac','im-motors':'im-motors'}[item.slug];
    item.cardTitle = item.brandLogo
      ? `<img class="project-image-mark${item.brandLogoInvert ? ' project-image-mark--invert' : ''}" src="${escapeHTML(item.brandLogo)}" alt="${escapeHTML(item.title.replace(/\.$/, ''))}">`
      : brand
      ? `<span class="project-brand client-logo client-logo--${brand}" role="img" aria-label="${escapeHTML(item.title.replace(/\.$/, ''))}"></span>`
      : item.slug==='nmesis-lab' ? `<span class="project-lab-mark" role="img" aria-label="NMESIS Lab"><img src="/assets/brand/nmesis-wordmark.png" alt=""><span>LAB</span></span>` : escapeHTML(item.title);
    if (!Array.isArray(item.tags) || item.tags.length !== 3) throw new Error(`${item.slug}: provide three project tags`);
    const style = 'display:block;width:100%;height:100%;border-radius:inherit;object-position:center;object-fit:cover';
    item.coverMedia = item.video
      ? `<video data-project-loop autoplay muted loop playsinline preload="metadata" poster="${escapeHTML(item.cover)}" src="${escapeHTML(item.video)}" aria-label="${escapeHTML(item.coverAlt)}" style="${style};pointer-events:none"></video>`
      : `<img alt="${escapeHTML(item.coverAlt)}" decoding="async" loading="lazy" src="${escapeHTML(item.cover)}"${item.coverSrcset ? ` srcset="${escapeHTML(item.coverSrcset)}" sizes="(max-width:809px) 100vw, 66vw"` : ''} style="${style}"/>`;
  }
  for (const item of projectList) {
    item.heroClass = item.heroLayout === 'landscape' ? 'case-hero-landscape' : '';
    item.heroMedia = item.heroCover
      ? `<img alt="${escapeHTML(item.heroCoverAlt || item.coverAlt)}" decoding="async" src="${escapeHTML(item.heroCover)}" style="display:block;width:100%;height:100%;border-radius:inherit;object-position:center;object-fit:cover"/>`
      : item.coverMedia;
  }
  const routes = await json('content/pages.json');
  const output = path.resolve(root, outDir);
  if (output === root || !output.startsWith(root + path.sep)) throw new Error('Build output must be inside this project.');
  await fs.rm(output, {recursive:true, force:true});
  await fs.mkdir(output, {recursive:true});
  // Provenance stays in the source tree; only website assets are published.
  await fs.cp(path.join(root,'public'), output, {recursive:true, filter: source => {
    const name = path.basename(source);
    return name !== '.DS_Store' && !/(?:^|-)sources\.json$/i.test(name);
  }});
  await fs.cp(path.join(root,'src/styles'), path.join(output,'styles'), {recursive:true});
  for (const entry of await fs.readdir(path.join(output,'styles/pages'))) {
    if(entry.endsWith('.css')) {
      const file=path.join(output,'styles/pages',entry);
      await fs.writeFile(file,themeSurfaces(await fs.readFile(file,'utf8')));
    }
  }
  await fs.cp(path.join(root,'src/scripts'), path.join(output,'scripts'), {recursive:true});
  const motion = {...await json('src/motion/effects.json'), appear:await json('src/motion/appear.json')};
  for (const page of Object.values(motion.appear)) for (const entry of page.entries) for (const spec of Object.values(entry.variants)) {
    if (!spec) continue;
    referenceAppear.animateAppearEffects({animation:{default:structuredClone(spec)}},(_selector,keyframes,options)=>{spec.frames={keyframes,options};},'data-motion-appear','__Appear_Animation_Transform__',false);
  }
  for(const item of [...motion.components,...motion.hovers]) {
    const t=item.transition;if(t?.type!=='spring')continue;
    const duration=(t.duration??.4)*1000, generator=referenceAppear.spring({...t,duration,keyframes:[0,1]});
    const count=Math.max(2,Math.round(duration/10));
    t.nativeEase='linear('+Array.from({length:count},(_,i)=>Math.round(generator.next(i/(count-1)*duration).value*10000)/10000).join(',')+')';
  }
  await fs.writeFile(path.join(output,'scripts/motion-data.js'),'window.MORO_MOTION='+JSON.stringify(motion).replace(/</g,'\\u003c')+';');
  const initialSelectors = [...new Set([...Object.values(motion.appear).flatMap(page=>page.entries.map(e=>e.selector)),...motion.effects.filter(e=>e.kind==='reveal'||e.kind==='text').map(e=>e.selector)])];
  await fs.writeFile(path.join(output,'styles/motion-initial.css'), initialSelectors.map(selector=>'html.motion-ready '+selector+':not([data-motion-ready])').join(',\n')+'{visibility:hidden}');
  const colors = Object.entries(site.colors).map(([key,value]) => {
    if (!/^#[0-9a-f]{3,8}$/i.test(value)) throw new Error(`Use a hex color for ${key}.`);
    return `  --color-${key}: ${value};`;
  }).join('\n');
  await fs.appendFile(path.join(output,'styles/theme.css'), `\n/* Values generated from content/site.json. */\n:root, body {\n${colors}\n}\n`);
  const shell = await read('src/templates/layout.html');
  const partial = async (name, ctx) => render(await read(`src/templates/partials/${name}.html`), ctx);
  const selectFeatured = (keys, items, count, label) => {
    if (!Array.isArray(keys) || keys.length !== count) throw new Error(`${label} requires ${count} selections for the current homepage layout.`);
    return keys.map(key => { if (!items[key]) throw new Error(`${label}: missing ${key}`); return items[key]; });
  };
  const featuredProjects = selectFeatured(site.featuredProjects, projects, 6, 'featuredProjects');
  const featuredArticles = selectFeatured(site.featuredArticles, blog, 3, 'featuredArticles');
  const socialLinks = renderSocialLinks(site.social,escapeHTML);
  const themeToggle = '<button class="theme-toggle" type="button" data-theme-toggle aria-label="Switch to light mode"><svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg><svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.5 8.5 0 1 0 10.2 10.2Z"/></svg><span data-theme-label>Light mode</span></button>';
  const base = {site,shared,projects,blog,featuredProjects,featuredArticles,socialLinks,themeToggle};
  const header = await partial('header', base);
  const footer = await partial('footer', base);
  const icons = await read('src/templates/partials/icons.html');
  const mobileLinks = site.navigation.map(link => `<a class="design-SmDrJ design-ovk8g8 design-v-1sujeta" data-part="Default" href="${escapeHTML(link.url)}"><div class="design-q9bf4u"><div class="design-1g3dvz0"><h3>${escapeHTML(link.label)}</h3></div><div class="design-12n0ytl" aria-hidden="true"><h3>${escapeHTML(link.label)}</h3></div></div><div class="design-fhY6R design-h3njfy" aria-hidden="true"></div></a>`).join('\n');
  const allRoutes = [];
  async function page(route, templateName, extra, title, withCTA) {
    const pageData = await json(`content/pages/${templateName}.json`);
    const ctx = {...base, page:pageData, ...extra};
    if (templateName === 'about') ctx.aboutContent = aboutPage(pageData,escapeHTML);
    if (templateName === 'services') {
      const showcase=serviceShowcase(pageData,escapeHTML,projects);
      ctx.serviceNavigation=showcase.navigation;ctx.serviceSections=showcase.sections;ctx.serviceProcess=showcase.process;
    }
    if (templateName === 'service-detail') {
      const detail=serviceDetail(pageData,escapeHTML);
      ctx.detailIndex=detail.index;ctx.detailFormats=detail.formats;ctx.detailSteps=detail.steps;ctx.detailInputs=detail.inputs;ctx.detailFaqs=detail.faqs;
    }
    if (templateName === 'projects') {
      ctx.servicesAction = serviceActionContent(pageData.services.action,escapeHTML);
      ctx.servicesLinks = pageData.services.items.map((item,i)=>`<a class="work-service" href="${escapeHTML(item.url)}"><span class="work-service-image"><img src="${escapeHTML(item.image)}" alt="" loading="lazy" width="160" height="110"></span><span class="work-service-copy"><span class="work-service-number" aria-hidden="true">0${i+1}</span><h3>${serviceLabel(item.title,escapeHTML)}</h3><span class="work-service-description">${escapeHTML(item.description)}</span></span>${serviceArrow()}</a>`).join('');
      ctx.projectCards = (await Promise.all(projectList.map(project => partial('project-card', {...ctx,project})))).join('\n');
    }
    if (templateName === 'blog') {
      ctx.featuredArticle = articleList[0] ? await partial('article-featured', {...ctx,article:articleList[0]}) : '';
      for (let i=0;i<2;i++) ctx['articleCards'+i] = (await Promise.all(articleList.slice(1).map(article=>partial('article-card-'+i,{...ctx,article})))).join('\n');
    }
    if (templateName === 'project') {
      ctx.relatedProjects = (await Promise.all(extra.related.map(project=>partial('related-project-card',{...ctx,project})))).join('\n');
      const media = projectMedia(extra.project, escapeHTML);
      ctx.projectMedia = media.media;
      ctx.projectNavigation = media.navigation;
    }
    if (templateName === 'article') ctx.relatedArticles = (await Promise.all(articleList.filter(a=>a.slug!==extra.article.slug).slice(0,3).map(article=>partial('related-article-card',{...ctx,article})))).join('\n');
    const content = render(await read(`src/templates/pages/${templateName}.html`), ctx);
    const canonical = site.baseUrl ? `<link rel="canonical" href="${escapeHTML(new URL(route,site.baseUrl).href)}">` : '';
    const backdrop = extra.project?.ctaBackground || pageData.ctaBackground;
    const ctaBackground = backdrop ? `<div class="nmesis-cta-background" aria-hidden="true" style="--cta-position:${escapeHTML(backdrop.position || 'center')};--cta-mobile-position:${escapeHTML(backdrop.mobilePosition || backdrop.position || 'center')}"><img src="${escapeHTML(backdrop.src)}" alt="" width="${Number(backdrop.width)}" height="${Number(backdrop.height)}" loading="lazy" decoding="async"></div>` : '';
    const cta = withCTA ? await partial('cta', {...ctx,ctaBackground}) : '';
    let html = themeSurfaces(render(shell, {...ctx,header,footer,cta,icons,mobileLinks,socialLinks,content,meta:{title:`${title} — ${site.brandName}`,description:extra.project?.subtitle || extra.article?.excerpt || pageData.metaDescription || site.description,style:templateName,canonical}}));
    // Keep contact/form configuration public and separate from the layout.
    html = html.replace('</head>', `<script type="application/json" id="site-config">${JSON.stringify({brandName:site.brandName,logo:site.logo,forms:site.forms,timezone:site.timezone}).replace(/</g,'\\u003c')}</script>\n</head>`);
    // Article HTML is intentionally editable; all JSON strings remain HTML-escaped.
    const target = path.join(output, decodeURIComponent(route), 'index.html');
    await fs.mkdir(path.dirname(target),{recursive:true});
    await fs.writeFile(target, html);
    allRoutes.push(route);
  }
  for (const spec of routes) await page(spec.route, spec.template, {}, spec.title, spec.cta);
  for (const project of projectList) {
    const related = projectList.filter(item => item.slug !== project.slug).slice(0,4);
    await page(`/projects/${project.slug}`,'project',{project,related},project.title,true);
  }
  // Vercel's static hosting uses a root 404.html for unmatched routes.
  await fs.copyFile(path.join(output,'404/index.html'), path.join(output,'404.html'));
  await fs.writeFile(path.join(output,'routes.json'), JSON.stringify(allRoutes,null,2));
  await fs.writeFile(path.join(output,'robots.txt'), 'User-agent: *\nAllow: /\n');
  if (site.baseUrl) await fs.writeFile(path.join(output,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${allRoutes.filter(r=>r!='/404').map(route=>`<url><loc>${escapeHTML(new URL(route,site.baseUrl).href)}</loc></url>`).join('')}</urlset>`);
  return {routes:allRoutes,output};
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await build();
  console.log(`Built ${result.routes.length} static pages in ${result.output}`);
}
