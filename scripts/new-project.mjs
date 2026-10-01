import fs from 'node:fs/promises';
import path from 'node:path';
import {root,read} from './build.mjs';
const slug=process.argv[2];
const title=process.argv.slice(3).join(' ') || 'New project';
if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('Usage: npm run new:project -- your-project-slug "Your project title"');process.exit(1);
}
const target=path.join(root,'content/projects',slug+'.json');
const template=JSON.parse(await read('templates/project.json'));
const project={...template,slug,title};
await fs.writeFile(target,JSON.stringify(project,null,2)+'\n',{flag:'wx'});
await fs.mkdir(path.join(root,'public/assets/projects',slug,'images'),{recursive:true});
await fs.mkdir(path.join(root,'public/assets/projects',slug,'videos'),{recursive:true});
console.log(`Created content/projects/${slug}.json. Add your artwork, films, galleries and interactive experiences, then rebuild. See PROJECT-TEMPLATE.md.`);
