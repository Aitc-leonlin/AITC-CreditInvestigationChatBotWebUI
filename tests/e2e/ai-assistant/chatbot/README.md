# Chatbot

對應 `/chatbot` 的對話、回覆與錯誤狀態測試。

`conversation-history.spec.ts` 使用受控 AI response，但對話歷史 API 與 DB 均為真實後端，用來確認對話不寫入 Local Storage，且重新整理後能依帳號從 DB 還原。
