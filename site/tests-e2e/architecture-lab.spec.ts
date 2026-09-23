import { expect, test } from "@playwright/test";

test("preset selection updates the model and shareable URL", async ({ page }) => {
  await page.goto("/architecture-lab/");
  await page.getByRole("button", { name: "Log platform" }).click();

  await expect(page.locator('[data-input="workload"]')).toHaveValue("event-stream");
  await expect(page.locator('[data-input="qps"]')).toHaveValue("500000");
  await expect(page).toHaveURL(/qps=500000/);
  await expect(page).toHaveURL(/workload=event-stream/);
});

test("URL parameters restore a scenario and invalid fields keep safe defaults", async ({ page }) => {
  await page.goto("/architecture-lab/?qps=50000&latency=100&consistency=eventual&regions=2&qpsExtra=999");

  await expect(page.locator('[data-input="qps"]')).toHaveValue("50000");
  await expect(page.locator('[data-input="latency"]')).toHaveValue("100");
  await expect(page.locator('[data-input="consistency"]')).toHaveValue("eventual");
  await expect(page.locator('[data-input="regions"]')).toHaveValue("2");
  await expect(page.locator('[data-input="replicas"]')).toHaveValue("3");
});

test("saved scenarios survive reload, restore their state, and can be deleted", async ({ page }) => {
  await page.goto("/architecture-lab/");
  await page.getByRole("button", { name: "Financial ledger" }).click();
  await page.locator('[data-scenario-name]').fill("Ledger review");
  await page.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page.locator(".saved-name")).toHaveText("Ledger review");
  await page.reload();
  await expect(page.locator(".saved-name")).toHaveText("Ledger review");

  await page.locator('[data-input="consistency"]').selectOption("eventual");
  await page.locator(".saved-name").click();
  await expect(page.locator('[data-input="consistency"]')).toHaveValue("strong");

  await page.getByRole("button", { name: "Delete Ledger review" }).click();
  await expect(page.locator("[data-saved-list]")).toHaveText("No saved scenarios yet.");
});

test("defense answers remain usable while the model updates", async ({ page }) => {
  await page.goto("/architecture-lab/");
  const firstCard = page.locator("[data-defense-card]").first();
  const toggle = firstCard.locator("[data-defense-toggle]");
  const answer = firstCard.locator("[data-defense-answer]");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(answer).toBeVisible();

  await page.locator('[data-input="qps"]').evaluate((element: HTMLInputElement) => {
    element.value = "20000";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(answer).toBeVisible();

  await toggle.click();
  await expect(answer).toBeHidden();
});

test("copy and download export the current design", async ({ page }) => {
  await page.goto("/architecture-lab/");
  await page.getByRole("button", { name: "High-traffic API" }).click();
  await page.locator("[data-copy-link]").click();
  await expect(page.locator("[data-copy-link]")).toHaveText("Link copied");

  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain("/architecture-lab/");
  expect(copied).toContain("qps=50000");

  const downloadPromise = page.waitForEvent("download");
  await page.locator("[data-download]").click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("architecture-design-brief.md");
});

test("replica shortfalls are visible as blockers", async ({ page }) => {
  await page.goto("/architecture-lab/");
  await page.locator('[data-input="regions"]').selectOption("3");
  await page.locator('[data-input="availability"]').selectOption("99.999");
  await page.locator('[data-input="consistency"]').selectOption("eventual");
  await page.locator('[data-input="latency"]').selectOption("250");
  await page.locator('[data-input="replicas"]').selectOption("1");

  await expect(page.locator('[data-decision="replication"]')).toHaveText("Single copy; no replication");
  await expect(page.locator("[data-finding-list]")).toContainText("Replica factor cannot cover every active region");
  await expect(page.locator("[data-finding-list]")).toContainText("Five nines needs at least three independent copies");
});

test("read-only scenarios remove the write buffer from the architecture flow", async ({ page }) => {
  await page.goto("/architecture-lab/");
  await page.locator('[data-input="readPercent"]').evaluate((element: HTMLInputElement) => {
    element.value = "100";
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await expect(page.locator('[data-decision="stream"]')).toHaveText("No write stream required");
  await expect(page.locator("[data-flow-buffer]").first()).toBeHidden();
  await expect(page.locator("[data-flow-buffer]").nth(1)).toBeHidden();
  await expect(page.locator("[data-pressure-list]")).not.toContainText("duplicate writes");
});

test("strong read-only scenarios do not recommend stale regional cache reads", async ({ page }) => {
  await page.goto("/architecture-lab/");
  await page.locator('[data-input="readPercent"]').evaluate((element: HTMLInputElement) => {
    element.value = "100";
    element.dispatchEvent(new Event("input", { bubbles:true }));
  });
  await page.locator('[data-input="regions"]').selectOption("3");
  await page.locator('[data-input="latency"]').selectOption("20");

  await expect(page.locator('[data-decision="cache"]')).toHaveText("Immutable-only cache");
  await expect(page.locator('[data-decision="readPath"]')).toContainText("authoritative or verified linearizable read");
  await expect(page.locator("[data-finding-list]")).toContainText("Strong read freshness conflicts with the p99 target");
  await expect(page.locator("[data-blocked-notice]")).toBeVisible();
});

test("financial ledger uses a survivable three-region quorum", async ({ page }) => {
  await page.goto("/architecture-lab/");
  await page.getByRole("button", { name: "Financial ledger" }).click();

  await expect(page.locator('[data-input="regions"]')).toHaveValue("3");
  await expect(page.locator('[data-decision="replication"]')).toHaveText("3-copy cross-region quorum + scoped synchronous writes");
  await expect(page.locator("[data-blocked-notice]")).toBeHidden();
});

test("read throughput updates the capacity model", async ({ page }) => {
  await page.goto("/architecture-lab/");
  for (const [key, value] of [["qps", "40000"], ["sizeKb", "1024"], ["readPercent", "100"]] as const) {
    await page.locator(`[data-input="${key}"]`).evaluate((element: HTMLInputElement, next) => {
      element.value = next;
      element.dispatchEvent(new Event("input", { bubbles:true }));
    }, value);
  }
  await page.locator('[data-input="burstFactor"]').selectOption("1");

  await expect(page.locator('[data-metric="throughput"]')).toHaveText("40,000 / 0 MB/s");
  await expect(page.locator('[data-node="compute"]')).toHaveText("Autoscaled Services");
  await expect(page.locator("[data-pressure-list]")).toContainText("Read bandwidth dominates");
});
