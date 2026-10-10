const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
for(const width of [1440,1024]){
 const p=await browser.newPage({viewport:{width,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('https://**/*',r=>r.abort());await p.route('http://localhost:43123/**',r=>{const name=new URL(r.request().url()).pathname;if(name.endsWith('buyer-feed.json'))return r.fulfill({json:{schema:1,sources:[],listings:[]}});const f=path.resolve('01-crm','.'+name);return r.fulfill({contentType:f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':'text/css',body:fs.readFileSync(f)});});
 await p.goto('http://localhost:43123/index.html');await p.evaluate(()=>{DB=[{id:'confirmation',name:'買方長姓名測試',types:['經營買方'],bDemands:[{areaCities:['新北市'],matchCriteria:{searchPurpose:'住宅'}}],buyerMatching:{auto:true}}];persist();BuyerMatching.open('confirmation');});
 await p.waitForFunction(()=>document.querySelector('#bmStatus').textContent.includes('最後取得'));
 await p.evaluate(()=>{const base={source:'591',city:'新北市',district:'板橋區',price:99999999,area:9999,age:20,floor:10,rooms:4,type:'電梯大樓',address:'新北市板橋區文化路一段很長的社區門牌地址'.repeat(5),title:'具有很長名稱的物件與車位說明'.repeat(6)};BuyerResults.ingest(DB[0],{schema:1,includeExcluded:true,generatedAt:new Date().toISOString(),sources:[{id:'591',status:'ok'}],listings:[{...base,id:'591:1',usage:'住家用'},{...base,id:'591:2',price:3000},{...base,id:'591:3',usage:'工業用'}]});document.querySelector('#bmSource').dispatchEvent(new Event('change'));});

 await p.evaluate(()=>{const row=BuyerResults.rows(DB[0]).find(p=>p.id==='591:1');BuyerResults.ingest(DB[0],{schema:1,incremental:true,generatedAt:new Date().toISOString(),sources:[],listings:[{...row,id:'591:4'},{...row,id:'yungching:5',source:'yungching'}]});document.querySelector('#bmSource').dispatchEvent(new Event('change'));});

 await p.evaluate(()=>{DB[0].bDemands[0].matchCriteria.areaBasis='main';DB[0].bDemands[0].matchCriteria.areaMin=20;persist();document.querySelector('#bmSource').dispatchEvent(new Event('change'));});
 await p.locator('#bmTabs [data-view=pending]').click();await p.locator('#bmSource').selectOption('591');
 await p.screenshot({path:require('os').tmpdir()+'/buyer-pair-'+width+'.png'});await p.locator('.bm-property-group > .bm-card [data-action=confirm]').first().click();assert((await p.locator('#bmConfirmDialog').innerText()).includes('3 筆刊登'));await p.locator('#bmConfirmDialog .bm-confirm-accept').click();await p.waitForFunction(()=>!document.querySelector('#bmConfirmDialog'));await p.waitForTimeout(50);
 assert(await p.evaluate(()=>['591:1','591:4','yungching:5'].every(id=>Object.keys(DB[0].buyerMatching.confirmations).some(k=>k.includes(id)))));
 await p.locator('#bmTabs [data-view=matched]').click();await p.locator('.bm-property-group > .bm-card .bm-detail-button').first().click();await p.locator('[data-action=unconfirm]').first().click();assert.equal(await p.evaluate(()=>Object.keys(DB[0].buyerMatching.confirmations).length),0);
 await p.locator('#bmTabs [data-view=pending]').click();await p.locator('.bm-property-group > .bm-card [data-action=confirm]').first().click();await p.locator('#bmConfirmDialog .bm-confirm-accept').click();await p.waitForFunction(()=>!document.querySelector('#bmConfirmDialog'));await p.waitForTimeout(50);await p.locator('#bmClose').click();await p.evaluate(()=>BuyerMatching.open('confirmation'));await p.waitForFunction(()=>document.querySelector('#bmStatus').textContent.includes('最後取得'));await p.locator('#bmTabs [data-view=matched]').click();assert(await p.locator('[data-action=unconfirm]').count());
 await p.evaluate(()=>{delete DB[0].bDemands[0].matchCriteria.areaBasis;delete DB[0].bDemands[0].matchCriteria.areaMin;persist();document.querySelector('#bmSource').dispatchEvent(new Event('change'));});
 assert.equal(await p.locator('[data-track=status]').count(),0);
 await p.screenshot({path:require('os').tmpdir()+'/buyer-simple-'+width+'.png'});
 await p.locator('#bmSource').selectOption('591');
 await p.locator('[data-action=reject-match]').first().click();
 assert.equal(await p.locator('.bm-card').count(),0);
 assert(await p.evaluate(()=>['591:1','591:4','yungching:5'].every(id=>DB[0].buyerMatching.tracking[id].status==='rejected')));
 await p.evaluate(()=>BuyerResults.flush());await p.reload();await p.waitForFunction(()=>typeof BuyerMatching!=='undefined');await p.evaluate(()=>BuyerMatching.open('confirmation'));await p.waitForFunction(()=>document.querySelector('#bmStatus').textContent.includes('最後取得'));
 assert.equal(await p.locator('.bm-card').count(),0);
 await p.locator('#bmView').selectOption('hidden');await p.locator('[data-action=restore-match]').first().click();
 assert(await p.evaluate(()=>['591:1','591:4','yungching:5'].every(id=>DB[0].buyerMatching.tracking[id].status==='unread')));
 await p.locator('#bmTabs [data-view=matched]').click();
 await p.evaluate(()=>{DB[0].buyerMatching.separateListings=['591:4'];persist();document.querySelector('#bmSource').dispatchEvent(new Event('change'));});
 await p.locator('.bm-card[data-id="591:4"] [data-action=reject-match]').first().click();
 assert.equal(await p.evaluate(()=>DB[0].buyerMatching.tracking['591:1'].status),'unread');
 assert.equal(await p.evaluate(()=>DB[0].buyerMatching.tracking['591:4'].status),'rejected');
 await p.evaluate(()=>{DB[0].buyerMatching.hidden=[];DB[0].buyerMatching.tracking['591:2']={status:'rejected',reason:'舊拒絕原因'};persist();document.querySelector('#bmSource').dispatchEvent(new Event('change'));});await p.locator('#bmView').selectOption('hidden');assert(await p.locator('.bm-card[data-id="591:2"]').count());await p.locator('.bm-card[data-id="591:2"] [data-action=restore-match]').click();await p.locator('#bmTabs [data-view=pending]').click();assert(await p.locator('[data-action=confirm]').count());assert(await p.locator('[data-action=reject-match]').count());assert.equal(await p.evaluate(()=>DB[0].buyerMatching.tracking['591:2'].reason),'舊拒絕原因');
 assert.deepEqual(errors,[]);await p.close();console.log('PASS group rejection across sources, reload, group restore and manual separation',width);
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
