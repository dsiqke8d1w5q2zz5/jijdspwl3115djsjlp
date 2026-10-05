(function(root){
'use strict';
const norm=v=>String(v||'').normalize('NFKC').replaceAll('臺','台').replace(/[\s,，]/g,'').replace(/[‐‑–—−]/g,'-');
function cn(v){if(/^\d+$/.test(v))return String(Number(v));const ds='零一二三四五六七八九';if(v.includes('十')){const[a,b]=v.split('十');return String((a?ds.indexOf(a):1)*10+(b?ds.indexOf(b):0));}return ds.includes(v)?String(ds.indexOf(v)):v;}
function location(address){const a=norm(address).replace(/([一二三四五六七八九十\d]+)段/g,(_,n)=>cn(n)+'段'),m=a.match(/^(台北市|新北市|桃園市|台中市|台南市|高雄市|基隆市|新竹市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣|金門縣|連江縣)(.{1,4}?區|.{1,4}?[鄉鎮市])(.*)$/)||a.match(/^(新竹市|嘉義市)()(.+)$/);if(!m)return null;const road=m[3].match(/^(.+?(?:路|街|大道)(?:\d+段)?(?:\d+巷)?(?:\d+弄)?)/)?.[0]||m[3].match(/^(.+?)(?=\d+(?:(?:之|-)\d+)*號)/)?.[1]||'',house=m[3].match(/(\d+(?:(?:之|-)\d+)*)號(?:之(\d+))?/);const searchRoad=norm(address).replace(m[1]+m[2],'').match(/^(.+?(?:路|街|大道)(?:[一二三四五六七八九十\d]+段)?(?:\d+巷)?(?:\d+弄)?)/)?.[0]||road;return {city:m[1],district:m[2],road,searchRoad,building:house?m[1]+m[2]+road+house.slice(1).filter(Boolean).join('-').replaceAll('之','-')+'號':''};}
const communityName=v=>norm(v).toLowerCase().replace(/[-・·．.()（）【】]/g,'');
function aliases(config){return [...new Set([config.community,...String(config.aliases||'').split(/[\n,，、/／]/)].map(communityName).filter(Boolean))];}
function matches(config,p){const x=location(config.address),y=location(p.address)||location((p.city||'')+(p.district||''));if(!x||!y||x.city!==y.city||(y.district&&x.district!==y.district))return false;if(config.mode==='project'){if(!y.district||y.district!==x.district)return false;const names=aliases(config);if(!names.length)return false;if(x.road&&y.road&&x.road!==y.road)return false;if(p.community)return names.includes(communityName(p.community));if(p.kind==='transaction')return false;const title=communityName(p.title);return names.some(name=>{const i=title.indexOf(name);if(i<0)return false;return title[i-1]!=='新'&&!/^(?:[0-9一二三四五六七八九十]+期)/.test(title.slice(i+name.length));});}if(config.mode==='road')return !!x.road&&x.road===y.road;const buildings=[config.address,...String(config.addresses||'').split(/[\n,，、]/)].map(a=>location(a)?.building).filter(Boolean);if(y.building&&buildings.includes(y.building))return true;const roads=[config.address,...String(config.addresses||'').split(/[\n,，、]/)].map(a=>location(a)?.road).filter(Boolean);return p.kind!=='transaction'&&aliases(config).includes(communityName(p.community))&&!!y.road&&roads.includes(y.road);}
const time=v=>Date.parse(v)||0;
function apply(previous,config,feed,now=new Date().toISOString()){
 const s=structuredClone(previous||{records:{},baselines:{},events:[],ack:0});s.records||={};s.baselines||={};s.events||=[];const own=new Set(config.ownIds||[]),incoming=(feed.listings||[]).filter(p=>p.id&&!own.has(p.id)&&matches(config,p)),sources=feed.sources||[];
 for(const source of sources){if(!['ok','partial'].includes(source.status))continue;const rows=incoming.filter(p=>p.source===source.id),initialized=!!s.baselines[source.id];
  for(const raw of rows){const p={...raw,...(config.mode==='project'&&!raw.community?{matchNote:'建案名稱待確認'}:{}),seenAt:raw.seenAt||feed.generatedAt||now},old=s.records[p.id];if(old&&time(p.seenAt)<time(old.seenAt))continue;
   const duplicate=!old&&p.kind!=='transaction'&&Object.values(s.records).some(q=>q.kind!=='transaction'&&root.BuyerGrouping?.same(p,q));
   let kind='';if(initialized){if(!old&&!duplicate)kind=p.kind==='transaction'?'成交':'New';else if(old&&Number.isFinite(p.price)&&Number.isFinite(old.price)&&p.price!==old.price)kind=p.kind==='transaction'?'成交更正':p.price<old.price?'Down':'';}
   if(kind){const id=[source.id,p.id,kind,p.seenAt,p.price].join('|');if(!s.events.some(e=>e.id===id))s.events.push({id,kind,listingId:p.id,at:now,before:old?.price,price:p.price});}
   s.records[p.id]=p;
  }
  if(source.status==='ok')s.baselines[source.id]=s.baselines[source.id]||now;
 }
 s.sourceStatus||={};for(const source of sources){const old=s.sourceStatus[source.id];if(!old||time(feed.generatedAt)>=time(old.at))s.sourceStatus[source.id]={...source,at:feed.generatedAt};}s.lastSources=sources;s.checkedAt=now;s.events=s.events.slice(-1000);return s;
}
function day(at){const d=new Date(at);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function reminder(c,id,label,state,save,now=new Date()){
 const date=day(now),events=state.events.filter(e=>day(e.at)===date);if(!events.length||c.archived||c._deleted)return false;const key='inventory-watch:'+id+':'+date,old=c.schedules,items=structuredClone(old||[]),existing=items.find(x=>x.id===key),known=existing?.marketEvents||{};if(events.every(e=>known[e.id]))return false;const all={...known,...Object.fromEntries(events.map(e=>[e.id,e.kind]))},counts={};Object.values(all).forEach(k=>counts[k]=(counts[k]||0)+1);const memo='庫存行情｜'+label+'：'+Object.entries(counts).map(([k,n])=>({'New':'新發現刊登','Down':'降價','成交':'新公布成交','成交更正':'成交更正'}[k])+n+'筆').join('、');const entry={...existing,id:key,date:existing?.date||date,time:existing?.time||'',memo,marketEvents:all,_deleted:false,updatedAt:now.toISOString()};if(existing)Object.assign(existing,entry);else items.push(entry);c.schedules=items;if(!save()){c.schedules=old;return false;}return true;
}
const api={norm,communityName,aliases,location,matches,apply,reminder};root.InventoryMarketEngine=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
