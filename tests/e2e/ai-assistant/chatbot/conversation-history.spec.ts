import { expect, test } from "@playwright/test";

import { backendURL } from "../../support/audit-log";

test("TC-CHAT-HISTORY-001 對話只寫入 DB，重新整理後依帳號還原", async ({ page }) => {
  const question = `E2E DB conversation ${Date.now()}`;
  const answer = "E2E assistant reply from controlled response";
  const expertKnowledge = {
    title: "E2E 專家知識",
    anchorDescription: "E2E 專家知識摘要",
    systemPrompt: "E2E system prompt",
    createdAt: "2026-08-05T01:00:00Z",
    updatedAt: "2026-08-05T02:00:00Z",
  };
  const externalData = {
    source: "E2E 外部資料來源",
    response: "E2E 外部資料內容",
  };
  let conversationSaveRequestCount = 0;

  page.on("request", (request) => {
    if (
      request.method() === "PUT" &&
      new URL(request.url()).pathname.startsWith("/api/chat/conversations/")
    ) {
      conversationSaveRequestCount += 1;
    }
  });

  await page.goto("/login");
  await page.locator("#login-account-input").fill(process.env.E2E_ADMIN_LOGIN ?? "system.admin");
  await page.locator("#login-password-input").fill(process.env.E2E_ADMIN_PASSWORD ?? "Admin123!");
  await page.locator("#login-submit-button").click();
  await page.waitForURL((url) => url.pathname === "/");

  const accessToken = await page.evaluate(() =>
    window.localStorage.getItem("membership.accessToken"),
  );
  expect(accessToken).toBeTruthy();

  await page.route("**/api/chatbot", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        answer,
        dataSources: [{ source: "E2E controlled source" }],
        usedExpertKnowledge: [expertKnowledge],
        appliedExternalData: [externalData],
      }),
    });
  });

  await page.goto("/chatbot");
  await page.locator("#chat-message-input").fill(question);
  await page.locator("#chat-message-submit-button").click();
  await expect(page.getByText(answer)).toBeVisible();

  let conversationId = "";
  await expect
    .poll(async () => {
      const response = await page.request.get(`${backendURL}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok()) return false;
      const body = (await response.json()) as {
        data?: Array<{
          id: string;
          messages: Array<{ id: string; role: string; content: unknown }>;
          expertKnowledgeForMessages: Record<string, Array<typeof expertKnowledge>>;
          externalDataForMessages: Record<string, Array<typeof externalData>>;
        }>;
      };
      const conversation = body.data?.find((item) =>
        item.messages.some((message) => String(message.content).includes(question)),
      );
      if (!conversation || conversation.messages.length !== 2) return false;
      const assistantMessage = conversation.messages.find(
        (message) => message.role === "assistant",
      );
      if (!assistantMessage) return false;
      expect(conversation.expertKnowledgeForMessages[assistantMessage.id]).toEqual([
        expertKnowledge,
      ]);
      expect(conversation.externalDataForMessages[assistantMessage.id]).toEqual([
        externalData,
      ]);
      conversationId = conversation.id;
      return true;
    })
    .toBe(true);
  expect(conversationSaveRequestCount).toBe(2);

  expect(
    await page.evaluate(() => window.localStorage.getItem("aitc-chatbot-sessions-v1")),
  ).toBeNull();

  await page.reload();
  await expect(page.getByText(question, { exact: false })).toBeVisible();
  await expect(page.getByText(answer)).toBeVisible();

  const deleteResponse = await page.request.delete(
    `${backendURL}/api/chat/conversations/${conversationId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  expect(deleteResponse.ok()).toBe(true);
});
