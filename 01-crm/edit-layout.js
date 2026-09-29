/* Layout only: preserve original form elements and save handlers. */
(function(){
'use strict';
const modal=document.getElementById('fModal'),body=modal.querySelector('.modal-body'),desktop=matchMedia('(min-width:1200px)');
let originalChildren=null;
const style=document.createElement('style');
style.textContent=[
'#fModal.edit-layout{padding:20px!important}',
'#fModal.edit-layout>.modal{width:96vw;max-width:1560px;height:90dvh;max-height:90dvh;display:flex;flex-direction:column;overflow:hidden}',
'#fModal.edit-layout .modal-head{flex-shrink:0;min-height:58px;padding:10px 18px;border-radius:18px 18px 0 0}',
'#fModal.edit-layout #formTitle{font-size:17px;color:#173756}',
'#fModal.edit-layout #editClientName{font-size:22px!important;color:#173756!important}',
'#fModal.edit-layout>.modal>.modal-body{display:grid;grid-template-columns:minmax(0,28fr) minmax(0,46fr) minmax(0,26fr);padding:0;flex:1;min-height:0;overflow:hidden}',
'.edit-pane{min-width:0;min-height:0;overflow-y:auto;overflow-x:hidden;padding:14px 16px;overscroll-behavior:contain;scrollbar-gutter:stable}',
'.edit-pane+.edit-pane{border-left:1px solid #e7e5e4}',
'.edit-pane-heading{font-size:17px;color:#173756;margin:0 0 12px;font-weight:700}',
'.edit-property-head{position:sticky;top:-14px;background:white;z-index:5;margin:-14px 0 12px;padding:14px 0 8px;border-bottom:1px solid #e2e8f0}',
'#fModal.edit-layout .type-picker{display:flex;flex-wrap:wrap;gap:5px;margin:0}',
'#fModal.edit-layout .tp-btn{flex:1 0 auto;min-width:54px;padding:7px 10px;font-size:14px;border:1px solid #e2e8f0!important;border-radius:8px;background:#f1f5f9;color:#64748b;box-shadow:none}',
'#fModal.edit-layout .tp-btn.selected{background:var(--edit-type-color)!important;color:white!important;border-color:var(--edit-type-color)!important;font-weight:800}',
'#fModal .tp-buyer{--edit-type-color:#1D4ED8}#fModal .tp-seller{--edit-type-color:#059669}#fModal .tp-landlord{--edit-type-color:#0891B2}#fModal .tp-tenant{--edit-type-color:#DB2777}#fModal .tp-closed{--edit-type-color:#D97706}#fModal .tp-potential{--edit-type-color:#DC2626}',
'#fModal.edit-layout .tp-btn.active-view{outline:2px solid #173756;outline-offset:2px;box-shadow:inset 0 -3px 0 #17375655}',
'#typeNotesArea [hidden]{display:none!important}',
'#fModal.edit-layout .tp-btn:focus-visible{outline:2px solid #0284c7;outline-offset:2px}',
'#fModal.edit-layout .sec-title{font-size:14px;color:#475569;margin-top:10px!important;padding-bottom:6px}',
'#fModal.edit-layout .edit-basic>.sec-title:first-of-type{display:none}',
'#fModal.edit-layout .fg{min-width:0}',
'#fModal.edit-layout .fg label{font-size:13px;color:#64748b}',
'#fModal.edit-layout input:not([type=checkbox]):not([type=radio]),#fModal.edit-layout select,#fModal.edit-layout textarea{min-width:0;max-width:100%;box-sizing:border-box;font-size:14px;border-radius:7px}',
'#fModal.edit-layout .roc-date-wrap{min-width:0}',
'#fModal.edit-layout .edit-basic [style*="grid-template-columns"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}',
'#fModal.edit-layout .edit-pane [style*="grid-template-columns:1fr 1fr 1fr 1fr"]{grid-template-columns:repeat(2,minmax(0,1fr))!important}',
'#fModal.edit-layout .edit-basic [data-addr-row]{grid-template-columns:80px minmax(0,1fr)!important}',
'#fModal.edit-layout .edit-basic [data-addr-row]>.fg:nth-child(3){grid-column:1/-1}',
'#fModal.edit-layout .edit-basic [style*="grid-column:span"]{grid-column:1/-1!important}',
'#fModal.edit-layout .edit-pane .person-block{background:#f8fafc!important;border-left-color:#cfdae5!important}',
'#fModal.edit-layout #scheduleList .c-row{display:flex;flex-wrap:wrap;background:#f0f6fb!important;border-left-color:#c4d9ec!important}',
'#fModal.edit-layout #scheduleList .c-row>input{flex-basis:100%!important}',
'#fModal.edit-layout #scheduleList .roc-date-wrap{width:auto!important;flex:1 1 150px!important}',
'#fModal.edit-layout #scheduleList .sched-recur{flex:1}',
'#fModal.edit-layout>.modal>.modal-foot{flex-shrink:0;padding:10px 18px;border-top:1px solid #e2e8f0;background:#fff;display:flex;justify-content:flex-end;gap:8px}',
'#fModal.edit-layout .modal-foot .btn{min-width:88px;padding:9px 20px;border-radius:8px;font-size:15px}',
'#fModal.edit-layout .modal-foot .btn-save{background:#173756}'
].join('');
document.head.append(style);
function restore(){if(!originalChildren)return;const contact=modal.querySelector('.edit-basic>.edit-pane-heading .add-row-btn');if(contact)document.querySelector('#sharedContactsWrap .sec-title').append(contact);body.replaceChildren(...originalChildren);originalChildren=null;modal.classList.remove('edit-layout');}
function arrange(){
 if(!desktop.matches||!editId||originalChildren)return;
 originalChildren=[...body.children];
 const make=(name,title)=>{const pane=document.createElement('section');pane.className='edit-pane edit-'+name;pane.setAttribute('aria-label',title);const heading=document.createElement('h2');heading.className='edit-pane-heading';heading.textContent=title;pane.append(heading);return pane;};
 const basic=make('basic','基本資料'),property=make('property','物件與其他資料'),followup=make('followup','行程與備註');
 const picker=body.querySelector('.type-picker'),pickerTitle=picker.previousElementSibling,head=document.createElement('div');head.className='edit-property-head';head.append(property.firstElementChild,picker);property.append(head);
 let section='basic';
 for(const child of originalChildren){if(child===picker||child===pickerTitle)continue;if(child.classList.contains('type-sec'))section='property';if(child.classList.contains('sec-title')&&child.textContent.trim()==='預排行程')section='followup';(section==='basic'?basic:section==='property'?property:followup).append(child);}
 const contact=basic.querySelector('#sharedContactsWrap .add-row-btn');if(contact){basic.firstElementChild.classList.add('edit-add-heading');basic.firstElementChild.append(contact);}body.replaceChildren(basic,property,followup);modal.classList.add('edit-layout');
}
const tabStates=new Map();
const tabStyle=document.createElement('style');
tabStyle.textContent='.edit-object-tabs{display:flex;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;padding:7px;background:#f6f8fa;border:1px solid #e2e8f0;border-radius:9px;margin:8px 0 10px}.edit-object-tabs[hidden]{display:none!important}.edit-object-tabs button{flex:0 0 auto;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid #cbd5e1;border-radius:7px;background:white;color:#173756;font:inherit;font-size:14px;padding:7px 11px;cursor:pointer}.edit-object-tabs button[aria-selected=true]{background:#173756;color:white;border-color:#173756}.edit-object-tabs button:focus-visible{outline:2px solid #0284c7;outline-offset:1px}.edit-object-page[hidden]{display:none!important}#fModal .edit-add-heading{display:flex;align-items:center;gap:10px;flex-wrap:wrap}#fModal .edit-add-heading>.add-row-btn{width:auto;margin:0;padding:5px 10px;font-size:13px;border:1px solid #cbd9e6;border-radius:7px;background:#f0f6fb;color:#173756;line-height:1.4}';
tabStyle.textContent+='#fModal :is(.rp-mgmt-row,.sp-mgmt-row){align-items:flex-end}#fModal :is(.rp-mgmt-row,.sp-mgmt-row)>div{display:flex;flex-direction:column}#fModal :is(.rp-mgmt-row,.sp-mgmt-row)>div>label{height:18px;line-height:18px;margin-bottom:4px!important}#fModal :is(.rp-mgmt-row,.sp-mgmt-row) :is(select,input,.input-sfx,[data-f="mgmtTotal"]){height:38px;box-sizing:border-box}#fModal :is(.rp-mgmt-row,.sp-mgmt-row) .input-grp{height:38px}#fModal :is(.rp-mgmt-row,.sp-mgmt-row) :is(.input-sfx,[data-f="mgmtTotal"]){display:flex;align-items:center;justify-content:center;padding-top:0!important;padding-bottom:0!important}';
document.head.append(tabStyle);
function moveAddButtons(){
 for(const button of modal.querySelectorAll('.add-row-btn')){
  if(button.closest('#typeNotesArea')||button.parentElement.classList.contains('edit-add-heading'))continue;
  let sibling=button.previousElementSibling;
  while(sibling&&!sibling.classList.contains('sec-title'))sibling=sibling.previousElementSibling;
  if(sibling){sibling.classList.add('edit-add-heading');sibling.append(button);}
 }
}
function setupObjectTabs(){
 for(const id of ['sPropertyList','rPropertyList','dealList','dAddrList']){
  const list=document.getElementById(id);if(!list||tabStates.has(id))continue;
  const nav=document.createElement('div');nav.className='edit-object-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','選擇編輯物件');list.before(nav);
  const state={active:null,known:new Set(),nav,list};tabStates.set(id,state);
  const rows=()=>[...list.children].filter(el=>el.matches('.person-block,.deal-box'));
  function refresh(){
   const items=rows(),added=items.filter(el=>!state.known.has(el));
   if(!items.includes(state.active))state.active=items[0]||null;
   if(added.length&&state.known.size)state.active=added[added.length-1];
   state.known=new Set(items);
   const names=items.map((row,i)=>row.querySelector('[data-f="community"],.deal-community')?.value.trim()||row.querySelector('[data-f="addr"],.deal-addr')?.value.trim()||'物件 '+(i+1));
   nav.replaceChildren();nav.hidden=!items.length;
   items.forEach((row,i)=>{row.classList.add('edit-object-page');row.hidden=row!==state.active;const button=document.createElement('button');button.type='button';button.textContent=names[i]+(names.filter(name=>name===names[i]).length>1?'（'+(i+1)+'）':'');button.setAttribute('role','tab');button.setAttribute('aria-selected',String(row===state.active));button.tabIndex=row===state.active?0:-1;button.setAttribute('aria-controls',row.id);row.setAttribute('role','tabpanel');button.onclick=()=>{state.active=row;refresh();};button.onkeydown=event=>{let n=i;if(event.key==='ArrowRight')n=(i+1)%items.length;else if(event.key==='ArrowLeft')n=(i+items.length-1)%items.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=items.length-1;else return;event.preventDefault();event.stopPropagation();state.active=items[n];refresh();nav.children[n].focus();};nav.append(button);});
  }
  state.refresh=refresh;
  new MutationObserver(refresh).observe(list,{childList:true});
  list.addEventListener('input',event=>{if(event.target.matches('[data-f="community"],[data-f="addr"],.deal-community,.deal-addr'))refresh();});
  refresh();
 }
 moveAddButtons();
}
const validate=window.validateAreaEditors;
window.validateAreaEditors=function(){const bad=modal.querySelector('.area-editor[data-invalid="1"]'),row=bad?.closest('.edit-object-page');if(row)for(const state of tabStates.values())if(row.parentElement===state.list){state.active=row;state.refresh();}return validate.apply(this,arguments);};
function resetObjectTabs(){setupObjectTabs();for(const state of tabStates.values()){state.active=null;state.known=new Set();state.refresh();}}
let returnDetail=null;
const originalNotes=window.renderTypeNotes;
window.renderTypeNotes=function(c){
 const area=document.getElementById('typeNotesArea');
 const enabled=new Set([...area.querySelectorAll('[data-note-enabled]')].map(el=>el.dataset.noteEnabled));
 const result=originalNotes.apply(this,arguments);
 const fields=[...area.querySelectorAll('[data-type-note]')];
 fields.forEach(field=>{const row=field.closest('.fg');row.hidden=!field.value.trim()&&!enabled.has(field.dataset.typeNote);if(enabled.has(field.dataset.typeNote))row.dataset.noteEnabled=field.dataset.typeNote;});
 const controls=document.createElement('div'),add=document.createElement('button'),picker=document.createElement('select');
 controls.style.cssText='display:flex;gap:8px;align-items:center;margin-top:8px';
 add.type='button';add.className='add-row-btn';add.textContent='＋ 新增備註';add.style.margin='0';
 picker.setAttribute('aria-label','選擇備註項目');picker.hidden=true;picker.style.cssText='width:100%;padding:9px;border:1px solid #d4e2ee;border-radius:8px;background:white;font:inherit;color:#173756';
 function refresh(){picker.replaceChildren(new Option('選擇備註項目',''));fields.filter(field=>field.closest('.fg').hidden).forEach(field=>picker.add(new Option(_NOTE_LABELS[field.dataset.typeNote]||'備註',field.dataset.typeNote)));controls.hidden=picker.options.length===1;}
 add.onclick=()=>{add.hidden=true;picker.hidden=false;picker.focus();};
 picker.onchange=()=>{const field=fields.find(field=>field.dataset.typeNote===picker.value);if(!field)return;const row=field.closest('.fg');row.hidden=false;row.dataset.noteEnabled=field.dataset.typeNote;field.style.height='64px';picker.hidden=true;add.hidden=false;refresh();field.focus();};
 controls.append(add,picker);area.append(controls);refresh();return result;
};
const open=window.openEdit;window.openEdit=function(id,viewAs){
 const detail=document.getElementById('dModal');
 if(detail.style.display==='flex'&&!returnDetail){returnDetail={id:currentDetId,viewAs:viewAs,snapshot:JSON.stringify(DB.find(c=>c.id===currentDetId))};detail.style.display='none';}
  restore();const result=open.apply(this,arguments);
 const basicDetails=document.getElementById('basicDetailWrap');if(basicDetails.style.display!=='none')document.getElementById('basicDetailToggle').click();
 resetObjectTabs();arrange();return result;
};
new MutationObserver(()=>{
 if(modal.style.display!=='none'||!returnDetail)return;
 const previous=returnDetail;returnDetail=null;
 const customer=DB.find(c=>c.id===previous.id);if(!customer||customer._deleted)return;
 if(JSON.stringify(customer)!==previous.snapshot)showDet(previous.id,previous.viewAs);
 else document.getElementById('dModal').style.display='flex';
}).observe(modal,{attributes:true,attributeFilter:['style']});
const add=window.openAdd;window.openAdd=function(){returnDetail=null;restore();const result=add.apply(this,arguments);resetObjectTabs();return result;};
desktop.addEventListener('change',()=>{restore();if(modal.style.display==='flex')arrange();});
})();