(function(root){
'use strict';
function preferences(value){return {minutes:[0,10,30,60,1440].includes(value?.minutes)?value.minutes:30,allDay:/^([01]\d|2[0-3]):[0-5]\d$/.test(value?.allDay||'')?value.allDay:'08:00'};}
function timing(s,value){
 const p=preferences(value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s.date||'')||(s.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)))return null;
 const start=Date.parse(s.date+'T'+(s.time||'00:00')+':00+08:00');
 if(!Number.isFinite(start)||new Date(start+8*3600000).toISOString().slice(0,10)!==s.date)return null;
 return {start,due:s.time?start-p.minutes*60000:Date.parse(s.date+'T'+p.allDay+':00+08:00')};
}
function items(c,value,changedAt){return (c.schedules||[]).filter(s=>s.remind===true&&!s._deleted&&!s.done&&!c._deleted&&!c.archived&&timing(s,value)&&s.id).map(s=>({id:JSON.stringify([String(c.id),String(s.id)]),...timing(s,value),enabledAt:Math.max(Date.parse(s.reminderSetAt||s.updatedAt||c.updatedAt)||Date.now(),Date.parse(changedAt)||0),title:c._system?'個人行程':c.name||c.sName||'行程',memo:s.memo||'',property:s.propertyRef?.label||'',date:s.date,time:s.time||''}));}
const api={timing,items,preferences};root.ReminderEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
