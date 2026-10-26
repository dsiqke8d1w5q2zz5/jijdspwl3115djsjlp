const assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{const p=await b.newPage();await p.setContent('<html></html>');for(const f of ['read591.js','read.js'])await p.addScriptTag({path:'01-crm/tools/buyer-browser/'+f});
const url='https://sale.591.com.tw/home/house/detail/2/123.html',body='<title>板橋四房含車位 - 591售屋網</title><div id="app"></div>';
const cases=[
 {name:'dynamic valid page',want:'available'},
 {name:'wrong API ID',apiId:124,want:'unknown'},
 {name:'empty API',empty:true,want:'unknown'},
 {name:'missing API fields',noFields:true,want:'unknown'},
 {name:'redirected to home',redirect:'https://sale.591.com.tw/',want:'unknown'},
 {name:'404 overrides API',status:404,want:'unavailable'},
 {name:'410 overrides API',status:410,want:'unavailable'},
 {name:'200 removed page',body:'<title>找不到物件</title><p>此物件已下架</p>',want:'unavailable'},
 {name:'challenge',body:'<title>Checking your browser</title>',want:'unknown'},
 {name:'generic 200',body:'<title>591售屋網</title>',want:'unknown'},
 {name:'403',status:403,want:'unknown'},
 {name:'timeout',timeout:true,want:'unknown'},
 {name:'API timeout',apiTimeout:true,want:'unknown'}];
for(const c of cases){const result=await p.evaluate(async({c,url,body})=>{let calls=0;globalThis.fetch=async target=>{calls++;if(c.timeout||target.includes('bff-house')&&c.apiTimeout)throw Object.assign(Error('timeout'),{name:'TimeoutError'});return target.includes('bff-house')?{ok:true,json:async()=>c.empty?{status:0,data:{}}:{ware:{id:c.apiId||123},info:c.noFields?{}:{a:[{name:'法定用途',value:'住家用'},{name:'型態',value:'電梯大樓'}]}}}:{url:c.redirect||url,status:c.status||200,ok:!c.status||c.status===200,text:async()=>c.body||body};};const [r]=await crmVerifyListings([{source:'591',id:'591:123',url}]);return {r,calls};},{c,url,body});assert.equal(result.r.availability,c.want,c.name);assert.equal(result.r.detailStatus,c.want==='unknown'?'failed':'ok',c.name);if(c.want==='unavailable'||c.timeout||c.status===403||c.name==='challenge')assert.equal(result.calls,1,c.name);console.log('PASS '+c.name);}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
