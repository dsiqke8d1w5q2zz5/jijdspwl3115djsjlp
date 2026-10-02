const assert=require('node:assert/strict');
const path=require('node:path');const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const base=path.join(__dirname,'fixtures/transcript');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:1707,height:840}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
 await page.goto(pathToFileURL(path.resolve('01-crm/index.html')).href);
 async function open(){await page.evaluate(()=>{window.auditState=TranscriptImport.emptyState();window.auditApplied=null;TranscriptImport.open(null,{readState:()=>auditState,apply:next=>auditApplied=next,notify:()=>{}})});}
 async function upload(names){await page.locator('.transcript-dialog input[type=file]').setInputFiles(names.map(n=>path.join(base,n+'.pdf')));await page.waitForFunction(()=>!document.querySelector('.transcript-dialog input[type=file]').disabled);}
 async function close(){await page.locator('.transcript-head button').click();await page.waitForSelector('.transcript-dialog',{state:'detached'});}
 await open();await upload(['building','land','building']);
 assert.equal(await page.locator('.transcript-row-head input').count(),4,'real PDF text extraction and duplicates');
 const summary=await page.locator('.transcript-preview').innerText();assert(summary.includes('45.38'));assert(summary.includes('3.03'));assert(summary.includes('48.4'));
 assert(await page.locator('.transcript-primary').isDisabled());
 await page.locator('.transcript-confirm input').check();assert(await page.locator('.transcript-primary').isEnabled());
 const first=page.locator('.transcript-card').first();await first.locator('summary').click();await first.getByLabel('總面積 m²',{exact:true}).fill('110');assert(await page.locator('.transcript-primary').isDisabled());
 await first.getByLabel('總面積 m²',{exact:true}).fill('-1');await page.locator('.transcript-confirm input').check();assert(await page.locator('.transcript-primary').isDisabled());
 await first.getByLabel('總面積 m²',{exact:true}).fill('100');await page.locator('.transcript-confirm input').check();await page.locator('.transcript-primary').click();await page.waitForSelector('.transcript-dialog',{state:'detached'});
 assert.equal(await page.evaluate(()=>auditApplied.main.area),'100.00');console.log('PASS actual PDF extraction, multi-file dedup, totals, edit validation, confirmation, apply');
 await open();await upload(['building']);await page.locator('.transcript-confirm input').check();await page.evaluate(()=>auditState.main.area='999');await page.locator('.transcript-primary').click();assert((await page.locator('.transcript-status').innerText()).includes('原表單已變動'));assert.equal(await page.evaluate(()=>auditApplied),null);await close();console.log('PASS stale form protection');
 await open();await upload(['land']);await page.locator('.transcript-footer button').filter({hasText:'取消'}).click();await page.waitForSelector('.transcript-dialog',{state:'detached'});assert.equal(await page.evaluate(()=>auditApplied),null);console.log('PASS cancel without writes');
 for(const n of ['blank','locked']){await open();await upload([n]);assert.equal(await page.locator('.transcript-row-head input').count(),0);assert(await page.locator('.transcript-primary').isDisabled());await close();console.log('PASS '+n+' PDF blocked');}
 await open();await page.locator('input[type=file]').last().setInputFiles({name:'broken.pdf',mimeType:'application/pdf',buffer:Buffer.from('not PDF')});await page.waitForFunction(()=>!document.querySelector('.transcript-dialog input[type=file]').disabled);assert(await page.locator('.transcript-primary').isDisabled());await upload(['land']);assert.equal(await page.locator('.transcript-row-head input').count(),1);await close();console.log('PASS corrupt PDF and retry');
 await open();await upload(Array(21).fill('land'));assert((await page.locator('.transcript-status').innerText()).includes('最多 20'));await close();

 await open();await upload(['building']);await page.locator('.transcript-card').first().locator('summary').click();await page.getByLabel('套入分類',{exact:true}).first().selectOption('parking');await page.locator('.transcript-confirm input').check();await page.locator('.transcript-primary').click();await page.waitForSelector('.transcript-dialog',{state:'detached'});assert.equal(await page.evaluate(()=>TranscriptImport.totals(auditApplied).parking),33.275);console.log('PASS reclassify main building to parking without double count');
 await page.evaluate(()=>{DB=[{id:'audit',name:'測試',type:'庫存屋主',types:['庫存屋主'],sProperties:[{community:'測試',mainBldg:'20'}]}];openEdit('audit');window.auditRoot=document.querySelector('#sPropertyList>.person-block');const s=areaEditorData(auditRoot);s.extraBuildings=[{kind:'main',area:'50',unit:'sqm',mode:'direct'}];mountAreaEditor(auditRoot,s);window.original=JSON.stringify(areaEditorData(auditRoot));TranscriptImport.open(auditRoot);});
 await upload(['building']);await page.locator('.transcript-confirm input').check();await page.locator('.transcript-primary').click();await page.waitForSelector('.transcript-dialog',{state:'detached'});assert.equal(await page.evaluate(()=>areaEditorData(auditRoot).extraBuildings.length),0);assert.equal(await page.evaluate(()=>auditRoot.querySelector('[data-f="mainBldg"]').value),'30.25');await page.getByRole('button',{name:'復原上次匯入',exact:true}).click();assert.equal(await page.evaluate(()=>JSON.stringify(areaEditorData(auditRoot))),await page.evaluate(()=>original));console.log('PASS real editor apply removes replaced extras and undo restores all original data');
 await page.goto(pathToFileURL(path.resolve('01-crm/index.html')).href);await page.evaluate(()=>TranscriptImport.openStandalone());await upload(['building']);await page.locator('.transcript-confirm input').check();await page.locator('.transcript-primary').click();await page.waitForSelector('.transcript-dialog',{state:'detached'});assert.equal(await page.locator('#sPropertyList [data-f="mainBldg"]').first().inputValue(),'30.25');console.log('PASS standalone analysis to inventory draft');
 for(const [type,list,add,get] of [['房東','rPropertyList','addRentalProperty','getRentalProperties'],['商機募集','dAddrList','addDAddrRow','getDAddrs']]){
  await page.evaluate(({type,list,add})=>{closeForm(true);DB=[];openAdd();pickType(type);window[add]({community:'匯入測試',rCommunity:'匯入測試',rSz:'8.74'});window.auditRoot=document.getElementById(list).lastElementChild._registeredRoot;window.original=JSON.stringify(areaEditorData(auditRoot));TranscriptImport.open(auditRoot);},{type,list,add});
  await upload(['building','land']);await page.locator('.transcript-confirm input').check();await page.locator('.transcript-primary').click();await page.waitForSelector('.transcript-dialog',{state:'detached'});
  const imported=await page.evaluate(get=>window[get]().at(-1),get);assert.equal(Number(imported.registeredArea.mainBldg),30.25);if(type==='房東')assert.equal(imported.rSz,'8.74');
  await page.evaluate(()=>auditRoot.querySelector('.transcript-toolbar button:last-child').click());assert.equal(await page.evaluate(()=>JSON.stringify(areaEditorData(auditRoot))),await page.evaluate(()=>original));console.log('PASS '+type+' actual PDF import and undo preserve rental area');
 }
 assert.deepEqual(errors,[]);console.log('PASS file count limit, no browser errors');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
