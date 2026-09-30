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
   assert.deepEqual(await rows.locator('.det-key').allTextContents(),['續約 '+count,'續約 '+(count-1),'續約 '+(count-2)]);
   const fold=group.locator('.det-renewal-history>.det-history-fold');assert.match(await fold.locator(':scope>summary').innerText(),new RegExp('展開其餘 '+(count-3)+' 筆'));await fold.locator(':scope>summary').click();assert.equal(await rows.count(),count);await fold.locator(':scope>summary').click();assert.equal(await rows.count(),3);
  }else assert.equal(await group.locator('.det-renewal-history>.det-history-fold').count(),0);
  assert.equal(await group.getByText('目前到期日',{exact:true}).count(),1);
  assert.equal(await page.evaluate(()=>DB[0].sProperties[0].spRenewals.length),count);
  await page.getByRole('tab',{name:'第二物件',exact:true}).click();
  assert.equal(await page.locator('.det-property-page:visible .det-history-fold[open]').count(),0);
  await page.close();console.log(`PASS renewal newest-three, expand/collapse, data preserved ${width}px / ${count} records`);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
