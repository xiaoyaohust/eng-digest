import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/system-design/crawl-based-product-catalog.md", import.meta.url), "utf8");

describe("crawl-based product catalog editorial checks", () => {
  it("states permission, identity, and source-observation limits", () => {
    for (const contract of [
      "merchant offer for a particular variant and market",
      "they do not grant access or media rights",
      "not an atomic snapshot of the merchant's database",
      "preserve parameters that select size, color, market",
      "independent URL counters cannot safely order writes to the same offer",
      "DNS-rebinding gap",
      "Browser subrequests also pass through the controlled egress path",
    ]) assert.ok(article.includes(contract), contract);
  });

  it("keeps work delivery, evidence age, and publication ordering explicit", () => {
    for (const contract of [
      "last-completed scheduling watermark",
      "manifest and transactional event outbox",
      "source epoch, generation/fence, expected current revision",
      "Reading a separate configuration row and writing an offer later leaves a revocation race",
      "old HTML today does not make its price current today",
      "An unchanged HTML shell does not validate a separate inventory API",
      "cannot overwrite newer evidence or a tombstone",
      "independently running the same crawl",
    ]) assert.ok(article.toLowerCase().includes(contract.toLowerCase()), contract);
  });

  it("bounds crawl load and cached advertising eligibility", () => {
    for (const contract of [
      "stop issuing new permits",
      "Schedule no earlier than the server's retry time",
      "A precomputed eligibility flag alone cannot expire itself",
      "pause mass deletion",
      "Cache hits still pass expiration and source-policy checks",
      "Apply pointer updates only when their published revision is newer",
      "Cached regional reads do not provide instant global revocation",
      "Do not assume that every currency has two decimal places",
      "reference tracking with a grace period",
    ]) assert.ok(article.toLowerCase().includes(contract.toLowerCase()), contract);
  });

  it("recomputes refresh, bandwidth, media, and lookup estimates", () => {
    const offers = 500_000_000;
    const dailyFetches = offers * 0.05 * 24 + offers * 0.25 * 4 + offers * 0.7;
    assert.equal(dailyFetches, 1_450_000_000);
    assert.equal(Math.round(dailyFetches / 86_400), 16_782);
    assert.equal(Math.round(dailyFetches / 86_400 * 5), 83_912);
    assert.equal(dailyFetches * 250_000 / 1e12, 362.5);
    assert.equal(offers * 5000 / 1e12, 2.5);
    assert.equal(offers * 3 * 250_000 / 1e12, 375);
    assert.equal(offers * 0.1 * 10_000_000 / 1e12, 500);
    assert.equal(Math.round(10_000_000_000 / 86_400), 115_741);
    assert.equal((500_000 / 86_400).toFixed(1), "5.8");
    for (const figure of ["1.45 billion", "16,782", "83,912", "4.20 GB/s", "362.5 TB/day", "2.5 TB", "375 TB", "500 TB", "115,741/s", "5.8 days"]) {
      assert.ok(article.includes(figure), figure);
    }
  });

  it("publishes English content with five diagrams, four accessible tables, and eight primary references", () => {
    assert.ok(article.includes("date: 2026-10-23"));
    assert.ok(article.includes('topic: "Data & ML Platforms"'));
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 5);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 4);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 4);
    assert.equal((article.split("## Further reading\n")[1].match(/^- \[/gm) ?? []).length, 8);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
