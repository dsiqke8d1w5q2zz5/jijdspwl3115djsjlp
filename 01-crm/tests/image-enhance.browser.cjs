const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),fs=require('node:fs');
const {pathToFileURL}=require('node:url'),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 for(const width of [1440,390,320]){
  const p=await browser.newPage({viewport:{width,height:950},acceptDownloads:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('https://**/*',r=>r.abort());await p.goto(pathToFileURL(path.resolve('01-crm/index.html')).href);await p.evaluate(()=>openImgTool());await p.locator('#icTab_enhance').click();assert(await p.locator('#icEnhanceAuto').isDisabled());
  const fixture=(name,color)=>({name,mimeType:'image/svg+xml',buffer:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><defs><linearGradient id="g"><stop stop-color="#101820"/><stop offset="1" stop-color="${color}"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><rect x="100" y="80" width="120" height="100" fill="#607080"/></svg>`)});
  await p.locator('#icBackground').setInputFiles([fixture('長照片名稱'.repeat(12)+'.svg','#789090'),fixture('第二張.svg','#805030')]);await p.waitForFunction(()=>!document.getElementById('icDownload').disabled);
  const signature=()=>p.locator('#icCanvas').evaluate(c=>c.toDataURL());const original=await signature();
  await p.locator('#icEnhanceAuto').click();const optimized=await signature();assert.notEqual(optimized,original);
  await p.locator('#icUndo').click();assert.equal(await signature(),original);await p.locator('#icRedo').click();assert.equal(await signature(),optimized);
  await p.locator('#icEnhanceCompare').click();assert.equal(await signature(),original,'comparison keeps original pixels');assert.equal(await p.locator('#icEnhanceCompare').getAttribute('aria-pressed'),'true');
  // Download while comparing must still use enhanced pixels and the original dimensions.
  await p.locator('#icTab_output').click();await p.locator('#icFormat').selectOption('png');await p.locator('#itMax').fill('0');
  const download=p.waitForEvent('download');await p.locator('#icDownload').click();const out=path.join(os.tmpdir(),'crm-enhance-download-'+width+'.png');await (await download).saveAs(out);
  const pixels=await p.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=640;c.height=480;c.getContext('2d').drawImage(_itFiles[0].img,0,0);ImageEnhance.apply(c,{auto:true,sharpness:20});const expected=c.toDataURL();c.getContext('2d').drawImage(img,0,0);return {same:c.toDataURL()===expected,w:img.width,h:img.height};},'data:image/png;base64,'+fs.readFileSync(out).toString('base64'));assert.deepEqual(pixels,{same:true,w:640,h:480});
  await p.locator('#icTab_enhance').click();await p.locator('#icEnhanceCompare').click();await p.locator('#icPhotos button[data-id]').nth(1).click();assert.equal(await p.locator('#icEnhance_sharpness').inputValue(),'0','different photo retains own defaults');
  await p.locator('#icPhotos button[data-id]').nth(0).click();assert.equal(await p.locator('#icEnhance_sharpness').inputValue(),'20');
  await p.locator('#icEnhanceReset').click();assert.equal(await signature(),original,'reset restores original pixels');
  for(const [key,value]of [['brightness','40'],['shadows','60'],['saturation','40'],['warmth','-30'],['sharpness','60']])await p.locator('#icEnhance_'+key).fill(value);
  assert.notEqual(await signature(),original);await p.locator('#icApplyAll').click();await p.locator('#icPhotos button[data-id]').nth(1).click();assert.equal(await p.locator('#icEnhance_warmth').inputValue(),'-30');
  await p.locator('#icTab_layouts').click();await p.locator('#icLayoutName').fill('優化設定');await p.locator('#icLayoutSave').click();const saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('_crmImageLayouts_v1'))[0]);assert.equal(saved.settings.enhancement.sharpness,60);
  await p.reload();await p.evaluate(()=>openImgTool());await p.locator('#icTab_layouts').click();await p.locator('#icLayoutSelect').selectOption(saved.id);await p.locator('#icLayoutApply').click();await p.locator('#icTab_enhance').click();assert.equal(await p.locator('#icEnhance_warmth').inputValue(),'-30');
  const alpha=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=3;c.height=3;const ctx=c.getContext('2d');ctx.fillStyle='rgba(80,90,100,.5)';ctx.fillRect(0,0,2,2);const before=[...ctx.getImageData(0,0,3,3).data].filter((_,i)=>i%4===3);ImageEnhance.apply(c,{auto:true,sharpness:60,warmth:30});return {before,after:[...ctx.getImageData(0,0,3,3).data].filter((_,i)=>i%4===3)};});assert.deepEqual(alpha.after,alpha.before);
  assert(await p.locator('#imageComposer').evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.deepEqual(errors,[]);await p.close();console.log('PASS '+width+' optimization, reset, history, comparison, actual PNG download, per-photo/batch settings, layout reload, alpha and bounds');
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
