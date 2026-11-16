const assert=require('assert/strict'),fs=require('fs'),path=require('path'),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('https://**/*',r=>r.request().url().includes('buyer-feed.json')?r.fulfill({json:{schema:1,generatedAt:new Date().toISOString(),sources:[],listings:[]}}):r.abort());await p.route('http://localhost:43123/**',r=>{const f=path.resolve('01-crm','.'+new URL(r.request().url()).pathname);if(f.endsWith('inventory-transactions.json'))return r.fulfill({json:{schema:1,generatedAt:new Date().toISOString(),sources:[{id:'moi',status:'ok'}],listings:[]}});if(!fs.existsSync(f)||!fs.statSync(f).isFile())return r.fulfill({status:404,body:''});return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':'text/css'});});await p.addInitScript(()=>{window.invCalls=[];window.invJob=null;addEventListener('message',e=>{if(e.data?.channel!=='CRM_BUYER_REQUEST'||['dailyStatus','dailyRetry'].includes(e.data.type))return;const {id,type,payload}=e.data;invCalls.push({type,payload});if(type==='cancel'&&invJob)invJob.status='cancelled';let result=type==='hello'?{version:3,extensionVersion:'1.2.14'}:type==='inventorySync'||type==='sync'?{saved:payload.length}:type==='progress'?{job:invJob}:type==='last'?{inventoryFeeds:{}}:type==='buyerVerify'?{checks:payload.rows.map(p=>({id:p.id,...(['yungching:7417941','591:20734577'].includes(p.id)?{usage:'住家用',usageEvidence:'法定用途',availability:'available'}:{})}))}:type==='inventorySearch'?{jobId:'test'}:{};postMessage({channel:'CRM_BUYER_RESPONSE',id,result},location.origin);});});await p.goto('http://localhost:43123/index.html');







await p.evaluate(()=>{
 autoSync=async()=>{};persistAndSyncNow=()=>persist();confirmAction=(message,yes)=>yes();window.toasts=[];showToast=(...a)=>toasts.push(a);
 const date=localDateISO(),memo='長備註與地址：新北市板橋區文化路一段123號十五樓之八，估價金額123456789012元。'.repeat(8);
 window.longMemo=memo;DB=[{id:'c',name:'很長的客戶名稱'.repeat(8),type:'房東',types:['房東'],schedules:[{id:'w1',date,memo:'工作第一筆'},{id:'w2',date,memo,propertyRef:{label:'很長社區名稱'.repeat(8),address:'新北市板橋區文化路一段123號十五樓之八',clientId:'c'},schedType:'房東'}]},{id:'_personalSchedules',_system:true,schedules:[{id:'p1',date,memo:'個人第一筆'},{id:'p2',date,memo:'指定第二筆'},{id:'p3',date,memo:'個人第三筆'},{id:'p4',date,time:'19:00',memo:'同時第一筆'},{id:'p5',date,time:'19:00',memo:'同時第二筆'}],todos:[]}];persist();render();
});
async function convertRow(text){const row=p.locator('#dashSchedule .dash-clickedit').filter({hasText:text});await row.locator('[title="更多"]').click();await p.locator('.dash-menu-action[title="轉待辦"]').click();}
await convertRow('指定第二筆');
assert.deepEqual(await p.evaluate(()=>({deleted:_getPS().filter(s=>s._deleted).map(s=>s.id),todos:_getPT().map(t=>t.memo)})),{deleted:['p2'],todos:['指定第二筆']});
await convertRow('同時第二筆');
assert.deepEqual(await p.evaluate(()=>_getPS().filter(s=>s._deleted).map(s=>s.id)),['p2','p5']);
await p.evaluate(()=>showAllSchedules());await p.locator('#all-sched-list .all-sched-row').filter({hasText:'個人第三筆'}).locator('[title="轉待辦"]').click();
assert.deepEqual(await p.evaluate(()=>_getPT().map(t=>t.memo)),['指定第二筆','同時第二筆','個人第三筆']);
await p.evaluate(()=>{document.querySelectorAll('.fill-overlay').forEach(e=>e.remove());});
const work=p.locator('#dashSchedule .dash-clickedit').filter({hasText:'估價金額'});await work.locator('[title="更多"]').click();await p.locator('.dash-menu-action[title="轉待辦"]').click();
assert.equal(await p.evaluate(()=>DB.find(c=>c.id==='c').todos[0].memo===longMemo),true);
assert.equal(await p.evaluate(()=>DB.find(c=>c.id==='c').todos[0].propertyRef.address),'新北市板橋區文化路一段123號十五樓之八');
assert.deepEqual(await p.evaluate(()=>DB.find(c=>c.id==='c').schedules.filter(s=>s._deleted).map(s=>s.id)),['w2']);
// Ambiguous legacy records, stale IDs and repeated clicks must never convert another row.
await p.evaluate(()=>{const date=localDateISO();_getPS().push({date,memo:'舊一'},{date,memo:'舊二'});persist();window.before=JSON.stringify(DB);scheduleToTodo('_ps',date,'','');scheduleToTodo('_ps',date,'','missing');scheduleToTodo('_ps',date,'','p2');});
assert.equal(await p.evaluate(()=>JSON.stringify(DB)===before),true);
assert.equal(await p.evaluate(()=>toasts.slice(-3).every(t=>t[0].includes('無法唯一確認'))),true);
await p.reload();await p.waitForFunction(()=>DB.some(c=>c.id==='c'));
assert.deepEqual(await p.evaluate(()=>_getPT().map(t=>t.memo)),['指定第二筆','同時第二筆','個人第三筆']);
assert.equal(await p.evaluate(()=>DB.find(c=>c.id==='c').todos[0].schedType),'房東');
assert.deepEqual(errors,[]);console.log('PASS actual dashboard menu and full-list conversion: same-day untimed/timed personal IDs, work property association and long memo, ambiguous/stale/repeated action safety, save/reload');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
