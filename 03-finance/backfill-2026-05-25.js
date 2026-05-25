// 一次性腳本：把 stockData.prices 裡的最後收盤資料，回填到 2026-05-25：
//   1) priceHistory[id] 加一筆 {date:'2026-05-25', price: 該檔現價}
//   2) marketHistory 加一筆 {date:'2026-05-25', market: Σ(holdings.shares × prices[id].price)}
// 用法：開啟 finance 頁面 → F12 → Console 貼上 → Enter
// 完成後自己按「雲端上傳」同步
(function() {
    var TARGET_DATE = '2026-05-25';
    if (typeof stockData === 'undefined' || !stockData) {
        console.error('找不到 stockData，先在 finance 頁面開啟再執行');
        return;
    }
    if (!stockData.priceHistory) stockData.priceHistory = {};
    if (!Array.isArray(stockData.marketHistory)) stockData.marketHistory = [];

    var prices = stockData.prices || {};
    var holdings = Array.isArray(stockData.holdings) ? stockData.holdings : [];
    var added = [], skippedExists = [], skippedNoData = [];

    // ── (1) priceHistory ──
    Object.keys(prices).forEach(function(id) {
        var p = prices[id];
        if (!p || typeof p.price !== 'number') {
            skippedNoData.push(id);
            return;
        }
        if (!stockData.priceHistory[id]) stockData.priceHistory[id] = [];
        var arr = stockData.priceHistory[id];
        if (arr.some(function(e){ return e && e.date === TARGET_DATE; })) {
            skippedExists.push(id);
            return;
        }
        arr.push({ date: TARGET_DATE, price: p.price });
        arr.sort(function(a, b){ return (a.date || '').localeCompare(b.date || ''); });
        added.push(id + ' = ' + p.price);
    });

    // ── (2) marketHistory：Σ(shares × price) ──
    var market = 0, contributed = 0;
    holdings.forEach(function(h) {
        if (!h || (h.shares || 0) <= 0) return;
        var p = prices[h.id];
        if (!p || typeof p.price !== 'number') return;
        market += h.shares * p.price;
        contributed++;
    });
    var mhExists = stockData.marketHistory.some(function(e){ return e && e.date === TARGET_DATE; });
    var mhMsg;
    if (mhExists) {
        mhMsg = 'marketHistory ' + TARGET_DATE + ' 已存在，跳過';
    } else if (market > 0) {
        stockData.marketHistory.push({ date: TARGET_DATE, market: market });
        stockData.marketHistory.sort(function(a, b){ return (a.date || '').localeCompare(b.date || ''); });
        mhMsg = 'marketHistory ' + TARGET_DATE + ' = ' + Math.round(market).toLocaleString() + '（合計 ' + contributed + ' 檔持股）';
    } else {
        mhMsg = 'marketHistory 沒寫入（無可用持倉與股價）';
    }

    // 寫回 localStorage
    if (typeof saveStockData === 'function') {
        saveStockData();
    } else {
        localStorage.setItem('finTracker_stock', JSON.stringify(stockData));
    }

    console.log('=== 補 ' + TARGET_DATE + ' 完成 ===');
    console.log('priceHistory 新增 ' + added.length + ' 筆:');
    added.forEach(function(s){ console.log('  ✓ ' + s); });
    if (skippedExists.length) console.log('priceHistory 已存在跳過: ' + skippedExists.join(', '));
    if (skippedNoData.length) console.log('priceHistory 無 prices 資料跳過: ' + skippedNoData.join(', '));
    console.log(mhMsg);
    console.log('');
    console.log('⚠️ 記得到頁面按「雲端上傳」同步！');

    // 順便重畫畫面
    if (typeof renderStock === 'function') renderStock();
})();
