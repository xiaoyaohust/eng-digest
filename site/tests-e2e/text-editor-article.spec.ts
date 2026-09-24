import { expect, test } from "@playwright/test";

const articlePath = "/coding/text-editor-undo-autocomplete-collaboration/";

test("text editor article publishes both runnable solutions and a social card", async ({ page, request }) => {
  await page.goto("/coding/");
  await page.locator(`a[href="${articlePath}"]`).first().click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Build a Text Editor: Undo, Autocomplete, and Collaboration");
  await expect(page.locator('.prose pre[data-language="java"]')).toHaveCount(1);
  await expect(page.locator('.prose pre[data-language="python"]')).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Part 4: What changes with real-time collaboration?" })).toBeVisible();

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://systemcraftlab.com/social/auto/coding/text-editor-undo-autocomplete-collaboration.png",
  );
  const response = await request.get("/social/auto/coding/text-editor-undo-autocomplete-collaboration.png");
  expect(response.ok()).toBe(true);
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});
