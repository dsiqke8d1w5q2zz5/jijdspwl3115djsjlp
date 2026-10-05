(function(root){
'use strict';
const cache=new Map(),versions=new Map();let database,writeQueue=Promise.resolve(),failure='';
const empty=()=>({items:{},runs:[]}),stamp=v=>Date.parse(v)||0;
const normalize=p=>root.BuyerMatchEngine.normalizeListing?root.BuyerMatchEngine.normalizeListing(p):p;
function db(){return database||(database=new Promise((resolve,reject)=>{const r=indexedDB.open('crm-buyer-results',1);r.onupgradeneeded=()=>r.result.createObjectStore('buyers');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));}
function merge(a=empty(),b=empty()){
 const items={...a.items};for(const raw of Object.values(b.items||{})){const p=normalize(raw),old=items[p.id];if(!old||stamp(p.seenAt)>=stamp(old.seenAt))items[p.id]=p;}
 const runs=[...(b.runs||[]),...(a.runs||[])].filter((r,i,all)=>r&&typeof r.at==='string'&&Array.isArray(r.sources)&&all.findIndex(x=>x?.key===r.key)===i).sort((x,y)=>stamp(y.at)-stamp(x.at)).slice(0,30);
 return {items,runs};
}
async function ready(ids){const d=await db();await Promise.all(ids.map(id=>new Promise((resolve,reject)=>{id=String(id);const r=d.transaction('buyers').objectStore('buyers').get(id);r.onsuccess=()=>{cache.set(id,merge(cache.get(id),r.result));resolve();};r.onerror=()=>reject(r.error);})));}
function notify(id){root.dispatchEvent?.(new CustomEvent('crm:buyer-results-updated',{detail:id}));}
const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('crm-buyer-results'):null;
if(channel)channel.onmessage=async e=>{const id=String(e.data);if(cache.has(id)){try{await writeQueue;await ready([id]);notify(id);}catch{}}};
// Read and apply each operation in the same read/write transaction. IndexedDB serializes tabs.
function save(id,apply,announce=true){id=String(id);const version=(versions.get(id)||0)+1;versions.set(id,version);writeQueue=writeQueue.catch(()=>{}).then(async()=>{const d=await db();let value;await new Promise((resolve,reject)=>{const tx=d.transaction('buyers','readwrite'),store=tx.objectStore('buyers'),request=store.get(id);request.onsuccess=()=>{try{value=apply(merge(empty(),request.result));store.put(value,id);}catch(e){reject(e);tx.abort();}};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('儲存取消'));});cache.set(id,versions.get(id)===version?value:merge(value,cache.get(id)));failure='';if(announce)notify(id);setTimeout(()=>channel?.postMessage(id),0);}).catch(e=>{failure='配對結果未能保存：'+e.message;root.dispatchEvent?.(new CustomEvent('crm:buyer-storage-error',{detail:failure}));});return writeQueue;}
function state(id){id=String(id);if(!cache.has(id))cache.set(id,empty());return cache.get(id);}
function applyFeed(s,c,feed,observedAt){const at=feed.generatedAt||observedAt,ds=c.bDemands?.length?c.bDemands:[c];
 const incomingIds=new Set(feed.listings.map(p=>p.id)),covered=new Set((feed.sources||[]).filter(x=>x.status==='ok').map(x=>x.id));for(const old of Object.values(s.items)){if(!feed.incremental&&covered.has(old.source)&&!incomingIds.has(old.id)&&stamp(at)>Math.max(stamp(old.seenAt),stamp(old.detailCheckedAt)))old.notInLatest=true;}
 for(const raw of feed.listings){const p=normalize(raw);if(!p.id)continue;const old=s.items[p.id],interesting=ds.some(d=>root.BuyerMatchEngine.evaluate(d,p).status!=='excluded');if(!old&&!interesting&&!feed.includeExcluded)continue;
  const seenAt=p.seenAt||at,eventAt=new Date(Math.max(stamp(observedAt),stamp(seenAt))).toISOString();if(old&&stamp(seenAt)<stamp(old.seenAt||old.firstMatchedAt))continue;
  const priceChanged=old&&Number.isFinite(old.price)&&Number.isFinite(p.price)&&p.price!==old.price,dropped=priceChanged&&p.price<old.price;
  const detailKeys=['usage','usageEvidence','buildingType','type','elevator','rooms','availability','availabilityReason','detailCheckedAt'];if(old?.detailCheckedAt&&stamp(old.detailCheckedAt)>stamp(p.detailCheckedAt||p.seenAt||at)){for(const key of detailKeys)if(key in old)p[key]=old[key];}s.items[p.id]={...old,...p,notInLatest:false,firstMatchedAt:old?.firstMatchedAt||(interesting?eventAt:undefined),seenAt,priceDroppedAt:dropped?eventAt:priceChanged?undefined:old?.priceDroppedAt,priceBeforeDrop:dropped?old.price:priceChanged?undefined:old?.priceBeforeDrop,priceEvents:priceChanged?[...(old.priceEvents||[]),{at:seenAt,from:old.price,to:p.price}].slice(-30):old?.priceEvents||[]};
 }
 const key=at+'|'+(feed.sources||[]).map(x=>x.id+':'+x.status).join(',');
 if(!feed.incremental&&!s.runs.some(x=>x.key===key))s.runs.unshift({key,at,total:feed.listings.length,sources:feed.sources||[]});
 s.runs.sort((a,b)=>stamp(b.at)-stamp(a.at));s.runs=s.runs.slice(0,30);return s;
}
function ingest(c,feed){const input=structuredClone(feed),buyer=structuredClone(c),at=new Date().toISOString(),apply=s=>applyFeed(s,buyer,input,at);const s=apply(state(c.id));save(c.id,apply);return s;}
function rows(c){const s=state(c.id);return Object.values({...c.buyerMatching?.snapshots,...s.items}).map(normalize);}
function backup(c){return {schema:1,buyerId:c.id,exportedAt:new Date().toISOString(),results:state(c.id),tracking:c.buyerMatching||{}};}
function restore(c,backup){if(backup?.schema!==1||String(backup.buyerId)!==String(c.id)||!backup.results?.items||!Array.isArray(backup.results.runs))throw Error('備份格式或買方不符');const incoming=Object.values(backup.results.items);if(incoming.some(p=>!p||typeof p.id!=='string'||!/^(yungching|sinyi|591|rakuya|leju):.{1,200}$/.test(p.id)))throw Error('物件編號不正確');const data=structuredClone(backup.results),apply=s=>merge(s,data);cache.set(String(c.id),apply(state(c.id)));return save(c.id,apply,false);}
function applyChecks(c,checks){const apply=s=>{for(const check of checks){const old=s.items[check.id];if(old&&stamp(check.detailCheckedAt)>stamp(old.detailCheckedAt)){Object.assign(old,check);if(check.availability==='available'){old.notInLatest=false;old.stale=false;}}}return s;};apply(state(c.id));return save(c.id,apply);}
root.BuyerResults={applyChecks,ready,restore,ingest,rows,state,backup,flush:()=>writeQueue,error:()=>failure};
})(globalThis);
