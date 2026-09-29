const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');const{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{for(const width of [1440,430]){
const page=await browser.newPage({viewport:{width,height:932}});await page.route('https://**/*',r=>r.abort());await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
await page.evaluate(()=>{DB=[{id:'landlord',name:'測試',type:'房東',types:['房東'],rProperties:[{rCommunity:'測試',rStartDate:'2026-01-01',rEndDate:'2026-12-31',rMgmtBuilding:'763',rMeterGas:'陽台',rEquipment:{冷氣:'2台'},rpRenewals:Array.from({length:5},()=>({oldEnd:'2025-12-31',newEnd:'2026-12-31'}))}]}];curFilter='房東';showDet('landlord');});
const panel=page.locator('.det-property-page:visible');assert.deepEqual(await panel.locator('details>summary').allTextContents(),['附屬設備']);
assert(await panel.getByText('建物管理費',{exact:true}).isVisible());assert(await panel.getByText('續約 5',{exact:true}).isVisible());assert(await panel.getByText('陽台',{exact:true}).isVisible());
const equipment=panel.locator('.det-equipment-more');assert.equal(await equipment.getAttribute('open'),null);await equipment.locator('summary').click();assert(await equipment.getByText('冷氣 2台',{exact:true}).isVisible());await equipment.locator('summary').click();assert.equal(await equipment.getAttribute('open'),null);
assert.equal(await page.evaluate(()=>DB[0].rProperties[0].rpRenewals.length),5);await page.close();console.log('PASS landlord fields visible; equipment alone collapses '+width);
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
