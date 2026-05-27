// 一次性腳本：刪除 priceHistory 裡所有日期 < CUTOFF 的紀錄
// 你的台股記帳是 5/14 才開始，但你要從 5/21 起算，所以 CUTOFF = 2026-05-21
// 用法：開啟 finance 頁面 → F12 → Console 貼上 → Enter
// 完成後自己按「雲端上傳」同步
(function() {
    var CUTOFF = '2026-05-21';
    if (typeof stockData === 'undefined' || !stockData) {
        console.error('找不到 stockData，先在 finance 頁面開啟再執行');
        return;
    }
    var ph = stockData.priceHistory || {};
    var totalRemoved = 0;
    var perStock = [];

    Object.keys(ph).forEach(function(sid) {
        var arr = ph[sid] || [];
        var before = arr.length;
        var kept = arr.filter(function(e){ return e && e.date && e.date >= CUTOFF; });
        var removed = before - kept.length;
        if (removed > 0) {
            ph[sid] = kept;
            totalRemoved += removed;
            perStock.push(sid + ': 刪 ' + removed + ' 筆，剩 ' + kept.length + ' 筆');
        }
    });

    // 同步處理 marketHistory（也是這個範圍前的不要）
    var mhBefore = (stockData.marketHistory || []).length;
    if (Array.isArray(stockData.marketHistory)) {
        stockData.marketHistory = stockData.marketHistory.filter(function(e){
            return e && e.date && e.date >= CUTOFF;
        });
    }
    var mhRemoved = mhBefore - (stockData.marketHistory || []).length;

    if (typeof saveStockData === 'function') {
        saveStockData();
    } else {
        localStorage.setItem('finTracker_stock', JSON.stringify(stockData));
    }

    console.log('=== 完成 ===');
    console.log('CUTOFF = ' + CUTOFF + '，< CUTOFF 的全部刪掉');
    console.log('priceHistory 共刪 ' + totalRemoved + ' 筆：');
    perStock.forEach(function(s){ console.log('  ✓ ' + s); });
    if (mhRemoved > 0) console.log('marketHistory 也刪 ' + mhRemoved + ' 筆');
    console.log('');
    console.log('⚠️ 記得到頁面按「雲端上傳」同步！');

    if (typeof renderStock === 'function') renderStock();
})();
