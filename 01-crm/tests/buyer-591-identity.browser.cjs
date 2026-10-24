const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{chromium}=require(process.env.PLAYWRIGHT_MODULE),E=require('../buyer-match-engine.js');
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const p=await b.newPage();await p.route('**/*',r=>r.fulfill({body:'<html></html>',contentType:'text/html'}));await p.goto('https://sale.591.com.tw/');
 const raw={houseid:25296250,title:'同名物件',kind:9,address:'民族路',region_name:'新北市',section_name:'板橋區',price:2998,area:48.45,mainarea:32.38,has_carport:1,cartmodel:'平面式'};
 const card=(id,title='同名物件')=>'<div class="ware-item"><div class="ware-item__header"><a href="https://sale.591.com.tw/home/house/detail/2/'+id+'.html?utm=x">'+title+'</a></div><div class="ware-item__attr">電梯大樓</div><div class="ware-item__attr">4房2廳2衛</div><div class="ware-item__attr">權狀48.45坪</div><div class="ware-item__attr">主建32.38坪</div><div class="ware-item__attr">28年</div><div class="ware-item__attr">10F/12F</div><span class="ware-item__section">板橋區-</span><span class="ware-item__address">民族路</span><div class="ware-item__price-value">2,998</div></div>';
 await p.setContent('<script type="application/json">window.__NUXT__=(function(){return '+JSON.stringify({rows:[raw]})+';})()</script>'+card(21047882)+card(21047882)+card(20775280));
 for(const f of ['acorn.js','read591.js','read.js'])await p.addScriptTag({path:path.resolve('01-crm/tools/buyer-browser',f)});
 let rows=await p.evaluate(()=>crmRead591(document,'新北市'));assert.deepEqual(rows.map(r=>r.id),['591:21047882','591:20775280']);assert.equal(rows[0].mainArea,32.38);assert.equal(rows[0].price,2998);assert.equal(rows[0].floor,10);assert.equal(rows[0].age,28);assert.equal(rows[0].parking,undefined,'unrelated embedded ID must not supply parking');assert(!rows[0].url.includes('?'));
 await p.evaluate(()=>document.querySelectorAll('.ware-item').forEach(e=>e.remove()));assert.equal((await p.evaluate(()=>crmRead591(document,'新北市'))).length,0,'embedded-only rows are never admitted');
 await p.evaluate(()=>{globalThis.fetch=async url=>{if(url.includes('bff-house'))throw Error('network timeout');return {status:404,ok:false}}});
 const checks=await p.evaluate(()=>crmVerifyListings([{source:'591',id:'591:25296250',url:'https://sale.591.com.tw/home/house/detail/2/25296250.html'}]));assert.equal(checks[0].availability,'unavailable','API failure must still try original page');
 // A working data API must never override a dead or unverified public URL.
 for(const sample of [{status:404,body:'',want:'unavailable'},{status:200,body:'<p>此物件已下架</p>',want:'unavailable'},{status:200,body:'<h1>Checking your browser</h1>',want:'unknown'},{status:200,body:'<div><span>法定用途</span><span>住家用</span></div>',want:'available'}]){
 await p.evaluate(sample=>{globalThis.fetch=async url=>url.includes('bff-house')?{ok:true,json:async()=>({ware:{id:123},info:{}})}:{ok:sample.status===200,status:sample.status,text:async()=>sample.body};},sample);
 const [check]=await p.evaluate(()=>crmVerifyListings([{source:'591',id:'591:123',url:'https://sale.591.com.tw/home/house/detail/2/123.html'}]));assert.equal(check.availability,sample.want);assert.equal(check.detailStatus,sample.want==='unknown'?'failed':'ok');
 }
 for(const source of ['yungching','sinyi']){const check=await p.evaluate(source=>{const doc=new DOMParser().parseFromString('<h1>此物件已下架</h1>','text/html');return source==='yungching'?crmReadYCDetail(doc):crmReadSinyiDetail(doc,'123');},source);assert.equal(check.availability,'unavailable');}
 assert.equal(E.evaluate({}, {...rows[0],availability:'unavailable'}).status,'excluded');
 assert(E.evaluate({}, rows[0]).pending.includes('連結有效性'));
 assert(!E.evaluate({}, {...rows[0],availability:'available'}).pending.includes('連結有效性'));
 if(process.env.BUYER_BACKUP){const j=JSON.parse(fs.readFileSync(process.env.BUYER_BACKUP));const bad=j.results.items['591:25296250'];assert(bad&&!bad.availability);assert(E.evaluate({},bad).pending.includes('連結有效性'));assert.equal(E.evaluate({}, {...bad,...checks[0]}).status,'excluded');}
 console.log('PASS rendered identity, duplicate card IDs, distinct same-title listings, numeric fields, embedded-only rejection, API fallback, unknown/404 classification and supplied backup');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

