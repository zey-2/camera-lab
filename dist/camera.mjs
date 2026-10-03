import {getCameraConfig} from './camera-config.mjs';

/** Derive one camera presentation without changing its geometry or exposure model. */
export function describeCamera({state, exposure}) {
  const config=getCameraConfig(state.cameraType);
  const parts=config.partIds.map(id=>({id,
    transform:config.geometry[id].anchor.map((v,i)=>v+(state.viewMode==='exploded'?config.geometry[id].explodedOffset[i]:0)),
    visible:state.viewMode!=='assembled'||!config.parts[id].internal,
    selected:state.selectedPart===id}));
  const hidden=state.viewMode==='assembled' && config.parts[state.selectedPart].internal;
  return {cameraType:state.cameraType,viewMode:state.viewMode,parts,selectedPart:state.selectedPart,
    marker:hidden?{part:state.selectedPart,anchor:config.geometry[state.selectedPart].anchor,label:config.parts[state.selectedPart].name}:null,
    paths:[],apertureOpening:exposure.apertureOpening};
}

const SVG='http://www.w3.org/2000/svg';
const node=(doc,tag,attributes={})=>{const el=doc.createElementNS(SVG,tag);for(const [key,value] of Object.entries(attributes))el.setAttribute(key,value);return el;};
// Authored once in local coordinates; variants share their physical lens and sensor.
const artwork={
 lens:`<path class="part-outline lens-barrel" d="M-75-70H107Q129-70 129 0T107 70H-75Z"/>
 <path d="M72-70V70M91-69V69M106-66V66" class="metal-seam"/><path d="M-38-69V69M-30-69V69M-22-69V69M-14-69V69M-6-69V69M2-69V69M10-69V69M18-69V69M26-69V69" class="lens-ribs"/>
 <ellipse cx="-75" rx="28" ry="70" class="lens-rim"/><ellipse cx="-75" rx="21" ry="58" fill="url(#camera-glass)" stroke="#8fac9c" stroke-width="2"/><ellipse cx="-75" rx="10" ry="35" fill="#0b211f" stroke="#5b867e"/>
 <path d="M-83-42Q-94-10-84 30" fill="none" stroke="#d3e0d0" stroke-width="3" opacity=".55"/><path class="lens-cut-edge" d="M40-47H122V47H40Z"/>
 <path d="M44-46Q62 0 44 46M105-46Q89 0 105 46" class="lens-section-glass"/>`,
 aperture:`<ellipse class="part-outline aperture-ring" rx="23" ry="57"/><ellipse rx="17" ry="47" fill="#19201b"/><path d="M0-46 15-8 7 37M-13-30 12-17 15 25M-17 4 10-18M-9 41-8 2 16 11" class="blade-seam"/><ellipse id="aperture-hole" rx="8" ry="24" fill="#e8bd77" stroke="#ffe0a3"/>`,
 shutter:`<path class="part-outline shutter-frame" d="M-11-48 18-54V48L-11 54Z"/><path d="M-7-34 14-39M-7-18 14-23M-7-2 14-7M-7 14 14 9M-7 30 14 25M-7 46 14 41" class="blade-seam"/>`,
 sensor:`<path class="part-outline sensor-frame" d="M-14-49 19-54V49L-14 54Z"/><path d="M-8-41 13-45V42L-8 46Z" fill="url(#camera-sensor)" stroke="#d8bd85"/><path d="M-8-24 13-28M-8-7 13-11M-8 10 13 6M-8 27 13 23M-1-42V44M6-44V43" stroke="#bad3b4" stroke-opacity=".45"/>`,
 mirror:`<path class="part-outline mirror-surface" d="M-37 34 30-41 37-33-30 41Z"/><path d="M-29 29 27-32" stroke="#d6e5d5" stroke-width="3"/>`,
 'focusing-screen':`<rect class="part-outline focusing-surface" x="-42" y="-5" width="84" height="10" rx="2"/><path d="M-35 0H35" stroke="#e0e5cb"/>`,
 prism:`<path class="part-outline prism-surface" d="M-28 23-16-27H15L28 23Z"/><path d="M-16-27 12 13-28 23M12 13 28 23" fill="none" stroke="#d0d9c8"/>`,
 'optical-finder':`<rect class="part-outline finder-frame" x="-19" y="-14" width="38" height="28" rx="4"/><ellipse rx="8" ry="10" fill="#8ea29a"/>`,
 evf:`<rect class="part-outline finder-frame" x="-22" y="-14" width="44" height="28" rx="4"/><rect x="-15" y="-8" width="30" height="16" fill="#97b7a0"/><path d="m-12 5 8-7 7 5 6-9" fill="none" stroke="#243e36" stroke-width="2"/>`
};

function initialize(svg) {
 const doc=svg.ownerDocument;
 const guides=svg.querySelector('#camera-guides');
 const layer=svg.querySelector('#camera-parts');
 // Body is painted first; opaque assembled mode also hides every internal group.
 for(const id of ['body','lens','aperture','mirror','focusing-screen','prism','optical-finder','evf','shutter','sensor']) {
  const group=node(doc,'g',{id:`part-${id}`,'data-part':id,class:'diagram-part'});
  group.innerHTML=id==='body'?`<path class="body-shell part-outline"/><path class="body-cut-edge"/><path class="body-grip"/><path class="grip-texture"/><ellipse class="mount-ring" cx="0" cy="15" rx="14" ry="76"/><path class="body-top-seam"/><ellipse class="shutter-button" rx="14" ry="5"/><path class="hotshoe"/><circle class="body-fastener" r="2.5"/><path class="strap-lug"/>`:artwork[id];
  const title=node(doc,'title');group.prepend(title);layer.append(group);
  guides.append(node(doc,'line',{'data-guide':id,class:'assembly-guide'}));
 }
 svg.dataset.initialized='true';
}

/** Update stable SVG groups and toolbar attributes, preserving delegated interaction. */
export function renderCamera(root, descriptor) {
 const svg=root.querySelector('#camera-diagram');
 if(!svg.dataset.initialized)initialize(svg);
 const config=getCameraConfig(descriptor.cameraType);
 const $=s=>svg.querySelector(s);
 svg.setAttribute('viewBox',config.viewBox.join(' '));
 svg.dataset.viewMode=descriptor.viewMode;
 svg.dataset.cameraType=descriptor.cameraType;
 $('#camera-desc').textContent=`${descriptor.cameraType==='dslr'?'DSLR with a deep mirrorbox and prism hump':'Mirrorless camera with a shallow body and electronic finder'}. ${descriptor.viewMode} view. Schematic simulation. Select components using the buttons below the lab.`;
 const separated=descriptor.viewMode==='exploded';
 const open=descriptor.viewMode!=='assembled';
 for(const group of svg.querySelectorAll('[data-part]')) {
  const part=descriptor.parts.find(p=>p.id===group.dataset.part);
  group.setAttribute('display',part?.visible?'inline':'none');
  if(!part)continue;
  group.setAttribute('transform',`translate(${part.transform.join(' ')})`);
  group.classList.toggle('is-selected',part.selected);
  group.querySelector('title').textContent=config.parts[part.id].name;
  const guide=$(`[data-guide="${part.id}"]`);
  const [x,y]=config.geometry[part.id].anchor;
  for(const [key,value] of Object.entries({x1:x,y1:y,x2:part.transform[0],y2:part.transform[1]}))guide.setAttribute(key,value);
 }
 for(const guide of svg.querySelectorAll('[data-guide]'))guide.setAttribute('display',separated&&config.partIds.includes(guide.dataset.guide)?'inline':'none');
 const body=$('#part-body');
 const set=(selector,attrs)=>{for(const [key,value] of Object.entries(attrs))body.querySelector(selector).setAttribute(key,value);};
 set('.body-shell',{d:config.outlinePath+(open?' '+config.cutawayPath:''),'fill-rule':'evenodd'});
 set('.body-cut-edge',{d:config.cutawayPath,display:open?'inline':'none'});
 set('.body-grip',{d:config.gripPath});
 const grip=descriptor.cameraType==='dslr'?210:171;
 set('.grip-texture',{d:`M${grip-9}-29V72m7-106V77m7-111V74`});
 set('.shutter-button',{cx:grip-4,cy:-68});
 set('.body-top-seam',{d:`M15-59H40M137-59H${grip-18}`});
 set('.hotshoe',{d:descriptor.cameraType==='dslr'?'M67-111v-2h28v2':'M61-95v-2h34v2'});
 set('.body-fastener',{cx:grip-20,cy:91});
 set('.strap-lug',{d:`M${grip+13}-41h11v12h-10`});
 $('#aperture-hole').setAttribute('ry',Math.min(40,descriptor.apertureOpening).toFixed(2));
 $('#aperture-hole').setAttribute('rx',(Math.min(40,descriptor.apertureOpening)*.32).toFixed(2));
 const marker=$('#camera-location');
 marker.setAttribute('display',descriptor.marker?'inline':'none');
 if(descriptor.marker){marker.setAttribute('transform',`translate(${descriptor.marker.anchor.join(' ')})`);marker.querySelector('title').textContent=descriptor.marker.label+' location inside the housing';}
 for(const button of root.querySelectorAll('button[data-camera-type]'))button.setAttribute('aria-pressed',String(button.dataset.cameraType===descriptor.cameraType));
 for(const button of root.querySelectorAll('button[data-view-mode]'))button.setAttribute('aria-pressed',String(button.dataset.viewMode===descriptor.viewMode));
 root.querySelector('#camera-mode-note').textContent=descriptor.marker?`${descriptor.marker.label.replace(/^The /,'')} inside housing`:separated?'Alignment guides · parts separated':open?'Side panel removed':'Complete light-tight housing';
 root.querySelector('#open-cutaway').hidden=!descriptor.marker;
}
