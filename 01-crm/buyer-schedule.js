(function(root){
'use strict';
function day(value){const d=new Date(value);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function sync(c,rows,save,now=new Date()){
 if(!c||c._deleted||c.archived||c.buyerMatching?.auto!==true)return false;
 const date=day(now),state=c.buyerMatching,ack=Date.parse(state.acknowledgedAt)||0,ds=c.bDemands?.length?c.bDemands:[c];
 const events={};
 for(const p of rows){
  if(state.hidden?.includes(p.id)||state.tracking?.[p.id]?.status==='rejected'||!ds.some(d=>root.BuyerMatchEngine.evaluate(d,p).status!=='excluded'))continue;
  for(const [kind,stamp] of [['New',p.firstMatchedAt],['Down',p.priceDroppedAt]]){
   if(Date.parse(stamp)>ack&&day(stamp)===date)events[p.id+'|'+kind+'|'+stamp]=kind;
  }
 }
 if(!Object.keys(events).length)return false;
 const id='buyer-match:'+c.id+':'+date,old=c.schedules,items=structuredClone(old||[]),existing=items.find(s=>s.id===id);
 if(existing&&Object.keys(events).every(k=>existing.matchEvents?.[k]))return false;
 const all={...existing?.matchEvents,...events},kinds=new Set(Object.values(all));
 const memo=kinds.has('New')&&kinds.has('Down')?'有 New、Down 物件':kinds.has('Down')?'有 Down 物件':'有 New 物件';
 // A genuinely new event reopens today's reminder; replaying a completed/deleted event never does.
 const entry={...existing,id,date:existing?.date||date,time:existing?.time||'',memo,matchEvents:all,_deleted:false,updatedAt:now.toISOString()};
 if(existing)Object.assign(existing,entry);else items.push(entry);
 c.schedules=items;
 if(!save()){c.schedules=old;return false;}
 return true;
}
root.BuyerSchedule={sync};
})(globalThis);
