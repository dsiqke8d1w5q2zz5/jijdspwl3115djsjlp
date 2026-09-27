/* Centered confirmation for a verified cloud upload. */
(function () {
    'use strict';
    let dialog, previousFocus;
    window.showSyncSuccess = function () {
        if (!dialog) {
            const style = document.createElement('style');
            style.textContent = '#crmSyncNotice{position:fixed;inset:0;margin:auto;box-sizing:border-box;width:min(380px,calc(100vw - 32px));max-height:calc(100dvh - 32px);padding:28px;border:0;border-radius:16px;background:#fff;color:#173756;box-shadow:0 16px 60px #0004;text-align:center;font-family:inherit}#crmSyncNotice::backdrop{background:#102b4666}#crmSyncNotice h2{margin:0 0 12px;font-size:22px}#crmSyncNotice p{margin:0 0 24px;line-height:1.6;font-size:16px;color:#57534e}#crmSyncNotice button{min-width:100px;min-height:44px;border:0;border-radius:9px;padding:10px 24px;background:#173756;color:#fff;font:inherit;cursor:pointer}#crmSyncNotice button:focus-visible{outline:3px solid #0891b2;outline-offset:3px}';
            document.head.append(style);
            dialog = document.createElement('dialog');
            dialog.id = 'crmSyncNotice';
            dialog.setAttribute('aria-labelledby', 'crmSyncNoticeTitle');
            dialog.setAttribute('aria-describedby', 'crmSyncNoticeMessage');
            dialog.innerHTML = '<h2 id="crmSyncNoticeTitle">已同步至雲端</h2><p id="crmSyncNoticeMessage">手機與電腦可讀取最新資料。</p><button type="button" autofocus>確定</button>';
            dialog.querySelector('button').onclick = () => dialog.close();
            dialog.addEventListener('close', () => { if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true}); });
            document.body.append(dialog);
        }
        if (dialog.open) return;
        previousFocus = document.activeElement;
        dialog.showModal();
    };
})();
