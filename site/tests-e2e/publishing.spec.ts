import { expect, test } from "@playwright/test";

test("public learning paths never lead to the sample interview draft", async ({ page, request }) => {
  const sample = await request.get("/interviews/example-interview/");
  expect(sample.status()).toBe(404);

  await page.goto("/learning-paths/senior-engineer-interview/");
  const replacement = page.locator('[data-step="copilot-security-review"]');
  await expect(replacement).toContainText("Defend an enterprise Copilot design");
  await expect(replacement.locator("a")).toHaveAttribute("href", "/system-design/secure-enterprise-copilot-api/");
  await expect(page.locator('a[href="/interviews/example-interview/"]')).toHaveCount(0);
});
