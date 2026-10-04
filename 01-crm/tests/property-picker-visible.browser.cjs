// Real DOM, synthetic records, and real local saving; never contact the production backend.
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const {pathToFileURL}=require('node:url'),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 for(const width of [1440,390,320]){
  const p=await browser.newPage({viewport:{width,height:950}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://**/*',r=>r.abort());await p.goto(pathToFileURL(path.resolve('01-crm/index.html')).href);
  await p.evaluate(()=>{DB=[{id:'picker-visible',name:'示範客戶',type:'成交客戶',types:['成交客戶','經營買方','庫存屋主','房東','商機募集'],deals:[{propertyKey:'d1',addr:'新北市板橋區文化路一段123號8樓'},{propertyKey:'d2',addr:'新北市新莊區中正路456號12樓'},{propertyKey:'d3',addr:'新北市中和區景平路789號5樓'}],schedules:[]}];curFilter='成交客戶';quickSchedule('picker-visible');});
  const picker=p.locator('.schedule-property-picker'),list=picker.locator('.schedule-property-choices');
  await picker.locator('summary').click();assert.equal(await list.locator('[role=option]').count(),4);
  assert.equal(await picker.locator('.schedule-property-empty').isVisible(),false);
  for(const row of await list.locator('[role=option]').all())assert(await row.isVisible());
  await p.locator('.schedule-compact-form').screenshot({path:path.join(os.tmpdir(),'crm-visible-picker-'+width+'.png')});
  await list.locator('[data-value="1"]').click();assert((await picker.locator('summary').innerText()).includes('新莊'));
  await p.locator('#qs-memo').fill('確認資料與銀行鑑價'.repeat(20));await p.locator('#qs-save').click();
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('reCRM')||'[]')[0]?.schedules?.[0]?.propertyRef?.propertyKey==='d2');
  await p.reload();await p.evaluate(()=>{curFilter='成交客戶';const s=DB[0].schedules[0];editDashSchedule(DB[0].id,s.date,s.time,s.id);});
  assert((await picker.locator('summary').innerText()).includes('新莊'));
  for(const type of ['房東','庫存屋主','商機募集','經營買方']){
   await p.locator('#qs-type').selectOption(type);await picker.locator('summary').click();
   assert(await picker.locator('.schedule-property-empty').isVisible());assert.equal(await list.locator('[role=option]').count(),1);
   await list.locator('[data-value=""]').click();assert.equal(await picker.getAttribute('open'),null);
  }
  await p.locator('#qs-type').selectOption('成交客戶');
  await p.evaluate(()=>{DB[0].deals=Array.from({length:8},(_,i)=>({propertyKey:'long-'+i,community:'長社區名称與完整樓層說明'.repeat(5)+i,addr:'新北市板橋區文化路一段123號18樓之10'.repeat(3),price:'999999999'}));});
  await picker.locator('summary').click();await p.waitForFunction(()=>document.querySelector('.schedule-property-choices').children.length===9);
  assert(await list.evaluate(el=>el.scrollHeight>el.clientHeight));
  assert.deepEqual(await list.evaluate(el=>[...el.children].filter(row=>row.scrollWidth>row.clientWidth+1||row.scrollHeight>row.clientHeight+1).map(row=>row.textContent)),[],'long option text must wrap without clipping');
  assert(await picker.evaluate(el=>el.getBoundingClientRect().right<=innerWidth&&el.scrollWidth<=el.clientWidth+1));
  await list.focus();await list.press('End');await p.keyboard.press('Enter');assert.equal(await picker.getAttribute('open'),null);
  await p.locator('#qs-save').click();assert.equal(await p.evaluate(()=>DB[0].schedules[0].propertyRef.propertyKey),'long-7');
  assert.deepEqual(errors,[]);await p.close();console.log('PASS '+width+' address-only deals, explicit empty state, long wrapping, scrolling, keyboard, real save and reload');
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
