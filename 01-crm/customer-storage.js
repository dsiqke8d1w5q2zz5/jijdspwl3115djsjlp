/* Lossless local customer storage; cloud payloads and exports remain ordinary JSON. */
(function(root){
 'use strict';
 const prefix='CRM-LZ1:';
 function decode(value){
  if(value==null||!value.startsWith(prefix))return value;
  const json=root.LZString.decompressFromUTF16(value.slice(prefix.length));
  if(!json)throw Error('客戶資料解壓縮失敗，請保留本機資料並匯出備份');
  JSON.parse(json);return json;
 }
 function get(){try{return decode(localStorage.getItem('reCRM'));}catch(e){root.CRMCustomerStorage.readError=true;throw e;}}
 function set(value){
  // Compression finishes before the atomic setItem: a failed write retains the old copy.
  if(root.CRMCustomerStorage.readError)throw Error('本機資料讀取失敗，已停止覆寫');
  const packed=value.length>200000&&root.LZString?prefix+root.LZString.compressToUTF16(value):value;
  try{localStorage.setItem('reCRM',packed.length<value.length?packed:value);root.CRMCustomerStorage.failed=false;}catch(e){root.CRMCustomerStorage.failed=true;throw e;}
 }
 root.CRMCustomerStorage={get,set,decode};
})(window);
