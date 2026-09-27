import { expect, test } from "@playwright/test";

const articlePath = "/coding/gpu-credits-out-of-order-events/";

test("GPU credits article publishes both solutions and a social preview", async ({ page, request }) => {
  await page.goto("/coding/");
  await page.locator(`a[href="${articlePath}"]`).first().click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "GPU Credits: Out-of-Order Grants and Expiring Credits",
  );
  await expect(page.locator('.prose pre[data-language="java"]')).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Complexity and limits" })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://systemcraftlab.com/social/auto/coding/gpu-credits-out-of-order-events.png",
  );

  const response = await request.get("/social/auto/coding/gpu-credits-out-of-order-events.png");
  expect(response.ok()).toBe(true);
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});
