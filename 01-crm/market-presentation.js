(function(root){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number.isFinite(Number(v))&&v!==null&&v!==''?Number(v).toLocaleString('zh-TW',{maximumFractionDigits:2}):'未提供';
const date=v=>Number.isFinite(Date.parse(v))?new Date(v).toLocaleDateString('zh-TW'):'未提供';
const safeLink=v=>{try{const u=new URL(v);return /^https?:$/.test(u.protocol)?esc(u.href):'';}catch{return '';}};
const names={yungching:'永慶',sinyi:'信義','591':'591',moi:'實價登錄','moi-presale':'預售實登'};
const key=g=>JSON.stringify(g.map(p=>p.id).sort());
function groups(rows,separate=[]){return root.BuyerGrouping.group(rows.map(p=>({p})),separate).map(g=>g.map(r=>r.p));}
function title(p){return [p.community||p.title||p.address||'物件',root.BuyerMatchEngine.floorLabel(p),p.area!=null?money(p.area)+'坪':''].filter(Boolean).join('｜');}
function inventory({records,events,ack,view,config,renderRow,expanded}){
 const fresh=p=>events.filter(e=>e.listingId===p.id&&Date.parse(e.at)>ack&&(root.InventoryMarketEngine.changeRelevant(e)||['已下架','其中一筆已下架'].includes(e.kind)));
 const all=groups(records.filter(p=>p.kind!=='transaction'),config.separateListings);
 const selected=all.filter(g=>view==='expired'?g.some(p=>p.availability==='off'):view==='changes'?g.some(p=>fresh(p).length):g.some(p=>p.availability!=='off'));
 selected.sort((a,b)=>Math.max(0,...b.flatMap(fresh).map(e=>Date.parse(e.at)))-Math.max(0,...a.flatMap(fresh).map(e=>Date.parse(e.at))));
 const html=selected.map(g=>{
  const id=key(g),off=g.filter(p=>p.availability==='off'),on=g.filter(p=>p.availability!=='off'),unread=g.flatMap(fresh),newOff=off.filter(p=>fresh(p).some(e=>/下架/.test(e.kind))).length;
  const status=off.length?(on.length?'部分廣告下架・仍有 '+on.length+' 則未確認下架':'已知廣告全部下架'):'在售廣告 '+on.length+' 則';
  const confirmed=config.confirmedGroups?.[id],lead=on[0]||g.find(p=>fresh(p).length)||g[0];
  const changes=unread.map(e=>({New:'新刊登',Down:'降價',成交:'新資料',其中一筆已下架:'新下架',已下架:'新下架'}[e.kind]||e.kind));
  return '<section class="market-property im-group '+(off.length?'im-expired-group':'')+'" data-property-group="'+esc(id)+'"><div class="market-property-head"><strong>'+esc(title(lead))+'</strong><span class="market-status '+(off.length?'market-off':'')+'">'+status+'</span>'+(g.length>1?'<span class="market-status">'+(confirmed?'已確認同一物件':'疑似同一物件')+'</span>':'')+(newOff?'<b class="market-fresh">本次新下架 '+newOff+' 則</b>':'')+'</div>'+
   '<div class="market-property-facts">'+(safeLink(lead.image)?'<img class="market-property-photo" src="'+safeLink(lead.image)+'" alt="物件照片" loading="lazy" referrerpolicy="no-referrer">':'')+'<span>'+esc(lead.address||'地址未提供')+'</span><strong>'+money(lead.price)+' 萬</strong><span>'+esc(lead.rooms!=null?lead.rooms+'房':'房數未提供')+'</span></div>'+(view==='changes'?'<p class="market-change-summary">'+esc([...new Set(changes)].join('、'))+' · '+new Set(unread.map(e=>e.listingId)).size+' 則廣告有新變化</p>':'')+
   '<details class="market-records" data-group="'+esc(id)+'" '+(expanded.has(id)||view==='changes'?'open':'')+'><summary>查看廣告紀錄（共 '+g.length+' 則）</summary><div class="market-record-list">'+g.map(p=>'<div class="market-record"><div class="market-record-state"><b>'+esc(names[p.source]||p.source)+'</b><span>'+esc(p.availability==='off'?'確認下架：'+date(p.offConfirmedAt):'最後取得：'+date(p.seenAt||p.lastSeenAt))+'</span></div>'+renderRow(p)+'</div>').join('')+'</div></details>'+
   (g.length>1?'<div class="market-group-actions"><button data-group-decision="'+(confirmed?'undo':'confirm')+'" data-ids="'+esc(id)+'">'+(confirmed?'撤回同物件確認':'確認同一物件')+'</button><button data-group-decision="separate" data-ids="'+esc(id)+'">保持分開</button><small>各則廣告與歷史紀錄均保留。</small></div>':'')+
   (g.length===1&&config.separateListings?.includes(g[0].id)?'<button data-group-decision="restore" data-ids="'+esc(id)+'">恢復自動分組</button>':'')+'</section>';
 }).join('');
 return {html,count:selected.length,ads:selected.reduce((n,g)=>n+g.filter(p=>view!=='expired'||p.availability==='off').length,0)};
}
function transactions(rows,events,ack){
 const labels=['成交日期／地址','樓層','建坪','總價','試算單價','車位'];
 const newer=p=>events.some(e=>e.listingId===p.id&&Date.parse(e.at)>ack);
 const cards=rows.map(p=>{
  const cells=[
   '<b>'+esc(p.tradeDate||'未提供')+'</b>'+(newer(p)?'<span class="market-new">新資料</span>':'')+'<div>'+esc(p.community||p.address)+'</div><small>'+esc(p.title||'')+'</small>',
   esc(p.floorText||root.BuyerMatchEngine.floorLabel(p)||'未提供'),money(p.area)+' 坪',money(p.price)+' 萬',p.area>0&&p.price>0?money(p.price/p.area)+' 萬/坪':'未提供',
   '<span>'+(p.parkingPrice>0?'車位 '+money(p.parkingPrice)+' 萬':p.parkingArea>0?'含車位，價格未拆分':'車位依原始登錄')+'</span>'+(p.parkingArea>0?'<div>車位 '+money(p.parkingArea)+' 坪</div>':'')
  ];
  const detail='<details class="market-trade-extra"><summary>原始資料與備註</summary><p>'+esc([p.address,p.unit,p.notes,p.termination].filter(Boolean).join(' · ')||'無其他備註')+'</p><p>首次取得：'+date(p.publishedObservedAt||p.seenAt)+'</p>'+(safeLink(p.url)?'<a href="'+safeLink(p.url)+'" target="_blank" rel="noopener">查看原始來源 ↗</a>':'')+'</details>';
  return '<article class="market-trade-row" role="row">'+cells.map((cell,i)=>'<div role="cell" data-label="'+labels[i]+'">'+cell+'</div>').join('')+detail+'</article>';
 }).join('');
 return '<p class="market-note">每筆成交獨立保留。「新資料」指本次新取得，不代表今天成交。試算單價＝總價 ÷ 建坪，含車位時未扣除車位。</p><div class="market-trades" role="table" aria-label="成交行情"><div class="market-trade-head" role="row">'+labels.map(x=>'<b role="columnheader">'+x+'</b>').join('')+'</div>'+cards+'</div>'+(rows.length?'':'<p class="market-empty">目前沒有已取得的成交紀錄，請確認來源是否完成。</p>');
}
root.MarketPresentation={groups,key,title,inventory,transactions};
})(window);
