#!/usr/bin/env node

import { access, readdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(scriptDir, "..", "dist");
const configuredBase = process.env.BASE_PATH ?? "/eng-digest";
const basePath = `/${configuredBase.split("/").filter(Boolean).join("/")}`;
const attributePattern = /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
const skippedSchemes = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(target) : [target];
    })
  );
  return files.flat();
}

async function exists(candidate) {
  try {
    await access(candidate, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolvesToOutput(target) {
  const candidates = path.extname(target)
    ? [target]
    : [`${target}.html`, path.join(target, "index.html")];
  for (const candidate of candidates) {
    if (await exists(candidate)) return true;
  }
  return false;
}

const htmlFiles = (await walk(distDir)).filter((file) => file.endsWith(".html"));
const failures = [];
let checked = 0;

for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, "utf8");
  for (const match of html.matchAll(attributePattern)) {
    const original = match[1];
    if (skippedSchemes.test(original)) continue;

    const pathOnly = original.split(/[?#]/, 1)[0];
    if (!pathOnly) continue;

    let outputRelative;
    if (pathOnly.startsWith("/")) {
      if (basePath !== "/" && pathOnly !== basePath && !pathOnly.startsWith(`${basePath}/`)) {
        failures.push(`${path.relative(distDir, htmlFile)} -> ${original} (outside BASE_PATH)`);
        continue;
      }
      outputRelative = basePath === "/" ? pathOnly.slice(1) : pathOnly.slice(basePath.length).replace(/^\//, "");
    } else {
      outputRelative = path.relative(
        distDir,
        path.resolve(path.dirname(htmlFile), decodeURIComponent(pathOnly))
      );
    }

    const target = path.resolve(distDir, outputRelative || ".");
    if (target !== distDir && !target.startsWith(`${distDir}${path.sep}`)) {
      failures.push(`${path.relative(distDir, htmlFile)} -> ${original} (outside dist)`);
      continue;
    }

    checked += 1;
    if (!(await resolvesToOutput(target))) {
      failures.push(`${path.relative(distDir, htmlFile)} -> ${original}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Found ${failures.length} broken internal link(s):`);
  for (const failure of failures.slice(0, 100)) console.error(`- ${failure}`);
  if (failures.length > 100) console.error(`...and ${failures.length - 100} more`);
  process.exit(1);
}

console.log(`Checked ${checked} internal link/asset reference(s) across ${htmlFiles.length} HTML file(s)`);
