const assert=require('assert/strict'),B=require('../buyer-match-engine.js');
const old={id:'591:1',usage:'住家用',usageEvidence:'591法定用途',rooms:2,elevator:true,parking:false,type:'電梯大樓',price:2000,availability:'available',detailCheckedAt:'2026-10-05T10:00:00Z'};
const empty={id:old.id,usage:' ',rooms:null,elevator:null,parking:null,type:'',sourceCategory:'住宅',price:1900,availability:'unavailable',seenAt:'2026-10-06T10:00:00Z'};
const next=B.mergeListingFields(old,empty);assert.equal(next.usage,'住家用');assert.equal(next.rooms,2);assert.equal(next.elevator,true);assert.equal(next.parking,false);assert.equal(next.price,1900);assert.equal(next.availability,'unavailable');assert.equal(next.fieldCheckedAt.usage,old.detailCheckedAt,'blank observations must not refresh evidence');
const corrected=B.mergeListingFields(old,{id:old.id,usage:'一般事務所',rooms:0,elevator:false,detailCheckedAt:'2026-10-06T10:00:00Z'});assert.equal(corrected.usage,'一般事務所');assert.equal(corrected.rooms,0);assert.equal(corrected.elevator,false);assert.equal(corrected.usageEvidence,'');
const stale=B.mergeListingFields(old,{id:old.id,usage:'工業用',detailCheckedAt:'2026-10-04T10:00:00Z'});assert.equal(stale.usage,'住家用');
for(const source of ['591','sinyi','yungching']){const row={...next,source,availability:'available'};assert.equal(B.evaluate({matchCriteria:{searchPurpose:'住宅',rooms:['2']}},row).status,'matched');assert.equal(B.evaluate({matchCriteria:{searchPurpose:'住宅',rooms:['4']}},row).status,'excluded');assert.equal(B.evaluate({matchCriteria:{searchPurpose:'住宅'}},{...row,usage:'工業用',sourceCategory:'住宅'}).status,'excluded');assert(B.evaluate({matchCriteria:{searchPurpose:'住宅'}},{source,sourceCategory:'住宅',type:'電梯大樓'}).pending.includes('用途'));}
console.log('PASS sparse updates preserve evidence, zero/false and explicit corrections win, prices/off remain fresh, all three sources and per-buyer demand isolation');

const apartment=B.mergeListingFields({...old,buildingType:'電梯大樓'},{type:'公寓',detailCheckedAt:'2026-10-06T10:00:00Z'});
assert.equal(apartment.buildingType,'公寓');assert.equal(apartment.elevator,null);
assert.equal(B.evaluate({matchCriteria:{types:['公寓'],elevator:'no'}},apartment).status,'matched');
const outdated=B.mergeListingFields(apartment,{buildingType:'電梯大樓',detailCheckedAt:'2026-10-04T10:00:00Z'});assert.equal(outdated.buildingType,'公寓');
const conflict=B.mergeListingFields(old,{type:'公寓',buildingType:'電梯大樓',detailCheckedAt:'2026-10-07T10:00:00Z'});assert(B.evaluate({matchCriteria:{types:['公寓'],elevator:'no'}},conflict).pending.includes('房屋類型衝突'));

// Detailed age text supersedes the stale numeric list value; stale responses do not roll it back.
const aged=B.mergeListingFields({age:9,ageText:'9年',seenAt:'2026-10-05T10:00:00Z'},{ageText:'5年',detailCheckedAt:'2026-10-06T10:00:00Z'});assert.equal(aged.age,5);assert.equal(B.mergeListingFields(aged,{age:9,ageText:'9年',seenAt:'2026-10-05T10:00:00Z'}).age,5);
const noParking=B.mergeListingFields({parking:true,parkingType:'坡道平面',seenAt:'2026-10-05T10:00:00Z'},{parking:false,detailCheckedAt:'2026-10-06T10:00:00Z'});assert.equal(noParking.parkingType,null);const unknownParking=B.mergeListingFields(noParking,{parking:true,seenAt:'2026-10-07T10:00:00Z'});assert.equal(B.evaluate({matchCriteria:{parking:'flat'}},unknownParking).status,'pending');

const sinyiNo=B.mergeListingFields({source:'sinyi',parking:true,parkingType:'坡道平面',sinyiDetails:{parking:'坡道平面',isParking:true},seenAt:'2026-10-05T10:00:00Z'},{source:'sinyi',parking:false,seenAt:'2026-10-06T10:00:00Z'});const sinyiUnknown=B.mergeListingFields(sinyiNo,{source:'sinyi',parking:true,seenAt:'2026-10-07T10:00:00Z'});assert.equal(B.evaluate({matchCriteria:{parking:'flat'}},sinyiUnknown).status,'pending','older raw Sinyi parking must not revive cleared flat evidence');

const mutated={parking:true,parkingType:'坡道平面',seenAt:'2026-10-05T10:00:00Z'};Object.assign(mutated,B.mergeListingFields(mutated,{parking:false,seenAt:'2026-10-06T10:00:00Z'}));Object.assign(mutated,B.mergeListingFields(mutated,{parking:true,seenAt:'2026-10-07T10:00:00Z'}));assert.equal(B.evaluate({matchCriteria:{parking:'flat'}},mutated).status,'pending','in-place saved objects must clear invalidated parking type');
