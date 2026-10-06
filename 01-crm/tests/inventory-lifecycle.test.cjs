const assert=require('node:assert/strict');global.BuyerGrouping=require('../buyer-grouping.js');const E=require('../inventory-market-engine.js');
const cfg={enabled:true,transactionsEnabled:true,mode:'road',address:'新北市板橋區民生路三段',criteria:{priceMax:1500}};
const p={id:'591:1',source:'591',address:cfg.address,price:1000,area:20,floor:5,age:10};
const at=n=>new Date(Date.UTC(2026,9,5,n)).toISOString();const feed=(n,rows=[],status='ok',extra={})=>({scanId:'scan'+n,generatedAt:at(n),sources:[{id:'591',status}],listings:rows,...extra});
let s=E.apply(null,cfg,feed(0,[p]),at(0));assert.equal(s.events.length,0);
s=E.apply(s,cfg,feed(1),at(1));assert.equal(s.records[p.id].missingScans,1);
s=E.apply(s,cfg,feed(1),at(1));assert.equal(s.records[p.id].missingScans,1);
s=E.apply(s,cfg,feed(2,[],'partial'),at(2));assert.equal(s.records[p.id].missingScans,1);
s=E.apply(s,cfg,feed(3,[],'ok',{incremental:true}),at(3));assert.equal(s.records[p.id].missingScans,1);
s=E.apply(s,cfg,feed(4),at(4));s=E.apply(s,cfg,feed(5),at(5));assert.equal(s.records[p.id].availability,'suspected');assert.equal(s.events.length,0);
s=E.apply(s,cfg,feed(0,[p]),at(6));assert.equal(s.records[p.id].availability,'suspected');
s=E.apply(s,cfg,feed(6),at(6));assert.equal(s.events.length,0);
s=E.apply(s,cfg,feed(7,[p]),at(7));assert.equal(s.events.length,0);assert.equal(s.records[p.id].missingScans,0);
s=E.apply(s,cfg,feed(8),at(8));s=E.verify(s,cfg,[{id:p.id,status:'unknown'}],'scan8',at(8));assert.equal(s.records[p.id].availability,'active');
s=E.verify(s,cfg,[{id:p.id,status:'off'}],'scan8',at(8));assert.equal(s.events.at(-1).kind,'已下架');const n=s.events.length;s=E.verify(s,cfg,[{id:p.id,status:'off'}],'scan8',at(8));assert.equal(s.events.length,n);
s=E.apply(s,cfg,feed(9,[{...p,price:2000}]),at(9));assert.equal(s.records[p.id].availability,'active');assert.equal(s.events.length,n);assert(!E.assess(cfg,s.records[p.id]).match);
assert(E.assess(cfg,{...p,kind:'transaction',price:9999}).match);assert.deepEqual(E.assess({criteria:{roomsMin:2}},p).missing,['房數']);assert.throws(()=>E.criteria({areaMin:20,areaMax:10}));assert.throws(()=>E.criteria({roomsMin:1.5}));assert.equal(E.criteria({floorMin:-1}).floorMin,-1);
let disabled=E.apply(null,{...cfg,enabled:false},feed(0,[p]));assert.equal(Object.keys(disabled.records).length,0);
let own=E.apply(null,{...cfg,ownIds:[p.id]},feed(0,[p]));assert.equal(Object.keys(own.records).length,0);
let dup=E.apply(null,cfg,feed(0,[p,{...p,id:'591:2'}]),at(0));for(let i=1;i<4;i++)dup=E.apply(dup,cfg,feed(i,[{...p,id:'591:2'}]),at(i));assert.equal(dup.events.length,0);dup=E.verify(dup,cfg,[{id:p.id,status:'off'}],'scan3',at(3));assert.equal(dup.events.at(-1).kind,'其中一筆已下架');
let retry=E.apply(null,cfg,feed(0,[p]),at(0));retry=E.apply(retry,cfg,feed(1),at(1));retry=E.apply(retry,cfg,feed(2,[],'ok',{scanId:'scan1'}),at(2));assert.equal(retry.records[p.id].missingScans,1);
let old=E.apply(null,cfg,feed(0,[p]),at(0));for(let i=1;i<5;i++)old=E.apply(old,cfg,feed(i,[],'ok',{scanId:undefined}),at(i));assert.equal(old.events.length,0);
console.log('PASS lifecycle: 3 complete unique scans, partial/incremental/legacy exclusion, cached/stale/retry feeds, off confirmation, reappearance, conditions, duplicate ads, own exclusion and disabled source');

const excludedConfig={...cfg,excludedGroups:[E.exclusion([p,{...p,id:'sinyi:1',source:'sinyi'}])]};assert(E.excluded(excludedConfig,p));assert(E.excluded(excludedConfig,{...p,price:900}));assert(E.excluded(excludedConfig,{...p,id:'591:new'}));assert(!E.excluded(excludedConfig,{...p,id:'591:other',floor:6}));assert(!E.excluded(excludedConfig,{...p,id:'moi:1',kind:'transaction'}));let excludedState=E.apply(null,excludedConfig,feed(0,[p,{...p,id:'591:new'}]),at(0));assert.equal(Object.keys(excludedState.records).length,0);excludedState=E.apply(E.apply(null,cfg,feed(0,[p]),at(0)),excludedConfig,feed(1),at(1));assert.equal(excludedState.records[p.id].missingScans,0);assert.equal(E.exclusionGroup(cfg,{a:p,b:{...p,id:'sinyi:1'},c:{...p,id:'other',floor:8}},p.id).length,2);console.log('PASS group exclusion: current IDs, future duplicate IDs, price changes, different floors, transaction isolation, no missing alerts');

let live=E.apply(null,cfg,feed(0,[p]),at(0));for(let i=1;i<=3;i++)live=E.apply(live,cfg,feed(i),at(i));live=E.verify(live,cfg,[{id:p.id,status:'active'}],'scan3',at(3));assert.equal(live.records[p.id].availability,'active');assert.equal(live.records[p.id].missingScans,0);assert.equal(live.events.length,0);assert(!E.changeRelevant({kind:'已下架'}));assert(!E.changeRelevant({kind:'其中一筆已下架'}));assert(E.changeRelevant({kind:'Down'}));
let direct=E.apply(null,cfg,feed(0,[p]),at(0));direct=E.apply(direct,cfg,feed(1,[{...p,availability:'unavailable'}]),at(1));assert.equal(direct.events.length,1);assert.equal(direct.events[0].kind,'已下架');direct=E.apply(direct,cfg,feed(2,[{...p,availability:'unavailable'}]),at(2));assert.equal(direct.events.length,1);let client={id:'c'};assert(E.reminder(client,'x','測試',direct,()=>true,new Date(at(2))));assert(client.schedules[0].memo.includes('新確認下架1筆'));assert(!E.reminder(client,'x','測試',direct,()=>true,new Date(at(2))));console.log('PASS confirmed off notification once, active clears unknown, off excluded from unread');
