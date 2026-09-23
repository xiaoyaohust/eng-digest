// Where serve-dist.mjs listens. playwright.config.ts imports the same values,
// so the E2E baseURL and the server it waits for cannot drift apart.
export const previewHost = "127.0.0.1";
export const previewPort = 4322;
