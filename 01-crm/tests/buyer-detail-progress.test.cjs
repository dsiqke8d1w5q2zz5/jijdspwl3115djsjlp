const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('01-crm/tools/buyer-browser/background.js','utf8');
let now=1800000000000,seq=0,timers=new Map(),closed=[],batches=[],saved={job:{id:'r',status:'running'},dailyProgress:{id:'r',status:'running',pages:270},jobProgress:{id:'r',status:'running'}};
class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
function advance(ms){now+=ms;for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.f();}}
const c=vm.createContext({Date:Clock,console,Error,Promise,Map,Object,setTimeout:(f,ms)=>{timers.set(++seq,{f,at:now+ms});return seq},clearTimeout:id=>timers.delete(id),chrome:{tabs:{remove:async id=>closed.push(id)}},BuyerStorage:{get:async()=>structuredClone(saved),set:async v=>Object.assign(saved,structuredClone(v))},saveSearch:async v=>Object.assign(saved,structuredClone(v)),filterTaskRows:r=>r,BuyerMatchEngine:{evaluate:()=>({status:'matched'})},verify591Rows:async(id,rows)=>{assert(rows.length<=3);batches.push(rows.length);advance(18000);return rows.map(r=>({...r,availability:'available',detailStatus:'ok'}));}});
vm.runInContext(src.slice(src.indexOf('async function enrich591('),src.indexOf('// Reuse only identical')),c);
vm.runInContext(src.slice(src.indexOf('async function readPageDeadline('),src.indexOf('async function buyerVerify')),c);
const task={roundId:'r',demands:[{}]},rows=Array.from({length:30},(_,i)=>({id:'591:'+i,url:'https://sale.591.com.tw/home/house/detail/2/'+i+'.html'}));
c.pageRows=async(t,control)=>{control.tabId=1;return c.enrich591(1,{rows},t,control)};
(async()=>{const result=await c.readPageDeadline(task);assert.equal(result.rows.length,30);assert.equal(batches.length,10);assert.equal(closed.length,0);assert.equal(timers.size,0);assert.equal(now-1800000000000,180000);assert.equal(Object.keys(saved.detailCache).length,30);assert.equal(saved.dailyProgress.pages,270);assert.equal(saved.dailyProgress.lastProgressAt,new Clock().toISOString());
await c.readPageDeadline(task);assert.equal(batches.length,10,'checkpoint prevents repeated detail fetch');
c.pageRows=async(t,control)=>{control.tabId=2;return new Promise(()=>{})};const stuck=c.readPageDeadline(task);advance(120000);await assert.rejects(stuck,/沒有處理進度/);assert.deepEqual(closed,[2]);assert.equal(timers.size,0);
saved.job.status='cancelled';saved.detailCache={};c.pageRows=async(t,control)=>c.enrich591(3,{rows},t,control);await assert.rejects(c.readPageDeadline(task),/取消/);assert.equal(batches.length,10);
console.log('PASS 180-second page completes with checkpoints; progress persisted; cached details reused; stalled page closes; cancelled job sends no requests');})().catch(e=>{console.error(e);process.exitCode=1});
