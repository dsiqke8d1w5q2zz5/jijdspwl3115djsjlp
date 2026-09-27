const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},acceptDownloads:true});await context.route('https://**/*',r=>r.abort());
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);await page.evaluate(()=>openImgTool());assert.equal(await page.locator('#icTab_crop').getAttribute('aria-selected'),'true');assert.deepEqual(await page.locator('.ic-tabs [role=tab]').allTextContents(),['裁切拼版','人物合成','品牌底條','文字','浮水印','局部遮蔽','輸出設定']);assert.equal(await page.locator('.ic-head #icTab_layouts').count(),1);await page.locator('#icTab_person').click();
  const fixture=(name,color,w=800,h=600)=>({name,mimeType:'image/svg+xml',buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${color}"/></svg>`)});
  const pixel=(id,x,y)=>page.locator('#'+id).evaluate((c,p)=>Array.from(c.getContext('2d').getImageData(Math.floor(c.width*p.x),Math.floor(c.height*p.y),1,1).data),{x,y});
  const signature=async()=>crypto.createHash('sha256').update(await page.locator('#icCanvas').evaluate(c=>c.toDataURL())).digest('hex');

  await page.evaluate(()=>{const Native=window.Image;window.Image=function(...args){const img=new Native(...args);Object.defineProperty(img,'onload',{set(fn){img.addEventListener('load',()=>{window._testLoads=(window._testLoads||0)+1;setTimeout(()=>fn.call(img),img.naturalWidth===640?350:window._testDelay||400);});}});return img;};});
  await page.locator('#icBackground').setInputFiles(fixture('cancelled.svg','blue'));await page.waitForFunction(()=>window._testLoads===1);await page.locator('#icClear').click();await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>_itFiles.length),0,'late loading photo must not reappear after clear');
  await page.evaluate(()=>window._testDelay=20);await page.locator('#icBackground').setInputFiles([fixture('good.svg','lime'),{name:'broken.png',mimeType:'image/png',buffer:Buffer.from('not an image')}]);await page.waitForFunction(()=>_itFiles.length===1);assert.equal(await page.evaluate(()=>_itFiles[0].name),'good.svg');assert(await page.locator('#icCanvas').isVisible());assert(await page.locator('#icStatus').textContent().then(t=>t.includes('1')&&t.includes('失敗')),'failed file is reported');
  await page.locator('#icClear').click();await page.locator('#icBackground').setInputFiles([fixture('slow-first.svg','red',640,480),fixture('fast-second.svg','lime')]);await page.waitForFunction(()=>_itFiles.length===2);assert.deepEqual(await page.evaluate(()=>_itFiles.map(f=>f.name)),['slow-first.svg','fast-second.svg'],'selection order survives reversed loading completion');
  await page.locator('#icBackground').setInputFiles({name:'all-broken.png',mimeType:'image/png',buffer:Buffer.from('broken')});await page.waitForFunction(()=>document.getElementById('icStatus').textContent.includes('0 張照片'));assert.equal(await page.evaluate(()=>_itFiles.length),2,'failed import leaves existing photos intact');
  assert.deepEqual(errors,[]);await context.close();console.log('PASS interruption '+width+'px: clear while decoding, corrupt file isolation and reporting');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
