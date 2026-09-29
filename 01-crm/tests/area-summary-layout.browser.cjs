const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 for(const width of [1920,1440,430]){
  const page=await browser.newPage({viewport:{width,height:932}});await page.route('https://**/*',r=>r.abort());
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.evaluate(()=>{DB=[{id:'area',name:'測試',type:'庫存屋主',types:['庫存屋主'],sProperties:[{community:'測試',price:'918',mainBldg:'5.6',ancBldg:'2.6',common:'4.51',baseLand:'1364.28',landShare:'0.42',floorPrice:'886',serviceFee:'4',mgmtBuilding:'17439',mgmtCar:'1500',mgmtMoto:'200',mgmtPeriod:'月繳'}]}];curFilter='庫存屋主';showDet('area');});
  const area=page.locator('.det-property-more').filter({has:page.locator(':scope>summary',{hasText:'面積與持分明細'})}).first();
  await area.locator(':scope>summary').click();
  for(const row of await area.locator('.det-area-grid>.det-row').all()){
   const key=await row.locator('.det-key').boundingBox(),value=await row.locator('.det-val').boundingBox();
   assert(Math.abs(key.y-value.y)<2,'area label and value share a row');
   assert(await row.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'area content fits');
  }
  assert.equal(await area.locator('.det-row').filter({has:page.getByText('主建物',{exact:true})}).locator('.det-val').textContent(),'5.6坪');
  assert.equal(await area.getByText('共用',{exact:true}).count(),1);
  const property=page.locator('.det-property-page:visible');
  const field=label=>property.locator('.det-row').filter({has:page.locator('.det-key',{hasText:new RegExp('^'+label+'$')})});
  for(const label of ['開價','底價','服務費','管理費'])assert(await field(label).isVisible(),label+' is directly visible');
  for(const labels of [['開價','底價'],['服務費','管理費']]){
   const boxes=await Promise.all(labels.map(label=>field(label).boundingBox()));
   if(width>=1440)assert(Math.abs(boxes[0].y-boxes[1].y)<2,labels.join('/')+' shares a row');
   for(const label of labels)assert(await field(label).evaluate(e=>e.scrollWidth<=e.clientWidth+1),'cost content fits');
  }
  const managementLines=field('管理費').locator('.det-management-lines>span');
  assert.deepEqual(await managementLines.allTextContents(),['建物 17439元','汽車位 1500元','機車位 200元／月繳']);
  const lineBoxes=await managementLines.evaluateAll(els=>els.map(e=>e.getBoundingClientRect().toJSON()));
  assert(lineBoxes[1].y>=lineBoxes[0].y+lineBoxes[0].height,'parking fee starts on its own line');
  assert.equal(await property.locator(':scope>details>summary').filter({hasText:'其他資料'}).count(),0,'no empty other section');
  assert((await field('底價').boundingBox()).y<(await field('登記面積').boundingBox()).y,'prices precede area');
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
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);await page.evaluate(()=>{DB=[{id:'opportunity-area',name:'測試',type:'商機募集',types:['商機募集'],dAddrs:[{community:'第一商機',bldgSz:'19.55'},{community:'第二商機',landSz:'120'}]}];curFilter='商機募集';showDet('opportunity-area');});const visible=page.locator('.det-property-page:visible');assert(await visible.getByText('19.55坪',{exact:true}).isVisible(),'opportunity area visible without expanding');assert.equal(await visible.getByText('面積與持分明細',{exact:true}).count(),0);assert.equal(await visible.locator('.det-area-section').count(),0);assert(await visible.locator(':scope>.det-row').filter({hasText:'建物坪數'}).isVisible());await page.getByRole('tab',{name:'第二商機',exact:true}).click();assert(await visible.getByText('120坪',{exact:true}).isVisible(),'opportunity land visible after switching');await page.close();console.log('PASS inline area/costs, land summary and always-visible opportunity area '+width);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
