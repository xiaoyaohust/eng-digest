#!/usr/bin/env node
// Builds deterministic weekly trend reports from the committed daily digests.
// No API, database, or model call is involved: articles are de-duplicated by
// URL and classified with a small, transparent engineering topic taxonomy.

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryDir = path.resolve(scriptDir, "..", "..");
const digestsDir = path.join(repositoryDir, "digests");
const outputDir = path.resolve(scriptDir, "..", "src", "content", "generated-weekly");
const FILENAME_RE = /^digest-(\d{4}-\d{2}-\d{2})\.md$/;

const TOPICS = [
  {
    name: "AI & Machine Learning",
    keywords: ["ai", "agent", "model", "llm", "machine learning", "copilot", "inference", "prompt", "gemini", "bedrock"],
  },
  {
    name: "Infrastructure & Scale",
    keywords: ["infrastructure", "scale", "scaling", "distributed", "capacity", "efficiency", "compute", "cluster", "platform"],
  },
  {
    name: "Databases & Storage",
    keywords: ["database", "storage", "sql", "data store", "redis", "volume", "cache", "zippydb", "replication"],
  },
  {
    name: "Developer Tools",
    keywords: ["developer", "coding", "code", "sdk", "cli", "github", "workflow", "automation", "tooling", "testing"],
  },
  {
    name: "Security & Privacy",
    keywords: ["security", "privacy", "cookie", "authentication", "authorization", "vulnerability", "encryption", "identity"],
  },
  {
    name: "Reliability & Operations",
    keywords: ["reliability", "availability", "incident", "observability", "monitoring", "operations", "resilience", "outage", "sre"],
  },
  {
    name: "Networking",
    keywords: ["network", "proxy", "gateway", "load balancing", "transport", "ethernet", "rdma", "traffic", "routing"],
  },
  {
    name: "Data Engineering",
    keywords: ["data pipeline", "analytics", "stream", "warehouse", "etl", "benchmark", "evaluation", "metrics"],
  },
];

function dateFromIso(value) {
  return new Date(`${value}T12:00:00Z`);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function startOfIsoWeek(date) {
  const result = new Date(date);
  const day = result.getUTCDay() || 7;
  result.setUTCDate(result.getUTCDate() - day + 1);
  return result;
}

function isoWeekId(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function displayDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function parseDigest(body, digestDate) {
  const articles = [];
  let source = "Unknown Source";
  let current;
  let readingSummary = false;

  function finishArticle() {
    if (!current) return;
    current.summary = current.summaryParts.join(" ").replace(/\s+/g, " ").trim();
    delete current.summaryParts;
    if (current.url) articles.push(current);
    current = undefined;
    readingSummary = false;
  }

  for (const line of body.split(/\r?\n/)) {
    const sourceMatch = line.match(/^##\s+(.+?)\s*$/);
    if (sourceMatch) {
      finishArticle();
      source = sourceMatch[1];
      continue;
    }

    const articleMatch = line.match(/^###\s+(?:\d+\.\s*)?(.+?)\s*$/);
    if (articleMatch) {
      finishArticle();
      current = {
        title: articleMatch[1],
        source,
        digestDate,
        url: "",
        summaryParts: [],
      };
      continue;
    }

    if (!current) continue;
    const urlMatch = line.match(/^\*\*URL:\*\*\s*(\S+)/i);
    if (urlMatch) {
      current.url = urlMatch[1];
      continue;
    }
    if (/^\*\*Summary:\*\*/i.test(line)) {
      readingSummary = true;
      continue;
    }
    if (readingSummary && /^\*Generated on\b/i.test(line.trim())) {
      readingSummary = false;
      continue;
    }
    if (readingSummary && line.trim() && line.trim() !== "---") {
      current.summaryParts.push(line.trim());
    }
  }
  finishArticle();
  return articles;
}

function keywordScore(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.match(new RegExp(`\\b${escaped}\\b`, "gi"));
  return matches?.length ?? 0;
}

function classifyArticle(article) {
  const title = article.title.toLowerCase();
  const combined = `${article.title} ${article.summary}`.toLowerCase();
  let best = { name: "Engineering Culture", score: 0 };

  for (const topic of TOPICS) {
    const score = topic.keywords.reduce(
      (total, keyword) => total + keywordScore(combined, keyword) + keywordScore(title, keyword) * 2,
      0
    );
    if (score > best.score) best = { name: topic.name, score };
  }
  return best;
}

function countBy(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function markdownText(value) {
  return value.replace(/([\[\]])/g, "\\$1");
}

async function generateWeeklyDigests() {
  await mkdir(outputDir, { recursive: true });
  const filenames = (await readdir(digestsDir)).filter((name) => FILENAME_RE.test(name)).sort();
  const weeks = new Map();

  for (const filename of filenames) {
    const digestDate = filename.match(FILENAME_RE)[1];
    const date = dateFromIso(digestDate);
    const id = isoWeekId(date);
    const body = await readFile(path.join(digestsDir, filename), "utf8");
    const week = weeks.get(id) ?? { id, dates: [], articles: [] };
    week.dates.push(digestDate);
    week.articles.push(...parseDigest(body, digestDate));
    weeks.set(id, week);
  }

  for (const week of weeks.values()) {
    const weekStart = startOfIsoWeek(dateFromIso(week.dates[0]));
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);

    const unique = new Map();
    for (const article of week.articles) {
      const key = article.url.replace(/\/$/, "").toLowerCase() || article.title.toLowerCase();
      const existing = unique.get(key);
      if (!existing || article.digestDate > existing.digestDate) unique.set(key, article);
    }

    const articles = [...unique.values()].map((article) => {
      const classification = classifyArticle(article);
      return { ...article, topic: classification.name, topicScore: classification.score };
    });
    const topTopics = countBy(articles, (article) => article.topic).slice(0, 5);
    const topSources = countBy(articles, (article) => article.source).slice(0, 5);

    const representatives = [];
    for (const topic of topTopics) {
      const candidate = articles
        .filter((article) => article.topic === topic.name)
        .sort((a, b) => b.topicScore - a.topicScore || b.digestDate.localeCompare(a.digestDate))[0];
      if (candidate && !representatives.some((article) => article.url === candidate.url)) {
        representatives.push(candidate);
      }
    }

    const representativeArticles = representatives.slice(0, 5).map((article) => ({
      title: article.title,
      url: article.url,
      source: article.source,
      topic: article.topic,
      summary: article.summary,
    }));
    const range = `${displayDate(weekStart)} – ${displayDate(weekEnd)}`;
    const complete = new Set(week.dates).size >= 7;
    const frontmatter = [
      "---",
      `title: ${JSON.stringify(`Engineering Weekly Trends — ${range}`)}`,
      `date: ${isoDate(weekStart)}`,
      `weekStart: ${isoDate(weekStart)}`,
      `weekEnd: ${isoDate(weekEnd)}`,
      `digestCount: ${new Set(week.dates).size}`,
      `articleCount: ${articles.length}`,
      `sourceCount: ${new Set(articles.map((article) => article.source)).size}`,
      `complete: ${complete}`,
      `topTopics: ${JSON.stringify(topTopics)}`,
      `topSources: ${JSON.stringify(topSources)}`,
      `representativeArticles: ${JSON.stringify(representativeArticles)}`,
      "---",
      "",
    ];

    const body = [
      complete
        ? `A build-time summary of ${articles.length} unique engineering articles collected across seven daily digests.`
        : `A rolling summary of ${articles.length} unique engineering articles from ${new Set(week.dates).size} available daily digest${new Set(week.dates).size === 1 ? "" : "s"}.`,
      "",
      "## Topic Trends",
      "",
      ...topTopics.map((topic, index) => `${index + 1}. **${topic.name}** — ${topic.count} articles`),
      "",
      "## Source Pulse",
      "",
      ...topSources.map((source, index) => `${index + 1}. **${source.name}** — ${source.count} articles`),
      "",
      "## Representative Articles",
      "",
      ...representativeArticles.flatMap((article) => [
        `### ${markdownText(article.title)}`,
        "",
        `**${article.source}** · ${article.topic}`,
        "",
        article.summary || "No summary was available in the daily digest.",
        "",
        `[Read the original article ↗](${article.url})`,
        "",
      ]),
      "## Method",
      "",
      "Articles are de-duplicated by URL, then classified with a deterministic engineering keyword taxonomy. The report is generated during the site build and does not use a database or an external AI API.",
      "",
    ];

    await writeFile(path.join(outputDir, `${week.id}.md`), frontmatter.join("\n") + body.join("\n"), "utf8");
  }

  console.log(`Generated ${weeks.size} weekly trend report(s) -> ${outputDir}`);
}

generateWeeklyDigests().catch((error) => {
  console.error("generate-weekly-digests failed:", error);
  process.exit(1);
});
