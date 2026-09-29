const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{for(const width of [1440,390]){
const page=await browser.newPage({viewport:{width,height:900}});await page.route('https://**/*',r=>r.abort());await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
await page.evaluate(()=>{const input=document.createElement('input');input.id='testFocus';document.body.prepend(input);input.focus();input.value='輸入中';input.setSelectionRange(2,2);showSyncSuccess();});
assert.equal(await page.locator('#crmSyncNotice').count(),0);
await page.evaluate(()=>{showSyncSuccess(true);showSyncSuccess(true);});
const notice=page.locator('#crmSyncNotice');assert.equal(await notice.count(),1);assert(await notice.isVisible());assert.equal(await notice.getAttribute('role'),'status');assert.equal(await page.evaluate(()=>document.activeElement.id),'testFocus');assert.equal(await page.evaluate(()=>document.activeElement.selectionStart),2);await page.keyboard.type('abc');assert.equal(await page.locator('#testFocus').inputValue(),'輸入abc中');assert.equal(await page.locator('dialog:modal').count(),0);assert.equal(await notice.evaluate(e=>getComputedStyle(e).pointerEvents),'none');await page.waitForTimeout(3200);assert(!await notice.isVisible());console.log('PASS nonblocking sync notice',width);await page.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
