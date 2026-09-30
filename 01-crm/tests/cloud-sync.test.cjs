const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(process.env.CRM_SYNC_HTML || require('node:path').join(__dirname,'../index.html'),'utf8');const src=html.slice(html.indexOf('function _crmMarkPending()'),html.indexOf('\nstartAutoCheck();'));
function setup(db=[],storage=new Map()){const scripts=[],timers=[],status={textContent:'',innerHTML:''};const body={appendChild(s){s.parentNode=body;scripts.push(s)},removeChild(s){s.parentNode=null}};
 const c={DB:db,console,JSON,Date,URLSearchParams,Blob,navigator:{onLine:true},CLOUD_URL:'https://example.test/cloud',localStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k)||null,removeItem:k=>storage.delete(k)},document:{hidden:false,body,createElement:()=>({remove(){this.parentNode=null}}),getElementById:()=>status,addEventListener(){}},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(){},setInterval(){},clearInterval(){},showToast(){},render(){},migrateDB(){},mergeCheckIn(){},getCheckInData:()=>({}),_perfRecords:[],_perfLoaded:true,_templates:[],_signingTemplates:[],_otherTemplates:[],_otplLoaded:true,_syncTimer:null};c.alert=()=>{};c.window=c;c.addEventListener=()=>{};c.fetch=async()=>{};vm.createContext(c);vm.runInContext(src,c);
 return {c,storage,scripts,timers,status,reply(data){const script=scripts.at(-1),name=new URL(script.src).searchParams.get('callback');c[name](data)}};
}
test('mobile receives newer records even after desktop deletes several customers',()=>{const local=Array.from({length:5},(_,i)=>({id:String(i),name:'old',updatedAt:'2026-01-01'}));const e=setup(local);let done;e.c.autoFetchCloud(true,ok=>done=ok);e.reply([{id:'0',name:'new',updatedAt:'2026-09-18'},...['1','2','3','4'].map(id=>({id,_deleted:true,updatedAt:'2026-09-18'})),{id:'new',name:'desktop'}]);assert.equal(e.c.DB.find(x=>x.id==='0').name,'new');assert(e.c.DB.find(x=>x.id==='new'));assert.equal(done,true)});
test('metadata downloads when client records are unchanged',()=>{const e=setup([{id:'a',name:'same'}]);e.c.autoFetchCloud(true);e.reply([{id:'a',name:'same'},{__templates:true,items:[{title:'new'}]},{__perfRecords:true,records:[{fee:'100'}]}]);assert.equal(e.c._templates[0].title,'new');assert.equal(e.c._perfRecords[0].fee,'100')});
test('failed pre-upload download cannot push stale local data',()=>{const e=setup([{id:'a'}]);let pushes=0;e.c._autoSyncPush=()=>pushes++;e.c.autoSync();e.scripts.at(-1).onerror();assert.equal(pushes,0);assert.equal(e.c._syncInFlight,false);assert(e.c._syncRetryTimer);e.c.autoSync=()=>{};e.timers.find(t=>t.ms===2000).fn();assert.equal(e.c._syncRetryTimer,null)});
test('same record count with old content is not confirmed as synchronized',()=>{const e=setup([{id:'a',name:'new'}]);e.c._expectedCloudData=[{id:'a',name:'new'}];e.c._uploadedLocalJSON=JSON.stringify(e.c.DB);e.c._crmMarkPending();e.c.verifySyncResult(e.status);e.reply([{id:'a',name:'old'}]);assert(e.c._crmHasPending());assert.equal(e.c._syncRetryCount,1)});
test('verified upload preserves pending edits made during the request',()=>{const e=setup([{id:'a',name:'newer'}]);e.c._expectedCloudData=[{id:'a',name:'sent'}];e.c._uploadedLocalJSON=JSON.stringify([{id:'a',name:'sent'}]);e.c.verifySyncResult(e.status);e.reply([{id:'a',name:'sent'}]);assert(e.c._crmHasPending());assert(e.timers.some(t=>t.ms===500))});
test('verified unchanged upload clears pending marker',()=>{const e=setup([{id:'a',name:'sent'}]);e.c._expectedCloudData=[{name:'sent',id:'a'}];e.c._uploadedLocalJSON=JSON.stringify(e.c.DB);e.c._crmMarkPending();e.c.verifySyncResult(e.status);e.reply([{id:'a',name:'sent'}]);assert.equal(e.c._crmHasPending(),false)});
test('verification timeout releases sync lock and schedules retry',()=>{const e=setup([]);e.c._syncInFlight=true;e.c.verifySyncResult(e.status);e.timers.find(t=>t.ms===90000).fn();assert.equal(e.c._syncInFlight,false);assert(e.c._syncRetryTimer)});

const metadata=[['persistPerf','perfRecords','_perfRecords','__perfRecords','records'],['persistTemplates','crmTemplates','_templates','__templates','items'],['persistSigningTemplates','crmSigningTemplates','_signingTemplates','__signingTemplates','items'],['persistOtherTemplates','crmOtherTemplates','_otherTemplates','__otherTemplates','items']];
function installPersist(c,name){const start=html.indexOf('function '+name+'()'),end=html.indexOf('\n}',start)+2;vm.runInContext(html.slice(start,end),c);}
for(const [persist,key,field,marker,prop] of metadata){
 for(const local of [[{id:'new',title:'edited'}],[]])test(key+' preserves '+(local.length?'edits':'intentional deletion')+' before upload and clears only after verification',()=>{
  const e=setup([{id:'a'}]);installPersist(e.c,persist);e.c[field]=structuredClone(local);e.c[persist]();assert(e.c._crmHasPending());
  e.c.autoSync();e.reply([{id:'a'},{[marker]:true,[prop]:[{id:'old'}]}]);
  const sent=e.c._expectedCloudData.find(x=>x[marker]);assert.equal(JSON.stringify(sent[prop]),JSON.stringify(local));assert(e.c._crmMetaRevision(key));
  e.c.verifySyncResult(e.status);e.reply(e.c._expectedCloudData);assert.equal(e.c._crmMetaRevision(key),'');assert(!e.c._crmHasPending());
 });
 test(key+' offline edits survive page restart',()=>{
  const first=setup([{id:'a'}]);installPersist(first.c,persist);first.c[field]=[{id:'offline'}];first.c[persist]();first.c.navigator.onLine=false;first.c.autoSync();
  const e=setup([{id:'a'}],first.storage);e.c[field]=JSON.parse(e.storage.get(key));e.c.autoFetchCloud(true);e.reply([{id:'a'},{[marker]:true,[prop]:[{id:'old'}]}]);assert.equal(e.c[field][0].id,'offline');assert(e.c._crmHasMetadataPending());
 });
 test(key+' edit during upload is queued again and protected from a later download',()=>{
  const e=setup([{id:'a'}]);installPersist(e.c,persist);e.c[field]=[{id:'first'}];e.c[persist]();e.c.autoSync();e.reply([{id:'a'}]);const uploaded=structuredClone(e.c._expectedCloudData);
  e.c[field]=[{id:'second'}];e.c[persist]();e.c.verifySyncResult(e.status);e.reply(uploaded);
  assert(e.c._crmHasPending());assert(e.c._crmMetaRevision(key));assert(e.timers.some(x=>x.ms===500));
  e.c.autoFetchCloud(true);e.reply(uploaded);assert.equal(e.c[field][0].id,'second');
 });
}
test('failed verification preserves metadata pending state',()=>{
 const e=setup([{id:'a'}]);installPersist(e.c,'persistPerf');e.c._perfRecords=[{id:'new'}];e.c.persistPerf();e.c.autoSync();e.reply([{id:'a'}]);e.c.verifySyncResult(e.status);e.reply([{id:'a'},{__perfRecords:true,records:[{id:'old'}]}]);assert(e.c._crmMetaRevision('perfRecords'));assert(e.c._crmHasPending());
});

// Reproduce the user-visible save rollback with the actual pre-upload fetch.
test('saved intermediary fees survive the pre-upload cloud read',()=>{
 const e=setup([{id:'a'}]);installPersist(e.c,'persistPerf');
 e.c._perfRecords=[{client:'test',intermediaries:[{name:'test person',fee:'6250'}]}];
 e.c.persistPerf();e.c.autoSync();
 e.reply([{id:'a'},{__perfRecords:true,records:[{client:'test',intermediaries:[]}]}]);
 assert.equal(e.c._perfRecords[0].intermediaries.length,1,'cloud data must not erase the saved fee');
 assert.equal(e.c._expectedCloudData.find(r=>r.__perfRecords).records[0].intermediaries[0].fee,'6250');
});

// An older background request may finish after the new upload is verified.
test('late cloud response cannot roll back a verified performance save',()=>{
 const e=setup([{id:'a'}]);installPersist(e.c,'persistPerf');
 e.c.autoFetchCloud(true);const oldCallback=new URL(e.scripts.at(-1).src).searchParams.get('callback');
 e.c._perfRecords=[{id:'new',intermediaries:[{name:'person',fee:'6250'}]}];e.c.persistPerf();
 e.c.autoSync();e.reply([{id:'a'},{__perfRecords:true,records:[{id:'old'}]}]);
 e.c.verifySyncResult(e.status);e.reply(e.c._expectedCloudData);assert(!e.c._crmMetaRevision('perfRecords'));
 e.c[oldCallback]([{id:'a'},{__perfRecords:true,records:[{id:'old'}]}]);
 assert.equal(e.c._perfRecords[0].id,'new');
 e.c.autoFetchCloud(true);e.reply([{id:'a'},{__perfRecords:true,records:[{id:'newest-from-other-device'}]}]);
 assert.equal(e.c._perfRecords[0].id,'newest-from-other-device');
});
