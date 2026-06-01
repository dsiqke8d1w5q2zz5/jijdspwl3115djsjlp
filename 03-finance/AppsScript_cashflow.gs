// 備份檔存放路徑（從 Drive 根目錄起算，依序往下找/建）
var BACKUP_PATH = ['01【個人資料】', 'Claude Code', '03-finance'];
var BACKUP_FILENAME = 'cashflow_backup.json';
var DIVIDEND_CACHE_FILENAME = 'dividend_cache.json';
// FinMind API token（免費帳號，已驗證 email；每小時 600 次）。用於個股配息：現金、股票股利、配息日
var FINMIND_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoib2h5YWJhYnkwMDEiLCJlbWFpbCI6IndhdGVyLmJvYm9AZ21haWwuY29tIiwidG9rZW5fdmVyc2lvbiI6MH0.eACJqXUntBmo1K_L7_gjb9V8bYmiVvF2Z-nUbfjsrB4';

function doPost(e) {
  // 任何錯誤都要回傳，前端用 no-cors 看不到但至少 server log 看得到
  try {
    var data = JSON.parse(e.parameter.payload || e.postData.contents);
    var force = String(e.parameter.force || '') === '1'; // 前端使用者確認後可強制覆寫
    var folder = getFolderByPath(BACKUP_PATH);
    var files = folder.getFilesByName(BACKUP_FILENAME);
    var hasOld = files.hasNext();
    var oldFile = hasOld ? files.next() : null;

    // ── 防呆：避免殘缺/暴跌資料覆蓋雲端好資料（上次「股票只剩兩隻」事故的根因）──
    if (hasOld && !force) {
      var guard = _backupOverwriteGuard(data, oldFile);
      if (guard.block) {
        PropertiesService.getScriptProperties().setProperty('lastPostBlocked',
          new Date().toISOString() + ' ' + guard.reason);
        return ContentService.createTextOutput('blocked: ' + guard.reason);
      }
    }

    // ── 覆蓋前先存一份帶日期的歷史備份（同日只存一次，避免一天多傳塞爆）──
    if (hasOld) {
      try {
        var todayTag = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
        var snapName = 'cashflow_backup_' + todayTag + '.json';
        if (!folder.getFilesByName(snapName).hasNext()) {
          var oldContent = oldFile.getBlob().getDataAsString('UTF-8');
          var snapBlob = Utilities.newBlob(oldContent, 'application/json', snapName);
          folder.createFile(snapBlob);
        }
        _pruneOldSnapshots(folder, 14); // 只保留最近 14 份歷史備份
      } catch (snapErr) {
        // 備份失敗不阻擋主流程，但記錄下來
        PropertiesService.getScriptProperties().setProperty('lastSnapshotError',
          new Date().toISOString() + ' ' + ((snapErr && snapErr.message) || snapErr));
      }
    }

    // ── 寫入主備份 ──
    var jsonStr = JSON.stringify(data);
    if (hasOld) {
      // 用 Blob 強制 UTF-8 寫入，避免中文亂碼
      var blob = Utilities.newBlob(jsonStr, 'application/json', BACKUP_FILENAME);
      oldFile.setContent(blob.getDataAsString('UTF-8'));
    } else {
      folder.createFile(BACKUP_FILENAME, jsonStr, 'application/json');
    }
    // 留下時間戳便於除錯
    PropertiesService.getScriptProperties().setProperty('lastPost', new Date().toISOString());
    return ContentService.createTextOutput('ok');
  } catch (err) {
    PropertiesService.getScriptProperties().setProperty('lastPostError', (err && err.message) || String(err));
    return ContentService.createTextOutput('error: ' + ((err && err.message) || err));
  }
}

// 取出 payload / 備份檔裡的持股陣列（兼容兩種結構）
function _holdingsOf_(obj) {
  if (!obj) return null;
  if (obj.finTracker_stock && Array.isArray(obj.finTracker_stock.holdings)) return obj.finTracker_stock.holdings;
  if (obj.stockData && Array.isArray(obj.stockData.holdings)) return obj.stockData.holdings;
  return null;
}

// 判斷是否該擋下這次覆蓋。回傳 { block:Boolean, reason:String }
// 規則（保守，避免誤擋正常操作）：
//   1. 新資料根本沒有 finTracker（整包空）→ 擋
//   2. 舊有持股 >0，新持股為 0（清空）→ 擋
//   3. 舊有持股 >=4 檔，新持股「少掉一半以上」→ 擋（疑似殘缺 state）
function _backupOverwriteGuard(newData, oldFile) {
  try {
    if (!newData || !newData.finTracker) {
      return { block: true, reason: 'new payload has no finTracker' };
    }
    var oldData = null;
    try { oldData = JSON.parse(oldFile.getBlob().getDataAsString('UTF-8')); } catch (e) { return { block: false, reason: 'old unreadable, allow' }; }
    var oldH = _holdingsOf_(oldData);
    var newH = _holdingsOf_(newData);
    var oldN = oldH ? oldH.length : 0;
    var newN = newH ? newH.length : 0;
    if (oldN > 0 && newN === 0) {
      return { block: true, reason: 'holdings dropped to 0 (was ' + oldN + ')' };
    }
    if (oldN >= 4 && newN < oldN / 2) {
      return { block: true, reason: 'holdings dropped sharply ' + oldN + ' -> ' + newN };
    }
    return { block: false, reason: 'ok (' + oldN + ' -> ' + newN + ')' };
  } catch (err) {
    // 防呆本身出錯時不要擋，以免卡死正常上傳
    return { block: false, reason: 'guard error, allow: ' + ((err && err.message) || err) };
  }
}

// 清掉過舊的歷史備份，只保留最近 keep 份
function _pruneOldSnapshots(folder, keep) {
  var re = /^cashflow_backup_(\d{4}-\d{2}-\d{2})\.json$/;
  var snaps = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    var m = f.getName().match(re);
    if (m) snaps.push({ file: f, tag: m[1] });
  }
  if (snaps.length <= keep) return;
  snaps.sort(function(a, b){ return a.tag < b.tag ? 1 : (a.tag > b.tag ? -1 : 0); }); // 新→舊
  for (var i = keep; i < snaps.length; i++) {
    try { snaps[i].file.setTrashed(true); } catch (e) {}
  }
}

function doGet(e) {
  var action = e.parameter.action || 'backup';
  var cb = e.parameter.callback || 'cb';
  var isJson = e.parameter.format === 'json';

  if (action === 'dividends') {
    var cache = readDividendCache();
    if (isJson) return ContentService.createTextOutput(JSON.stringify(cache)).setMimeType(ContentService.MimeType.JSON);
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(cache) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  if (action === 'refreshDividends') {
    var ids = (e.parameter.ids || '').split(',').map(function(s){return s.trim();}).filter(Boolean);
    if (!ids.length) ids = extractStockIdsFromBackup();
    var result = refreshDividendCache(ids);
    if (isJson) return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(result) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  // Yahoo 即時報價：?action=quote&codes=2330.TW,3081.TWO
  //   回傳 { quotes: { '2330.TW': {price, change, time}, ... } }
  if (action === 'quote') {
    var codes = (e.parameter.codes || '').split(',').map(function(s){return s.trim();}).filter(Boolean);
    var quotes = fetchYahooQuotes_(codes);
    var out = { quotes: quotes };
    if (isJson) return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(out) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  // 歷史每日收盤價：?action=history&ids=2330,3081&from=2026-01&to=2026-05
  //   回傳 { stockId: [{date:'YYYY-MM-DD', price:Number}, ...], ... }
  if (action === 'history') {
    var hids = (e.parameter.ids || '').split(',').map(function(s){return s.trim().toUpperCase();}).filter(Boolean);
    if (!hids.length) hids = extractStockIdsFromBackup();
    var from = e.parameter.from || '';  // 'YYYY-MM'
    var to = e.parameter.to || '';      // 'YYYY-MM'
    var hist = fetchPriceHistory_(hids, from, to);
    if (isJson) return ContentService.createTextOutput(JSON.stringify(hist)).setMimeType(ContentService.MimeType.JSON);
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(hist) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  // ETF 基本面：?action=etfinfo&id=00878
  //   回傳 { id, industries:[{name,pct}], holdings:[{name,code,pct,shares}],
  //          nav:{date, market, nav, premium}, fee:{manage, custody} }
  if (action === 'etfinfo') {
    var etfId = (e.parameter.id || '').trim().toUpperCase();
    var info = fetchEtfInfo_(etfId);
    if (isJson) return ContentService.createTextOutput(JSON.stringify(info)).setMimeType(ContentService.MimeType.JSON);
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(info) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  // 除錯：檢查最近一次 POST 的時間
  if (action === 'debug') {
    var props = PropertiesService.getScriptProperties().getProperties();
    return ContentService.createTextOutput(JSON.stringify(props)).setMimeType(ContentService.MimeType.JSON);
  }

  // 預設：回備份檔
  var folder = getFolderByPath(BACKUP_PATH);
  var files = folder.getFilesByName(BACKUP_FILENAME);
  if (!files.hasNext()) {
    if (isJson) return ContentService.createTextOutput('[]').setMimeType(ContentService.MimeType.JSON);
    return ContentService.createTextOutput(cb + '([])').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  // 強制以 UTF-8 讀檔，避免讀出 Latin-1 亂碼
  var val = files.next().getBlob().getDataAsString('UTF-8');
  if (isJson) return ContentService.createTextOutput(val).setMimeType(ContentService.MimeType.JSON);
  return ContentService.createTextOutput(cb + '(' + val + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getFolderByPath(pathArr) {
  var current = DriveApp.getRootFolder();
  for (var i = 0; i < pathArr.length; i++) {
    var folders = current.getFoldersByName(pathArr[i]);
    current = folders.hasNext() ? folders.next() : current.createFolder(pathArr[i]);
  }
  return current;
}

// ────────────────────────────────────────
// 除權息資料快取
// ────────────────────────────────────────

function readDividendCache() {
  var folder = getFolderByPath(BACKUP_PATH);
  var files = folder.getFilesByName(DIVIDEND_CACHE_FILENAME);
  if (!files.hasNext()) return { updatedAt: null, items: [] };
  try {
    return JSON.parse(files.next().getBlob().getDataAsString('UTF-8'));
  } catch (err) {
    return { updatedAt: null, items: [] };
  }
}

function writeDividendCache(obj) {
  var folder = getFolderByPath(BACKUP_PATH);
  var jsonStr = JSON.stringify(obj);
  var files = folder.getFilesByName(DIVIDEND_CACHE_FILENAME);
  if (files.hasNext()) {
    var blob = Utilities.newBlob(jsonStr, 'application/json', DIVIDEND_CACHE_FILENAME);
    files.next().setContent(blob.getDataAsString('UTF-8'));
  } else {
    folder.createFile(DIVIDEND_CACHE_FILENAME, jsonStr, 'application/json');
  }
}

function extractStockIdsFromBackup() {
  try {
    var folder = getFolderByPath(BACKUP_PATH);
    var files = folder.getFilesByName(BACKUP_FILENAME);
    if (!files.hasNext()) return [];
    var data = JSON.parse(files.next().getBlob().getDataAsString('UTF-8'));
    var holdings = null;
    if (data && data.finTracker_stock && Array.isArray(data.finTracker_stock.holdings)) {
      holdings = data.finTracker_stock.holdings;
    } else if (data && data.stockData && Array.isArray(data.stockData.holdings)) {
      holdings = data.stockData.holdings;
    }
    if (!holdings) return [];
    return holdings.map(function(h) { return (h.id || '').toUpperCase(); }).filter(Boolean);
  } catch (err) {
    return [];
  }
}

function refreshDividendCache(stockIds) {
  var items = [];
  var errors = [];
  var today = new Date();
  var todayStr = Utilities.formatDate(today, 'Asia/Taipei', 'yyyy-MM-dd');

  // ── 累積保存：先把「舊快取」放進來當基底，新抓的與它合併去重，舊資料永不丟 ──
  // 例外：source='Yahoo' 的舊配息筆排除（已停用 Yahoo 配息來源，個股改由 FinMind 提供完整資料，
  // 避免 Yahoo 與 FinMind 除息日差一天造成重複列）。
  try {
    var oldCache = readDividendCache();
    if (oldCache && Array.isArray(oldCache.items)) {
      oldCache.items.forEach(function(x){
        if (x && x.stockId && x.exDate && x.source !== 'Yahoo') items.push(x);
      });
    }
  } catch (e) {}

  var twseItems = fetchTwseDividendPreview_(today);

  stockIds.forEach(function(id) {
    twseItems.filter(function(x) { return x.stockId === id; }).forEach(function(x) {
      items.push(x);
    });
    // ETF 配息（含發放日）：MoneyDJ
    try {
      var mdj = fetchMoneyDJDividend_(id);
      mdj.forEach(function(x) { items.push(x); });
    } catch (err) {
      errors.push(id + ' MoneyDJ: ' + err.message);
    }
    // 個股配息（含發放日、股票股利）：FinMind。
    // 註：已移除 Yahoo 配息來源——個股 FinMind 完整涵蓋，Yahoo 只有現金且除息日常差一天造成重複。
    try {
      var fm = fetchFinMindDividend_(id, todayStr);
      fm.forEach(function(x) { items.push(x); });
    } catch (err) {
      errors.push(id + ' FinMind: ' + err.message);
    }
    Utilities.sleep(300);
  });

  // 去重 key = stockId|exDate；同 key 時保留 cash 較大者（避免某來源回 0 擋掉好資料）。
  // 配息日、股票股利是稀有欄位（多半只有 FinMind 給），不論誰勝出都從另一筆補齊，避免遺失。
  var byKey = {};
  items.forEach(function(x) {
    var key = x.stockId + '|' + x.exDate;
    var prev = byKey[key];
    if (!prev) { byKey[key] = x; return; }
    var winner, loser;
    if ((Number(x.cash) || 0) > (Number(prev.cash) || 0)) { winner = x; loser = prev; }
    else { winner = prev; loser = x; }
    if (!winner.payDate && loser.payDate) winner.payDate = loser.payDate;
    if (!(Number(winner.stockDiv) || 0) && (Number(loser.stockDiv) || 0)) winner.stockDiv = loser.stockDiv;
    byKey[key] = winner;
  });
  var dedup = Object.keys(byKey).map(function(k){ return byKey[k]; });
  dedup.sort(function(a, b) { return a.exDate.localeCompare(b.exDate); });

  var result = {
    updatedAt: todayStr,
    items: dedup,
    errors: errors
  };
  writeDividendCache(result);
  return result;
}

function fetchTwseDividendPreview_(today) {
  var end = new Date(today.getTime() + 90 * 86400000);
  var fmt = function(d) { return Utilities.formatDate(d, 'Asia/Taipei', 'yyyyMMdd'); };
  var url = 'https://www.twse.com.tw/exchangeReport/TWT48U?response=json&strDate=' + fmt(today) + '&endDate=' + fmt(end);
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return [];
    var json = JSON.parse(res.getContentText());
    if (!json.data) return [];
    return json.data.map(function(row) {
      var rocDate = row[0];
      var m = rocDate.match(/(\d+)年(\d+)月(\d+)日/);
      var exDate = m ? (parseInt(m[1], 10) + 1911) + '-' + pad2_(m[2]) + '-' + pad2_(m[3]) : '';
      var cash = parseFloat(row[7]) || 0;
      return {
        stockId: row[1],
        stockName: row[2],
        exDate: exDate,
        payDate: '',
        cash: cash,
        stockDiv: 0,
        source: 'TWSE'
      };
    }).filter(function(x) { return x.exDate; });
  } catch (err) {
    return [];
  }
}

function fetchMoneyDJDividend_(stockId) {
  var url = 'https://www.moneydj.com/ETF/X/Basic/Basic0005.xdjhtm?etfid=' + stockId + '.TW';
  var res = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  if (res.getResponseCode() !== 200) return [];
  var html = res.getContentText();
  var rows = [];
  var trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  var m;
  var dateRe = /(20\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})/;
  var toIso = function(dm) { return dm[1] + '-' + pad2_(dm[2]) + '-' + pad2_(dm[3]); };
  while ((m = trRe.exec(html)) !== null) {
    var tr = m[1];
    var cells = [];
    var tdRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    var c;
    while ((c = tdRe.exec(tr)) !== null) {
      var text = c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
      cells.push(text);
    }
    if (cells.length < 4) continue;
    var d0 = cells[0].match(dateRe);
    var d1 = cells[1].match(dateRe);
    if (!d1) continue;
    var exDate = toIso(d1);
    var d3 = cells[3] ? cells[3].match(dateRe) : null;
    var payDate = d3 ? toIso(d3) : '';
    var cash = 0;
    if (cells[5]) {
      var n = parseFloat(cells[5]);
      if (!isNaN(n) && n > 0) cash = n;
    }
    if (cash === 0) {
      for (var i = 2; i < cells.length; i++) {
        var nn = parseFloat(cells[i]);
        if (!isNaN(nn) && nn > 0 && nn < 100) { cash = nn; break; }
      }
    }
    rows.push({
      stockId: stockId,
      stockName: '',
      exDate: exDate,
      payDate: payDate,
      cash: cash,
      stockDiv: 0,
      source: 'MoneyDJ'
    });
  }
  return rows;
}

// ────────────────────────────────────────
// ETF 基本面（MoneyDJ 隱藏 API）：產業分佈、持股明細、淨值折溢價、費率
// ────────────────────────────────────────
function fetchEtfInfo_(stockId) {
  var out = { id: stockId, industries: [], holdings: [], nav: null, fee: null, suffix: '' };
  if (!stockId) return out;
  // 先決定後綴：.TW（上市）優先，持股明細抓不到再試 .TWO（上櫃）
  var suffix = _etfResolveSuffix_(stockId);
  out.suffix = suffix;
  var a = stockId + suffix;

  // 產業分佈（依產業表格）：V3 產業名、V4 比例%
  try {
    var indJson = _etfJsonData_('Basic0007A', a);
    if (indJson && indJson.ResultSet && Array.isArray(indJson.ResultSet.Result)) {
      indJson.ResultSet.Result.forEach(function(r){
        var name = r.V3, pct = parseFloat(r.V4);
        if (name && !isNaN(pct)) out.industries.push({ name: name, pct: pct });
      });
    }
  } catch (e1) {}

  // 持股明細：V3 名稱、V4 比例%、V5 股數、V6 代號
  try {
    var holdJson = _etfJsonData_('Basic0007B', a);
    if (holdJson && holdJson.ResultSet && Array.isArray(holdJson.ResultSet.Result)) {
      holdJson.ResultSet.Result.forEach(function(r){
        var name = r.V3, pct = parseFloat(r.V4);
        if (name && !isNaN(pct)) {
          out.holdings.push({
            name: name,
            pct: pct,
            shares: parseFloat(r.V5) || 0,
            code: (r.V6 || '').replace(/\.(TW|TWO)$/i, '')
          });
        }
      });
    }
  } catch (e2) {}

  // 淨值 / 折溢價（xdjbcd 三行：日期、市價、淨值）
  try {
    out.nav = _etfNavPremium_(a);
  } catch (e3) {}

  // 費率（Basic0004 HTML：經理費、保管費）
  try {
    out.fee = _etfFee_(a);
  } catch (e4) {}

  // 配息頻率（Basic0004 HTML：官方章程值，月配/季配/半年配/年配/不配息）
  try {
    out.dividendFreq = _etfDividendFreq_(a);
  } catch (e6) {}

  // 成分股變動（與前一日快照比對：新增/移除）
  try {
    out.changes = _etfHoldingChanges_(stockId);
  } catch (e5) {}

  return out;
}

// 試 .TW 再 .TWO，回傳能抓到持股明細的後綴（抓不到預設 .TW）
function _etfResolveSuffix_(stockId) {
  var tries = ['.TW', '.TWO'];
  for (var i = 0; i < tries.length; i++) {
    try {
      var j = _etfJsonData_('Basic0007B', stockId + tries[i]);
      if (j && j.ResultSet && Array.isArray(j.ResultSet.Result) && j.ResultSet.Result.length > 0) {
        return tries[i];
      }
    } catch (e) {}
  }
  return '.TW';
}

// 打 MoneyDJ etfjsondata API（回 JSON 物件）
function _etfJsonData_(x, a) {
  var url = 'https://www.moneydj.com/jsondata/etf/etfjsondata.xdjjson?frameid=w&type=etf&x=' + x + '&a=' + encodeURIComponent(a);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (res.getResponseCode() !== 200) return null;
  return JSON.parse(res.getContentText());
}

// 淨值折溢價：抓近一個月 xdjbcd，取最後一日，回 {date, market, nav, premium}
function _etfNavPremium_(a) {
  var today = new Date();
  var end = Utilities.formatDate(today, 'Asia/Taipei', 'yyyyMMdd');
  var start = Utilities.formatDate(new Date(today.getTime() - 35 * 86400000), 'Asia/Taipei', 'yyyyMMdd');
  var url = 'https://www.moneydj.com/ETF/X/xdjbcd/Basic0003BCD.xdjbcd?etfid=' + encodeURIComponent(a) + '&b=' + start + '&c=' + end;
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (res.getResponseCode() !== 200) return null;
  var txt = res.getContentText().trim();
  if (!txt) return null;
  var lines = txt.split(/\r?\n/);
  if (lines.length < 3) return null;
  var dates = lines[0].trim().split(/\s+/);
  var markets = lines[1].trim().split(/\s+/);
  var navs = lines[2].trim().split(/\s+/);
  var n = dates.length;
  if (n < 1) return null;
  var market = parseFloat(markets[n - 1]);
  var nav = parseFloat(navs[n - 1]);
  var dateRaw = dates[n - 1]; // yyyyMMdd
  var dateIso = dateRaw.length === 8 ? dateRaw.slice(0,4) + '-' + dateRaw.slice(4,6) + '-' + dateRaw.slice(6,8) : dateRaw;
  if (isNaN(market) || isNaN(nav) || nav <= 0) return null;
  return {
    date: dateIso,
    market: Math.round(market * 100) / 100,
    nav: Math.round(nav * 100) / 100,
    premium: Math.round((market - nav) / nav * 10000) / 100 // 折溢價 %
  };
}

// 費率：Basic0004 頁面 HTML 抓「經理費(%) x」「保管費(%) x」
function _etfFee_(a) {
  var url = 'https://www.moneydj.com/ETF/X/Basic/Basic0004.xdjhtm?etfid=' + encodeURIComponent(a);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (res.getResponseCode() !== 200) return null;
  var html = res.getContentText();
  // 去 tag 後找「經理費(%) 0.2」「保管費(%) 0.035」
  var text = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
  var fee = {};
  var mManage = text.match(/經理費\s*\(%\)\s*([0-9]+(?:\.[0-9]+)?)/);
  var mCustody = text.match(/保管費\s*\(%\)\s*([0-9]+(?:\.[0-9]+)?)/);
  var mTotal = text.match(/總管理費用\s*\(%\)\s*([0-9]+(?:\.[0-9]+)?)/);
  if (mManage) fee.manage = parseFloat(mManage[1]);
  if (mCustody) fee.custody = parseFloat(mCustody[1]);
  if (mTotal) fee.total = parseFloat(mTotal[1]); // 內扣總成本（經理+保管+其他）
  if (fee.manage === undefined && fee.custody === undefined && fee.total === undefined) return null;
  return fee;
}

// 從 MoneyDJ Basic0004 抓「配息頻率」官方章程值（月配/季配/半年配/年配/不配息），抓不到回 ''
function _etfDividendFreq_(a) {
  var url = 'https://www.moneydj.com/ETF/X/Basic/Basic0004.xdjhtm?etfid=' + encodeURIComponent(a);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (res.getResponseCode() !== 200) return '';
  var html = res.getContentText().replace(/\r?\n/g, ' ');
  // <th ...>配息頻率</th> ... <td ...>季配</td>
  var m = html.match(/配息頻率\s*<\/th>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>/);
  if (m && m[1]) {
    var v = m[1].trim();
    if (v && v !== '--' && v.toUpperCase() !== 'N/A') return v;
  }
  return '';
}

function fetchFinMindDividend_(stockId, todayStr) {
  // 抓過去 5 年配息歷史（歷史配息分頁多年可看）；新抓的會與舊快取累積合併
  var startDate = dividendHistoryStartStr_(todayStr);
  var url = 'https://api.finmindtrade.com/api/v4/data?dataset=TaiwanStockDividend&data_id=' + encodeURIComponent(stockId) + '&start_date=' + startDate;
  if (FINMIND_TOKEN) url += '&token=' + encodeURIComponent(FINMIND_TOKEN);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) return [];
  var json;
  try { json = JSON.parse(res.getContentText()); } catch (e) { return []; }
  if (!json || json.status !== 200 || !Array.isArray(json.data)) return [];
  var rows = [];
  json.data.forEach(function(d) {
    var exDate = d.CashExDividendTradingDate || d.StockExDividendTradingDate || '';
    if (!exDate) return;
    if (exDate < startDate) return; // 早於一年前的不要
    // 現金每股 = 盈餘 + 公積；股票股利(元/股) = 盈餘配股 + 公積配股
    var cash = (parseFloat(d.CashEarningsDistribution) || 0) + (parseFloat(d.CashStatutorySurplus) || 0);
    var stockDiv = (parseFloat(d.StockEarningsDistribution) || 0) + (parseFloat(d.StockStatutorySurplus) || 0);
    if (cash <= 0 && stockDiv <= 0) return; // 現金與股票都 0 的空配息不收
    rows.push({
      stockId: stockId,
      stockName: '',
      exDate: exDate,
      payDate: d.CashDividendPaymentDate || '',
      cash: Math.round(cash * 1000000) / 1000000,
      stockDiv: Math.round(stockDiv * 1000000) / 1000000,
      source: 'FinMind'
    });
  });
  return rows;
}

// 'YYYY-MM-DD' → 往回推 N 個月、日固定 1 號的 'YYYY-MM-DD'（避免月底跨月進位 bug）
function monthsAgoStr_(todayStr, months) {
  var p = String(todayStr).split('-');
  var y = parseInt(p[0], 10);
  var m = parseInt(p[1], 10); // 1-12
  var total = (y * 12 + (m - 1)) - months;
  var ny = Math.floor(total / 12);
  var nm = (total % 12 + 12) % 12 + 1; // 1-12（防負數取模）
  return ny + '-' + pad2_(nm) + '-01';
}
// 約一年又一個月前（殖利率年化用，需滿 12 個月 + 緩衝）
function oneYearAgoStr_(todayStr) {
  return monthsAgoStr_(todayStr, 13);
}
// 配息歷史抓取起點：5 年又一個月前（讓歷史配息分頁可看多年；新抓的會與舊快取累積合併）
function dividendHistoryStartStr_(todayStr) {
  return monthsAgoStr_(todayStr, 61);
}

function pad2_(s) {
  s = String(s);
  return s.length < 2 ? '0' + s : s;
}

function dailyRefreshDividendCache() {
  var ids = extractStockIdsFromBackup();
  if (ids.length === 0) return;
  refreshDividendCache(ids);
}

// 安裝/重建配息快取觸發器：改為每 4 小時跑一次（執行一次即可）。
// 會先刪掉舊的 dailyRefreshDividendCache 觸發器，避免重複。
function setupDividendTrigger4h() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'dailyRefreshDividendCache') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('dailyRefreshDividendCache')
    .timeBased()
    .everyHours(4)
    .create();
}

// ────────────────────────────────────────
// ETF 持股快照（偵測成分股新增/移除）
// ────────────────────────────────────────
var ETF_SNAPSHOT_FILENAME = 'etf_holdings_snapshot.json';

function readEtfSnapshot_() {
  var folder = getFolderByPath(BACKUP_PATH);
  var files = folder.getFilesByName(ETF_SNAPSHOT_FILENAME);
  if (!files.hasNext()) return { prev: null, curr: null };
  try { return JSON.parse(files.next().getBlob().getDataAsString('UTF-8')); }
  catch (e) { return { prev: null, curr: null }; }
}

function writeEtfSnapshot_(obj) {
  var folder = getFolderByPath(BACKUP_PATH);
  var jsonStr = JSON.stringify(obj);
  var files = folder.getFilesByName(ETF_SNAPSHOT_FILENAME);
  if (files.hasNext()) {
    var blob = Utilities.newBlob(jsonStr, 'application/json', ETF_SNAPSHOT_FILENAME);
    files.next().setContent(blob.getDataAsString('UTF-8'));
  } else {
    folder.createFile(ETF_SNAPSHOT_FILENAME, jsonStr, 'application/json');
  }
}

// 每日觸發：抓持有 ETF（00 開頭）的成分股代號清單，curr 輪替為 prev 後存新 curr。
// 同一天重跑只覆蓋 curr、不動 prev（避免一天多跑把 prev 洗掉）。
function dailyEtfHoldingsSnapshot() {
  var ids = extractStockIdsFromBackup().filter(function(id){ return /^00/.test(id); });
  if (!ids.length) return;
  var todayStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
  var byEtf = {};
  ids.forEach(function(id){
    try {
      var suffix = _etfResolveSuffix_(id);
      var j = _etfJsonData_('Basic0007B', id + suffix);
      var codes = [];
      if (j && j.ResultSet && Array.isArray(j.ResultSet.Result)) {
        j.ResultSet.Result.forEach(function(r){
          var code = (r.V6 || '').replace(/\.(TW|TWO)$/i, '');
          if (code) codes.push({ code: code, name: r.V3 || '' });
        });
      }
      if (codes.length) byEtf[id] = codes;
    } catch (e) {}
    Utilities.sleep(200);
  });
  if (!Object.keys(byEtf).length) return;

  var snap = readEtfSnapshot_();
  var newCurr = { date: todayStr, byEtf: byEtf };
  // 同一天重跑：只更新 curr，prev 不變
  if (snap.curr && snap.curr.date === todayStr) {
    snap.curr = newCurr;
  } else {
    snap.prev = snap.curr || null; // 昨天的變前一份
    snap.curr = newCurr;
  }
  snap.updatedAt = todayStr;
  writeEtfSnapshot_(snap);
}

// 比對某 ETF 的 prev vs curr 成分股，回 { added:[{code,name}], removed:[{code,name}], prevDate, currDate }；無從比對回 null
function _etfHoldingChanges_(etfId) {
  var snap = readEtfSnapshot_();
  if (!snap || !snap.curr || !snap.prev) return null;
  var cur = (snap.curr.byEtf && snap.curr.byEtf[etfId]) || null;
  var prev = (snap.prev.byEtf && snap.prev.byEtf[etfId]) || null;
  if (!cur || !prev) return null;
  // 兼容舊快照（純字串陣列）與新結構（{code,name}）
  var norm = function(arr){ return arr.map(function(x){ return (typeof x === 'string') ? { code: x, name: '' } : x; }); };
  cur = norm(cur); prev = norm(prev);
  var prevSet = {}; prev.forEach(function(c){ prevSet[c.code] = true; });
  var curSet = {}; cur.forEach(function(c){ curSet[c.code] = true; });
  var added = cur.filter(function(c){ return !prevSet[c.code]; });
  var removed = prev.filter(function(c){ return !curSet[c.code]; });
  if (!added.length && !removed.length) return null;
  return { added: added, removed: removed, prevDate: snap.prev.date, currDate: snap.curr.date };
}

// ────────────────────────────────────────
// Yahoo 即時報價（用 v8 chart API；v7 quote 已被擋）
// ────────────────────────────────────────
// codes: ['2330.TW', '3081.TWO', ...]
// 回傳 { '2330.TW': { price, change, time }, ... }（抓不到的不放進去）
function fetchYahooQuotes_(codes) {
  var quotes = {};
  if (!codes || !codes.length) return quotes;
  var requests = codes.map(function(code) {
    return {
      url: 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(code) + '?interval=1d&range=1d',
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    };
  });
  var responses;
  try {
    responses = UrlFetchApp.fetchAll(requests);
  } catch (err) {
    return quotes;
  }
  responses.forEach(function(res, i) {
    var code = codes[i];
    try {
      if (res.getResponseCode() !== 200) return;
      var json = JSON.parse(res.getContentText());
      var result = json && json.chart && json.chart.result && json.chart.result[0];
      if (!result || !result.meta) return;
      var meta = result.meta;
      var price = meta.regularMarketPrice;
      var prevClose = (typeof meta.chartPreviousClose === 'number') ? meta.chartPreviousClose
                    : (typeof meta.previousClose === 'number') ? meta.previousClose : null;
      if (typeof price !== 'number') return;
      var change = (prevClose !== null) ? (price - prevClose) : 0;
      quotes[code] = {
        price: price,
        change: change,
        time: meta.regularMarketTime || 0
      };
    } catch (e) { /* 單檔失敗略過 */ }
  });
  return quotes;
}

// ────────────────────────────────────────
// 歷史每日收盤價（用 Yahoo v8 chart；TWSE/TPEX 官方 API 從 Google 伺服器 IP 常被擋而回空）
// ────────────────────────────────────────

// 'YYYY-MM' → 該月 1 日 00:00 的 epoch 秒（台灣時區，用 GAS server 當地時間近似即可）
function monthStartEpoch_(ym) {
  if (!/^\d{4}-\d{2}$/.test(ym)) return null;
  var y = parseInt(ym.slice(0,4),10), m = parseInt(ym.slice(5,7),10);
  return Math.floor(new Date(y, m - 1, 1, 0, 0, 0).getTime() / 1000);
}
// 'YYYY-MM' → 下個月 1 日 epoch 秒（含當月整月）
function monthEndEpoch_(ym) {
  if (!/^\d{4}-\d{2}$/.test(ym)) return null;
  var y = parseInt(ym.slice(0,4),10), m = parseInt(ym.slice(5,7),10);
  return Math.floor(new Date(y, m, 1, 0, 0, 0).getTime() / 1000);
}

// 主函式：回傳 { stockId: [{date, price}, ...] }
// 每檔先試 .TW（上市），抓不到再試 .TWO（上櫃）。用 fetchAll 並行。
function fetchPriceHistory_(ids, from, to) {
  var result = {};
  if (!ids || !ids.length) return result;
  var p1 = monthStartEpoch_(from);
  var p2 = monthEndEpoch_(to);
  if (p1 === null || p2 === null) { ids.forEach(function(id){ result[id] = []; }); return result; }

  function buildReq(code) {
    return {
      url: 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(code) +
           '?period1=' + p1 + '&period2=' + p2 + '&interval=1d',
      muteHttpExceptions: true,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    };
  }
  function parseChart(res) {
    try {
      if (!res || res.getResponseCode() !== 200) return null;
      var json = JSON.parse(res.getContentText());
      var r = json && json.chart && json.chart.result && json.chart.result[0];
      if (!r || !r.timestamp || !r.indicators || !r.indicators.quote || !r.indicators.quote[0]) return null;
      var ts = r.timestamp;
      var closes = r.indicators.quote[0].close || [];
      var out = [];
      for (var i = 0; i < ts.length; i++) {
        var c = closes[i];
        if (typeof c !== 'number') continue;
        var d = new Date(ts[i] * 1000);
        var ymd = Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd');
        out.push({ date: ymd, price: Math.round(c * 100) / 100 });
      }
      return out;
    } catch (e) { return null; }
  }

  // 第一輪：.TW
  var twReqs = ids.map(function(id){ return buildReq(id + '.TW'); });
  var twRes;
  try { twRes = UrlFetchApp.fetchAll(twReqs); } catch (e) { twRes = []; }
  var needTwo = [];
  ids.forEach(function(id, i) {
    var rows = parseChart(twRes[i]);
    if (rows && rows.length) result[id] = rows;
    else needTwo.push(id);
  });

  // 第二輪：.TWO（上櫃）
  if (needTwo.length) {
    var twoReqs = needTwo.map(function(id){ return buildReq(id + '.TWO'); });
    var twoRes;
    try { twoRes = UrlFetchApp.fetchAll(twoReqs); } catch (e) { twoRes = []; }
    needTwo.forEach(function(id, i) {
      var rows = parseChart(twoRes[i]);
      result[id] = (rows && rows.length) ? rows : [];
    });
  }
  return result;
}
