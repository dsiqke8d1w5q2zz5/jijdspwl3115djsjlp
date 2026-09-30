const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 for(const width of [1440,1100,430,390,320]){
  const page=await browser.newPage({viewport:{width,height:932}});
  await page.route('https://**/*',r=>r.abort());
  await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
  await page.evaluate(()=>{DB=[{id:'spacing',name:'測試',type:'庫存屋主',types:['庫存屋主'],sProperties:[{community:'測試',mainBldg:'20',parkingSz:'5'}],schedules:[{date:'2026-10-05',time:'',memo:'未指定時間的行程'},{date:'2026-10-31',time:'15:00',memo:'指定時間的行程'}]}];curFilter='庫存屋主';showDet('spacing');});
  const row=page.locator('.det-schedule-no-time');
  const key=await row.locator('.det-key').boundingBox(),value=await row.locator('.det-val').boundingBox();
  assert(value.x>=key.x+key.width,'untimed memo does not overlap date');
  const timed=page.locator('.det-schedule-row:not(.det-schedule-no-time)');assert.equal(await timed.count(),1);const timedKey=await timed.locator('.det-key').boundingBox(),timedValue=await timed.locator('.det-val').boundingBox();assert(timedValue.x>=timedKey.x+timedKey.width,'timed memo does not overlap date and time');assert(Math.abs(value.x-timedValue.x)<1,'schedule memo columns align');
  assert.match(await page.locator('.det-schedule-row:not(.det-schedule-no-time)').innerText(),/15:00/);
  for(const schedule of await page.locator('.det-schedule-row').all()){const gap=await schedule.evaluate(e=>{const range=document.createRange();range.selectNodeContents(e.querySelector('.det-key'));return e.querySelector('.det-val').getBoundingClientRect().left-range.getBoundingClientRect().right;});assert(gap>=4,'actual date/time text must not overlap memo');}

  assert.equal(await page.locator('.det-area-parking h4').count(),0);assert.match(await page.locator('.det-area-parking').first().textContent(),/車位坪數/);
  await page.close();console.log('PASS untimed schedule spacing and area label '+width);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
