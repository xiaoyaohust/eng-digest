export type Consistency = "eventual" | "read-your-writes" | "strong";

export interface LabState {
  qps: number;
  sizeKb: number;
  latency: number;
  consistency: Consistency;
  retention: number;
  regions: number;
}

export interface ArchitectureRecommendation {
  ingressMb: number;
  dailyTb: number;
  storedTb: number;
  partitions: number;
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
};

export const labPresets: Record<string, LabState> = {
  api: { qps:50_000, sizeKb:4, latency:50, consistency:"read-your-writes", retention:7, regions:2 },
  logs: { qps:500_000, sizeKb:1, latency:250, consistency:"eventual", retention:90, regions:3 },
  ledger: { qps:8_000, sizeKb:3, latency:100, consistency:"strong", retention:365, regions:2 },
  feed: { qps:200_000, sizeKb:6, latency:100, consistency:"eventual", retention:30, regions:3 },
};

const numericRules = {
  qps: { min:100, max:1_000_000, step:100 },
  sizeKb: { min:1, max:1_024, step:1 },
  retention: { min:1, max:365, step:1 },
} as const;
const latencyValues = new Set([20, 50, 100, 250, 1_000]);
const consistencyValues = new Set<Consistency>(["eventual", "read-your-writes", "strong"]);
const regionValues = new Set([1, 2, 3]);

export function sanitizeLabValue<K extends keyof LabState>(key: K, value: unknown): LabState[K] | null {
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === "" || raw === null || raw === undefined) return null;

  if (key === "consistency") {
    return (typeof raw === "string" && consistencyValues.has(raw as Consistency) ? raw : null) as LabState[K] | null;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  if (key === "latency") return (latencyValues.has(numeric) ? numeric : null) as LabState[K] | null;
  if (key === "regions") return (regionValues.has(numeric) ? numeric : null) as LabState[K] | null;

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

export function recommendArchitecture(state: LabState): ArchitectureRecommendation {
  const ingressMb = (state.qps * state.sizeKb) / 1024;
  const dailyTb = (ingressMb * 86400) / 1024 / 1024;
  const storedTb = dailyTb * state.retention;
  const partitions = Math.max(3, Math.ceil(ingressMb / 10), Math.ceil(state.qps / 10_000));
  const highScale = state.qps >= 50_000 || ingressMb >= 100;
  const lowLatency = state.latency <= 50;
  const longRetention = state.retention > 14 || storedTb > 5;
  const multiRegion = state.regions > 1;

  const database = state.consistency === "strong"
    ? (multiRegion ? "Distributed SQL / globally consistent database" : "Relational database with synchronous replicas")
    : (highScale ? "Partitioned NoSQL serving store" : "Relational database with read replicas");
  const databaseReason = state.consistency === "strong"
    ? "Transactions and invariant protection matter more than the lowest write latency."
    : "The workload can trade immediate agreement for horizontal write scale and regional availability.";
  const cache = lowLatency || highScale ? "Distributed cache + local hot cache" : "Selective cache-aside layer";
  const cacheReason = lowLatency
    ? `A ${state.latency} ms p99 target leaves little room for repeated database round trips.`
    : "Cache only expensive or frequently repeated reads; keep invalidation scope explicit.";
  const stream = highScale ? "Partitioned Kafka-compatible event log" : "Durable queue with replay";
  const streamReason = highScale
    ? `${partitions} partitions provide a conservative starting point for throughput and consumer parallelism.`
    : "A smaller durable queue decouples spikes without adding unnecessary cluster complexity.";
  const storage = longRetention ? "Object storage as the durable archive" : "Primary store with scheduled snapshots";
  const storageReason = longRetention
    ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits:1 }).format(storedTb)} TB of logical retention favors cheap immutable storage and rebuildable serving indexes.`
    : "The retained volume is modest enough to begin with the primary data store and reliable backups.";

  let replication = "Synchronous replicas inside one region";
  let replicationReason = "Keep quorum latency local and spread replicas across availability zones.";
  if (multiRegion && state.consistency === "strong") {
    replication = "Regional quorum + deliberate cross-region consistency boundary";
    replicationReason = "Global synchronous writes protect invariants but add WAN latency; scope them to data that truly needs it.";
  } else if (multiRegion) {
    replication = "Asynchronous active-active replication";
    replicationReason = "Eventual consistency allows local writes and better regional availability, with conflict handling required.";
  }

  const readPath = lowLatency ? "Edge routing → cache → regional read model" : "Regional service → indexed serving store";
  const readPathReason = lowLatency
    ? "Serve hot reads close to users and keep the durable write path independent."
    : "A dedicated read model avoids expensive scans while preserving a simpler request path.";
  const pressures: string[] = [];
  if (ingressMb > 500) pressures.push("Network and broker throughput dominate; compression and batching are mandatory.");
  if (partitions > 100) pressures.push("Partition ownership, rebalance time, and hot keys become operational risks.");
  if (storedTb > 100) pressures.push("Retention cost and small-file compaction matter more than raw disk capacity.");
  if (lowLatency) pressures.push("Tail latency requires bounded queues, local caches, and strict downstream timeouts.");
  if (multiRegion) pressures.push("Failover, duplicate writes, data residency, and region-aware routing must be designed explicitly.");
  if (!pressures.length) pressures.push("The workload can begin with a small regional architecture and scale after measurement.");

  const tradeoffs = [
    state.consistency === "strong"
      ? "Strong consistency protects invariants but reduces write availability during partitions."
      : "Eventual consistency improves availability but requires conflict resolution and stale-read tolerance.",
    longRetention
      ? "Cheap object storage lowers retention cost but makes historical queries asynchronous or slower."
      : "Keeping data in the serving store simplifies queries but raises cost as retention grows.",
    highScale
      ? "A streaming backbone absorbs spikes but introduces partitioning, replay, and consumer-lag operations."
      : "Starting without a large streaming cluster is simpler, but the queue boundary should remain replaceable.",
    multiRegion
      ? "Regional autonomy improves resilience while making ordering and failover semantics more complex."
      : "A single region is easier to operate but needs a tested recovery plan for regional failure.",
  ];

  return { ingressMb, dailyTb, storedTb, partitions, database, databaseReason, cache, cacheReason, stream, streamReason, storage, storageReason, replication, replicationReason, readPath, readPathReason, pressures, tradeoffs, highScale, longRetention };
}
