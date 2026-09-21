import { readdir, readFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import YAML from "yaml";

const root = process.cwd();
const contentRoot = path.join(root, "src", "content");
const outputRoot = path.join(root, "public", "social", "auto");
const collections = ["system-design", "coding", "interviews"];

const escapeXml = (value = "") => String(value).replace(/[<>&'\"]/g, (character) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
})[character]);

function wrap(text, limit) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if (`${line} ${word}`.trim().length > limit && line) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const location = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(location) : location;
  }));
  return files.flat().filter((file) => /\.mdx?$/.test(file));
}

function frontmatter(source) {
  const match = source.match(/^---\s*\n([\s\S]*?)\n---/);
  return match ? YAML.parse(match[1]) : {};
}

function cardSvg(data, collection) {
  const titleLines = wrap(data.title, 31).slice(0, 3);
  const descriptionLines = wrap(data.description ?? "", 72).slice(0, 2);
  const tags = (data.tags ?? []).slice(0, 4).join("  /  ");
  const label = collection.replace("-", " ").toUpperCase();
  return `
    <svg width="1200" height="627" viewBox="0 0 1200 627" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="627" fill="#07111f"/>
      <defs><pattern id="grid" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M38 0H0V38" fill="none" stroke="#17304a" stroke-width="1"/></pattern></defs>
      <rect width="1200" height="627" fill="url(#grid)" opacity=".55"/>
      <path d="M0 0H285" stroke="#21d4c2" stroke-width="7"/><path d="M285 0H350" stroke="#f4b942" stroke-width="7"/>
      <g transform="translate(76 68)">
        <rect x="0" y="0" width="44" height="44" fill="none" stroke="#4d708e" transform="rotate(45 22 22)"/>
        <circle cx="11" cy="31" r="3" fill="#21d4c2"/><circle cx="22" cy="22" r="3" fill="#21d4c2"/><circle cx="33" cy="13" r="3" fill="#f4b942"/>
        <text x="70" y="20" fill="#eef6ff" font-family="ui-monospace, monospace" font-size="18" font-weight="700" letter-spacing="2">ENG//KNOWLEDGE</text>
        <text x="70" y="42" fill="#7f96ad" font-family="ui-monospace, monospace" font-size="11" letter-spacing="3">INTERVIEW WORKBENCH</text>
      </g>
      <text x="76" y="178" fill="#21d4c2" font-family="ui-monospace, monospace" font-size="15" font-weight="700" letter-spacing="3">${escapeXml(label)} / FIELD NOTE</text>
      ${titleLines.map((line, index) => `<text x="76" y="${252 + index * 67}" fill="#f5f8fc" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="750" letter-spacing="-2">${escapeXml(line)}</text>`).join("")}
      ${descriptionLines.map((line, index) => `<text x="76" y="${486 + index * 28}" fill="#9db0c3" font-family="Inter, Arial, sans-serif" font-size="20">${escapeXml(line)}</text>`).join("")}
      <line x1="76" y1="566" x2="1124" y2="566" stroke="#294158"/>
      <text x="76" y="599" fill="#f4b942" font-family="ui-monospace, monospace" font-size="13" font-weight="700" letter-spacing="2">${escapeXml(tags || "SYSTEMS / JUDGMENT / TRADE-OFFS")}</text>
      <text x="1124" y="599" text-anchor="end" fill="#7f96ad" font-family="ui-monospace, monospace" font-size="13">SYSTEMCRAFTLAB.COM</text>
    </svg>`;
}

await rm(outputRoot, { recursive: true, force: true });
let count = 0;
for (const collection of collections) {
  const sourceDirectory = path.join(contentRoot, collection);
  for (const file of await walk(sourceDirectory)) {
    const data = frontmatter(await readFile(file, "utf8"));
    if (!data.title || data.draft) continue;
    const relative = path.relative(sourceDirectory, file).replace(/\.mdx?$/, "");
    const destination = path.join(outputRoot, collection, `${relative}.png`);
    await mkdir(path.dirname(destination), { recursive: true });
    await sharp(Buffer.from(cardSvg(data, collection))).png({ quality: 92 }).toFile(destination);
    count += 1;
  }
}
console.log(`Generated ${count} social preview cards.`);
