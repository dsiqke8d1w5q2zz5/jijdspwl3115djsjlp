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
