const assert=require('node:assert/strict'),E=require('../inventory-market-engine');
const c={enabled:true,mode:'building',address:'桃園市蘆竹區濱海路一段10號',community:'鴻輝AI首席',criteria:{floorMin:7,floorMax:9}},p={id:'591:a',source:'591',address:'桃園市蘆竹區濱海路一段',title:'廠辦',floor:8,price:3980,area:146.33};
assert(E.candidate(c,p));assert(!E.matches(c,p));for(const change of [{kind:'transaction'},{address:'桃園市大園區濱海路一段'},{address:'桃園市蘆竹區濱海路二段'},{floor:3},{community:'其他大樓'}])assert(!E.candidate(c,{...p,...change}));assert(!E.candidate({...c,mode:'road'},p));
let s=E.apply(null,c,{generatedAt:'2026-10-05T00:00:00Z',sources:[{id:'591',status:'ok'}],listings:[p]});assert(s.candidates[p.id]);assert.equal(Object.keys(s.records).length,0);assert.equal(s.events.length,0);assert(!E.apply(null,c,{sources:[{id:'591',status:'error'}],listings:[p]}).candidates[p.id]);
const yes={...c,buildingDecisions:{[p.id]:{same:true}}},no={...c,buildingDecisions:{[p.id]:{same:false}}};assert(E.matches(yes,p));assert(!E.matches(yes,{...p,id:'591:b'}));assert(!E.candidate(no,p));assert(!E.matches(no,p));assert(!E.matches(yes,{...p,kind:'transaction'}));s=E.apply(s,yes,{sources:[{id:'591',status:'ok'}],listings:[p],generatedAt:'2026-10-05T01:00:00Z'});assert(s.records[p.id]);assert(!s.candidates[p.id]);
console.log('PASS candidate geography, criteria, source health, transaction isolation and per-listing decisions');

assert(E.matches({...c,mode:'project',address:'桃園市蘆竹區濱海路一段',addresses:'桃園市蘆竹區濱海路一段12號'},{...p,id:'591:new',address:'桃園市蘆竹區濱海路一段12號'}));
