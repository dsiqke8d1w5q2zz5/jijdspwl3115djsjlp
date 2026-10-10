const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try {for(const width of [1440,1024,390]){
  const p=await b.newPage({viewport:{width,height:900},acceptDownloads:true}),errors=[];let version='1.2.38',fail=false;
  p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://**/*',r=>r.abort());
  await p.route('https://crm.test/**',r=>{
   const name=decodeURIComponent(new URL(r.request().url()).pathname);
   if(name.endsWith('buyer-helper-release.json'))return r.fulfill({status:fail?503:200,json:{version}});
   if(name.endsWith('buyer-feed.json'))return r.fulfill({json:{schema:1,sources:[],listings:[]}});
   const f=path.resolve('01-crm','.'+name);
   if(!fs.existsSync(f)||!fs.statSync(f).isFile())return r.fulfill({status:404,body:''});
   return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':f.endsWith('.exe')?'application/octet-stream':'text/css'});
  });
  await p.addInitScript(()=>{window.testHelperVersion='1.2.37';addEventListener('message',e=>{if(e.data?.channel==='CRM_BUYER_REQUEST'&&e.data.type==='hello'&&window.testHelperVersion!==null)postMessage({channel:'CRM_BUYER_RESPONSE',id:e.data.id,result:{version:3,extensionVersion:window.testHelperVersion}},location.origin);});});
  await p.goto('https://crm.test/index.html');
  const desktop=await p.locator('#headerMoreBtn').isVisible();
  await p.locator(desktop?'#headerMoreBtn':'#mobileSettingBtn').click();
  await p.locator((desktop?'#headerMoreMenu':'#mobileSettingMenu')+' button').filter({hasText:'更新小助手'}).click();
  const dlg=p.locator('.helper-update-dialog');
  await p.waitForFunction(()=>document.querySelector('[data-latest]')?.textContent==='v1.2.38');
  assert.equal(await dlg.locator('[data-current]').textContent(),'v1.2.37');
  assert.match(await dlg.locator('[data-status]').textContent(),/有新版本/);
  assert(await dlg.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  await p.screenshot({path:path.join(process.env.TEMP,'helper-update-'+width+'.png'),fullPage:true});
  const [download]=await Promise.all([p.waitForEvent('download'),dlg.locator('[data-download]').click()]);
  assert.equal(download.suggestedFilename(),'房仲管家搜尋助手.exe');assert(download.url().includes(encodeURI('房仲管家搜尋助手.exe')));
  // Route-backed executable downloads are canceled by Chromium; production bytes are verified separately.
  version='1.2.37';await dlg.locator('[data-check]').click();await p.waitForFunction(()=>document.querySelector('[data-status]')?.textContent.includes('已是'));
  fail=true;await dlg.locator('[data-check]').click();await p.waitForFunction(()=>document.querySelector('[data-latest]')?.textContent==='暫時無法取得');
  fail=false;version='999999999.999999999.999999999.999999999';await dlg.locator('[data-check]').click();await p.waitForFunction(()=>document.querySelector('[data-latest]')?.textContent.includes('999999999'));
  assert(await dlg.locator('dd').evaluateAll(es=>es.every(e=>e.scrollWidth<=e.clientWidth+1)));
  await p.screenshot({path:path.join(process.env.TEMP,'helper-update-long-'+width+'.png'),fullPage:true});
  await p.evaluate(()=>window.testHelperVersion=null);await dlg.locator('[data-check]').click();await p.waitForFunction(()=>document.querySelector('[data-current]')?.textContent==='未連接');
  await p.keyboard.press('Escape');await dlg.waitFor({state:'detached'});assert.equal(await dlg.count(),0);
  assert.deepEqual(errors,[]);await p.close();console.log('PASS helper update entry, versions, EXE download, retry/failure/long version, disconnected and Escape',width);
 }}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
