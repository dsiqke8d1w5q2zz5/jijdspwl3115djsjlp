/* Optional schedule/property association. Labels are snapshots; ambiguous legacy matches never jump elsewhere. */
(function(){
'use strict';
const configs={經營買方:['bDemands','getBuyerDemands','bDemandList','買方'],庫存屋主:['sProperties','getSellerProperties','sPropertyList','庫存'],房東:['rProperties','getRentalProperties','rPropertyList','房東'],成交客戶:['deals','getDeals','dealList','成交'],商機募集:['dAddrs','getDAddrs','dAddrList','商機']};
const copy=v=>v?JSON.parse(JSON.stringify(v)):null;
function label(p,type){const community=String(p.rCommunity||p.community||'').trim();if(community)return community;const address=String(p.rAddr||p.addr||'').trim().replace(/^\d{3,6}\s*/,'');return (address?(typeof compactPropertyAddress==='function'?compactPropertyAddress(address)||address:address):(type==='經營買方'?[p.areaDisplay,p.roomTypes,p.budget? p.budget+'萬':''].filter(Boolean).join(' · '):''))||'未命名物件';}
function fingerprint(p,type){return JSON.stringify([p.rCommunity||p.community||'',p.rAddr||p.addr||'',type==='經營買方'?[p.areaDisplay,p.roomTypes,p.budget]:null]);}
function ref(c,p,type){if(type==='租案管理')type='房東';return {clientId:c.id||'',type,propertyKey:p.propertyKey||'',fingerprint:fingerprint(p,type),label:label(p,type),address:p.rAddr||p.addr||''};}
function token(r){return r?JSON.stringify([r.clientId,r.type,r.propertyKey||r.fingerprint]):'';}
function entries(c,type,draft=false){
 if(type==='租客'){const id=draft?document.getElementById('f-linkedLandlordId').value:c.linkedLandlordId,index=draft?Number(document.getElementById('f-linkedPropertyIdx').value)||0:c.linkedPropertyIdx||0,owner=DB.find(x=>x.id===id&&!x._deleted);return owner&&owner.rProperties?.[index]?[{p:owner.rProperties[index],ref:ref(owner,owner.rProperties[index],'房東')}]:[];}
 const conf=configs[type];if(!conf)return [];
 const list=draft?window[conf[1]]():c[conf[0]]||[];
 return list.map(p=>({p,ref:ref(c,p,type)}));
}
function resolve(r){const c=DB.find(x=>x.id===r.clientId&&!x._deleted);if(!c)return null;const found=entries(c,r.type).filter(e=>r.propertyKey?e.ref.propertyKey===r.propertyKey:e.ref.fingerprint===r.fingerprint);return found.length===1?found[0]:null;}
window.schedulePropertyRef=ref;
window.schedulePropertyToken=token;
window.schedulePropertyBadge=function(r){return r?'<button type="button" class="schedule-property-tag" data-schedule-property="'+esc(JSON.stringify(r))+'" title="'+esc([r.label,r.address].filter(Boolean).join(' · '))+'">'+esc(r.label)+'</button> ':'';};
document.addEventListener('click',event=>{const button=event.target.closest('[data-schedule-property]');if(!button)return;event.stopPropagation();const r=JSON.parse(button.dataset.scheduleProperty),found=resolve(r);if(!found){showToast('此物件已移除、轉換用途或資料已變更，保留原行程標籤供核對','warn');return;}showDet(r.clientId);const root=document.getElementById('dModal');const category=[...root.querySelectorAll('.det-category-tabs button')].find(b=>b.textContent.trim().startsWith(configs[r.type][3]));category?.click();const page=[...root.querySelectorAll('[data-schedule-property-ref]')].find(el=>{const candidate=JSON.parse(el.dataset.schedulePropertyRef);return token(candidate)===token(found.ref);});if(page){const tab=[...root.querySelectorAll('[aria-controls]')].find(b=>b.getAttribute('aria-controls')===page.id);tab?.click();page.scrollIntoView({block:'nearest'});}},true);
function context(c,type,draft){
 if(draft){const conf=configs[type],row=conf&&document.querySelector('#'+conf[2]+'>.edit-object-page:not([hidden])');if(row){const all=entries(c,type,true);return all.find(e=>e.ref.propertyKey===row._propertyKey)?.ref||null;}}
 if(typeof currentDetId!=='undefined'&&currentDetId===c.id&&document.getElementById('dModal').style.display!=='none'){
  const page=[...document.querySelectorAll('#dModal [data-schedule-property-ref]')].find(el=>el.getClientRects().length&&!el.hidden);if(page){const r=JSON.parse(page.dataset.schedulePropertyRef);if(r.type===type)return r;}
 }
 return null;
}
window.mountScheduleProperty=function(root,typeSelect,c,saved,isEdit,draft){
 root._scheduleDraft=!!draft;
 const picker=document.createElement('details');picker.className='schedule-property-picker';picker.innerHTML='<summary>不指定物件</summary><div class="schedule-property-options"><select class="schedule-property-scope" aria-label="關聯類別"><option value="own">買方需求</option><option value="inventory">帶看庫存</option></select><input type="search" placeholder="搜尋社區或地址…" aria-label="搜尋關聯物件"><select class="schedule-property-choices" size="5" aria-label="選擇關聯物件"></select><small>最近使用優先；暫停或到期物件排後。</small></div>';
 const scope=picker.querySelector('.schedule-property-scope'),search=picker.querySelector('input'),select=picker.querySelector('.schedule-property-choices'),summary=picker.querySelector('summary');
 let current=copy(saved),options=[],touched=isEdit;
 root.addEventListener('input',()=>touched=true);root.addEventListener('change',()=>touched=true);
 if(saved&&typeSelect.value==='經營買方'&&saved.type==='庫存屋主')scope.value='inventory';
 function candidates(){if(typeSelect.value==='經營買方'&&scope.value==='inventory')return DB.filter(x=>!x._deleted&&!x._system).flatMap(x=>entries(x,'庫存屋主'));return entries(c,typeSelect.value,draft);}
 function updateLabel(){summary.textContent=current?current.label:'不指定物件';summary.title=current?[current.label,current.address].filter(Boolean).join(' · '):'選填，可搜尋社區或地址';root._scheduleProperty=copy(current);}
 function render(){scope.hidden=typeSelect.value!=='經營買方';const q=search.value.trim().toLowerCase(),recent=new Map();(c.schedules||[]).filter(s=>!s._deleted&&s.propertyRef).sort((a,b)=>(b.updatedAt||b.date||'').localeCompare(a.updatedAt||a.date||'')).forEach((s,i)=>{if(!recent.has(token(s.propertyRef)))recent.set(token(s.propertyRef),i);});options=candidates();options.sort((a,b)=>{const inactive=e=>!!e.p.spArchived||!!((e.p.rEndDate||e.p.contractEnd)&&(e.p.rEndDate||e.p.contractEnd)<localDateISO());return Number(inactive(a))-Number(inactive(b))||(recent.get(token(a.ref))??1e6)-(recent.get(token(b.ref))??1e6);});select.replaceChildren(new Option('不指定物件',''));options.forEach((e,i)=>{const text=[e.ref.label,e.ref.address,e.p.spArchived?'（暫停）':''].filter(Boolean).join(' · ');if(!q||text.toLowerCase().includes(q)){const option=new Option(e.ref.label+(e.p.spArchived?'（暫停）':''),String(i));option.title=text;select.add(option);};});select.value=current?String(options.findIndex(e=>token(e.ref)===token(current))):'';updateLabel();}
 if(!isEdit&&!current){const all=candidates();current=context(c,typeSelect.value,draft)||(all.length===1?all[0].ref:null);}
 select.onchange=()=>{current=select.value===''?null:copy(options[Number(select.value)]?.ref);updateLabel();picker.open=false;summary.focus();};search.oninput=render;scope.onchange=()=>{current=null;render();};typeSelect.addEventListener('change',()=>{current=null;scope.value='own';search.value='';const all=candidates();if(all.length===1)current=all[0].ref;render();});picker.addEventListener('toggle',()=>{if(picker.open)render();});picker.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){picker.open=false;event.preventDefault();}});
 root._setScheduleProperty=value=>{current=copy(value);touched=true;render();};
 root._refreshScheduleContext=()=>{if(touched||!root.closest('.det-inline-overlay'))return;const category=document.querySelector('#dModal .det-category-tabs [aria-selected=true]')?.textContent.trim();const type=Object.keys(configs).find(key=>category?.startsWith(configs[key][3]));if(type&&[...typeSelect.options].some(o=>o.value===type))typeSelect.value=type;const all=candidates();current=context(c,typeSelect.value,false)||(all.length===1?all[0].ref:null);render();};
 const line=document.createElement('div');line.className='schedule-association-line';typeSelect.before(line);line.append(typeSelect,picker);render();return picker;
};
document.addEventListener('click',event=>{if(event.target.closest('#dModal .det-property-tabs button,#dModal .det-category-tabs button'))queueMicrotask(()=>document.querySelectorAll('#dModal .det-inline-overlay .fill-menu').forEach(el=>el._refreshScheduleContext?.()));},true);
window.readScheduleProperty=function(root){const r=copy(root._scheduleProperty);if(r&&!r.propertyKey&&!root._scheduleDraft){const item=resolve(r);if(item){item.p.propertyKey=crypto.randomUUID();r.propertyKey=item.p.propertyKey;const owner=DB.find(c=>c.id===r.clientId);owner.updatedAt=_nowISO();}}return r;};
for(const [adder,list] of [['addBuyerDemand','bDemandList'],['addDealRow','dealList']]){const original=window[adder];window[adder]=function(d){const result=original.apply(this,arguments);document.getElementById(list).lastElementChild._propertyKey=d?.propertyKey||crypto.randomUUID();return result;};}
const add=window.addScheduleRow;window.addScheduleRow=function(d){const result=add.apply(this,arguments),row=document.getElementById('scheduleList').lastElementChild,c=DB.find(x=>x.id===editId)||{id:'',schedules:[]};row._originalSchedule=copy(d)||{};if(!d&&configs[activeView])row.querySelector('.sched-type').value=activeView;mountScheduleProperty(row,row.querySelector('.sched-type'),c,d?.propertyRef,!!d,true);return result;};
})();
