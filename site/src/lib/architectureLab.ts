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

export interface ArchitectureCandidate {
  id: "lean" | "balanced" | "resilient";
  title: string;
  label: string;
  summary: string;
  topology: string;
  fit: number;
  scores: {
    latency: number;
    consistency: number;
    availability: number;
    cost: number;
    simplicity: number;
  };
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
  return Math.max(35, Math.min(98, Math.round(value)));
}

function buildCandidates(state: LabState, database: string, stream: string, highScale: boolean): ArchitectureCandidate[] {
  const multiRegion = state.regions > 1;
  const demandingAvailability = state.availability === "99.999";
  const strictDurability = state.durability === "zero-loss";
  const modest = state.qps < 20_000 && !multiRegion;

  const leanFit = clampScore(82 + (modest ? 10 : 0) - (highScale ? 24 : 0) - (multiRegion ? 16 : 0) - (demandingAvailability ? 18 : 0) - (strictDurability ? 12 : 0));
  const balancedFit = clampScore(82 + (highScale ? 6 : 2) + (state.regions === 2 ? 6 : 0) - (demandingAvailability ? 5 : 0));
  const resilientFit = clampScore(62 + (multiRegion ? 13 : 0) + (demandingAvailability ? 15 : 0) + (strictDurability ? 10 : 0) + (state.consistency === "strong" ? 6 : 0) + (highScale ? 5 : 0) - (modest ? 12 : 0));

  const candidates: ArchitectureCandidate[] = [
    {
      id:"lean", title:"Lean Regional", label:"LOWER COMPLEXITY",
      summary:"Start inside one region with managed building blocks and a deliberately replaceable queue boundary.",
      topology:`Regional load balancer → stateless service → ${state.consistency === "strong" ? "relational primary + replicas" : "managed serving store"}`,
      fit:leanFit,
      scores:{ latency:4, consistency:4, availability:2, cost:5, simplicity:5 },
      strength:"Fastest path to production with the smallest operational surface.",
      risk:multiRegion ? "Does not satisfy regional continuity without an explicit failover design." : "Regional failure remains the dominant recovery scenario.",
    },
    {
      id:"balanced", title:"Scale-Ready", label:"BALANCED",
      summary:"Separate serving, buffering, and durable history so each layer can scale on its own curve.",
      topology:`Geo-aware edge → autoscaled services → ${stream} → ${database}`,
      fit:balancedFit,
      scores:{ latency:4, consistency:4, availability:4, cost:3, simplicity:3 },
      strength:"Good throughput headroom without committing every subsystem to maximum complexity.",
      risk:"Requires disciplined partitioning, replay procedures, and cache invalidation ownership.",
    },
    {
      id:"resilient", title:"Resilience-First", label:"MAXIMUM CONTINUITY",
      summary:"Favor regional autonomy, redundant write paths, and tested recovery boundaries over cost and simplicity.",
      topology:`Global traffic manager → regional cells → durable log → replicated ${database}`,
      fit:resilientFit,
      scores:{ latency:4, consistency:5, availability:5, cost:1, simplicity:1 },
      strength:"Best fit for strict recovery objectives and continued operation through a regional failure.",
      risk:"Highest cost and operational burden; cross-region correctness must be tested continuously.",
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
  const lowLatency = state.latency <= 50;
  const longRetention = state.retention > 14 || physicalStoredTb > 5;
  const multiRegion = state.regions > 1;

  let database = "Relational database with read replicas";
  let databaseReason = "The workload can begin with a familiar relational model and indexed read replicas.";
  if (state.workload === "analytics") {
    database = "Columnar analytical store + object storage";
    databaseReason = "Scan-heavy analytical queries benefit from column pruning, compression, and immutable source data.";
  } else if (state.workload === "event-stream") {
    database = "Time-series or wide-column serving store";
    databaseReason = "Append-heavy events and time-window queries favor partitioned writes and retention-aware storage.";
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
    : highScale ? "Partitioned Kafka-compatible event log" : "Durable queue with replay";
  const streamReason = !hasWrites
    ? "The selected workload is read-only, so introduce a durable stream only when a write or change-data-capture path appears."
    : state.ordering === "global"
    ? "A sequencing boundary defines total order, but it is also a throughput and availability bottleneck."
    : highScale
      ? `${partitions} partitions at roughly 70% target utilization leave burst and rebalance headroom.`
      : "A smaller durable queue decouples spikes without adding unnecessary cluster complexity.";
  const storage = longRetention ? "Object storage as durable archive" : "Serving store + scheduled snapshots";
  const storageReason = longRetention
    ? `${physicalStoredTb.toFixed(1)} TB provisioned after compression, replication, and index overhead favors cheap immutable storage.`
    : "The retained volume is modest enough to begin with the serving store and verified backups.";

  let replication = "Synchronous replicas across availability zones";
  let replicationReason = "Keep quorum latency regional and test automatic zone failover.";
  if (multiRegion && state.consistency === "strong") {
    replication = "Regional quorum + scoped synchronous global writes";
    replicationReason = "Pay WAN coordination only for invariants that truly require global agreement; replicate other data asynchronously.";
  } else if (multiRegion) {
    replication = "Asynchronous active-active replication";
    replicationReason = "Local writes improve regional availability, but conflict resolution and replay must be explicit.";
  }

  const readPath = lowLatency ? "Edge routing → cache → regional read model" : "Regional service → indexed serving store";
  const readPathReason = lowLatency
    ? "Serve hot reads near users while keeping the durable write path independent."
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
  if (state.ordering === "global" && capacityPartitions > 1) {
    findings.push({ severity:"blocker", title:"Global ordering limits horizontal throughput", detail:`Capacity calls for about ${capacityPartitions} partitions, while a total order needs one sequencing authority. Narrow ordering to a key or accept a sequencer bottleneck.` });
  }
  if (state.durability === "zero-loss" && state.consistency === "eventual") {
    findings.push({ severity:"warning", title:"Zero-loss requires a durable acknowledgement boundary", detail:"Eventual visibility is compatible with zero loss only if writes are acknowledged after durable replicated logging, not after an in-memory regional write." });
  }
  if ((state.durability === "high" || state.durability === "zero-loss") && state.replicas < 3) {
    findings.push({ severity:"warning", title:"Replica count is below the durability target", detail:"Use at least three independent replicas and verify restore procedures; replication is not a backup." });
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
  if (state.burstFactor >= 5) pressures.push(`${state.burstFactor}× bursts require queue headroom, admission control, and autoscaling that reacts before saturation.`);
  if (lowLatency) pressures.push("Tail latency requires bounded queues, local caches, strict downstream timeouts, and load shedding.");
  if (multiRegion) pressures.push("Failover, duplicate writes, data residency, and region-aware routing must be designed explicitly.");
  if (!pressures.length) pressures.push("The workload can begin with a small regional architecture and scale after measurement.");

  const tradeoffs = [
    state.consistency === "strong"
      ? "Strong consistency protects invariants but reduces write availability during partitions."
      : "Relaxed consistency improves availability but requires conflict handling and stale-read tolerance.",
    longRetention
      ? "Object storage lowers retention cost but makes historical queries asynchronous or slower."
      : "Keeping data in the serving store simplifies queries but raises cost as retention grows.",
    highScale
      ? "A streaming backbone absorbs spikes but introduces partitioning, replay, and consumer-lag operations."
      : "A small queue is simpler, but preserve a boundary that can evolve if traffic grows.",
    multiRegion
      ? "Regional autonomy improves resilience while making ordering and failover semantics more complex."
      : "A single region is easier to operate but needs a tested regional recovery plan.",
  ];

  const candidates = buildCandidates(state, database, stream, highScale);
  const defensePrompts: DefensePrompt[] = [
    { question:"Why is this database model a better fit than the closest alternative?", talkingPoint:`Tie the answer to ${state.workload} access patterns, ${state.consistency} consistency, and ${Math.round(peakWriteQps).toLocaleString("en-US")} peak writes per second.` },
    { question:"How will you choose a partition key and detect hot partitions?", talkingPoint:`Explain cardinality, ownership, skew metrics, and how ${partitions} starting partitions can be split without changing external identifiers.` },
    { question:"What happens during a regional network partition?", talkingPoint:multiRegion ? `State which region accepts writes, how conflicts are handled, and how the ${state.consistency} contract changes during failover.` : "Describe zone failover first, then the recovery-time and recovery-point objectives for a full regional loss." },
    { question:"Which estimate would you validate first with a load test?", talkingPoint:`Challenge the ${state.burstFactor}× burst assumption, payload distribution, compression ratio, and per-partition throughput before buying capacity.` },
  ];

  return {
    baselineWriteQps, peakQps, peakReadQps, peakWriteQps, ingressMb, dailyTb, logicalStoredTb,
    physicalStoredTb, partitions, brokers, database, databaseReason, cache, cacheReason, stream,
    streamReason, storage, storageReason, replication, replicationReason, readPath, readPathReason,
    pressures, tradeoffs, findings, candidates, recommendedCandidate:candidates[0], defensePrompts,
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
