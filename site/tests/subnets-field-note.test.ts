import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/field-notes/subnets-address-planning-and-packet-paths.md", import.meta.url), "utf8");

describe("subnets Field Note editorial checks", () => {
  it("keeps allocation, forwarding, security, and recovery boundaries distinct", () => {
    for (const qualification of [
      "Creating two prefixes on the same uncontrolled Layer 2 network does not establish a security boundary.",
      "A mask alone does not override a more specific route",
      "on the wrong link when replying",
      "Rejecting identical CIDR strings alone misses",
      "A parent pool intentionally contains its delegated children",
      "a database lease expiring does not make reuse safe",
      "The association is a platform rule",
      "A Service CIDR is not automatically an on-link Ethernet subnet",
      "Receiving an address does not by itself establish",
      "Removing a range is constrained by allocations",
      "Managed platforms can also make subnet IPv4 CIDRs immutable",
    ]) assert.ok(article.includes(qualification), qualification);
  });

  it("keeps subnet arithmetic, fragmentation, and recovery capacity consistent", () => {
    assert.equal(77 & 192, 64);
    assert.equal(2 ** (32 - 26), 64);
    assert.equal(64 + 64 - 1, 127);
    assert.equal(2 ** (24 - 22), 4);
    assert.equal(2 ** (64 - 48), 65_536);
    assert.equal(2 ** (64 - 56), 256);
    assert.equal(65_536 / 8, 8192);
    assert.equal(256 - 16, 240);
    assert.equal(1024 - 5 - 4 * (256 - 5), 15);
    const survivingActive = 3 * 240 / 2;
    const peak = survivingActive * 1.25 + 32 + 20;
    assert.equal(peak, 502);
    assert.equal(512 - 5 - peak, 5);
    assert.equal(800 / 40, 20);
    for (const example of [
      "192.0.2.64/26", "192.0.2.127", "10.42.0.128/26", "10.42.0.192/27",
      "10.42.0.224/27", "251 assignable addresses", "1004", "1019", "502",
      "240 addresses remain free, but zero complete `/28` blocks are free",
      "65,536", "8192 bytes",
    ]) assert.ok(article.includes(example), example);
  });

  it("dates shipped changes and preserves their platform-specific scope", () => {
    for (const qualification of [
      "January 29, 2024", "April 4, 2024", "April 23, 2025",
      "same VPC and Availability Zone constraint",
      "It does not resize the original subnet or renumber running Pods.",
      "It does not enlarge cloud subnets",
      "Feature presence also does not establish adoption across the industry.",
    ]) assert.ok(article.includes(qualification), qualification);
  });

  it("publishes an English networking article with accessible visuals and primary sources", () => {
    assert.ok(article.includes('topic: "Computer Networking Fundamentals"'));
    assert.ok(article.includes("date: 2026-10-21"));
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 3);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 3);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 3);
    assert.equal((article.split("## Further reading\n")[1].match(/^- \[/gm) ?? []).length, 12);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
