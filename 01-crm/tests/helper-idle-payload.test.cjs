const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const large={schema:1,listings:[{text:'中文'.repeat(12*1024*1024)}]},store={last:large,manualFeeds:{buyer:large},inventoryFeeds:{'inventory:one':{listings:[{id:'591:1'}]}}},reads=[];
const c=vm.createContext({console,crypto,URL,setTimeout,clearTimeout,importScripts(){},BuyerStorage:{get:async keys=>{keys=Array.isArray(keys)?keys:[keys];reads.push(keys);return Object.fromEntries(keys.map(k=>[k,store[k]]));},set:async values=>Object.assign(store,values)},chrome:{runtime:{onMessage:{addListener(){}},onInstalled:{addListener(){}},onStartup:{addListener(){}}},alarms:{onAlarm:{addListener(){}}}}});
vm.runInContext(fs.readFileSync('01-crm/tools/buyer-browser/background.js','utf8'),c);
(async()=>{
const old=await c.lastResults(),first=await c.lastResults({scope:'inventory'});assert(!first.manualFeeds&&!first.last);assert(first.inventoryFeeds['inventory:one']);
reads.length=0;const repeat=await c.lastResults({scope:'inventory',revision:first.revision});assert(repeat.unchanged);assert.deepEqual(reads,[['resultRevision']]);
await c.saveSearch({inventoryFeeds:{'inventory:one':{listings:[{id:'591:2'}]}}});const changed=await c.lastResults({scope:'inventory',revision:first.revision});assert(!changed.unchanged);assert.notEqual(changed.revision,first.revision);assert.equal(changed.inventoryFeeds['inventory:one'].listings[0].id,'591:2');
store.last={...large,inventoryIds:['inventory:one']};const auto=await c.lastResults({scope:'inventory'});assert(auto.last,'scheduled inventory feed retained');
const job={id:'job',pages:4,status:'completed',listings:{},sources:{},feed:large};assert.equal(c.summary(job,{skipUnchanged:true,jobId:'job',pages:4,status:'completed'}).feed,undefined);assert(c.summary(job,{skipUnchanged:true,jobId:'job',pages:4,status:'running'}).feed,'completion must deliver final feed');assert(c.summary(job).feed,'legacy caller unchanged');assert(c.summary({...job,status:'running',listings:{one:{id:'1'}}},{jobId:'job',pages:3}).feed,'new pages delivered');
await c.saveSearch({job});assert.equal(store.jobProgress.feed,undefined);assert.equal(store.jobProgress.id,'job');
console.log(JSON.stringify({PASS:true,oldBytes:Buffer.byteLength(JSON.stringify(old)),inventoryBytes:Buffer.byteLength(JSON.stringify(first)),idleBytes:Buffer.byteLength(JSON.stringify(repeat)),checks:'unchanged reads metadata only; changed revision, automatic inventory, completion, progress, legacy delivery'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
