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

test("home links to Field Notes and tags link to the article", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href="/field-notes/"]').first()).toBeVisible();
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

test("reliability Field Note publishes its recovery diagrams and share image", async ({ page, request }) => {
  const path = "/field-notes/reliability-fault-tolerance-recovery/";
  await page.goto("/field-notes/");
  await page.locator(`.notes-library a[href="${path}"]`).first().click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Reliability and Fault Tolerance: The Recovery Path");
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(3, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://systemcraftlab.com/social/auto/field-notes/reliability-fault-tolerance-recovery.png",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");

  const image = await request.get("/social/auto/field-notes/reliability-fault-tolerance-recovery.png");
  expect(image.ok()).toBe(true);
  const png = await image.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});

test("vertical and horizontal scaling Field Note publishes diagrams and a social preview", async ({ page, request }) => {
  const path = "/field-notes/vertical-vs-horizontal-scaling/";
  await page.goto("/field-notes/");
  await page.locator(`.notes-library a[href="${path}"]`).first().click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vertical vs Horizontal Scaling: Where the Bottleneck Moves");
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(2, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);

  const image = "https://systemcraftlab.com/social/auto/field-notes/vertical-vs-horizontal-scaling.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", image);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "627");

  const response = await request.get("/social/auto/field-notes/vertical-vs-horizontal-scaling.png");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});

test("Field Notes uses manually assigned topic clusters and publishes the state article", async ({ page, request }) => {
  const path = "/field-notes/stateless-vs-stateful/";
  await page.goto("/field-notes/");

  const cluster = page.locator("#field-topic-system-design-fundamentals-1");
  await expect(page.getByRole("navigation", { name: "Engineering Field Notes topics" })
    .getByRole("link", { name: /System Design Fundamentals/ })).toHaveAttribute(
      "href", "#field-topic-system-design-fundamentals-1",
    );
  await expect(cluster.getByRole("heading", { name: "System Design Fundamentals" })).toBeVisible();
  await expect(cluster.locator(`a[href="${path}"]`)).toBeVisible();
  await expect(cluster.locator('a[href="/field-notes/capacity-estimation-from-dau-to-infrastructure/"]')).toBeVisible();
  await cluster.locator(`a[href="${path}"]`).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stateless vs Stateful: Where Does the State Live?");
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(3, { timeout: 30_000 });
  await expect(page.locator('.prose pre[data-language="mermaid"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Further reading" })).toBeVisible();

  const image = "https://systemcraftlab.com/social/auto/field-notes/stateless-vs-stateful.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", image);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
  const response = await request.get("/social/auto/field-notes/stateless-vs-stateful.png");
  expect(response.ok()).toBe(true);
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});

test("capacity estimation Field Note publishes its diagram and social preview", async ({ page, request }) => {
  const path = "/field-notes/capacity-estimation-from-dau-to-infrastructure/";
  await page.goto("/field-notes/");
  await page.locator(`.notes-library a[href="${path}"]`).first().click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Capacity Estimation: From DAU to QPS, Storage, and Bandwidth",
  );
  await expect(page.locator(".prose .mermaid-diagram svg")).toHaveCount(1, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Further reading" })).toBeVisible();

  const image = "https://systemcraftlab.com/social/auto/field-notes/capacity-estimation-from-dau-to-infrastructure.png";
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", image);
  const response = await request.get("/social/auto/field-notes/capacity-estimation-from-dau-to-infrastructure.png");
  expect(response.ok()).toBe(true);
  const png = await response.body();
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(627);
});
