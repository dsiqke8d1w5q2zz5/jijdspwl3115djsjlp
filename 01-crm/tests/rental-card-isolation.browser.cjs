const fs=require('fs'),path=require('path'),{chromium}=require(process.env.PLAYWRIGHT_MODULE);(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{const p=await b.newPage({viewport:{width:1440,height:1000}});await p.route('https://**/*',r=>r.abort());await p.route('http://localhost:43123/**',r=>{const f=path.resolve('01-crm','.'+new URL(r.request().url()).pathname);if(f.endsWith('buyer-feed.json')||f.endsWith('inventory-transactions.json'))return r.fulfill({json:{schema:1,sources:[],listings:[]}});return r.fulfill({body:process.env.BASELINE&&/buyer-(results|match)\.js$/.test(f)?require('child_process').execFileSync('git',['show','HEAD:01-crm/'+path.basename(f)]):fs.readFileSync(f),contentType:f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':'text/css'});});await p.goto('http://localhost:43123/index.html');
const crm=JSON.parse(fs.readFileSync('01-crm/crm_backup.json'));
const assert=require('assert/strict');
for(const width of [1440,780]){
await p.setViewportSize({width,height:1000});
const result=await p.evaluate(data=>{
const owner=data.find(c=>c.name==='黃建國'); const prop=owner.rProperties[1];prop.rent='24500';prop.rEndDate='2028-10-29';
const tenant={id:'test-tenant',name:'測試租客',type:'租客',types:['租客'],linkedLandlordId:owner.id,linkedPropertyIdx:1};
DB=[owner,tenant];setFilter('租客',document.createElement('button'));render();
const blank=document.querySelector('#grid').innerText;
prop.rCommunity='B棟長名稱測試社區'.repeat(5);prop.rAddr='新北市新莊區民安西路75巷12號4樓'.repeat(3);prop.rent='123456789';tenant.notes='長備註測試'.repeat(40);render();
const long=document.querySelector('#grid').innerText;
const overflow=[...document.querySelectorAll('.cmeta-v')].filter(x=>x.scrollWidth>x.clientWidth+2).map(x=>x.innerText);
persist();return {blank,long,overflow};},crm);
assert(!result.blank.includes('國王大廈'));assert(!result.blank.includes('不含管'));assert(result.blank.includes('民安西路'));assert(result.long.includes('B棟長名稱測試社區'));assert.equal(result.overflow.length,0,JSON.stringify(result.overflow));
await p.screenshot({path:'01-crm/tests/.rental-card-'+width+'.png',fullPage:true});

const checks=await p.evaluate(()=>{
const owner=DB[0],tenant=DB[1];tenant.linkedPropertyIdx=0;render();const first=document.querySelector('#grid').innerText.includes('國王大廈');tenant.linkedPropertyIdx=99;render();const missing=!document.querySelector('#grid').innerText.includes('國王大廈');
tenant.linkedPropertyIdx=1;owner.rProperties[1].rEndDate='2020-01-01';owner.rProperties[1].rCommunity='';setFilter('房東',document.createElement('button'));render();const landlord=!document.querySelector('#grid .card-meta').innerText.includes('國王大廈');
setFilter('租客',document.createElement('button'));delete owner.rProperties;render();const legacy=document.querySelector('#grid').innerText.includes('國王大廈');persist();return {first,missing,landlord,legacy};});
assert(Object.values(checks).every(Boolean),JSON.stringify(checks));
await p.reload();await p.evaluate(()=>setFilter('租客',document.createElement('button')));assert((await p.locator('#grid').innerText()).includes('國王大廈'));
console.log('PASS property isolation, switching, missing selection, landlord, legacy, save/reload and long content',width);
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

