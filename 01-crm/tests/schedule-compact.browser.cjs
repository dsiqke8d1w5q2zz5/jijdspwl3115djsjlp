const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 try {for(const width of [1707,1100,660,430,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());
  await page.goto(pathToFileURL(path.resolve('01-crm/index.html')).href);
  await page.evaluate(()=>{
   window.persistAndSyncNow=()=>true;window.persist=()=>true;
   DB=[{id:'compact-test',name:'測試屋主很長的姓名',type:'房東',types:['房東'],rProperties:[{propertyKey:'long',rCommunity:'新北市板橋區文化帝王超長社區名稱與物件地址測試'.repeat(3),rAddr:'文化路一段123號18樓之10'}],schedules:[]}];
   curFilter='房東';quickSchedule('compact-test');
  });
  async function check(){
   const problems=await page.locator('.schedule-compact-form').evaluateAll(forms=>forms.flatMap(form=>{
    const box=form.getBoundingClientRect(),bad=[];
    if(box.left<0||box.right>innerWidth+1)bad.push('dialog outside viewport');
    if(form.scrollWidth>form.clientWidth+1)bad.push('horizontal form overflow');
    const controls=[...form.querySelectorAll('input,select,button,summary')].filter(el=>el.checkVisibility());
    controls.forEach(el=>{const r=el.getBoundingClientRect();if(r.left<box.left-1||r.right>box.right+1)bad.push('outside: '+(el.dataset.quickField||el.className));});
    for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
     const a=controls[i].getBoundingClientRect(),b=controls[j].getBoundingClientRect();
     if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)bad.push('overlap: '+controls[i].outerHTML.slice(0,70)+' / '+controls[j].outerHTML.slice(0,70));
    }
    return bad;
   }));assert.deepEqual(problems,[],width+' layout');
  }
  await check();
  await page.locator('.schedule-property-picker summary').click();await check();
  await page.locator('.schedule-property-options input').fill('不存在');await check();
  await page.locator('.schedule-property-options input').fill('文化');
  await page.locator('.schedule-property-choices').selectOption('0');
  await page.locator('#qs-memo').fill('帶看物件與確認租屋條件'.repeat(20));
  await check();
  await page.locator('.schedule-compact-form').screenshot({path:path.join(require('node:os').tmpdir(),'crm-schedule-compact-'+width+'.png')});
  await page.locator('#qs-save').click();
  assert.equal(await page.evaluate(()=>DB[0].schedules[0].propertyRef.propertyKey),'long');
  if(width>=1100){await page.evaluate(()=>showDet('compact-test'));await check();await page.locator('#dModal .schedule-property-picker summary').click();await check();}
  assert.deepEqual(errors,[]);await page.close();console.log('PASS '+width+' long labels, open/search picker, control overlap, save and detail form');
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

