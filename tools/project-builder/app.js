(() => {
'use strict';
const $=selector=>document.querySelector(selector),form=$('#project-form');
let uid=0,busy=false,dirty=false;
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text)node.textContent=text;return node;};
function field(parent,label,name,value='',type='text',required=false){
 const wrap=el('div','field'),id='field-'+(++uid),lab=el('label','',label);lab.htmlFor=id;
 const input=el(type==='textarea'?'textarea':'input');input.id=id;input.dataset.field=name;input.value=value;input.required=required;
 if(type!=='textarea')input.type=type;
 wrap.append(lab,input);parent.append(wrap);return input;
}
const button=(label,fn,parent)=>{const b=el('button','',label);b.type='button';b.addEventListener('click',fn);parent?.append(b);return b;};
const val=(parent,name)=>parent.querySelector(`[data-field="${name}"]`).value.trim();
function empty(){for(const p of document.querySelectorAll('[data-empty]'))p.hidden=!!document.getElementById(p.dataset.empty).children.length;}
function card(container,title){
 const node=el('article','item'),head=el('div','item-head'),actions=el('div','item-actions');
 head.append(el('h3','',title),actions);node.append(head);container.append(node);
 button('↑',()=>{if(node.previousElementSibling)container.insertBefore(node,node.previousElementSibling);},actions).setAttribute('aria-label','Move '+title+' up');
 button('↓',()=>{if(node.nextElementSibling)container.insertBefore(node.nextElementSibling,node);},actions).setAttribute('aria-label','Move '+title+' down');
 button('Remove',()=>{node.remove();empty();dirty=true;},actions).setAttribute('aria-label','Remove '+title);
 empty();dirty=true;return node;
}
function asset(parent,label,kind,initial='',selectedFile=null){
 const wrap=el('div','asset');parent.append(wrap);
 const path=field(wrap,label+' · existing asset','asset',initial);path.setAttribute('list',kind==='video'?'video-assets':'image-assets');path.placeholder='/assets/projects/…';
 const upload=field(wrap,'Or choose a file from your computer','file','','file');upload.accept=kind==='video'?'.mp4,.webm':'.jpg,.jpeg,.png,.webp,.avif';
 const note=el('p','hint','The original file stays where it is. A copy is saved with this project.');wrap.append(note);
 let file=selectedFile,blobUrl;
 const preview=kind==='image'?el('img','asset-preview'):null;
 if(preview){preview.alt=label+' preview';wrap.append(preview);preview.addEventListener('load',()=>preview.style.display='block');preview.addEventListener('error',()=>preview.style.display='none');}
 const updatePreview=()=>{if(!preview)return;if(blobUrl)URL.revokeObjectURL(blobUrl);blobUrl=file?URL.createObjectURL(file):null;const source=blobUrl || (path.value.startsWith('/assets/')?path.value:'');preview.style.display='none';if(source)preview.src=source;else preview.removeAttribute('src');};
 wrap.dimensions=()=>preview?.naturalWidth?{width:preview.naturalWidth,height:preview.naturalHeight}:{};
 if(file){note.textContent='Selected: '+file.name;path.value='';}
 upload.addEventListener('change',()=>{file=upload.files[0] || null;if(file){path.value='';note.textContent='Selected: '+file.name;}updatePreview();});
 path.addEventListener('input',()=>{file=null;upload.value='';note.textContent='Using an existing website asset.';updatePreview();});
 updatePreview();
 wrap.getAsset=async slug=>{
   if(!file)return path.value.trim();
   status('Copying '+file.name+'…');
   const response=await fetch('/__project-builder/asset?project='+encodeURIComponent(slug)+'&name='+encodeURIComponent(file.name),{method:'PUT',headers:{'X-NMESIS-Builder':'1'},body:file});
   const data=await response.json();if(!response.ok)throw Error(data.error);
   path.value=data.src;file=null;upload.value='';note.textContent='Copied into this project.';return data.src;
 };
 return wrap;
}
const basics=$('#basics');
field(basics,'Project title','title','','text',true);
const slugInput=field(basics,'Project address','slug','','text',true);slugInput.pattern='[a-z0-9]+(?:-[a-z0-9]+)*';slugInput.placeholder='e.g. soueast-egypt';
field(basics,'Short introduction','subtitle','','text',true).parentElement.classList.add('wide');
field(basics,'Project story','description','','textarea',true).parentElement.classList.add('wide');
field(basics,'Client','client','','text',true);
field(basics,'Scope','scope','','text',true);
field(basics,'Market','market','','text',true);
field(basics,'Three capabilities, separated by commas','tags','Digital twins, Automotive CGI, Interactive experiences','text',true);
const cover=asset($('#cover'),'Cover image','image','/assets/projects/project-placeholder.svg');
field($('#cover'),'Describe the cover image','coverAlt','Project artwork placeholder','text',true);
let slugTouched=false;slugInput.addEventListener('input',()=>slugTouched=true);
basics.querySelector('[data-field=title]').addEventListener('input',event=>{if(!slugTouched)slugInput.value=event.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');});
function addFilm(){
 const cardNode=card($('#films'),'Film');field(cardNode,'Film title','title','','text',true);field(cardNode,'Film description','description','','textarea');
 const source=asset(cardNode,'Video','video'),poster=asset(cardNode,'Poster image (optional)','image');
 cardNode.read=async slug=>{const src=await source.getAsset(slug);if(!src)throw Error('Choose a video for each film, or remove the empty film.');return {title:val(cardNode,'title'),description:val(cardNode,'description'),src,poster:await poster.getAsset(slug)};};
}
function addGallery(){
 const cardNode=card($('#galleries'),'Gallery');field(cardNode,'Gallery title','title','','text',true);field(cardNode,'Gallery description','description','','textarea');
 const list=el('div','image-list');cardNode.append(list);
 const addImage=file=>{
   const row=el('div','image-row');list.append(row);button('Remove image',()=>row.remove(),row);
   const img=asset(row,'Photo','image','',file);
   const name=file?file.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' '):'';
   field(row,'Image description','alt',name,'text',true);field(row,'Caption','caption',name);
   row.read=async slug=>{const src=await img.getAsset(slug);if(!src)throw Error('Choose an image for each gallery entry.');return {src,alt:val(row,'alt'),caption:val(row,'caption'),...img.dimensions()};};
 };
 button('+ Add existing image',()=>addImage(),cardNode);
 const pick=el('label','upload-pick','Or choose several photos at once');const input=el('input');input.type='file';input.accept='.jpg,.jpeg,.png,.webp,.avif';input.multiple=true;pick.append(input);cardNode.append(pick);
 input.addEventListener('change',()=>{[...input.files].forEach(addImage);input.value='';});
 cardNode.read=async slug=>{if(!list.children.length)throw Error('Add photos to each gallery, or remove the empty gallery.');const images=[];for(const row of list.children)images.push(await row.read(slug));return {title:val(cardNode,'title'),description:val(cardNode,'description'),images};};
}
function addExperience(){
 const cardNode=card($('#experiences'),'Interactive experience');
 field(cardNode,'Experience title','title','','text',true);
 const type=field(cardNode,'Type','type','Vehicle configurator','text',true);type.placeholder='Configurator, interactive brochure or virtual showroom';
 field(cardNode,'Description','description','','textarea');field(cardNode,'Experience link (HTTPS)','url','','url',true);
 const dimensions=el('div','fields');cardNode.append(dimensions);
 for(const [name,value] of [['width',1920],['height',1080]]){const input=field(dimensions,name==='width'?'Original width (px)':'Original height (px)',name,value,'number',true);input.min=100;input.max=8192;}
 cardNode.read=async()=>({title:val(cardNode,'title'),type:val(cardNode,'type'),description:val(cardNode,'description'),url:val(cardNode,'url'),width:Number(val(cardNode,'width')),height:Number(val(cardNode,'height'))});
}
$('#add-film').addEventListener('click',addFilm);$('#add-gallery').addEventListener('click',addGallery);$('#add-experience').addEventListener('click',addExperience);
function status(message,error=false){const node=$('#status');node.className=error?'error':'';node.textContent=message;}
form.addEventListener('input',()=>dirty=true);
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
form.addEventListener('submit',async event=>{
 event.preventDefault();if(busy||!form.reportValidity())return;
 const tags=val(basics,'tags').split(',').map(t=>t.trim()).filter(Boolean);if(tags.length!==3){status('Add exactly three capabilities, separated by commas.',true);return;}
 busy=true;const controls=[...form.querySelectorAll('input,textarea,button')];controls.forEach(c=>c.disabled=true);
 try{
  const slug=val(basics,'slug'),project={slug,tags,cover:await cover.getAsset(slug),coverAlt:val($('#cover'),'coverAlt'),films:[],galleries:[],experiences:[]};
  for(const name of ['title','subtitle','description','client','scope','market'])project[name]=val(basics,name);
  for(const group of ['films','galleries','experiences'])for(const node of document.getElementById(group).children)project[group].push(await node.read(slug));
  status('Creating your project…');
  const response=await fetch('/__project-builder/projects',{method:'POST',headers:{'Content-Type':'application/json','X-NMESIS-Builder':'1'},body:JSON.stringify(project)});
  const data=await response.json();if(!response.ok)throw Error(data.error);
  dirty=false;status('Project created. Your content and assets are saved in the website folder.');
  const link=el('a','','Open project ↗');link.href=data.url;$('#status').append(el('br'),link);
  const download=el('a','','Download project JSON');download.href=URL.createObjectURL(new Blob([JSON.stringify({...project,liveLabel:'Discuss a similar project',liveUrl:'/contact'},null,2)],{type:'application/json'}));download.download=slug+'.json';$('#status').append(el('br'),download);
  $('#status').scrollIntoView({behavior:'smooth',block:'center'});
 }catch(error){status(error.message,true);}finally{busy=false;controls.forEach(c=>c.disabled=false);}
});
fetch('/__project-builder/assets').then(r=>r.json()).then(assets=>{for(const src of assets){const option=el('option');option.value=src;(/\.(mp4|webm)$/i.test(src)?$('#video-assets'):$('#image-assets')).append(option);}}).catch(()=>status('Existing asset suggestions are unavailable. You can still choose files from your computer.',true));
})();
