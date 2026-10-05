import { expect, test } from "@playwright/test";

test("memory allocator article publishes both solutions and its social preview", async ({ page, request }) => {
  const path = "/coding/memory-allocator-first-fit-best-fit/";
  await page.goto("/coding/");
  await page.locator(`a[href="${path}"]`).first().click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Build a Memory Allocator: First-Fit, Best-Fit, and Coalescing",
  );
  await expect(page.getByRole("heading", { name: "Problem" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Java solution" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Python solution" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Complexity and trade-offs" })).toBeVisible();
  await expect(page.locator('.prose pre[data-language="java"]')).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);

  const image = "https://systemcraftlab.com/social/auto/coding/memory-allocator-first-fit-best-fit.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", image);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get("/social/auto/coding/memory-allocator-first-fit-best-fit.png");
  expect(response.ok()).toBe(true);
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});
