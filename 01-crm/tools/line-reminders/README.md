# 行程提醒服務

前端每筆行程只需勾選「提醒我」。台灣時間：有時間的行程提前 30 分鐘，全天行程當天 08:00。預設關閉，新勾選時若已過提醒時間不補發。

## 部署

1. 使用官方 Wrangler 登入 Cloudflare，權限只需 account:read、user:read、workers:write、d1:write（工具會另帶背景登入權限）。
2. `npx wrangler d1 create crm-reminders`，把回傳的 database_id 填入 wrangler.jsonc。
3. `npx wrangler d1 execute crm-reminders --remote --file schema.sql`。
4. 在 Cloudflare 設定三個 Secret：`LINE_CHANNEL_ACCESS_TOKEN`、`LINE_USER_ID`、`REMINDER_API_KEY`。連線碼至少 32 字元，使用隨機值。不要放在 Git、前端原始碼或聊天裡。
5. ALLOWED_ORIGIN 必須等於實際 CRM 網站來源（不含路徑）。`npx wrangler deploy`，確認 Cron 為每分鐘。
6. CRM「更多 → 行程提醒設定」填入 Worker 網址及 REMINDER_API_KEY，按「儲存並連線」。LINE token 只放 Cloudflare。
7. 建立一筆獨立測試行程並勾選，確認同步，再等待真實 LINE 與桌面通知。刪除測試行程。

## 行為與限制

- LINE 收件人固定為設定的使用者，不提供任意收件人或任意推播端點。
- 同步只發送勾選且未完成的行程內容；客戶 id 與修改時間用於避免舊分頁覆蓋新設定。
- 編輯、取消、完成、刪除都需要成功同步，離線修改不能立刻取消雲端已有提醒。
- 每分鐘檢查，通常在提醒時間後一分鐘內執行；不保證精確秒數。故障重試最多五次，最多補發五分鐘內的提醒。
- 發送前再次確認行程仍存在；已送出至 LINE 的訊息無法因後續取消收回。
- LINE retry key 與發送紀錄保存在 D1，重試及重複同步不重複推播；更改時間形成新的提醒事件。
- 桌面通知需要網頁運作與瀏覽器授權，只補發兩分鐘內的提醒。
- 多裝置可能各自出現桌面通知；LINE 由雲端共用紀錄去重。
- LINE 配額、權杖無效、服務故障仍可能阻止通知。不能只依賴此功能處理不能錯過的緊急事項。
- 保留 deliveries 紀錄用於去重；沒有自動清除歷史紀錄。

## 驗證

`node 01-crm/tests/reminders.worker.mjs`：SQLite 實測原子同步、取消、舊版本防覆蓋、並行鎖、重試與去重、驗證及跨來源限制。

`node 01-crm/tests/reminders.browser.cjs`：設置 PLAYWRIGHT_MODULE、CHROME_PATH 後執行，檢查 1440 / 780 / 390 寬度、長內容、勾選、保存編輯、重載與桌面去重。

本機測試不等於正式 LINE 已發送成功；部署後必須另做真實收訊測試。
