import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parse } from "yaml";
import { newestFirst } from "../src/lib/contentOrdering.ts";

const slug = "ports-sockets-connections-and-capacity";
const article = readFileSync(new URL(`../src/content/field-notes/${slug}.md`, import.meta.url), "utf8");
const metadata = parse(article.split("---")[1]);

describe("Ports Field Note", () => {
  it("continues the manual networking category and sorts after the NAT note", () => {
    assert.equal(metadata.title, "Ports: Sockets, Connections, and Capacity");
    assert.equal(metadata.topic, "Computer Networking Fundamentals");
    assert.equal(String(metadata.date), "2026-11-07");
    assert.equal(metadata.draft, false);
    const nat = parse(readFileSync(new URL("../src/content/field-notes/nat-addresses-ports-and-connection-state.md", import.meta.url), "utf8").split("---")[1]);
    const entries = [{ id: "nat", data: { date: new Date(nat.date) } }, { id: slug, data: { date: new Date(metadata.date) } }];
    assert.equal(newestFirst(entries)[0].id, slug);
  });

  it("teaches endpoint identity, allocation, ownership, and failure boundaries precisely", () => {
    for (const text of [
      "Accepting a connection does not allocate a new server port.",
      "address-family, and network-namespace context", "no process ID in an ordinary TCP header",
      "connect()` on a UDP socket", "does not perform TCP's handshake",
      "28,232", "cross-destination sharing", "IP_BIND_ADDRESS_NO_PORT",
      "does not generally authorize unrelated live listeners", "SO_REUSEPORT",
      "two transport legs", "does not create that application's socket",
      "EADDRINUSE", "EADDRNOTAVAIL", "EMFILE", "TIME_WAIT",
      "not a recommended TCP timer", "application-level idempotency",
      "do not infer TCP-like liveness", "configured privileged-port policy",
      "TCP-only rule for port 443 does not provide UDP reachability",
      "does not copy a failed worker's protocol or application state",
      "## How Senior and Staff engineers", "## A working model",
    ]) assert.ok(article.includes(text), `Missing explanation: ${text}`);
  });

  it("keeps ranges, connection churn, and planning arithmetic consistent", () => {
    assert.equal(2 ** 16, 65_536);
    const ports = 60999 - 32768 + 1;
    assert.equal(ports, 28_232);
    assert.equal(500 * (20 + 40), 30_000);
    assert.equal(500 * 20, 10_000);
    assert.equal(Math.round(0.75 * ports / (20 + 40)), 353);
    assert.equal(10_000 / 100, 100);
    assert.equal((100_000 * 32 * 1024 / 1e9).toFixed(2), "3.28");
    assert.equal(30085 - 30000 + 1, 86);
    for (const value of ["65,536", "28,232", "30,000 occupied slots", "353 new connections/s", "3.28 GB", "30000–30085"])
      assert.ok(article.includes(value), value);
  });

  it("dates the recent developments without relabeling old mechanisms as new", () => {
    for (const text of ["August 2022", "February 2, 2022", "introduction to 2015", "May 2021", "June 2022",
      "May 2023 for Kubernetes 1.27", "documented in November 2026", "originated in 2026",
      "fallback into the lower band", "validate the new path"])
      assert.ok(article.includes(text), text);
    const service = parse(article.match(/```yaml\n([\s\S]*?)\n```/)![1]);
    assert.equal(service.kind, "Service");
    assert.equal(service.spec.type, "NodePort");
    assert.deepEqual(service.spec.ports[0], { name: "http", protocol: "TCP", port: 443, targetPort: 8080, nodePort: 30443 });
  });

  it("publishes an English mechanism article with visuals, accessible tables, and primary references", () => {
    assert.equal((article.match(/```mermaid\n/g) ?? []).length, 3);
    assert.equal((article.match(/```math\n/g) ?? []).length, 2);
    assert.equal((article.match(/class="table-scroll"/g) ?? []).length, 3);
    assert.equal((article.match(/tabindex="0"/g) ?? []).length, 3);
    assert.equal((article.split("## Further reading\n")[1].match(/^- \[/gm) ?? []).length, 12);
    assert.ok(article.split(/\s+/).length >= 3500);
    assert.doesNotMatch(article, /[\u3400-\u9fff]/);
    assert.doesNotMatch(article, /\b(?:delv\w* into|promot\w*|leverag\w*|really|truly|unlock\w*|navigat\w*|embrac\w*|elevat\w*|revolutioniz\w*|groundbreaking|game-changing|robust\w*|landscapes?|paradigms?|ecosystems?|journeys?|roadmaps?)\b|in this digital age|at the end of the day|think outside the box|Conclusion:|In short|The simplest mental model is|it['’]s worth noting|what['’]s important is/i);
  });
});
