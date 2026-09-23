import { defineConfig, devices } from "@playwright/test";
import { previewHost, previewPort } from "./scripts/preview-target.mjs";

const previewCommand = "npm run preview:test";

export default defineConfig({
  testDir: "./tests-e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "line",
  use: {
    baseURL: `http://${previewHost}:${previewPort}`,
    trace: "on-first-retry",
  },
  webServer: {
    // `astro preview` serves dist/, so these tests exercise the same bundled,
    // minified assets that get deployed. Running them against `astro dev`
    // instead would miss anything that only breaks after bundling — which is
    // precisely the class of bug an interaction test is there to catch.
    //
    // Local runs build first and remain self-contained. CI has already built
    // dist/ in the preceding step, so it starts the static server directly and
    // tests the exact artifact that will be uploaded. A tiny foreground server
    // is used because Astro's managed local preview can outlive the test run.
    command: process.env.CI ? previewCommand : `npm run build && ${previewCommand}`,
    url: `http://${previewHost}:${previewPort}/architecture-lab/`,
    // Never reuse a long-lived server: doing so made a supposedly production
    // E2E run exercise stale or unbundled development assets.
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
  ],
});
