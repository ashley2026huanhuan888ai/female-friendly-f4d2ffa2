import { expect, test } from "@playwright/test";

const canRunAgainstApp = Boolean(
  process.env.E2E_BASE_URL ||
  ((process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) &&
    (process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY),
);

async function openFirstPublishedObject(page: import("@playwright/test").Page) {
  await page.goto("/objects");
  await page.waitForLoadState("networkidle").catch(() => {});

  const firstObjectLink = page.getByRole("link", { name: /查看详情[:：]/ }).first();
  test.skip((await firstObjectLink.count()) === 0, "No published objects are available.");
  await expect(firstObjectLink).toBeVisible();
  await firstObjectLink.click();
  await expect(page).toHaveURL(/\/objects\/[0-9a-f-]{36}/);
}

test.describe("critical public flows", () => {
  test.skip(
    !canRunAgainstApp,
    "Set E2E_BASE_URL, or provide local Supabase env vars, to run browser E2E.",
  );

  test("signed-out users can reach the login page", async ({ page }) => {
    await page.goto("/");

    const loginLink = page.getByRole("link", { name: "登录 / 注册" });
    await expect(loginLink).toBeVisible();

    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /登录|注册/ })).toBeVisible();
  });

  test("object cards navigate to independent object detail pages", async ({ page }) => {
    await openFirstPublishedObject(page);

    await expect(page.getByRole("heading", { name: "全部已审核观察" })).toBeVisible();
    await expect(page.getByText(/当前展示 \d+ \/ \d+ 条已审核观察/)).toBeVisible();
  });

  test("object detail pages load more approved observations when more exist", async ({ page }) => {
    await openFirstPublishedObject(page);

    const counter = page.getByText(/当前展示 \d+ \/ \d+ 条已审核观察/);
    await expect(counter).toBeVisible();
    const before = await counter.textContent();

    const loadMore = page.getByRole("button", { name: "加载更多观察" });
    test.skip((await loadMore.count()) === 0, "The selected object has no extra observation page.");

    await loadMore.click();
    await expect(counter).not.toHaveText(before ?? "", { timeout: 15_000 });
  });
});
