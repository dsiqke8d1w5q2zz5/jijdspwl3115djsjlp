// Only the CRM page can request a search; no passwords, cookies or customer names are read.
window.addEventListener('message', async e => {
  if(e.source!==window || e.origin!==location.origin || !e.data || e.data.channel!=='CRM_BUYER_REQUEST')return;
  const {id,type,payload}=e.data;
  if(typeof id!=='string'||id.length>80||!['hello','search','sync','last','progress','cancel'].includes(type))return;
  try{const result=await chrome.runtime.sendMessage({type,payload});window.postMessage({channel:'CRM_BUYER_RESPONSE',id,result},location.origin);}
  catch{window.postMessage({channel:'CRM_BUYER_RESPONSE',id,result:{error:'搜尋助手未能回應，請重新載入頁面。'}},location.origin);}
});
