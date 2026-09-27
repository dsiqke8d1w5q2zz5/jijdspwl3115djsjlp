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
   await page.evaluate(()=>openImgTool());await page.locator('#icUsePerson').check();
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
   const natural=await signature();await page.locator('#icStyle').selectOption('sticker');assert.notEqual(await signature(),natural,'white outline appears without rerunning cutout');
   const thin=await signature();await page.locator('#icOutline').fill('8');assert.notEqual(await signature(),thin,'outline thickness updates preview');await page.locator('#icStyle').selectOption('natural');assert.equal(await signature(),natural,'natural restores the unoutlined image');
   await page.locator('#icTab_caption').click();const personOnly=await signature();await page.locator('#itUseCap').check();await page.locator('#itCapText').fill('歡迎賞屋');assert.notEqual(await signature(),personOnly,'caption is combined with person');
   const whiteText=await signature();await page.locator('#itCapColor').fill('#ff3300');assert.notEqual(await signature(),whiteText,'caption color updates pixels');
   const sansText=await signature();await page.locator('#itCapFont').selectOption('serif');assert.notEqual(await signature(),sansText,'caption font updates pixels');
   await page.locator('#itCapPos').selectOption('bl');
   const compact=await page.evaluate(()=>{const c=document.createElement('canvas'),ctx=c.getContext('2d'),original=ctx.roundRect;let height;ctx.roundRect=function(x,y,w,h,r){height=h;return original.call(this,x,y,w,h,r);};itDraw(c,_itFiles[0].img,itOpts(),1000,750);itSaveCfg();return{height,cfg:JSON.parse(localStorage.getItem('_imgToolCfg'))};});
   assert(compact.height>20&&compact.height<60,'single-line caption background fits glyphs with compact padding');assert.equal(compact.cfg.itCapColor,'#ff3300');assert.equal(compact.cfg.itCapFont,'serif');
   await page.locator('#itCapBox .ic-palette button[aria-label="藍"]').click();assert.equal(await page.locator('#itCapColor').inputValue(),'#1565c0');
   assert.equal(await page.locator('#itCapFont option').count(),6);
   await page.locator('#icTab_brand').click();await page.locator('#icUseBrand').check();await page.locator('#icBrand_company').fill('安心房屋');await page.locator('#icBrand_name').fill('王小明');await page.locator('#icBrand_phone').fill('0912-345-678');await page.locator('#icBrand_tagline').fill('陪你找到理想的家');
   const banners=new Set();for(const theme of ['navy','ribbon','clean','floating','stacked','sticker','outline','editorial']){await page.locator('[data-theme="'+theme+'"]').click();banners.add(await signature());}assert.equal(banners.size,8,'eight distinct banner layouts render');
   await page.locator('#icBrandRoom').click();assert.equal(await page.locator('#icBrand_width').inputValue(),'70');assert.equal(await page.locator('#icBrand_position').inputValue(),'right');
   const placement=await page.evaluate(()=>['left','center','right'].map(position=>{const c=document.createElement('canvas');c.width=1000;c.height=600;const ctx=c.getContext('2d');BrandBanner.draw(ctx,1000,600,{...BrandBanner.options(),position,width:70});const row=ctx.getImageData(0,590,1000,1).data;let first=-1,last=-1;for(let x=0;x<1000;x++)if(row[x*4+3]){if(first<0)first=x;last=x;}return[first,last];}));assert.deepEqual(placement,[[0,699],[150,849],[300,999]],'partial banners leave the requested area transparent');
   await page.locator('#icBrandFull').click();assert.equal(await page.locator('#icBrand_width').inputValue(),'100');
   for(const key of ['brandSize','nameSize','phoneSize','tagSize']){const initial=await signature();await page.locator('#icBrand_'+key).fill('120');assert.notEqual(await signature(),initial,key+' updates drawing');assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem('_crmBrandBanner'))[k],key),120);await page.locator('#icBrand_'+key).fill('100');}
   const order=await page.evaluate(()=>{const c=document.createElement('canvas'),ctx=c.getContext('2d'),rows=[];ctx.fillText=(text,x,y)=>rows.push({text,x,y});BrandBanner.draw(ctx,1200,800,{...BrandBanner.options(),company:'品牌',name:'姓名',phone:'電話',tagline:''});return rows;});const brandRow=order.find(r=>r.text==='品牌'),nameRow=order.find(r=>r.text==='姓名');assert(brandRow.x<nameRow.x&&brandRow.y===nameRow.y,'brand precedes name on the same line');assert.deepEqual(order.map(r=>r.text).sort(),['品牌','姓名','電話'].sort(),'no fixed contact prompt');
   const hierarchy=await page.evaluate(()=>{const results=[];for(const theme of ['navy','ribbon','clean','floating','stacked','sticker','outline','editorial']){const c=document.createElement('canvas');c.width=1200;c.height=800;const ctx=c.getContext('2d'),sizes={},fill=ctx.fillText;ctx.fillText=function(t,...args){sizes[t]=parseFloat(this.font.match(/([\d.]+)px/)[1]);return fill.call(this,t,...args);};BrandBanner.draw(ctx,1200,800,{...BrandBanner.options(),theme,font:'sans',name:'王小明',phone:'0912-345-678'});results.push(sizes['王小明']>sizes['0912-345-678']);}return results;});assert(hierarchy.every(Boolean),'name is larger than phone in every template');
   assert.equal(await page.locator('#icCanvas').evaluate(c=>Math.max(c.width,c.height)),2400,'preview draws typography at high resolution');
   await page.locator('#icBrand_height').fill('20');await page.locator('#icBrand_font').selectOption('book');
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('_crmBrandBanner')).phone),'0912-345-678');
   const inset=await page.evaluate(()=>{const c=document.createElement('canvas'),ctx=c.getContext('2d'),rr=ctx.roundRect;let bottom;ctx.roundRect=function(x,y,w,h,r){bottom=y+h;return rr.call(this,x,y,w,h,r);};itDraw(c,_itFiles[0].img,{...itOpts(),brandInset:150},1000,750);return bottom;});assert(inset<=600,'caption stays above banner');
   await page.locator('#icTab_watermark').click();const withCaption=await signature();await page.locator('#itUseWm').check();await page.locator('#itWmText').fill('測試浮水印');assert.notEqual(await signature(),withCaption,'watermark is combined with caption and person');
   const combined=await signature();await page.locator('#icBackground').setInputFiles(fixture('second.svg','<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1000"><rect width="600" height="1000" fill="white"/></svg>'));
   await page.waitForFunction(()=>document.querySelectorAll('#icPhotos button').length===2);await page.locator('#icPhotos button').nth(1).click();const portrait=await page.locator('#icCanvas').boundingBox();assert(Math.abs(portrait.width/portrait.height-.6)<.01,'portrait preview keeps aspect ratio');
   await page.locator('#icTab_person').click();await page.locator('#icSize').fill('30');await page.locator('#icPhotos button').first().click();assert.equal(await signature(),combined,'each photo retains its own person placement');
   if(width===390){assert((await page.locator('.ic-preview').boundingBox()).y<(await page.locator('.ic-controls').boundingBox()).y,'phone preview is above controls');}
   assert.equal(await page.locator('.ic-controls > [role=tabpanel]:visible').count(),1,'only active settings panel is visible');
   const downloads=[];page.on('download',d=>downloads.push(d));await page.locator('#icAll').click();await page.waitForFunction(()=>!document.getElementById('icAll').disabled);assert.equal(downloads.length,2,'batch exports every photo');
   await page.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'crm-unified-'+width+'.png')});
   const download=page.waitForEvent('download');await page.locator('#icDownload').click();const exported=await download;assert.match(exported.suggestedFilename(),/_編輯.jpg$/);
   const jpg=require('node:fs').readFileSync(await exported.path()).toString('base64');const dimensions=await page.evaluate(async data=>{const image=new Image();image.src='data:image/jpeg;base64,'+data;await image.decode();return [image.width,image.height];},jpg);assert.equal(Math.max(...dimensions),1920,'brand text exported at configured high resolution');
   const cutout=page.waitForEvent('download');await page.locator('#icCutout').click();assert.equal((await cutout).suggestedFilename(),'人物_去背.png');
   assert(await page.locator('#imageComposer').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   let stalled;const runtime='https://cdn.jsdelivr.net/npm/onnxruntime-web@**';
   await context.route(runtime,r=>{stalled=r;});
   await page.locator('#icAuto').check();await page.locator('#icCancel').click();
   assert.match(await page.locator('#icStatus').innerText(),/已取消/);assert(await page.locator('#icRetry').isEnabled());
   await context.unroute(runtime);if(stalled)await stalled.abort().catch(()=>{});
   await page.locator('#icRetry').click();await page.waitForFunction(()=>document.getElementById('icStatus').dataset.error==='true');assert(await page.locator('#icRetry').isEnabled());
   await page.locator('#icAuto').uncheck();await page.waitForFunction(()=>!document.getElementById('icDownload').disabled);
   await page.keyboard.press('Escape');assert(!await page.locator('#imageComposer').isVisible());assert(!await page.locator('#imgToolModal').isVisible());
   await page.reload();await page.evaluate(()=>openImgTool());await page.locator('#icTab_brand').click();assert(!await page.locator('#icUseBrand').isChecked(),'opening does not automatically apply banner');await page.locator('#icUseBrand').check();assert.equal(await page.locator('#icBrand_phone').inputValue(),'0912-345-678','brand content survives reload');
   assert.equal(await page.locator('#icBrandTemplates button[aria-pressed=true]').getAttribute('data-theme'),'editorial');
   await page.locator('#icTab_brand').focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#icTab_watermark').getAttribute('aria-selected'),'true');
   assert.deepEqual(errors,[]);await context.close();console.log('PASS composer '+width+'px: upload, drag/touch, size, flip, downloads, offline fallback, ESC');
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
