const assert=require('node:assert/strict'),E=require('../inventory-market-engine'),B=require('../buyer-match-engine');
for(const city of ['臺北市','台北市'])assert.equal(B.evaluate({areaCities:['台北市']},{city}).no.length,0);
const config={enabled:true,notifyDown:true,mode:'road',address:'台北市內湖區民權東路六段136巷26號',searchPurpose:'店面',criteria:{priceMax:4000}},p={id:'591:20910798',source:'591',address:'台北市內湖區民權東路六段191巷',type:'別墅',title:'墅琴',price:13800,missingScans:1,availability:'active'};
const state={records:{[p.id]:p},events:[],baselines:{591:'2026-10-04'},scans:{591:{id:'old',at:'2026-10-04'}}};
const next=E.apply(state,config,{scanId:'new',generatedAt:'2026-10-05',sources:[{id:'591',status:'ok'}],listings:[]});assert.equal(next.records[p.id].missingScans,1);assert.equal(next.events.length,0);
for(const cfg of [config,{...config,enabled:false},{...config,notifyDown:false},{...config,address:'新北市板橋區文化路一段1號'}]){const result=E.verify(state,cfg,[{id:p.id,status:'off'}],'old');assert.equal(result.records[p.id].availability,'active');assert.equal(result.records[p.id].verifiedScan,undefined);}
const eligible={...p,title:'一樓店面',type:'店面',price:3000};const eligibleState={...state,records:{[p.id]:eligible}};assert.equal(E.verify(eligibleState,config,[{id:p.id,status:'off'}],'old').records[p.id].availability,'off');
console.log('PASS city spelling, out-of-criteria missing scans, late verification after disabling/changing conditions, eligible verification');

assert(!E.eventRelevant({...config,enabled:false},{kind:'New'},eligible));assert(!E.eventRelevant({...config,notifyDown:false},{kind:'已下架'},eligible));assert(E.eventRelevant({...config,notifyDown:false},{kind:'Down'},eligible));assert(!E.eventRelevant({...config,transactionsEnabled:false},{kind:'成交'},{...eligible,kind:'transaction'}));assert(!E.eventRelevant(config,{kind:'New'},p));console.log('PASS reminders respect current enabled state, conditions and individual down/transaction switches');
