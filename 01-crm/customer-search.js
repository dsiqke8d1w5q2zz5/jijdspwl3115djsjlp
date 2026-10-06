(function(root){
'use strict';
function reasons(c,query,options={}){
 const q=String(query||'').trim().toLowerCase();if(!q)return [];
 const found=new Set(),phone=v=>String(v||'').replace(/[\s\-\(\)＋+]/g,''),qp=phone(q),live=rows=>(rows||[]).filter(x=>x&&!x._deleted),add=(label,...values)=>{if(values.flat(Infinity).some(v=>typeof v==='string'&&v.toLowerCase().includes(q)))found.add(label);},person=p=>{if(!p)return;add('姓名',p.name);if([p.phone,...(p.phones||[])].some(v=>qp&&phone(v).includes(qp)))found.add('電話');};
 const notes=Object.values(c.typeNotes||{}).filter(Boolean);add('客戶備註',notes.length?notes:c.notes);add('需求區域',c.areaDisplay);
 for(const d of c.bDemands||[]){add('需求區域',d.areaDisplay,d.areaCity,d.areaCities,d.areaDists,d.areaOther);add('需求社區／路段',d.matchCriteria?.keywords);add('需求備註',d.want,d.noWant,d.notes);}
 add('社區',c.community,c.rCommunity);add('地址',c.sAddr,c.rAddr);
 for(const p of [...(c.sProperties||[]),...(c.rProperties||[]),...(c.deals||[]),...(c.dAddrs||[])]){add('社區',p.community,p.rCommunity);add('地址',p.addr,p.rAddr);add('社區別名',p.aliases);}
 for(const w of Object.values(c.inventoryWatch||{})){add('社區別名',w.aliases);add('追蹤社區',w.community);add('追蹤地址',w.address,w.addresses);}
 const ll=options.landlord;if(ll&&!ll._deleted){const p=ll.rProperties?.[c.linkedPropertyIdx||0];if(p){add('連結物件社區',p.rCommunity);add('連結物件地址',p.rAddr);}}
 for(const log of live(c.contactLog))add('聯繫紀錄',log.memo);
 for(const item of live(c.schedules))add('行程',item.memo);
 for(const item of live(c.doneSchedules))add('已完成行程',item.memo);
 for(const item of live(c.todos))add('待辦',item.memo);
 for(const item of live(c.doneTodos))add('已完成待辦',item.memo);
 for(const [key,label] of [['doneSchedules','已完成行程'],['doneTodos','已完成待辦']])for(const item of live(options.completed?.[key]))if(c.id&&item.clientId===c.id&&!item.personal)add(label,item.memo);
 const f=options.filter||'all';let roles=null;
 if(f==='租案_房東')roles=['landlord'];else if(f==='租案_租客')roles=['tenant'];else if(f!=='all'&&f!=='租案管理'&&options.rental){roles=[];if(options.landlordTypes?.includes(f))roles.push('landlord');if(c.rTenantTypes?.includes(f))roles.push('tenant');if(!roles.length)roles=['landlord'];}
 if(roles){if(roles.includes('landlord'))[{name:c.llName,phone:c.llPhone},...(c.rLandlords||[]).slice(1)].forEach(person);if(roles.includes('tenant'))[{name:c.ttName,phone:c.ttPhone},...(c.rTenants||[]).slice(1)].forEach(person);}
 else{for(const prefix of ['', 'll','tt','s','b','c','d'])person({name:c[prefix?prefix+'Name':'name'],phone:c[prefix?prefix+'Phone':'phone']});[...(c.contacts||[]),...(c.bPersons||[]),...(c.sPersons||[]),...(c.cContacts||[]),...(c.dPersons||[]),...(c.rLandlords||[]).slice(1),...(c.rTenants||[]).slice(1)].forEach(person);}
 return [...found];
}
root.CustomerSearch={reasons};if(typeof module!=='undefined')module.exports=root.CustomerSearch;
})(globalThis);
