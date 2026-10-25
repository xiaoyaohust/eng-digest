import { expect, test } from "@playwright/test";

test("home introduces Yao Xiao with the real portrait, concise background, and publication context", async ({ page, request }) => {
  await page.goto("/");
  const introduction = page.getByRole("region", { name: "Yao Xiao", exact: true });
  await introduction.scrollIntoViewIfNeeded();
  await expect(introduction.getByRole("heading", { level: 2 })).toHaveText("Yao Xiao");
  for (const fact of ["Founder & Technical Writer", "Staff Software Engineer", "at Uber", "Coupang · DoorDash · eBay", "storage, streaming, logistics, and advertising", "Independent publication. Views are my own."])
    await expect(introduction).toContainText(fact);
  const portrait = introduction.getByRole("img", { name: "Portrait of Yao Xiao" });
  await expect(portrait).toHaveAttribute("src", "/images/yao-xiao.jpg");
  await expect.poll(() => portrait.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(400);
  await expect(portrait).toHaveAttribute("width", "400");
  await expect(portrait).toHaveAttribute("height", "400");
  const response = await request.get("/images/yao-xiao.jpg");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/jpeg");
  expect(await page.locator(".hero").evaluate((element) => element.nextElementSibling?.id)).toBe("about-founder");
  expect(await introduction.evaluate((element) => element.nextElementSibling?.classList.contains("tracks-section"))).toBe(true);
  const schemas = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? "[]");
  const person = schemas.find((schema: { "@type": string }) => schema["@type"] === "Person");
  expect(person.name).toBe("Yao Xiao");
  expect(person.jobTitle).toBe("Staff Software Engineer");
  expect(person.worksFor.name).toBe("Uber");
  expect(person.image).toBe("https://systemcraftlab.com/images/yao-xiao.jpg");
  expect(person.sameAs).toBeUndefined();
  await introduction.screenshot({ path: "test-results/founder-desktop-light.png", style: ".navbar { visibility: hidden !important; }" });
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await introduction.screenshot({ path: "test-results/founder-desktop-dark.png", style: ".navbar { visibility: hidden !important; }" });
  await introduction.getByRole("link", { name: "Read my field notes" }).click();
  await expect(page).toHaveURL(/\/field-notes\/$/);
});

test("founder card and original section order fit phone, tablet, and desktop widths", async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const introduction = page.getByRole("region", { name: "Yao Xiao", exact: true });
    await introduction.scrollIntoViewIfNeeded();
    await expect(introduction.getByRole("img")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await introduction.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    const hrefs = await page.locator(".track-card").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(hrefs).toEqual(["/system-design/", "/ai/", "/field-notes/", "/eng-digest/", "/science/", "/coding/"]);
    if (width === 390) await introduction.screenshot({ path: "test-results/founder-mobile.png", style: ".navbar { visibility: hidden !important; }" });
  }
});

test("founder introduction and portrait remain available without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  await page.goto("/#about-founder");
  const introduction = page.getByRole("region", { name: "Yao Xiao", exact: true });
  await expect(introduction).toBeVisible();
  await expect.poll(() => introduction.getByRole("img").evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBe(400);
  // Exercise native keyboard navigation without racing the initial fragment's
  // smooth scroll; the JavaScript-enabled test above covers pointer clicks.
  await introduction.getByRole("link", { name: "Read my field notes" }).press("Enter");
  await expect(page).toHaveURL(/\/field-notes\/$/);
  await context.close();
});
