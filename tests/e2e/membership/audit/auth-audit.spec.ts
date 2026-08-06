import {
  APIRequestContext,
  expect,
  request as playwrightRequest,
  Response,
  test,
} from "@playwright/test";

import {
  expectAuditLog,
  loginAsAuditAdmin,
} from "../../support/audit-log";

function isPostResponse(response: Response, path: string): boolean {
  return new URL(response.url()).pathname === path && response.request().method() === "POST";
}

test.describe("登入與帳號操作會產生 Audit Log", () => {
  test.describe.configure({ mode: "serial" });

  let api: APIRequestContext;
  let auditAdminToken: string;

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext();
    auditAdminToken = await loginAsAuditAdmin(api);
  });

  test.afterAll(async () => {
    await api.dispose();
  });

  test("TC-AUDIT-AUTH-001 WEB 登入成功後產生 auth.login.success", async ({ page }) => {
    const startedAt = Date.now();
    await page.goto("/login");
    await page.locator("#login-account-input").fill(process.env.E2E_ADMIN_LOGIN ?? "system.admin");
    await page.locator("#login-password-input").fill(process.env.E2E_ADMIN_PASSWORD ?? "Admin123!");

    const loginResponsePromise = page.waitForResponse(
      (response) => isPostResponse(response, "/api/membership/auth/login"),
    );
    await page.locator("#login-submit-button").click();
    const loginResponse = await loginResponsePromise;
    expect(loginResponse.ok()).toBe(true);

    const body = (await loginResponse.json()) as {
      data?: { accessToken?: string; user?: { id?: string } };
    };
    expect(body.data?.accessToken).toBeTruthy();
    expect(body.data?.user?.id).toBeTruthy();
    await expectAuditLog(api, body.data!.accessToken!, {
      action: "auth.login.success",
      startedAt,
      resourceId: body.data!.user!.id!,
      outcome: "SUCCESS",
    });
  });

  test("TC-AUDIT-AUTH-002 WEB 登入失敗後產生 auth.login.failed", async ({ page }) => {
    const startedAt = Date.now();
    const missingLogin = `e2e-missing-${startedAt}`;
    await page.goto("/login");
    await page.locator("#login-account-input").fill(missingLogin);
    await page.locator("#login-password-input").fill("WrongPassword!");

    const loginResponsePromise = page.waitForResponse(
      (response) => isPostResponse(response, "/api/membership/auth/login"),
    );
    await page.locator("#login-submit-button").click();
    const loginResponse = await loginResponsePromise;
    expect(loginResponse.ok()).toBe(false);

    await expectAuditLog(api, auditAdminToken, {
      action: "auth.login.failed",
      startedAt,
      resourceId: missingLogin,
      outcome: "FAILURE",
      metadata: { reason: "ACCOUNT_NOT_FOUND" },
    });
  });

  test("TC-AUDIT-AUTH-003 WEB 忘記密碼後產生 auth.password.forgot", async ({ page }) => {
    const startedAt = Date.now();
    const missingEmail = `e2e-missing-${startedAt}@example.local`;
    await page.goto("/forgot-password");
    await page.locator("#forgot-password-email-input").fill(missingEmail);

    const responsePromise = page.waitForResponse(
      (response) => isPostResponse(response, "/api/membership/auth/forgot-password"),
    );
    await page.locator("#forgot-password-submit-button").click();
    expect((await responsePromise).ok()).toBe(true);

    await expectAuditLog(api, auditAdminToken, {
      action: "auth.password.forgot",
      startedAt,
      resourceId: missingEmail,
      outcome: "SUCCESS",
      metadata: { accountFound: false },
    });
  });

  test("TC-AUDIT-AUTH-004 WEB 使用無效 token 重設密碼後產生失敗 Log", async ({ page }) => {
    const startedAt = Date.now();
    await page.goto("/reset-password/confirm");
    await page.locator("#reset-password-token-input").fill(`invalid-reset-token-${startedAt}`);
    await page.locator("#reset-password-new-password-input").fill("E2eInvalid123!");
    await page.locator("#reset-password-confirm-password-input").fill("E2eInvalid123!");

    const responsePromise = page.waitForResponse(
      (response) => isPostResponse(response, "/api/membership/auth/reset-password"),
    );
    await page.locator("#reset-password-confirm-submit-button").click();
    expect((await responsePromise).ok()).toBe(false);

    await expectAuditLog(api, auditAdminToken, {
      action: "auth.password.reset",
      startedAt,
      outcome: "FAILURE",
      metadata: { reason: "INVALID_TOKEN" },
    });
  });

  test("TC-AUDIT-AUTH-005 WEB 使用無效 token 驗證 Email 後產生失敗 Log", async ({ page }) => {
    const startedAt = Date.now();
    await page.goto("/verify-email");
    await page.locator("#email-verification-token-input").fill(`invalid-verify-token-${startedAt}`);

    const responsePromise = page.waitForResponse(
      (response) => isPostResponse(response, "/api/membership/auth/email-verification/verify"),
    );
    await page.locator("#email-verification-submit-button").click();
    expect((await responsePromise).ok()).toBe(false);

    await expectAuditLog(api, auditAdminToken, {
      action: "auth.email_verification.verify",
      startedAt,
      outcome: "FAILURE",
      metadata: { phase: "VERIFY", reason: "INVALID_TOKEN" },
    });
  });
});
