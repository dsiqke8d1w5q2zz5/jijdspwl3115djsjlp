(function(root){
'use strict';
const norm=v=>String(v||'').normalize('NFKC').replaceAll('臺','台').replace(/[\s,，]/g,'').replace(/[‐‑–—−]/g,'-');
function cn(v){if(/^\d+$/.test(v))return String(Number(v));const ds='零一二三四五六七八九';if(v.includes('十')){const[a,b]=v.split('十');return String((a?ds.indexOf(a):1)*10+(b?ds.indexOf(b):0));}return ds.includes(v)?String(ds.indexOf(v)):v;}
function location(address){const a=norm(address).replace(/([一二三四五六七八九十\d]+)段/g,(_,n)=>cn(n)+'段'),m=a.match(/^(台北市|新北市|桃園市|台中市|台南市|高雄市|基隆市|新竹市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣|金門縣|連江縣)(.{1,4}?區|.{1,4}?[鄉鎮市])(.*)$/)||a.match(/^(新竹市|嘉義市)()(.+)$/);if(!m)return null;const road=m[3].match(/^(.+?(?:路|街|大道)(?:\d+段)?(?:\d+巷)?(?:\d+弄)?)/)?.[0]||m[3].match(/^(.+?)(?=\d+(?:(?:之|-)\d+)*號)/)?.[1]||'',house=m[3].match(/(\d+(?:(?:之|-)\d+)*)號(?:之(\d+))?/);const searchRoad=norm(address).replace(m[1]+m[2],'').match(/^(.+?(?:路|街|大道)(?:[一二三四五六七八九十\d]+段)?(?:\d+巷)?(?:\d+弄)?)/)?.[0]||road;return {city:m[1],district:m[2],road,searchRoad,street:road.replace(/\d+巷.*$|\d+弄.*$/,''),searchStreet:searchRoad.replace(/\d+巷.*$|\d+弄.*$/,''),building:house?m[1]+m[2]+road+house.slice(1).filter(Boolean).join('-').replaceAll('之','-')+'號':''};}
const communityName=v=>norm(v).toLowerCase().replace(/[-・·．.()（）【】]/g,'');
function aliases(config){return [...new Set([config.community,config.aliases].flatMap(v=>String(v||'').split(/[\n,，、/／]/)).map(communityName).filter(Boolean))];}
function titleMatches(names,value){const title=communityName(value);return names.some(name=>{const i=title.indexOf(name);if(i<0)return false;return title[i-1]!=='新'&&!/^(?:[0-9一二三四五六七八九十]+期)/.test(title.slice(i+name.length));});}
// Listing sites often publish only the street. Missing lane/alley is not a conflict.
function compatibleRoad(a,b){if(!a?.street||a.street!==b?.street)return false;for(const part of [/\d+巷/,/\d+弄/]){const left=a.road.match(part)?.[0],right=b.road.match(part)?.[0];if(left&&right&&left!==right)return false;}return true;}
function matches(config,p){const x=location(config.address),y=location(p.address)||location((p.city||'')+(p.district||''));if(!x||!y||x.city!==y.city||!y.district||x.district!==y.district)return false;if(p.kind!=='transaction'&&config.buildingDecisions?.[p.id])return config.buildingDecisions[p.id].same===true;if(p.kind!=='transaction'&&y.building&&String(config.addresses||'').split(/[\n,，、]/).some(a=>location(a)?.building===y.building))return true;if(config.mode==='project'){if(!y.district||y.district!==x.district)return false;const names=aliases(config);if(!names.length)return false;if(x.road&&y.road&&!compatibleRoad(x,y))return false;if(p.community)return names.includes(communityName(p.community));if(p.kind==='transaction')return false;return titleMatches(names,p.title);}if(config.mode==='road')return !!x.street&&x.street===y.street;const buildings=[config.address,...String(config.addresses||'').split(/[\n,，、]/)].map(a=>location(a)?.building).filter(Boolean);if(y.building&&buildings.includes(y.building))return true;const roads=[config.address,...String(config.addresses||'').split(/[\n,，、]/)].map(a=>location(a)).filter(Boolean);return p.kind!=='transaction'&&(p.community?aliases(config).includes(communityName(p.community)):titleMatches(aliases(config),p.title))&&roads.some(road=>compatibleRoad(road,y));}

function candidate(config,p){if(!p?.id||p.kind==='transaction'||config.mode==='road'||config.buildingDecisions?.[p.id]||excluded(config,p)||matches(config,p)||!assess(config,p).match)return false;const x=location(config.address),y=location(p.address);if(!x||!y||x.city!==y.city||x.district!==y.district)return false;if(!y.road)return p.community?aliases(config).includes(communityName(p.community)):titleMatches(aliases(config),p.title);if(!compatibleRoad(x,y))return false;if(p.community&&aliases(config).length&&!aliases(config).includes(communityName(p.community))){const name=communityName(p.community);if(name.length<4||!aliases(config).some(a=>a.length>=4&&(a.includes(name)||name.includes(a))))return false;}return true;}
const buildingTypes=['公寓','華廈','電梯大樓','透天'];
const matchEngine=root.BuyerMatchEngine||(typeof require==='function'?require('./buyer-match-engine.js'):null);
const conditionFields=[['price','總價',false],['area','建坪',false],['rooms','房數',true],['floor','樓層',true],['age','屋齡',false]];
function criteria(value={}){const out={};if(value.floorMatch==='overlap')out.floorMatch='overlap';if(value.buildingType){if(!buildingTypes.includes(value.buildingType))throw Error('請選擇有效房型');out.buildingType=value.buildingType;}for(const [field,label,integer] of conditionFields){for(const side of ['Min','Max']){const raw=value[field+side];if(raw==null||String(raw).trim()==='')continue;const n=Number(raw);if(!Number.isFinite(n)||(n<0&&field!=='floor')||(integer&&!Number.isInteger(n)))throw Error(label+'請填'+(integer?'非負整數':'非負數字'));out[field+side]=n;}if(out[field+'Min']!=null&&out[field+'Max']!=null&&out[field+'Min']>out[field+'Max'])throw Error(label+'下限不可大於上限');}return out;}
function purposeKey(config){return JSON.stringify([config.address,config.mode,config.searchPurpose||config.inventoryPurpose||""]);}
function manualPurpose(config,p){return config.purposeConfirmations?.[p.id]?.key===purposeKey(config);}
function assess(config,p){if(p.kind==='transaction'||((config.searchPurpose||config.inventoryPurpose)==='住商混合'&&['building','project'].includes(config.mode)))return {match:true,missing:[]};const limits=config.criteria||{},missing=[];let match=true;const purpose=config.searchPurpose||config.inventoryPurpose;if(['住宅','店面','辦公','廠房','倉庫','住商混合'].includes(purpose)){const verdict=matchEngine.evaluate({matchCriteria:{searchPurpose:purpose}},p);if(verdict.no.includes('用途'))match=false;if(verdict.pending.includes('用途'))missing.push(purpose==='店面'?'店面用途':'用途');}if(limits.buildingType){const result=matchEngine.evaluate({matchCriteria:{types:[limits.buildingType]}},p);if(result.no.length)match=false;if(result.pending.length)missing.push('房型');}for(const [field,label]of conditionFields){const lo=limits[field+'Min'],hi=limits[field+'Max'];if(lo==null&&hi==null)continue;if(field==='floor'){const r=matchEngine.floorRange(p);if(!r)missing.push(label);else if(limits.floorMatch==='overlap'?((lo!=null&&r.max<lo)||(hi!=null&&r.min>hi)):((lo!=null&&r.min<lo)||(hi!=null&&r.max>hi)))match=false;continue;}const value=p[field];if(value==null||String(value).trim()===''||!Number.isFinite(Number(value))){missing.push(label);continue;}if((lo!=null&&Number(value)<lo)||(hi!=null&&Number(value)>hi))match=false;}return {match,missing:manualPurpose(config,p)?missing.filter(x=>x!=='用途'&&x!=='店面用途'):missing};}


function excluded(config,p){if(!p)return false;return p?.kind!=='transaction'&&(!!config.deletedListings?.[p.id]||(config.ownIds||[]).includes(p?.id)||(config.excludedGroups||[]).some(g=>(g.ids||[]).includes(p?.id)||(g.samples||[]).some(q=>root.BuyerGrouping?.same(p,q))));}
function exclusionGroup(config,records,id){const rows=Object.values(records||{}).filter(p=>p.kind!=='transaction'&&!excluded(config,p)).sort((a,b)=>a.price-b.price);return (root.BuyerGrouping?.group(rows.map(p=>({p}))).find(g=>g.some(r=>r.p.id===id))||[]).map(r=>r.p);}
function exclusion(rows){const fields=['id','source','title','address','city','district','community','price','area','floor','floorText','age','rooms'];return {id:rows[0]?.id,ids:rows.map(p=>p.id),samples:rows.map(p=>Object.fromEntries(fields.filter(k=>p[k]!=null).map(k=>[k,p[k]])))};}

const time=v=>Date.parse(v)||0;
function apply(previous,config,feed,now=new Date().toISOString()){
 const s=structuredClone(previous||{records:{},baselines:{},events:[],ack:0});s.records||={};s.baselines||={};s.events||=[];s.candidates||={};feed={...feed,listings:(feed.listings||[]).map(p=>p.kind==='transaction'?p:matchEngine.mergeListingFields(s.records[p.id]||s.candidates[p.id],p,p.seenAt||feed.generatedAt||now))};if(config.enabled!==false)for(const p of feed.listings||[]){const source=feed.sources?.find(x=>x.id===p.source);if(!['ok','partial'].includes(source?.status))continue;if(candidate(config,p)){const prior=s.candidates[p.id];if(!prior||time(p.seenAt||feed.generatedAt)>=time(prior.seenAt))s.candidates[p.id]={...p,seenAt:p.seenAt||feed.generatedAt||now};}else delete s.candidates[p.id];}for(const id of Object.keys(s.candidates))if(!candidate(config,s.candidates[id]))delete s.candidates[id];const own=new Set(config.ownIds||[]),incoming=(feed.listings||[]).filter(p=>p.id&&!excluded(config,p)&&matches(config,p)),sources=feed.sources||[];
 for(const source of sources){if(!['ok','partial'].includes(source.status)||(['moi','moi-presale'].includes(source.id)?config.transactionsEnabled===false:config.enabled===false))continue;const rows=incoming.filter(p=>p.source===source.id),initialized=!!s.baselines[source.id];
  for(const raw of rows){const p={...raw,...(config.buildingDecisions?.[raw.id]?.same?{matchNote:'已人工確認同棟'}:config.mode!=='road'&&!raw.community?{matchNote:'建案名稱待確認'}:{}),seenAt:raw.seenAt||feed.generatedAt||now},old=s.records[p.id];if(old&&(time(p.seenAt)<time(old.seenAt)||(old.availability&&old.availability!=='active'&&time(p.seenAt)<=time(s.scans?.[source.id]?.at))))continue;
   const duplicate=!old&&p.kind!=='transaction'&&Object.values(s.records).some(q=>q.kind!=='transaction'&&root.BuyerGrouping?.same(p,q));
   let kind='';if(initialized){if(!old&&!duplicate)kind=p.kind==='transaction'?'成交':'New';else if(old&&p.kind==='transaction'&&['price','area','address','tradeDate','floorText','type','community','unit','termination','notes','parkingPrice','parkingArea'].some(field=>JSON.stringify(p[field]??null)!==JSON.stringify(old[field]??null)))kind='成交更正';else if(old&&Number.isFinite(p.price)&&Number.isFinite(old.price)&&p.price!==old.price)kind=p.kind==='transaction'?'成交更正':p.price<old.price?'Down':'';}
   if(old?.availability==='off'&&p.kind!=='transaction'){kind='';p.recheckOff=raw.availability!=='unavailable'&&time(p.seenAt)>time(old.linkCheckedAt);p.offConfirmedAt=old.offConfirmedAt||old.linkCheckedAt;}
   p.availability=raw.availability==='unavailable'?'off':old?.availability==='off'?'off':'active';p.missingScans=0;
   if(p.availability==='off'){kind='';if(old&&old.availability!=='off')confirmedOff(s,config,p,now,old.availability||'active');else if(!old){p.offConfirmedAt=now;p.offBaseline=true;}}
   if(kind&&assess(config,p).match&&!assess(config,p).missing.length){const id=[source.id,p.id,kind,p.seenAt,p.price].join('|');if(!s.events.some(e=>e.id===id))s.events.push({id,kind,listingId:p.id,at:now,before:old?.price,price:p.price});}
   for(const k of ['purposeAttemptedAt','purposeCheckedAt','linkCheckedAt','lastVerifiedAvailableAt','offDuplicateOf'])if(old?.[k]&&!p[k])p[k]=old[k];
   p.systemFirstSeenAt=old?.systemFirstSeenAt||old?.firstSeenAt||old?.publishedObservedAt||(old&&systemStatus(old,s.events).at?new Date(systemStatus(old,s.events).at).toISOString():null)||old?.seenAt||now;
   s.records[p.id]=p;
  }
  if(source.status==='ok'&&!feed.incremental&&!['moi','moi-presale'].includes(source.id)&&feed.scanId){
   s.scans||={};const stamp=time(feed.generatedAt),previousScan=s.scans[source.id];
   if(stamp>time(previousScan?.at)&&feed.scanId!==previousScan?.id){
    const present=new Set(rows.map(p=>p.id));
    for(const p of Object.values(s.records)){
     if(p.source!==source.id||p.kind==='transaction'||excluded(config,p)||!matches(config,p)||!assess(config,p).match||present.has(p.id)||time(p.seenAt)>stamp)continue;
     p.missingScans=(p.missingScans||0)+1;
     if(p.missingScans>=3&&(!p.availability||p.availability==='active'))p.availability='suspected';
    }
    s.scans[source.id]={id:feed.scanId,at:feed.generatedAt};
   }
  }
  if(source.status==='ok')s.baselines[source.id]=s.baselines[source.id]||now;
 }
 s.sourceStatus||={};for(const source of sources){const old=s.sourceStatus[source.id];if(!old||time(feed.generatedAt)>=time(old.at))s.sourceStatus[source.id]={...source,at:feed.generatedAt};}s.lastSources=sources;s.checkedAt=now;s.events=s.events.slice(-1000);return s;
}

function confirmedOff(state,config,p,now,previousAvailability=p.availability){
 const already=previousAvailability==='off';p.availability='off';p.linkCheckedAt=now;p.recheckOff=false;if(already)return;p.offConfirmedAt=now;
 if(config.enabled===false||config.notifyDown===false||excluded(config,p)||!matches(config,p)||!assess(config,p).match)return;
 const other=Object.values(state.records||{}).some(q=>q.id!==p.id&&q.kind!=='transaction'&&(!q.availability||q.availability==='active')&&!excluded(config,q)&&root.BuyerGrouping?.same(p,q));
 state.events||=[];state.events.push({id:[p.id,'已下架',now].join('|'),kind:other?'其中一筆已下架':'已下架',listingId:p.id,at:now});
}
function confirmedAvailable(state,p,now){
 if(time(now)<time(p.linkCheckedAt))return;
 const wasOff=p.availability==='off';p.availability='active';p.lastVerifiedAvailableAt=now;delete p.offDuplicateOf;p.linkCheckedAt=now;p.missingScans=0;p.recheckOff=false;
 if(wasOff){state.events||=[];state.events.push({id:[p.id,'重新上架',now].join('|'),kind:'重新上架',listingId:p.id,at:now,verified:true});}
}
function verify(previous,config,checks,scanId,now=new Date().toISOString()){
 const s=structuredClone(previous);if(config.enabled===false)return s;
 for(const check of checks||[]){const p=s.records?.[check.id];if(!p||p.kind==='transaction'||excluded(config,p)||!matches(config,p)||!assess(config,p).match||!p.missingScans||s.scans?.[p.source]?.id!==scanId)continue;
 p.verifiedScan=scanId;
 if(check.status==='active'&&p.availability!=='off'){p.availability='active';p.missingScans=0;p.linkCheckedAt=now;}
 if(check.status==='off'&&p.availability!=='off')confirmedOff(s,config,p,now);
 }return s;
}
function photoIdentity(value){try{const u=new URL(value);if(/^img\d*\.591\.com\.tw$/.test(u.hostname))return '591:'+u.pathname.split('!')[0];return u.href;}catch{return '';}}
function sameOffProperty(a,b){
 if(!root.BuyerGrouping?.same(a,b))return false;
 const fa=matchEngine.floorRange(a),fb=matchEngine.floorRange(b);
 if(!fa||!fb||JSON.stringify(fa)!==JSON.stringify(fb)||Math.abs(Number(a.area)-Number(b.area))>0.01)return false;
 if(a.rooms!=null&&b.rooms!=null&&Number(a.rooms)!==Number(b.rooms))return false;
 if(!norm(a.title)||norm(a.title)!==norm(b.title))return false;
 // A shared photo supports redacted addresses; exact numbered addresses also qualify.
 return !!(a.image&&b.image&&photoIdentity(a.image)===photoIdentity(b.image))||(/號/.test(a.address||'')&&norm(a.address)===norm(b.address));
}
function offGroups(rows){const groups=[];for(const p of rows){const group=groups.find(g=>g.every(q=>sameOffProperty(p,q)));if(group)group.push(p);else groups.push([p]);}return groups;}
// Retain a recoverable audit of legacy feed-only relisting cycles.
function cleanLegacyOff(state){
 if(!state)return state;
 const s=structuredClone(state),byId=new Map(),remove=new Set();
 // Legacy first discovery already returned unavailable: not a transition from active.
 for(const e of s.events||[]){const p=s.records?.[e.listingId];if(!p||!['已下架','其中一筆已下架'].includes(e.kind))continue;
 const detailAt=typeof p.at==='number'?p.at:time(p.at);
 if(p.discovery==='new'&&p.availability==='off'&&/404|已失效/.test(p.availabilityReason||'')&&time(p.firstSeenAt)>0&&detailAt>=time(p.firstSeenAt)&&detailAt<=time(e.at)&&day(p.firstSeenAt)===day(e.at)&&!p.lastVerifiedAvailableAt&&!(s.events||[]).some(x=>x.listingId===p.id&&x.kind==='重新上架'&&x.verified)){
 s.legacyOffAudit||={};s.legacyOffAudit[e.id]={...e,reason:'first-discovered-unavailable'};remove.add(e.id);p.offBaseline=true;
 }}
 s.events=(s.events||[]).filter(e=>!remove.has(e.id));remove.clear();
 for(const e of s.events||[]){if(!byId.has(e.listingId))byId.set(e.listingId,[]);byId.get(e.listingId).push(e);}
 for(const [id,events] of byId){let first=null,pending=[];
  for(const e of events.slice().sort((a,b)=>time(a.at)-time(b.at))){
   if(e.kind==='重新上架'){if(e.verified===true){first=null;pending=[];}else if(first&&Object.hasOwn(e,'price')&&Object.hasOwn(e,'before'))pending.push(e);else{first=null;pending=[];}}
   else if(['已下架','其中一筆已下架'].includes(e.kind)){if(first&&pending.length){pending.forEach(x=>remove.add(x.id));remove.add(e.id);pending=[];if(s.records?.[id]?.availability==='off')s.records[id].offConfirmedAt=first.at;}else first=e;}
  }
 }
 if(remove.size){s.legacyOffAudit||={};for(const e of s.events)if(remove.has(e.id))s.legacyOffAudit[e.id]={...e,reason:'legacy-unverified-relisting-cycle'};s.events=s.events.filter(e=>!remove.has(e.id));}
 // Cross-ID duplicates require an older confirmed off record and no verified return to sale.
 for(const group of offGroups(Object.values(s.records||{}).filter(p=>p.kind!=='transaction'&&p.availability==='off'))){
  const offAt=p=>time(p.offConfirmedAt)||Math.min(...(s.events||[]).filter(e=>e.listingId===p.id&&['已下架','其中一筆已下架'].includes(e.kind)).map(e=>time(e.at)))||time(p.linkCheckedAt);
  const legacyAt=p=>time(p.linkCheckedAt)||(p.availability==='off'&&/404|已失效/.test(p.availabilityReason||'')&&typeof p.at==='number'?p.at:0);
  const dated=group.map(p=>({p,at:Number.isFinite(offAt(p))?offAt(p):legacyAt(p)})).filter(x=>x.at>0).sort((a,b)=>a.at-b.at);
  if(dated.length<2)continue;const first=dated[0];
  for(const {p,at} of dated.slice(1)){if(at<=first.at)continue;
   if(time(p.lastVerifiedAvailableAt)>first.at||(s.events||[]).some(e=>group.some(q=>q.id===e.listingId)&&e.kind==='重新上架'&&e.verified&&time(e.at)>first.at))continue;
   const duplicateEvents=(s.events||[]).filter(e=>e.listingId===p.id&&['已下架','其中一筆已下架'].includes(e.kind)&&time(e.at)>=first.at);
   s.legacyOffAudit||={};for(const e of duplicateEvents)s.legacyOffAudit[e.id]={...e,reason:'duplicate-off-property',originalListingId:first.p.id};
   const ids=new Set(duplicateEvents.map(e=>e.id));s.events=s.events.filter(e=>!ids.has(e.id));p.offDuplicateOf=first.p.id;
  }
 }
 return s;
}
function changeRelevant(event){return !/下架/.test(event.kind);}

function day(at){const d=new Date(at);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function eventRelevant(config,event,p){if(!p||excluded(config,p)||!matches(config,p))return false;if(p.kind==='transaction')return config.transactionsEnabled!==false;if(/疑似下架/.test(event.kind))return false;if(config.enabled===false||!assess(config,p).match||(!/已下架/.test(event.kind)&&assess(config,p).missing.length))return false;return config.notifyDown!==false||!/下架/.test(event.kind);}
function reminder(c,id,label,state,save,now=new Date()){
 const date=day(now),events=state.events.filter(e=>day(e.at)===date&&!/疑似下架/.test(e.kind));if(!events.length||c.archived||c._deleted)return false;const key='inventory-watch:'+id+':'+date,old=c.searchReportEvents,items=structuredClone(old||[]),existing=items.find(x=>x.id===key),known=existing?.marketEvents||{};if(events.every(e=>known[e.id]))return false;const all={...known,...Object.fromEntries(events.map(e=>[e.id,e.kind]))},counts={};Object.values(all).forEach(k=>counts[k]=(counts[k]||0)+1);const memo=Object.entries(counts).map(([k,n])=>({'New':'新發現刊登','Down':'降價','成交':'新公布成交','成交更正':'成交更正','疑似下架':'疑似下架','其中一筆疑似下架':'其中一筆疑似下架','已下架':'新確認下架','其中一筆已下架':'其中一筆已下架','重新上架':'重新上架'}[k])+n+'筆').join('、');const entry={...existing,id:key,date:existing?.date||date,time:existing?.time||'',memo,propertyRef:state.propertyRef||existing?.propertyRef||{clientId:c.id,type:'庫存屋主',label,address:''},schedType:'庫存屋主',marketEvents:all,_deleted:false,updatedAt:now.toISOString()};if(existing)Object.assign(existing,entry);else items.push(entry);c.searchReportEvents=items;if(!save()){c.searchReportEvents=old;return false;}return true;
}
function systemStatus(p,events=[],now=Date.now()){
 const relevant=events.filter(e=>e.listingId===p.id&&(['New','Down','成交','成交更正','已下架','其中一筆已下架'].includes(e.kind))).map(e=>({at:time(e.at),kind:e.kind==='Down'?'降價':e.kind==='New'?'上市':e.kind.includes('下架')?'下架':'行情'})).filter(e=>e.at>0);
 const initial=time(p.systemFirstSeenAt)||time(p.firstMatchedAt)||time(p.firstSeenAt)||time(p.publishedObservedAt)||Math.min(Infinity,...relevant.filter(e=>e.kind==='上市'||e.kind==='行情').map(e=>e.at));
 const baseline=Number.isFinite(initial)?initial:time(p.seenAt);
 let result={at:baseline,kind:p.kind==='transaction'?'行情':'上市'};
 if(p.availability==='off'){result={at:time(p.offConfirmedAt)||Math.max(0,...relevant.filter(e=>e.kind==='下架').map(e=>e.at)),kind:'下架'};}
 else {for(const e of relevant)if(e.kind!=='下架'&&e.at>=result.at)result=e;if(time(p.priceDroppedAt)>result.at)result={at:time(p.priceDroppedAt),kind:'降價'};}
 const day=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'});return {...result,today:result.at>0&&day(result.at)===day(now)};
}
function prioritizeGroups(groups,events=[],ack=0){return groups.map((group,index)=>({group,index,date:Math.max(0,...group.map(({p})=>systemStatus(p,events).at))})).sort((a,b)=>b.date-a.date||a.index-b.index).map(x=>x.group);}

function sortListingGroups(groups,events=[],order='date-desc'){
 const date=p=>time(p.systemFirstSeenAt)||time(p.firstMatchedAt)||time(p.firstSeenAt)||time(p.publishedObservedAt)||Math.min(...events.filter(e=>e.listingId===p.id&&e.kind==='New').map(e=>time(e.at)).filter(Boolean),Infinity);
 const direction=order.endsWith('-asc')?1:-1;
 return groups.map((group,index)=>{const dates=group.map(({p})=>date(p)).filter(Number.isFinite);const prices=group.map(({p})=>Number(p.price)).filter(n=>Number.isFinite(n)&&n>0);return {group,index,value:order.startsWith('count-')?group.length:order.startsWith('price-')?(prices.length?Math.min(...prices):null):(dates.length?Math.max(...dates):null)};}).sort((a,b)=>a.value===null?(b.value===null?a.index-b.index:1):b.value===null?-1:direction*(a.value-b.value)||a.index-b.index).map(x=>x.group);
}
const api={sortListingGroups,systemStatus,sameOffProperty,offGroups,cleanLegacyOff,confirmedAvailable,confirmedOff,changeRelevant,purposeKey,manualPurpose,eventRelevant,candidate,prioritizeGroups,excluded,exclusionGroup,exclusion,verify,criteria,assess,conditionFields,buildingTypes,norm,communityName,aliases,location,matches,apply,reminder};root.InventoryMarketEngine=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
