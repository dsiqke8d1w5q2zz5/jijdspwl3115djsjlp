(()=>{const acorn=globalThis.acorn;
const number=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(String(v).replace(/,/g,'')))?Number(String(v).replace(/,/g,'')):null;
const firstNumber=v=>{const m=String(v??'').match(/[\d.]+/);return m?number(m[0]):null;};
const location=address=>{const m=String(address||'').replaceAll('臺','台').match(/^(台北市|新北市|桃園市|台中市|台南市|高雄市|基隆市|新竹市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義市|嘉義縣|屏東縣|宜蘭縣|花蓮縣|台東縣|澎湖縣|金門縣|連江縣)(.{1,4}?區|.{1,4}?[鄉鎮市])/);return {city:m?.[1]||'',district:m?.[2]||''};};
// Decode Nuxt's literal-only data envelope. No eval/vm or arbitrary calls.
function literal(n,env={}){if(!n)throw Error('資料缺漏');switch(n.type){case'Literal':return n.value;case'Identifier':if(Object.hasOwn(env,n.name))return env[n.name];throw Error('未知資料變數');case'UnaryExpression':if(n.operator==='void'&&n.argument.type==='Literal'&&n.argument.value===0)return null;if(n.operator==='-')return -literal(n.argument,env);if(n.operator==='!')return !literal(n.argument,env);throw Error('不支援的資料格式');case'NewExpression':if(n.callee.type==='Identifier'&&n.callee.name==='Set'&&n.arguments.length===1&&n.arguments[0].type==='ArrayExpression')return literal(n.arguments[0],env);throw Error('不支援的資料結構');case'ArrayExpression':return n.elements.map(x=>literal(x,env));case'ObjectExpression':return Object.fromEntries(n.properties.map(p=>{if(p.type!=='Property'||p.computed||p.method)throw Error('不支援的資料欄位');return [p.key.name??p.key.value,literal(p.value,env)];}));default:throw Error('不支援的資料節點 '+n.type);}}
function nuxt(html){const script=[...html.querySelectorAll('script')].map(x=>x.textContent).find(s=>s?.startsWith('window.__NUXT__='));if(!script)throw Error('找不到公開物件資料');const ast=acorn.parse(script,{ecmaVersion:2020}),assign=ast.body[0]?.expression,call=assign?.right;if(assign?.type!=='AssignmentExpression'||call?.type!=='CallExpression'||call.callee.type!=='FunctionExpression'||call.callee.body.body.length!==1||call.callee.body.body[0].type!=='ReturnStatement')throw Error('資料格式已變更');const env={};call.callee.params.forEach((p,i)=>{if(p.type!=='Identifier')throw Error('資料格式已變更');env[p.name]=literal(call.arguments[i]);});return literal(call.callee.body.body[0].argument,env);}
function walk(o,predicate,out=[]){if(!o||typeof o!=='object')return out;if(predicate(o))out.push(o);else for(const v of Object.values(o))walk(v,predicate,out);return out;}

// Only rendered search cards establish identity. Embedded payloads can contain
// alternate IDs that do not resolve; title equality must never establish an ID.
function parse591(doc,city=''){
 if(doc.location?.hostname==='business.591.com.tw')return parse591Embedded(doc,city);
 let embedded=[];try{embedded=parse591Embedded(doc,city);}catch{}
 const rows=new Map(),text=(card,selector)=>card.querySelector(selector)?.textContent.trim()||'';
 for(const card of doc.querySelectorAll('.ware-item')){
  const link=card.querySelector('.ware-item__header a[href]');if(!link)continue;
  let url;try{url=new URL(link.getAttribute('href'),'https://sale.591.com.tw/');}catch{continue;}
  const match=url.pathname.match(/^\/home\/house\/detail\/2\/(\d+)\.html$/);
  if(url.origin!=='https://sale.591.com.tw'||!match||url.username||url.password)continue;
  const id='591:'+match[1],title=link.textContent.trim();if(!title)continue;
  const attrs=[...card.querySelectorAll('.ware-item__attr')].map(e=>e.textContent.trim());
  const area=firstNumber(attrs.find(t=>/^權狀/.test(t))),price=number(text(card,'.ware-item__price-value'));
  const base=embedded.find(p=>p.id===id&&p.title===title&&p.area===area&&p.price===price)||{};
  const district=text(card,'.ware-item__section').replace(/[-－]\s*$/,''),street=text(card,'.ware-item__address');
  const floorText=attrs.find(t=>/^(?:B?\d+F?|整棟)\//i.test(t))||'',parts=floorText.split('/');
  const floor=/^B\d+F?$/i.test(parts[0])?-firstNumber(parts[0]):/^\d+F?$/i.test(parts[0])?firstNumber(parts[0]):null;
  const ageText=attrs.find(t=>/^(?:\d+(?:\.\d+)?(?:年|個月)|新成屋|預售屋)$/.test(t))||'';
  const buildingType=attrs.find(t=>/^(電梯大樓|華廈|公寓|透天厝|透天|別墅|套房|辦公|店面|廠房|土地)$/.test(t))||base.buildingType||'';
  const layout=attrs.find(t=>/\d+房|開放式/.test(t))||'';
  rows.set(id,{...base,id,source:'591',url:url.origin+url.pathname,title,city:base.city||city,district,address:(base.city||city)+district+street,
   price,area,mainArea:firstNumber(attrs.find(t=>/^主建/.test(t))),floorText,floor,totalFloors:firstNumber(parts[1]),
   rooms:/開放式/.test(layout)?0:firstNumber(layout),ageText,age:/個月/.test(ageText)?firstNumber(ageText)/12:/年/.test(ageText)?firstNumber(ageText):null,
   buildingType,type:buildingType,community:text(card,'.ware-item__community'),image:card.querySelector('.ware-item__image')?.getAttribute('data-src')||card.querySelector('.ware-item__image')?.getAttribute('src')||'',
   sourceIdentityEvidence:'591搜尋卡片連結'});
 }
 return [...rows.values()];
}


function parse591Embedded(html,city=''){const data=nuxt(html);if(html.location?.hostname==='business.591.com.tw')return walk(data,o=>o.id&&o.title&&o.url&&o.price!==undefined).filter(o=>Number(o.type)===2&&(/^https:\/\/business\.591\.com\.tw\/sale\/\d+$/.test(o.url)||o.url==='https://sale.591.com.tw/home/house/detail/2/'+o.id+'.html')).map(o=>{const address=city+String(o.address||'').replace(/^(.*?[區鄉鎮市])-/, '$1'),fl=String(o.floor_name||'').split('/'),floor=/^B(\d+)$/i.test(fl[0])?-Number(fl[0].slice(1)):/^\d+F?$/i.test(fl[0])?firstNumber(fl[0]):null;return {id:'591:'+o.id,source:'591',channel:'business',url:o.url,title:o.title,address,...location(address),price:number(o.price),area:number(o.area),floor,totalFloors:firstNumber(fl[1]),floorText:o.floor_name||'',age:null,rooms:null,buildingType:o.shape_name||'',type:o.shape_name||'',sourceCategory:o.kind_name||'',usage:o.build_purpose||'',community:o.community_name||'',image:o.photoList?.[0]||'',description:(o.tags||[]).join(' ')}});return walk(data,o=>o.houseid&&o.title&&o.region_name&&o.price!==undefined).filter(o=>o.kind&&o.address&&!o.is_newhouse).map(o=>({id:'591:'+o.houseid,source:'591',url:'https://sale.591.com.tw/home/house/detail/2/'+o.houseid+'.html',title:o.title,address:(o.region_name||'')+(o.section_name||'')+(o.address||''),city:o.region_name,district:o.section_name,price:number(o.price),area:number(o.area),mainArea:number(o.mainarea)||null,floorText:String(o.floor||''),floor:number(String(o.floor||'').split('/')[0].replace(/F$/,'')),totalFloors:number(String(o.floor||'').split('/')[1]?.replace(/F$/,'')),parkingType:o.cartmodel||'',rooms:firstNumber(o.room),ageText:String(o.showhouseage||''),age:o.showhouseage&&/年/.test(o.showhouseage)?firstNumber(o.showhouseage):null,buildingType:o.shape_name||'',type:o.shape_name||'',sourceCategory:o.kind_name||'',usage:o.build_purpose||'',parking:o.has_carport===1?true:o.has_carport===0?false:null,image:o.photo_url||'',community:o.community_name||'',description:(o.tag||[]).map(t=>typeof t==='string'?t:t.name||'').join(' ')}));}

globalThis.crmRead591Detail=doc=>{if(/您查詢的物件不存在，可能已關閉或者被刪除|您所查詢的物件已下架|此物件已下架|此房源已下架/.test(doc.body?.textContent||''))return {availability:'unavailable',availabilityReason:'591原頁顯示物件不存在、已關閉或已刪除'};const field=label=>{const el=[...doc.querySelectorAll('li,span,div')].find(e=>!e.children.length&&e.textContent.trim().replace(/[：:]/g,'')===label);if(!el)return '';const text=el.parentElement.textContent.replace(/\s+/g,' ').trim();if(text.length>100)return '';return text.replace(new RegExp('^'+label+'[\\s：:]*'),'').trim();};const legal=field('法定用途'),description=doc.querySelector('[data-behavior-key="house_introduction"]')?.textContent||'',disclosed=description.match(/(?:用途|此為|屬於)[^。\n]{0,24}?(一般商業設施|工業用|事務所住宅|工業住宅)/)?.[1]||'',usage=legal||disclosed,buildingType=field('型態');return {...(usage||buildingType?{availability:'available'}:{}),...(field('屋齡')?{ageText:field('屋齡')}:{}),...(/(?:本案|本物件|此物件|此屋|本戶|為)[\s：:]*?(?:為|是|屬於)?[\s：:]*預售(?:屋|案)/.test(description)?{constructionStatus:'presale'}:{}),...(usage?{usage,usageEvidence:legal?'591法定用途':'591屋主用途揭露'}:{}),...(buildingType?{buildingType,type:buildingType}:{})};};globalThis.crmRead591API=(data,id)=>{
 if(!data?.ware||String(data.ware.id)!==String(id))return null;
 const fields=Object.values(data.info||{}).flatMap(group=>Object.values(group||{})),value=name=>fields.find(f=>f?.name===name)?.value||'',usage=value('法定用途'),buildingType=value('型態'),layout=value('格局'),rooms=/開放式格局/.test(layout)?0:firstNumber(String(layout).match(/(\d+)房/)?.[1]),out={availability:'available',detailVersion:2};
 if(value('屋齡'))out.ageText=String(value('屋齡'));
 if(usage)Object.assign(out,{usage,usageEvidence:'591法定用途'});
 if(buildingType)Object.assign(out,{buildingType,type:buildingType});if(/電梯大樓/.test(buildingType))out.elevator=true;
 if(rooms!==null)out.rooms=rooms;
 for(const [key,unit]of [['halls','廳'],['bathrooms','衛']]){const m=String(layout).match(new RegExp('(\\d+)'+unit));if(m)out[key]=Number(m[1]);}
 for(const [key,label]of [['mainArea','主建物'],['landArea','土地（持分）坪數']]){const item=Object.values(data.areaTips||{}).find(x=>x?.name===label),n=firstNumber(item?.value);if(n>0)out[key]=n;}
 const area=firstNumber(value('權狀坪數'));if(area>0)out.area=area;
 const floorText=String(value('樓層'));if(floorText){out.floorText=floorText;const total=floorText.split('/')[1]?.match(/^(\d+)F?$/i);if(total)out.totalFloors=Number(total[1]);}
 const community=String(value('社區')).replace(/<[^>]*>/g,'').trim();if(community)out.community=community;const parking=String(value('車位'));if(/無車位|不含車位|未含車位/.test(parking))out.parking=false;else if(/平面|機械|塔式/.test(parking)){out.parking=true;out.parkingType=parking;}else if(/車位|已含售金|另計/.test(parking))out.parking=true;
 out.details591={fields:Object.fromEntries(fields.filter(f=>f?.name&&typeof f.value==='string').map(f=>[f.name,f.value])),areas:data.areaTips||{}};
 return out;
};globalThis.crmRead591=parse591;})();