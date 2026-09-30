const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({viewport:{width, height:1000}});
      await page.route('https://**/*', route => route.abort());
      await page.goto(pathToFileURL(path.join(__dirname, '../index.html')).href);
      await page.evaluate(() => {
        DB=[]; persistPerf=()=>{}; persist=()=>{}; _perfRange='all';
        _perfRecords=[{caseType:'租賃案',category:'房東',client:'測試案件',date:'2026-09-03',feeNoTax:'10000',intermediaryName:'舊中人',intermediaryFee:'500',memo:'保留備註'}];
        openPerformance(); editPerfRecord(0);
      });
      assert.equal(await page.locator('#epIntermediaryName').inputValue(), '舊中人');
      await page.locator('.perf-intermediary-add').click();
      const rows = page.locator('#epIntermediaryRows .perf-intermediary-fields');
      assert.equal(await rows.count(), 2);
      await rows.nth(1).locator('[data-middleman=name]').fill('第二位');
      await rows.nth(1).locator('[data-middleman=fee]').fill('1500');
      await page.locator('#epSaveBtn').click();
      assert.equal(await page.evaluate(()=>_perfRecords[0].intermediaries), undefined);
      await rows.nth(0).locator('[data-middleman=income]').fill('7000');
      await rows.nth(1).locator('[data-middleman=income]').fill('4000');
      await page.locator('#epSaveBtn').click();
      assert.equal(await rows.count(), 2, 'over-allocation keeps the form open');
      await rows.nth(0).locator('[data-middleman=income]').fill('6000');
      await page.screenshot({path:path.join(os.tmpdir(), 'multiple-middlemen-form-'+width+'.png')});
      assert.equal(await page.evaluate(()=>document.querySelector('.perf-intermediary-editor').scrollWidth <= document.querySelector('.perf-intermediary-editor').clientWidth), true);
      await page.locator('#epSaveBtn').click();
      assert.deepEqual(await page.evaluate(()=>_perfRecords[0].intermediaries), [{name:'舊中人',fee:'500',income:'6000'}, {name:'第二位',fee:'1500',income:'4000'}]);
      assert.match(await page.locator('#perfIntermediaryTotal').innerText(), /2,000/);
      assert.match(await page.locator('.perf-income-summary').innerText(), /10,000/);
      await page.locator('.perf-contribution summary').click();
      assert.match(await page.locator('.perf-contribution tbody tr').nth(0).innerText(), /60.0%/);
      assert.match(await page.locator('.perf-contribution tbody tr').nth(1).innerText(), /40.0%/);
      await page.locator('#perfSearchInput').fill('第二位');
      assert.equal(await page.locator('.perf-record').count(), 1);
      assert.equal(await page.locator('.perf-record-intermediary').count(), 2);
      await page.screenshot({path:path.join(os.tmpdir(), 'multiple-middlemen-list-'+width+'.png')});
      // CSV roundtrip must retain both people, zero/custom income and their separate fees.
      await page.evaluate(async()=>{
        DB=[{id:'synthetic',name:'測試客戶',type:'買方'}];
        const original=URL.createObjectURL;
        URL.createObjectURL=blob=>{window.testExport=blob;return original(blob)};
        HTMLAnchorElement.prototype.click=function(){};
        exportCSV(); window.testCsv=await testExport.text();
        _perfRecords=[];
        const input=document.createElement('input');input.id='csvImportInput';document.body.append(input);
        importCSV(new File([testCsv],'test.csv',{type:'text/csv'}));
      });
      await page.waitForFunction(()=>_perfRecords.length===1);
      assert.equal(await page.evaluate(()=>_perfRecords[0].intermediaries[1].income),'4000');
      await page.evaluate(()=>editPerfRecord(0));
      assert.equal(await rows.count(),2);
      await rows.nth(1).locator('.perf-intermediary-remove').click();
      await rows.nth(0).locator('[data-middleman=income]').fill('0');
      await page.locator('#epSaveBtn').click();
      assert.equal(await page.evaluate(()=>_perfRecords[0].intermediaries.length),1);
      assert.equal(await page.evaluate(()=>_perfRecords[0].intermediaries[0].income),'0');
      await page.evaluate(()=>editPerfRecord(0));
      await rows.nth(0).locator('.perf-intermediary-remove').click();
      await page.locator('#epSaveBtn').click();
      assert.equal(await page.evaluate(()=>perfIntermediaries(_perfRecords[0]).length),0);
      assert.equal(await page.evaluate(()=>_perfRecords[0].memo),'保留備註');
      console.log('PASS',width,'legacy migration, multiple people, custom allocation, validation, search, CSV, removal');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
