import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { groupByLatestArticle, newestFirst } from "../src/lib/contentOrdering.ts";

const slug = "nat-addresses-ports-and-connection-state";
const article = readFileSync(new URL(`../src/content/field-notes/${slug}.md`, import.meta.url), "utf8");

describe("NAT Field Note", () => {
  it("continues the existing networking topic with a full mechanism and failure analysis", () => {
    const entries = ["ipv4-ipv6-production-migration", slug].map((id) => {
      const data = parse(readFileSync(new URL(`../src/content/field-notes/${id}.md`, import.meta.url), "utf8").split("---")[1]);
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(entries[1].data.topic, "Computer Networking Fundamentals");
    assert.equal(entries[1].data.date.toISOString().slice(0, 10), "2026-11-03");
    assert.deepEqual(newestFirst(entries).map(({ id }) => id), [slug, "ipv4-ipv6-production-migration"]);
    assert.equal(groupByLatestArticle(entries, entry => entry.data.topic).length, 1);
    for (const text of [
      "a fixed one-to-one mapping", "five-tuple", "routing or tenant context", "pseudo-header",
      "IPv4 UDP's permitted zero checksum", "Noninitial IP fragments lack transport ports",
      "endpoint-independent mapping", "Filtering answers a different question", "port reservation",
      "client's own ephemeral-port limits", "asynchronous replication", "exactly-once execution",
      "STUN", "TURN", "NAT rebinding", "DNS64", "100.64.0.0/10",
      "Failure scenarios", "Senior and Staff", "application authentication and authorization",
      "timers, and partner permissions",
    ]) assert.ok(article.toLowerCase().includes(text.toLowerCase()), text);
  });

  it("keeps translation endpoints, destination-specific capacity, and memory estimates consistent", () => {
    const internal = ["10.0.0.7", 51000];
    const external = ["198.51.100.20", 40001];
    const remote = ["203.0.113.80", 443];
    for (const [address, port] of [internal, external, remote]) assert.ok(article.includes(`${address}:${port}`));
    const occupied = 2000 * (20 + 40);
    assert.equal(occupied, 120_000);
    assert.equal(Math.ceil(occupied / 50_000), 3);
    assert.equal(Math.ceil(occupied / (0.75 * 50_000)), 4);
    assert.equal(occupied * 256, 30_720_000);
    assert.equal((occupied * 256 / 2 ** 20).toFixed(1), "29.3");
    assert.equal(8 * 55_000, 440_000);
    for (const text of ["120,000", "50,000", "37,500", "30,720,000", "29.3 MiB", "440,000",
      "illustrative assumption", "steady-state estimate", "rather than treating it as a measured per-flow cost"])
      assert.ok(article.includes(text), text);
  });

  it("dates product changes and preserves the boundaries of each documented behavior", () => {
    for (const text of ["February 1, 2023", "November 2025", "March 31, 2026",
      "API version released after", "Existing virtual networks remain unchanged", "Earlier API versions",
      "zonal deployment model", "delayed expansion", "automatic and manual modes",
      "disabled by default", "requires endpoint-independent mapping to be disabled",
      "not necessarily select that behavior by default", "without an asserted launch date"])
      assert.ok(article.includes(text), text);
  });

  it("publishes an original English long-form article with accessible static visuals and consulted reading", () => {
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 3);
    assert.equal((article.match(/```math\n/g) ?? []).length, 2);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 4);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 4);
    assert.equal((article.split("## Further reading\n")[1].match(/^- \[/gm) ?? []).length, 12);
    for (const heading of ["## Failure scenarios", "## Changes from 2023 through 2026", "## Design takeaways", "## Further reading"])
      assert.ok(article.includes(heading));
    assert.ok(article.split(/\s+/).length >= 3500);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
