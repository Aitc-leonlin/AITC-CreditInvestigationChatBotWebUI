import { expect, test } from "@playwright/test";

import { backendURL } from "../../support/audit-log";

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { message?: string } | null;
};

async function login(page: import("@playwright/test").Page, username: string, password: string) {
  await page.goto("/login");
  await page.locator("#login-account-input").fill(username);
  await page.locator("#login-password-input").fill(password);
  await page.locator("#login-submit-button").click();
  await page.waitForURL((url) => url.pathname === "/");
}

test("TC-GROUP-001 成員數開啟唯讀清單，管理員僅能從編輯群組管理組員", async ({
  browser,
  page,
}) => {
  const suffix = Date.now();
  const masterUsername = `e2e.group.master.${suffix}`;
  const memberUsername = `e2e.group.member.${suffix}`;
  const password = "E2eGroup123!";
  const groupCode = `E2E_REVIEW_${suffix}`;
  const groupName = `E2E 徵審團隊 ${suffix}`;
  let groupId = "";
  const createdUserIds: string[] = [];

  await login(
    page,
    process.env.E2E_ADMIN_LOGIN ?? "system.admin",
    process.env.E2E_ADMIN_PASSWORD ?? "Admin123!",
  );
  const adminToken = await page.evaluate(() =>
    window.localStorage.getItem("membership.accessToken"),
  );
  expect(adminToken).toBeTruthy();

  async function createUser(username: string, displayName: string) {
    const response = await page.request.post(`${backendURL}/api/membership/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        username,
        email: `${username}@example.local`,
        displayName,
        employeeNo: "",
        organizationId: null,
        departmentId: null,
        managerUserId: null,
        status: "ACTIVE",
        locale: "zh-TW",
        timezone: "Asia/Taipei",
        password,
        mustChangePassword: false,
        roleIds: ["role-default-user"],
      },
    });
    const body = (await response.json()) as ApiEnvelope<{ id: string }>;
    expect(response.ok(), body.error?.message).toBe(true);
    createdUserIds.push(body.data!.id);
    return body.data!.id;
  }

  const masterUserId = await createUser(masterUsername, "E2E Group Master");
  await createUser(memberUsername, "E2E Group Member");

  try {
    await page.goto("/membership/groups");
    await page.locator("#group-create-button").click();
    await page.locator("#group-code-input").fill(groupCode);
    await page.locator("#group-name-input").fill(groupName);
    await page.locator("#group-category-input").fill("徵審流程");
    await page.locator("#group-master-select").selectOption(masterUserId);
    await page.locator("#group-save-button").click();
    await page
      .getByRole("row", { name: new RegExp(groupName) })
      .getByRole("button", { name: new RegExp(`檢視 ${groupName} 的`) })
      .click();
    await expect(page.getByRole("heading", { name: `${groupName}－組員清單` })).toBeVisible();
    await expect(page.getByText("E2E Group Master", { exact: true }).first()).toBeVisible();
    await expect(page.locator("#group-member-add-button")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "移除" })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: `編輯 ${groupName}` }).click();
    await expect(page.locator("#group-member-add-button")).toBeVisible();
    await page.locator("#group-member-add-button").click();
    await page
      .getByRole("row", { name: new RegExp(memberUsername) })
      .getByRole("checkbox")
      .check();
    await page.locator("#group-member-save-button").click();
    await expect(page.getByText("E2E Group Member", { exact: true })).toBeVisible();

    const groupsResponse = await page.request.get(`${backendURL}/api/membership/groups`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const groupsBody = (await groupsResponse.json()) as ApiEnvelope<{
      groups: Array<{ id: string; code: string }>;
    }>;
    groupId = groupsBody.data!.groups.find((group) => group.code === groupCode)!.id;

    const masterContext = await browser.newContext();
    const masterPage = await masterContext.newPage();
    try {
      await login(masterPage, masterUsername, password);
      await masterPage.goto("/membership/groups");
      await masterPage
        .getByRole("row", { name: new RegExp(groupName) })
        .getByRole("button", { name: new RegExp(`檢視 ${groupName} 的`) })
        .click();
      await expect(masterPage.getByRole("button", { name: `編輯 ${groupName}` })).toHaveCount(0);
      await expect(masterPage.locator("#group-member-add-button")).toHaveCount(0);
      await expect(masterPage.getByRole("button", { name: "移除" })).toHaveCount(0);
      await expect(masterPage.getByText("E2E Group Member", { exact: true })).toBeVisible();
    } finally {
      await masterContext.close();
    }

    await page
      .getByRole("row", { name: new RegExp(memberUsername) })
      .getByRole("checkbox")
      .check();
    await expect(page.locator("#group-member-batch-remove-button")).toContainText("批次移除（1）");
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator("#group-member-batch-remove-button").click();
    await expect(page.getByText("E2E Group Member", { exact: true })).toHaveCount(0);
  } finally {
    if (groupId) {
      await page.request.delete(`${backendURL}/api/membership/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
    for (const userId of createdUserIds) {
      await page.request.delete(`${backendURL}/api/membership/users/${userId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  }
});
