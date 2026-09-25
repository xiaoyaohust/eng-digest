import { expect, test } from "@playwright/test";

const articlePath = "/field-notes/five-constraints-of-system-design/";

test("Field Notes publishes its first article without a coming-soon state", async ({ page, request }) => {
  await page.goto("/field-notes/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Engineering Field Notes");
  await expect(page.getByText("COMING SOON", { exact: true })).toHaveCount(0);
  await page.locator(`.notes-library a[href="${articlePath}"]`).first().click();

  await expect(page).toHaveURL(new RegExp(`${articlePath}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Five Constraints of System Design");
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(2, { timeout: 30_000 });

  const image = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(image).toBe("https://systemcraftlab.com/social/auto/field-notes/five-constraints-of-system-design.png");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");

  const response = await request.get("/social/auto/field-notes/five-constraints-of-system-design.png");
  expect(response.ok()).toBe(true);
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});

test("home and tags link to the Field Note", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(`a[href="${articlePath}"]`).first()).toBeVisible();
  await expect(page.getByText("Coming soon", { exact: true })).toHaveCount(0);
  await page.goto("/tags/reliability/");
  await expect(page.locator(`a[href="${articlePath}"]`).first()).toBeVisible();
});

test("scalability Field Note appears in the library with a rendered diagram and share image", async ({ page, request }) => {
  const path = "/field-notes/what-scalability-really-means/";
  await page.goto("/field-notes/");
  await page.locator(`.notes-library a[href="${path}"]`).first().click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What Scalability Really Means");
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://systemcraftlab.com/social/auto/field-notes/what-scalability-really-means.png",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");

  const image = await request.get("/social/auto/field-notes/what-scalability-really-means.png");
  expect(image.ok()).toBe(true);
  const png = await image.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});
