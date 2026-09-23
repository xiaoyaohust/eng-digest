import { expect, test } from "@playwright/test";

test("public learning paths never lead to the sample interview draft", async ({ page, request }) => {
  const retiredIndex = await request.get("/interviews/");
  expect(retiredIndex.status()).toBe(404);
  const sample = await request.get("/interviews/example-interview/");
  expect(sample.status()).toBe(404);
  const sitemap = await request.get("/sitemap-0.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).not.toContain("/interviews/");

  await page.goto("/learning-paths/senior-engineer-interview/");
  const replacement = page.locator('[data-step="copilot-security-review"]');
  await expect(replacement).toContainText("Defend an enterprise Copilot design");
  await expect(replacement.locator("a")).toHaveAttribute("href", "/system-design/secure-enterprise-copilot-api/");
  await expect(page.locator('a[href="/interviews/example-interview/"]')).toHaveCount(0);
});
