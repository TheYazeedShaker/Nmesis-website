// Local authoring only. This handler and its UI are never copied into dist/.
import fs from 'node:fs/promises';
import {createWriteStream} from 'node:fs';
import {Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const imageExtensions=new Set(['.png','.jpg','.jpeg','.webp','.avif']);
const videoExtensions=new Set(['.mp4','.webm']);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export async function validateProject(input,root) {
  if(!input || typeof input!=='object')fail('Project details are required.');
  const text=(value,label,required=false)=>{
    if(typeof value!=='string' || value.length>20000 || (required&&!value.trim()))fail(`Please add a valid ${label}.`);
    return value.trim();
  };
  const slug=text(input.slug,'project address',true);
  if(!slugPattern.test(slug)||slug.length>100)fail('Use lowercase letters, numbers and hyphens for the project address.');
  const asset=async(value,label,kind)=>{
    const src=text(value,label,true);
    if(!src.startsWith('/assets/') || src.includes('..') || src.includes('\\') || /[?#\x00]/.test(src))fail(`Choose a local asset for ${label}.`);
    const ext=path.extname(src).toLowerCase();
    if(kind==='video'?!videoExtensions.has(ext):!(imageExtensions.has(ext)||ext==='.svg'))fail(`Unsupported file type for ${label}.`);
    const assets=await fs.realpath(path.join(root,'public/assets'));
    let actual;try{actual=await fs.realpath(path.join(root,'public',src));}catch{fail(`File not found for ${label}.`);}
    if(!actual.startsWith(assets+path.sep))fail('Asset must be inside this project.');
    return src;
  };
  const list=(value,label)=>{if(!Array.isArray(value)||value.length>200)fail(`Invalid ${label}.`);return value;};
  const tags=list(input.tags,'capabilities').map(t=>text(t,'capability',true));
  if(tags.length!==3)fail('Please provide three capabilities.');
  const project={slug,title:text(input.title,'project title',true),subtitle:text(input.subtitle,'subtitle',true),description:text(input.description,'description',true),cover:await asset(input.cover,'cover image','image'),coverAlt:text(input.coverAlt,'cover description',true),tags,client:text(input.client,'client',true),scope:text(input.scope,'scope',true),market:text(input.market,'market',true),films:[],galleries:[],experiences:[]};
  for(const film of list(input.films || [],'films'))project.films.push({title:text(film.title,'film title',true),description:text(film.description || '','film description'),src:await asset(film.src,'film','video'),...(film.poster?{poster:await asset(film.poster,'film poster','image')}:{})});
  for(const group of list(input.galleries || [],'galleries')){
    const gallery={title:text(group.title,'gallery title',true),description:text(group.description || '','gallery description'),images:[]};
    for(const img of list(group.images,'gallery images'))gallery.images.push({src:await asset(img.src,'gallery image','image'),alt:text(img.alt,'image description',true),caption:text(img.caption || img.alt,'caption'),width:Number(img.width)||1600,height:Number(img.height)||1200});
    if(!gallery.images.length)fail('Add at least one image to each gallery, or remove the empty gallery.');
    project.galleries.push(gallery);
  }
  for(const item of list(input.experiences || [],'interactive experiences')){
    let url;try{url=new URL(item.url);}catch{fail('Add a complete HTTPS link for each interactive experience.');}
    if(url.protocol!=='https:'||url.username||url.password)fail('Interactive experiences must use an HTTPS link without credentials.');
    const width=Number(item.width),height=Number(item.height);
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<100||height<100||width>8192||height>8192)fail('Embed dimensions must be between 100 and 8192 pixels.');
    project.experiences.push({type:text(item.type,'experience type',true),title:text(item.title,'experience title',true),description:text(item.description || '','experience description'),url:url.href,width,height});
  }
  return project;
}
export function createProjectBuilderHandler(root) {
  const send=(res,status,data,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(type==='application/json'?JSON.stringify(data):data);};
  return async(req,res,url)=>{
    if(!url.pathname.startsWith('/__project-builder/') && !['/project-builder','/project-builder/'].includes(url.pathname))return false;
    try{
      const host=new URL('http://'+req.headers.host);
      if(!['localhost','127.0.0.1','[::1]'].includes(host.hostname))fail('The project builder is available only on this computer.',403);
      if(req.headers.origin && req.headers.origin!==host.origin)fail('The project builder requires a same-origin request.',403);
      if(req.headers['sec-fetch-site']==='cross-site')fail('Cross-site requests are not allowed.',403);
      if(req.method==='GET'){
        const files={'/project-builder':'index.html','/project-builder/':'index.html','/__project-builder/app.js':'app.js','/__project-builder/style.css':'style.css'};
        if(files[url.pathname]){
          const file=files[url.pathname],type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8';
          send(res,200,await fs.readFile(path.join(root,'tools/project-builder',file),'utf8'),type);return true;
        }
        if(url.pathname==='/__project-builder/assets'){
          const assets=[];
          const scan=async(dir)=>{for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await scan(file);else if(entry.isFile()&&[...imageExtensions,...videoExtensions,'.svg'].includes(path.extname(file).toLowerCase()))assets.push('/'+path.relative(path.join(root,'public'),file).split(path.sep).join('/'));}};
          await scan(path.join(root,'public/assets'));send(res,200,assets);return true;
        }
        if(url.pathname==='/__project-builder/template'){send(res,200,JSON.parse(await fs.readFile(path.join(root,'templates/project.json'),'utf8')));return true;}
      }
      if(!['POST','PUT'].includes(req.method))fail('Not found.',404);
      if(req.headers['x-nmesis-builder']!=='1')fail('Use the local project builder to save projects.',403);
      if(req.method==='PUT' && url.pathname==='/__project-builder/asset'){
        const slug=url.searchParams.get('project'),name=path.basename(url.searchParams.get('name') || '');
        if(!slugPattern.test(slug || '')||slug.length>100)fail('Add a valid project address before importing files.');
        const ext=path.extname(name).toLowerCase();
        const folder=imageExtensions.has(ext)?'images':videoExtensions.has(ext)?'videos':null;
        if(!folder)fail('Choose a PNG, JPG, WebP, AVIF, MP4 or WebM file.');
        const filename=name.slice(0,-ext.length).replace(/[^a-zA-Z0-9-]+/g,'-').slice(0,80)+'-'+randomUUID().slice(0,8)+ext;
        const relative=`/assets/projects/${slug}/${folder}/${filename}`,target=path.join(root,'public',relative);
        await fs.mkdir(path.dirname(target),{recursive:true});
        let bytes=0;const cap=new Transform({transform(chunk,enc,cb){bytes+=chunk.length;cb(bytes>2*1024**3?new Error('Each file must be smaller than 2 GB.'):null,chunk);}});
        try{await pipeline(req,cap,createWriteStream(target,{flags:'wx'}));if(!bytes)fail('The selected file is empty.');}
        catch(error){await fs.rm(target,{force:true});throw error;}
        send(res,201,{src:relative});return true;
      }
      if(req.method==='POST' && url.pathname==='/__project-builder/projects'){
        let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2*1024**2)fail('Project details are too large.',413);}
        let input;try{input=JSON.parse(raw);}catch{fail('Invalid project details.');}
        const project=await validateProject(input,root);
        const target=path.join(root,'content/projects',project.slug+'.json');
        try{await fs.writeFile(target,JSON.stringify(project,null,2)+'\n',{flag:'wx'});}catch(error){if(error.code==='EEXIST')fail('That project address already exists. Choose a new address; the existing project has not been changed.',409);throw error;}
        send(res,201,{url:'/projects/'+project.slug,file:'content/projects/'+project.slug+'.json'});return true;
      }
      fail('Not found.',404);
    }catch(error){if(!res.headersSent)send(res,error.status||500,{error:error.status?error.message:'The project could not be saved. Check the preview terminal and try again.'});}
    return true;
  };
}
