// Large jobs and history belong in IndexedDB rather than chrome.storage.local's small quota.
(function(){
let connection;
const large=new Set(['memberReports','job','dailyJob','batchBuyerJob','batchInventoryJob','history','last','lastManual','manualFeeds','inventoryFeeds','detailCache','searchDetails_sinyi','searchDetails_yungching']);
const db=()=>connection||(connection=new Promise((resolve,reject)=>{const r=indexedDB.open('buyer-helper-data',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));
async function get(keys){
keys=Array.isArray(keys)?keys:[keys];const big=keys.filter(k=>large.has(k)),small=keys.filter(k=>!large.has(k));
if(!big.length)return chrome.storage.local.get(keys);
const d=await db(),out={};
await new Promise((resolve,reject)=>{const tx=d.transaction('state'),store=tx.objectStore('state');for(const k of big){const r=store.get(k);r.onsuccess=()=>{if(r.result!==undefined)out[k]=r.result;};}tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('資料讀取中止'));});
const fallback=await chrome.storage.local.get([...small,...big.filter(k=>!Object.hasOwn(out,k))]);
return {...fallback,...out};
}
async function set(values){
const big=Object.entries(values).filter(([k])=>large.has(k)),small=Object.fromEntries(Object.entries(values).filter(([k])=>!large.has(k)));
if(big.length){const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('state','readwrite');for(const [k,v]of big)tx.objectStore('state').put(v,k);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('資料未保存'));});await chrome.storage.local.remove(big.map(([k])=>k));}
if(values.job)small.jobInfo={status:values.job.status,pages:values.job.pages,scanned:values.job.scanned};if(values.last)small.lastAt=values.last.generatedAt;if(Object.keys(small).length)await chrome.storage.local.set(small);
}
async function remove(keys){
keys=Array.isArray(keys)?keys:[keys];const big=keys.filter(k=>large.has(k));
if(big.length){const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction('state','readwrite');big.forEach(k=>tx.objectStore('state').delete(k));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('資料刪除中止'));});}
await chrome.storage.local.remove(keys);
}
globalThis.BuyerStorage={get,set,remove};
})();
