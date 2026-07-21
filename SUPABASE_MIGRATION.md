# Supabase v2 資料遷移說明

這一版是為「單人使用、不透過 Supabase Auth 登入」設計。所有資料庫操作都必須經由伺服器執行，瀏覽器端絕對不能取得 Supabase Service Role Key。

## 安全設計

- v2 資料表會建立在舊資料表旁邊，不會重新命名或刪除舊資料表。
- 所有 v2 資料表都會啟用 Row Level Security（RLS）。
- `anon` 與 `authenticated` 角色不會取得 v2 資料表權限。
- Next.js 伺服器使用環境變數 `SUPABASE_SERVICE_ROLE_KEY` 存取資料庫。
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 可以暫時保留，方便必要時退回舊版；v2 UI 不會使用它讀寫資料。
- 舊的 `/api/migrate` 自動遷移功能已停用，避免意外修改線上資料。

## 執行前準備

1. 先在 Supabase 建立資料庫備份，或匯出完整 database dump。
2. 確認目前舊版應用程式仍能正常讀取既有資料。
3. 不要刪除、重新命名或清空任何舊資料表。

## SQL 執行順序

請在 Supabase Dashboard 的 SQL Editor 中依序執行：

1. `scripts/010_single_user_v2_schema.sql`
   - 建立 v2 資料表、索引、RLS 與分類資料。
2. 檢查新建立的 v2 資料表目前是否為空。
3. `scripts/011_migrate_legacy_data_to_v2.sql`
   - 將舊資料複製並轉換到 v2 資料表。
4. `scripts/012_validate_v2_migration.sql`
   - 比對舊版與 v2 的資料筆數、月份金額及分類結果。
5. 檢查所有 `migration_status = 'needs_review'` 的資料。
6. 確認筆數與金額一致後，再部署 v2 應用程式。
7. 新版穩定使用並完成核對以前，保留全部舊資料表。

若任一步驟出現 SQL 錯誤，請先停止，不要繼續執行下一份 SQL。將完整錯誤訊息或畫面傳給我處理。

## 分類轉換方式

遷移時不會修改舊支出資料。每一筆轉換後的支出會保留：

- `legacy_expense_id`：原始支出的 ID。
- `legacy_category`：原始分類名稱或資訊。
- `migration_status`：表示是否需要人工確認。

舊分類 `Dating／約會` 會先歸入 `other`，加上 `dating` 標籤，並標記為 `needs_review`。找不到對應分類的資料也會標記為 `needs_review`，避免資料被靜默分錯類。

## 必要環境變數

本機開發時，可以將 `.env.example` 複製成 `.env.local`。部署到 Vercel 時，請在 Project Settings → Environment Variables 加入相同設定。

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 專案網址。
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase API 設定中的 Service Role Secret。絕對不能加上 `NEXT_PUBLIC_` 前綴，也不要貼到聊天室或提交到 Git。
- `APP_ACCESS_PASSWORD`：進入個人 App 時使用的密碼，建議使用足夠長且獨立的密碼。
- `GEMINI_API_KEY`：沿用目前的 Gemini API Key；AI 模型仍使用 Gemini 2.5 Flash。
- `BLOB_READ_WRITE_TOKEN`：只有需要上傳收據圖片時才需要。
- VAPID 相關變數：只有需要瀏覽器推播通知時才需要。

## 驗證重點

執行 `012_validate_v2_migration.sql` 後，至少確認：

- 舊支出與 v2 支出的總筆數一致。
- 各月份的支出總額一致。
- 沒有遺失日期、金額或分類資料。
- `needs_review` 的筆數與內容合理。
- 固定支出與提醒的日期、時間正確。

## 回復舊版

在應用程式切換到 v2 前，只要繼續使用原本的舊資料表即可回復。遷移腳本也會在 `migration_backup` schema 建立固定備份快照。

如果新版已經開始寫入 v2 資料，應先將應用程式部署版本退回，不要刪除 v2 資料。接著比對新版啟用後新增的資料，再決定如何合併或修正。
