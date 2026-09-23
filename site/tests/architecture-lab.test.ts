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
    assert.equal(result.replication, "3-copy asynchronous cross-region replication");
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
    assert.ok(result.tradeoffs.every((item) => !/streaming backbone|absorbs spikes|partitioning, replay|a small queue/i.test(item)));
    assert.ok(result.defensePrompts.every((item) => !/partition key|starting partitions/i.test(`${item.question} ${item.talkingPoint}`)));
    assert.ok(result.pressures.every((item) => !/queue headroom|duplicate writes|bounded queues/i.test(item)));
    assert.ok(result.candidates.every((candidate) => !/durable log|write stream|replay procedures/i.test(`${candidate.topology} ${candidate.risk}`)));
    assert.doesNotMatch(result.readPathReason, /write path/i);
  });

  it("does not apply write acknowledgement blockers to a read-only workload", () => {
    const state = {
      ...labDefaults,
      readPercent:100,
      durability:"zero-loss",
      consistency:"eventual",
      availability:"99.9",
      replicas:1,
      ordering:"global",
    } as const;
    const result = recommendArchitecture(state);
    const ordinaryRead = recommendArchitecture({ ...state, durability:"standard", ordering:"none" });

    assert.equal(result.feasible, true);
    assert.ok(result.findings.some((item) => /durability belongs to the upstream source/.test(item.title)));
    assert.ok(result.findings.every((item) => !/acknowledged loss|acknowledgement boundary/.test(item.title)));
    assert.deepEqual(
      result.candidates.map((candidate) => ({ id:candidate.id, fit:candidate.fit, scores:candidate.scores })),
      ordinaryRead.candidates.map((candidate) => ({ id:candidate.id, fit:candidate.fit, scores:candidate.scores })),
    );
  });

  it("does not apply write-quorum topology blockers to a read-only workload", () => {
    const twoRegion = recommendArchitecture({
      ...labDefaults,
      readPercent:100,
      regions:2,
      replicas:3,
      consistency:"strong",
      availability:"99.999",
      latency:100,
    });
    assert.equal(twoRegion.feasible, true);
    assert.ok(twoRegion.findings.every((item) => !/two-region quorum|majority region/.test(item.title)));
    assert.ok(twoRegion.findings.some((item) => item.severity === "warning" && /Strong-read availability depends on the upstream authority/.test(item.title)));
    assert.equal(twoRegion.replication, "3-copy read replicas across regions");
    assert.doesNotMatch(`${twoRegion.replication} ${twoRegion.replicationReason}`, /quorum \+|synchronous writes/);
    assert.match(twoRegion.replicationReason, /asynchronously refreshed copy cannot independently guarantee strong reads/i);
    assert.equal(twoRegion.cache, "Immutable-only cache");
    assert.match(twoRegion.readPath, /authoritative or verified linearizable read/i);
    assert.match(twoRegion.databaseReason, /upstream data can still change/i);
    assert.match(twoRegion.defensePrompts[0].talkingPoint, /latest committed version/i);

    const wide = recommendArchitecture({
      ...labDefaults,
      readPercent:100,
      regions:3,
      replicas:3,
      consistency:"strong",
      latency:20,
    });
    assert.equal(wide.feasible, false);
    assert.ok(wide.findings.some((item) => item.severity === "blocker" && /Strong read freshness/.test(item.title)));
    assert.ok(wide.findings.every((item) => !/two-region quorum|majority region/.test(item.title)));

    const relaxed = recommendArchitecture({ ...labDefaults, readPercent:100, regions:3, consistency:"eventual", latency:20 });
    assert.equal(relaxed.feasible, true);
    assert.match(relaxed.readPath, /cache/);
    assert.ok(relaxed.findings.every((item) => !/Strong read freshness/.test(item.title)));
    assert.ok(relaxed.findings.every((item) => !/Strong-read availability depends/.test(item.title)));
  });

  it("keeps every strong read-only recommendation on a verified read path", () => {
    // 30k baseline × 2 burst = 60k peak reads, matching the reported case.
    const state = { ...labDefaults, qps:30_000, readPercent:100, regions:3, consistency:"strong", latency:50 } as const;
    const result = recommendArchitecture(state);
    assert.equal(result.peakReadQps, 60_000);
    assert.equal(result.recommendedCandidate.id, "resilient");
    assert.equal(result.cache, "Immutable-only cache");
    const narrative = [
      ...result.candidates.flatMap(({ summary, topology, strength, risk }) => [summary, topology, strength, risk]),
      ...result.pressures,
      ...result.tradeoffs,
      ...result.defensePrompts.flatMap(({ question, talkingPoint }) => [question, talkingPoint]),
    ].join("\n");
    assert.doesNotMatch(narrative, /cache invalidation|cache stampede|local caches|jittered TTL|stale-read policy|cache fill|cache hit rate/i);
    assert.match(result.candidates.find(({ id }) => id === "balanced")!.summary, /authoritative or verified linearizable read path/i);
    assert.match(result.candidates.find(({ id }) => id === "resilient")!.strength, /only if the upstream authority or read quorum also survives/i);
    assert.match(narrative, /Coalesce immutable reads only/i);

    const fitFor = (recommendation: typeof result, id: "balanced" | "resilient") =>
      recommendation.candidates.find((candidate) => candidate.id === id)!.scores.latency;
    const relaxed = recommendArchitecture({ ...state, consistency:"eventual" });
    assert.ok(fitFor(result, "balanced") < fitFor(relaxed, "balanced"));
    const localStrong = recommendArchitecture({ ...state, regions:1 });
    assert.ok(fitFor(result, "balanced") < fitFor(localStrong, "balanced"));

    const brief = buildDesignBrief(state, result, "https://systemcraftlab.com/architecture-lab/");
    assert.doesNotMatch(brief, /cache fill|stale-read policy|jittered TTL/i);

    // Preserve this contract across low/high load, latency, region count, and
    // serving model so a later copy edit cannot reintroduce TTL advice.
    for (const regions of [1, 2, 3] as const) {
      for (const latency of [20, 50, 100, 250] as const) {
        for (const workload of ["transactional", "analytics"] as const) {
          const variant = recommendArchitecture({ ...state, regions, latency, workload });
          const copy = [
            ...variant.candidates.flatMap(({ summary, topology, strength, risk }) => [summary, topology, strength, risk]),
            ...variant.pressures, ...variant.tradeoffs,
            ...variant.defensePrompts.flatMap(({ question, talkingPoint }) => [question, talkingPoint]),
          ].join("\n");
          assert.doesNotMatch(copy, /cache invalidation|cache stampede|local caches|jittered TTL|stale-read policy|cache fill|cache hit rate/i);
        }
      }
    }
  });

  it("keeps strict read-only advice coherent under bandwidth and burst pressure", () => {
    const result = recommendArchitecture({
      ...labDefaults, qps:30_000, burstFactor:5, sizeKb:10, readPercent:100,
      regions:3, consistency:"strong", latency:50,
    });
    assert.ok(result.readEgressMb > 500);
    assert.ok(result.pressures.some((item) => /verified-replica throughput/.test(item)));
    assert.ok(result.pressures.some((item) => /verified-read capacity/.test(item)));
    assert.ok(result.pressures.every((item) => !/cache hit rate|cache headroom|cache stampede|local caches/i.test(item)));
  });

  it("flags upstream failure-domain uncertainty without inventing a read-only write quorum", () => {
    const base = { ...labDefaults, readPercent:100, consistency:"strong", availability:"99.999", latency:100, replicas:3 } as const;
    for (const regions of [2, 3] as const) {
      const result = recommendArchitecture({ ...base, regions });
      assert.equal(result.feasible, true);
      assert.equal(result.blockerCount, 0);
      assert.ok(result.findings.some((item) => item.severity === "warning" && /Strong-read availability depends/.test(item.title)));
      assert.ok(result.findings.every((item) => !/two-region quorum|strong writes/i.test(item.title)));
    }
    const relaxed = recommendArchitecture({ ...base, regions:2, consistency:"eventual" });
    assert.ok(relaxed.findings.every((item) => !/Strong-read availability depends/.test(item.title)));

    const fourNines = recommendArchitecture({ ...base, availability:"99.99", regions:2 });
    assert.equal(fourNines.feasible, true);
    assert.ok(fourNines.findings.some((item) => item.severity === "warning" && /Strong-read availability depends/.test(item.title) && /99\.99%/.test(item.detail)));
    assert.ok(fourNines.findings.every((item) => !/majority region stops strong writes/i.test(item.title)));
    const threeRegionFourNines = recommendArchitecture({ ...base, availability:"99.99", regions:3 });
    assert.ok(threeRegionFourNines.findings.every((item) => !/Strong-read availability depends/.test(item.title)));
  });

  it("warns that a two-region strong quorum loses writes with its majority region", () => {
    const state = { ...labDefaults, regions:2, replicas:3, consistency:"strong", availability:"99.99", latency:100 } as const;
    const result = recommendArchitecture(state);
    assert.equal(result.feasible, true);
    assert.ok(result.findings.some((item) => item.severity === "warning" && /majority region/.test(item.title)));

    const threeRegions = recommendArchitecture({ ...state, regions:3 });
    assert.ok(threeRegions.findings.every((item) => !/majority region/.test(item.title)));
    const relaxed = recommendArchitecture({ ...state, consistency:"eventual" });
    assert.ok(relaxed.findings.every((item) => !/majority region/.test(item.title)));
  });

  it("treats replica factor as an availability and placement constraint", () => {
    const singleCopy = recommendArchitecture({
      ...labDefaults,
      availability:"99.999",
      regions:3,
      replicas:1,
      consistency:"eventual",
      latency:250,
    });

    assert.equal(singleCopy.feasible, false);
    assert.equal(singleCopy.replication, "Single copy; no replication");
    assert.ok(singleCopy.findings.some((item) => item.severity === "blocker" && /every active region/.test(item.title)));
    assert.ok(singleCopy.findings.some((item) => item.severity === "blocker" && /three independent copies/.test(item.title)));

    const oneCopyAvailability = singleCopy.candidates.find((candidate) => candidate.id === "resilient")!.scores.availability;
    const threeCopies = recommendArchitecture({ ...labDefaults, availability:"99.999", regions:3, replicas:3, consistency:"eventual", latency:250 });
    const threeCopyAvailability = threeCopies.candidates.find((candidate) => candidate.id === "resilient")!.scores.availability;
    assert.ok(oneCopyAvailability < threeCopyAvailability);
  });

  it("requires a durable quorum before promising zero acknowledged loss", () => {
    const result = recommendArchitecture({ ...labDefaults, durability:"zero-loss", replicas:2 });
    assert.ok(result.findings.some((item) => item.severity === "blocker" && /durable quorum/.test(item.title)));
  });

  it("keeps strong analytics and event views behind an authoritative store", () => {
    for (const workload of ["analytics", "event-stream"] as const) {
      const result = recommendArchitecture({ ...labDefaults, workload, consistency:"strong" });
      assert.match(result.database, /source of truth/);
      assert.match(result.databaseReason, /authoritative transactional store/i);
      assert.ok(result.findings.some((item) => /serving view is not the authoritative store/.test(item.title)));
    }
  });

  it("recommends resilience first for strict recovery requirements", () => {
    const result = recommendArchitecture(labPresets.ledger);
    assert.equal(result.feasible, true);
    assert.equal(labPresets.ledger.regions, 3);
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

  it("marks down both the option that cannot deliver and the one nothing justifies", () => {
    const modest = { ...labDefaults, qps:200, availability:"99.9", latency:1_000, consistency:"eventual", durability:"standard" } as const;
    const relaxed = recommendArchitecture(modest);
    const fitFor = (result: ReturnType<typeof recommendArchitecture>, id: string) =>
      result.candidates.find((candidate) => candidate.id === id)!.fit;

    // Nothing here is stressed, so global cells are the wrong shape — the cost
    // and simplicity marks alone still left this option around 60%.
    assert.equal(relaxed.recommendedCandidate.id, "lean");
    assert.ok(fitFor(relaxed, "resilient") < 50, `resilient over-scored at ${fitFor(relaxed, "resilient")}`);

    // The markdown must not apply once a requirement justifies the complexity.
    const strict = recommendArchitecture(labPresets.ledger);
    assert.equal(strict.recommendedCandidate.id, "resilient");
    assert.ok(fitFor(strict, "resilient") > fitFor(relaxed, "resilient"));
  });

  it("keeps the ranking meaningful no matter how many blockers stack", () => {
    // A flat per-blocker subtraction used to drive every option past the clamp
    // floor, where they tied and sort() fell back to declaration order — so the
    // most over-constrained design recommended the single-region option.
    const overConstrained = recommendArchitecture({
      ...labDefaults,
      regions:3, availability:"99.999", replicas:1, durability:"zero-loss",
      ordering:"global", qps:500_000, readPercent:0, latency:20,
    });

    assert.ok(overConstrained.blockerCount >= 3);
    assert.notEqual(overConstrained.recommendedCandidate.id, "lean");
    // Distinct fits, so the ordering still carries information.
    const fits = overConstrained.candidates.map((candidate) => candidate.fit);
    assert.ok(Math.max(...fits) > Math.min(...fits), `all fits collapsed to ${fits.join(",")}`);
    // And it still reads as "do not build this".
    assert.ok(overConstrained.recommendedCandidate.fit < 40);
  });

  it("rewards replica factors above the durability floor", () => {
    const scoresFor = (replicas: number) =>
      recommendArchitecture({ ...labDefaults, replicas })
        .candidates.find((candidate) => candidate.id === "resilient")!.scores;

    assert.ok(scoresFor(1).availability < scoresFor(2).availability);
    assert.ok(scoresFor(2).availability < scoresFor(3).availability);
    // Five copies used to score identically to three, leaving half the control inert.
    assert.ok(scoresFor(3).availability < scoresFor(5).availability);
    // Availability headroom must be presented as a trade-off, not a free win.
    assert.ok(scoresFor(1).cost > scoresFor(3).cost);
    assert.ok(scoresFor(3).cost > scoresFor(5).cost);
  });

  it("rejects two-region strong quorums as a five-nines topology", () => {
    const result = recommendArchitecture({
      ...labDefaults,
      regions:2,
      replicas:5,
      availability:"99.999",
      consistency:"strong",
      latency:100,
    });

    assert.equal(result.feasible, false);
    assert.ok(result.findings.some((item) => item.severity === "blocker" && /two-region quorum/.test(item.title)));
    assert.match(result.replication, /cross-region quorum/);
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

  it("includes read bandwidth when deciding whether a workload is high scale", () => {
    const result = recommendArchitecture({
      ...labDefaults,
      qps:40_000,
      sizeKb:1_024,
      burstFactor:1,
      readPercent:100,
      availability:"99.9",
      durability:"standard",
      consistency:"eventual",
    });

    assert.equal(result.readEgressMb, 40_000);
    assert.equal(result.ingressMb, 0);
    assert.equal(result.highScale, true);
    assert.ok(result.pressures.some((item) => /Read bandwidth dominates/.test(item)));
    assert.notEqual(result.recommendedCandidate.id, "lean");
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
    assert.equal(placeholder("data-metric", "throughput"), `${result.readEgressMb.toFixed(1)} / ${result.ingressMb.toFixed(1)} MB/s`);
    assert.equal(placeholder("data-metric", "partitions"), String(result.partitions));
    assert.equal(placeholder("data-metric", "brokers"), String(result.brokers));
  });

  it("exports an explainable Markdown brief with a reproducible link", () => {
    const state = labPresets.api;
    const result = recommendArchitecture(state);
    const brief = buildDesignBrief(state, result, "https://example.com/architecture-lab/?qps=50000");
    assert.match(brief, /## Workload/);
    assert.match(brief, /Peak read payload egress/);
    assert.match(brief, /## Constraint review/);
    assert.match(brief, new RegExp(result.recommendedCandidate.title));
    assert.match(brief, /https:\/\/example\.com\/architecture-lab/);
  });
});
