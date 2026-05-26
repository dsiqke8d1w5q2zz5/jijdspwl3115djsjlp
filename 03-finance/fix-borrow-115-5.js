// 一次性腳本：把 115 年 5 月誤分類在「借　款」（含全形空格）的 15000，合併回「借款」
// 用法：開啟 finance 頁面 → F12 → Console 貼上 → Enter
// 完成後自己按「雲端上傳」同步
(function() {
    var YEAR = '115';
    var BAD = '借　款';   // 全形空格
    var GOOD = '借款';
    if (!DATA || !DATA.income || !DATA.income[YEAR]) {
        console.error('找不到 DATA.income[' + YEAR + ']');
        return;
    }
    var inc = DATA.income[YEAR];
    if (!inc[BAD]) {
        console.log('沒有亂分類「' + BAD + '」，無事可做。');
        return;
    }
    if (!inc[GOOD]) inc[GOOD] = {};

    var moved = 0, monthsMoved = [];
    Object.keys(inc[BAD]).forEach(function(m) {
        var v = inc[BAD][m];
        if (typeof v === 'number') {
            if (v !== 0) {
                inc[GOOD][m] = (inc[GOOD][m] || 0) + v;
                moved += v;
                monthsMoved.push(m + '月 +' + v);
            }
        } else if (Array.isArray(v)) {
            if (!Array.isArray(inc[GOOD][m])) inc[GOOD][m] = [];
            v.forEach(function(item){
                inc[GOOD][m].push(item);
                if (item && typeof item.amount === 'number') {
                    moved += item.amount;
                    monthsMoved.push(m + '月 +' + item.amount);
                }
            });
        }
    });

    // 從分類清單刪掉「借　款」
    delete inc[BAD];

    // 也清掉 settings 裡可能存的同名分類
    try {
        if (DATA.settings && Array.isArray(DATA.settings.incomeCats)) {
            DATA.settings.incomeCats = DATA.settings.incomeCats.filter(function(c){ return c !== BAD; });
        }
    } catch(_){}

    saveData();
    if (typeof renderAll === 'function') renderAll();
    else if (typeof renderIncome === 'function') renderIncome();

    console.log('=== 完成 ===');
    console.log('搬回「' + GOOD + '」共 ' + moved + ' 元');
    monthsMoved.forEach(function(s){ console.log('  ✓ ' + s); });
    console.log('已刪除亂分類「' + BAD + '」');
    console.log('');
    console.log('⚠️ 記得按「雲端上傳」同步！');
})();
