/* Local image assets and offline downloads. No customer data or photos leave the device. */
(function(){
 'use strict';
 let connection;
 function database(){return connection||(connection=new Promise((resolve,reject)=>{
  const req=indexedDB.open('crm-image-assets',1);
  req.onupgradeneeded=()=>req.result.createObjectStore('assets',{keyPath:'id'});
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
 }).catch(e=>{connection=null;throw e;}));}
 async function transaction(mode,work){const db=await database();return new Promise((resolve,reject)=>{
  const tx=db.transaction('assets',mode),req=work(tx.objectStore('assets'));let result;
  req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(tx.error||Error('素材儲存失敗'));
 });}
 function blob(canvas,type='image/png',quality=.94){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('無法產生圖片')),type,quality));}
 function download(data,name){const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
 function crc(bytes){let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
 // ZIP STORE: lossless packaging, without downloading a library or recompressing JPEG/PNG.
 async function zip(entries){
  const files=[],directory=[];let offset=0,centralSize=0;
  for(const entry of entries){
   const bytes=new Uint8Array(await entry.blob.arrayBuffer()),name=new TextEncoder().encode(entry.name),sum=crc(bytes);
   const local=new Uint8Array(30+name.length),v=new DataView(local.buffer);
   v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,sum,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,name.length,true);local.set(name,30);
   const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);
   c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint16(14,33,true);c.setUint32(16,sum,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);
   files.push(local,bytes);directory.push(central);offset+=local.length+bytes.length;centralSize+=central.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
  return new Blob([...files,...directory,end],{type:'application/zip'});
 }
 window.ImageStorage={blob,download,zip,list:()=>transaction('readonly',s=>s.getAll()),put:row=>transaction('readwrite',s=>s.put(row)),remove:id=>transaction('readwrite',s=>s.delete(id))};
})();
