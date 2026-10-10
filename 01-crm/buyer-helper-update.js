(function () {
  'use strict';
  function launch() {
    // Keep this synchronous so the browser retains the user's click gesture.
    const link = document.createElement('a');
    link.href = 'crm-buyer-helper://update';
    document.body.append(link); link.click(); link.remove();
    document.querySelector('.helper-launch-notice')?.remove();
    const notice = document.createElement('aside');
    notice.className = 'helper-launch-notice'; notice.setAttribute('role','status');
    notice.innerHTML = '<button type="button" aria-label="關閉提示">×</button><strong>正在嘗試開啟更新工具</strong><p>若瀏覽器詢問，請選擇「開啟」。此提示不代表工具已啟動。</p><p>沒有開啟？請下載並直接執行新版 EXE 一次，修復這台電腦的啟動連結，再回來重試。</p><a href="./downloads/房仲管家搜尋助手.exe?v=1.0.5" download="房仲管家搜尋助手.exe">下載啟動連結修復工具（EXE）</a>';
    notice.querySelector('button').onclick = () => notice.remove();
    document.body.append(notice);
  }
  window.BuyerHelperUpdate = {launch, open:launch};
})();
