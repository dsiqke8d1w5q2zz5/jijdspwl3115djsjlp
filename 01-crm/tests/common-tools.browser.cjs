const assert=require('assert/strict'),fs=require('fs'),path=require('path'),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('https://**/*',r=>r.request().url().includes('buyer-feed.json')?r.fulfill({json:{schema:1,generatedAt:new Date().toISOString(),sources:[],listings:[]}}):r.abort());await p.route('http://localhost:43123/**',r=>{const f=path.resolve('01-crm','.'+new URL(r.request().url()).pathname);if(f.endsWith('inventory-transactions.json'))return r.fulfill({json:{schema:1,generatedAt:new Date().toISOString(),sources:[{id:'moi',status:'ok'}],listings:[]}});if(!fs.existsSync(f)||!fs.statSync(f).isFile())return r.fulfill({status:404,body:''});return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':'text/css'});});await p.addInitScript(()=>{window.invCalls=[];window.invJob=null;addEventListener('message',e=>{if(e.data?.channel!=='CRM_BUYER_REQUEST'||['dailyStatus','dailyRetry'].includes(e.data.type))return;const {id,type,payload}=e.data;invCalls.push({type,payload});if(type==='cancel'&&invJob)invJob.status='cancelled';let result=type==='hello'?{version:3,extensionVersion:'1.2.14'}:type==='inventorySync'||type==='sync'?{saved:payload.length}:type==='progress'?{job:invJob}:type==='last'?{inventoryFeeds:{}}:type==='buyerVerify'?{checks:payload.rows.map(p=>({id:p.id,...(['yungching:7417941','591:20734577'].includes(p.id)?{usage:'住家用',usageEvidence:'法定用途',availability:'available'}:{})}))}:type==='inventorySearch'?{jobId:'test'}:{};postMessage({channel:'CRM_BUYER_RESPONSE',id,result},location.origin);});});await p.goto('http://localhost:43123/index.html');






for(const width of [1920,1440,1200,1024,780,430]){
 await p.setViewportSize({width,height:1000});
 const mobile=width<=768;
 const trigger=p.locator(mobile?'.mobile-cloud [aria-controls="commonToolsPanel"]':'.common-tools-wrap > button');
 await trigger.click();assert(await p.locator('#commonToolsPanel').isVisible());
 assert.deepEqual(await p.locator('#commonToolsPanel button').allTextContents(),[' 常用範本',' 圖片編輯',' 謄本分析']);
 const rect=await p.locator('#commonToolsPanel').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width+1);
 await p.screenshot({path:path.join(process.env.TEMP,'common-tools-'+width+'.png')});
 await p.keyboard.press('Escape');assert(await p.locator('#commonToolsPanel').isHidden());
}
await p.setViewportSize({width:1440,height:1000});
assert.equal(await p.locator('[data-bulk="inventory"] + button').innerText(),'早上報告');
assert(await p.locator('.header-tools [onclick="openPerformance()"] + .mc-checkin').count());
await p.locator('.common-tools-wrap > button').click();await p.getByRole('button',{name:'常用範本',exact:true}).click();assert(await p.locator('#commonToolsPanel').isHidden());
assert.deepEqual(errors,[]);console.log('PASS tool menu, labels, order, escape, template action, 6 widths');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});