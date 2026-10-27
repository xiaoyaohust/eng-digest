import { cp, mkdir, copyFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mathAssetDirectory } from "../src/lib/mathAssets.mjs";

const require = createRequire(import.meta.url);
const source = path.dirname(require.resolve("katex/dist/katex.min.css"));
const destination = fileURLToPath(new URL(`../public/${mathAssetDirectory}/`, import.meta.url));
await mkdir(destination, { recursive: true });
await Promise.all([
  copyFile(path.join(source, "katex.min.css"), path.join(destination, "katex.min.css")),
  copyFile(path.join(source, "..", "LICENSE"), path.join(destination, "LICENSE")),
  cp(path.join(source, "fonts"), path.join(destination, "fonts"), { recursive: true }),
]);
console.log(`Prepared self-hosted math CSS and fonts at /${mathAssetDirectory}/`);
