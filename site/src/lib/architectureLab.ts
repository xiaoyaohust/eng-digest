export type Consistency = "eventual" | "read-your-writes" | "strong";
export type Workload = "transactional" | "key-value" | "event-stream" | "analytics";
export type Availability = "99.9" | "99.99" | "99.999";
export type Durability = "standard" | "high" | "zero-loss";
export type Ordering = "none" | "per-key" | "global";
export type FindingSeverity = "blocker" | "warning" | "note";

export interface LabState {
  qps: number;
  sizeKb: number;
  latency: number;
  consistency: Consistency;
  retention: number;
  regions: number;
  readPercent: number;
  burstFactor: number;
  workload: Workload;
  availability: Availability;
  durability: Durability;
  ordering: Ordering;
  compression: number;
  replicas: number;
}

export interface LabFinding {
  severity: FindingSeverity;
  title: string;
  detail: string;
}

export interface CandidateScores {
  latency: number;
  consistency: number;
  availability: number;
  cost: number;
  simplicity: number;
}

export interface ArchitectureCandidate {
  id: "lean" | "balanced" | "resilient";
  title: string;
  label: string;
  summary: string;
  topology: string;
  fit: number;
  scores: CandidateScores;
  strength: string;
  risk: string;
}

export interface DefensePrompt {
  question: string;
  talkingPoint: string;
}

export interface ArchitectureRecommendation {
  baselineWriteQps: number;
  peakQps: number;
  peakReadQps: number;
  peakWriteQps: number;
  ingressMb: number;
  dailyTb: number;
  logicalStoredTb: number;
  physicalStoredTb: number;
  partitions: number;
  brokers: number;
  database: string;
  databaseReason: string;
  cache: string;
  cacheReason: string;
  stream: string;
  streamReason: string;
  storage: string;
  storageReason: string;
  replication: string;
  replicationReason: string;
  readPath: string;
  readPathReason: string;
  pressures: string[];
  tradeoffs: string[];
  findings: LabFinding[];
  blockerCount: number;
  /** False when a finding says the constraints cannot all hold at once. No
   * architecture resolves that — the constraints themselves have to change —
   * so the candidate ranking is "least bad", not an endorsement. */
  feasible: boolean;
  candidates: ArchitectureCandidate[];
  recommendedCandidate: ArchitectureCandidate;
  defensePrompts: DefensePrompt[];
  highScale: boolean;
  longRetention: boolean;
}

export const labDefaults: LabState = {
  qps: 10_000,
  sizeKb: 2,
  latency: 50,
  consistency: "strong",
  retention: 30,
  regions: 1,
  readPercent: 80,
  burstFactor: 2,
  workload: "transactional",
  availability: "99.99",
  durability: "high",
  ordering: "per-key",
  compression: 2,
  replicas: 3,
};

export const labPresets: Record<string, LabState> = {
  api: {
    qps:50_000, sizeKb:4, latency:50, consistency:"read-your-writes", retention:7, regions:2,
    readPercent:85, burstFactor:3, workload:"key-value", availability:"99.99", durability:"high",
    ordering:"per-key", compression:2, replicas:3,
  },
  logs: {
    qps:500_000, sizeKb:1, latency:250, consistency:"eventual", retention:90, regions:3,
    readPercent:0, burstFactor:2, workload:"event-stream", availability:"99.99", durability:"high",
    ordering:"per-key", compression:4, replicas:3,
  },
  ledger: {
    qps:8_000, sizeKb:3, latency:100, consistency:"strong", retention:365, regions:2,
    readPercent:60, burstFactor:2, workload:"transactional", availability:"99.999", durability:"zero-loss",
    ordering:"per-key", compression:2, replicas:3,
  },
  feed: {
    qps:200_000, sizeKb:6, latency:100, consistency:"eventual", retention:30, regions:3,
    readPercent:95, burstFactor:5, workload:"key-value", availability:"99.99", durability:"standard",
    ordering:"none", compression:3, replicas:3,
  },
};

const numericRules = {
  qps: { min:100, max:1_000_000, step:100 },
  sizeKb: { min:1, max:1_024, step:1 },
  retention: { min:1, max:365, step:1 },
  readPercent: { min:0, max:100, step:5 },
} as const;
const latencyValues = new Set([20, 50, 100, 250, 1_000]);
const regionValues = new Set([1, 2, 3]);
const burstValues = new Set([1, 2, 3, 5, 10]);
const compressionValues = new Set([1, 2, 3, 4]);
const replicaValues = new Set([1, 2, 3, 5]);
const consistencyValues = new Set<Consistency>(["eventual", "read-your-writes", "strong"]);
const workloadValues = new Set<Workload>(["transactional", "key-value", "event-stream", "analytics"]);
const availabilityValues = new Set<Availability>(["99.9", "99.99", "99.999"]);
const durabilityValues = new Set<Durability>(["standard", "high", "zero-loss"]);
const orderingValues = new Set<Ordering>(["none", "per-key", "global"]);

export function sanitizeLabValue<K extends keyof LabState>(key: K, value: unknown): LabState[K] | null {
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "" || raw === null || raw === undefined) return null;

  const stringSets: Partial<Record<keyof LabState, Set<string>>> = {
    consistency: consistencyValues,
    workload: workloadValues,
    availability: availabilityValues,
    durability: durabilityValues,
    ordering: orderingValues,
  };
  const stringSet = stringSets[key];
  if (stringSet) {
    return (typeof raw === "string" && stringSet.has(raw) ? raw : null) as LabState[K] | null;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  if (key === "latency") return (latencyValues.has(numeric) ? numeric : null) as LabState[K] | null;
  if (key === "regions") return (regionValues.has(numeric) ? numeric : null) as LabState[K] | null;
  if (key === "burstFactor") return (burstValues.has(numeric) ? numeric : null) as LabState[K] | null;
  if (key === "compression") return (compressionValues.has(numeric) ? numeric : null) as LabState[K] | null;
  if (key === "replicas") return (replicaValues.has(numeric) ? numeric : null) as LabState[K] | null;

  const rule = numericRules[key as keyof typeof numericRules];
  if (!rule) return null;
  const clamped = Math.min(Math.max(numeric, rule.min), rule.max);
  const stepped = rule.min + Math.round((clamped - rule.min) / rule.step) * rule.step;
  return Math.min(Math.max(stepped, rule.min), rule.max) as LabState[K];
}

export function parseLabParams(params: URLSearchParams, base: LabState = labDefaults): LabState {
  const state = { ...base };
  (Object.keys(labDefaults) as (keyof LabState)[]).forEach((key) => {
    if (!params.has(key)) return;
    const value = sanitizeLabValue(key, params.get(key));
    if (value !== null) (state[key] as LabState[typeof key]) = value;
  });
  return state;
}

export function buildLabQuery(state: LabState): string {
  const params = new URLSearchParams();
  (Object.keys(labDefaults) as (keyof LabState)[]).forEach((key) => params.set(key, String(state[key])));
  return params.toString();
}

function clampScore(value: number): number {
  // Floor deliberately low. An earlier version clamped at 35, which made three
  // very different workloads all report "Lean Regional 42%" — the floor was
  // eating the discrimination the score is supposed to provide.
  return Math.max(4, Math.min(98, Math.round(value)));
}

function clampBar(value: number): number {
  return Math.max(1, Math.min(5, Math.round(value)));
}

const SCORE_KEYS = ["latency", "consistency", "availability", "cost", "simplicity"] as const;

/** How much this workload cares about each quality, on a 1-6 scale.
 *
 * These weights are what turn the same five bars into a single number: a
 * ledger and a log platform can score a strategy identically on latency and
 * still rank it differently, because they do not value latency the same. */
function constraintWeights(state: LabState, highScale: boolean): CandidateScores {
  const multiRegion = state.regions > 1;
  return {
    latency: state.latency <= 20 ? 6 : state.latency <= 50 ? 5 : state.latency <= 100 ? 3 : 2,
    consistency: clampBar(
      (state.consistency === "strong" ? 5 : state.consistency === "read-your-writes" ? 3 : 2)
      + (state.ordering === "global" ? 1 : 0)
      + (state.durability === "zero-loss" ? 1 : 0),
    ),
    availability:
      (state.availability === "99.999" ? 6 : state.availability === "99.99" ? 3 : 2)
      + (multiRegion ? 1 : 0),
    // Cost and operability matter most when nothing else is screaming. A
    // modest workload should not be told to build a global cell architecture,
    // but a five-nines or zero-loss requirement is exactly the case where
    // "but it is simpler" stops being a valid argument.
    cost: highScale ? 4 : 3,
    simplicity: isDemanding(state, highScale) ? 2 : 5,
  };
}

/** True when some requirement is strict enough that cheap and simple stop
 * being tie-breakers. */
function isDemanding(state: LabState, highScale: boolean): boolean {
  return highScale
    || state.regions > 1
    || state.availability === "99.999"
    || state.durability === "zero-loss"
    || state.ordering === "global";
}

/** Multiplier for a strategy that structurally cannot meet a stated
 * requirement. Such a strategy is not a partial fit — it is the wrong shape —
 * so it must not ride high cost and simplicity marks to the top of the
 * ranking. Without this, asking for five nines recommended the single-region
 * option, because simplicity outweighed the availability it cannot deliver. */
function viability(id: ArchitectureCandidate["id"], state: LabState, highScale: boolean): number {
  if (id !== "lean") return 1;
  const cannotSpanRegions = state.regions > 1;
  const cannotReachAvailability = state.availability === "99.999";
  const cannotAbsorbScale = highScale;
  return cannotSpanRegions || cannotReachAvailability || cannotAbsorbScale ? 0.55 : 1;
}

/** Collapse the five bars into one percentage using the workload's weights.
 *
 * fit used to be three hand-written formulas living beside an unrelated table
 * of scores, so the headline number and the bars underneath it could disagree
 * with each other. Deriving one from the other makes that impossible. */
function weightedFit(scores: CandidateScores, weights: CandidateScores): number {
  let total = 0;
  let weightSum = 0;
  for (const key of SCORE_KEYS) {
    total += scores[key] * weights[key];
    weightSum += weights[key];
  }
  return ((total / weightSum) / 5) * 100;
}

/** How well each strategy serves the *current* constraints, on the 1-5 scale
 * the comparison bars render.
 *
 * These used to be per-candidate constants, which made the bars decorative:
 * a log platform and a financial ledger drew exactly the same chart. Scoring
 * against the live state is the whole point of the comparison panel. */
function scoreCandidates(state: LabState, highScale: boolean): Record<ArchitectureCandidate["id"], CandidateScores> {
  const multiRegion = state.regions > 1;
  const wideRegions = state.regions >= 3;
  const strong = state.consistency === "strong";
  const lowLatency = state.latency <= 50;
  const demandingAvailability = state.availability === "99.999";
  const strictDurability = state.durability === "zero-loss";
  const globalOrder = state.ordering === "global";
  const replicaPenalty = state.replicas >= 3 ? 0 : state.replicas === 2 ? 1 : 2;

  return {
    lean: {
      // One region keeps every hop local, so latency is excellent for nearby
      // users and poor for distant ones the design never reaches.
      latency: clampBar(5 - (multiRegion ? 2 : 0) - (wideRegions ? 1 : 0) - (highScale ? 1 : 0)),
      // A single primary makes strong consistency trivial, until write volume
      // outgrows one leader.
      consistency: clampBar((strong ? 5 : 4) - (highScale ? 2 : 0) - (globalOrder ? 0 : 0)),
      // One region with several availability zones covers ordinary failures
      // and nothing more, so the ceiling here is the availability target the
      // design can honestly reach — not the one that was asked for.
      availability: clampBar(
        (multiRegion ? 1 : 3)
        - (demandingAvailability ? 2 : 0)
        - (state.availability === "99.99" ? 1 : 0)
        - replicaPenalty,
      ),
      cost: clampBar(5 - (highScale ? 1 : 0)),
      simplicity: 5,
    },
    balanced: {
      latency: clampBar(4 + (lowLatency ? 0 : 1) - (wideRegions && strong ? 1 : 0)),
      consistency: clampBar(strong ? (multiRegion ? 3 : 4) : 4),
      availability: clampBar(3 + (multiRegion ? 1 : 0) - (demandingAvailability ? 1 : 0) - replicaPenalty),
      cost: clampBar(3 + (highScale ? 0 : 1)),
      simplicity: clampBar(3 - (highScale ? 1 : 0)),
    },
    resilient: {
      // Cross-region quorum is the price of continuity: it shows up as tail
      // latency exactly when consistency is strict and regions are far apart.
      latency: clampBar(4 - (strong && multiRegion ? 2 : 0) - (strong && wideRegions ? 1 : 0)),
      consistency: clampBar(5 - (globalOrder && highScale ? 1 : 0)),
      availability: clampBar(4 + (multiRegion ? 1 : 0) - replicaPenalty),
      cost: clampBar(1 + (multiRegion ? 0 : 1)),
      simplicity: clampBar(1 + (strictDurability ? 0 : 1) - (wideRegions ? 1 : 0)),
    },
  };
}

function buildCandidates(
  state: LabState,
  database: string,
  stream: string,
  replication: string,
  highScale: boolean,
  hasWrites: boolean,
  blockerCount: number,
): ArchitectureCandidate[] {
  const multiRegion = state.regions > 1;
  const scores = scoreCandidates(state, highScale);
  const weights = constraintWeights(state, highScale);
  // A blocker means the constraints contradict each other, and none of these
  // strategies can resolve that — only changing an input can. Damping every
  // fit equally keeps the ranking (still useful as "least bad") while stopping
  // the headline number from reading as approval of an impossible design.
  const blockerPenalty = blockerCount * 18;
  const fitFor = (id: ArchitectureCandidate["id"]) =>
    clampScore(weightedFit(scores[id], weights) * viability(id, state, highScale) - blockerPenalty);

  const leanFit = fitFor("lean");
  const balancedFit = fitFor("balanced");
  const resilientFit = fitFor("resilient");

  const candidates: ArchitectureCandidate[] = [
    {
      id:"lean", title:"Lean Regional", label:"LOWER COMPLEXITY",
      summary:hasWrites
        ? "Start inside one region with managed building blocks and a deliberately replaceable queue boundary."
        : "Serve the existing data set through a regional read service with the smallest operational surface.",
      topology:hasWrites
        ? `Regional load balancer → stateless service → ${state.consistency === "strong" ? "relational primary + replicas" : "managed serving store"}`
        : `Regional load balancer → read service → ${database}`,
      fit:leanFit,
      scores:scores.lean,
      strength:"Fastest path to production with the smallest operational surface.",
      risk:multiRegion ? "Does not satisfy regional continuity without an explicit failover design." : "Regional failure remains the dominant recovery scenario.",
    },
    {
      id:"balanced", title:"Scale-Ready", label:"BALANCED",
      summary:hasWrites
        ? "Separate serving, buffering, and durable history so each layer can scale on its own curve."
        : "Scale reads independently with geo routing, caching, and a dedicated serving model.",
      topology:hasWrites
        ? `Geo-aware edge → autoscaled services → ${stream} → ${database}`
        : `Geo-aware edge → autoscaled read services → cache → ${database}`,
      fit:balancedFit,
      scores:scores.balanced,
      strength:"Good throughput headroom without committing every subsystem to maximum complexity.",
      risk:hasWrites
        ? "Requires disciplined partitioning, replay procedures, and cache invalidation ownership."
        : "Requires disciplined cache invalidation, freshness monitoring, and origin-capacity ownership.",
    },
    {
      id:"resilient", title:"Resilience-First", label:"MAXIMUM CONTINUITY",
      summary:hasWrites
        ? "Favor regional autonomy, redundant write paths, and tested recovery boundaries over cost and simplicity."
        : "Place independently recoverable read cells near users and make origin failover explicit.",
      topology:hasWrites
        ? `Global traffic manager → regional cells → durable log → ${replication} → ${database}`
        : `Global traffic manager → regional read cells → ${replication} → ${database}`,
      fit:resilientFit,
      scores:scores.resilient,
      strength:"Best fit for strict recovery objectives and continued operation through a regional failure.",
      risk:hasWrites
        ? "Highest cost and operational burden; cross-region correctness must be tested continuously."
        : "Cache coherence, stale reads, and origin failover still require continuous testing.",
    },
  ];
  return candidates.sort((a, b) => b.fit - a.fit);
}

export function recommendArchitecture(state: LabState): ArchitectureRecommendation {
  const writeFraction = (100 - state.readPercent) / 100;
  const baselineWriteQps = state.qps * writeFraction;
  const peakQps = state.qps * state.burstFactor;
  const peakReadQps = peakQps * (state.readPercent / 100);
  const peakWriteQps = peakQps * writeFraction;
  const ingressMb = (peakWriteQps * state.sizeKb) / 1024;
  const dailyTb = (baselineWriteQps * state.sizeKb * 86400) / 1024 / 1024 / 1024;
  const logicalStoredTb = dailyTb * state.retention;
  const physicalStoredTb = (logicalStoredTb / state.compression) * state.replicas * 1.2;
  const hasWrites = peakWriteQps > 0;
  const capacityPartitions = hasWrites ? Math.max(1, Math.ceil(ingressMb / 7), Math.ceil(peakWriteQps / 7_000)) : 0;
  const partitions = hasWrites ? (state.ordering === "global" ? capacityPartitions : Math.max(3, capacityPartitions)) : 0;
  const hotRetentionDays = Math.min(state.retention, 3);
  const hotPhysicalTb = (dailyTb * hotRetentionDays / state.compression) * state.replicas;
  const brokers = hasWrites ? Math.max(state.replicas, Math.ceil((partitions * state.replicas) / 120), Math.ceil(hotPhysicalTb / 2.8)) : 0;
  const highScale = peakQps >= 50_000 || ingressMb >= 100;
  const highWriteScale = peakWriteQps >= 50_000 || ingressMb >= 100;
  const lowLatency = state.latency <= 50;
  // Retention only implies an archive if something is actually being written.
  // A read-only workload kept "365 days" of nothing and was still told to buy
  // object storage for 0.0 TB.
  const longRetention = hasWrites && (state.retention > 14 || physicalStoredTb > 5);
  const multiRegion = state.regions > 1;

  let database = "Relational database with read replicas";
  let databaseReason = "The workload can begin with a familiar relational model and indexed read replicas.";
  if (state.workload === "analytics") {
    database = state.consistency === "strong"
      ? "Transactional source of truth + columnar analytical store"
      : "Columnar analytical store + object storage";
    databaseReason = state.consistency === "strong"
      ? "Keep invariant-changing writes in an authoritative transactional store, then feed a scan-optimized columnar model through CDC. Analytical views may lag; strong reads must use the source of truth."
      : "Scan-heavy analytical queries benefit from column pruning, compression, and immutable source data.";
  } else if (state.workload === "event-stream") {
    database = state.consistency === "strong"
      ? "Durable event log + transactional source of truth + time-series view"
      : "Time-series or wide-column serving store";
    databaseReason = state.consistency === "strong"
      ? "Use the log for durable ordered delivery, an authoritative transactional store for invariants, and a rebuildable time-series view for queries."
      : "Append-heavy events and time-window queries favor partitioned writes and retention-aware storage.";
  } else if (state.consistency === "strong") {
    database = multiRegion ? "Distributed SQL with scoped global transactions" : "Relational database with synchronous replicas";
    databaseReason = "Transactions and invariant protection matter more than the lowest write latency.";
  } else if (state.workload === "key-value" || highScale) {
    database = "Partitioned key-value / NoSQL serving store";
    databaseReason = "Predictable key access and relaxed coordination make horizontal partitioning a practical fit.";
  }

  let cache = "Selective cache-aside layer";
  let cacheReason = "Cache only expensive or frequently repeated reads; keep invalidation scope explicit.";
  if (state.readPercent < 30) {
    cache = "Metadata cache only";
    cacheReason = "A write-heavy workload receives little value from a broad data cache and pays a high invalidation cost.";
  } else if (state.consistency === "strong") {
    cache = lowLatency ? "Versioned read-through cache" : "Cache immutable and derived data only";
    cacheReason = "Keep the database authoritative; version checks or narrow cache scope prevent stale values from violating invariants.";
  } else if (lowLatency || highScale) {
    cache = "Distributed cache + local hot cache";
    cacheReason = `A ${state.latency} ms p99 target and ${state.readPercent}% reads reward serving hot data close to compute.`;
  }

  const stream = !hasWrites
    ? "No write stream required"
    : state.ordering === "global"
    ? "Global sequencer + partitioned durable log"
    : highWriteScale ? "Partitioned Kafka-compatible event log" : "Durable queue with replay";
  const streamReason = !hasWrites
    ? "The selected workload is read-only, so introduce a durable stream only when a write or change-data-capture path appears."
    : state.ordering === "global"
    ? "A sequencing boundary defines total order, but it is also a throughput and availability bottleneck."
    : highWriteScale
      ? `${partitions} partitions at roughly 70% target utilization leave burst and rebalance headroom.`
      : "A smaller durable queue decouples spikes without adding unnecessary cluster complexity.";
  const storage = !hasWrites
    ? "Read-only serving store"
    : longRetention ? "Object storage as durable archive" : "Serving store + scheduled snapshots";
  const storageReason = !hasWrites
    ? "This workload writes nothing, so retention is inherited from whatever system produces the data; size that system, not this one."
    : longRetention
      ? `${physicalStoredTb.toFixed(1)} TB provisioned after compression, replication, and index overhead favors cheap immutable storage.`
      : "The retained volume is modest enough to begin with the serving store and verified backups.";

  let replication = state.replicas === 1
    ? "Single copy; no replication"
    : `${state.replicas}-copy synchronous replication across availability zones`;
  let replicationReason = state.replicas === 1
    ? "One copy cannot survive storage or node loss. Increase the replica factor before treating this as a resilient design."
    : `Keep the ${state.replicas}-copy quorum regional and test automatic zone failover.`;
  if (state.replicas === 1) {
    // Keep the output honest even when another constraint asks for a topology
    // that one copy cannot implement. The blocker below explains how to fix it.
  } else if (multiRegion && state.consistency === "strong") {
    replication = `${state.replicas}-copy regional quorum + scoped synchronous global writes`;
    replicationReason = "Pay WAN coordination only for invariants that truly require global agreement; replicate other data asynchronously.";
  } else if (multiRegion) {
    replication = `${state.replicas}-copy asynchronous cross-region replication`;
    replicationReason = "Local writes improve regional availability, but conflict resolution and replay must be explicit.";
  }

  const readPath = lowLatency ? "Edge routing → cache → regional read model" : "Regional service → indexed serving store";
  const readPathReason = lowLatency
    ? hasWrites
      ? "Serve hot reads near users while keeping the durable write path independent."
      : "Serve hot reads near users and protect the authoritative origin from fan-out and cache stampedes."
    : "A dedicated read model avoids expensive scans without forcing every read through a global quorum.";

  const findings: LabFinding[] = [];
  if (state.regions >= 3 && state.consistency === "strong" && state.latency <= 50) {
    findings.push({ severity:"blocker", title:"WAN latency conflicts with the p99 target", detail:`Strong writes across ${state.regions}+ regions are unlikely to fit inside ${state.latency} ms. Use regional ownership, relax consistency, or raise the latency budget.` });
  } else if (multiRegion && state.consistency === "strong" && state.latency === 20) {
    findings.push({ severity:"blocker", title:"The latency budget is not physically credible", detail:"A 20 ms p99 leaves too little time for cross-region quorum. Keep synchronous consensus within one region." });
  }
  if (state.availability === "99.999" && state.regions === 1) {
    findings.push({ severity:"blocker", title:"Five nines needs regional failure coverage", detail:"One region cannot credibly meet the target even with multiple availability zones. Add a tested regional failover path." });
  } else if (state.availability === "99.99" && state.regions === 1) {
    findings.push({ severity:"warning", title:"Availability depends on one region", detail:"A multi-zone design may meet normal failures, but a regional event exceeds the requested availability posture." });
  }
  if (multiRegion && state.replicas < state.regions) {
    findings.push({ severity:"blocker", title:"Replica factor cannot cover every active region", detail:`${state.regions} active regions with only ${state.replicas} data ${state.replicas === 1 ? "copy" : "copies"} cannot provide a local copy in each region. Raise the replica factor or reduce the regional footprint.` });
  }
  if (state.availability === "99.999" && state.replicas < 3) {
    findings.push({ severity:"blocker", title:"Five nines needs at least three independent copies", detail:"The availability target cannot be defended with fewer than three copies placed in independent failure domains." });
  } else if (state.availability === "99.99" && state.replicas < 2) {
    findings.push({ severity:"warning", title:"One copy cannot meet the availability posture", detail:"A single node or disk loss becomes an outage. Add at least one independent copy and test failover." });
  }
  if (state.ordering === "global" && capacityPartitions > 1) {
    findings.push({ severity:"blocker", title:"Global ordering limits horizontal throughput", detail:`Capacity calls for about ${capacityPartitions} partitions, while a total order needs one sequencing authority. Narrow ordering to a key or accept a sequencer bottleneck.` });
  }
  if (state.durability === "zero-loss" && state.consistency === "eventual") {
    findings.push({ severity:"warning", title:"Zero-loss requires a durable acknowledgement boundary", detail:"Eventual visibility is compatible with zero loss only if writes are acknowledged after durable replicated logging, not after an in-memory regional write." });
  }
  if (state.durability === "zero-loss" && state.replicas < 3) {
    findings.push({ severity:"blocker", title:"Zero acknowledged loss needs a durable quorum", detail:"One or two copies cannot safely acknowledge writes through a failure. Use at least three independent copies plus verified backups." });
  } else if (state.durability === "high" && state.replicas < 3) {
    findings.push({ severity:"warning", title:"Replica count is below the durability target", detail:"Use at least three independent replicas and verify restore procedures; replication is not a backup." });
  }
  if (state.consistency === "strong" && (state.workload === "analytics" || state.workload === "event-stream")) {
    findings.push({ severity:"warning", title:"The serving view is not the authoritative store", detail:"Strong reads and invariant-changing writes must use the transactional source of truth. The analytical or time-series view is rebuilt asynchronously and may lag." });
  }
  if (state.workload === "transactional" && peakWriteQps > 100_000) {
    findings.push({ severity:"warning", title:"Transactional write scale needs a partition key", detail:"A single relational write leader is unlikely to absorb this peak. Partition by ownership boundary or use distributed SQL deliberately." });
  }
  if (!findings.length) {
    findings.push({ severity:"note", title:"No hard constraint conflict detected", detail:"The combination is plausible as a starting hypothesis. Validate it with workload-specific benchmarks and failure tests." });
  }

  const pressures: string[] = [];
  if (ingressMb > 500) pressures.push("Network and broker throughput dominate; compression, batching, and quotas are mandatory.");
  if (partitions > 100) pressures.push("Partition ownership, rebalance time, and hot keys become operational risks.");
  if (physicalStoredTb > 100) pressures.push("Retention cost, compaction, restore time, and lifecycle policies dominate the storage design.");
  if (state.burstFactor >= 5) pressures.push(hasWrites
    ? `${state.burstFactor}× bursts require queue headroom, admission control, and autoscaling that reacts before saturation.`
    : `${state.burstFactor}× read bursts require cache and origin headroom, request coalescing, admission control, and responsive autoscaling.`);
  if (lowLatency) pressures.push(hasWrites
    ? "Tail latency requires bounded queues, local caches, strict downstream timeouts, and load shedding."
    : "Tail latency requires local caches, strict origin timeouts, request coalescing, and load shedding.");
  if (multiRegion) pressures.push(hasWrites
    ? "Failover, duplicate writes, data residency, and region-aware routing must be designed explicitly."
    : "Read failover, freshness, data residency, and region-aware routing must be designed explicitly.");
  if (!hasWrites && peakReadQps >= 50_000) pressures.push("Read fan-out, cache stampedes, hot keys, and origin protection dominate this workload.");
  if (!pressures.length) pressures.push("The workload can begin with a small regional architecture and scale after measurement.");

  const tradeoffs = !hasWrites ? [
    state.consistency === "strong"
      ? "Strong reads avoid stale results but may require authoritative-store or quorum access, increasing tail latency."
      : "Relaxed reads improve availability and cacheability but need an explicit staleness contract.",
    "Retention size cannot be derived without the upstream data volume; capacity the producing system separately.",
    "Read-only traffic shifts capacity risk to cache fill, origin fan-out, hot keys, and stale-read policy; no write queue is required.",
    multiRegion
      ? "Regional read cells improve latency and continuity but need explicit freshness and failover semantics."
      : "A single region is easier to operate but needs a tested regional recovery plan.",
  ] : [
    state.consistency === "strong"
      ? "Strong consistency protects invariants but reduces write availability during partitions."
      : "Relaxed consistency improves availability but requires conflict handling and stale-read tolerance.",
    longRetention
      ? "Object storage lowers retention cost but makes historical queries asynchronous or slower."
      : "Keeping data in the serving store simplifies queries but raises cost as retention grows.",
    highWriteScale
      ? "A streaming backbone absorbs spikes but introduces partitioning, replay, and consumer-lag operations."
      : "A small queue is simpler, but preserve a boundary that can evolve if traffic grows.",
    multiRegion
      ? "Regional autonomy improves resilience while making ordering and failover semantics more complex."
      : "A single region is easier to operate but needs a tested regional recovery plan.",
  ];

  const blockerCount = findings.filter((finding) => finding.severity === "blocker").length;
  const candidates = buildCandidates(state, database, stream, replication, highScale, hasWrites, blockerCount);
  const defensePrompts: DefensePrompt[] = hasWrites ? [
    { question:"Why is this database model a better fit than the closest alternative?", talkingPoint:`Tie the answer to ${state.workload} access patterns, ${state.consistency} consistency, and ${Math.round(peakWriteQps).toLocaleString("en-US")} peak writes per second.` },
    { question:"How will you choose a partition key and detect hot partitions?", talkingPoint:`Explain cardinality, ownership, skew metrics, and how ${partitions} starting partitions can be split without changing external identifiers.` },
    { question:"What happens during a regional network partition?", talkingPoint:multiRegion ? `State which region accepts writes, how conflicts are handled, and how the ${state.consistency} contract changes during failover.` : "Describe zone failover first, then the recovery-time and recovery-point objectives for a full regional loss." },
    { question:"Which estimate would you validate first with a load test?", talkingPoint:`Challenge the ${state.burstFactor}× burst assumption, payload distribution, compression ratio, and per-partition throughput before buying capacity.` },
  ] : [
    { question:"Where does the authoritative data come from, and how fresh must this read model be?", talkingPoint:`Name the upstream owner, refresh mechanism, and the user-visible staleness contract for ${state.consistency} reads.` },
    { question:"How will you prevent hot keys and cache stampedes?", talkingPoint:`Plan request coalescing, jittered TTLs, admission policy, and origin load shedding for ${Math.round(peakReadQps).toLocaleString("en-US")} peak reads per second.` },
    { question:"What happens to reads during a regional network partition?", talkingPoint:multiRegion ? "Define whether a region serves stale local data, fails closed, or reaches another region, and connect that choice to the consistency contract." : "Describe zone failover first, then the recovery-time objective for a full regional loss." },
    { question:"Which estimate would you validate first with a load test?", talkingPoint:"Measure cache hit ratio, hot-key skew, object-size distribution, and origin fan-out before sizing the read fleet." },
  ];

  return {
    baselineWriteQps, peakQps, peakReadQps, peakWriteQps, ingressMb, dailyTb, logicalStoredTb,
    physicalStoredTb, partitions, brokers, database, databaseReason, cache, cacheReason, stream,
    streamReason, storage, storageReason, replication, replicationReason, readPath, readPathReason,
    pressures, tradeoffs, findings, blockerCount, feasible:blockerCount === 0,
    candidates, recommendedCandidate:candidates[0], defensePrompts,
    highScale, longRetention,
  };
}

export function buildDesignBrief(state: LabState, result: ArchitectureRecommendation, shareUrl: string): string {
  const fmt = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits:1 }).format(value);
  return [
    "# Architecture Decision Lab — Design Brief",
    "",
    "## Workload",
    `- Baseline traffic: ${fmt(state.qps)} requests/second`,
    `- Burst factor: ${state.burstFactor}× (${fmt(result.peakQps)} peak requests/second)`,
    `- Read/write mix: ${state.readPercent}% / ${100 - state.readPercent}%`,
    `- Payload: ${fmt(state.sizeKb)} KB`,
    `- Workload: ${state.workload}`,
    `- Target p99: ${state.latency} ms`,
    `- Consistency: ${state.consistency}`,
    `- Availability: ${state.availability}%`,
    `- Durability: ${state.durability}`,
    `- Ordering: ${state.ordering}`,
    `- Retention: ${state.retention} days`,
    `- Regions: ${state.regions}`,
    "",
    "## Capacity starting point",
    `- Peak write ingress: ${fmt(result.ingressMb)} MB/s`,
    `- Daily logical data: ${fmt(result.dailyTb)} TB`,
    `- Retained logical data: ${fmt(result.logicalStoredTb)} TB`,
    `- Provisioned physical data: ${fmt(result.physicalStoredTb)} TB`,
    `- Stream partitions: ${result.partitions}`,
    `- Estimated brokers: ${result.brokers}`,
    "",
    "## Recommended architecture",
    ...(result.feasible
      ? []
      : [`> **${result.blockerCount} blocking conflict(s) unresolved.** The strategy below is the least-bad ranking under constraints that cannot all hold at once — change an input before treating it as a design.`, ""]),
    `- Strategy: ${result.recommendedCandidate.title} (${result.recommendedCandidate.fit}% fit)`,
    `- Database: ${result.database}`,
    `- Cache: ${result.cache}`,
    `- Stream: ${result.stream}`,
    `- Storage: ${result.storage}`,
    `- Replication: ${result.replication}`,
    `- Read path: ${result.readPath}`,
    "",
    "## Constraint review",
    ...result.findings.map((finding) => `- **${finding.severity.toUpperCase()} — ${finding.title}:** ${finding.detail}`),
    "",
    "## Explicit trade-offs",
    ...result.tradeoffs.map((tradeoff) => `- ${tradeoff}`),
    "",
    `Reopen this scenario: ${shareUrl}`,
  ].join("\n");
}
