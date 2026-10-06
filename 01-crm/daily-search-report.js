(function(){
'use strict';
const names={yungching:'永慶',sinyi:'信義','591':'591'},esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),time=t=>t?new Date(t).toLocaleString('zh-TW',{hour12:false}):'尚無紀錄';
function request(type){return new Promise((resolve,reject)=>{const id=crypto.randomUUID(),timer=setTimeout(()=>{removeEventListener('message',listen);reject(Error('助手未回應，無法確認今早執行狀態'));},5000);function listen(e){if(e.source!==window||e.origin!==location.origin||e.data?.channel!=='CRM_BUYER_RESPONSE'||e.data.id!==id)return;clearTimeout(timer);removeEventListener('message',listen);e.data.result?.error?reject(Error(e.data.result.error)):resolve(e.data.result);}addEventListener('message',listen);postMessage({channel:'CRM_BUYER_REQUEST',id,type},location.origin);});}
function markup(data){
 const r=data.report,today=data.current,status=data.queued?'等待補跑':!today?(data.missing?'紀錄不足，無法確認':'尚未執行'):r.status==='completed'?'全部完成':r.status==='running'?'執行中':'部分未完成';
 const category=data.queued?'pending':today?r.status:'pending';
 const group=(label,g,unit)=>'<span><b>'+label+'</b> '+(g.total?(data.missing&&!today?'未核實':g.completed)+' / '+g.total+' '+unit+'完成':'未設定')+'</span>';
 const groups=today?r:{buyers:{completed:0,total:data.expected.buyers},inventory:{completed:0,total:data.expected.inventory}};
 const button=data.busy?'':today&&r.canRetry&&!data.settingsChanged?'<button type="button" data-daily-action="dailyRetry">重試未完成</button>':!today||data.settingsChanged||r?.status==='partial'?'<button type="button" data-daily-action="dailyRun">執行今日自動搜尋</button>':'';
 const sources=today?r.sources.map(s=>{const ok=s.total>0&&s.completed===s.total;return '<span class="ds-source '+(ok?'ds-ok':'ds-warn')+'"><b>'+names[s.id]+'</b> '+(!s.total?'未排入':ok?'完成 '+s.total+' / '+s.total+' 範圍'+(s.count===0?'，0 筆刊登':''):'完成 '+s.completed+' / '+s.total+' 範圍，尚有 '+(s.total-s.completed)+' 範圍未完成')+'</span>';}).join(''):'<span>'+(data.missing?'今天曾有執行紀錄，但舊版未保留完整報告，不能確認是否全部完成。':'今天尚無執行紀錄；舊結果不能代表今天已完成。')+'</span>';
 const issues=today?(r.scopes||[]).filter(s=>s.status==='failed'||r.status!=='running'):[];
 const lines=issues.map(s=>'<li>'+esc([names[s.source],s.district,s.keyword].filter(Boolean).join(' · '))+'：'+esc(s.reason||(s.status==='unknown'?'舊紀錄未能核實是否完成':'尚未讀完'))+'</li>');
 return '<div class="ds-top"><strong>今日自動搜尋</strong><span class="ds-status ds-'+category+'" role="status">'+status+'</span><span class="ds-day">'+esc(data.today)+'</span><div class="ds-actions">'+button+'<button type="button" data-daily-action="refresh">更新狀態</button></div></div><div class="ds-groups">'+group('買方配對',groups.buyers,'位')+group('案件追蹤',groups.inventory,'件')+'</div><div class="ds-sources">'+sources+'</div><div class="ds-time">'+(today?'開始 '+time(r.startedAt)+' · '+(r.finishedAt?'結束 '+time(r.finishedAt):'最後進度 '+time(r.lastProgressAt)):r?'上次自動搜尋：'+time(r.startedAt)+'（'+(r.status==='completed'?'全部完成':'未全部完成')+'）':'每日 08:25 執行，需 Chrome 開啟。')+'</div>'+(data.settingsChanged?'<p class="ds-warning">設定已變更；以上為當次執行範圍，新增或修改的需求尚未包含。</p>':'')+(r?.error&&today?'<p class="ds-warning">'+esc(r.error)+'</p>':'')+(lines.length?'<ul class="ds-issues">'+lines.slice(0,3).join('')+'</ul>'+(lines.length>3?'<details><summary>查看其餘 '+(lines.length-3)+' 個未完成範圍</summary><ul class="ds-issues">'+lines.slice(3).join('')+'</ul></details>':''):'')+'<div class="ds-note">完成指原站搜尋範圍已讀至末頁，並非每筆物件條件都已確認。下方結果可能含歷史物件；成交資料更新另計。</div>';
}
function mount(dialog){
 if(dialog.querySelector('.daily-search-report'))return;
 const box=document.createElement('section');box.className='daily-search-report';box.setAttribute('aria-label','今日自動搜尋報告');
 const anchor=dialog.querySelector('#bmSummary')||dialog.querySelector('.im-controls');if(anchor)anchor.after(box);else dialog.querySelector('header').after(box);
 let timer,busy=false,lastMarkup='';
 async function refresh(){clearTimeout(timer);if(!dialog.isConnected||!dialog.open)return;try{const data=await request('dailyStatus');const html=markup(data);if(html!==lastMarkup){box.innerHTML=html;lastMarkup=html;}}catch(e){box.innerHTML='<div class="ds-top"><strong>今日自動搜尋</strong><span class="ds-status ds-pending">無法確認</span><button type="button" data-daily-action="refresh">更新狀態</button></div><p>請確認助手已更新至 1.2.23 並重新整理。'+esc(e.message)+'</p>';lastMarkup='';}finally{if(dialog.isConnected&&dialog.open)timer=setTimeout(refresh,10000);}}
 box.innerHTML='<strong>今日自動搜尋</strong> 正在讀取執行紀錄…';
 box.addEventListener('click',async e=>{const b=e.target.closest('[data-daily-action]');if(!b||busy)return;busy=true;clearTimeout(timer);b.disabled=true;try{if(b.dataset.dailyAction!=='refresh'){await request(b.dataset.dailyAction);dispatchEvent(new Event('crm:daily-search-started'));}await refresh();}catch(error){const note=document.createElement('p');note.className='ds-warning';note.textContent=error.message;box.append(note);}finally{busy=false;if(b.isConnected)b.disabled=false;}});
 dialog.addEventListener('close',()=>clearTimeout(timer),{once:true});refresh();
}
window.DailySearchReport={mount,markup};
})();
