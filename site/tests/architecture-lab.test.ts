import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLabQuery,
  labDefaults,
  labPresets,
  parseLabParams,
  recommendArchitecture,
  sanitizeLabValue,
} from "../src/lib/architectureLab.ts";

describe("Architecture Decision Lab", () => {
  it("rejects malformed select values and clamps numeric inputs", () => {
    assert.equal(sanitizeLabValue("consistency", "impossible"), null);
    assert.equal(sanitizeLabValue("latency", "17"), null);
    assert.equal(sanitizeLabValue("qps", "999999999"), 1_000_000);
    assert.equal(sanitizeLabValue("qps", "150"), 200);
    assert.equal(sanitizeLabValue("retention", ""), null);
  });

  it("keeps defaults for invalid URL parameters", () => {
    const state = parseLabParams(new URLSearchParams("qps=oops&latency=17&consistency=invalid&regions=99"));
    assert.deepEqual(state, labDefaults);
  });

  it("round-trips a valid share URL", () => {
    const query = buildLabQuery(labPresets.logs);
    assert.deepEqual(parseLabParams(new URLSearchParams(query)), labPresets.logs);
  });

  it("produces the expected log-platform architecture", () => {
    const result = recommendArchitecture(labPresets.logs);
    assert.equal(result.partitions, 50);
    assert.equal(result.database, "Partitioned NoSQL serving store");
    assert.match(result.stream, /Kafka-compatible/);
    assert.equal(result.storage, "Object storage as the durable archive");
    assert.equal(result.replication, "Asynchronous active-active replication");
  });
});
