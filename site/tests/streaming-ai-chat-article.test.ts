import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import YAML from "yaml";

const article = readFileSync(new URL("../src/content/system-design/streaming-ai-chat-platform.md", import.meta.url), "utf8");
const metadata = YAML.parse(article.match(/^---\n([\s\S]*?)\n---/)![1]);

describe("streaming AI chat publication", () => {
  it("joins the existing AI platform cluster and keeps its date and publication settings", () => {
    assert.equal(metadata.title, "Design a Streaming AI Chat Platform");
    assert.equal(String(metadata.date), "2026-11-06");
    assert.equal(metadata.topic, "AI Platforms & Security");
    assert.equal(metadata.draft, false);
    assert.equal(metadata.featured, true);
    assert.deepEqual(metadata.level, ["senior", "staff", "principal"]);
  });

  it("states quota, retry, ownership, and completion guarantees without a TTL shortcut", () => {
    for (const contract of [
      "No conversation history does not mean no durable control state.",
      "UTC-aligned fixed three-hour windows",
      "used + reserved <= limit",
      "in the same authoritative transaction",
      "A reservation timeout is a reconciliation trigger, not permission to refund.",
      "Retain an old window's counter while unresolved reservations still reference it.",
      "No first token does not prove no inference started.",
      "same logical request", "attempt epochs", "Already executing device work",
      "202 with `cancel_requested`",
      "EOF without a terminal event means interrupted output.",
      "commit its final content and completion marker before sending `generation.completed`",
      "Model decoding can finish before this product-level completion.",
      "can duplicate work and exceed quota",
      "does not mean generation capacity is available",
    ]) assert.ok(article.includes(contract), `Missing contract: ${contract}`);
  });

  it("keeps connection, token, buffer, and content-volume estimates consistent", () => {
    const daily = 5_000_000 * 10;
    assert.ok(Math.abs(daily / 86_400 - 579) < 1);
    const peak = 6000, duration = 30;
    assert.equal(peak * duration, 180_000);
    assert.equal(peak * 1000, 6_000_000);
    assert.equal(peak * 600, 3_600_000);
    assert.equal(peak * 600 / (peak * duration), 20);
    assert.equal(peak * duration * 64 * 1024 / 1e9, 11.79648);
    assert.equal(daily * 6000 / 1e9, 300);
    assert.equal(daily * 6000 * 365 / 1e12, 109.5);
    assert.equal(daily * 6000 * 365 * 3 / 1e12, 328.5);
    assert.equal(peak * 600 * 6 / 1e6, 21.6);
    for (const value of ["180,000 concurrent streams", "6 million input tokens/s", "3.6 million output tokens/s",
      "11.8 GB", "300 GB/day", "109.5 TB/year", "328.5 TB/year", "21.6 MB/s"])
      assert.ok(article.includes(value), `Missing estimate: ${value}`);
  });

  it("publishes valid JSON and framed SSE examples with explicit terminal outcomes", () => {
    const json = [...article.matchAll(/```json\n([\s\S]*?)\n```/g)].map(match => JSON.parse(match[1]));
    assert.equal(json.length, 3);
    assert.equal(json[0].stream, true);
    assert.equal(json[0].max_output_tokens, 1000);
    assert.equal(json[1].status, "completed");
    assert.equal(json[2].error.code, "quota_exhausted");
    assert.equal(json[2].error.retryable, false);
    const streams = [...article.matchAll(/```text\n([\s\S]*?)\n```/g)]
      .map(match => match[1]).filter(block => block.startsWith("event:"));
    assert.equal(streams.length, 2);
    const parsed = streams.map(stream => {
      assert.ok(stream.endsWith("\n"), "The final event needs a blank line before the closing fence");
      return stream.trim().split(/\n\n/).map(frame => {
        const lines = frame.split("\n");
        assert.equal(lines.length, 2);
        assert.match(lines[0], /^event: generation\./);
        return { event: lines[0].slice(7), data: JSON.parse(lines[1].slice(6)) };
      });
    });
    assert.equal(parsed[0].at(-1)!.event, "generation.completed");
    assert.equal(parsed[1][0].event, "generation.error");
    assert.equal(parsed[1][0].data.action, "manual_regenerate");
    let sequence = -1;
    for (const { data } of parsed[0]) {
      assert.equal(data.generation_id, "gen_123");
      assert.ok(data.sequence > sequence);
      sequence = data.sequence;
    }
    assert.ok(article.includes("Examples abbreviate content and intermediate events"));
  });

  it("provides five diagrams, two formulas, accessible tables, and consulted primary sources", () => {
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 5);
    assert.equal((article.match(/```math\n/g) ?? []).length, 2);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 5);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 5);
    assert.equal((article.split("## Further reading\n")[1].match(/^- \[/gm) ?? []).length, 9);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
