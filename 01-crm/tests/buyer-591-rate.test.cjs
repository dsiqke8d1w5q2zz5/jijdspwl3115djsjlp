const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');let now=1800000000000,calls=[],reply={status:200,ok:true,headers:{get:()=>null}},waits=[];
class Clock extends Date{constructor(...a){super(...(a.length?a:[now]))}static now(){return now}}
const ctx=vm.createContext({Date:Clock,URL,AbortSignal,console,setTimeout:(f,ms)=>{waits.push(ms);now+=ms;f()},fetch:async url=>{calls.push({url,at:now});return reply}});
vm.runInContext(fs.readFileSync('01-crm/tools/buyer-browser/read.js','utf8'),ctx);
(async()=>{
await ctx.crm591Fetch('one');await ctx.crm591Fetch('two');assert.equal(calls[1].at-calls[0].at,1500);
reply={status:429,headers:{get:()=> '120'}};await assert.rejects(ctx.crm591Fetch('limited'),e=>e.name==='RateLimitError');const until=ctx.crm591Rate.until;assert.equal(until-now,120000);
const n=calls.length;const result=await ctx.crmVerifyListings([{id:'591:1',source:'591',url:'https://sale.591.com.tw/1'},{id:'591:2',source:'591',url:'https://sale.591.com.tw/2'}]);assert.equal(calls.length,n);assert(result.every(r=>r.detailRateLimited&&r.availability==='unknown'&&r.detailStatus==='failed'));assert.equal(Date.parse(result[0].detailRetryAt),until);
now=until;reply={status:404,ok:false};const [off]=await ctx.crmVerifyListings([{id:'591:1',source:'591',url:'https://sale.591.com.tw/1'}]);assert.equal(off.availability,'unavailable');assert.equal(calls.length,n+1);
reply={status:429,headers:{get:()=>new Clock(now+180000).toUTCString()}};await assert.rejects(ctx.crm591Fetch('date'));assert(ctx.crm591Rate.until-now>=179000&&ctx.crm591Rate.until-now<=180000);
now=ctx.crm591Rate.until;reply={status:429,headers:{get:()=>null}};await assert.rejects(ctx.crm591Fetch('default'));assert.equal(ctx.crm591Rate.until-now,60000);
// Background persists the limiter across tab changes and worker restarts, and serializes calls.
const source=fs.readFileSync('01-crm/tools/buyer-browser/background.js','utf8'),segment=source.slice(source.indexOf('let verify591Queue='),source.indexOf('async function enrich591('));let saved={},active=0,maxActive=0;
function worker(){const c=vm.createContext({Date:Clock,Promise,Error,BuyerStorage:{get:async()=>saved},saveSearch:async v=>Object.assign(saved,v),chrome:{scripting:{executeScript:async o=>{active++;maxActive=Math.max(maxActive,active);await Promise.resolve();active--;return [{result:{checks:[{id:o.args[0][0].id}],rate:{nextAt:now+60000,until:now+60000}}}];}}}});vm.runInContext(segment,c);return c;}
const w=worker();await Promise.all([w.verify591Rows(1,[{id:'one'}]),w.verify591Rows(2,[{id:'two'}])]);assert.equal(maxActive,1);await assert.rejects(worker().check591Cooldown(),/限流/);now=saved.detail591Rate.until;await worker().check591Cooldown();console.log('PASS request spacing, 429 stop, no queued network traffic, Retry-After seconds/date, fallback cooldown, resume, persisted cooldown and serialization');
})().catch(e=>{console.error(e);process.exitCode=1});
