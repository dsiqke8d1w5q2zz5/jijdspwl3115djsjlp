(function(root){
'use strict';
function day(value){const d=new Date(value);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function sync(c,rows,save,now=new Date()){
 if(!c||c._deleted||c.archived||c.buyerMatching?.auto!==true)return false;
 const date=day(now),state=c.buyerMatching,ack=Date.parse(state.acknowledgedAt)||0,ds=c.bDemands?.length?c.bDemands:[c];
 const events={},matched=new Map();
 for(const p of rows){
  if(state.hidden?.includes(p.id)||state.tracking?.[p.id]?.status==='rejected'||!ds.some(d=>root.BuyerMatchEngine.evaluate(d,p).status!=='excluded'))continue;
  for(const [kind,stamp] of [['New',p.firstMatchedAt],['Down',p.priceDroppedAt]]){
   if(Date.parse(stamp)>ack&&day(stamp)===date){events[p.id+'|'+kind+'|'+stamp]=kind;ds.forEach((d,i)=>{if(root.BuyerMatchEngine.evaluate(d,p).status!=='excluded'&&root.schedulePropertyRef)matched.set(d.propertyKey||String(i),root.schedulePropertyRef(c,{...d,areaDisplay:d.areaDisplay||[...(d.areaCities||[]),...(d.areaDists||[])].join('、')},'經營買方'));});}
  }
 }
 if(!Object.keys(events).length)return false;
 const id='buyer-match:'+c.id+':'+date,old=c.schedules,items=structuredClone(old||[]),existing=items.find(s=>s.id===id);
 if(existing&&Object.keys(events).every(k=>existing.matchEvents?.[k]))return false;
 const all={...existing?.matchEvents,...events},kinds=new Set(Object.values(all));
 const memo=kinds.has('New')&&kinds.has('Down')?'有 New、Down 物件':kinds.has('Down')?'有 Down 物件':'有 New 物件';
 // A genuinely new event reopens today's reminder; replaying a completed/deleted event never does.
 const refs=[...new Map([...(existing?.matchDemandRefs||[]),...matched.values()].map(r=>[r.propertyKey||r.fingerprint,r])).values()];const entry={...existing,...(refs.length===1?{propertyRef:refs[0],schedType:'經營買方'}:{}),id,date:existing?.date||date,time:existing?.time||'',memo,matchDemandRefs:[...new Map([...(existing?.matchDemandRefs||[]),...matched.values()].map(r=>[r.propertyKey||r.fingerprint,r])).values()],matchEvents:all,_deleted:false,updatedAt:now.toISOString()};
 if(existing)Object.assign(existing,entry);else items.push(entry);
 c.schedules=items;
 if(!save()){c.schedules=old;return false;}
 return true;
}
function badges(s){const id=s.scheduleId||s.id;if(!String(id||'').startsWith('buyer-match:')||s.propertyRef)return '';const c=typeof DB!=='undefined'?DB.find(c=>(c.schedules||[]).some(x=>x.id===id)):null;if(!c)return '';const original=c.schedules.find(x=>x.id===id);if(original.matchDemandRefs?.length)return original.matchDemandRefs.map(r=>root.schedulePropertyBadge(r,'經營買方')).join('');return (c.bDemands||[]).map(d=>root.schedulePropertyBadge(root.schedulePropertyRef(c,d,'經營買方'),'經營買方')).join('');}
function repair(){if(typeof DB==='undefined')return;let changed=false;for(const c of DB){if(c.bDemands?.length!==1)continue;for(const s of c.schedules||[]){if(String(s.id||'').startsWith('buyer-match:')&&!s.propertyRef){s.propertyRef=root.schedulePropertyRef(c,c.bDemands[0],'經營買方');s.schedType='經營買方';s.updatedAt=new Date().toISOString();changed=true;}}}if(changed){persist();if(typeof render==='function')render();}}setTimeout(repair,0);
root.BuyerSchedule={sync,badges};
})(globalThis);
