import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/system-design/calendar-scheduling-system.md", import.meta.url), "utf8");

describe("calendar system design editorial checks", () => {
  it("keeps ownership, concurrency, and projection ordering explicit", () => {
    for (const qualification of [
      "412 Precondition Failed",
      "Separate revision domains",
      "Keep personal preferences outside generated occurrence rows.",
      "Revision guards work for complete replacement snapshots within one revision domain.",
      "A comparison against the destination row alone is insufficient",
      "Reading authoritative details by event ID does not solve a missing range-index entry",
      "invitation is actionable only after the authoritative attendee membership is installed",
    ]) {
      // Case-insensitive matching lets an editorial sentence start with a capital letter.
      assert.ok(article.toLowerCase().includes(qualification.toLowerCase()), qualification);
    }
  });

  it("covers recurrence, delivery uncertainty, synchronization, and privacy", () => {
    for (const qualification of [
      "Index exception replacements by their effective interval",
      "a time-range scan over already materialized entries cannot discover",
      "query for November 10 must find it",
      "do not always iterate from the original start date",
      "return a clearly signaled retryable/incomplete response",
      "old segment before the selected original slot",
      "reject a nonexistent user-entered local time",
      "Maintain a last-completed watermark",
      "It cannot atomically commit with an arbitrary email provider.",
      "Allocating increasing IDs outside commit order is unsafe",
      "a revoked event readable",
      "Enforce non-overlap at the authoritative reservation transaction.",
      "does not automatically become a shared calendar",
    ]) assert.ok(article.includes(qualification), qualification);
  });

  it("keeps illustrative throughput and storage calculations consistent", () => {
    assert.equal(100_000_000 * 20, 2_000_000_000);
    assert.equal(Math.round(2_000_000_000 / 86_400), 23_148);
    assert.equal(Math.round(2_000_000_000 / 86_400 * 10), 231_481);
    assert.equal(Math.round(200_000_000 / 86_400), 2_315);
    assert.equal(Math.round(800_000_000 / 86_400), 9_259);
    assert.equal(10_000_000_000 * 1000 / 1e12, 10);
    for (const estimate of ["23,148", "231,481", "2,315", "9,259", "10 TB", "30–100 TB"]) {
      assert.ok(article.includes(estimate), estimate);
    }
  });

  it("publishes five diagrams, four accessible tables, and seven primary references", () => {
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 5);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 4);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 4);
    assert.ok(article.includes('topic: "Collaboration & Scheduling"'));
    assert.ok(article.includes("date: 2026-10-20"));
    assert.equal((article.split("## Further reading\n")[1].match(/^- \[/gm) ?? []).length, 7);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
