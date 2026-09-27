/* Named image-tool layouts. Photos are deliberately not stored. */
(function(){
 'use strict';
 const key='_crmImageLayouts_v1';
 function mount(host,editor){
  host.innerHTML=`<h3>我的版面</h3><p class="ic-note">保存品牌底條、文字、浮水印、人物位置與輸出設定，下次可直接套用。</p>
   <label class="it-lb" for="icLayoutSelect">已儲存的版面</label><select id="icLayoutSelect" class="it-in"></select>
   <div class="ic-actions ic-layout-actions"><button type="button" id="icLayoutApply" class="ic-primary">套用設定</button><button type="button" id="icLayoutUpdate">更新選取版面</button><button type="button" id="icLayoutDelete">刪除</button></div>
   <label class="it-lb" for="icLayoutName">版面名稱</label><input id="icLayoutName" class="it-in" type="text" maxlength="40" placeholder="例如：深藍名片・人物靠左">
   <div class="ic-actions ic-layout-actions"><button type="button" id="icLayoutSave">另存新版面</button></div>
   <p id="icLayoutStatus" class="ic-status" role="status" aria-live="polite"></p>
   <p class="ic-note">版面保存在目前瀏覽器，不會同步到其他裝置。照片不包含在版面中，人物照片需另選；套用會更新目前所有照片的設定與人物位置。</p>`;
  const $=id=>host.querySelector('#'+id);
  const message=(text,error=false)=>{$('icLayoutStatus').textContent=text;$('icLayoutStatus').dataset.error=error;};
  function read(){
   const rows=JSON.parse(localStorage.getItem(key)||'[]');
   if(!Array.isArray(rows)||rows.some(r=>!r||typeof r.id!=='string'||typeof r.name!=='string'||!r.settings||r.settings.version!==1))throw Error('invalid');
   return rows;
  }
  function list(rows,selected=''){
   const select=$('icLayoutSelect');select.replaceChildren(new Option(rows.length?'請選擇版面':'尚未儲存版面',''));
   for(const row of rows)select.add(new Option(row.name,row.id));select.value=selected;
   for(const id of ['icLayoutApply','icLayoutUpdate','icLayoutDelete'])$(id).disabled=!select.value;
  }
  function ready(){if(editor.isBusy()){message('請等圖片處理完成後再操作版面。',true);return false;}return true;}
  function name(){const value=$('icLayoutName').value.trim();if(!value){message('請先輸入版面名稱。',true);$('icLayoutName').focus();}return value;}
  function write(rows,selected,text){localStorage.setItem(key,JSON.stringify(rows));list(rows,selected);message(text);}
  function guarded(fn){return()=>{if(!ready())return;try{fn(read());}catch(e){message('無法讀取或儲存版面，請確認瀏覽器儲存空間與權限；原有版面未被清除。',true);}};}
  $('icLayoutSelect').onchange=guarded(rows=>{const selected=$('icLayoutSelect').value,row=rows.find(r=>r.id===selected);list(rows,selected);$('icLayoutName').value=row?.name||'';message(row?'按「套用設定」即可使用，或將目前設定更新至這個版面。':'');});
  $('icLayoutSave').onclick=guarded(rows=>{
   const title=name();if(!title)return;
   if(rows.some(r=>r.name===title)){message('已有同名版面，請改名，或選取後按「更新選取版面」。',true);return;}
   if(rows.length>=30){message('最多可保存 30 個版面，請先刪除不需要的版面。',true);return;}
   const row={id:crypto.randomUUID(),name:title,settings:editor.snapshot()};
   write([...rows,row],row.id,'已儲存「'+title+'」。');
  });
  $('icLayoutApply').onclick=guarded(rows=>{const row=rows.find(r=>r.id===$('icLayoutSelect').value);if(!row)return;editor.apply(row.settings);message('已套用「'+row.name+'」。');});
  $('icLayoutUpdate').onclick=guarded(rows=>{
   const row=rows.find(r=>r.id===$('icLayoutSelect').value),title=name();if(!row||!title)return;
   if(rows.some(r=>r.id!==row.id&&r.name===title)){message('已有同名版面，請使用其他名稱。',true);return;}
   write(rows.map(r=>r.id===row.id?{...r,name:title,settings:editor.snapshot()}:r),row.id,'已更新「'+title+'」。');
  });
  $('icLayoutDelete').onclick=guarded(rows=>{const row=rows.find(r=>r.id===$('icLayoutSelect').value);if(!row)return;if(!window.confirm('確定要刪除版面「'+row.name+'」嗎？\n刪除後無法復原，目前圖片設定不受影響。'))return;write(rows.filter(r=>r.id!==row.id),'','已刪除「'+row.name+'」，目前圖片設定仍保留。');$('icLayoutName').value='';});
  try{list(read());}catch(e){list([]);message('已儲存的版面暫時無法讀取，原有資料仍保留。',true);}
 }
 window.ImageLayouts={mount};
})();
