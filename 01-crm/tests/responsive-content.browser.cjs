// Layout checks use synthetic data. PDF text extraction is stubbed; the real parser/review UI runs.
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = pathToFileURL(path.join(__dirname, '../index.html')).href;
(async () => {
 const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
 try {
  for (const [width,height] of [[1440,932],[1024,768],[430,932],[932,430],[430,500]]) {
   const page = await browser.newPage({viewport:{width,height},hasTouch:width===430||width===932,isMobile:width===430||width===932});
   await page.route('https://**/*',route=>route.abort());
   await page.goto(url);
   await page.evaluate(()=>{
    DB=[{id:'area-layout',name:'測試客戶',type:'庫存屋主',types:['庫存屋主'],sProperties:Array.from({length:12},(_,i)=>({community:'測試社區 '+(i+1),addr:'測試路一號'})),schedules:[{date:'2026-10-01',time:'15:00',memo:'測試行程'}]}];
    openEdit('area-layout');
   });
   const schedule=page.locator('#scheduleList .c-row').first();
   const typeBox=await schedule.locator('.sched-type').boundingBox(),timeBox=await schedule.locator('.sched-time').boundingBox();
   assert(Math.abs(typeBox.y-timeBox.y)<2,'schedule category and time stay on the same row');
   await page.locator('.area-editor:visible').first().scrollIntoViewIfNeeded();
   assert(await page.locator('.area-editor:visible').first().evaluate(e=>e.scrollWidth<=e.clientWidth+1),'area editor fits');
   await page.screenshot({path:path.join(os.tmpdir(),`crm-content-area-${width}-${height}.png`)});
   await page.goto(url);
   await page.evaluate(()=>{
    DB=[{id:'layout',name:'測試客戶',types:['庫存屋主'],type:'庫存屋主',sProperties:[{community:'測試社區',addr:'測試路一號'}]}];
    persist=()=>true;
    _perfRecords=Array.from({length:15},(_,i)=>({id:'test'+i,name:'測試長姓名',property:'測試社區名稱'.repeat(6),date:'2026-09-20',caseType:'買賣案',category:'買方',feeTax:123456,feeNoTax:45678}));
    openPerformance();setPerfRange('history');_perfHistMode='range';renderPerformance();
   });
   if(width===430||width===932) {
    for(const id of ['perfHistStart','perfHistEnd'])assert((await page.locator('#'+id).boundingBox()).width>=110,'date input must remain readable');
   }
   await page.screenshot({path:path.join(os.tmpdir(),`crm-content-perf-${width}-${height}.png`)});
   await page.evaluate(()=>{closePerformance();_otherTemplates=Array.from({length:8},()=>({title:'測試長範本標題'.repeat(8),content:'測試段落\n'.repeat(40)}));openTemplates();setTplTab('other');});
   const templateOverflow=await page.locator('#tplBody').evaluate(e=>e.scrollWidth>e.clientWidth+1);
   assert(!templateOverflow,'populated templates do not overflow');
   await page.screenshot({path:path.join(os.tmpdir(),`crm-content-templates-${width}-${height}.png`)});
   await page.evaluate(()=>{closeTemplates();quickSchedule('layout');});
   await page.locator('.fill-menu button').last().scrollIntoViewIfNeeded();
   const last=await page.locator('.fill-menu button').last().boundingBox();
   assert(last.y>=0&&last.y+last.height<=height+1,'quick dialog footer is reachable');
   await page.goto(url);
   await page.evaluate(()=>{
    const text='建物登記第二類謄本（所有權個人全部）\n測試區測試段 00001-000建號\n建物標示部\n建物門牌：測試路一號\n總面積：100.00平方公尺\n附屬建物用途：陽台 面積：10.00平方公尺\n共有部分：測試段00002-000建號1000平方公尺\n權利範圍：100分之5\n（含停車位編號001,權利範圍：100分之1）\n其他登記事項：空白\n建物所有權部\n所有權人：測＊＊\n權利範圍：1分之1\n土地登記第二類謄本（所有權個人全部）\n測試區測試段 0001-0000地號\n土地標示部 面積：1000平方公尺\n土地所有權部 所有權人：測＊＊\n權利範圍：10000分之197';
    window.pdfjsWorker={};window.pdfjsLocalResources={};
    window.pdfjsLib={getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getTextContent:async()=>({items:text.split('\n').map((str,i)=>({str,transform:[1,0,0,1,0,1000-i*20]}))}),cleanup(){}})}),destroy:async()=>{}})};
    TranscriptImport.openStandalone();
   });
   await page.locator('.transcript-dialog input[type=file]').setInputFiles({name:'synthetic-layout.pdf',mimeType:'application/pdf',buffer:Buffer.from('synthetic extraction stub')});
   await page.waitForFunction(()=>document.querySelectorAll('.transcript-card').length>=3);
   await page.locator('.transcript-card').evaluateAll(els=>els.forEach(e=>e.open=true));
   const overflow=await page.locator('.transcript-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1);
   assert(!overflow,'transcript review fits horizontally');
   await page.screenshot({path:path.join(os.tmpdir(),`crm-content-transcript-${width}-${height}.png`)});
   await page.locator('.transcript-footer button').last().scrollIntoViewIfNeeded();
   const apply=await page.locator('.transcript-footer button').last().boundingBox();
   assert(apply.y>=0&&apply.y+apply.height<=height+1,'transcript footer reachable');
   await page.close();console.log(`PASS populated performance/templates, transcript review, short dialog ${width}x${height}`);
  }
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
