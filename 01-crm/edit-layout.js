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
function restore(){if(!originalChildren)return;const contact=modal.querySelector('.edit-basic>.edit-pane-heading .add-row-btn');if(contact)document.querySelector('#sharedContactsWrap .sec-title').append(contact);const schedule=modal.querySelector('.edit-followup>.edit-pane-heading .add-row-btn');if(schedule)document.getElementById('scheduleList').previousElementSibling.append(schedule);body.replaceChildren(...originalChildren);originalChildren=null;modal.classList.remove('edit-layout');}
function arrange(){
 if(!desktop.matches||!editId||originalChildren)return;
 originalChildren=[...body.children];
 const make=(name,title)=>{const pane=document.createElement('section');pane.className='edit-pane edit-'+name;pane.setAttribute('aria-label',title);const heading=document.createElement('h2');heading.className='edit-pane-heading';heading.textContent=title;pane.append(heading);return pane;};
 const basic=make('basic','基本資料'),property=make('property','物件與其他資料'),followup=make('followup','行程與備註');
 const picker=body.querySelector('.type-picker'),pickerTitle=picker.previousElementSibling,head=document.createElement('div');head.className='edit-property-head';head.append(property.firstElementChild,picker);property.append(head);
 let section='basic';
 for(const child of originalChildren){if(child===picker||child===pickerTitle)continue;if(child.classList.contains('type-sec'))section='property';if(child.classList.contains('sec-title')&&child.textContent.trim().startsWith('預排行程'))section='followup';(section==='basic'?basic:section==='property'?property:followup).append(child);}
 const contact=basic.querySelector('#sharedContactsWrap .add-row-btn');if(contact){basic.firstElementChild.classList.add('edit-add-heading');basic.firstElementChild.append(contact);}const schedule=followup.querySelector('.sec-title>.add-row-btn');if(schedule){followup.firstElementChild.classList.add('edit-add-heading');followup.firstElementChild.append(schedule);}body.replaceChildren(basic,property,followup);modal.classList.add('edit-layout');
}
const tabStates=new Map();
const tabStyle=document.createElement('style');
tabStyle.textContent='.edit-object-tabs{display:flex;gap:6px;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;padding:7px;background:#f6f8fa;border:1px solid #e2e8f0;border-radius:9px;margin:8px 0 10px}.edit-object-tabs[hidden]{display:none!important}.edit-object-tabs button{flex:0 0 auto;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid #cbd5e1;border-radius:7px;background:white;color:#173756;font:inherit;font-size:14px;padding:7px 11px;cursor:pointer}.edit-object-tabs button[aria-selected=true]{background:#173756;color:white;border-color:#173756}.edit-object-tabs button:focus-visible{outline:2px solid #0284c7;outline-offset:1px}.edit-object-page[hidden]{display:none!important}#fModal .edit-add-heading{display:flex;align-items:center;gap:10px;flex-wrap:wrap}#fModal .edit-add-heading>.add-row-btn{width:auto;margin:0 0 0 auto;padding:5px 10px;font-size:13px;border:1px solid #cbd9e6;border-radius:7px;background:#f0f6fb;color:#173756;line-height:1.4}';
tabStyle.textContent+='#fModal :is(.rp-mgmt-row,.sp-mgmt-row){align-items:flex-end}#fModal :is(.rp-mgmt-row,.sp-mgmt-row)>div{display:flex;flex-direction:column}#fModal :is(.rp-mgmt-row,.sp-mgmt-row)>div>label{height:18px;line-height:18px;margin-bottom:4px!important}#fModal :is(.rp-mgmt-row,.sp-mgmt-row) :is(select,input,.input-sfx,[data-f="mgmtTotal"]){height:38px;box-sizing:border-box}#fModal :is(.rp-mgmt-row,.sp-mgmt-row) .input-grp{height:38px}#fModal :is(.rp-mgmt-row,.sp-mgmt-row) :is(.input-sfx,[data-f="mgmtTotal"]){display:flex;align-items:center;justify-content:center;padding-top:0!important;padding-bottom:0!important}';
const compactEdit=document.createElement('style');
compactEdit.textContent='@media(min-width:1200px){#fModal.edit-layout .edit-pane-heading{margin-bottom:8px}#fModal.edit-layout .edit-property-head{padding-bottom:5px;margin-bottom:6px}#fModal.edit-layout .tp-btn{padding-top:5px;padding-bottom:5px}#fModal.edit-layout .edit-object-tabs{padding:4px 6px;margin:5px 0 6px}#fModal.edit-layout .edit-object-tabs button{padding:5px 10px}#fModal.edit-layout .fg{margin-bottom:6px}#fModal.edit-layout .fg>label{margin-bottom:3px}#fModal.edit-layout :is(.person-block,.deal-box){padding:8px!important;margin-bottom:6px!important}#fModal.edit-layout .edit-pane input:not([type=hidden]):not([type=checkbox]):not([type=radio]),#fModal.edit-layout .edit-pane select{height:32px;padding-top:4px;padding-bottom:4px}#fModal.edit-layout .edit-pane .input-sfx{height:32px;box-sizing:border-box;display:flex;align-items:center;padding-top:0;padding-bottom:0}#fModal.edit-layout :is(.rp-mgmt-row,.sp-mgmt-row) :is(.input-grp,[data-f="mgmtTotal"]){height:32px}#fModal.edit-layout .edit-pane .cal-btn{min-height:32px;height:32px;padding-top:4px;padding-bottom:4px}#fModal.edit-layout .edit-pane .sec-title{margin-bottom:7px;padding-bottom:4px}#fModal.edit-layout .equip-toggle{padding-top:6px;padding-bottom:6px}}@media(min-width:1050px){#dModal .det-pane-title{margin-bottom:8px}#dModal .det-pane .det-row{padding-top:3px;padding-bottom:3px}#dModal .det-property-page .det-other-info .det-row{padding-top:4px;padding-bottom:4px}#dModal .det-property-more>summary{padding-top:4px;padding-bottom:4px}#dModal .det-schedule-card{padding-top:8px;padding-bottom:8px}#dModal .det-property-toolbar{margin-top:2px;margin-bottom:2px}}';
tabStyle.textContent+='#fModal .edit-section-toolbar{min-height:0;box-sizing:border-box;margin:0 0 6px}#fModal .edit-section-toolbar>.sec-title{height:36px;box-sizing:border-box;margin:0 0 6px!important;padding:0 0 5px!important;flex-wrap:nowrap}#fModal .edit-section-toolbar>.edit-object-tabs{height:42px;box-sizing:border-box;margin:0!important;align-items:center}#fModal .edit-section-toolbar .add-row-btn{height:30px;box-sizing:border-box;min-width:56px}';
tabStyle.textContent+='#fModal :is(#s-房東,#s-租客)>div:has(>.cond-btn),#fModal :is(#s-房東,#s-租客)>div:has(>input[id^="f-rSubsidy"]){align-items:flex-start!important;margin-bottom:8px!important}#fModal :is(#s-房東,#s-租客)>div:has(>input[id^="f-rSubsidy"])>span{display:inline-flex;align-items:center;height:30px;line-height:20px!important}#fModal :is(#s-房東,#s-租客) .cond-btn{display:inline-flex;align-items:center;justify-content:center;height:30px;box-sizing:border-box;line-height:20px;padding-top:0!important;padding-bottom:0!important}';
compactEdit.textContent+='@media(min-width:1200px){#fModal.edit-layout .edit-basic .basic-contact-box{padding:9px 10px!important;margin-bottom:8px!important}#fModal.edit-layout .edit-basic [style*="display:grid"]{row-gap:6px!important;margin-bottom:5px!important}#fModal.edit-layout .edit-basic .fg{margin-bottom:0!important}#fModal.edit-layout .edit-basic .fg>label{line-height:18px;margin-bottom:2px!important}#fModal.edit-layout .edit-basic .cal-btn{min-height:32px!important}#fModal.edit-layout .edit-basic [data-addr-row]>.btn-ic{padding:2px 8px!important;height:28px}#fModal.edit-layout .edit-basic #basicDetailToggle{padding:1px 0!important}}';
document.head.append(tabStyle);document.head.append(compactEdit);
const fullSpacing=document.createElement('style');
fullSpacing.textContent=`
#fModal{--form-control-height:32px}
#fModal .modal-head{padding-top:8px;padding-bottom:8px;min-height:0}
#fModal .modal-foot{padding-top:8px;padding-bottom:8px}
#fModal .modal-foot .btn{padding-top:7px;padding-bottom:7px}
#fModal .fg{gap:2px;margin-bottom:6px}
#fModal .fg>label{min-height:18px;line-height:18px;margin-bottom:0!important}
#fModal :is(.basic-contact-box,.person-block,.deal-box){padding:8px 10px!important;margin-bottom:6px!important}
#fModal :is(.basic-contact-box,.person-block,.deal-box) [style*="display:grid"]{row-gap:6px!important;margin-bottom:5px!important}
#fModal :is(.basic-contact-box,.person-block,.deal-box) .fg{margin-bottom:0!important}
#fModal .modal-body input:not([type=hidden]):not([type=checkbox]):not([type=radio]),#fModal .modal-body select{height:var(--form-control-height);box-sizing:border-box;padding-top:4px;padding-bottom:4px}
#fModal .modal-body .cal-btn{height:var(--form-control-height);min-height:var(--form-control-height)!important;padding-top:4px;padding-bottom:4px}
#fModal .input-sfx{height:var(--form-control-height);box-sizing:border-box;display:flex;align-items:center;padding-top:0;padding-bottom:0}
#fModal :is(.rp-mgmt-row,.sp-mgmt-row) :is(.input-grp,[data-f="mgmtTotal"]){height:var(--form-control-height)}
#fModal .sec-title{margin-top:8px!important;margin-bottom:6px;padding-bottom:4px}
#fModal #scheduleList .c-row{padding:8px!important;gap:6px!important;margin-bottom:6px!important}
#fModal #typeNotesArea .fg{margin-bottom:8px}
#fModal #typeNotesArea textarea{min-height:56px;height:56px;padding-top:6px;padding-bottom:6px}
#fModal .equip-toggle{padding-top:5px;padding-bottom:5px}
#fModal .type-sec .city-picker{margin-bottom:6px}
#fModal .type-sec>div:has(>#f-bGrade){margin-bottom:6px!important}
#fModal .type-sec .area-simple{row-gap:6px!important}
#fModal .type-sec .bf-chip:not(.cond-btn){padding-top:5px!important;padding-bottom:5px!important;min-height:var(--form-control-height);box-sizing:border-box}
#fModal #s-租客>div:has(#f-linkedLandlord){padding:8px 10px!important;margin-top:6px!important}
#fModal .edit-object-page>.edit-object-actions{justify-content:flex-end!important}
#fModal .edit-object-actions>.edit-duplicate-title{display:none!important}
#fModal .edit-pane-heading{margin-bottom:6px}
#fModal.edit-layout .modal-head{min-height:0;padding-top:8px;padding-bottom:8px}
#fModal.edit-layout .edit-basic .fg>label{margin-bottom:0!important}
#fModal.edit-layout .edit-basic .basic-contact-box{padding:8px 10px!important;margin-bottom:6px!important}
#dModal .det-pane-title{margin-bottom:6px}
#dModal .det-identity{margin-bottom:8px}
#dModal .det-row{padding-top:3px;padding-bottom:3px}
#dModal .det-sec{margin-top:8px;margin-bottom:6px;padding-bottom:4px}
#dModal .det-property-more{margin-top:3px}
#dModal .det-property-more>summary{padding-top:5px;padding-bottom:5px}
#dModal .det-property-page .det-other-info .det-row{padding-top:4px;padding-bottom:4px;gap:2px}
#dModal #detLogList .det-row{padding-top:4px;padding-bottom:4px}
#dModal .det-schedule-card{padding:8px;margin-top:6px;margin-bottom:8px}
#dModal .det-pane:nth-child(3)>.det-schedule-card{margin-bottom:8px}
#dModal .det-category-tabs{margin-bottom:5px;padding-bottom:4px}
#dModal .det-category-tabs button{padding-top:5px;padding-bottom:5px}
#dModal .det-folder-actions{margin-bottom:3px;min-height:30px}
@media(max-width:1199px){#fModal{--form-control-height:38px}#fModal .modal-body{padding-top:10px;padding-bottom:10px}#fModal .tp-btn{padding-top:7px;padding-bottom:7px}}
@media(max-width:1049px){#dModal .det-property-toolbar,#dModal .det-property-toolbar>.det-property-title,#dModal .det-property-toolbar>.det-property-tabs{height:44px}#dModal .det-property-toolbar>.det-property-title{line-height:36px}#dModal .det-property-tabs button{height:34px;padding-top:4px;padding-bottom:4px}}
`;
document.head.append(fullSpacing);
function moveAddButtons(){
 const buyerList=document.getElementById('bDemandList');
 if(buyerList&&!buyerList.closest('.type-sec').querySelector('.edit-buyer-heading')){const heading=document.createElement('div');heading.className='sec-title edit-buyer-heading';heading.textContent='買方需求';buyerList.before(heading);}
 for(const action of ['addBuyerDemand','addSellerProperty','addRentalProperty','addDealRow','addDAddrRow']){
  const button=modal.querySelector('.add-row-btn[onclick="'+action+'()"]');if(!button)continue;
  if(!button.dataset.addLabel)button.dataset.addLabel=button.textContent.replace('＋','').trim();
  button.textContent='新增';button.title=button.dataset.addLabel;button.setAttribute('aria-label',button.dataset.addLabel);button.style.marginBottom='0';
 }
 for(const button of modal.querySelectorAll('.add-row-btn')){
  if(button.closest('#typeNotesArea')||button.parentElement.classList.contains('edit-add-heading'))continue;
  let sibling=button.previousElementSibling;
  while(sibling&&!sibling.classList.contains('sec-title'))sibling=sibling.previousElementSibling;
  if(sibling){sibling.classList.add('edit-add-heading');sibling.append(button);}
 }
}
function setupObjectTabs(){moveAddButtons();
 for(const id of ['bDemandList','sPropertyList','rPropertyList','dealList','dAddrList']){
  const list=document.getElementById(id);if(!list||tabStates.has(id))continue;
  const nav=document.createElement('div');nav.className='edit-object-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','選擇編輯物件');list.before(nav);
  const state={active:null,known:new Set(),nav,list};tabStates.set(id,state);
  const rows=()=>[...list.children].filter(el=>el.matches('.person-block,.deal-box'));
  function refresh(){
   const items=rows(),added=items.filter(el=>!state.known.has(el));
   if(!items.includes(state.active))state.active=items[0]||null;
   if(added.length&&state.known.size)state.active=added[added.length-1];
   state.known=new Set(items);
   items.forEach(row=>{const heading=row.firstElementChild,label=heading?.querySelector(':scope>span:first-child');if(label&&/^(?:買方需求|庫存物件|物件資料|成交物件|開發物件|物件)\s*\d+$/.test(label.textContent.trim())){label.classList.add('edit-duplicate-title');heading.classList.add('edit-object-actions');}});
   const names=items.map((row,i)=>row.querySelector('[data-f="community"],.deal-community')?.value.trim()||((id==='dealList'||id==='dAddrList')?compactPropertyAddress(row.querySelector('[data-f="addr"],.deal-addr')?.value):row.querySelector('[data-f="addr"],.deal-addr')?.value.trim())||(id==='bDemandList'?'需求 ':'物件 ')+(i+1));
   nav.replaceChildren();nav.hidden=!items.length;
   items.forEach((row,i)=>{row.classList.add('edit-object-page');row.hidden=row!==state.active;const button=document.createElement('button');button.type='button';button.textContent=names[i]+(names.filter(name=>name===names[i]).length>1?'（'+(i+1)+'）':'');button.setAttribute('role','tab');button.setAttribute('aria-selected',String(row===state.active));button.tabIndex=row===state.active?0:-1;button.setAttribute('aria-controls',row.id);row.setAttribute('role','tabpanel');button.onclick=()=>{state.active=row;refresh();};button.onkeydown=event=>{let n=i;if(event.key==='ArrowRight')n=(i+1)%items.length;else if(event.key==='ArrowLeft')n=(i+items.length-1)%items.length;else if(event.key==='Home')n=0;else if(event.key==='End')n=items.length-1;else return;event.preventDefault();event.stopPropagation();state.active=items[n];refresh();nav.children[n].focus();};nav.append(button);});
  }
  state.refresh=refresh;
  new MutationObserver(refresh).observe(list,{childList:true});
  list.addEventListener('input',event=>{if(event.target.matches('[data-f="community"],[data-f="addr"],.deal-community,.deal-addr'))refresh();});
  refresh();
 }
 moveAddButtons();
 for(const state of tabStates.values()){
  const section=state.list.closest('.type-sec');let toolbar=section.querySelector(':scope>.edit-section-toolbar');
  if(!toolbar){toolbar=document.createElement('div');toolbar.className='edit-section-toolbar';const action={bDemandList:'addBuyerDemand',sPropertyList:'addSellerProperty',rPropertyList:'addRentalProperty',dealList:'addDealRow',dAddrList:'addDAddrRow'}[state.list.id];const heading=section.querySelector('.add-row-btn[onclick="'+action+'()"]')?.closest('.sec-title');if(heading)toolbar.append(heading);toolbar.append(state.nav);section.prepend(toolbar);}
 }
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
 const controls=document.createElement('div'),add=document.createElement('button');
 controls.style.cssText='display:flex;gap:8px;align-items:center;margin:8px 0 12px';
 add.type='button';add.className='add-row-btn';add.textContent='＋ 新增備註';add.style.cssText='width:auto;flex:0 0 auto;margin:0;padding:5px 10px;font-size:13px;border:1px solid #cbd9e6;border-radius:7px;background:#f0f6fb;color:#173756;line-height:1.4';
 function refresh(){controls.hidden=!fields.some(field=>field.closest('.fg').hidden);}
 add.onclick=()=>{
  const picker=document.createElement('dialog');picker.setAttribute('aria-label','選擇備註項目');picker.style.cssText='position:fixed;inset:0;margin:auto;width:340px;max-width:calc(100vw - 32px);max-height:80dvh;box-sizing:border-box;padding:20px;border:1px solid #d4e2ee;border-radius:16px;background:white;color:#173756;box-shadow:0 16px 60px #0003';
  const style=document.createElement('style');style.textContent='dialog[data-note-picker]::backdrop{background:rgba(15,23,42,.35)}dialog[data-note-picker] button:focus-visible{outline:2px solid #173756;outline-offset:2px}';picker.dataset.notePicker='';picker.append(style);
  const heading=document.createElement('div');heading.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px';
  const title=document.createElement('strong');title.textContent='選擇備註項目';title.style.fontSize='18px';
  const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','關閉備註選擇');close.style.cssText='border:0;background:transparent;color:#64748b;font-size:26px;cursor:pointer;padding:0 6px';close.onclick=()=>picker.close();heading.append(title,close);picker.append(heading);
  fields.filter(field=>field.closest('.fg').hidden).forEach(field=>{
   const option=document.createElement('button');option.type='button';option.textContent=_NOTE_LABELS[field.dataset.typeNote]||'備註';option.style.cssText='display:block;width:100%;padding:12px 14px;margin-top:8px;text-align:left;border:1px solid #d4e2ee;border-radius:9px;background:#f0f6fb;color:#173756;font:inherit;cursor:pointer';
   option.onclick=()=>{const row=field.closest('.fg');row.hidden=false;row.dataset.noteEnabled=field.dataset.typeNote;field.style.height='64px';picker.close();refresh();field.focus();};picker.append(option);
  });
  picker.onclick=event=>{if(event.target===picker){const rect=picker.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)picker.close();}};
  picker.addEventListener('close',()=>picker.remove(),{once:true});document.body.append(picker);picker.showModal();
 };
 controls.append(add);area.prepend(controls);refresh();return result;
};
const open=window.openEdit;window.openEdit=function(id,viewAs){
 const detail=document.getElementById('dModal');
 const currentLabel=detail.style.display==='flex'?detail.querySelector('.det-category-tabs [aria-selected="true"]')?.textContent.trim():'';
 const currentType=Object.keys(TYPE_DISPLAY).find(type=>TYPE_DISPLAY[type]+'資料'===currentLabel);
 if(detail.style.display==='flex'&&!returnDetail){returnDetail={id:currentDetId,viewAs:viewAs,snapshot:JSON.stringify(DB.find(c=>c.id===currentDetId))};detail.style.display='none';}
  restore();const result=open.apply(this,arguments);
 const firstType=['經營買方','庫存屋主','房東','租客','成交客戶','商機募集'].find(type=>selectedTypes.includes(type));
 if(currentType||(!viewAs&&firstType)){activeView=currentType||firstType;applyTypePicker();}
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
const applyTypes=window.applyTypePicker;let previousType='';
window.applyTypePicker=function(){const result=applyTypes.apply(this,arguments);if(activeView!==previousType){const pane=modal.querySelector('.edit-property');if(pane)pane.scrollTop=0;}previousType=activeView;return result;};
const add=window.openAdd;window.openAdd=function(){returnDetail=null;restore();const result=add.apply(this,arguments);resetObjectTabs();return result;};
desktop.addEventListener('change',()=>{restore();if(modal.style.display==='flex')arrange();});
})();
