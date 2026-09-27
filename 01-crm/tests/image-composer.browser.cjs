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
   await page.evaluate(()=>openImgTool());await page.locator('#itUseWm').uncheck();await page.locator('#itUseCap').uncheck();await page.locator('#icUsePerson').check();
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
   const personOnly=await signature();await page.locator('#itUseCap').check();await page.locator('#itCapText').fill('歡迎賞屋');assert.notEqual(await signature(),personOnly,'caption is combined with person');
   const withCaption=await signature();await page.locator('#itUseWm').check();await page.locator('#itWmText').fill('測試浮水印');assert.notEqual(await signature(),withCaption,'watermark is combined with caption and person');
   const combined=await signature();await page.locator('#icBackground').setInputFiles(fixture('second.svg','<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1000"><rect width="600" height="1000" fill="white"/></svg>'));
   await page.waitForFunction(()=>document.querySelectorAll('#icPhotos button').length===2);await page.locator('#icPhotos button').nth(1).click();const portrait=await page.locator('#icCanvas').boundingBox();assert(Math.abs(portrait.width/portrait.height-.6)<.01,'portrait preview keeps aspect ratio');
   await page.locator('#icSize').fill('30');await page.locator('#icPhotos button').first().click();assert.equal(await signature(),combined,'each photo retains its own person placement');
   if(width===390){assert((await page.locator('.ic-preview').boundingBox()).y<(await page.locator('.ic-controls').boundingBox()).y,'phone preview is above controls');}
   const downloads=[];page.on('download',d=>downloads.push(d));await page.locator('#icAll').click();await page.waitForFunction(()=>!document.getElementById('icAll').disabled);assert.equal(downloads.length,2,'batch exports every photo');
   await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'crm-unified-'+width+'.png')});
   const download=page.waitForEvent('download');await page.locator('#icDownload').click();assert.match((await download).suggestedFilename(),/_編輯.jpg$/);
   const cutout=page.waitForEvent('download');await page.locator('#icCutout').click();assert.equal((await cutout).suggestedFilename(),'人物_去背.png');
   assert(await page.locator('#imageComposer').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   await page.locator('#icAuto').check();await page.waitForFunction(()=>document.getElementById('icStatus').dataset.error==='true');assert(await page.locator('#icRetry').isEnabled());
   await page.locator('#icAuto').uncheck();await page.waitForFunction(()=>!document.getElementById('icDownload').disabled);
   await page.keyboard.press('Escape');assert(!await page.locator('#imageComposer').isVisible());assert(!await page.locator('#imgToolModal').isVisible());
   assert.deepEqual(errors,[]);await context.close();console.log('PASS composer '+width+'px: upload, drag/touch, size, flip, downloads, offline fallback, ESC');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
