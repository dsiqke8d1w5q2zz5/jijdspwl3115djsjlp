const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 for(const width of [1920,1440,430]){
  const page=await browser.newPage({viewport:{width,height:932}});await page.route('https://**/*',r=>r.abort());
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.evaluate(()=>{DB=[{id:'area',name:'測試',type:'庫存屋主',types:['庫存屋主'],sProperties:[{community:'測試',mainBldg:'5.6',ancBldg:'2.6',common:'4.51',baseLand:'1364.28',landShare:'0.42',floorPrice:'886',serviceFee:'4',mgmtBuilding:'763',mgmtPeriod:'月繳'}]}];curFilter='庫存屋主';showDet('area');});
  const area=page.locator('.det-property-more').filter({has:page.locator(':scope>summary',{hasText:'面積與持分明細'})}).first();
  await area.locator(':scope>summary').click();
  for(const row of await area.locator('.det-area-grid>.det-row').all()){
   const key=await row.locator('.det-key').boundingBox(),value=await row.locator('.det-val').boundingBox();
   assert(Math.abs(key.y-value.y)<2,'area label and value share a row');
   assert(await row.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'area content fits');
  }
  assert.equal(await area.locator('.det-row').filter({has:page.getByText('主建物',{exact:true})}).locator('.det-val').textContent(),'5.6坪');
  assert.equal(await area.getByText('共用',{exact:true}).count(),1);
  const other=page.locator('.det-property-more').filter({has:page.locator(':scope>summary',{hasText:'其他資料'})}).first();await other.locator(':scope>summary').click();
  const costs=other.locator('.det-cost-fields>.det-row');assert.equal(await costs.count(),3);
  const boxes=await costs.evaluateAll(els=>els.map(e=>({y:e.getBoundingClientRect().y,overflow:e.scrollWidth>e.clientWidth+1})));
  assert(!boxes.some(b=>b.overflow));if(width>=1440)assert(Math.max(...boxes.map(b=>b.y))-Math.min(...boxes.map(b=>b.y))<2,'three costs share a row');
  await page.evaluate(()=>{closeDet();DB[0].sProperties=[{community:'土地',baseLand:'9990.37',landShare:'9990.37'}];openEdit('area');});
  const editor=page.locator('#sPropertyList .area-editor').first(),totals=editor.locator('.area-totals');
  assert.equal(await totals.getAttribute('data-summary-kind'),'land');
  assert.deepEqual(await totals.locator('.area-metric-label').allTextContents(),['土地總面積','土地持分面積']);
  assert.equal(await totals.locator('.area-summary-meta').count(),0);
  await editor.getByLabel('主建物',{exact:true}).fill('10');
  assert.equal(await totals.getAttribute('data-summary-kind'),'building');
  await editor.getByLabel('主建物',{exact:true}).fill('');assert.equal(await totals.getAttribute('data-summary-kind'),'land');
  await page.evaluate(()=>{const root=document.querySelector('#sPropertyList>.person-block');const data=areaEditorData(root);data.common=[{kind:'parking',area:'10',unit:'ping',mode:'direct'}];mountAreaEditor(root,data);});
  assert.equal(await totals.getAttribute('data-summary-kind'),'building','parking-only is not classified as land');
  await page.close();console.log('PASS inline area/costs and land summary transitions '+width);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
