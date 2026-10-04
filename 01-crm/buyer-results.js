(function(root){
'use strict';
const cache=new Map(),dirty=new Set();let database,writeQueue=Promise.resolve(),failure='';
function db(){return database||(database=new Promise((resolve,reject)=>{const r=indexedDB.open('crm-buyer-results',1);r.onupgradeneeded=()=>r.result.createObjectStore('buyers');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));}
async function ready(ids){const d=await db();await Promise.all(ids.map(id=>new Promise((resolve,reject)=>{const r=d.transaction('buyers').objectStore('buyers').get(String(id));r.onsuccess=()=>{if(!dirty.has(String(id)))cache.set(String(id),r.result||{items:{},runs:[]});resolve();};r.onerror=()=>reject(r.error);})));}
function save(id){dirty.add(String(id));const value=structuredClone(cache.get(String(id)));writeQueue=writeQueue.catch(()=>{}).then(async()=>{const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('buyers','readwrite');tx.objectStore('buyers').put(value,String(id));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('儲存取消'));});failure='';}).catch(e=>{failure='配對結果未能保存：'+e.message;root.dispatchEvent?.(new CustomEvent('crm:buyer-storage-error',{detail:failure}));});return writeQueue;}
function state(id){id=String(id);if(!cache.has(id))cache.set(id,{items:{},runs:[]});return cache.get(id);}
function ingest(c,feed){const s=state(c.id),at=feed.generatedAt||new Date().toISOString(),ds=c.bDemands?.length?c.bDemands:[c];
 const incomingIds=new Set(feed.listings.map(p=>p.id)),covered=new Set((feed.sources||[]).filter(x=>x.status==='ok'||x.status==='partial').map(x=>x.id));for(const old of Object.values(s.items)){if(covered.has(old.source)&&!incomingIds.has(old.id)&&Date.parse(at)>Date.parse(old.seenAt))old.notInLatest=true;}
 for(const p of feed.listings){if(!p.id)continue;const old=s.items[p.id],interesting=ds.some(d=>root.BuyerMatchEngine.evaluate(d,p).status!=='excluded');if(!old&&!interesting)continue;
  const stamp=p.seenAt||at,eventAt=new Date(Math.max(Date.now(),Date.parse(stamp)||0)).toISOString();if(old&&Date.parse(stamp)<Date.parse(old.seenAt||old.firstMatchedAt))continue;
  const priceChanged=old&&Number.isFinite(old.price)&&Number.isFinite(p.price)&&p.price!==old.price,dropped=priceChanged&&p.price<old.price;
  s.items[p.id]={...old,...p,notInLatest:false,firstMatchedAt:old?.firstMatchedAt||eventAt,seenAt:stamp,priceDroppedAt:dropped?eventAt:priceChanged?undefined:old?.priceDroppedAt,priceBeforeDrop:dropped?old.price:priceChanged?undefined:old?.priceBeforeDrop,priceEvents:priceChanged?[...(old.priceEvents||[]),{at:stamp,from:old.price,to:p.price}].slice(-30):old?.priceEvents||[]};
 }
 const key=at+'|'+(feed.sources||[]).map(x=>x.id+':'+x.status).join(',');
 if(!s.runs.some(x=>x.key===key))s.runs.unshift({key,at,total:feed.listings.length,sources:feed.sources||[]});
 s.runs.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));s.runs=s.runs.slice(0,30);save(c.id);return s;
}
function rows(c){const s=state(c.id);return Object.values({...c.buyerMatching?.snapshots,...s.items});}
function backup(c){return {schema:1,buyerId:c.id,exportedAt:new Date().toISOString(),results:state(c.id),tracking:c.buyerMatching||{}};}
function restore(c,backup){if(backup?.schema!==1||String(backup.buyerId)!==String(c.id)||!backup.results?.items||!Array.isArray(backup.results.runs))throw Error('備份格式或買方不符');const incoming=Object.values(backup.results.items);if(incoming.some(p=>!p||typeof p.id!=='string'||!/^(yungching|sinyi|591|rakuya|leju):.{1,200}$/.test(p.id)))throw Error('物件編號不正確');const s=state(c.id);for(const p of incoming){const old=s.items[p.id];if(!old||Date.parse(p.seenAt)>=Date.parse(old.seenAt))s.items[p.id]=p;}s.runs=[...s.runs,...backup.results.runs].filter((r,i,all)=>r&&typeof r.at==='string'&&Array.isArray(r.sources)&&all.findIndex(x=>x.key===r.key)===i).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at)).slice(0,30);return save(c.id);}
root.BuyerResults={ready,restore,ingest,rows,state,backup,flush:()=>writeQueue,error:()=>failure};
})(globalThis);
