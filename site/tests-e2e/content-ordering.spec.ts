import { expect, test, type Locator } from "@playwright/test";

const sectionHrefs = ["/system-design/", "/ai/", "/field-notes/", "/eng-digest/", "/science/", "/coding/"];

async function expectNewestFirst(cards: Locator): Promise<number[]> {
  const dates = await cards.locator("time[datetime]").evaluateAll((elements) =>
    elements.map((element) => Date.parse(element.getAttribute("datetime") ?? "")));
  expect(dates.length).toBeGreaterThan(0);
  expect(dates).toHaveLength(await cards.count());
  expect(dates.every(Number.isFinite)).toBe(true);
  expect(dates).toEqual([...dates].sort((a, b) => b - a));
  return dates;
}

test("home, desktop navigation, footer, and mobile navigation share the fixed section order", async ({ page }) => {
  await page.goto("/");
  for (const selector of [".track-card", ".navbar .nav-links a", ".footer-links a"]) {
    const hrefs = await page.locator(selector).evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(hrefs.filter((href): href is string => href !== null && sectionHrefs.includes(href))).toEqual(sectionHrefs);
  }
  await expect(page.locator('.navbar a[href="/architecture-lab/"]')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ai/");
  await page.locator('label[for="nav-toggle"]').click();
  const navLinks = page.locator(".navbar .nav-links a:visible");
  expect((await navLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href")))).slice(0, 6)).toEqual(sectionHrefs);
  await expect(page.locator('.navbar a[href="/ai/"]')).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("topics and the articles inside them are newest first in every grouped library", async ({ page }) => {
  for (const [path, selector, nav] of [
    ["/system-design/", ".topic-cluster", ".cluster-nav"],
    ["/field-notes/", ".field-topic-cluster", ".field-cluster-nav"],
    ["/ai/", ".ai-topic", null],
  ] as const) {
    await page.goto(path);
    const groups = page.locator(selector);
    expect(await groups.count()).toBeGreaterThan(0);
    const newestDates: number[] = [];
    for (const group of await groups.all()) newestDates.push((await expectNewestFirst(group.locator(".article-card")))[0]);
    expect(newestDates).toEqual([...newestDates].sort((a, b) => b - a));
    if (nav) {
      const ids = await groups.evaluateAll((elements) => elements.map((element) => `#${element.id}`));
      expect(await page.locator(`${nav} a`).evaluateAll((links) => links.map((link) => link.getAttribute("href")))).toEqual(ids);
    }
  }
});

test("Coding and science projects list articles by date, and science projects follow latest activity", async ({ page }) => {
  await page.goto("/coding/");
  await expectNewestFirst(page.locator("main .article-card"));
  await page.goto("/science/");
  const projects = await page.locator(".project-card").evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
  expect(projects.length).toBeGreaterThan(0);
  const latestDates: number[] = [];
  for (const project of projects) {
    await page.goto(project);
    latestDates.push((await expectNewestFirst(page.locator(".project-page .article-card")))[0]);
  }
  expect(latestDates).toEqual([...latestDates].sort((a, b) => b - a));
});

test("AI Start reading and previous/next links keep the teaching sequence", async ({ page }) => {
  await page.goto("/ai/");
  await expect(page.locator(".ai-library")).toContainText("NEWEST FIRST");
  await page.getByRole("link", { name: /Start reading/ }).click();
  await expect(page).toHaveURL(/\/ai\/from-rules-to-machine-learning\/$/);
  await page.locator(".prev-next-link.next").click();
  await expect(page).toHaveURL(/\/ai\/ai-machine-learning-deep-learning\/$/);
  await page.locator(".prev-next-link.next").click();
  await expect(page).toHaveURL(/\/ai\/discriminative-and-generative-models\/$/);
});

test("Digest archive days, weeks, and months remain newest first", async ({ page }) => {
  await page.goto("/eng-digest/");
  for (const selector of [".digest-card", ".month-links a", ".year-links a"]) {
    const hrefs = await page.locator(selector).evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThan(0);
    expect(hrefs).toEqual([...hrefs].sort().reverse());
  }
  await page.goto("/eng-digest/weekly/");
  const weeks = await page.locator(".weekly-grid a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(weeks.length).toBeGreaterThan(0);
  expect(weeks).toEqual([...weeks].sort().reverse());
});
