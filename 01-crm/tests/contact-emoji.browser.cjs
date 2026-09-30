const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
const page=await browser.newPage({viewport:{width:1440,height:900}});await page.route('https://**/*',r=>r.abort());await page.goto(pathToFileURL(path.join(__dirname,'../index.html')).href);
const aliases={'hands together':'🙏','thumbs up':'👍','thumbs down':'👎',smile:'😊',laugh:'😆',cry:'😢',angry:'😠',surprised:'😮',heart:'❤️','broken heart':'💔',clap:'👏',muscle:'💪',sparkles:'✨','party popper':'🎉'};
for(const [name,emoji] of Object.entries(aliases))assert.equal(await page.evaluate(name=>escContactMemo('('+name+')'),name),emoji);
assert.equal(await page.evaluate(()=>escContactMemo('(HANDS TOGETHER) (thumbs-up)')),'🙏 👍');
assert.equal(await page.evaluate(()=>escContactMemo('一般(備註) (unknown sticker) 🙏 <img src=x onerror=alert(1)>')),'一般(備註) (unknown sticker) 🙏 &lt;img src=x onerror=alert(1)&gt;');
const memo='確認進度(hands together) (thumbs up) <b>保留文字</b>';
await page.evaluate(memo=>{DB=[{id:'emoji-test',name:'表情測試',type:'庫存屋主',types:['庫存屋主'],contactLog:[{date:'2026-09-30',memo}]}];curFilter='庫存屋主';render();},memo);
assert.match(await page.locator('.card').first().innerText(),/確認進度🙏 👍/);
await page.evaluate(()=>showDet('emoji-test'));assert.match(await page.locator('#detLogList').innerText(),/確認進度🙏 👍/);assert.equal(await page.locator('#detLogList b').count(),0);
await page.evaluate(()=>{closeDet();showContactLog('emoji-test')});assert.match(await page.locator('.fill-overlay').last().innerText(),/確認進度🙏 👍/);
await page.evaluate(()=>{document.querySelectorAll('.fill-overlay').forEach(e=>e.remove());quickContactLog('emoji-test',0)});assert.equal(await page.locator('#cl-memo').inputValue(),memo);assert.equal(await page.evaluate(()=>DB[0].contactLog[0].memo),memo);
console.log('PASS emoji mappings, unknown names, HTML escaping, three display surfaces, original edit and stored text');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});