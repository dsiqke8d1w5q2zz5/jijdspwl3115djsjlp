(function(){
'use strict';
const E=ReminderEngine,configKey='crmReminderConnection',sentKey='crmReminderDesktopSent';
let flight=false,lastSync='',cloudMessage='LINE 尚未連線',timer;
function config(){try{return JSON.parse(localStorage.getItem(configKey)||'{}');}catch{return {};}}
function preferenceRecord(){return database().find(c=>c.id==='_personalSchedules')||{};}
function preferences(){return E.preferences(preferenceRecord().reminderPreferences);}
function settings(){
 const old=document.querySelector('.reminder-settings');if(old?.open){old.focus();return;}old?.remove();
 const d=document.createElement('dialog');d.className='reminder-settings';
 d.innerHTML='<h2>行程提醒設定</h2><p>每筆行程勾選「提醒我」，就會套用以下時間。</p><div class="reminder-time-fields"><label>有填行程時間<select name="minutes"><option value="0">準時提醒</option><option value="10">提前 10 分鐘</option><option value="30">提前 30 分鐘</option><option value="60">提前 1 小時</option><option value="1440">提前 1 天</option></select></label><label>未填行程時間<input name="allDay" type="time" required></label></div><p>時間以台灣時間計算。修改後更新尚未發送的提醒；已過的新提醒時間不補發。</p><button type="button" data-save-time>儲存提醒時間</button><p role="status" data-time-status></p><hr><button type="button" data-permission>允許電腦通知</button> <button type="button" data-test-desktop>測試電腦通知</button><p data-desktop></p><label>提醒服務網址<input name="endpoint" type="url" placeholder="https://…workers.dev" autocomplete="off"></label><label>提醒服務連線碼<input name="key" type="password" autocomplete="off"></label><p>連線碼僅存在這個瀏覽器。此處不填 LINE 權杖；LINE 密鑰由雲端後台保管。</p><p role="status" data-status></p><footer><button type="button" data-close>關閉</button><button type="button" data-save>儲存並連線</button></footer>';
 const pref=preferences();d.querySelector('[name=minutes]').value=String(pref.minutes);d.querySelector('[name=allDay]').value=pref.allDay;
 d.querySelector('[data-save-time]').onclick=async e=>{const status=d.querySelector('[data-time-status]'),minutes=Number(d.querySelector('[name=minutes]').value),allDay=d.querySelector('[name=allDay]').value;if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(allDay)){status.textContent='請選擇未填時間行程的提醒時間。';return;}const rec=_getPSRecord(),old=rec.reminderPreferences,oldTime=rec.reminderPreferencesUpdatedAt;const next=E.preferences({minutes,allDay});if(JSON.stringify(E.preferences(old))!==JSON.stringify(next)){rec.reminderPreferences=next;rec.reminderPreferencesUpdatedAt=new Date().toISOString();if(!persistAndSyncNow()){rec.reminderPreferences=old;rec.reminderPreferencesUpdatedAt=oldTime;status.textContent='儲存失敗，請重試。';return;}}e.currentTarget.disabled=true;try{lastSync='';await sync();status.textContent='提醒時間已儲存 · '+cloudMessage;document.querySelectorAll('.schedule-reminder').forEach(row=>row.parentElement.dispatchEvent(new Event('change')));}finally{d.querySelector('[data-save-time]').disabled=false;}};
 const c=config();d.querySelector('[name=endpoint]').value=c.endpoint||'https://crm-reminders.water-bobo.workers.dev';d.querySelector('[name=key]').value=c.key||'';
 const importLabel=document.createElement('label');importLabel.textContent='載入連線設定（選擇設定檔）';const importInput=document.createElement('input');importInput.type='file';importInput.accept='.json,application/json';importLabel.append(importInput);d.querySelector('[name=endpoint]').parentElement.before(importLabel);
 importInput.onchange=async()=>{try{const file=importInput.files[0];if(!file)return;if(file.size>10000)throw Error('設定檔不正確');const value=JSON.parse(await file.text());if(value.endpoint!=='https://crm-reminders.water-bobo.workers.dev'||typeof value.key!=='string'||value.key.length<32)throw Error('設定檔不正確');d.querySelector('[name=endpoint]').value=value.endpoint;d.querySelector('[name=key]').value=value.key;d.querySelector('[data-save]').click();}catch{d.querySelector('[data-status]').textContent='無法讀取設定檔，請選擇房仲管家的提醒連線設定。';}};
 const desktop=()=>d.querySelector('[data-desktop]').textContent=!('Notification'in window)?'此瀏覽器不支援電腦通知':Notification.permission==='granted'?'電腦通知已允許；電腦與網頁需保持運作。':'電腦通知尚未允許；LINE 設定完成後可獨立發送。';desktop();
 d.querySelector('[data-permission]').onclick=async()=>{if('Notification'in window)await Notification.requestPermission();desktop();};
 d.querySelector('[data-test-desktop]').onclick=async()=>{const status=d.querySelector('[data-desktop]');if(!('Notification'in window)){status.textContent='此瀏覽器不支援電腦通知。';return;}try{if(Notification.permission==='default')await Notification.requestPermission();if(Notification.permission!=='granted'){status.textContent='通知尚未允許，請在網址列左側的網站設定，將「通知」改為允許後重新整理。';return;}const n=new Notification('🔔 房仲管家測試通知',{body:'這是電腦提醒測試。收到這張通知卡片，代表電腦通知可以顯示。',tag:'crm-desktop-test'});status.textContent='已呼叫電腦通知，請查看畫面右下角或通知中心。';n.onshow=()=>{status.textContent='瀏覽器已顯示測試通知，請確認畫面右下角或通知中心。';};n.onerror=()=>{status.textContent='通知未能顯示，請檢查瀏覽器及 Windows 通知設定。';};}catch{status.textContent='通知測試失敗，請檢查瀏覽器及 Windows 通知設定。';}};
 d.querySelector('[data-close]').onclick=()=>d.close();d.onclose=()=>d.remove();
 d.querySelector('[data-save]').onclick=async e=>{const button=e.currentTarget,status=d.querySelector('[data-status]');button.disabled=true;try{const endpoint=d.querySelector('[name=endpoint]').value.trim().replace(/\/$/,''),key=d.querySelector('[name=key]').value.trim(),u=new URL(endpoint);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||key.length<32)throw Error('請填入 HTTPS 服務網址及至少 32 字元的連線碼。');const r=await fetch(endpoint+'/health',{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('連線失敗，請確認網址與連線碼');const result=await r.json();if(!result.ready)throw Error('後台尚未完成 LINE 設定');localStorage.setItem(configKey,JSON.stringify({endpoint,key}));lastSync='';await sync();status.textContent=cloudMessage;}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
 document.body.append(d);d.showModal();
}
function mount(root,s,getDate,getTime,before){
 root.querySelectorAll('textarea').forEach(input=>{const resize=()=>{input.style.height='auto';input.style.height=input.scrollHeight+'px';};input.addEventListener('input',resize);requestAnimationFrame(resize);});
 const row=document.createElement('div');row.className='schedule-reminder';row.innerHTML='<label><input type="checkbox" data-remind>提醒我</label><small data-remind-time></small>';
 const check=row.querySelector('input');check.checked=s?.remind===true;
 function update(){const t=E.timing({date:getDate(),time:getTime()},preferences()),hint=row.querySelector('small');hint.textContent=!check.checked?'勾選後提醒':!t?'請先選擇日期':new Date(t.due).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})+' 提醒'+(t.due<=Date.now()?'（時間已過，不補發）':'')+' · '+cloudMessage;}
 root.addEventListener('change',update);root.addEventListener('input',update);check.addEventListener('change',()=>{if(check.checked&&'Notification'in window&&Notification.permission==='default')Notification.requestPermission();});
 if(before)before.before(row);else root.append(row);root._readReminder=()=>check.checked;update();return row;
}
function read(root){return root._readReminder?.()===true;}
const add=window.addScheduleRow;window.addScheduleRow=function(s){const r=add.apply(this,arguments),row=document.querySelector('#scheduleList>.c-row:last-child');mount(row,s,()=>rocToISO(row.querySelector('.roc-date-wrap input').value),()=>row.querySelector('.sched-time').value);return r;};
// Only use persisted data: unsaved editor changes must never generate notifications.
function database(){try{return JSON.parse(localStorage.getItem('reCRM')||'[]');}catch{return [];}}
async function sync(){
 if(flight)return;const cfg=config();if(!cfg.endpoint||!cfg.key){cloudMessage='LINE 尚未連線';return;}
 const pref=preferenceRecord(),changedAt=pref.reminderPreferencesUpdatedAt;const clients=database().filter(c=>c.id).map(c=>({id:String(c.id),revision:new Date(Math.max(Date.parse(c.updatedAt)||0,Date.parse(changedAt)||0)).toISOString(),items:E.items(c,pref.reminderPreferences,changedAt)}));const body=JSON.stringify(clients);if(body===lastSync)return;
 flight=true;cloudMessage='LINE 提醒同步中';try{for(let i=0;i<clients.length;i+=10){const r=await fetch(cfg.endpoint+'/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+cfg.key},body:JSON.stringify({clients:clients.slice(i,i+10)}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('同步失敗');}lastSync=body;cloudMessage='LINE 提醒已同步';}catch{cloudMessage='LINE 同步失敗，網頁開啟時會重試';}finally{flight=false;document.querySelectorAll('.schedule-reminder').forEach(row=>row.parentElement.dispatchEvent(new Event('change')));}
}
async function desktopTick(){
 if(!('Notification'in window)||Notification.permission!=='granted')return;
 const run=async()=>{let sent;try{sent=JSON.parse(localStorage.getItem(sentKey)||'{}');}catch{return;}
 const pref=preferenceRecord(),now=Date.now();for(const c of database())for(const item of E.items(c,pref.reminderPreferences,pref.reminderPreferencesUpdatedAt)){const key=JSON.stringify([item.id,'start',item.start]),legacy=JSON.stringify([item.id,item.due]);if(sent[key]||sent[legacy]||item.enabledAt>item.due||item.due>now||now-item.due>120000)continue;
 // Do not backfill newly enabled or newly rescheduled reminders whose due time already passed.
 const s=c.schedules.find(x=>JSON.stringify([String(c.id),String(x.id)])===item.id);if(Date.parse(s?.reminderSetAt||s?.updatedAt||c.updatedAt)>item.due)continue;
 try{localStorage.setItem(sentKey,JSON.stringify({...sent,[key]:now}));sent[key]=now;const n=new Notification('行程提醒｜'+item.title,{body:[item.date+' '+(item.time||'全天'),item.property,item.memo].filter(Boolean).join('\n'),tag:key});n.onclick=()=>{window.focus();n.close();};}catch{break;}}
 };if(navigator.locks)await navigator.locks.request('crm-reminder-notify',run);else await run();
}
function changed(){clearTimeout(timer);timer=setTimeout(()=>{sync();desktopTick();},300);}
window.addEventListener('crm:buyers-saved',changed);window.addEventListener('storage',changed);window.addEventListener('online',changed);
setInterval(()=>{sync();desktopTick();},30000);setTimeout(changed,1500);
window.ScheduleReminders={mount,read,settings,sync,desktopTick};
})();
