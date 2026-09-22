import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDesignBrief,
  buildLabQuery,
  labDefaults,
  labPresets,
  parseLabParams,
  recommendArchitecture,
  sanitizeLabValue,
} from "../src/lib/architectureLab.ts";

describe("Architecture Decision Lab", () => {
  it("rejects malformed select values and clamps stepped numeric inputs", () => {
    assert.equal(sanitizeLabValue("consistency", "impossible"), null);
    assert.equal(sanitizeLabValue("availability", "100"), null);
    assert.equal(sanitizeLabValue("latency", "17"), null);
    assert.equal(sanitizeLabValue("burstFactor", "4"), null);
    assert.equal(sanitizeLabValue("qps", "999999999"), 1_000_000);
    assert.equal(sanitizeLabValue("qps", "150"), 200);
    assert.equal(sanitizeLabValue("readPercent", "83"), 85);
    assert.equal(sanitizeLabValue("retention", ""), null);
  });

  it("keeps defaults for invalid and legacy URL parameters", () => {
    const invalid = parseLabParams(new URLSearchParams("qps=oops&latency=17&consistency=invalid&regions=99"));
    assert.deepEqual(invalid, labDefaults);

    const legacy = parseLabParams(new URLSearchParams("qps=50000&latency=100&consistency=eventual&regions=2"));
    assert.equal(legacy.qps, 50_000);
    assert.equal(legacy.consistency, "eventual");
    assert.equal(legacy.readPercent, labDefaults.readPercent);
    assert.equal(legacy.compression, labDefaults.compression);
  });

  it("round-trips every field in a share URL", () => {
    for (const preset of Object.values(labPresets)) {
      const query = buildLabQuery(preset);
      assert.deepEqual(parseLabParams(new URLSearchParams(query)), preset);
    }
  });

  it("calculates write-aware physical capacity for the log preset", () => {
    const result = recommendArchitecture(labPresets.logs);
    assert.equal(result.peakQps, 1_000_000);
    assert.equal(result.peakWriteQps, 1_000_000);
    assert.equal(result.partitions, 143);
    assert.ok(result.brokers >= 4);
    assert.equal(result.database, "Time-series or wide-column serving store");
    assert.match(result.stream, /Kafka-compatible/);
    assert.equal(result.storage, "Object storage as durable archive");
    assert.equal(result.replication, "Asynchronous active-active replication");
  });

  it("detects physically conflicting multi-region constraints", () => {
    const result = recommendArchitecture({
      ...labDefaults,
      regions: 3,
      consistency: "strong",
      latency: 20,
      availability: "99.999",
      ordering: "global",
      qps: 100_000,
      readPercent: 0,
    });
    assert.ok(result.findings.some((item) => item.severity === "blocker" && /WAN latency/.test(item.title)));
    assert.ok(result.findings.some((item) => item.severity === "blocker" && /Global ordering/.test(item.title)));
  });

  it("does not invent stream infrastructure for a read-only workload", () => {
    const result = recommendArchitecture({ ...labDefaults, readPercent:100 });
    assert.equal(result.peakWriteQps, 0);
    assert.equal(result.partitions, 0);
    assert.equal(result.brokers, 0);
    assert.equal(result.stream, "No write stream required");
  });

  it("recommends resilience first for strict recovery requirements", () => {
    const result = recommendArchitecture(labPresets.ledger);
    assert.equal(result.recommendedCandidate.id, "resilient");
    assert.equal(result.candidates.length, 3);
    assert.ok(result.candidates[0].fit >= result.candidates[1].fit);
  });

  it("exports an explainable Markdown brief with a reproducible link", () => {
    const state = labPresets.api;
    const result = recommendArchitecture(state);
    const brief = buildDesignBrief(state, result, "https://example.com/architecture-lab/?qps=50000");
    assert.match(brief, /## Workload/);
    assert.match(brief, /## Constraint review/);
    assert.match(brief, new RegExp(result.recommendedCandidate.title));
    assert.match(brief, /https:\/\/example\.com\/architecture-lab/);
  });
});
