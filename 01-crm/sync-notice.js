/* Mobile keeps confirmation; desktop sync feedback never captures focus. */
(function () {
    'use strict';
    let notice, timer, dialog, previousFocus;
    const mobile = matchMedia('(max-width: 1049px) and (pointer: coarse)');
    mobile.addEventListener('change', () => { if (!mobile.matches && dialog?.open) dialog.close(); });
    window.showSyncSuccess = function (manual) {
        if (mobile.matches) {
            if (notice) notice.hidden = true;
            if (!dialog) {
                const style = document.createElement('style');
                style.textContent = '#crmSyncDialog{position:fixed;top:env(safe-area-inset-top,0px);bottom:env(safe-area-inset-bottom,0px);left:0;right:0;margin:auto;width:min(380px,calc(100vw - 32px));max-height:calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 32px);overflow:auto;box-sizing:border-box;padding:24px;border:0;border-radius:16px;background:white;color:#173756;text-align:center;font-family:inherit}#crmSyncDialog::backdrop{background:#102b4666}#crmSyncDialog h2{margin:0 0 12px;font-size:22px}#crmSyncDialog p{margin:0 0 20px;line-height:1.6;color:#57534e}#crmSyncDialog button{min-width:100px;min-height:44px;border:0;border-radius:9px;padding:10px 24px;background:#173756;color:white;font:inherit;cursor:pointer}';
                document.head.append(style);
                dialog = document.createElement('dialog');
                dialog.id = 'crmSyncDialog';
                dialog.setAttribute('aria-labelledby', 'crmSyncDialogTitle');
                dialog.innerHTML = '<h2 id="crmSyncDialogTitle">已同步至雲端</h2><p>手機與電腦可讀取最新資料。</p><button type="button" autofocus>確定</button>';
                dialog.querySelector('button').onclick = () => dialog.close();
                dialog.addEventListener('close', () => { if (previousFocus?.isConnected) previousFocus.focus({preventScroll:true}); });
                document.body.append(dialog);
            }
            if (!dialog.open) { previousFocus = document.activeElement; dialog.showModal(); }
            return;
        }
        if (manual !== true) return;
        if (!notice) {
            const style = document.createElement('style');
            style.textContent = '#crmSyncNotice{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));max-width:calc(100vw - 32px);box-sizing:border-box;padding:12px 18px;border-radius:10px;background:#173756;color:white;box-shadow:0 4px 16px #0002;font:14px/1.5 sans-serif;z-index:99999;pointer-events:none}#crmSyncNotice[hidden]{display:none}';
            document.head.append(style);
            notice = document.createElement('div');
            notice.id = 'crmSyncNotice';
            notice.setAttribute('role', 'status');
            notice.setAttribute('aria-live', 'polite');
            document.body.append(notice);
        }
        notice.textContent = '已同步至雲端';
        notice.hidden = false;
        clearTimeout(timer);
        timer = setTimeout(() => { notice.hidden = true; }, 3000);
    };
})();
