const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const b=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{for(const width of [1440,780,390]){
 const p=await b.newPage({viewport:{width,height:950}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('https://**/*',r=>r.abort());
 await p.addInitScript(()=>{window.notices=[];window.Notification=class{static permission='granted';constructor(title,opts){notices.push({title,...opts});}close(){}};});
 await p.goto(pathToFileURL(path.resolve('01-crm/index.html')).href);
 await p.evaluate(()=>{DB=[{id:'test',name:'測試長名稱客戶陳先生與家人共同看屋討論',type:'庫存屋主',types:['庫存屋主'],sProperties:[{community:'長社區名称測試'.repeat(5),addr:'新北市板橋區文化路一段123456789號十二樓之二',propertyKey:'p'}],schedules:[]}];persistAndSyncNow=()=>{DB.forEach(c=>c.updatedAt=new Date().toISOString());localStorage.setItem('reCRM',JSON.stringify(DB));return true;};quickSchedule('test');});
 const box=p.locator('.fill-menu:has(#qs-save)');assert.equal(await box.locator('[data-remind]').isChecked(),false);
 await p.locator('#qs-date').fill('116/01/15');await p.locator('#qs-time').selectOption('14:30');await p.locator('#qs-memo').fill('長備註確認貸款預算123456789萬元、同住家庭需求與現場設備；'.repeat(7));await box.locator('[data-remind]').check();
 assert((await box.locator('[data-remind-time]').innerText()).includes('14:00'));
 assert(await box.evaluate(e=>e.scrollWidth<=e.clientWidth),'dialog does not overflow');
 const label=await box.locator('.schedule-reminder label').boundingBox(),hint=await box.locator('[data-remind-time]').boundingBox();assert(hint.x>=label.x&&hint.x+hint.width<=width);
 await box.screenshot({path:path.join(process.env.TEMP,`crm-reminder-${width}.png`)});
 await p.locator('#qs-save').click();let saved=await p.evaluate(()=>DB[0].schedules[0]);assert(saved.remind&&saved.reminderSetAt);
 await p.evaluate(s=>editDashSchedule('test',s.date,s.time,s.id),saved);assert(await p.locator('[data-remind]').isChecked());await p.locator('[data-remind]').uncheck();await p.locator('#qs-save').click();assert.equal(await p.evaluate(()=>DB[0].schedules[0].remind),false);
 await p.evaluate(()=>addPersonalSchedule());await p.locator('#ps-date').fill('116/01/16');await p.locator('#ps-time').selectOption('');await p.locator('#ps-memo').fill('個人行程長備註'.repeat(12));await p.locator('[data-remind]').check();assert((await p.locator('[data-remind-time]').innerText()).includes('08:00'));await p.locator('#ps-save').click();assert(await p.evaluate(()=>_getPS()[0].remind));
 await p.reload();assert(await p.evaluate(()=>JSON.parse(localStorage.getItem('reCRM')).find(c=>c.id==='_personalSchedules').schedules[0].remind));
 assert.equal(await p.evaluate(()=>notices.length),0,'no desktop notifications');assert.deepEqual(errors,[]);await p.close();console.log('PASS reminders '+width+' checkbox, time hint, save/edit/reload, personal, long data, LINE only');
 }}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
