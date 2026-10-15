const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),path=require('node:path');
const dir=path.join(__dirname,'../tools/buyer-browser');let listener,handler,posted,maxBytes=0,reads=0;
const sender={url:'https://dsiqke8d1w5q2zz5.github.io/jijdspwl3115djsjlp/01-crm/',tab:{id:1},frameId:0,documentId:'one'};
let stored={last:{listings:[{id:'test',text:'中文\\"😀'.repeat(6*1024*1024)}]},manualFeeds:{},inventoryFeeds:{}};
const context=vm.createContext({console,crypto,URL,setTimeout,clearTimeout,importScripts(){},BuyerStorage:{get:async()=>stored},chrome:{runtime:{onMessage:{addListener:f=>listener=f},onInstalled:{addListener(){}},onStartup:{addListener(){}}},alarms:{onAlarm:{addListener(){}}}}});
vm.runInContext(fs.readFileSync(path.join(dir,'background.js'),'utf8'),context);
function send(msg,owner=sender){return new Promise((resolve,reject)=>{listener(msg,owner,value=>{const bytes=Buffer.byteLength(JSON.stringify(value));maxBytes=Math.max(maxBytes,bytes);if(bytes>64*1024*1024)throw Error('64MiB exceeded');resolve(JSON.parse(JSON.stringify(value)));});});}
const window={addEventListener:(type,f)=>handler=f,postMessage:r=>posted=r};const bridge=vm.createContext({window,location:{origin:new URL(sender.url).origin,href:sender.url},URL,sessionStorage:{getItem(){}},chrome:{runtime:{sendMessage:async msg=>{if(msg.type==='transferRead')reads++;return send(msg);}}}});vm.runInContext(fs.readFileSync(path.join(dir,'bridge.js'),'utf8'),bridge);
(async()=>{
assert(Buffer.byteLength(JSON.stringify(stored))>64*1024*1024);
await handler({source:window,origin:new URL(sender.url).origin,data:{channel:'CRM_BUYER_REQUEST',id:'large',type:'last'}});
assert.equal(posted.result.last.listings[0].text,stored.last.listings[0].text);assert(reads>1);assert(maxBytes<2*1024*1024);assert.equal(vm.runInContext('responseTransfers.size',context),0);console.log('PASS >64MiB Unicode/escaped JSON roundtrip, max runtime response bytes='+maxBytes+', chunks='+reads);
const meta=await send({type:'last'});assert((await send({type:'transferRead',token:meta.token,index:0},{...sender,tab:{id:2}})).error);assert((await send({type:'transferRead',token:meta.token,index:-1})).error);await send({type:'transferRelease',token:meta.token});assert((await send({type:'transferRead',token:meta.token,index:0})).error);
const a=await send({type:'last'}),b=await send({type:'last'});assert.notEqual(a.token,b.token);await send({type:'transferRelease',token:a.token});assert.equal((await send({type:'transferRead',token:b.token,index:0})).index,0);vm.runInContext('for(const t of responseTransfers.values())t.expires=0',context);assert((await send({type:'transferRead',token:b.token,index:0})).error);assert.equal(vm.runInContext('responseTransfers.size',context),0);
stored={last:{listings:[]}};assert.deepEqual(await send({type:'last'}),stored);
bridge.chrome.runtime.sendMessage=async()=>{throw Error('Extension context invalidated.');};await handler({source:window,origin:new URL(sender.url).origin,data:{channel:'CRM_BUYER_REQUEST',id:'fail',type:'last'}});assert(posted.result.error.includes('Extension context invalidated'));console.log('PASS sender isolation, invalid index, released/expired transfer, concurrent reads, small response, explicit error');
})().catch(e=>{console.error(e);process.exitCode=1;});
