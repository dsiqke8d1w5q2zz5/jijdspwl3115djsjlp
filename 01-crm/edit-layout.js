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
'#fModal.edit-layout .tp-btn{flex:1 0 auto;min-width:54px;padding:7px 10px;font-size:14px;border:1px solid #e2e8f0!important;border-radius:8px;background:#f1f5f9!important;color:#64748b!important;box-shadow:none!important}',
'#fModal.edit-layout .tp-btn.selected{background:#eaf1f7!important;color:#173756!important;border-color:#cbd9e6!important}',
'#fModal.edit-layout .tp-btn.active-view{background:#173756!important;color:white!important;border-color:#173756!important}',
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
function restore(){if(!originalChildren)return;body.replaceChildren(...originalChildren);originalChildren=null;modal.classList.remove('edit-layout');}
function arrange(){
 if(!desktop.matches||!editId||originalChildren)return;
 originalChildren=[...body.children];
 const make=(name,title)=>{const pane=document.createElement('section');pane.className='edit-pane edit-'+name;pane.setAttribute('aria-label',title);const heading=document.createElement('h2');heading.className='edit-pane-heading';heading.textContent=title;pane.append(heading);return pane;};
 const basic=make('basic','基本資料'),property=make('property','物件與其他資料'),followup=make('followup','行程與備註');
 const picker=body.querySelector('.type-picker'),pickerTitle=picker.previousElementSibling,head=document.createElement('div');head.className='edit-property-head';head.append(property.firstElementChild,picker);property.append(head);
 let section='basic';
 for(const child of originalChildren){if(child===picker||child===pickerTitle)continue;if(child.classList.contains('type-sec'))section='property';if(child.classList.contains('sec-title')&&child.textContent.trim()==='預排行程')section='followup';(section==='basic'?basic:section==='property'?property:followup).append(child);}
 body.replaceChildren(basic,property,followup);modal.classList.add('edit-layout');
}
let returnDetail=null;
const open=window.openEdit;window.openEdit=function(id,viewAs){
 const detail=document.getElementById('dModal');
 if(detail.style.display==='flex'&&!returnDetail){returnDetail={id:currentDetId,viewAs:viewAs,snapshot:JSON.stringify(DB.find(c=>c.id===currentDetId))};detail.style.display='none';}
  restore();const result=open.apply(this,arguments);
 const basicDetails=document.getElementById('basicDetailWrap');if(basicDetails.style.display!=='none')document.getElementById('basicDetailToggle').click();
 arrange();return result;
};
new MutationObserver(()=>{
 if(modal.style.display!=='none'||!returnDetail)return;
 const previous=returnDetail;returnDetail=null;
 const customer=DB.find(c=>c.id===previous.id);if(!customer||customer._deleted)return;
 if(JSON.stringify(customer)!==previous.snapshot)showDet(previous.id,previous.viewAs);
 else document.getElementById('dModal').style.display='flex';
}).observe(modal,{attributes:true,attributeFilter:['style']});
const add=window.openAdd;window.openAdd=function(){returnDetail=null;restore();return add.apply(this,arguments);};
desktop.addEventListener('change',()=>{restore();if(modal.style.display==='flex')arrange();});
})();