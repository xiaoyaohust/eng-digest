import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { groupByLatestArticle, newestFirst } from "../src/lib/contentOrdering.ts";

const slug = "tcp-reliable-bytes-congestion-and-failure";
const article = readFileSync(new URL(`../src/content/field-notes/${slug}.md`, import.meta.url), "utf8");
const metadata = parse(article.split("---")[1]);

describe("TCP Field Note", () => {
  it("continues the manually assigned networking category with a new publication date", () => {
    assert.equal(metadata.title, "TCP: Reliable Bytes, Congestion, and Failure Boundaries");
    assert.equal(metadata.topic, "Computer Networking Fundamentals");
    assert.equal(String(metadata.date), "2026-11-10");
    assert.equal(metadata.draft, false);
    const entries = ["ports-sockets-connections-and-capacity", slug].map(id => {
      const data = parse(readFileSync(new URL(`../src/content/field-notes/${id}.md`, import.meta.url), "utf8").split("---")[1]);
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(newestFirst(entries)[0].id, slug);
    assert.equal(groupByLatestArticle(entries, entry => entry.data.topic)[0][0], metadata.topic);
    for (const link of ["ports-sockets-connections-and-capacity", "nat-addresses-ports-and-connection-state"])
      assert.ok(article.includes(`/field-notes/${link}/`));
  });

  it("preserves transport, application, recovery, and endpoint ownership boundaries", () => {
    for (const text of ["does not preserve application message boundaries", "two independent directions",
      "does not certify", "until cumulatively acknowledged", "one repeated ACK alone",
      "within an established connection", "half-open", "packet-by-packet",
      "raw calculation", "one second", "permitted conditions", "congestion window",
      "Flow control", "Pacing", "a new operation attempt", "transaction boundary",
      "packet-forwarding load balancer", "general idle-request timer",
      "does not by itself schedule keepalive", "cannot recreate that state", "CLOSE_WAIT",
      "TIME_WAIT", "SYN cookies", "per frame", "exclusive ownership", "## How Senior and Staff",
      "## A working model"])
      assert.ok(article.toLowerCase().includes(text.toLowerCase()), text);
  });

  it("keeps sequence positions, bandwidth units, timer arithmetic, and memory estimates consistent", () => {
    assert.equal(1000 + 1 + 4, 1005);
    assert.equal(1460 / 0.08, 18_250);
    assert.equal(1e9 / 8 * 0.08, 10_000_000);
    assert.equal(65_536 / 0.08, 819_200);
    assert.equal((65_536 * 8 / 0.08 / 1e6).toFixed(2), "6.55");
    assert.equal(80 + Math.max(1, 4 * 10), 120);
    assert.equal((100_000 * 32 * 1024 / 1e9).toFixed(2), "3.28");
    for (const value of ["18,250", "146 kilobits/s", "819,200", "6.55", "10 MB", "120 ms", "3.28 GB"])
      assert.ok(article.includes(value), value);
  });

  it("dates developments and distinguishes experimental specifications from deployment reports", () => {
    for (const text of ["February 2021", "August 2022", "August 2023", "April 2026", "November 2, 2026",
      "March 2024", "not a completed RFC", "intended Experimental status", "at that date",
      "Standardization, implementation availability", "before changing a fleet", "not the invention dates"])
      assert.ok(article.includes(text), text);
    for (const url of ["rfc8985.html", "rfc9438.html", "rfc9768.html", "draft-ietf-ccwg-bbr-07",
      "slides-119-ccwg-bbrv3-overview-and-google-deployment", "timeouts-retries-and-backoff-with-jitter"])
      assert.ok(article.includes(url), url);
  });

  it("publishes a complete English mechanism article with accessible visuals and primary reading", () => {
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 3);
    assert.equal((article.match(/```math\n/g) ?? []).length, 3);
    assert.equal((article.match(/```python\n/g) ?? []).length, 1);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 2);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 2);
    assert.equal((article.split("## Further reading\n")[1].match(/^- \[/gm) ?? []).length, 12);
    assert.ok(article.split(/\s+/).length >= 4000);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
