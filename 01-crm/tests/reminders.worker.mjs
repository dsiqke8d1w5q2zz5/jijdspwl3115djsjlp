import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import worker,{syncClients,sendDue} from '../tools/line-reminders/worker.mjs';
const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(new URL('../tools/line-reminders/schema.sql',import.meta.url),'utf8'));
const env={REMINDER_API_KEY:'x'.repeat(32),LINE_CHANNEL_ACCESS_TOKEN:'test-only',LINE_USER_ID:'U'+'a'.repeat(32),ALLOWED_ORIGIN:'https://crm.test',DB:{
 prepare(sql){const s=db.prepare(sql);let args=[];return {bind(...a){args=a;return this;},async run(){return {meta:{changes:Number(s.run(...args).changes)}};},async first(){return s.get(...args)||null;},async all(){return {results:s.all(...args)};}};},
 async batch(statements){db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}
}};
const now=Date.parse('2026-10-10T01:00:00Z');
const item={id:'["c","s"]',due:now,start:now+1800000,enabledAt:now-86400000,title:'測試客戶',memo:'長備註'.repeat(2500),property:'新北市板橋區長地址123456789號',date:'2026-10-10',time:'09:30'};
const client=(revision,items=[item])=>[{id:'c',revision,items}];
const rev=n=>`2026-10-09T00:00:0${n}.000Z`;
await syncClients(env,client(rev(1)));await syncClients(env,client(rev(2),[]));await syncClients(env,client(rev(1)));
assert.equal(db.prepare('SELECT count(*) AS n FROM reminders').get().n,0,'stale snapshot cannot resurrect cancelled reminders');
await syncClients(env,client(rev(3)));let calls=0,keys=[];
const sender=async(url,req)=>{calls++;keys.push(req.headers['X-Line-Retry-Key']);const data=JSON.parse(req.body);assert(data.messages.length>=2);assert(data.messages.every(m=>m.text.length<=5000));assert.equal(data.to,env.LINE_USER_ID);return new Response('',{status:200});};
await Promise.all([sendDue(env,now,sender),sendDue(env,now,sender)]);assert.equal(calls,1,'lease prevents concurrent cron duplicate');
await syncClients(env,client(rev(4)));await sendDue(env,now+60000,sender);assert.equal(calls,1,'same due is not sent again after sync');
item.due+=120000;item.start+=120000;await syncClients(env,client(rev(5)));
await sendDue(env,now+120000,async(url,req)=>{keys.push(req.headers['X-Line-Retry-Key']);throw Error('timeout after LINE accepted');});
await sendDue(env,now+180000,async(url,req)=>{keys.push(req.headers['X-Line-Retry-Key']);return new Response('',{status:409,headers:{'x-line-accepted-request-id':'test'}});});
assert.equal(keys.at(-1),keys.at(-2),'ambiguous response uses identical LINE retry key');
assert.equal(db.prepare("SELECT count(*) AS n FROM deliveries WHERE state='sent'").get().n,2);
item.enabledAt=item.due+1;await syncClients(env,client(rev(6)));assert.equal(db.prepare('SELECT count(*) AS n FROM reminders').get().n,0,'past due new checkbox suppressed');
assert.equal((await worker.fetch(new Request('https://reminder.test/health'),env)).status,401);
assert.equal((await worker.fetch(new Request('https://reminder.test/health',{headers:{Authorization:'Bearer '+env.REMINDER_API_KEY,Origin:'https://evil.test'}}),env)).status,403);
const response=await worker.fetch(new Request('https://reminder.test/health',{headers:{Authorization:'Bearer '+env.REMINDER_API_KEY,Origin:env.ALLOWED_ORIGIN}}),env);
assert.equal((await response.json()).ready,true);assert.equal(response.headers.get('Access-Control-Allow-Origin'),env.ALLOWED_ORIGIN);
console.log('PASS atomic cancellation, stale revisions, concurrent cron lease, sent dedup, time change, retry idempotency, past due, auth, CORS, health');
