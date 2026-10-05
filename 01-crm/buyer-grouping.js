(function(root){
'use strict';
const norm=v=>String(v||'').normalize('NFKC').replaceAll('臺','台').replace(/[\s,，]/g,'').replace(/[‐‑–—−]/g,'-');
const num=v=>v==null||String(v).trim()===''?null:Number.isFinite(Number(String(v).replaceAll(',','')))?Number(String(v).replaceAll(',','')):null;
function section(v){if(!v)return '';if(/^\d+$/.test(v))return String(Number(v));const digits='零一二三四五六七八九';if(v.includes('十')){const [a,b]=v.split('十');return String((a?digits.indexOf(a):1)*10+(b?digits.indexOf(b):0));}return digits.includes(v)?String(digits.indexOf(v)):v;}
const floorEngine=root.BuyerMatchEngine||(typeof require==='function'?require('./buyer-match-engine.js'):null);
function facts(p){
 const address=norm(p.address),city=norm(p.city)||address.match(/^(.*?[市縣])/)?.[1],district=norm(p.district)||address.match(/^[^市縣]+[市縣]([^市縣]+?[區鄉鎮市])/)?.[1];
 const local=address.replace(city||'','').replace(district||'',''),road=local.match(/^(.+?(?:路|街|大道))/)?.[1]||'',tail=road?local.slice(road.length):local;
 return {city,district,road,section:section(tail.match(/^([一二三四五六七八九十\d]+)段/)?.[1]),lane:tail.match(/(\d+)巷/)?.[1]||'',alley:tail.match(/(\d+)弄/)?.[1]||'',number:(tail.match(/(\d+(?:(?:之|-)\d+)*)號(?:之(\d+))?/)?.slice(1).filter(Boolean).join('-')||'').replaceAll('之','-'),community:norm(p.community),area:num(p.area),floor:floorEngine.floorRange(p)?JSON.stringify(floorEngine.floorRange(p)):null,age:num(p.age),price:num(p.price),rooms:num(p.rooms)};
}
function same(a,b){
 const x=facts(a),y=facts(b);if(!x.city||!x.district||x.city!==y.city||x.district!==y.district)return false;
 if(x.road&&y.road&&x.road!==y.road)return false;
 if(!((x.road&&x.road===y.road)||(x.community&&x.community===y.community)))return false;
 if(['section','lane','alley','number'].some(k=>x[k]&&y[k]&&x[k]!==y[k]))return false;
 if(x.floor!==null&&y.floor!==null&&x.floor!==y.floor)return false;
 if(!(['area','price'].every(k=>x[k]!==null&&y[k]!==null)&&x.area>0&&y.area>0&&x.price>0&&x.price===y.price&&Math.abs(x.area-y.area)<=0.30000001))return false;
 if(x.age!==null&&y.age!==null)return Math.abs(x.age-y.age)<=1;
 // Missing age needs a known, matching floor and no known room conflict.
 return x.floor!==null&&y.floor!==null&&x.floor===y.floor&&!(x.rooms!==null&&y.rooms!==null&&x.rooms!==y.rooms);
}
function warnings(rows){const list=rows.map(r=>facts(r.p)),notes=[];if(list.some(x=>x.age===null))notes.push('屋齡待確認');if(list.some(x=>x.floor===null))notes.push('樓層待確認');if(new Set(list.filter(x=>x.rooms!==null).map(x=>x.rooms)).size>1)notes.push('房數不一致');if(['road','section','lane','alley','number'].some(k=>list.some(x=>x[k])&&list.some(x=>!x[k])))notes.push('地址待確認');return notes;}
// Complete-link comparison prevents chained near-matches from merging distant endpoints.
function group(rows,separate=[]){const isolated=new Set(separate);const groups=[],buckets=new Map();for(const row of rows){if(isolated.has(row.p.id)){groups.push([row]);continue;}const f=facts(row.p),key=[f.city,f.district,f.price].join('|'),candidates=buckets.get(key)||[];const g=candidates.find(g=>g.every(other=>same(row.p,other.p)));if(g)g.push(row);else{const fresh=[row];groups.push(fresh);candidates.push(fresh);buckets.set(key,candidates);}}return groups;}
function sortValue(p,field){const area=num(p.area),price=num(p.price);if(field==='unit')return area>0&&price>0?price/area:null;const value=num(p[field]);return value!==null&&(field==='age'?value>=0:value>0)?value:null;}
function sortGroups(groups,order,ack){const [field,direction]=String(order).split(':'),numeric=['area','price','unit','age'].includes(field)&&['asc','desc'].includes(direction);return groups.map((g,i)=>({g,i,v:numeric?sortValue(g[0].p,field):null,fresh:ack!==undefined&&g.some(({p})=>Date.parse(p.firstMatchedAt)>ack||(Date.parse(p.priceDroppedAt)>ack&&p.priceBeforeDrop>p.price))})).sort((a,b)=>Number(b.fresh)-Number(a.fresh)||(numeric?(a.v===null?(b.v===null?a.i-b.i:1):b.v===null?-1:(a.v-b.v)*(direction==='asc'?1:-1)||a.i-b.i):a.i-b.i)).map(x=>x.g);}
const api={same,group,warnings,sortValue,sortGroups};if(typeof module!=='undefined')module.exports=api;root.BuyerGrouping=api;
})(typeof window==='undefined'?globalThis:window);
