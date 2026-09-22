import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
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

  it("damps fit and drops feasibility when constraints conflict", () => {
    const workable = recommendArchitecture(labPresets.logs);
    const blocked = recommendArchitecture({ ...labPresets.logs, ordering:"global" });

    assert.equal(workable.feasible, true);
    assert.equal(workable.blockerCount, 0);
    assert.equal(blocked.feasible, false);
    assert.ok(blocked.blockerCount >= 1);
    // A blocker is a constraint conflict no architecture resolves, so the
    // headline number must stop reading as an endorsement.
    assert.ok(
      blocked.recommendedCandidate.fit < workable.recommendedCandidate.fit,
      `expected blocked fit ${blocked.recommendedCandidate.fit} < ${workable.recommendedCandidate.fit}`,
    );
    // Ranking is still meaningful as "least bad".
    assert.ok(blocked.candidates[0].fit >= blocked.candidates[1].fit);
  });

  it("scores each option against the live constraints, not a fixed table", () => {
    const ledger = recommendArchitecture(labPresets.ledger);
    const feed = recommendArchitecture(labPresets.feed);
    const byId = (result: ReturnType<typeof recommendArchitecture>, id: string) =>
      result.candidates.find((candidate) => candidate.id === id)!;

    assert.notDeepEqual(byId(ledger, "lean").scores, byId(feed, "lean").scores);

    // Strong consistency across regions costs the resilient option tail latency.
    const single = recommendArchitecture({ ...labDefaults, consistency:"strong", regions:1 });
    const spread = recommendArchitecture({ ...labDefaults, consistency:"strong", regions:3 });
    assert.ok(byId(spread, "resilient").scores.latency < byId(single, "resilient").scores.latency);

    // Every bar stays inside the 1-5 scale the UI renders.
    for (const result of [ledger, feed, single, spread]) {
      for (const candidate of result.candidates) {
        for (const value of Object.values(candidate.scores)) {
          assert.ok(Number.isInteger(value) && value >= 1 && value <= 5, `score out of range: ${value}`);
        }
      }
    }
  });

  it("never lets a strategy outrank a requirement it cannot structurally meet", () => {
    // Cheap and simple used to win here: the single-region option scored 5/5
    // on cost and simplicity, which outweighed the availability it cannot
    // deliver, so asking for five nines recommended one region.
    const fiveNines = recommendArchitecture({ ...labDefaults, availability:"99.999" });
    assert.notEqual(fiveNines.recommendedCandidate.id, "lean");

    const spread = recommendArchitecture({ ...labDefaults, regions:3 });
    assert.notEqual(spread.recommendedCandidate.id, "lean");

    // It should still win when nothing rules it out.
    const modest = recommendArchitecture({ ...labDefaults, qps:200, availability:"99.9", latency:1_000 });
    assert.equal(modest.recommendedCandidate.id, "lean");
  });

  it("keeps fit consistent with the bars it is derived from", () => {
    // fit and scores were once independent formulas and could disagree. The
    // option that wins on the qualities this workload weights must also win
    // the headline number.
    const ledger = recommendArchitecture(labPresets.ledger);
    const winner = ledger.recommendedCandidate;
    const others = ledger.candidates.filter((candidate) => candidate.id !== winner.id);
    for (const other of others) {
      assert.ok(winner.fit >= other.fit);
      // The ledger weights availability and consistency above cost.
      assert.ok(winner.scores.availability + winner.scores.consistency >= other.scores.availability + other.scores.consistency);
    }
  });

  it("spreads fit across genuinely different workloads", () => {
    const fits = [labDefaults, ...Object.values(labPresets)].flatMap((state) =>
      recommendArchitecture(state).candidates.map((candidate) => candidate.fit),
    );
    // A 35-point floor used to flatten three different workloads to the same
    // "42%", which is the discrimination the score exists to provide.
    assert.ok(Math.max(...fits) - Math.min(...fits) > 40, `fit range too narrow: ${Math.min(...fits)}..${Math.max(...fits)}`);
  });

  it("does not prescribe an archive for a workload that writes nothing", () => {
    const result = recommendArchitecture({ ...labDefaults, readPercent:100, retention:365 });
    assert.equal(result.longRetention, false);
    assert.equal(result.storage, "Read-only serving store");
    assert.doesNotMatch(result.storageReason, /0\.0 TB/);
  });

  it("ships static placeholders that match the default state", () => {
    // The page renders real values from JS, but the markup it ships has to be
    // correct on its own — and those literals have silently drifted from the
    // engine twice already. Pin them.
    const page = readFileSync(
      fileURLToPath(new URL("../src/pages/architecture-lab/index.astro", import.meta.url)),
      "utf8",
    );
    const result = recommendArchitecture(labDefaults);
    const placeholder = (attribute: string, key: string) => {
      const match = page.match(new RegExp(`${attribute}="${key}"[^>]*>([^<]*)<`));
      assert.ok(match, `no placeholder found for ${attribute}="${key}"`);
      return match[1].trim();
    };

    for (const key of ["database", "cache", "stream", "storage", "replication", "readPath"] as const) {
      assert.equal(placeholder("data-decision", key), result[key], `decision placeholder for ${key}`);
    }
    assert.equal(placeholder("data-node", "buffer"), result.stream);
    assert.equal(placeholder("data-node", "state"), result.database);
    assert.equal(placeholder("data-metric", "partitions"), String(result.partitions));
    assert.equal(placeholder("data-metric", "brokers"), String(result.brokers));
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
