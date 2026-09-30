const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{for(const width of [1440,390]){
const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
await page.evaluate(()=>{DB=[{id:'activity-test',name:'測試客戶',type:'買方',types:['買方'],schedules:[],contactLog:[]}];persistAndSyncNow=()=>true;showDet('activity-test');});
const actions=page.locator('.det-activity-actions');assert.equal(await actions.locator('button').count(),2);
await actions.getByRole('button',{name:'新增聯繫'}).click();await page.locator('#cl-memo').fill('新的聯繫測試');await page.locator('#cl-save').click();assert.equal(await page.evaluate(()=>DB[0].contactLog[0].memo),'新的聯繫測試');assert.match(await page.locator('#detContent').innerText(),/新的聯繫測試/);assert.equal(await actions.count(),1);
await actions.getByRole('button',{name:'新增行程'}).click();await page.locator('#qs-date').fill('115/12/30');await page.locator('#qs-memo').fill('新的行程測試');await page.locator('#qs-save').click();assert.equal(await page.evaluate(()=>DB[0].schedules[0].memo),'新的行程測試');assert.match(await page.locator('#detContent').innerText(),/新的行程測試/);
await actions.getByRole('button',{name:'新增聯繫'}).click();await page.locator('#cl-memo').fill('');await page.locator('#cl-save').click();assert.equal(await page.locator('#cl-save').count(),1,'validation keeps quick form open');await page.locator('#cl-save').locator('..').getByRole('button',{name:'取消',exact:true}).click();await page.locator('#cl-save').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>DB[0].contactLog.length),1);
await page.evaluate(()=>{DB[0].contactLog=Array.from({length:60},(_,i)=>({date:'2026-09-30',memo:'聯繫測試 '+i}));showDet('activity-test')});
if(width>=1050){const a=await actions.boundingBox(),pane=await page.locator('.det-pane').nth(2).boundingBox();assert(a.y>=pane.y&&a.y+a.height<=pane.y+pane.height,'footer visible inside pane');}
if(width>=1050){
 const beforeCount=await page.locator('#detLogList>.det-row').count();
 await page.evaluate(()=>{DB[0].schedules=Array.from({length:18},(_,i)=>({date:'2026-12-30',memo:'行程 '+i+' 多行內容測試，多行內容測試，多行內容測試'}));showDet('activity-test');});
 await page.setViewportSize({width,height:700});
 await page.waitForFunction(previous=>document.querySelectorAll('#detLogList>.det-row').length<previous,beforeCount);
 const toggle=page.locator('#detLogToggle'),footer=await actions.boundingBox(),toggleRect=await toggle.boundingBox();
 assert(toggleRect.y+toggleRect.height<=footer.y,'collapsed logs and remaining link stay above fixed actions');
 const visible=await page.locator('#detLogList>.det-row').count(),hidden=await page.locator('#detLogMore>.det-row').count();assert.equal(visible+hidden,60);
 await toggle.click();assert.equal(await page.locator('#detLogMore').evaluate(e=>getComputedStyle(e).display!=='none'),true);
 assert.equal((await actions.boundingBox()).y,footer.y,'expanded logs do not move actions');
 await page.locator('.det-activity-content').evaluate(e=>e.scrollTop=e.scrollHeight);assert.equal((await actions.boundingBox()).y,footer.y);
 await toggle.click();await page.locator('.det-activity-content').evaluate(e=>e.scrollTop=0);
}
await actions.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(os.tmpdir(),'detail-activity-'+width+'.png')});assert.deepEqual(errors,[]);console.log('PASS',width,'empty customer actions, save refresh, validation, cancel, long records and visible footer');await page.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
