const assert=require('node:assert/strict'),E=require('../inventory-market-engine');
const c={mode:'road',criteria:E.criteria({floorMin:1,floorMax:1,floorMatch:'overlap',priceMax:4000})};
for(const floorText of ['1樓','B1–1樓','1–2樓'])assert(E.assess(c,{floorText,price:3000,buildingType:'大樓'}).match);
for(const floorText of ['B2–B1樓','2–3樓'])assert(!E.assess(c,{floorText,price:3000}).match);
assert(!E.assess(c,{floorText:'1樓',price:5000}).match);
assert(E.assess(c,{price:3000}).missing.includes('樓層'));
assert(!E.assess({...c,criteria:{...c.criteria,floorMatch:undefined}},{floorText:'B1–1樓',price:3000}).match);
assert(E.assess(c,{kind:'transaction',floorText:'20樓',price:9000}).match);
console.log('PASS floor overlap, strict mode, price preservation, missing floor and transactions');
