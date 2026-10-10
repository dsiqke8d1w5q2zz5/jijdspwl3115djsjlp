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
    notice.innerHTML = '<button type="button" aria-label="關閉提示">×</button><strong>已請求開啟更新工具</strong><p>若瀏覽器詢問，請選擇「開啟」。</p><p>沒有反應？首次使用須下載並執行新版工具一次。</p><a href="./downloads/房仲管家搜尋助手.exe?v=1.0.4" download="房仲管家搜尋助手.exe">首次設定／修復啟動連結</a>';
    notice.querySelector('button').onclick = () => notice.remove();
    document.body.append(notice);
  }
  window.BuyerHelperUpdate = {launch, open:launch};
})();
