chrome.storage.local.get(['last','selection']).then(s=>{document.getElementById('status').textContent='已選 '+(s.selection?.length||0)+' 位自動配對。'+(s.last?'上次完成：'+new Date(s.last.generatedAt).toLocaleString('zh-TW'):'尚未執行搜尋。');});
document.getElementById('open').onclick=()=>chrome.tabs.create({url:'https://dsiqke8d1w5q2zz5.github.io/jijdspwl3115djsjlp/01-crm/'});
