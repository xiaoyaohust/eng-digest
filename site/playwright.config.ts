import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "line",
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
  },
  webServer: {
    // `astro preview` serves dist/, so these tests exercise the same bundled,
    // minified assets that get deployed. Running them against `astro dev`
    // instead would miss anything that only breaks after bundling — which is
    // precisely the class of bug an interaction test is there to catch.
    //
    // Requires a build first. The build is part of the command so a local run
    // is self-contained; CI builds in its own step and reuses that output
    // because `npm run build` is idempotent.
    command: "npm run build && npm run preview",
    url: "http://localhost:4321/architecture-lab/",
    reuseExistingServer: !process.env.CI,
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
