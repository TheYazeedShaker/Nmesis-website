import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {root, deploymentBaseURL} from './build.mjs';
import {imageSource} from './image-optimization.mjs';

// Run after a build. Inspect actual output rather than publishing a second copy.
const output = path.join(root, 'dist');
const requiredDirectories = ['api', 'content', 'src', 'public', 'scripts', 'templates', 'tools'];
const requiredFiles = ['package.json', 'content/site.json', 'content/shared.json', 'content/pages.json', 'src/templates/layout.html', 'scripts/build.mjs', 'scripts/reference-appear.cjs', 'templates/project.json', 'public/vendor/lenis.js', 'public/vendor/motion.js'];
const excludedMetadata = name => name === '.DS_Store' || /(?:^|-)sources\.json$/i.test(name);
const errors = [];
async function walk(directory) {
  const entries = [];
  for (const item of await fs.readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, item.name);
    assert.ok(!item.isSymbolicLink(), `Deployment source must not depend on symlinks: ${path.relative(root, file)}`);
    entries.push({file, directory: item.isDirectory()});
    if (item.isDirectory()) entries.push(...await walk(file));
  }
  return entries;
}
for (const directory of requiredDirectories) assert.ok((await fs.stat(path.join(root, directory))).isDirectory(), `Missing source directory: ${directory}`);
for (const file of requiredFiles) assert.ok((await fs.stat(path.join(root, file))).isFile(), `Missing source file: ${file}`);

// Linux builds must see the same filenames as the local Mac checkout.
const sourcePaths = new Map();
for (const directory of requiredDirectories) {
  for (const entry of await walk(path.join(root, directory))) {
    const relative = path.relative(root, entry.file);
    const folded = relative.toLowerCase();
    assert.ok(!sourcePaths.has(folded), `Case-colliding source paths: ${sourcePaths.get(folded)} and ${relative}`);
    sourcePaths.set(folded, relative);
  }
}

let published;
try { published = await walk(output); }
catch (error) { throw new Error('Deployment output is missing or unreadable. Run npm run build first.', {cause: error}); }
const publishedPaths = new Set(published.map(entry => path.relative(output, entry.file).split(path.sep).join('/')));
for (const {file} of published) {
  const relative = path.relative(output, file);
  if (excludedMetadata(path.basename(file))) errors.push(`Private provenance or OS metadata was published: ${relative}`);
}

const pageSpecs = JSON.parse(await fs.readFile(path.join(root, 'content/pages.json'), 'utf8'));
const projectFiles = (await fs.readdir(path.join(root, 'content/projects'))).filter(file => file.endsWith('.json'));
const expectedRoutes = pageSpecs.map(page => page.route);
for (const file of projectFiles) {
  const project = JSON.parse(await fs.readFile(path.join(root, 'content/projects', file), 'utf8'));
  expectedRoutes.push(`/projects/${project.slug}`);
}
const routes = JSON.parse(await fs.readFile(path.join(output, 'routes.json'), 'utf8'));
assert.equal(new Set(routes).size, routes.length, 'Published routes must be unique.');
assert.deepEqual([...routes].sort(), expectedRoutes.sort(), 'Published routes must match current pages and projects.');
for (const route of routes) {
  const index = path.posix.join(route, 'index.html').replace(/^\//, '');
  assert.ok(publishedPaths.has(index), `Missing route index or filename case mismatch: ${index}`);
  const html = await fs.readFile(path.join(output, index), 'utf8');
  assert.ok(html.includes('<html'), `Empty or invalid HTML route: ${route}`);
  for (const [, value] of html.matchAll(/(?:src|href)="([^"]*)"/g)) {
    if (!value.startsWith('/') || value.startsWith('//')) continue;
    // Optimized images are served from their published source file.
    const local = decodeURIComponent(imageSource(value)).replace(/^\//, '');
    if (local && !publishedPaths.has(local) && !publishedPaths.has(path.posix.join(local, 'index.html'))) errors.push(`${route}: missing local path or filename case mismatch: ${value}`);
  }
}
assert.equal(await fs.readFile(path.join(output, '404.html'), 'utf8'), await fs.readFile(path.join(output, '404/index.html'), 'utf8'), 'Static hosting must use the site’s own 404 page.');

let assetCount = 0, assetBytes = 0;
for (const {file, directory} of await walk(path.join(root, 'public'))) {
  if (directory || excludedMetadata(path.basename(file))) continue;
  const relative = path.relative(path.join(root, 'public'), file);
  const {size} = await fs.stat(file);
  if (size >= 100 * 1024 * 1024) errors.push(`Asset must be smaller than 100 MiB for the Git repository: ${relative}`);
  const handle = await fs.open(file, 'r');
  const prefix = Buffer.alloc(160);
  try {
    const {bytesRead} = await handle.read(prefix, 0, prefix.length, 0);
    if (prefix.subarray(0, bytesRead).toString('utf8').startsWith('version https://git-lfs.github.com/spec/v1')) errors.push(`Asset contains a Git LFS pointer instead of media: ${relative}`);
  } finally { await handle.close(); }
  const deployed = path.join(output, relative);
  try {
    if ((await fs.stat(deployed)).size !== size) errors.push(`Published asset has the wrong size: ${relative}`);
  } catch { errors.push(`Asset was omitted from the deployment: ${relative}`); }
  assetCount++; assetBytes += size;
}

assert.equal(deploymentBaseURL('https://nmesis.example'), 'https://nmesis.example/');
for (const invalid of ['nmesis.example', 'http://nmesis.example', 'https://user:password@nmesis.example', 'https://nmesis.example/?preview=1', 'https://nmesis.example/#about']) assert.throws(() => deploymentBaseURL(invalid), /SITE_URL/);
const configuredSite = JSON.parse(await fs.readFile(path.join(root, 'content/site.json'), 'utf8'));
const baseURL = process.env.SITE_URL ? deploymentBaseURL(process.env.SITE_URL) : configuredSite.baseUrl;
if (baseURL) {
  const sitemap = await fs.readFile(path.join(output, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes(new URL('/about', baseURL).href), 'Sitemap must use the configured production URL.');
  const about = await fs.readFile(path.join(output, 'about/index.html'), 'utf8');
  assert.ok(about.includes(`rel="canonical" href="${new URL('/about', baseURL).href}"`), 'Canonical URL must use the configured production URL.');
}
assert.equal(errors.length, 0, errors.join('\n'));
console.log(`Passed: ${routes.length} static routes, custom 404, portable source paths, clean public output, and ${assetCount} complete assets (${Math.round(assetBytes / 1024 / 1024)} MiB).`);
