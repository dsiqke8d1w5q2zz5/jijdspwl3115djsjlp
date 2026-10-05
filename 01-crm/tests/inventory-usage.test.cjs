const assert=require('node:assert/strict'),E=require('../inventory-market-engine');
const condo={mode:'building',address:'新北市土城區莊園街162號9樓',community:'金城舞5世界花園',criteria:{priceMax:2000,buildingType:'電梯大樓'}};
const yc={id:'yungching:1179991',source:'yungching',address:'新北市土城區莊園街',community:'金城舞5-世界花園',title:'金舞人生毛胚屋',price:1888,area:31.3,floor:8,totalFloors:24,type:'住宅大樓'};
assert(E.matches(condo,yc));assert(E.assess(condo,yc).match);
const shop={mode:'road',searchPurpose:'店面',criteria:{floorMin:1,floorMax:1,floorMatch:'overlap',priceMax:4000}};
assert(E.assess(shop,{title:'金店面',type:'電梯大樓',floorText:'B1–1樓',price:3000}).match);
assert(!E.assess(shop,{title:'金店面',floor:4,price:3000}).match);
assert(!E.assess({...shop,criteria:{}},{title:'辦公室',type:'辦公',floor:6}).match);
assert(!E.assess({...shop,criteria:{}},{title:'住宅',type:'住宅大樓',floor:5}).match);
assert(E.assess({...shop,criteria:{}},{title:'待核對物件',type:'公寓',floor:1}).missing.includes('店面用途'));
console.log('PASS condominium type alias and shop evidence, unknown usage, floor range');

assert(!E.matches(condo,{...yc,community:'世界花園'}));assert(E.candidate(condo,{...yc,community:'世界花園'}));assert(!E.candidate(condo,{...yc,community:'其他社區'}));

const home={mode:'building',address:'新北市新莊區福壽街100號',community:'家泰家悅/家泰家悦',searchPurpose:'店面'};const sparse={id:'yungching:6601827',source:'yungching',address:'新北市新莊區',title:'家泰家悅邊間店面',price:5286,floor:1,area:48.06,type:'店面'};assert(!E.matches(home,sparse));assert(E.candidate(home,sparse));assert(!E.candidate(home,{...sparse,address:'新北市板橋區'}));assert(!E.candidate(home,{...sparse,title:'其他社區店面'}));assert(!E.candidate(home,{...sparse,address:'新北市新莊區中正路'}));assert(!E.candidate(home,{...sparse,kind:'transaction'}));

const approved={...home,buildingDecisions:{[sparse.id]:{same:true}}};assert(E.matches(approved,sparse));assert(!E.matches(approved,{...sparse,address:'台中市西屯區福壽街100號'}));assert(!E.matches(approved,{...sparse,address:'新北市板橋區福壽街100號'}));assert(!E.matches(approved,{...sparse,address:'',city:'新北市',district:''}));
