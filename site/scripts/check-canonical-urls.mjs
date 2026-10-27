import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkPageURLs } from "./lib/canonical-urls.mjs";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const origin = new URL(process.env.SITE_URL || "https://systemcraftlab.com");
const base = `/${(process.env.BASE_PATH ?? "/").split("/").filter(Boolean).join("/")}`;
const site = new URL(`${base.replace(/\/$/, "")}/`, origin);
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map((entry) => entry.isDirectory()
    ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))).flat();
}
const files = await walk(dist);
const failures = [];
let checked = 0;
for (const file of files) {
  const relative = path.relative(dist, file).split(path.sep).join("/");
  // Copied historic Digest HTML is an archival artifact, not an Astro page.
  if (!relative.endsWith(".html") || relative.startsWith("digests/")) continue;
  const pagePath = relative.replace(/(?:^|\/)index\.html$/, "/").replace(/^\//, "");
  const expected = new URL(pagePath, site).href;
  const errors = checkPageURLs(await readFile(file, "utf8"), expected, site);
  failures.push(...errors.map((error) => `${relative}: ${error}`));
  checked++;
}
for (const file of files.filter((file) => /^sitemap.*\.xml$/.test(path.basename(file)))) {
  const xml = await readFile(file, "utf8");
  for (const [, location] of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = new URL(location);
    if (url.origin !== site.origin || !url.pathname.startsWith(site.pathname) || /\/interviews\/$/.test(url.pathname)) {
      failures.push(`${path.basename(file)}: noncanonical or retired sitemap URL: ${location}`);
    }
  }
}
if (failures.length) {
  console.error(`Canonical URL checks failed (${failures.length}):\n${failures.slice(0, 50).join("\n")}`);
  process.exitCode = 1;
} else console.log(`Checked canonical, share, internal URLs, and sitemap for ${checked} page(s)`);
