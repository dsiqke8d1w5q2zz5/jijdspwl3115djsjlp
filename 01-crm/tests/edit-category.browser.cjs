const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.route('https://**/*',r=>r.abort());
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.evaluate(()=>{DB=[{id:'category-test',name:'測試',type:'商機募集',types:['商機募集','庫存屋主'],sProperties:[{community:'庫存測試'}],dAddrs:[{addr:'板橋區中山路1號'}]}];curFilter='商機募集';showDet('category-test');});
  await page.getByRole('tab',{name:'庫存資料',exact:true}).click();
  await page.getByRole('button',{name:'編輯目前資料'}).click();
  assert.equal(await page.evaluate(()=>activeView),'庫存屋主');
  await page.locator('#fModal .modal-head .btn-x').click();
  await page.waitForFunction(()=>document.getElementById('dModal').style.display==='flex');
  await page.getByRole('tab',{name:'商機資料',exact:true}).click();
  await page.getByRole('button',{name:'編輯目前資料'}).click();
  assert.equal(await page.evaluate(()=>activeView),'商機募集');
  await page.locator('#fModal .modal-head .btn-x').click();
  await page.waitForFunction(()=>document.getElementById('dModal').style.display==='flex');
  await page.evaluate(()=>{closeDet();openEdit('category-test');});
  assert.equal(await page.evaluate(()=>activeView),'庫存屋主');
  console.log('PASS current detail category and leftmost enabled default');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
