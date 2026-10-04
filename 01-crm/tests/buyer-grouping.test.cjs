const assert=require('node:assert/strict'),{same,group}=require('../buyer-grouping');
const p={id:'591:1',city:'新北市',district:'板橋區',address:'新北市板橋區民權路202巷',area:23.23,floor:1,age:52,price:1988};
assert(same(p,{...p,area:23.22,age:52.3}));
for(const delta of [{area:23.34},{floor:2},{floor:null},{age:null},{age:53.1},{price:1989},{address:'新北市板橋區文化路202巷'},{district:'中和區'},{area:null,mainArea:23.23}])assert(!same(p,{...p,...delta}),JSON.stringify(delta));
assert(!same({...p,address:p.address+'1號'},{...p,address:p.address+'2號'}));
assert(same({...p,community:'同一社區'},{...p,address:'新北市板橋區文化路',community:'同一社區'}));
assert.equal(group([0,.09,.18].map((d,i)=>({p:{...p,id:String(i),area:23+d}}))).length,2,'no transitive chain');
assert.equal(group([p,{...p,id:'sinyi:2'}, {...p,id:'591:3',floor:null}].map(p=>({p}))).length,2);
console.log('PASS tolerance boundaries, missing data, location and house number conflicts, cross-source grouping, complete-link clusters');
