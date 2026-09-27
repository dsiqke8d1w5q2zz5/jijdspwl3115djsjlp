// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright module.
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  for(const width of [1440,390]){
   const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390,acceptDownloads:true});
   await context.route('https://**/*',r=>r.abort()); // Never send test data to the CRM backend.
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
   await page.evaluate(()=>openImgTool());await page.getByRole('button',{name:'人物合成',exact:true}).click();
   assert(await page.locator('#icDownload').isDisabled());
   await page.locator('#icAuto').uncheck();
   const fixture=(name,svg)=>({name,mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
   await page.locator('#icBackground').setInputFiles(fixture('room.svg','<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="blue"/></svg>'));
   await page.locator('#icPerson').setInputFiles(fixture('person.svg','<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect x="50" y="20" width="100" height="270" fill="red"/><rect x="50" y="20" width="30" height="50" fill="lime"/></svg>'));
   await page.waitForFunction(()=>!document.getElementById('icDownload').disabled);
   const signature=()=>page.locator('#icCanvas').evaluate(c=>c.toDataURL());
   const before=await signature();await page.locator('#icCanvas').scrollIntoViewIfNeeded();const box=await page.locator('#icCanvas').boundingBox();
   if(width===390){const session=await context.newCDPSession(page);const touch=(type,x,y)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});await touch('touchStart',box.x+box.width*.22,box.y+box.height*.72);await touch('touchMove',box.x+box.width*.65,box.y+box.height*.5);await touch('touchEnd');}
   else{await page.mouse.move(box.x+box.width*.22,box.y+box.height*.72);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.5);await page.mouse.up();}
   assert.notEqual(await signature(),before,'drag moves the person');
   await page.locator('#icSize').fill('80');await page.locator('#icFlip').click();assert.notEqual(await signature(),before);
   const download=page.waitForEvent('download');await page.locator('#icDownload').click();assert.match((await download).suggestedFilename(),/_人物合成.jpg$/);
   const cutout=page.waitForEvent('download');await page.locator('#icCutout').click();assert.equal((await cutout).suggestedFilename(),'人物_去背.png');
   assert(await page.locator('#imageComposer').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   await page.locator('#icAuto').check();await page.waitForFunction(()=>document.getElementById('icStatus').dataset.error==='true');assert(await page.locator('#icRetry').isEnabled());
   await page.locator('#icAuto').uncheck();await page.waitForFunction(()=>!document.getElementById('icDownload').disabled);
   await page.keyboard.press('Escape');assert(!await page.locator('#imageComposer').isVisible());assert(await page.locator('#imgToolModal').isVisible());
   assert.deepEqual(errors,[]);await context.close();console.log('PASS composer '+width+'px: upload, drag/touch, size, flip, downloads, offline fallback, ESC');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
