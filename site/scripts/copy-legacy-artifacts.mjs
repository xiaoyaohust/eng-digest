#!/usr/bin/env node

import { copyFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryDir = path.resolve(scriptDir, "..", "..");
const sourceDigestsDir = path.join(repositoryDir, "digests");
const outputDir = path.resolve(scriptDir, "..", "dist");
const outputDigestsDir = path.join(outputDir, "digests");

await mkdir(outputDigestsDir, { recursive: true });

const digestFiles = (await readdir(sourceDigestsDir)).filter(
  (name) => name.endsWith(".md") || name.endsWith(".html")
);

await Promise.all([
  copyFile(path.join(repositoryDir, "rss.xml"), path.join(outputDir, "rss.xml")),
  ...digestFiles.map((name) =>
    copyFile(path.join(sourceDigestsDir, name), path.join(outputDigestsDir, name))
  ),
]);

console.log(`Copied rss.xml and ${digestFiles.length} legacy digest artifact(s) into dist`);
