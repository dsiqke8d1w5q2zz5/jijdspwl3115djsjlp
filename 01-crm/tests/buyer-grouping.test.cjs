const assert=require('node:assert/strict'),{same,group}=require('../buyer-grouping');
const p={id:'591:1',city:'新北市',district:'板橋區',address:'新北市板橋區民權路202巷',area:23.23,floor:1,age:52,price:1988};
assert(same(p,{...p,area:23.22,age:52.3}));
for(const delta of [{area:23.54},{floor:2},{age:null},{age:53.1},{price:1989},{address:'新北市板橋區文化路202巷'},{district:'中和區'},{area:null,mainArea:23.23}])assert(!same(p,{...p,...delta}),JSON.stringify(delta));
assert(!same({...p,address:p.address+'1號'},{...p,address:p.address+'2號'}));
assert(!same({...p,community:'同一社區'},{...p,address:'新北市板橋區文化路',community:'同一社區'}));
assert.equal(group([0,.2,.4].map((d,i)=>({p:{...p,id:String(i),area:23+d}}))).length,2,'no transitive chain');
assert.equal(group([p,{...p,id:'sinyi:2'}, {...p,id:'591:3',floor:null}].map(p=>({p}))).length,1);
console.log('PASS tolerance boundaries, missing data, location and house number conflicts, cross-source grouping, complete-link clusters');
const {sortGroups,sortValue}=require('../buyer-grouping');
const items=[{price:2000,area:20,age:30},{price:1500,area:30,age:0},{price:1000,area:10,age:10},{price:null,area:null,age:null}].map((p,i)=>[{p:{...p,id:String(i)}}]);
for(const [order,expected] of Object.entries({'price:asc':'2103','price:desc':'0123','area:asc':'2013','area:desc':'1023','unit:asc':'1023','unit:desc':'0213','age:asc':'1203','age:desc':'0213'}))assert.equal(sortGroups(items,order).map(g=>g[0].p.id).join(''),expected,order);
assert.equal(sortValue({price:1988,area:23.23},'unit'),1988/23.23);assert.equal(sortValue({price:2000,area:0},'unit'),null);assert.equal(sortValue({price:'',area:20},'unit'),null);assert.deepEqual(sortGroups(items,'recommended'),items);assert.equal(items[0][0].p.id,'0');console.log('PASS numeric sort, stable ties, missing values last both directions, zero area, new construction and recommended order');

const {warnings}=require('../buyer-grouping');
assert(same(p,{...p,address:'新北市板橋區民權路',floor:null,area:23.53,age:53}));
for(const address of ['民權路260巷','民權路202巷2弄']){const base={...p,address:'新北市板橋區民權路202巷1弄'};assert(!same(base,{...base,address:'新北市板橋區'+address}));}
assert(!same({...p,address:'民權路一段'},{...p,address:'民權路二段'}));
const examples=[{...p,address:'新北市板橋區民權路260巷',price:2188,area:38.85,age:36,rooms:7},{...p,address:'新北市板橋區民權路260巷',price:2188,area:38.87,age:36,floor:null,rooms:7},{...p,address:'新北市板橋區民權路',price:2188,area:38.86,age:36.5,floor:null,rooms:5}].map(p=>({p}));
assert.equal(group(examples).length,1);assert.deepEqual(warnings(examples),['樓層待確認','房數不一致','地址待確認']);assert.equal(group([...examples,{p:{...examples[0].p,price:2189}}]).length,2);
assert.equal(group([{p:{...p,floor:null}},{p},{p:{...p,floor:2}}]).length,2,'unknown floor must not bridge conflicting floors');
console.log('PASS screenshot examples, missing address/floor, warnings, exact prices and no conflict bridging');

const priority=[[{p:{price:1000}}],[{p:{price:3000,firstMatchedAt:'2026-10-05'}}],[{p:{price:2000}},{p:{price:2000,priceBeforeDrop:2100,priceDroppedAt:'2026-10-05'}}]];
assert.deepEqual(sortGroups(priority,'price:asc',Date.parse('2026-10-04')).map(g=>g[0].p.price),[2000,3000,1000]);assert.deepEqual(sortGroups(priority,'price:desc',Date.parse('2026-10-04')).map(g=>g[0].p.price),[3000,2000,1000]);assert.deepEqual(sortGroups(priority,'price:asc',Date.parse('2026-10-06')).map(g=>g[0].p.price),[1000,2000,3000]);console.log('PASS New/Down group priority in both directions and after acknowledgment');

{const g=require('../buyer-grouping.js'),base={city:'新北市',district:'板橋區',price:1988,area:23.23,age:52,floor:1};const pair=(a,b)=>g.same({...base,address:'新北市板橋區文化路'+a},{...base,address:'新北市板橋區文化路'+b});assert(!pair('23-1號','99-1號'));assert(!pair('23-1號','1號'));assert(pair('23-1號','23之1號'));assert(pair('23號之1','23之1號'));assert(pair('一段23號','1段23號'));assert(!pair('一段23號','二段23號'));assert(pair('十段23號','10段23號'));console.log('PASS complete hyphen/subnumber and canonical section grouping');}
