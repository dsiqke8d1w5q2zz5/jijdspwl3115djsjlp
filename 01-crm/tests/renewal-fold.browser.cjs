const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 for(const width of [1440,430])for(const count of [3,4,9]){
  const page=await browser.newPage({viewport:{width,height:932}});
  await page.route('https://**/*',r=>r.abort());await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.evaluate(count=>{const renewals=Array.from({length:count},(_,i)=>({oldStart:'2025-01-01',oldEnd:`2025-${String(i+1).padStart(2,'0')}-28`,newStart:'2025-02-01',newEnd:`2025-${String(i+2).padStart(2,'0')}-28`}));DB=[{id:'renewals',name:'測試',type:'庫存屋主',types:['庫存屋主'],sProperties:[{community:'第一物件',spRenewals:renewals,contractEnd:'2025-12-31',spPriceHistory:[{date:'2025-01-01',value:'2000'}]},{community:'第二物件',spRenewals:renewals,contractEnd:'2025-12-31'}]}];curFilter='庫存屋主';showDet('renewals');},count);
  const group=page.locator('.det-property-page:visible .det-property-more').filter({has:page.locator('summary',{hasText:'合約與價格歷程'})}).first();
  await group.locator(':scope>summary').click();
  const rows=group.locator('.det-row:visible').filter({has:page.locator('.det-key',{hasText:/^續約 \d+$/})});
  assert.equal(await rows.count(),3);
  if(count>3){
   assert.deepEqual(await rows.locator('.det-key').allTextContents(),['續約 1','續約 '+(count-1),'續約 '+count]);
   const ellipsis=await group.locator('.det-renewal-middle>summary .det-val').boundingBox(),date=await rows.first().locator('.det-val').boundingBox();assert(Math.abs(ellipsis.x-date.x)<1,'ellipsis aligns with date column');await group.locator('.det-renewal-middle>summary').click();assert.equal(await rows.count(),count);
   await group.locator('.det-renewal-middle>summary').click();assert.equal(await rows.count(),3);
  }else assert.equal(await group.locator('.det-renewal-middle').count(),0);
  const expiry=group.locator('.det-expiry-fold');
  const labelBox=await expiry.locator('..').locator('..').locator(':scope>.det-key').boundingBox(),summaryBox=await expiry.locator('summary').boundingBox();assert(Math.abs(labelBox.y-summaryBox.y)<2,'expiry label and value top align');const short=await expiry.locator('summary').innerText();assert(short.includes('⋯'));assert(short.includes('(現)'));
  await expiry.locator('summary').click();assert.equal(await expiry.locator(':scope>div:visible').count(),1);
  await expiry.locator('summary').click();assert.equal(await expiry.locator(':scope>div:visible').count(),0);
  assert.equal(await page.evaluate(()=>DB[0].sProperties[0].spRenewals.length),count);
  await page.getByRole('tab',{name:'第二物件',exact:true}).click();
  assert.equal(await page.locator('.det-property-page:visible .det-renewal-middle[open]').count(),0);
  await page.close();console.log(`PASS renewal first/last-two, expand/collapse, data preserved ${width}px / ${count} records`);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
