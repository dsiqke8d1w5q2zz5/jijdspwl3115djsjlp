(function(){
'use strict';
const key='crmDailySearchNotices',seen=new Set();let busy=false,dialog;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function request(type,payload={}){return new Promise((resolve,reject)=>{const id=crypto.randomUUID(),timer=setTimeout(()=>{removeEventListener('message',listen);reject(Error('搜尋助手未回應'));},8000);function listen(e){if(e.source!==window||e.origin!==location.origin||e.data?.channel!=='CRM_BUYER_RESPONSE'||e.data.id!==id)return;clearTimeout(timer);removeEventListener('message',listen);e.data.result?.error?reject(Error(e.data.result.error)):resolve(e.data.result);}addEventListener('message',listen);postMessage({channel:'CRM_BUYER_REQUEST',id,type,payload},location.origin);});}
function known(id){try{return seen.has(id)||JSON.parse(localStorage.getItem(key)||'[]').includes(id);}catch{return seen.has(id);}}
function remember(id){seen.add(id);try{const old=JSON.parse(localStorage.getItem(key)||'[]');localStorage.setItem(key,JSON.stringify([...new Set([...old,id])].slice(-60)));}catch{}}
function timing(r){const a=new Date(r.startedAt),b=new Date(r.finishedAt);if(!Number.isFinite(+a)||!Number.isFinite(+b)||b<a)return '時間紀錄不足，無法計算總耗時';const n=Math.floor((b-a)/1000),fmt=d=>d.toLocaleString('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});return '開始 '+fmt(a)+' · 結束 '+fmt(b)+'｜總耗時 '+Math.floor(n/60)+' 分 '+n%60+' 秒';}
function memberName(m){if(String(m.id).startsWith('inventory:')){const e=window.InventoryMarket?.entries().find(e=>'inventory:'+e.config.id===String(m.id));return e?((e.c.sName||e.c.name||'')+' · '+e.label):'物件 '+m.id;}return (typeof DB!=='undefined'?DB.find(c=>String(c.id)===String(m.id))?.name:null)||'買方 '+m.id;}
const changePriority=kind=>({New:0,Down:1,重新上架:2,已下架:3,其中一筆已下架:3})[kind]??4;
const reviewKey='crmDailySearchReviewed';
function reviewed(){try{return JSON.parse(localStorage.getItem(reviewKey)||'{}');}catch{return {};}}
function refreshChanges(view){const section=view.querySelector('.daily-notice-changes');if(!section)return;const positions=[...section.querySelectorAll('[role=tabpanel]')].map(p=>p.scrollTop);const selected=Number(section.dataset.selected);section.outerHTML=changes(view.dataset.day,selected);view.querySelectorAll('.daily-notice-changes [role=tabpanel]').forEach((p,i)=>p.scrollTop=positions[i]||0);}
function markReviewed(view,button){const saved=reviewed(),id=button.dataset.reviewKey;if(button.getAttribute('aria-pressed')==='true')delete saved[id];else saved[id]=button.dataset.reviewSignature;try{localStorage.setItem(reviewKey,JSON.stringify(saved));}catch{view.querySelector('[data-message]').textContent='已看狀態未能保存，請重試。';return;}refreshChanges(view);view.querySelector('[data-review-key="'+CSS.escape(id)+'"]')?.focus({preventScroll:true});}
function changes(day,selected){
 const savedReviews=reviewed();
 const groups=[['買方配案',[]],['物件追蹤',[]]];
 for(const c of (typeof DB!=='undefined'?DB:[])){if(c._deleted||c.archived)continue;const items=new Map();
 for(const row of [...(c.schedules||[]).filter(x=>typeof isAutomaticSearchReminder==='function'&&isAutomaticSearchReminder(x)),...(c.searchReportEvents||[])]){if(row.date!==day||row._deleted)continue;const old=items.get(row.id);items.set(row.id,{...old,...row,marketEvents:{...old?.marketEvents,...row.marketEvents},matchEvents:{...old?.matchEvents,...row.matchEvents}});}
 for(const row of items.values()){const inventory=String(row.id).startsWith('inventory-watch:'),events=Object.fromEntries(Object.entries((inventory?row.marketEvents:row.matchEvents)||{}).filter(([id])=>!c.searchReportSuppressions?.[id])),counts={};for(const kind of Object.values(events))counts[kind]=(counts[kind]||0)+1;
 const reviewId=JSON.stringify([String(c.id),row.id]),signature=JSON.stringify(Object.entries(events).sort(([a],[b])=>a.localeCompare(b))),isReviewed=savedReviews[reviewId]===signature;
 const labels={New:'新刊登',Down:'降價',已下架:isReviewed?'已下架':'新下架',其中一筆已下架:isReviewed?'部分刊登下架':'部分新下架',成交:'新公布成交',成交更正:'成交更正',重新上架:'重新上架'};
 const ordered=Object.entries(counts).sort(([a],[b])=>changePriority(a)-changePriority(b));const badges=ordered.map(([kind,n])=>{const tone=kind==='New'||kind==='重新上架'?'new':kind==='Down'?'price':/下架/.test(kind)?'off':'trade';return '<span data-change-event="'+esc(kind)+'" class="daily-change-badge daily-change-'+tone+'">'+esc(labels[kind]||kind)+' <b>'+n+'</b> 筆</span>';}).join('');if(badges)groups[inventory?1:0][1].push({isReviewed,priority:Math.min(...ordered.map(([kind])=>changePriority(kind))),html:'<li class="daily-change-item'+(isReviewed?' daily-change-reviewed':'')+'"><button type="button" class="daily-change-row" data-change-client="'+esc(c.id)+'" data-change-record="'+esc(row.id)+'" data-change-kind="'+(inventory?'inventory':'buyers')+'"><b class="daily-change-name">'+esc(c.sName||c.name||'')+'</b><span class="daily-change-property">'+esc(row.propertyRef?.label||'')+'</span><span class="daily-change-badges">'+badges+'</span><span class="daily-change-arrow" aria-hidden="true">›</span></button><button type="button" class="daily-add-schedule" data-schedule-client="'+esc(c.id)+'" data-schedule-record="'+esc(row.id)+'" '+((c.schedules||[]).some(x=>!x._deleted&&x.sourceReportKey===row.id)?'disabled':'')+'>'+((c.schedules||[]).some(x=>!x._deleted&&x.sourceReportKey===row.id)?'已加入':'加入行程')+'</button><button type="button" class="daily-review" data-review-key="'+esc(reviewId)+'" data-review-signature="'+esc(signature)+'" aria-pressed="'+isReviewed+'" title="'+(isReviewed?'撤回已看標記':'標記已看')+'">'+(isReviewed?'撤回':'✓ 已看')+'</button></li>'});}}
 groups.forEach(([,rows])=>rows.sort((a,b)=>Number(a.isReviewed)-Number(b.isReviewed)||a.priority-b.priority));
 const active=selected??(groups[0][1].length?0:groups[1][1].length?1:0);
 return '<section class="daily-notice-changes" data-selected="'+active+'"><div class="daily-change-tabs" role="tablist" aria-label="切換變動類別">'+groups.map(([name,rows],i)=>'<button type="button" role="tab" id="dailyChangeTab'+i+'" data-change-tab="'+i+'" aria-selected="'+(i===active)+'" aria-controls="dailyChangePanel'+i+'" tabindex="'+(i===active?0:-1)+'">'+name+' <span>('+rows.filter(r=>!r.isReviewed).length+'／'+rows.length+' 未看)</span></button>').join('')+'</div>'+groups.map(([name,rows],i)=>'<div role="tabpanel" id="dailyChangePanel'+i+'" aria-labelledby="dailyChangeTab'+i+'" '+(i===active?'':'hidden')+'>'+(rows.length?'<ul class="daily-change-list">'+rows.map(row=>row.html).join('')+'</ul>':'<p class="daily-change-empty">尚無已保存的變動</p>')+'</div>').join('')+'</section>';
}
function selectChangeTab(view,index){const section=view.querySelector('.daily-notice-changes');if(!section)return;section.dataset.selected=index;section.querySelectorAll('[data-change-tab]').forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;});section.querySelectorAll('[role="tabpanel"]').forEach((panel,i)=>panel.hidden=i!==index);}

function openChange(view,row,eventKind){
 const c=(typeof DB!=='undefined'?DB:[]).find(c=>String(c.id)===row.dataset.changeClient&&!c._deleted&&!c.archived);
 if(!c){view.querySelector('[data-message]').textContent='此案件已封存或移除。';return;}
 if(row.dataset.changeKind==='inventory'){
 const watchId=row.dataset.changeRecord.slice('inventory-watch:'.length,-11),entry=InventoryMarket.entries().find(e=>String(e.c.id)===String(c.id)&&e.config.id===watchId);
 if(!entry){view.querySelector('[data-message]').textContent='此物件的追蹤設定已變更，請從客戶資料查看。';return;}
 const kinds=[...row.querySelectorAll('[data-change-event]')].map(b=>b.dataset.changeEvent);const off=eventKind?['已下架','其中一筆已下架'].includes(eventKind):kinds.length>0&&kinds.every(k=>['已下架','其中一筆已下架'].includes(k));InventoryMarket.open(entry.key,false,{inventoryView:off?'expired':'active'});
 }else{if(c.buyerMatching?.auto!==true){view.querySelector('[data-message]').textContent='此買方目前未開啟配案，請從客戶資料查看。';return;}BuyerMatching.open(c.id);}
}
function addSchedule(view,button){
 const c=DB.find(c=>String(c.id)===button.dataset.scheduleClient&&!c._deleted&&!c.archived),key=button.dataset.scheduleRecord;
 if(!c)return;
 if((c.schedules||[]).some(x=>!x._deleted&&x.sourceReportKey===key)){button.disabled=true;button.textContent='已加入';return;}
 const record=[...(c.schedules||[]),...(c.searchReportEvents||[])].find(x=>x.id===key),inventory=key.startsWith('inventory-watch:');
 const popup=document.createElement('dialog');popup.className='daily-schedule-dialog';popup.setAttribute('aria-labelledby','dailyScheduleTitle');
 const date=new Date(),today=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
 const memo=[...button.parentElement.querySelectorAll('.daily-change-badge')].map(x=>x.textContent).join('、');
 popup.innerHTML='<form><h2 id="dailyScheduleTitle">加入行程</h2><p>'+esc(c.sName||c.name)+' · '+esc(record?.propertyRef?.label||'')+'</p><div class="daily-schedule-fields"><label>日期<input name="date" type="date" required value="'+today+'"></label><label>時間<input name="time" type="time"></label></div><label>行程內容<textarea name="memo" rows="3" required>'+esc(memo)+'</textarea></label><p role="status" data-error></p><footer><button type="button" data-cancel>取消</button><button type="submit">儲存行程</button></footer></form>';
 document.body.append(popup);popup.onclose=()=>{popup.remove();button.focus({preventScroll:true});};popup.querySelector('[data-cancel]').onclick=()=>popup.close();
 popup.querySelector('form').onsubmit=e=>{e.preventDefault();const form=e.currentTarget,save=form.querySelector('[type=submit]');save.disabled=true;
 if((c.schedules||[]).some(x=>!x._deleted&&x.sourceReportKey===key)){popup.close();button.disabled=true;button.textContent='已加入';return;}
 const old=c.schedules;c.schedules=[...(old||[]),{id:crypto.randomUUID(),sourceReportKey:key,date:form.elements.date.value,time:form.elements.time.value,memo:form.elements.memo.value.trim(),propertyRef:record?.propertyRef,schedType:inventory?'庫存屋主':'經營買方',updatedAt:new Date().toISOString()}];
 if(!persist()){c.schedules=old;form.querySelector('[data-error]').textContent='儲存失敗，請重試。';save.disabled=false;return;}
 button.disabled=true;button.textContent='已加入';popup.close();window.render?.();};popup.showModal();
}
function shell(){const view=document.createElement('dialog');view.className='daily-notice';view.setAttribute('aria-labelledby','dailyNoticeTitle');dialog=view;document.body.append(view);view.addEventListener('click',e=>{if(e.target.closest('[data-close]'))view.close();const tab=e.target.closest('[data-change-tab]');if(tab)selectChangeTab(view,Number(tab.dataset.changeTab));const row=e.target.closest('[data-change-client]');if(row)openChange(view,row,e.target.closest('[data-change-event]')?.dataset.changeEvent);const schedule=e.target.closest('[data-schedule-record]');if(schedule)addSchedule(view,schedule);const review=e.target.closest('[data-review-key]');if(review)markReviewed(view,review);});view.addEventListener('keydown',e=>{const tab=e.target.closest('[data-change-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const index=e.key==='Home'?0:e.key==='End'?1:1-Number(tab.dataset.changeTab);selectChangeTab(view,index);view.querySelector('[data-change-tab="'+index+'"]').focus();});view.addEventListener('close',()=>{view.remove();if(dialog===view)dialog=null;},{once:true});return view;}
function compactReport(view){
 view.classList.add('daily-notice-report');
 const body=view.querySelector('.daily-notice-body'),status=body.querySelector('.daily-notice-status'),time=status.nextElementSibling,groups=body.querySelector('.daily-notice-groups'),changes=body.querySelector('.daily-notice-changes');
 const summary=document.createElement('div');summary.className='daily-report-summary';const line=document.createElement('div');line.className='daily-report-summary-line';body.prepend(summary);line.append(status,time);summary.append(line,groups);
 const issueNodes=[];for(let node=summary.nextSibling;node&&node!==changes;node=node.nextSibling)issueNodes.push(node);
 if(issueNodes.length){const fold=document.createElement('details');fold.className='daily-report-issues';fold.innerHTML='<summary>查看未完成對象與原因</summary><div class="daily-report-issue-content"></div>';fold.lastElementChild.append(...issueNodes);summary.after(fold);}
}
function show(data,id,manual=false,target=null){if((dialog&&dialog!==target)||(!manual&&known(id)))return;const r=data.report;dialog=target||shell();const view=dialog;view.dataset.day=data.day;
const groups=[['買方配案',r.buyers,'位'],['物件追蹤',r.inventory,'件']],members=(r.members||[]).filter(m=>!m.completed);
dialog.innerHTML='<header><h2 id="dailyNoticeTitle">早上自動搜尋結果</h2><button data-close aria-label="關閉">×</button></header><div class="daily-notice-body"><strong class="daily-notice-status">'+(r.status==='completed'?'全部完成':'部分未完成')+'</strong><p>'+esc(timing(r))+'</p><div class="daily-notice-groups">'+groups.map(([name,g,unit])=>'<div><b>'+name+'</b><span>'+(g?.total?g.completed+' / '+g.total+' '+unit+'完成':'本次無執行對象')+'</span></div>').join('')+'</div>'+(members.length?'<h3>需查看的對象</h3><ul>'+members.map(m=>'<li>'+esc(memberName(m))+'</li>').join('')+'</ul>':'')+(r.scopes?.length?'<details open><summary>未完成原因（'+r.scopes.length+'）</summary><ul>'+r.scopes.map(s=>'<li>'+esc([({yungching:'永慶',sinyi:'信義','591':'591'})[s.source]||s.source,s.district,s.keyword,s.reason||(s.status==='unknown'?'完成狀態尚未核實':'尚未完成')].filter(Boolean).join(' · '))+'</li>').join('')+'</ul></details>':'')+(r.error?'<p>'+esc(r.error)+'</p>':'')+changes(data.day)+'<p data-message role="status"></p></div><footer><button data-retry '+(!r.canRetry||data.settingsChanged?'hidden':'')+' '+(data.busy?'disabled':'')+'>重試未完成</button><button data-close>關閉</button></footer>';

compactReport(view);
dialog.querySelector('[data-retry]').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{await request('dailyRetry');dialog.querySelector('[data-message]').textContent='已開始重試，可關閉視窗。請從個人搜尋報告查看後續結果。';b.hidden=true;}catch(error){dialog.querySelector('[data-message]').textContent=error.message;b.disabled=false;}};
if(!view.open)view.showModal();remember(id);
refreshResults().then(()=>{if(dialog!==view||!view.open)return;const section=view.querySelector('.daily-notice-changes');if(section){const positions=[...section.querySelectorAll('[role=tabpanel]')].map(p=>p.scrollTop);const focused=section.contains(document.activeElement)?document.activeElement.id:null;section.outerHTML=changes(data.day,Number(section.dataset.selected));view.querySelectorAll('.daily-notice-changes [role=tabpanel]').forEach((p,i)=>p.scrollTop=positions[i]||0);if(focused)view.querySelector('#'+focused)?.focus({preventScroll:true});}});
}
async function refreshResults(){await Promise.allSettled([window.BuyerMatching?.refreshBulkResults(),window.InventoryMarket?.tick()]);}
async function check(){if(busy||document.hidden||dialog||document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;busy=true;try{const data=await request('dailyStatus');const r=data.report;if(!data.current||data.queued||!r?.finishedAt||!['completed','partial'].includes(r.status)||!(r.buyers?.total||r.inventory?.total))return;const id=data.day+'|'+r.startedAt;if(known(id))return;const present=()=>{if(!document.hidden&&!document.querySelector('dialog[open]'))show(data,id);};if(navigator.locks)await navigator.locks.request('crm-daily-notice',present);else present();}catch{}finally{busy=false;}}
setTimeout(check,3000);setInterval(check,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});async function open(){
 if(dialog?.open)return;
 const view=shell();view.innerHTML='<header><h2 id="dailyNoticeTitle">早上自動搜尋結果</h2><button data-close aria-label="關閉">×</button></header><div class="daily-notice-body"><p role="status" data-loading>正在讀取早上報告…</p></div><footer><button data-close>關閉</button></footer>';view.showModal();
 try{const data=await request('dailyStatus');if(dialog!==view||!view.open)return;
 if(!data.report||data.report.status==='running'){view.querySelector('[data-loading]').textContent=!data.report?'尚無早上自動搜尋報告。':'早上自動搜尋仍在執行，完成後會自動通知。';return;}
 show(data,data.day+'|'+data.report.startedAt,true,view);
 }catch(e){if(dialog===view&&view.open)view.querySelector('[data-loading]').textContent='報告暫時無法讀取：'+e.message+'。請確認搜尋助手已連線後再試。';}
}

const anchor=document.querySelector('[data-bulk="inventory"]');if(anchor){const button=document.createElement('button');button.type='button';button.className=anchor.className;button.id='dailyReportButton';button.textContent='早上報告';button.title='查看最近一次早上自動搜尋結果，不會重新搜尋';button.onclick=open;anchor.after(button);}
window.DailySearchNotice={check,open};
})();
