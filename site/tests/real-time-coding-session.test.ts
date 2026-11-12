import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";

const article = readFileSync(new URL("../src/content/system-design/real-time-coding-session-platform.md", import.meta.url), "utf8");
const metadata = parse(article.match(/^---\n([\s\S]*?)\n---/)![1]);

describe("real-time coding session publication", () => {
  it("publishes in the existing real-time topic with concise social-card text", () => {
    assert.equal(metadata.title, "Design a Real-Time Coding Session Platform");
    assert.equal(String(metadata.date), "2026-11-11");
    assert.equal(metadata.topic, "Real-Time Systems");
    assert.equal(metadata.draft, false);
    assert.equal(metadata.featured, true);
    assert.deepEqual(metadata.level, ["senior", "staff", "principal"]);
    assert.ok(metadata.socialTitle.length < 65);
    assert.ok(metadata.socialDescription.length < 145);
  });

  it("keeps the edit example executable under the documented sequential UTF-16 splice contract", () => {
    const edit = JSON.parse(article.match(/```json\n([\s\S]*?)\n```/)![1]);
    assert.equal(edit.type, "EDIT");
    assert.equal(edit.base_version, 105);
    assert.equal(edit.client_seq, 91);
    assert.equal(edit.editor_epoch, 7);
    assert.match(edit.edit_id, /^[0-9a-f-]{36}$/);
    let text = "hello world";
    for (const change of edit.changes) {
      assert.ok(change.position >= 0 && change.position + change.delete_count <= text.length);
      text = text.slice(0, change.position) + change.insert + text.slice(change.position + change.delete_count);
    }
    assert.equal(text, "hello coderpad");
    assert.equal(edit.base_version + 1, 106);
    for (const phrase of ["UTF-16 code-unit offsets", "split a surrogate pair", "apply sequentially", "one unacknowledged wire batch per editor", "local pending buffer", "does not apply its own change twice"])
      assert.ok(article.includes(phrase), phrase);
  });

  it("orders durable receipt resolution, authority checks, commit, and publication correctly", () => {
    const protocol = article.match(/```text\n([\s\S]*?)\n```/)![1];
    const steps = ["lock session head", "look up receipt", "check current owner epoch", "check ACTIVE", "check editor connection", "check base_version", "insert edit", "advance head", "commit with", "install staged text"];
    let previous = -1;
    for (const step of steps) {
      const index = protocol.indexOf(step);
      assert.ok(index > previous, step);
      previous = index;
    }
    for (const phrase of [
      "same head-row serialization", "fresh authoritative storage clock after acquiring the lock",
      "Freeze that session's edit lane", "missing final patch", "independently of the truncated patch tail",
      "RESULT_EXPIRED", "register a subscriber generation", "immutable text reference at version V",
      "invalidate that subscription generation", "version number alone", "Reject stale owner",
      "does not identify a browser's retry", "Asynchronous disaster recovery", "VERSION_UNAVAILABLE",
      "only after the code object is sealed", "before releasing its reserved execution capacity",
    ]) assert.ok(article.includes(phrase), phrase);
  });

  it("accounts for ingress, fanout, raw retention, and a higher typing rate separately", () => {
    const sessions = 100_000 / 5;
    const edits = sessions * 2;
    assert.equal(sessions, 20_000);
    assert.equal(edits, 40_000);
    assert.equal(edits * 4, 160_000);
    assert.equal(edits * 200 / 1e6, 8);
    assert.equal(edits * 200 * 4 / 1e6, 32);
    assert.equal(sessions * 50_000 / 1e9, 1);
    assert.equal(2 * 2700 * 200 / 1e6, 1.08);
    assert.equal(sessions * 2 * 30 * 200 / 1e6, 240);
    assert.equal(edits * 200 * 86_400 / 1e9, 691.2);
    assert.equal(sessions * 10 * 4, 800_000);
    assert.equal(sessions * 10 * 4 * 200 / 1e6, 160);
    for (const phrase of ["691.2 GB", "240 MB", "1.08 MB", "800,000 viewer deliveries/s", "planning assumptions"])
      assert.ok(article.includes(phrase), phrase);
  });

  it("includes five original diagrams, accessible tables, primary references, and English prose", () => {
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 5);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 3);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 3);
    assert.equal((article.split("## References consulted\n")[1].match(/^- \[/gm) ?? []).length, 10);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
