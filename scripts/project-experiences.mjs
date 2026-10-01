export function experienceCapsule(item,e,actions=null) {
    const url=new URL(item.url);if(url.protocol!=='https:')throw new Error('Configurator URL must use HTTPS');
    const width=Number(item.width)||1920,height=Number(item.height)||1080;
    if(width<=0||height<=0)throw new Error('Invalid embed dimensions');
    const streaming=item.type==='Pixel streaming';
    return `<div class="collection-experience-scene"><div class="collection-scene-content"><div class="case-capsule" data-embed-capsule data-embed-width="${width}" data-embed-height="${height}" style="--embed-ratio:${width}/${height}"><div class="case-capsule-toolbar"><span><i aria-hidden="true"></i> ${e(item.model)} ${streaming?'pixel streaming':'configurator'}</span><div><button type="button" ${actions?'class="svc-motion"':''} data-embed-fullscreen>${actions?actions('Fullscreen'):'Fullscreen ↗'}</button><a ${actions?'class="svc-motion"':''} href="${e(item.url)}" target="_blank" rel="noopener noreferrer">${actions?actions('Open separately'):'Open separately ↗'}</a></div></div><div class="case-embed-stage"><iframe data-embed-src="${e(item.url)}" title="${e(item.title)}" width="${width}" height="${height}" allow="${streaming?'autoplay; fullscreen':'fullscreen'}" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" tabindex="-1" hidden></iframe><div class="case-embed-cover collection-configurator-cover"><img src="${e(item.poster)}" alt="${e(item.model)} opening view" loading="lazy"><button class="case-action${actions?' svc-motion':''}" type="button" data-embed-launch>${actions?actions('Explore '+item.model):`Explore ${e(item.model)} <span aria-hidden="true">↗</span>`}</button></div></div><p class="case-embed-note">${streaming?'Launch the live experience. Open fullscreen for the best view.':'Drag to explore the vehicle. Open fullscreen for a closer look.'}</p></div></div></div>`;
}

// Shared capsules with optional format tabs containing independent model tabs.
export function projectExperiences(project,e,header,number) {
  const brand=project.brand || project.title.replace(/\.$/,'');
  const groups=(project.experienceGroups || []).filter(group=>group.experiences?.length);
  const rollingLabel=text=>`<span class="experience-tab-label" aria-hidden="true"><span>${e(text)}</span><span>${e(text)}</span></span>`;
  const capsule=item=>experienceCapsule(item,e);
  const models=(items,defaultModel,prefix='model')=>{
    const selected=Math.max(0,items.findIndex(item=>item.model===defaultModel));
    return `<div class="collection-model-tabs" style="--model-columns:${items.length>5?3:items.length}" role="tablist" aria-label="Choose a ${e(brand)} model">${items.map((item,i)=>`<button type="button" role="tab" id="${prefix}-tab-${i}" aria-controls="${prefix}-panel-${i}" aria-label="${e(item.model)}" aria-selected="${i===selected}" tabindex="${i===selected?0:-1}">${groups.length?rollingLabel(item.model):e(item.model)}</button>`).join('')}</div>${items.map((item,i)=>`<div class="collection-model-panel" role="tabpanel" id="${prefix}-panel-${i}" aria-labelledby="${prefix}-tab-${i}" ${i===selected?'':'hidden'}>${capsule(item)}</div>`).join('')}`;
  };
  const heading=header(number,project.experienceTitle || 'Get behind the experience.',project.experienceDescription || `Choose a ${brand} model, then step inside its live configurator.`);
  if(groups.length){
    const selected=Math.max(0,groups.findIndex(group=>group.id===project.defaultExperienceGroup));
    return `<section class="case-section collection-experiences collection-experience-formats" id="experience-1" data-service-group>${heading}<div class="collection-format-tabs" style="--format-count:${groups.length};--format-index:${selected}" role="tablist" aria-label="Choose a configurator format">${groups.map((group,i)=>`<button type="button" role="tab" id="experience-format-tab-${i}" aria-controls="experience-format-panel-${i}" aria-label="${e(group.label)}" aria-selected="${i===selected}" tabindex="${i===selected?0:-1}">${rollingLabel(group.label)}</button>`).join('')}</div>${groups.map((group,i)=>`<div class="collection-format-panel" role="tabpanel" id="experience-format-panel-${i}" aria-labelledby="experience-format-tab-${i}" ${i===selected?'':'hidden'} data-service-group><p class="collection-format-description">${e(group.description || '')}</p>${models(group.experiences,group.defaultExperience,`format-${i}-model`)}</div>`).join('')}</section>`;
  }
  const items=project.experiences || [];
  return items.length?`<section class="case-section collection-experiences" id="experience-1" data-service-group>${heading}${models(items,project.defaultExperience)}</section>`:'';
}
