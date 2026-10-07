(function(){
'use strict';
const tools=document.querySelector('.header-tools');
if(!tools)return;
const panel=document.createElement('div');panel.className='common-tools-panel';panel.id='commonToolsPanel';panel.hidden=true;
const actions=['openTemplates()','openImgTool()','TranscriptImport.openStandalone()'];
const names=['常用範本','圖片編輯','謄本分析'];
actions.forEach((action,i)=>{const button=tools.querySelector('[onclick="'+action+'"]');if(!button)return;button.className='common-tools-item';button.type='button';button.lastChild.textContent=' '+names[i];button.addEventListener('click',()=>close());panel.append(button);});
const wrap=document.createElement('div');wrap.className='common-tools-wrap';
const trigger=document.createElement('button');trigger.type='button';trigger.className='header-btn';trigger.textContent='常用工具 ▾';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',panel.id);wrap.append(trigger,panel);tools.prepend(wrap);
const checkin=tools.querySelector('.mc-checkin'),performance=tools.querySelector('[onclick="openPerformance()"]');performance.after(checkin);
function close(){panel.hidden=true;document.querySelectorAll('[aria-controls="commonToolsPanel"]').forEach(b=>b.setAttribute('aria-expanded','false'));}
let opener=trigger;
function toggle(button){const show=panel.hidden;close();if(show){window.closeHeaderMore?.();wrap.append(panel);if(button!==trigger)button.parentElement.append(panel);panel.hidden=false;button.setAttribute('aria-expanded','true');opener=button;}}
trigger.onclick=()=>toggle(trigger);
document.addEventListener('click',e=>{if(!panel.contains(e.target)&&!e.target.closest('[aria-controls="commonToolsPanel"]'))close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){close();opener.focus();}});
const mobile=document.querySelector('.mobile-cloud [onclick="openTemplates()"]');
if(mobile){mobile.removeAttribute('onclick');mobile.textContent='常用工具 ▾';mobile.setAttribute('aria-controls',panel.id);mobile.setAttribute('aria-expanded','false');mobile.onclick=()=>toggle(mobile);}
document.querySelectorAll('#mobileSettingMenu button').forEach(b=>{if(/openImgTool|TranscriptImport/.test(b.getAttribute('onclick')||''))b.remove();});
document.querySelector('#imgToolModal .modal-title')?.childNodes.forEach(n=>{if(n.nodeType===3)n.textContent=n.textContent.replace('圖片工具','圖片編輯');});
})();
