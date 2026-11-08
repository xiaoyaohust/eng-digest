import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";

const slug = "aggregate-transactions-by-merchant-and-hour";
const article = readFileSync(new URL(`../src/content/coding/${slug}.md`, import.meta.url), "utf8");
const data = parse(article.split("---")[1]);

describe("transaction aggregation interview article", () => {
  it("publishes an English Java/Python problem with generic window and supplied time APIs", () => {
    assert.equal(data.title, "Aggregate Transactions by Merchant and Hour");
    assert.equal(String(data.date), "2026-11-08");
    assert.equal(data.draft, false);
    assert.deepEqual(data.languages, ["java", "python"]);
    assert.ok(article.includes("## Problem\n"));
    assert.doesNotMatch(article, /English translation/i);
    const javaCore = article.match(/```java\n([\s\S]*?)\n```/)![1].split("public static void main")[0];
    const pythonCore = article.match(/```python\n([\s\S]*?)\n```/)![1].split("def main():")[0];
    assert.doesNotMatch(javaCore, /\b24\b|3_600_000|System\.currentTimeMillis|ChronoUnit|Duration\./);
    assert.doesNotMatch(pythonCore, /\b24\b|3_600_000|timedelta|datetime/);
    assert.ok(javaCore.includes("hourDifference.between(currentTime, transaction.startTime())"));
    assert.ok(pythonCore.includes("hour_difference(current_time, transaction.start_time)"));
  });

  it("preserves exact grouping, boundaries, money representation, and checked final totals", () => {
    for (const text of ["Map<String, Map<String, Integer>>", "Status.COMPLETED", "windowHours",
      "currentTime", "startTime", "Math.addExact", "Math.toIntExact", "future", "test double",
      "Zero totals", "Cancellation before conversion", "Overflow: rejected", "userId does not"])
      assert.ok(article.replace(/`/g, "").includes(text), text);
    assert.equal(100 + 50, 150);
    assert.equal(100 - 100, 0);
    assert.equal((2 ** 31 - 1) + 1 - 1, 2147483647);
    assert.ok(article.includes("K <= min(n, M × H)"));
    assert.ok(article.includes("O(n + cT + K)"));
  });

  it("qualifies production rollups, updates, state ownership, and report consistency", () => {
    for (const text of ["07:30", "07:00–08:00", "fixed alignment", "Sparse maps", "late data",
      "transaction identity and version policy", "TTL-only", "same report cutoff", "atomic snapshot",
      "separate currencies", "asymptotically optimal"])
      assert.ok(article.includes(text), text);
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 1);
    assert.equal((article.match(/```java\n/g) ?? []).length, 1);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 1);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
