// Tells IndexNow search engines (Bing, Yandex, Seznam, Naver) about every page in the live sitemap, so new and
// changed pages are crawled within hours instead of weeks. Bing's index also feeds ChatGPT search and Copilot.
// The key is public by design: search engines verify it by fetching public/<key>.txt from the site.
// GitHub Actions runs this after each push to main; run it by hand with: node scripts/indexnow.mjs
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const site = JSON.parse(await fs.readFile(path.join(root, 'content/site.json'), 'utf8'));
const keyFile = (await fs.readdir(path.join(root, 'public'))).find(name => /^[0-9a-f]{32}\.txt$/.test(name));
if (!keyFile) throw new Error('Missing the IndexNow key file (public/<32 hex characters>.txt).');
const key = keyFile.slice(0, -4);
const base = new URL(site.baseUrl);
const keyLocation = new URL(keyFile, base).href;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// A push to main starts the Vercel deployment at the same time, so wait until the key is live.
for (let attempt = 1; ; attempt++) {
  const response = await fetch(keyLocation, {cache: 'no-store'}).catch(() => null);
  if (response?.ok && (await response.text()).trim() === key) break;
  if (attempt === 30) throw new Error(`${keyLocation} is not serving the IndexNow key.`);
  await sleep(20_000);
}

const sitemap = await (await fetch(new URL('sitemap.xml', base))).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).filter(url => new URL(url).host === base.host);
if (!urlList.length) throw new Error('The live sitemap lists no pages.');
const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: {'Content-Type': 'application/json; charset=utf-8'},
  body: JSON.stringify({host: base.host, key, keyLocation, urlList}),
});
// 200 = accepted; 202 = accepted while the key is being verified.
if (![200, 202].includes(response.status)) throw new Error(`IndexNow answered ${response.status}: ${await response.text()}`);
console.log(`IndexNow accepted ${urlList.length} URLs (${response.status}).`);
