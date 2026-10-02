// Synthetic records and blocked network; exercise the real local persistence path.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const {pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try {
  const page=await browser.newPage();
  await page.route('https://**/*',r=>r.abort());
  await page.goto(pathToFileURL(path.resolve('01-crm/index.html')).href);
  await page.evaluate(()=>{
   DB=[{id:'storage-audit',name:'測試客戶',type:'經營買方',types:['經營買方'],phone:'',notes:'保留內容',updatedAt:'2026-01-01T00:00:00Z'}];
   _lastSyncJSON=JSON.stringify(DB);localStorage.setItem('reCRM',_lastSyncJSON);
   window.auditOriginal=_lastSyncJSON;window.auditMessages=[];window.auditRenderCount=0;window.auditCloseCount=0;
   showToast=(message)=>auditMessages.push(message);confirmAction=(message,action)=>action();
   render=()=>auditRenderCount++;renderTrash=()=>auditRenderCount++;closeDet=()=>auditCloseCount++;
   const original=Storage.prototype.setItem;
   window.auditReject=true;
   Storage.prototype.setItem=function(key,value){if(auditReject&&key==='reCRM')throw new DOMException('Synthetic quota failure','QuotaExceededError');return original.call(this,key,value);};
  });
  await page.evaluate(()=>del('storage-audit'));
  let state=await page.evaluate(()=>({db:JSON.stringify(DB),stored:localStorage.getItem('reCRM'),original:auditOriginal,messages:auditMessages,render:auditRenderCount,close:auditCloseCount,undo:!!_undoBar}));
  assert.equal(state.db,state.original);assert.equal(state.stored,state.original);
  assert.equal(state.render,0);assert.equal(state.close,0);assert.equal(state.undo,false);
  assert(state.messages.some(s=>s.includes('刪除失敗')));
  await page.evaluate(()=>{auditReject=false;del('storage-audit');clearTimeout(_syncTimer);window.auditDeleted=JSON.stringify(DB);});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('reCRM'))[0]._deleted),true);
  for(const action of ['_undoDel','restoreFromTrash']){
   await page.evaluate(action=>{auditReject=true;auditMessages=[];window[action]('storage-audit');},action);
   state=await page.evaluate(()=>({db:JSON.stringify(DB),stored:localStorage.getItem('reCRM'),deleted:auditDeleted,messages:auditMessages,undo:!!_undoBar}));
   assert.equal(state.db,state.deleted);assert.equal(state.stored,state.deleted);
   assert(state.messages.some(s=>s.includes('復原失敗')));assert(!state.messages.includes('已復原'));
   assert(state.undo,'failed restore retains undo control');
  }
  await page.evaluate(()=>{auditReject=false;_undoDel('storage-audit');clearTimeout(_syncTimer);});
  assert.equal(await page.evaluate(()=>!!JSON.parse(localStorage.getItem('reCRM'))[0]._deleted),false);
  assert.equal(await page.evaluate(()=>!!_undoBar),false);
  await page.evaluate(()=>{auditReject=true;window.auditBeforePermanent=JSON.stringify(DB);permanentDel('storage-audit');});
  assert.equal(await page.evaluate(()=>JSON.stringify(DB)),await page.evaluate(()=>auditBeforePermanent));
  await page.evaluate(()=>{openEdit('storage-audit');document.getElementById('fn').value='未儲存修改';saveClient();});
  assert.equal(await page.evaluate(()=>DB[0].name),'測試客戶');
  assert.equal(await page.locator('#fn').inputValue(),'未儲存修改');
  assert(await page.locator('#fModal').isVisible(),'failed save preserves editor');
  await page.evaluate(()=>{auditReject=false;saveClient();clearTimeout(_syncTimer);});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('reCRM'))[0].name),'未儲存修改');
  await page.locator('#fModal').waitFor({state:'hidden'});
  console.log('PASS real persistence: delete/undo/trash restore failure rollback, retry, permanent-delete protection, customer editor retention');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
