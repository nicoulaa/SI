'use strict';
const $ = id => document.getElementById(id);
let items=[],shown=[],folder='',selected=null,scale=1,x=0,y=0,loadVersion=0,imageVersion=0,drag=null,background=0;
const stage=$('stage'),image=$('fullImage'),viewer=$('viewer');
let detailWplaceUrl=null;
// Some exporters write literal \n separators outside JSON strings.
function parseWplace(text){
 text=text.replace(/^\uFEFF/,'');
 try{return JSON.parse(text)}catch(original){
  let result='',quoted=false,escaped=false;
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(quoted){result+=c;if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;}
   else if(c==='"'){quoted=true;result+=c;}
   else if(c==='\\'&&['n','r','t'].includes(text[i+1])){result+=' ';i++;}
   else result+=c;
  }
  return JSON.parse(result);
 }
}
function imageSource(data){
 const src=data?.image?.dataUrl;
 if(typeof src!=='string'||!/^data:image\/(png|jpeg|jpg|webp|gif|bmp);base64,[A-Za-z0-9+/=\s]+$/i.test(src))throw new Error('Image intégrée absente ou format non pris en charge');
 return src;
}
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function size(bytes){return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(bytes/1024)+' Ko';}
$('openFolder').onclick=()=>$('folderInput').click();$('openFiles').onclick=()=>$('filesInput').click();
$('folderInput').onchange=e=>loadFiles(e.target.files);$('filesInput').onchange=e=>loadFiles(e.target.files);
async function loadFiles(fileList){
 const version=++loadVersion;setSource(false);const files=Array.from(fileList).filter(f=>/\.wplace$/i.test(f.name));
 if(viewer.open)viewer.close();
 $('count').textContent='Lecture des fichiers…';$('errors').hidden=true;
 const loaded=[],errors=[];
 for(const file of files){
  try{const data=parseWplace(await file.text()),src=imageSource(data),path=file.webkitRelativePath||file.name;
   loaded.push({file,data,src,path,dir:path.includes('/')?path.slice(0,path.lastIndexOf('/')):'',name:String(data.name||file.name)});
  }catch(error){errors.push(file.name+' : '+error.message);}
  if(version!==loadVersion)return;
 }
 items=loaded.sort((a,b)=>a.path.localeCompare(b.path,'fr',{numeric:true}));folder='';selected=null;$('search').value='';
 renderTree();renderGrid();
 if(errors.length){$('errors').textContent=errors.length+' fichier(s) illisible(s) :\n'+errors.join('\n');$('errors').hidden=false;}
 $('folderInput').value='';$('filesInput').value='';
}
function renderTree(){
 const tree=$('tree');tree.replaceChildren();
 function button(label,path,parent){const b=el('button',label);b.dataset.path=path;b.onclick=()=>{folder=path;selected=null;renderGrid();markFolder();};parent.append(b);}
 button('▧ Tous les fichiers','',tree);
 const root={children:new Map()};
 for(const item of items){let node=root,path='';for(const part of item.dir.split('/').filter(Boolean)){path=path?path+'/'+part:part;if(!node.children.has(part))node.children.set(part,{path,children:new Map()});node=node.children.get(part);}}
 function branch(node,parent){for(const [name,child]of node.children){const wrap=el('div');if(child.children.size){const d=el('details');d.open=true;d.append(el('summary',name));button('▣ Ce dossier et ses sous-dossiers',child.path,d);branch(child,d);wrap.append(d);}else button('▣ '+name,child.path,wrap);parent.append(wrap);}}
 branch(root,tree);markFolder();
}
function markFolder(){for(const b of $('tree').querySelectorAll('button')){b.classList.toggle('active',b.dataset.path===folder);b.setAttribute('aria-pressed',String(b.dataset.path===folder));}}
function currentBase(){
 if(folder)return folder;
 const roots=new Set(items.map(item=>item.path.includes('/')?item.path.split('/')[0]:''));
 return roots.size===1?[...roots][0]:'';
}
function relativeDir(item,base=currentBase()){
 return base&&item.dir===base?'':base&&item.dir.startsWith(base+'/')?item.dir.slice(base.length+1):item.dir;
}
function compareItems(a,b,mode,base){
 const ad=relativeDir(a,base),bd=relativeDir(b,base);
 if(ad!==bd){if(!ad)return -1;if(!bd)return 1;return ad.localeCompare(bd,'fr',{numeric:true});}
 if(mode==='modified'||mode==='created'){
  const av=mode==='created'?a.created:a.file.lastModified,bv=mode==='created'?b.created:b.file.lastModified;
  if(av==null&&bv!=null)return 1;if(bv==null&&av!=null)return -1;
  const delta=bv-av;
  if(Number.isFinite(delta)&&delta)return delta;
 }
 const names=a.file.name.localeCompare(b.file.name,'fr',{numeric:true});
 return (mode==='name-desc'?-names:names)||a.path.localeCompare(b.path,'fr',{numeric:true});
}
function renderGrid(){
 const query=$('search').value.toLocaleLowerCase('fr'),base=currentBase();
 shown=items.filter(item=>(!folder||item.dir===folder||item.dir.startsWith(folder+'/'))&&(item.name+' '+item.path).toLocaleLowerCase('fr').includes(query)).sort((a,b)=>compareItems(a,b,$('sort').value,base));
 if(!shown.includes(selected))selected=shown[0]||null;
 $('folderTitle').textContent=folder||'Tous les overlays';$('count').textContent=shown.length+' image(s) · '+items.length+' fichier(s) chargé(s)';
 const grid=$('grid');grid.replaceChildren();
 for(const item of shown){const card=el('article',undefined,'card');card.title=item.name+'\n'+item.path;card.tabIndex=0;card.setAttribute('role','button');const thumb=el('div',undefined,'thumb'),im=el('img');im.src=item.src;im.alt=item.name;im.loading='lazy';im.onerror=()=>{thumb.replaceChildren(el('span','Image illisible'));};thumb.append(im);
  const caption=el('div',undefined,'caption');const subdir=relativeDir(item,base);const title=el('strong',(subdir?'▣ '+subdir+' / ':'')+item.file.name);title.title=item.file.name;const location=el('small',subdir?'Sous-dossier : '+subdir:'Dossier courant');location.title=item.path;caption.append(title,location);const actions=el('div',undefined,'card-actions');const open=el('button','Visionner');open.type='button';open.onclick=()=>openImage(item);const save=el('button',undefined,'download-icon');save.type='button';save.title='Télécharger le fichier Wplace';save.setAttribute('aria-label','Télécharger le fichier Wplace : '+item.file.name);save.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3"/></svg>';save.onclick=()=>downloadWplace(item);actions.append(open,save);card.append(thumb,caption,actions);
  card.onclick=e=>{if(e.target===card||e.target===thumb||e.target===im||e.target===caption||e.target===title||e.target===location)select(item);};card.ondblclick=e=>{if(!e.target.closest('button'))openImage(item);};card.onkeydown=e=>{if(e.target===card&&e.key==='Enter'){e.preventDefault();openImage(item);}else if(e.target===card&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();move(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1);}};
  grid.append(card);
 }
 markSelection();$('empty').hidden=shown.length>0;
 $('empty').querySelector('h2').textContent=items.length?'Aucune image correspondante':'Une fenêtre sur vos créations';
}
function markSelection(){[...$('grid').children].forEach((card,i)=>{card.classList.toggle('selected',shown[i]===selected);card.setAttribute('aria-pressed',String(shown[i]===selected));});}
function select(item,focus=false){selected=item;markSelection();if(focus){const card=$('grid').children[shown.indexOf(item)];card?.focus({preventScroll:true});card?.scrollIntoView({block:'nearest'});}}
$('search').oninput=renderGrid;
$('sort').onchange=renderGrid;
function cleaned(value){if(Array.isArray(value))return value.map(cleaned);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='dataUrl'?'[Image intégrée masquée]':cleaned(v)]));return value;}
function metadata(item){
 const list=$('metadata');list.replaceChildren();
 function row(label,value){list.append(el('dt',label),el('dd',typeof value==='object'?JSON.stringify(value,null,2):String(value)));}
 row('Fichier',item.file.name);row('Chemin relatif',item.path);row(item.online?'Dernière modification (Git)':'Dernière modification',formatDate(item.file.lastModified));row(item.online?'Première apparition (Git)':'Date de création',item.online?formatDate(item.created):'Non fournie par le navigateur');row('Taille du fichier',size(item.file.size));
 row('Dimensions réelles',image.naturalWidth+' × '+image.naturalHeight+' px');
 for(const [key,value]of Object.entries(item.data))row(key,key==='image'?cleaned(value):value);
 $('raw').textContent=JSON.stringify(cleaned(item.data),null,2);
 $('download').href=item.src;$('download').download=item.file.name.replace(/\.wplace$/i,'')+'.'+(/^data:image\/jpeg/i.test(item.src)?'jpg':item.src.slice(11,item.src.indexOf(';')));
 setWplaceDownload(item);
}
function openImage(item){
 select(item);const version=++imageVersion;image.hidden=true;
 $('imageTitle').textContent=item.file.name;$('imageTitle').title=item.file.name;$('imagePath').textContent=item.path;$('imagePath').title=item.path;
 $('fileName').value=item.file.name;$('filePath').value=item.path;$('copyStatus').textContent='';
 if(!viewer.open)viewer.showModal();
 image.onload=()=>{if(version!==imageVersion)return;image.hidden=false;metadata(item);fit();};
 image.onerror=()=>{if(version!==imageVersion)return;$('metadata').replaceChildren(el('dd','Impossible de décoder cette image.'));};
 image.src=item.src;stage.focus();updateNavigation();
}
function updateNavigation(){const index=shown.indexOf(selected);$('previous').disabled=index<=0;$('next').disabled=index>=shown.length-1;}
function move(amount){const i=shown.indexOf(selected),next=shown[Math.max(0,Math.min(shown.length-1,i+amount))];if(next){if(viewer.open)openImage(next);else select(next,true);}}
function paint(){image.style.transform=`translate(${x}px,${y}px) scale(${scale})`;$('zoomLabel').value=Math.round(scale*100)+' %';}
function fit(){if(!image.naturalWidth)return;scale=Math.min((stage.clientWidth-32)/image.naturalWidth,(stage.clientHeight-32)/image.naturalHeight,1);scale=Math.max(.001,scale);x=(stage.clientWidth-image.naturalWidth*scale)/2;y=(stage.clientHeight-image.naturalHeight*scale)/2;paint();}
function zoom(factor,cx=stage.clientWidth/2,cy=stage.clientHeight/2){const next=Math.max(.001,Math.min(64,scale*factor)),ratio=next/scale;x=cx-(cx-x)*ratio;y=cy-(cy-y)*ratio;scale=next;paint();}
$('zoomIn').onclick=()=>zoom(1.3);$('zoomOut').onclick=()=>zoom(1/1.3);$('fit').onclick=fit;$('actual').onclick=()=>zoom(1/scale);
$('previous').onclick=()=>move(-1);$('next').onclick=()=>move(1);$('close').onclick=()=>viewer.close();
viewer.addEventListener('close',()=>{drag=null;stage.classList.remove('dragging');select(selected,true);});
$('background').onclick=()=>{background=(background+1)%3;stage.classList.toggle('light',background===1);stage.classList.toggle('dark',background===2);};
stage.addEventListener('wheel',e=>{e.preventDefault();const r=stage.getBoundingClientRect();zoom(Math.exp(-Math.max(-150,Math.min(150,e.deltaY))*.008),e.clientX-r.left,e.clientY-r.top);},{passive:false});
stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:x,oy:y};stage.setPointerCapture(e.pointerId);stage.classList.add('dragging');});
stage.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;x=drag.ox+e.clientX-drag.x;y=drag.oy+e.clientY-drag.y;paint();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(event,()=>{drag=null;stage.classList.remove('dragging');});
stage.ondblclick=fit;
document.addEventListener('keydown',e=>{
 if(e.target.matches('input,textarea,select')||e.ctrlKey||e.metaKey||e.altKey)return;
 if(viewer.open){if(e.key==='ArrowLeft'){e.preventDefault();move(-1);}if(e.key==='ArrowRight'){e.preventDefault();move(1);}if(['+','='].includes(e.key)){e.preventDefault();zoom(1.3);}if(e.key==='-'){e.preventDefault();zoom(1/1.3);}if(e.key==='0'){e.preventDefault();fit();}return;}
 if(e.target.closest('aside,header'))return;
 let delta=0;const grid=$('grid'),card=grid.firstElementChild,columns=card?Math.max(1,Math.round((grid.clientWidth+18)/(card.getBoundingClientRect().width+18))):1;
 if(e.key==='ArrowRight')delta=1;if(e.key==='ArrowLeft')delta=-1;if(e.key==='ArrowDown')delta=columns;if(e.key==='ArrowUp')delta=-columns;
 if(delta){e.preventDefault();move(delta);}else if(e.key==='Enter'&&selected&&!e.target.closest('button')){e.preventDefault();openImage(selected);}
});
window.addEventListener('resize',()=>{if(viewer.open)fit();});

async function copyIdentity(id){
 const field=$(id),text=field.value;
 try{await navigator.clipboard.writeText(text);$('copyStatus').textContent='Copié dans le presse-papiers.';}
 catch(error){
  // Clipboard API may be unavailable for file:// pages. Keep a manual fallback.
  field.focus();field.select();
  let copied=false;try{copied=document.execCommand('copy');}catch(ignore){}
  $('copyStatus').textContent=copied?'Copié dans le presse-papiers.':'Texte sélectionné : utilisez Ctrl+C ou ⌘C pour copier.';
 }
}
$('copyName').onclick=()=>copyIdentity('fileName');
$('copyPath').onclick=()=>copyIdentity('filePath');

function formatDate(value){return value==null?'Non disponible':new Date(value).toLocaleString('fr-FR');}
function setSource(online){
 $('sourceLabel').textContent=online?'Mode en ligne · Overlays du dépôt':'Mode local · Hors ligne';
 $('createdOption').disabled=!online;
 if(!online&&$('sort').value==='created')$('sort').value='name-asc';
 $('sortNote').textContent='Fichiers du dossier courant en premier, puis sous-dossiers par ordre alphabétique. '+(online?'Dates : première apparition et dernière modification dans Git.':'La date de création n’est pas fournie par le navigateur.');
}
function catalogueURL(path){
 if(typeof path!=='string'||!path.startsWith('Overlays/')||!path.toLowerCase().endsWith('.wplace')||path.split('/').some(part=>!part||part==='.'||part==='..'||part.includes('\\')))throw new Error('Chemin de catalogue non valide');
 return new URL('../'+path.split('/').map(encodeURIComponent).join('/'),location.href).href;
}
async function loadOnline(){
 const version=++loadVersion;
 if(viewer.open)viewer.close();
 $('count').textContent='Chargement des overlays en ligne…';$('errors').hidden=true;
 try{
  const response=await fetch(new URL('catalogue.json',location.href),{cache:'no-cache'});
  if(!response.ok)throw new Error('Catalogue indisponible (HTTP '+response.status+').');
  const catalogue=await response.json();
  if(catalogue.version!==1||!Array.isArray(catalogue.files))throw new Error('Format du catalogue non reconnu.');
  const loaded=[],errors=[];
  for(const entry of catalogue.files){
   if(version!==loadVersion)return;
   try{
    const response=await fetch(catalogueURL(entry.path));
    if(!response.ok)throw new Error('HTTP '+response.status);
    const text=await response.text(),data=parseWplace(text),src=imageSource(data),path=entry.path;
    const date=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
    loaded.push({path,dir:path.slice(0,path.lastIndexOf('/')),name:String(data.name||path.split('/').pop()),data,src,online:true,url:catalogueURL(entry.path),created:date(entry.created),file:{name:path.split('/').pop(),size:new Blob([text]).size,lastModified:date(entry.modified)}});
   }catch(error){errors.push(String(entry.path)+' : '+error.message);}
  }
  if(version!==loadVersion)return;
  items=loaded.sort((a,b)=>a.path.localeCompare(b.path,'fr',{numeric:true}));folder='';selected=null;$('search').value='';
  setSource(true);renderTree();renderGrid();
  if(errors.length){$('errors').textContent=errors.length+' fichier(s) illisible(s) :\n'+errors.join('\n');$('errors').hidden=false;}
 }catch(error){
  if(version!==loadVersion)return;
  $('errors').textContent='Chargement en ligne impossible : '+error.message+' Vous pouvez réessayer avec « Overlays en ligne » ou ouvrir un dossier local.';$('errors').hidden=false;
  $('count').textContent=items.length+' fichier(s) chargé(s)';
 }
}
$('openOnline').onclick=loadOnline;
if(['http:','https:'].includes(location.protocol)){
 $('openOnline').hidden=false;
 loadOnline();
}

function setWplaceDownload(item){
 const link=$('downloadWplace');
 if(detailWplaceUrl){URL.revokeObjectURL(detailWplaceUrl);detailWplaceUrl=null;}
 if(item.online){link.href=item.url;}
 else {detailWplaceUrl=URL.createObjectURL(item.file);link.href=detailWplaceUrl;}
 link.download=item.file.name;
}
function downloadWplace(item){
 const href=item.online?item.url:URL.createObjectURL(item.file);
 const link=el('a');link.href=href;link.download=item.file.name;link.hidden=true;document.body.append(link);link.click();link.remove();
 if(!item.online)setTimeout(()=>URL.revokeObjectURL(href),1000);
}
