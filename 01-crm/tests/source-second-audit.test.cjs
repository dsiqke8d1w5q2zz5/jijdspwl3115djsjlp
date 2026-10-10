const fs = require('fs'), vm = require('vm'), assert = require('assert/strict');
const B = require('../buyer-match-engine.js'), I = require('../inventory-market-engine.js');
const c = vm.createContext({});
for (const f of ['read.js', 'read591.js']) vm.runInContext(fs.readFileSync('01-crm/tools/buyer-browser/' + f, 'utf8'), c);
const expected = {
  '7527923': {mainArea:23.93, area:48.65, landArea:6.97, totalFloors:23, rooms:undefined, bathrooms:1, usage:'店舖', parking:true},
  '7150845': {mainArea:20.47, area:24.5, landArea:7, totalFloors:4, rooms:3, halls:2, bathrooms:1, usage:'住家用', parking:undefined},
  '2351HN': {mainArea:20.46, area:20.46, landArea:6.66, totalFloors:4, rooms:1, halls:2, bathrooms:1, usage:'住家用', parking:false},
  '2897UF': {mainArea:18.66, area:23.87, landArea:6.1, totalFloors:5, rooms:3, halls:2, bathrooms:1, usage:'住家用', parking:false},
  '20951539': {mainArea:21.36, area:48.78, totalFloors:18, rooms:3, halls:2, bathrooms:2, usage:'集合住宅', parking:true},
  '20890488': {mainArea:37.69, area:91.03, totalFloors:22, rooms:4, halls:2, bathrooms:3, usage:'集合住宅', parking:true},
};
for (const x of require('./source-audit-second-samples.json')) {
  let p;
  if (x.source === '591') p = c.crmRead591API(x, x.id);
  else if (x.source === 'sinyi') p = c.crmReadSinyiDetail({querySelector:()=>({textContent:JSON.stringify({props:{initialReduxState:{buyReducer:{detailData:{houseNo:x.id,detail:x.detail},contentData:x.content}}}})})},x.id);
  else p = c.crmReadYCDetail({
    querySelectorAll:()=>x.fields.map(f=>({querySelector:q=>({textContent:q==='.item-title'?f.label:q==='.item-detail > div'?f.value.match(/坡道平面|塔式|機械/)?.[0]||'':f.value})})),
    querySelector:q=>({textContent:q==='.case-type'?x.buildingType:q==='.info-wrapper-2 .age'?x.ageText:q==='.info-wrapper-2 .floor'?x.floorText:''}),
  });
  p = {source:x.source, ...p};
  for (const [key,value] of Object.entries(expected[x.id])) assert.equal(p[key],value,x.id+' '+key);
  const parking = B.evaluate({matchCriteria:{parking:'yes'}},p).status;
  assert.equal(parking,p.parking===true?'matched':p.parking===false?'excluded':'pending');
  assert.equal(B.evaluate({matchCriteria:{searchPurpose:'住宅'}},p).status,x.id==='7527923'?'excluded':'matched');
  assert.equal(I.assess({searchPurpose:'住宅'},p).match,x.id!=='7527923');
  if (x.source==='sinyi') assert.equal(B.evaluate({matchCriteria:{types:['公寓'],elevator:'no'}},p).status,'matched');
  if (x.id==='20951539') assert.equal(B.evaluate({matchCriteria:{exclude:['top']}},p).status,'excluded');
  if (x.id==='7150845') assert.equal(B.evaluate({matchCriteria:{exclude:['fourth']}},p).status,'excluded');
}
const hallOnly=c.crmRead591API({ware:{id:'x'},info:{a:[{name:'格局',value:'2廳1衛'}]}},'x');
assert.equal(hallOnly.rooms,undefined,'do not mistake hall count for bedrooms');
console.log('PASS six additional live fixtures: shop, apartments, unknown/no parking, top/fourth-floor exclusions and missing rooms');
