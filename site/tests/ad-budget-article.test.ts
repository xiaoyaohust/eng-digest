import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/system-design/real-time-ad-budget-pacing.md", import.meta.url), "utf8");

describe("ad budget design editorial checks", () => {
  it("preserves budget conservation and the limits of expiry and operational counters", () => {
    for (const contract of [
      "C + R <= B",
      "available = B - C - R",
      "Reserved exposure is not automatically overspend.",
      "Expiry alone is not evidence that money is unused.",
      "owner crash must recover the consumption journal",
      "Persist the uniqueness decision with its charge effect",
      "Expiring a stream entry never authorizes a second bill.",
      "wall-clock deadline or an event-time watermark alone",
      "Child allocations are contained within their parent's reservation",
      "A budget decrease below `C + R` cannot be promised immediately.",
    ]) {
      assert.ok(article.includes(contract), `Missing correctness qualification: ${contract}`);
    }
  });

  it("keeps the illustrative capacity calculations consistent", () => {
    const opportunities = 500_000_000 * 40;
    const impressions = opportunities * 0.75;
    assert.equal(impressions, 15_000_000_000);
    assert.equal(impressions * 250 / 1e12, 3.75);
    assert.equal(impressions * 250 * 7 * 3 / 1e12, 78.75);
    assert.equal(impressions * 250 * 30 / 1e12, 112.5);
    assert.equal(1_000_000 * 10_000, 10_000_000_000);
    assert.equal(10_000 * 16 * 100_000 / 1e9, 16);
    assert.equal(impressions * 32 * 3 / 1e12, 1.44);
    for (const number of ["3.75 TB/day", "78.75 TB", "112.5 TB", "10 billion checks/s", "16 GB/s", "1.44 TB"]) {
      assert.ok(article.includes(number), `Missing estimate: ${number}`);
    }
  });

  it("publishes five diagrams and three accessible tables with English content", () => {
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 5);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 3);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 3);
    assert.ok(article.includes("date: 2026-10-17"));
    assert.ok(article.includes("topic: \"Data & ML Platforms\""));
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
