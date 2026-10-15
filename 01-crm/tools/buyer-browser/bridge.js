// Only the CRM page can request a search; no passwords, cookies or customer names are read.
window.addEventListener('message', async e => {
  if(e.source!==window || e.origin!==location.origin || !e.data || e.data.channel!=='CRM_BUYER_REQUEST')return;
  const {id,type,payload}=e.data;
  if(typeof id!=='string'||id.length>80||!['batchSearch','batchStatus','batchRetry','dailyStatus','dailyRetry','dailyRun','hello','search','sync','last','progress','cancel','reload','retry','inventorySync','inventorySearch','inventoryVerify','buyerVerify'].includes(type))return;
  try{let result=await chrome.runtime.sendMessage({type,payload});
    if(result?.__crmTransfer===1){const meta=result,parts=[];let length=0;
      try{for(let index=0;index<meta.count;index++){const part=await chrome.runtime.sendMessage({type:'transferRead',token:meta.token,index});if(part?.error)throw Error(part.error);if(part?.index!==index||typeof part.text!=='string')throw Error('結果分段不完整，請重新讀取結果');parts.push(part.text);length+=part.text.length;}if(length!==meta.length)throw Error('結果長度不符，請重新讀取結果');result=JSON.parse(parts.join(''));}
      finally{await chrome.runtime.sendMessage({type:'transferRelease',token:meta.token}).catch(()=>{});}
    }
    window.postMessage({channel:'CRM_BUYER_RESPONSE',id,result},location.origin);}
  catch(error){window.postMessage({channel:'CRM_BUYER_RESPONSE',id,result:{error:'助手連線或結果傳送失敗：'+String(error.message||error).slice(0,200)+'。請重新載入頁面後讀取結果。'}},location.origin);}
});

const updateVersion=new URL(location.href).searchParams.get("helper-update");if(updateVersion&&sessionStorage.getItem("crm-helper-updated")!==updateVersion){sessionStorage.setItem("crm-helper-updated",updateVersion);chrome.runtime.sendMessage({type:"reload"}).catch(()=>{});}
