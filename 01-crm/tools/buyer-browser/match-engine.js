(function(root){
'use strict';
const num=v=>v===null||v===undefined||String(v).trim()===''?null:Number.isFinite(Number(String(v).replace(/,/g,'')))?Number(String(v).replace(/,/g,'')):null;

function floorRange(p){
 const text=String(p.floorText||p.floor||'').normalize('NFKC').trim().toUpperCase().split('/')[0].replace(/樓|F|\s/g,'').replace(/[–—～~至]/g,'-');
 const m=text.match(/^(B?\d+|-\d+)(?:-(B?\d+|-\d+))?$/);if(!m)return null;
 const n=v=>v.startsWith('B')?-Number(v.slice(1)):Number(v),a=n(m[1]),b=m[2]?n(m[2]):a;if(a===0||b===0)return null;return {min:Math.min(a,b),max:Math.max(a,b)};
}
function floorLabel(p){const r=floorRange(p);if(!r)return '樓層待確認';const label=n=>n<0?'B'+(-n):String(n);return label(r.min)+(r.min===r.max?'':'–'+label(r.max))+'樓';}
function normalizeListing(p){const out={...p};if(p.floor!=null&&!p.floorText)out.floorText=String(p.floor);for(const key of ["price","area","mainArea","age","floor","totalFloors","rooms","priceBeforeDrop"]){if(key in out)out[key]=num(out[key]);}return out;}

// Only descriptive fields retain explicit evidence across sparse listing updates.
// Prices and availability continue through their separate freshness/lifecycle rules.
function mergeListingFields(old={},incoming={},at=''){
 const next=normalizeListing(incoming),out={...next},keys=['ageText','constructionStatus','registeredUsage','usage','usageEvidence','buildingType','type','elevator','rooms','parking','parkingType'],known=v=>v!==null&&v!==undefined&&!(typeof v==='string'&&!v.trim());
 if(known(next.registeredUsage)&&!known(next.usage))next.usage=next.registeredUsage;
 const meta={...(old.fieldCheckedAt||{})},stamp=v=>Date.parse(v)||0;
 for(const key of keys){const prior=stamp(old.fieldCheckedAt?.[key]||old.detailCheckedAt||old.seenAt),fresh=next.fieldCheckedAt?.[key]||next.detailCheckedAt||next.seenAt||at;
 if(known(next[key])&&(!known(old[key])||stamp(fresh)>=prior)){out[key]=next[key];if(fresh)meta[key]=fresh;}
 else if(known(old[key])){out[key]=old[key];const retained=old.fieldCheckedAt?.[key]||old.detailCheckedAt||old.seenAt;if(retained)meta[key]=retained;}
 }
 if(known(next.usage)&&out.usage===next.usage&&next.usage!==old.usage&&!known(next.usageEvidence))out.usageEvidence='';const shape=v=>String(v||'').trim().replace(/^(住宅大樓|電梯大廈)$/,'電梯大樓');const types=['公寓','華廈','電梯大樓','住宅大樓','電梯大廈','透天','透天厝','別墅','套房'];const explicit=[next.buildingType,next.type].filter(v=>types.includes(v));
 if(old.typeConflict)out.typeConflict=true;
 if(explicit.length){const fresh=next.detailCheckedAt||next.seenAt||at,oldAt=Math.max(stamp(old.fieldCheckedAt?.type||old.detailCheckedAt||old.seenAt),stamp(old.fieldCheckedAt?.buildingType||old.detailCheckedAt||old.seenAt));if(stamp(fresh)>=oldAt){out.type=out.buildingType=explicit[0];meta.type=meta.buildingType=fresh;out.typeConflict=explicit.some(v=>shape(v)!==shape(explicit[0]));if(shape(explicit[0])!==shape(old.buildingType||old.type)&&typeof next.elevator!=='boolean'){out.elevator=null;meta.elevator=fresh;}}}else if(old.typeConflict)out.typeConflict=true;
 out.fieldCheckedAt=meta;return out;
}
// Use listing-specific evidence only; page navigation and generic disclaimers are not evidence.
function constructionStatus(p){
 const ageText=String(p.ageText||''),title=String(p.title||''),state=String(p.constructionStatus||'');
 const clean=title.replace(/(?:非|不是|非屬)預售(?:屋|案)?/g,'');
 if((p.source==='591'&&/^[-－–—]+$/.test(ageText.trim()))||state==='presale'||/預售|興建中|施工中|未完工/.test(ageText)||/預售|預收|興建中|施工中|未完工/.test(clean))return 'presale';
 if(state==='completed'||/新成屋|已完工|已交屋|中古屋/.test(ageText+' '+title)||num(p.age)>0)return 'completed';
 return 'unknown';
}
function normalizeDemand(d={}){const list=v=>(Array.isArray(v)?v:String(v||'').split(/[,，、]/)).map(x=>String(x).normalize('NFKC').trim().replaceAll('臺','台')).filter(Boolean);const cities=list(d.areaCities);return {...d,areaCities:cities.length?cities:list(d.areaCity),areaDists:list(d.areaDists)};}
function remainingPreference(d){
 const m=d.matchCriteria||{};
 return String(d.want||'').split(/[、,，;；\n]/).map(t=>t.trim()).filter(Boolean).filter(t=>{
 const age=t.match(/^(\d+(?:\.\d+)?)年(?:內|以下)?$/);
 if(age&&num(m.ageMax)===Number(age[1]))return false;
 if(t==='平面車位'&&m.parking==='flat')return false;
 if(/^(有車位|需車位)$/.test(t)&&['yes','flat'].includes(m.parking))return false;
 if(t==='有電梯'&&m.elevator==='yes')return false;
 return true;
 }).join('、');
}
function evaluate(d,p){d=normalizeDemand(d);p=normalizeListing(p);const m=d.matchCriteria||{},yes=[],pending=[],no=[],preferred=[],preferenceMiss=[],preferenceUnknown=[];function check(label,known,pass){if(m.optional?.includes(label)){(known?(pass?preferred:preferenceMiss):preferenceUnknown).push(label);}else (known?(pass?yes:no):pending).push(label);}
 if(p.availability==='unavailable')check('原物件連結有效',true,false);if(m.searchPurpose){const raw=String(p.usage||p.registeredUsage||'').trim(),category=String(p.sourceCategory||''),other=String(p.buildingType||p.type||'')+' '+String(p.title||'');const text=raw||category+' '+other;let purpose='';if(/工業住宅|事務所住宅|住商混合|住辦|工業用|一般商業設施/.test(text))purpose='住商混合';else if(/店面|店舖|店鋪|金店面/.test(text))purpose='店面';else if(/廠房|廠辦/.test(text))purpose='廠房';else if(/倉庫/.test(text))purpose='倉庫';else if(/辦公|事務所|商辦/.test(text))purpose='辦公';else if(/住宅|住家|住商/.test(raw))purpose=/住商/.test(raw)?'住商混合':'住宅';check('用途',!!purpose,purpose===m.searchPurpose);}
 const cities=(d.areaCities||[d.areaCity]).filter(x=>x&&x!=='其他縣市'),districts=Array.isArray(d.areaDists)?d.areaDists:String(d.areaDists||'').split(',').filter(Boolean);
 if(cities.length)check('縣市',!!p.city,cities.some(x=>x.replaceAll('臺','台')===String(p.city).replaceAll('臺','台')));if(districts.length)check('行政區',!!p.district,districts.includes(p.district));if(d.areaOther)pending.push('其他區域：'+d.areaOther);
 const legacy=String(d.roomTypes||'').split(',');const rooms=m.rooms||legacy.flatMap(x=>x==='套房'?['1']:x==='二房'?['2']:x==='三房+'?['3+']:[]),types=m.types||legacy.filter(x=>['公寓','透天'].includes(x));
 let budgetMax=d.budgetMax,budgetMin=d.budgetMin;if(!budgetMax&&!budgetMin&&d.budget){const parts=String(d.budget).replace(/萬/g,'').split(/[-~～]/);if(parts.length===2){budgetMin=parts[0];budgetMax=parts[1];}else pending.push('舊預算未指定上下限');}
 for(const [key,min,max,label] of [['price',budgetMin,budgetMax,'總價'],[m.areaBasis==='main'?'mainArea':'area',m.areaMin,m.areaMax,m.areaBasis==='main'?'主建物坪數':'建坪'],['age',null,m.ageMax,'屋齡'],['floor',m.floorMin,m.floorMax,'樓層']]){const lo=num(min),hi=num(max);if(lo!==null||hi!==null){if(key==='floor'){const r=floorRange(p);check(label,!!r,!!r&&(lo===null||r.min>=lo)&&(hi===null||r.max<=hi));}else check(label,num(p[key])!==null,(lo===null||num(p[key])>=lo)&&(hi===null||num(p[key])<=hi));}}
 if(rooms.length)check('房間數',num(p.rooms)!==null,rooms.some(value=>{const x=String(value);return x.endsWith('+')?p.rooms>=Number(x.slice(0,-1)):p.rooms===Number(x);}));
 if(p.typeConflict&&types.length)pending.push('房屋類型衝突');else if(types.length){const type=String(p.buildingType||p.type||''),pass=types.some(x=>type.includes(x)||(x==='電梯大樓'&&/^(?:住宅)?大樓$/.test(type))||(x==='透天'&&type.includes('透天'))),mixed=/店面|事務所|工業住宅|辦公|住商|住辦|商辦|商業/.test(type),apartmentOnly=types.every(x=>x==='公寓'),buildingEvidence=/大樓|大廈|華廈/.test(type)||p.elevator===true||num(p.totalFloors)>=11;
  // Usage is not building form. High-rise/elevator evidence must still reject an apartment-only demand.
  if(apartmentOnly&&buildingEvidence)check('房屋類型',true,false);
  else if(mixed&&!pass&&!m.optional?.includes('房屋類型'))pending.push('類型／用途（原站：'+type+'）');else check('房屋類型',!!type,pass);}
 if(m.legacyTypes)pending.push('舊房型待細分');if(m.parking)check('車位',typeof p.parking==='boolean',p.parking===true);if(m.parking==='flat')check('平面車位',!!p.parkingType,/平面/.test(p.parkingType));
 if(m.elevator&&p.typeConflict)pending.push('電梯');else if(m.elevator){const elevator=typeof p.elevator==='boolean'?p.elevator:/^(電梯大樓|住宅大樓|電梯大廈)$/.test(String(p.buildingType||p.type||'').trim())?true:/^公寓$/.test(String(p.buildingType||p.type||'').trim())?false:null;check('電梯',typeof elevator==='boolean',elevator===(m.elevator==='yes'));}
 if(m.exclude?.includes('presale')){const status=constructionStatus(p);(status==='presale'?no:status==='completed'?yes:pending).push(status==='unknown'?'是否已完工（排除預售屋）':'排除預售屋');}
 const fr=floorRange(p),contains=n=>fr&&fr.min<=n&&fr.max>=n;
 if(m.exclude?.includes('first'))check('非1樓',!!fr,!contains(1));if(m.exclude?.includes('fourth'))check('非4樓',!!fr,!contains(4));if(m.exclude?.includes('top'))check('非頂樓',!!fr&&num(p.totalFloors)!==null,!contains(num(p.totalFloors)));if(m.exclude?.includes('basement'))check('非地下室',!!fr,!!fr&&fr.min>0);
 if(m.keywords){const words=m.keywords.split(/[,，、\n]/).map(x=>x.trim()).filter(Boolean);check('社區／路段',!!(p.address||p.community),words.some(w=>(/路|街|大道/.test(w)?String(p.address||''):p.address+' '+p.community+' '+p.title).includes(w)));}
 const remaining=remainingPreference(d);if(remaining)pending.push('偏好需核對：'+remaining);if(d.noWant)pending.push('排除事項需核對：'+d.noWant);if(!yes.length&&!no.length)pending.push('尚未設定可比對條件');if(p.notInLatest)pending.push('本批未收錄，現況需確認');if(p.stale)pending.push('來源更新失敗，待確認現況');return {yes,pending,no,preferred,preferenceMiss,preferenceUnknown,score:preferred.length,status:no.length?'excluded':pending.length?'pending':'matched'};
}
function summary(d,{advancedOnly=false}={}){const m=d.matchCriteria||{},out=[d.areaDisplay||[...(d.areaCities||[]),...(d.areaDists||[])].join('、'),d.roomTypes,(d.budgetMin||d.budgetMax)?(d.budgetMin||'不限')+'～'+(d.budgetMax||'不限')+'萬':d.budget?d.budget+'萬':'預算不限'];if(advancedOnly)out.length=0;if(m.searchPurpose)out.push("搜尋用途："+m.searchPurpose);if(m.areaMin||m.areaMax)out.push((m.areaBasis==='main'?'主建物':'建坪')+' '+(m.areaMin||'不限')+'～'+(m.areaMax||'不限')+'坪');if(m.ageMax)out.push(m.ageMax+'年內');if(m.floorMin||m.floorMax){const exact=m.floorMin&&m.floorMax&&Number(m.floorMin)===Number(m.floorMax),optional=m.optional?.includes('樓層');out.push('樓層'+(optional?'偏好：':'必要：')+(exact?((optional?'':'僅')+m.floorMin+'樓'):(m.floorMin||'不限')+'～'+(m.floorMax||'不限')+'樓'));}if(m.parking)out.push(m.parking==='flat'?'平面車位':'需車位');if(m.elevator)out.push((m.optional?.includes('電梯')?'偏好':'必要')+'：'+(m.elevator==='yes'?'有電梯':'無電梯'));if(m.exclude?.length)out.push(m.exclude.map(x=>({presale:'排除預售屋',first:'排除1樓',fourth:'排除4樓',top:'排除頂樓',basement:'排除地下室'}[x])).join('、'));if(m.keywords)out.push('社區／路段'+(m.optional?.includes('社區／路段')?'偏好：':'必要：')+m.keywords);const remainingOptional=(m.optional||[]).filter(x=>!['樓層','社區／路段','電梯'].includes(x));if(remainingOptional.length)out.push('偏好：'+remainingOptional.join('、'));return out.filter(Boolean).join('｜');}
const api={remainingPreference,constructionStatus,mergeListingFields,normalizeDemand,floorRange,floorLabel,evaluate,summary,normalizeListing};if(typeof module!=='undefined')module.exports=api;root.BuyerMatchEngine=api;
})(typeof window==='undefined'?globalThis:window);
