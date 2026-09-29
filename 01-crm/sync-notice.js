/* Verified manual sync feedback never interrupts editing or captures focus. */
(function () {
    'use strict';
    let notice, timer;
    window.showSyncSuccess = function (manual) {
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
