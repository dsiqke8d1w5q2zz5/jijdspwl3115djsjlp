// Secrets are configured in Cloudflare, never in the published CRM assets.
const WINDOW=5*60*1000;
function statement(env,sql,...args){return env.DB.prepare(sql).bind(...args);}
function ready(env){return !!(env.DB&&env.REMINDER_API_KEY?.length>=32&&env.LINE_CHANNEL_ACCESS_TOKEN&&/^U[0-9a-f]{32}$/.test(env.LINE_USER_ID||''));}
function validate(clients){
 if(!Array.isArray(clients)||clients.length>10)throw Error('Invalid clients');
 for(const c of clients){
  if(typeof c.id!=='string'||c.id.length>200||!c.id||typeof c.revision!=='string'||!Number.isFinite(Date.parse(c.revision))||new Date(c.revision).toISOString()!==c.revision||!Array.isArray(c.items)||c.items.length>500)throw Error('Invalid client');
  const ids=new Set();
  for(const i of c.items){
   if(typeof i.id!=='string'||i.id.length>500||!i.id||ids.has(i.id)||!Number.isSafeInteger(i.due)||!Number.isSafeInteger(i.start)||!Number.isSafeInteger(i.enabledAt)||i.start<i.due||i.start-i.due>1800000)throw Error('Invalid reminder');
   let identity;try{identity=JSON.parse(i.id);}catch{throw Error('Invalid identity');}
   if(!Array.isArray(identity)||identity.length!==2||identity[0]!==c.id)throw Error('Invalid identity');
   for(const k of ['title','memo','property','date','time'])if(typeof i[k]!=='string'||i[k].length>15000)throw Error('Invalid text');
   ids.add(i.id);
  }
 }
}
export async function syncClients(env,clients){
 validate(clients);
 for(const c of clients){
  // A single D1 batch is atomic. Older tabs cannot resurrect cancelled reminders.
  const eligible=c.items.filter(i=>i.enabledAt<=i.due);
  await env.DB.batch([
   statement(env,'INSERT INTO clients(id,revision) VALUES (?,?) ON CONFLICT(id) DO NOTHING',c.id,''),
   statement(env,'DELETE FROM reminders WHERE client_id=? AND EXISTS(SELECT 1 FROM clients WHERE id=? AND revision<?)',c.id,c.id,c.revision),
   statement(env,`INSERT INTO reminders(id,client_id,due,payload)
    SELECT json_extract(value,'$.id'),?,json_extract(value,'$.due'),value FROM json_each(?)
    WHERE EXISTS(SELECT 1 FROM clients WHERE id=? AND revision<?)
    ON CONFLICT(id) DO UPDATE SET due=excluded.due,payload=excluded.payload`,c.id,JSON.stringify(eligible),c.id,c.revision),
   statement(env,'UPDATE clients SET revision=? WHERE id=? AND revision<?',c.revision,c.id,c.revision)
  ]);
 }
}
export async function sendDue(env,now=Date.now(),send=fetch){
 if(!ready(env))return;
 const {results}=await statement(env,`SELECT r.* FROM reminders r LEFT JOIN deliveries d ON d.event=r.id||':'||r.due
 WHERE r.due BETWEEN ? AND ? AND (d.event IS NULL OR (d.state='pending' AND d.attempts<5 AND d.lease<=? AND d.next_attempt<=?))
 ORDER BY r.due LIMIT 10`,now-WINDOW,now,now,now).all();
 for(const row of results){
  const event=row.id+':'+row.due;
  await statement(env,'INSERT INTO deliveries(event,retry_key) VALUES (?,?) ON CONFLICT(event) DO NOTHING',event,crypto.randomUUID()).run();
  const lock=await statement(env,`UPDATE deliveries SET lease=?,attempts=attempts+1 WHERE event=? AND state='pending' AND attempts<5 AND lease<=? AND next_attempt<=?`,now+60000,event,now,now).run();
  if(!lock.meta.changes)continue;
  const current=await statement(env,'SELECT payload FROM reminders WHERE id=? AND due=?',row.id,row.due).first();
  if(!current){await statement(env,'UPDATE deliveries SET lease=0 WHERE event=?',event).run();continue;}
  const d=await statement(env,'SELECT retry_key,attempts FROM deliveries WHERE event=?',event).first();
  const item=JSON.parse(current.payload);
  const text=['🔔 行程提醒',item.date+' '+(item.time||'全天'),item.title,item.property,item.memo].filter(Boolean).join('\n');
  // LINE supports up to five text messages, each at most 5,000 characters.
  const messages=[];for(let n=0;n<text.length;n+=4900)messages.push({type:'text',text:text.slice(n,n+4900)});
  if(messages.length>5){await statement(env,"UPDATE deliveries SET state='failed',last_status=413,lease=0 WHERE event=?",event).run();continue;}
  let status=0,accepted=false;
  try{
   const response=await send('https://api.line.me/v2/bot/message/push',{method:'POST',headers:{Authorization:'Bearer '+env.LINE_CHANNEL_ACCESS_TOKEN,'Content-Type':'application/json','X-Line-Retry-Key':d.retry_key},body:JSON.stringify({to:env.LINE_USER_ID,messages}),signal:AbortSignal.timeout(15000)});
   status=response.status;accepted=status===200||(status===409&&!!response.headers.get('x-line-accepted-request-id'));
   await response.body?.cancel();
  }catch{/* Same persisted retry key is reused after network ambiguity. */}
  const state=accepted?'sent':status>=400&&status<500&&status!==429?'failed':'pending';
  await statement(env,'UPDATE deliveries SET state=?,last_status=?,sent_at=?,lease=0,next_attempt=? WHERE event=?',state,status,accepted?now:null,now+60000,event).run();
 }
}
export default {
 async fetch(request,env){
  const origin=request.headers.get('Origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&origin===env.ALLOWED_ORIGIN)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&origin!==env.ALLOWED_ORIGIN)return reply({error:'Origin rejected'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(!env.REMINDER_API_KEY||request.headers.get('Authorization')!=='Bearer '+env.REMINDER_API_KEY)return reply({error:'Unauthorized'},401);
  const path=new URL(request.url).pathname;
  try{
   if(path==='/health'&&request.method==='GET'){
    if(!ready(env))return reply({ready:false});
    await env.DB.prepare('SELECT id FROM clients LIMIT 1').first();return reply({ready:true});
   }
   if(path==='/sync'&&request.method==='POST'){
    if(!ready(env))return reply({error:'Not configured'},503);
    const body=await request.text();if(body.length>250000)return reply({error:'Payload too large'},413);
    let clients;try{clients=JSON.parse(body).clients;validate(clients);}catch{return reply({error:'Invalid payload'},400);}
    await syncClients(env,clients);return reply({ok:true});
   }
   return reply({error:'Not found'},404);
  }catch{return reply({error:'Service unavailable'},503);}
 },
 async scheduled(event,env,ctx){ctx.waitUntil(sendDue(env));}
};
