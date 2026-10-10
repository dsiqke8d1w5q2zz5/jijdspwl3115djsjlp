(function () {
  'use strict';
  let dialog, generation = 0;
  function installedVersion() {
    return new Promise(resolve => {
      const id = 'helper-update-' + crypto.randomUUID();
      const finish = value => { clearTimeout(timer); window.removeEventListener('message', receive); resolve(value); };
      const receive = e => {
        if (e.source === window && e.origin === location.origin && e.data?.channel === 'CRM_BUYER_RESPONSE' && e.data.id === id)
          finish(e.data.result?.extensionVersion || '');
      };
      const timer = setTimeout(() => finish(''), 3000);
      window.addEventListener('message', receive);
      window.postMessage({channel:'CRM_BUYER_REQUEST', id, type:'hello'}, location.origin);
    });
  }
  async function check(owner) {
    const turn = ++generation, current = owner.querySelector('[data-current]'), latest = owner.querySelector('[data-latest]'), note = owner.querySelector('[data-status]'), retry = owner.querySelector('[data-check]');
    current.textContent = latest.textContent = '確認中…'; note.textContent = ''; retry.disabled = true;
    const [installed, release] = await Promise.all([
      installedVersion(),
      fetch('./downloads/buyer-helper-release.json?t=' + Date.now(), {cache:'no-store', signal:AbortSignal.timeout(8000)})
        .then(r => { if (!r.ok) throw Error(); return r.json(); })
        .then(r => { if (!/^\d{1,9}(?:\.\d{1,9}){2,3}$/.test(r.version)) throw Error(); return r.version; })
        .catch(() => '')
    ]);
    if (turn !== generation || !owner.open) return;
    current.textContent = installed ? 'v' + installed : '未連接';
    latest.textContent = release ? 'v' + release : '暫時無法取得';
    note.textContent = !release ? '可開啟更新工具取得最新版，或稍後重新檢查。' : !installed ? '請在已安裝助手的 Chrome 開啟；尚未安裝也可使用下方工具。' : installed.localeCompare(release, undefined, {numeric:true}) >= 0 ? '目前助手已是此網站提供的最新版。' : '有新版本，開啟更新工具即可更新。';
    owner.querySelector('[data-download]').href = './downloads/房仲管家搜尋助手.exe' + (release ? '?v=' + encodeURIComponent(release) : '');
    retry.disabled = false;
  }
  function open() {
    if (dialog?.open) { check(dialog); return; }
    const opener = document.activeElement;
    const owner = document.createElement('dialog'); dialog = owner; owner.className = 'helper-update-dialog'; owner.setAttribute('aria-labelledby','helperUpdateTitle');
    owner.innerHTML = '<header><h2 id="helperUpdateTitle">更新小助手</h2><button type="button" data-close aria-label="關閉">×</button></header><dl><div><dt>目前版本</dt><dd data-current>確認中…</dd></div><div><dt>最新版本</dt><dd data-latest>確認中…</dd></div></dl><p data-status role="status"></p><p>在 Windows 電腦下載並開啟 EXE，工具會更新原本的助手資料夾。已有更新工具，也可以直接執行原本的 EXE。</p><p>完成後重新整理網頁；需要補齊物件欄位時，再按「立即搜尋物件」。</p><footer><button type="button" data-check>重新檢查</button><a data-download href="./downloads/房仲管家搜尋助手.exe" download="房仲管家搜尋助手.exe">下載更新工具（EXE）</a></footer>';
    owner.querySelector('[data-close]').onclick = () => owner.close();
    owner.querySelector('[data-check]').onclick = () => check(owner);
    owner.addEventListener('close', () => { ++generation; owner.remove(); if (dialog === owner) dialog = null; opener?.focus(); });
    document.body.append(owner); owner.showModal(); check(owner);
  }
  window.BuyerHelperUpdate = {open};
})();
