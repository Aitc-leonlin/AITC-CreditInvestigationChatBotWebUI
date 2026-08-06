# Playwright E2E 測試案例

此目錄依前端功能分類存放 WEB 操作測試。測試檔使用 `*.spec.ts` 命名，案例應明確包含前置條件、操作步驟與可判斷的成功／失敗結果。

## 功能分類

- `home`：首頁與主要導覽。
- `authentication`：登入、忘記密碼、重設密碼與 Email 驗證。
- `ai-assistant`：Chatbot、外部知識與負面新聞。
- `expert-knowledge`：專家知識庫查詢、新增、編輯與刪除。
- `report-generator`：報告產生及歷史報告。
- `membership`：會員管理後台；依 dashboard、使用者、角色、權限、組織、通知及 Audit Log 再分類。
- `developer-tools`：目前 `agents`、`ai_sdk`、`langgraph`、`retrieval` 等開發／實驗頁面。
- `fixtures`：登入狀態、測試資料等共用 fixture。
- `support`：頁面物件、API helper 與共用 assertion。

## 執行方式

```bash
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:headed
npm run test:e2e:report
```

預設測試 `http://127.0.0.1:3000`。如需測試其他環境，可設定 `PLAYWRIGHT_BASE_URL`。

涉及新增、修改、刪除資料的測試，應使用獨立測試資料庫或專用測試帳號，不可直接對正式環境執行。
