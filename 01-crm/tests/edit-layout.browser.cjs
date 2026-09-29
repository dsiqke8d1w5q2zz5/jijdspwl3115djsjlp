const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),{pathToFileURL}=require('node:url');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{for(const width of [1440,1200,390]){
const page=await browser.newPage({viewport:{width,height:960}});await page.route('https://**/*',r=>r.abort());await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
await page.evaluate(()=>{DB=[{id:'edit-layout-test',name:'版面測試',phone:'0900000000',type:'庫存屋主',types:['庫存屋主','房東','成交客戶','商機募集','經營買方','租客'],sName:'版面測試',sPhone:'0900000000',llName:'版面測試',sProperties:[{community:'測試社區',addr:'測試地址',price:'1200',contractType:'一般約',spDriveUrl:'https://example.invalid/folder'},{community:'第二物件',price:'1500'}],rProperties:[{rCommunity:'租案測試',rAddr:'租案地址',rent:'20000'}],deals:[{community:'成交測試',addr:'成交地址',price:'1000',date:'2025-01-01'}],dAddrs:[{community:'商機測試',addr:'商機地址'}],schedules:[{date:'2026-10-01',time:'15:00',memo:'行程測試'}]}];curFilter='庫存屋主';openEdit('edit-layout-test');});
const before=await page.evaluate(()=>JSON.stringify(DB[0]));assert.equal(await page.locator('.edit-pane').count(),width>=1200?3:0);
if(width>=1200){
 const pane=page.locator('.edit-property'),box=await pane.boundingBox(),foot=await page.locator('#fModal .modal-foot').boundingBox();assert(foot.y+foot.height<=960);
 const getters=await page.evaluate(()=>JSON.stringify([getSellerProperties(),getRentalProperties(),getDeals(),getDAddrs(),getSchedules()]));
 await page.setViewportSize({width:1100,height:960});await page.waitForFunction(()=>!document.querySelector('.edit-pane'));assert.equal(await page.locator('.edit-pane').count(),0);assert.equal(await page.evaluate(()=>JSON.stringify([getSellerProperties(),getRentalProperties(),getDeals(),getDAddrs(),getSchedules()])),getters);
 await page.setViewportSize({width,height:960});await page.waitForFunction(()=>document.querySelector('.edit-pane'));assert.equal(await page.locator('.edit-pane').count(),3);
 for(const type of ['庫存屋主','房東','成交客戶','商機募集','經營買方','租客']){await page.evaluate(t=>pickType(t),type);assert.equal(await page.locator('.type-sec.on').getAttribute('id'),'s-'+type);const overflow=await page.locator('.edit-property').evaluate(e=>e.scrollWidth-e.clientWidth);assert(overflow<=2,'no horizontal overflow '+type+': '+overflow);}
 await page.evaluate(()=>pickType('庫存屋主'));await pane.evaluate(e=>e.scrollTop=300);assert.equal(await page.locator('.edit-basic').evaluate(e=>e.scrollTop),0);assert.equal((await page.locator('#fModal .modal-foot').boundingBox()).y,foot.y);
 await pane.evaluate(e=>e.scrollTop=0);await page.locator('#fModal>.modal').screenshot({path:path.join(os.tmpdir(),'crm-edit-layout-'+width+'.png')});
}
assert.equal(await page.evaluate(()=>JSON.stringify(DB[0])),before);
await page.evaluate(()=>{document.getElementById('fModal').style.display='none';openAdd();});assert.equal(await page.locator('.edit-pane').count(),width>=1200?3:0);
await page.evaluate(()=>{openEdit('edit-layout-test');pickType('庫存屋主');document.querySelector('#sPropertyList [data-f="price"]').value='1250';window.persistAndSyncNow=()=>{};window.persist=()=>true;window.render=()=>{};saveClient();});
assert.equal(await page.evaluate(()=>DB.find(c=>c.id==='edit-layout-test').sProperties[0].price),'1250');assert.equal(await page.evaluate(()=>DB[0].sProperties[1].price),'1500');assert.equal(await page.evaluate(()=>DB[0].schedules[0].memo),'行程測試');
console.log('PASS edit layout '+width+': types, preserved fields, resize, fixed footer, save');await page.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});