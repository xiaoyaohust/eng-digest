import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";

const article = readFileSync(new URL("../src/content/system-design/ci-build-platform.md", import.meta.url), "utf8");
const metadata = parse(article.match(/^---\n([\s\S]*?)\n---/)![1]);

describe("CI build platform publication", () => {
  it("joins the existing developer-platform cluster with the correct publication metadata", () => {
    assert.equal(metadata.title, "Design a CI Build Platform");
    assert.equal(String(metadata.date), "2026-11-08");
    assert.equal(metadata.topic, "Infrastructure & Developer Platforms");
    assert.deepEqual(metadata.level, ["senior", "staff", "principal"]);
    assert.equal(metadata.featured, true);
    assert.equal(metadata.draft, false);
    assert.ok(metadata.socialTitle.length < 65);
    assert.ok(metadata.socialDescription.length < 145);
  });

  it("keeps claim, acknowledgement, attempt fencing, and publication in one coherent protocol", () => {
    for (const text of [
      "acknowledges a dispatch message after a successful claim",
      "claim request ID", "temporarily declined claim", "durably rescheduled",
      "A lease expiry does not prove that the old process stopped.",
      "invalidates the old epoch before authorizing a replacement",
      "retain physical resource accounting", "stable across attempts",
      "lock the run, then the current job", "unchanged cancellation version",
      "current attempt epoch and an unexpired lease",
      "trusted evidence of command success and sandbox termination",
      "every declared required artifact to be SEALED for this attempt",
      "create immutable ArtifactBinding records", "mark the current job SUCCESS",
      "mark successor READY and insert its dispatch event into the outbox",
      "Two unrelated best-effort database updates do not provide this guarantee.",
      "creates a new run with the same pinned definition",
    ]) assert.ok(article.includes(text), text);
  });

  it("preserves the byte identity and source availability needed for safe multipart recovery", () => {
    for (const text of [
      "A multipart ETag is not a general whole-file MD5 checksum.",
      "freeze declared outputs into a read-only snapshot or local agent-owned spool",
      "same intended bytes for that upload and part number",
      "Fresh sessions use fresh keys", "Expiring upload URLs alone are not immediate fencing",
      "ListParts cannot reconstruct the missing bytes after a runner host is lost.",
      "Never combine old parts and a newly generated suffix",
      "HEAD plus a valid checksum does not authorize publishing a stale attempt's output.",
      "Pin artifact generations through active consumers and retries.",
      "Cleanup is not a visibility protocol.",
    ]) assert.ok(article.includes(text), text);
    assert.equal(100 * 1024 / 128, 800);
  });

  it("separates optional cache reuse, image identity, security, and acknowledged log durability", () => {
    for (const text of [
      "correct rebuild path", "clean baseline", "does not prove that two writers produced equivalent results",
      "Fork pull requests cannot populate a protected branch's cache namespace.",
      "Cache possession or knowledge of a content digest grants no access right",
      "selected OS/architecture manifest", "commit the selected image digest before user commands",
      "does not guarantee that rebuilding an unchanged Dockerfile",
      "highest contiguous committed position", "Independent pipes do not provide a reliable global ordering",
      "acknowledges only after its declared durability boundary", "base64 JSON payloads",
      "explicit log-loss marker", "continue draining and discarding excess process output",
      "Untrusted workflows must not receive production secrets.", "not an exfiltration barrier",
    ]) assert.ok(article.includes(text), text);
  });

  it("keeps the capacity, sustained-peak, transfer, and multipart arithmetic consistent", () => {
    const jobs = 500_000 * 4;
    assert.equal(jobs, 2_000_000);
    assert.equal((jobs / 86_400).toFixed(2), "23.15");
    assert.equal(Math.round(jobs * 360 / 86_400), 8333);
    assert.equal(230 * 360, 82_800);
    assert.ok(30_000 / 360 < 230);
    assert.equal(jobs * 0.3 * 200e6 / 1e12, 120);
    assert.equal(120 * 30 / 1000, 3.6);
    assert.equal(jobs * 300e6 / 1e12, 600);
    assert.equal((600e12 / 86_400 / 1e9).toFixed(2), "6.94");
    assert.equal((600e12 / 86_400 * 8 / 1e9).toFixed(1), "55.6");
    assert.equal(20_000 * 3e9 / 1e12, 60);
    assert.equal(jobs * 1e6 / 1e12, 2);
    for (const text of ["82,800", "3.6 PB", "6.94 GB/s", "55.6 Gbps", "800 parts", "60 TB"])
      assert.ok(article.includes(text), text);
  });

  it("publishes coherent workflow/API examples, five figures, and consulted primary references", () => {
    const workflow = parse(article.match(/```yaml\n([\s\S]*?)\n```/)![1]);
    assert.equal(workflow.version, 1);
    assert.deepEqual(workflow.jobs.map((job: { name: string }) => job.name), ["compile", "integration-test"]);
    assert.notEqual(workflow.jobs[0].image.ref, workflow.jobs[1].image.ref);
    assert.deepEqual(workflow.jobs[0].artifacts.publish[0], { name: "app", path: "target/app.jar" });
    assert.deepEqual(workflow.jobs[1].artifacts.restore[0], { from_job: "compile", name: "app", path: "inputs/app.jar" });
    const request = JSON.parse(article.match(/```json\n([\s\S]*?)\n```/)![1]);
    assert.match(request.commit_sha, /^[0-9a-f]{40}$/);
    assert.equal(request.workflow_path, ".ci/build.yaml");
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 5);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 4);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 4);
    assert.equal((article.split("## References consulted\n")[1].match(/^- \[/gm) ?? []).length, 10);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
