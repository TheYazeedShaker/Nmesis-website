import http from 'node:http';
import {createProjectBuilderHandler} from './project-builder-server.mjs';
import {createReadStream} from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build,root} from './build.mjs';
const projectBuilder = createProjectBuilderHandler(root);
const port = Number(process.env.PORT || 4175);
let result = await build();
let lastBuild = Date.now();
let building;
const mime={'.mp4':'video/mp4','.webm':'video/webm','.avif':'image/avif','.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.woff':'font/woff','.xml':'application/xml','.txt':'text/plain'};
async function latest(dir) {
  let modified = 0;
  for (const item of await fs.readdir(dir,{withFileTypes:true})) {
    const file=path.join(dir,item.name);
    modified=Math.max(modified,item.isDirectory()?await latest(file):(await fs.stat(file)).mtimeMs);
  }
  return modified;
}
http.createServer(async(req,res)=>{
  try {
    let url=new URL(req.url,'http://localhost');
    if(await projectBuilder(req,res,url))return;
    if (!path.extname(url.pathname) || url.pathname.endsWith('.html')) {
      const changed=Math.max(await latest(path.join(root,'content')),await latest(path.join(root,'src')));
      if (changed>lastBuild) {
        building ??= build().then(value=>{result=value;lastBuild=Date.now();}).finally(()=>building=undefined);
        await building;
      }
    }
    let requested=decodeURIComponent(url.pathname);
    let file=path.resolve(result.output,'.'+requested);
    if (!file.startsWith(result.output+path.sep)&&file!==result.output) {res.writeHead(403);return res.end();}
    let status=200;
    try {if ((await fs.stat(file)).isDirectory()) file=path.join(file,'index.html');await fs.access(file);}
    catch {file=path.join(result.output,'404/index.html');status=404;}
    if(['.mp4','.webm'].includes(path.extname(file))){
      const {size}=await fs.stat(file);
      const headers={'Content-Type':mime[path.extname(file)],'Accept-Ranges':'bytes','Cache-Control':'no-store'};
      let start=0,end=size-1;
      if(req.headers.range){
        const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if(!match||(!match[1]&&!match[2])){res.writeHead(416,{...headers,'Content-Range':`bytes */${size}`});return res.end();}
        if(!match[1])start=Math.max(0,size-Number(match[2]));
        else {start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),size-1);}
        if(start>=size||end<start){res.writeHead(416,{...headers,'Content-Range':`bytes */${size}`});return res.end();}
        headers['Content-Range']=`bytes ${start}-${end}/${size}`;
      }
      res.writeHead(req.headers.range?206:200,{...headers,'Content-Length':end-start+1});
      if(req.method==='HEAD')return res.end();
      const stream=createReadStream(file,{start,end});
      res.on('close',()=>stream.destroy());stream.on('error',()=>res.destroy());
      return stream.pipe(res);
    }
    let body=await fs.readFile(file);
    res.writeHead(status,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':body.length});
    res.end(req.method==='HEAD'?undefined:body);
  } catch(error) {console.error(error.message);res.writeHead(500,{'Content-Type':'text/plain'});res.end('Build error: '+error.message);}
}).listen(port,'127.0.0.1',()=>console.log(`Editable preview: http://localhost:${port}\nEdit content or source files, then refresh to rebuild.`));
