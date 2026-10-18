import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/field-notes/ipv4-ipv6-production-migration.md", import.meta.url), "utf8");

describe("IPv4 and IPv6 Field Note editorial checks", () => {
  it("preserves protocol, migration, and standards-status qualifications", () => {
    for (const qualification of [
      "A DHCPv6 lease alone does not supply",
      "It does not guarantee recovery from a later large-transfer failure",
      "does not authorize racing a state-changing business operation",
      "DNS64 alone does not fix every IPv4 literal",
      "customer-side translator, or CLAT",
      "client-family adoption does not prove that the backend path has migrated",
      "IPv6 does not encrypt application traffic automatically.",
      "a stateful firewall can enforce ingress policy without changing addresses",
      "Internet-Draft, work in progress",
      "it is not a finalized RFC",
      "RFC 8925 from October 2020",
      "Removing an AAAA record does not immediately disconnect clients",
    ]) {
      assert.ok(article.includes(qualification), `Missing qualification: ${qualification}`);
    }
    assert.ok(article.includes("draft-ietf-v6ops-6mops-10.html"));
    assert.ok(article.includes("September 10, 2026"));
  });

  it("keeps the illustrative packet budgets and fallback delays correct", () => {
    assert.equal(2 ** 32, 4_294_967_296);
    assert.equal(1500 - 20 - 20, 1460);
    assert.equal(1500 - 40 - 20, 1440);
    assert.equal(1400 - 40 - 20, 1340);
    assert.equal(100 + 40, 140);
    assert.equal(3000 + 40, 3040);
    for (const estimate of ["4,294,967,296", "1460 bytes", "1440 bytes", "1340 bytes", "140 ms", "3040 ms"]) {
      assert.ok(article.includes(estimate), `Missing estimate: ${estimate}`);
    }
    assert.ok(article.includes("These numbers are hypothetical."));
    assert.ok(article.includes("250 ms default Connection Attempt Delay"));
  });

  it("publishes an English article with accessible diagrams, tables, and primary references", () => {
    assert.ok(article.includes('topic: "Computer Networking Fundamentals"'));
    assert.ok(article.includes("date: 2026-10-18"));
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 3);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 3);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 3);
    const reading = article.split("## Further reading\n")[1];
    assert.equal((reading.match(/^- \[/gm) ?? []).length, 12);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
