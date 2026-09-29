import { expect, test } from "@playwright/test";

test("plant infection article publishes both solutions and a social preview", async ({ page, request }) => {
  const path = "/coding/plant-infection-grid/";
  await page.goto("/coding/");
  await page.locator(`a[href="${path}"]`).first().click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Plant Infection on a Grid: Spread, Recovery, Death, and Firebreaks",
  );
  await expect(page.getByRole("heading", { name: "Java solution" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Python solution" })).toBeVisible();
  await expect(page.locator('.prose pre[data-language="java"]')).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);

  const image = "https://systemcraftlab.com/social/auto/coding/plant-infection-grid.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", image);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get("/social/auto/coding/plant-infection-grid.png");
  expect(response.ok()).toBe(true);
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});
