#!/usr/bin/env node
// Reads the Python pipeline's committed digest Markdown (../digests/digest-*.md,
// relative to this script) and writes Astro-ready copies with frontmatter under
// src/content/generated-digests/. The source files under /digests are never
// modified; the generated copies are gitignored and rebuilt on every `npm run build`.

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const digestsDir = path.resolve(scriptDir, "..", "..", "digests");
const outputDir = path.resolve(scriptDir, "..", "src", "content", "generated-digests");

const FILENAME_RE = /^digest-(\d{4}-\d{2}-\d{2})\.md$/;
const STATS_RE = /\*\*Total Articles:\*\*\s*(\d+)\s*from\s*(\d+)\s*sources?/i;
const TITLE_RE = /^#\s+(.+?)\s*$/m;
const SOURCE_HEADING_RE = /^##\s+(.+?)\s*$/gm;

function yamlString(value) {
  return JSON.stringify(value);
}

async function importDigests() {
  await mkdir(outputDir, { recursive: true });

  let entries;
  try {
    entries = await readdir(digestsDir);
  } catch (err) {
    console.error(`Digests directory not found: ${digestsDir}`);
    throw err;
  }

  const digestFiles = entries.filter((name) => FILENAME_RE.test(name)).sort();

  if (digestFiles.length === 0) {
    console.warn(`No digest-*.md files found in ${digestsDir}`);
    return;
  }

  let imported = 0;

  for (const filename of digestFiles) {
    const match = filename.match(FILENAME_RE);
    const date = match[1];
    const sourcePath = path.join(digestsDir, filename);
    const body = await readFile(sourcePath, "utf-8");

    const titleMatch = body.match(TITLE_RE);
    const title = titleMatch ? titleMatch[1] : `Engineering Daily Digest – ${date}`;

    const statsMatch = body.match(STATS_RE);
    const articleCount = statsMatch ? Number(statsMatch[1]) : undefined;
    const sourceCount = statsMatch ? Number(statsMatch[2]) : undefined;

    const sources = [...body.matchAll(SOURCE_HEADING_RE)].map((m) => m[1]);

    const frontmatterLines = [
      "---",
      `title: ${yamlString(title)}`,
      `date: ${date}`,
      "generated: true",
    ];
    if (articleCount !== undefined) frontmatterLines.push(`articleCount: ${articleCount}`);
    if (sourceCount !== undefined) frontmatterLines.push(`sourceCount: ${sourceCount}`);
    if (sources.length > 0) {
      frontmatterLines.push("sources:");
      for (const source of sources) {
        frontmatterLines.push(`  - ${yamlString(source)}`);
      }
    }
    frontmatterLines.push("---", "");

    // Drop the leading "# <title>" line from the body: the title is already
    // in frontmatter and the Astro article layout renders its own <h1>.
    const bodyWithoutTitle = body.replace(TITLE_RE, "").replace(/^\s+/, "");

    const outputContent = frontmatterLines.join("\n") + "\n" + bodyWithoutTitle;
    const outputPath = path.join(outputDir, `${date}.md`);
    await writeFile(outputPath, outputContent, "utf-8");
    imported += 1;
  }

  console.log(`Imported ${imported} digest(s) from ${digestsDir} -> ${outputDir}`);
}

importDigests().catch((err) => {
  console.error("import-digests failed:", err);
  process.exit(1);
});
