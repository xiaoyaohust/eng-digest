import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { newestFirst } from "../src/lib/contentOrdering.ts";

const slug = "tcp-three-way-handshake";
const article = readFileSync(new URL(`../src/content/field-notes/${slug}.md`, import.meta.url), "utf8");
const metadata = parse(article.match(/^---\n([\s\S]*?)\n---/)![1]);

describe("TCP three-way handshake Field Note", () => {
  it("continues the networking category without replacing the earlier TCP article", () => {
    assert.equal(metadata.title, "TCP's Three-Way Handshake: State, Latency, and Failure");
    assert.equal(metadata.topic, "Computer Networking Fundamentals");
    assert.equal(String(metadata.date), "2026-11-13");
    assert.equal(metadata.draft, false);
    assert.equal(metadata.featured, true);
    assert.ok(metadata.socialTitle.length < 65);
    assert.ok(metadata.socialDescription.length < 145);
    const previous = "tcp-reliable-bytes-congestion-and-failure";
    const entries = [previous, slug].map(id => {
      const data = parse(readFileSync(new URL(`../src/content/field-notes/${id}.md`, import.meta.url), "utf8").split("---")[1]);
      return { id, data: { ...data, date: new Date(data.date) } };
    });
    assert.equal(newestFirst(entries)[0].id, slug);
    assert.ok(article.includes(`/field-notes/${previous}/`));
  });

  it("keeps sequence positions and asymmetric establishment states explicit", () => {
    const handshake = [...article.matchAll(/```mermaid\n([\s\S]*?)\n```/g)][0][1];
    const ordered = ["SYN, seq 1000", "SYN + ACK, seq 9000, ack 1001", "ESTABLISHED locally", "ACK, seq 1001, ack 9001", "4 data bytes, seq 1001, ack 9001", "ACK 1005"];
    let position = -1;
    for (const part of ordered) {
      const next = handshake.indexOf(part, position + 1);
      assert.ok(next > position, part);
      position = next;
    }
    assert.equal(1000 + 1 + 4, 1005);
    assert.equal((2 ** 32 - 1 + 1) % 2 ** 32, 0);
    for (const phrase of [
      "A pure ACK with no payload consumes no sequence space", "different moments",
      "does not prove that the remote application", "may carry application data",
      "A pure ACK has no independent retransmission timer", "Later acceptable data",
      "does not identify the broken machine", "TCP-terminating proxy", "independent transport state",
    ]) assert.ok(article.includes(phrase), phrase);
  });

  it("keeps latency, arrival-residence estimates, and queue-growth arithmetic consistent", () => {
    assert.equal(3 * 80 + 5, 245);
    assert.equal(80 + 5, 85);
    assert.equal(20_000 * 0.05, 1000);
    assert.equal(20_000 * 2, 40_000);
    assert.equal(12_000 - 10_000, 2000);
    assert.equal((4096 / 2000).toFixed(2), "2.05");
    for (const phrase of ["245 ms", "85 ms", "40,000", "2.05 seconds", "not benchmark results", "initially empty queue", "pending request", "accept queue"])
      assert.ok(article.includes(phrase), phrase);
  });

  it("distinguishes dated changes, established behavior, and early-data limits", () => {
    for (const phrase of [
      "August 2022", "May 2023", "September 2024", "June 2022", "December 2014",
      "tcp_syn_linear_timeouts", "not passive SYN+ACK retries", "distribution backports",
      "Experimental RFC 7413", "Resumption alone does not mean 0-RTT is enabled",
      "ordinary TCP establishment still exists underneath", "Address validation and anti-amplification",
      "options; exact support varies by implementation", "sampling and measurement limitations",
      "same-host monotonic durations", "close abandoned sockets", "SYN cookies to sustain legitimate overload",
    ]) assert.ok(article.includes(phrase), phrase);
  });

  it("publishes English long-form teaching with accessible figures, formulas, and annotated primary reading", () => {
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 4);
    assert.equal((article.match(/```math\n/g) ?? []).length, 3);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 3);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 3);
    const reading = article.split("## Further reading\n")[1];
    assert.equal((reading.match(/^- \[/gm) ?? []).length, 12);
    for (const entry of reading.trim().split("\n")) assert.match(entry, /^- \[.+\]\(https:\/\/.+\) — .+\.$/);
    assert.ok(article.split(/\s+/).length >= 4000);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
