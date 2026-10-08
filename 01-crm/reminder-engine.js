(function(root){
'use strict';
function timing(s){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s.date||'')||(s.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(s.time)))return null;
 const start=Date.parse(s.date+'T'+(s.time||'08:00')+':00+08:00');
 if(!Number.isFinite(start)||new Date(start+8*3600000).toISOString().slice(0,10)!==s.date)return null;
 return {start,due:start-(s.time?30*60000:0)};
}
function items(c){return (c.schedules||[]).filter(s=>s.remind===true&&!s._deleted&&!s.done&&!c._deleted&&!c.archived&&timing(s)&&s.id).map(s=>({id:JSON.stringify([String(c.id),String(s.id)]),...timing(s),enabledAt:Date.parse(s.reminderSetAt||s.updatedAt||c.updatedAt)||Date.now(),title:c._system?'個人行程':c.name||c.sName||'行程',memo:s.memo||'',property:s.propertyRef?.label||'',date:s.date,time:s.time||''}));}
const api={timing,items};root.ReminderEngine=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
