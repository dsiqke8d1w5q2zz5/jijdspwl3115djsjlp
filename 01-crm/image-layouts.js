/* Named image-tool layouts. Photos are deliberately not stored. */
(function(){
 'use strict';
 const key='_crmImageLayouts_v1';
 function mount(host,editor){
  host.innerHTML=`<h3>我的版面</h3><p class="ic-note">保存品牌底條、文字、浮水印、人物位置與輸出設定，下次可直接套用。</p>
   <label class="it-lb" for="icLayoutSelect">已儲存的版面</label><select id="icLayoutSelect" class="it-in"></select>
   <img id="icLayoutPreview" class="ic-layout-preview" alt="選取版面預覽" hidden>
   <label class="it-lb" for="icLayoutScope">套用範圍</label><select id="icLayoutScope" class="it-in"><option value="all">全部照片</option><option value="current">只有這張</option></select><label class="ic-check"><input id="icLayoutKeepPerson" type="checkbox" checked>保留已調整的人物位置</label>
   <div class="ic-actions ic-layout-actions"><button type="button" id="icLayoutApply" class="ic-primary">套用設定</button><button type="button" id="icLayoutUpdate">更新選取版面</button><button type="button" id="icLayoutDelete">刪除</button></div>
   <label class="it-lb" for="icLayoutName">版面名稱</label><input id="icLayoutName" class="it-in" type="text" maxlength="40" placeholder="例如：深藍名片・人物靠左">
   <div class="ic-actions ic-layout-actions"><button type="button" id="icLayoutSave">另存新版面</button></div>
   <div class="ic-actions ic-layout-actions"><button id="icLayoutExport" type="button">匯出版面備份</button><label class="ic-file">匯入備份<input id="icLayoutImport" type="file" accept=".json,application/json"></label></div><p class="ic-note">備份可帶到手機或另一台電腦匯入；同名版面會另存，不覆蓋原版面。</p><p id="icLayoutStatus" class="ic-status" role="status" aria-live="polite"></p>
   <p class="ic-note">版面保存在目前瀏覽器，不會同步到其他裝置。照片不包含在版面中，人物照片需另選。可指定套用範圍，並保留人物位置。</p>`;
  const $=id=>host.querySelector('#'+id);
  const message=(text,error=false)=>{$('icLayoutStatus').textContent=text;$('icLayoutStatus').dataset.error=error;};
  function read(){
   const rows=JSON.parse(localStorage.getItem(key)||'[]');
   if(!Array.isArray(rows)||rows.some(r=>!r||typeof r.id!=='string'||typeof r.name!=='string'||!r.settings||r.settings.version!==1))throw Error('invalid');
   return rows;
  }
  function list(rows,selected=''){
   const select=$('icLayoutSelect');select.replaceChildren(new Option(rows.length?'請選擇版面':'尚未儲存版面',''));
   for(const row of rows)select.add(new Option(row.name,row.id));select.value=selected;const thumb=rows.find(r=>r.id===selected)?.thumbnail,img=$('icLayoutPreview');img.hidden=!/^data:image\/jpeg;base64,/.test(thumb||'');if(!img.hidden)img.src=thumb;else img.removeAttribute('src');
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
   const row={id:crypto.randomUUID(),name:title,settings:editor.snapshot(),thumbnail:editor.thumbnail?.()};
   write([...rows,row],row.id,'已儲存「'+title+'」。');
  });
  $('icLayoutApply').onclick=guarded(rows=>{const row=rows.find(r=>r.id===$('icLayoutSelect').value);if(!row)return;editor.apply(row.settings,{scope:$('icLayoutScope').value,keepPerson:$('icLayoutKeepPerson').checked});message('已套用「'+row.name+'」。');});
  $('icLayoutUpdate').onclick=guarded(rows=>{
   const row=rows.find(r=>r.id===$('icLayoutSelect').value),title=name();if(!row||!title)return;
   if(rows.some(r=>r.id!==row.id&&r.name===title)){message('已有同名版面，請使用其他名稱。',true);return;}
   write(rows.map(r=>r.id===row.id?{...r,name:title,settings:editor.snapshot(),thumbnail:editor.thumbnail?.()}:r),row.id,'已更新「'+title+'」。');
  });
  $('icLayoutDelete').onclick=guarded(rows=>{const row=rows.find(r=>r.id===$('icLayoutSelect').value);if(!row)return;if(!window.confirm('確定要刪除版面「'+row.name+'」嗎？\n刪除後無法復原，目前圖片設定不受影響。'))return;write(rows.filter(r=>r.id!==row.id),'','已刪除「'+row.name+'」，目前圖片設定仍保留。');$('icLayoutName').value='';});
  $('icLayoutExport').onclick=guarded(rows=>{if(!rows.length){message('還沒有版面可備份。',true);return;}ImageStorage.download(new Blob([JSON.stringify({type:'crm-image-layouts',version:1,layouts:rows},null,2)],{type:'application/json'}),'圖片版面備份.json');message('已產生版面備份，請妥善保存。');});
  $('icLayoutImport').onchange=async e=>{
   const file=e.target.files[0];e.target.value='';if(!file||!ready())return;
   try{if(file.size>5*1024*1024)throw Error('備份超過 5 MB。');const data=JSON.parse(await file.text());if(data.type!=='crm-image-layouts'||data.version!==1||!Array.isArray(data.layouts)||data.layouts.length>30)throw Error('不是有效的圖片版面備份。');
    const rows=read(),incoming=[];if(rows.length+data.layouts.length>30)throw Error('匯入後超過 30 個版面，請先刪除不需要的版面。');
    for(const row of data.layouts){if(!row||typeof row.name!=='string'||!row.settings||row.settings.version!==1||!row.settings.values||typeof row.settings.values!=='object')throw Error('備份版面資料不完整。');let title=row.name.trim().slice(0,40)||'匯入版面',i=2;const base=title;while([...rows,...incoming].some(r=>r.name===title))title=base+' ('+(i++)+')';incoming.push({id:crypto.randomUUID(),name:title,settings:row.settings,thumbnail:typeof row.thumbnail==='string'&&row.thumbnail.length<200000&&/^data:image\/jpeg;base64,/.test(row.thumbnail)?row.thumbnail:undefined});}
    write([...rows,...incoming],incoming[0]?.id||'','已匯入 '+incoming.length+' 個版面。');$('icLayoutName').value=incoming[0]?.name||'';
   }catch(e){message('匯入失敗：'+(e.message||'請確認備份檔案。'),true);}
  };
  try{list(read());}catch(e){list([]);message('已儲存的版面暫時無法讀取，原有資料仍保留。',true);}
 }
 window.ImageLayouts={mount};
})();
