import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/system-design/search-autocomplete-system.md", import.meta.url), "utf8");

describe("autocomplete system design editorial checks", () => {
  it("preserves the boundaries between retrieval, ranking, and policy enforcement", () => {
    for (const qualification of [
      "A minimized FST state is not automatically a unique prefix ID.",
      "M greater than K does not guarantee K safe results",
      "Do not add a cumulative overlay count to a base count that already contains those events.",
      "admitted overlay record must include normalized text, display text",
      "An old base snapshot is not a safety fallback when policy freshness expires.",
      "applied revision and age",
      "including cache hits and bounded refill",
      "Cache-Control: no-store",
      "Hashing complete **prefix keys** is valid",
      "Do not let a gateway send a new-epoch shard request",
      "cannot learn an unreceived removal instantaneously",
      "Hashing a user identifier does not make a query history anonymous.",
    ]) {
      assert.ok(article.includes(qualification), `Missing qualification: ${qualification}`);
    }
  });

  it("keeps the illustrative load, memory, distribution, and failover calculations consistent", () => {
    const searches = 10_000_000 * 10;
    const requests = searches * 20;
    assert.equal(requests, 2_000_000_000);
    assert.equal(Math.round(requests / 86_400), 23_148);
    assert.equal(Math.round(requests / 86_400 * 2), 46_296);
    assert.equal(searches * 200 / 1e9, 20);
    assert.equal(requests * 0.05 * 200 / 1e9, 20);
    assert.equal(50_000_000 * 20 / 1e9, 1);
    assert.equal(100_000_000 * 50 * (8 + 4) / 1e9, 60);
    assert.equal(1000 * 20 / 1000, 20);
    assert.equal(24 * 5000 * 0.7, 84_000);
    assert.equal((24 - 8) * 5000 * 0.7, 56_000);
    for (const estimate of ["23,148", "46,296", "20 GB/day", "1 GB", "60 GB", "20 TB", "84,000", "56,000"]) {
      assert.ok(article.includes(estimate), `Missing estimate: ${estimate}`);
    }
  });

  it("publishes five diagrams, three accessible tables, and English content", () => {
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 5);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 3);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 3);
    assert.ok(article.includes('topic: "Search & Retrieval"'));
    assert.ok(article.includes("date: 2026-10-18"));
    const reading = article.split("## Further reading\n")[1];
    assert.equal((reading.match(/^- \[/gm) ?? []).length, 8);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
