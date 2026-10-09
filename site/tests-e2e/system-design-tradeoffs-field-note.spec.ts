import { expect, test } from "@playwright/test";

const slug = "the-trade-offs-behind-system-design";
const path = `/field-notes/${slug}/`;
const image = `https://systemcraftlab.com/social/auto/field-notes/${slug}.png`;

test("trade-offs Field Note is published with rendered diagrams, sources, and a social card", async ({ page, request }) => {
  await page.goto("/field-notes/");
  await page.locator(`.notes-library a[href="${path}"]`).first().click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Trade-offs Behind Every System Design");
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(2, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Further reading" })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", image);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");

  const response = await request.get(`/social/auto/field-notes/${slug}.png`);
  expect(response.ok()).toBe(true);
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});
