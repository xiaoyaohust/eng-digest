import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const article = readFileSync(new URL("../src/content/field-notes/ip-addresses-in-production.md", import.meta.url), "utf8");

describe("IP addressing Field Note editorial checks", () => {
  it("keeps the prefix examples and capacity arithmetic consistent", () => {
    const ipv4 = (value: string) => value.split(".").reduce((result, octet) => result * 256 + Number(octet), 0);
    const routes = [
      { network: "0.0.0.0", prefix: 0, action: "Default gateway" },
      { network: "192.0.2.0", prefix: 24, action: "Network A" },
      { network: "192.0.2.128", prefix: 25, action: "Network B" },
    ];
    for (const [destination, expected] of [
      ["192.0.2.130", "Network B"],
      ["192.0.2.42", "Network A"],
      ["198.51.100.7", "Default gateway"],
    ]) {
      const selected = routes.filter(({ network, prefix }) =>
        Math.floor(ipv4(destination) / 2 ** (32 - prefix)) === ipv4(network) / 2 ** (32 - prefix)
      ).sort((left, right) => right.prefix - left.prefix)[0];
      assert.equal(selected.action, expected);
      assert.ok(article.includes(destination));
    }
    assert.equal(130 & 128, 128);
    assert.equal(2 ** (32 - 24) - 5, 251);
    assert.equal(2 ** (16 - 12), 16);
    assert.equal(8_000 * 10, 80_000);
    for (const estimate of ["251 assignable addresses", "16` blocks", "80,000 concurrent mappings"]) {
      assert.ok(article.includes(estimate), `Missing estimate: ${estimate}`);
    }
  });

  it("preserves the qualifications that prevent misleading operational advice", () => {
    for (const qualification of [
      "no universal 65,535-total-connections-per-public-IP rule",
      "per assigned IPv4 address to each unique destination",
      "DNS64 alone cannot intercept a DNS query that never happens",
      "does not automatically renumber existing Services, expand the Pod address pool",
      "does not guarantee geographic proximity",
      "cannot transfer TCP sequence state",
      "A DHCPv6 lease alone does not establish",
      "A longer route might direct a subset to one side, but it cannot distinguish two intended destinations",
      "Blocking all ICMPv6 discards protocol functions",
      "authenticate the current workload independently",
    ]) {
      assert.ok(article.includes(qualification), `Missing qualification: ${qualification}`);
    }
  });

  it("publishes an English networking article with diagrams, accessible tables, and primary references", () => {
    assert.ok(article.includes('topic: "Computer Networking Fundamentals"'));
    assert.ok(article.includes("date: 2026-10-17"));
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 3);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 4);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 4);
    const furtherReading = article.split("## Further reading\n")[1];
    assert.equal((furtherReading.match(/^- \[/gm) ?? []).length, 12);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
