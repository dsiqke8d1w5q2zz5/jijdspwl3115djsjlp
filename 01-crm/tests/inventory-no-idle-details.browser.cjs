const assert=require('assert/strict'),fs=require('fs'),path=require('path'),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('https://**/*',r=>r.request().url().includes('buyer-feed.json')?r.fulfill({json:{schema:1,generatedAt:new Date().toISOString(),sources:[],listings:[]}}):r.abort());await p.route('http://localhost:43123/**',r=>{const f=path.resolve('01-crm','.'+new URL(r.request().url()).pathname);if(f.endsWith('inventory-transactions.json'))return r.fulfill({json:{schema:1,generatedAt:new Date().toISOString(),sources:[{id:'moi',status:'ok'}],listings:[]}});if(!fs.existsSync(f)||!fs.statSync(f).isFile())return r.fulfill({status:404,body:''});return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':'text/css'});});await p.addInitScript(()=>{window.invCalls=[];window.invJob=null;addEventListener('message',e=>{if(e.data?.channel!=='CRM_BUYER_REQUEST')return;const {id,type,payload}=e.data;invCalls.push({type,payload});if(type==='buyerVerify'&&window.holdVerify){window.releaseVerify=()=>postMessage({channel:'CRM_BUYER_RESPONSE',id,result:{checks:[]}},location.origin);return;}if(type==='inventorySearch'){invJob={id:'manual-'+Date.now(),buyerId:payload.id,status:'completed',startedAt:new Date().toISOString()};}if(type==='cancel'&&invJob)invJob.status='cancelled';let result=type==='hello'?{version:3,extensionVersion:'1.2.14'}:type==='inventorySync'||type==='sync'?{saved:payload.length}:type==='progress'?{job:invJob}:type==='last'?{inventoryFeeds:{}}:type==='buyerVerify'?{checks:window.verifyChecks||[]}:type==='inventorySearch'?{jobId:invJob.id}:{};postMessage({channel:'CRM_BUYER_RESPONSE',id,result},location.origin);});});await p.goto('http://localhost:43123/index.html');





await p.evaluate(async()=>{
 DB=[{id:'idle',name:'庫存補讀測試',type:'庫存屋主',types:['庫存屋主'],sProperties:[{community:'測試社區',addr:'新北市板橋區文化路一段100號',listingPurpose:'住宅'}]}];
 const e=InventoryMarket.entries()[0];e.c.inventoryWatch={[e.slot]:{...e.config,id:'idle-watch',enabled:true,searchPurpose:'住宅'}};persist();
 const records=Object.fromEntries(Array.from({length:7},(_,i)=>{const id='591:'+String(10000+i);return [id,{id,source:'591',url:'https://sale.591.com.tw/home/house/detail/2/'+(10000+i)+'.html',title:'測試社區住宅 '+i,address:e.config.address,community:'測試社區',price:3000,area:40,availability:'active',purposeAttemptedAt:'2020-01-01T00:00:00Z'}];}));
 await InventoryMarket.updateState('idle-watch',()=>({records,events:[],baselines:{},scans:{}}));
 invJob={id:'old-completed',buyerId:'inventory:idle-watch',status:'completed',startedAt:'2020-01-01T00:00:00Z'};
 InventoryMarket.open(e.key);
});
await p.waitForTimeout(300);
const details=()=>p.evaluate(()=>invCalls.filter(c=>['buyerVerify','inventoryVerify'].includes(c.type)));
assert.equal((await details()).length,0,'opening old missing fields must not verify');
await p.evaluate(async()=>{for(let i=0;i<3;i++){dispatchEvent(new Event('focus'));await InventoryMarket.tick(true);}await InventoryMarket.ingest(InventoryMarket.entries()[0],{schema:1,generatedAt:new Date().toISOString(),sources:[],listings:[]});});
await p.waitForTimeout(100);assert.equal((await details()).length,0,'focus, forced refresh and ingest must be read-only');
await p.locator('.im-config').evaluate(e=>e.open=true);await p.locator('#imSave').click();await p.waitForFunction(()=>document.querySelector('#imSaveNotice').dataset.state==='success');await p.waitForTimeout(100);assert.equal((await details()).length,0,'saving must not verify');
await p.clock.install();await p.clock.fastForward(16*60000);await p.waitForTimeout(150);assert.equal((await details()).length,0,'16 idle minutes must not verify');
// Fast completion before first progress poll is still an authorized manual search.
await p.locator('#imSearch').click();await p.evaluate(()=>InventoryMarket.tick());await p.waitForFunction(()=>invCalls.filter(c=>c.type==='buyerVerify').length===3);
assert.deepEqual((await details()).map(c=>c.payload.rows.length),[3,3,1]);
await p.evaluate(async()=>{for(let i=0;i<3;i++)await InventoryMarket.tick(true);});await p.clock.fastForward(16*60000);await p.waitForTimeout(100);assert.equal((await details()).length,3,'failed detail responses must not repeat');
const saved=await p.evaluate(()=>InventoryMarket.loadState('idle-watch'));assert.equal(Object.keys(saved.records).length,7);assert(saved.detailSearchId.startsWith('manual-'));
await p.locator('#imClose').click();await p.reload();await p.evaluate(()=>InventoryMarket.open());await p.waitForTimeout(200);assert.equal((await details()).length,0,'reload and reopening must not resume old supplemental work');
// A scheduled search actually seen running can authorize one completion pass too.
await p.evaluate(async()=>{invJob={id:'scheduled-1',buyerIds:['inventory:idle-watch'],status:'running',startedAt:new Date().toISOString()};await InventoryMarket.tick();invJob.status='completed';await InventoryMarket.tick();});await p.waitForFunction(()=>invCalls.filter(c=>c.type==='buyerVerify').length===3);
await p.evaluate(async()=>{await InventoryMarket.tick();await InventoryMarket.tick();});assert.equal((await details()).length,3);
// Cancellation must never authorize the post-search reader.
await p.evaluate(async()=>{invJob={id:'cancel-test',buyerId:'inventory:idle-watch',status:'running',startedAt:new Date().toISOString()};await InventoryMarket.tick();invJob.status='cancelled';await InventoryMarket.tick();});assert.equal((await details()).length,3);
// Missing-listing verification is likewise tied to one search, with at most one fallback.
await p.evaluate(async()=>{await InventoryMarket.updateState('idle-watch',s=>{for(const row of Object.values(s.records))row.usage='住家用';s.records['591:10000'].missingScans=1;s.scans={'591':{id:'missing-scan',at:new Date().toISOString()}};return s;});invJob={id:'missing-search',buyerId:'inventory:idle-watch',status:'running',startedAt:new Date().toISOString()};await InventoryMarket.tick();invJob.status='completed';await InventoryMarket.tick();});
await p.waitForFunction(async()=>(await InventoryMarket.loadState('idle-watch')).records['591:10000'].verifiedScan==='missing-scan');
assert.equal((await details()).length,5);assert.equal((await details()).at(-1).type,'inventoryVerify');
await p.evaluate(()=>InventoryMarket.tick(true));assert.equal((await details()).length,5);
// Failed detail reads already attempted by this search are not immediately requested again.
await p.evaluate(async()=>{const startedAt=new Date().toISOString();await InventoryMarket.updateState('idle-watch',s=>{for(const row of Object.values(s.records)){row.usage='';row.detailStatus='failed';row.detailAttemptedAt=startedAt;}return s;});invJob={id:'already-attempted',buyerId:'inventory:idle-watch',status:'running',startedAt};await InventoryMarket.tick();invJob.status='partial';await InventoryMarket.tick();});
await p.waitForTimeout(100);assert.equal((await details()).length,5);
// Disabling tracking during an outstanding request drops the rest of the batch queue.
await p.evaluate(async()=>{holdVerify=true;await InventoryMarket.updateState('idle-watch',s=>{for(const row of Object.values(s.records)){row.detailAttemptedAt='2020-01-01';row.missingScans=0;}return s;});invJob={id:'disable-mid-batch',buyerId:'inventory:idle-watch',status:'running',startedAt:new Date().toISOString()};await InventoryMarket.tick();invJob.status='completed';await InventoryMarket.tick();});
await p.waitForFunction(()=>typeof window.releaseVerify==='function');assert.equal((await details()).length,6);
await p.evaluate(()=>{const e=InventoryMarket.entries()[0];e.c.inventoryWatch[e.slot].enabled=false;persist();holdVerify=false;releaseVerify();});await p.waitForTimeout(150);assert.equal((await details()).length,6,'disabled tracking must not drain remaining requests');
// A subsequent explicit search can still enrich and persist a successful result.
await p.evaluate(async()=>{const e=InventoryMarket.entries()[0];e.c.inventoryWatch[e.slot].enabled=true;persist();verifyChecks=[{id:'591:10000',usage:'住家用',usageEvidence:'法定用途',availability:'available',detailStatus:'ok',price:1}];invJob={id:'new-successful-search',buyerId:'inventory:idle-watch',status:'running',startedAt:new Date().toISOString()};await InventoryMarket.tick();invJob.status='completed';await InventoryMarket.tick();});
await p.waitForFunction(async()=>(await InventoryMarket.loadState('idle-watch')).records['591:10000'].usage==='住家用');
assert.equal(await p.evaluate(async()=>(await InventoryMarket.loadState('idle-watch')).records['591:10000'].price),3000,'detail repair preserves tracked price baseline');
assert.deepEqual(errors,[]);console.log('PASS no detail requests on open/focus/save/ingest/16-minute idle/reload; manual and scheduled completion run once; failures and cancelled searches do not retry; records retained');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
