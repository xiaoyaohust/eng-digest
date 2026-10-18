import { expect, test } from "@playwright/test";

const slug = "resumable-iterators";
const path = `/coding/${slug}/`;
const title = "Resumable Iterators: Checkpoints for Lists and UTF-8 Files";

test("resumable iterator guide publishes both runnable solutions and a share card", async ({ page, request }) => {
  await page.goto("/coding/");
  await page.locator(`a[href="${path}"]`).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  for (const name of ["Problem", "Write the tests before the implementation", "Java solution", "Python solution", "Expected output", "Complexity"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  for (const language of ["java", "python"]) {
    await expect(page.locator(`.prose pre[data-language="${language}"]`)).toHaveCount(1);
  }
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator(".prose .table-scroll table")).toHaveCount(2);
  await expect(page.locator(".prose")).toContainText("File next offset: 11");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://systemcraftlab.com${path}`);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content", `https://systemcraftlab.com/social/auto/coding/${slug}.png`,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get(`/social/auto/coding/${slug}.png`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
  await page.locator(".prose .mermaid-diagram").screenshot({
    path: "test-results/resumable-iterator-diagram.png",
    style: ".navbar { visibility: hidden !important; }",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const table = page.getByRole("region", { name: "Resumable iterator acceptance tests" });
  expect(await table.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  await table.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const code = page.locator('.prose pre[data-language="java"]');
  // The code wrapper may scroll internally or wrap, but must stay within the page.
  expect(await code.evaluate((element) => element.getBoundingClientRect().right <= innerWidth)).toBe(true);
  await page.goto(path);
  await page.screenshot({ path: "test-results/resumable-iterator-mobile.png" });
  await page.goto("/search/");
  await page.locator(".pagefind-ui__search-input").fill("Resumable Iterators");
  await expect(page.locator(`.pagefind-ui__result-link[href="${path}"]`)).toBeVisible();
});
