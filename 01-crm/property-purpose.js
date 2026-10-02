/* Per-property purpose changes stay in the customer form until Save. */
(function(){
'use strict';
const cfg={s:{list:'sPropertyList',add:'addSellerProperty',get:'getSellerProperties',type:'庫存屋主',label:'庫存',folder:'spDriveUrl'},r:{list:'rPropertyList',add:'addRentalProperty',get:'getRentalProperties',type:'房東',label:'房東',folder:'rpDriveUrl'},d:{list:'dAddrList',add:'addDAddrRow',get:'getDAddrs',type:'商機募集',label:'商機',folder:'dAddrDriveUrl'}};
const fields=['baseLand','landShare','mainBldg','ancBldg','common','parkingSz','parking','parkingPrice','parkingNo'];
const validate=window.validateAreaEditors;window.validateAreaEditors=function(){document.querySelectorAll('.purpose-area:has(.area-editor[data-invalid="1"])').forEach(el=>el.open=true);return validate.apply(this,arguments);};
window.hasPurposeArea=block=>!!block&&!!block._registeredRoot&&fields.some(k=>val(block._registeredRoot,k));
const clone=v=>JSON.parse(JSON.stringify(v));
const rows=k=>[...document.getElementById(cfg[k].list).children].filter(e=>e.classList.contains('person-block'));
const val=(root,k)=>root.querySelector('[data-f="'+k+'"]')?.value||'';
function area(root){return {...Object.fromEntries(fields.map(k=>[k,val(root,k)])),areaInput:areaEditorData(root)};}
window.propertyPurposeData=function(block){
 if(!block)return {};
 const out={propertyKey:block._propertyKey,purposeHistory:clone(block._purposeHistory||{}),conversionEstimate:block._conversionEstimate||''};
 if(block._registeredRoot)out.registeredArea=area(block._registeredRoot);
 return out;
};
function addArea(block,data){
 const details=document.createElement('details');details.className='purpose-area';
 details.innerHTML='<summary>面積與持分明細</summary><div class="purpose-area-root"></div>';
 const root=details.lastElementChild;root.innerHTML='<div hidden>'+fields.map(k=>'<div class="fg"><input data-f="'+k+'"></div>').join('')+'</div>';
 const registered=data.registeredArea||{parking:data.rParking||data.parking||'',parkingNo:data.rParkingNo||data.parkingNo||''};
 fields.forEach(k=>root.querySelector('[data-f="'+k+'"]').value=registered[k]||'');
 block.append(details);block._registeredRoot=root;mountAreaEditor(root,registered.areaInput);
}
for(const [kind,c] of Object.entries(cfg)){
 const original=window[c.add];window[c.add]=function(data){const result=original.apply(this,arguments),block=rows(kind).at(-1);if(!block)return result;
  const d=data||{};block._propertyKey=d.propertyKey||crypto.randomUUID();block._purposeHistory=clone(d.purposeHistory||{});block._conversionEstimate=d.conversionEstimate||'';
  block.querySelectorAll('[onclick^="moveSpToDev"],[onclick^="moveDevToSp"],[onclick^="moveDevToRental"]').forEach(el=>el.remove());
  const button=document.createElement('button');button.type='button';button.className='purpose-button';button.textContent='轉換用途';button.onclick=()=>choose(block,kind);
  const heading=block.firstElementChild;heading.insertBefore(button,heading.querySelector(':scope>.c-del')||null);
  if(kind!=='s')addArea(block,d);
  if(block._conversionEstimate){const note=document.createElement('p');note.className='purpose-note';note.textContent=block._conversionEstimate;heading.after(note);}
  return result;
 };
}
function read(block,kind){return window[cfg[kind].get]().find(p=>p.propertyKey===block._propertyKey);}
function build(source,from,to){
 const history=clone(source.purposeHistory||{}),snapshot=clone(source);delete snapshot.purposeHistory;history[from]=snapshot;
 const output=clone(history[to]||{}),r=from==='r';
 Object.assign(output,{propertyKey:source.propertyKey,purposeHistory:history});
 const community=r?source.rCommunity:source.community,addr=r?source.rAddr:source.addr;
 if(to==='r'){output.rCommunity=community;output.rAddr=addr;}else{output.community=community;output.addr=addr;}
 output[cfg[to].folder]=source[cfg[from].folder]||'';
 const registered=from==='s'?Object.fromEntries([...fields,'areaInput'].map(k=>[k,source[k]])):source.registeredArea;
 if(registered){if(to==='s')Object.assign(output,clone(registered));else output.registeredArea=clone(registered);}
 // Rental usable area and old lead estimates are not legal main-building area.
 const hasArea=registered&&['mainBldg','ancBldg','common','parkingSz','landShare'].some(k=>Number(registered[k]));
 if(!hasArea&&to==='s'&&(source.rSz||source.bldgSz))output.conversionEstimate='原'+(from==='r'?'租賃':'商機')+'坪數 '+(source.rSz||source.bldgSz)+' 坪；登記面積請依謄本補齊。';
 if(hasArea)output.conversionEstimate='';
 const parking=(registered&&registered.parking)||(from==='r'?source.rParking:source.parking);
 if(to==='s'&&parking){output.parking=parking;if(output.areaInput&&!output.areaInput.common.some(item=>item.kind==='parking'||item.kind==='commonParking'))output.areaInput.common.push({kind:'parking',area:'',unit:'sqm',mode:'fraction',numerator:'',denominator:'',parking,parkingNo:source.rParkingNo||source.parkingNo||''});}
 if(to==='r'){output.rParking=parking||'';output.rParkingNo=(from==='r'?source.rParkingNo:source.parkingNo)||'';}
 if(to==='d'){output.parking=parking||'';output.hasParking=parking?'有':'無';if(!output.devType)output.devType=from==='r'?'出租':'出售';if(hasArea){output.bldgSz=String(['mainBldg','ancBldg','common'].reduce((n,k)=>n+(Number(registered[k])||0),0));output.landSz=registered.landShare||'';}}
 if(source.houseType)output.houseType=source.houseType;
 return output;
}
function choose(block,from){
 const source=read(block,from);if(!source||!(source.community||source.addr||source.rCommunity||source.rAddr)){showToast('請先填寫社區或地址','warn');return;}
 const dialog=document.createElement('dialog');dialog.className='purpose-dialog';dialog.setAttribute('aria-label','轉換物件用途');
 const targets=Object.keys(cfg).filter(k=>k!==from);
 dialog.innerHTML='<h2>轉換用途</h2><p class="purpose-name"></p><label>轉為<select class="purpose-target">'+targets.map(k=>'<option value="'+k+'">'+cfg[k].label+'</option>').join('')+'</select></label><label class="purpose-keep"><input type="checkbox" checked>保留原用途（可同時出租、出售或追蹤）</label><p class="purpose-hint">地址、面積與持分、車位及資料夾會帶入。原用途的專用資料會保留，轉回時還原。請補齊新用途所需資料，最後按客戶表單的儲存。</p><p class="purpose-warning" role="alert"></p><footer><button type="button" class="purpose-cancel">取消</button><button type="button" class="purpose-confirm">確定轉換</button></footer>';
 dialog.querySelector('.purpose-name').textContent=source.community||source.rCommunity||source.addr||source.rAddr;
 const keep=dialog.querySelector('input'),warning=dialog.querySelector('.purpose-warning');
 const linked=from==='r'&&DB.some(t=>!t._deleted&&t.linkedLandlordId===editId);
 if(linked){keep.disabled=true;warning.textContent='此房東已有連結租客，會保留原租案，避免租客連結受到影響。';}
 dialog.querySelector('.purpose-cancel').onclick=()=>dialog.close();
 dialog.querySelector('.purpose-confirm').onclick=()=>{
  const to=dialog.querySelector('select').value;
  if(!block.isConnected)return dialog.close();
  if(block.querySelector('.area-editor[data-invalid="1"]')){warning.textContent='請先修正此物件的面積與持分資料。';return;}
  if(rows(to).some(row=>row._propertyKey===source.propertyKey)){warning.textContent='此物件已在'+cfg[to].label+'，請直接切換至該分頁編輯，避免重複建立或覆蓋。';return;}
  const data=build(read(block,from),from,to);window[cfg[to].add](data);
  if(!keep.checked)block.remove();
  if(!selectedTypes.includes(cfg[to].type))selectedTypes.push(cfg[to].type);
  activeView=cfg[to].type;applyTypePicker();dialog.close();
  showToast('已帶入'+cfg[to].label+'，請補齊資料後儲存');
 };
 dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();dialog.close();}});
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
}
})();
