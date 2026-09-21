export type LearningStepKind = "read" | "practice" | "lab" | "review";

export interface LearningStep {
  id: string;
  title: string;
  description: string;
  href: string;
  duration: number;
  kind: LearningStepKind;
}

export interface LearningPath {
  slug: string;
  code: string;
  title: string;
  shortTitle: string;
  description: string;
  audience: string;
  steps: LearningStep[];
}

export const learningPaths: LearningPath[] = [
  {
    slug: "system-design-fundamentals",
    code: "PATH 01",
    title: "System Design Fundamentals",
    shortTitle: "System Design Fundamentals",
    description:
      "Build a repeatable interview framework: requirements, estimates, architecture, bottlenecks, and trade-offs.",
    audience: "Foundational · Senior-ready",
    steps: [
      {
        id: "frame-requirements",
        title: "Frame the problem and requirements",
        description: "Separate functional scope from availability, durability, latency, and security goals.",
        href: "/system-design/distributed-logging-system/#scope-and-requirements",
        duration: 12,
        kind: "read",
      },
      {
        id: "estimate-capacity",
        title: "Estimate capacity before choosing technology",
        description: "Translate hosts, events, and payload size into throughput and storage pressure.",
        href: "/system-design/distributed-logging-system/#capacity-estimation",
        duration: 15,
        kind: "read",
      },
      {
        id: "draw-architecture",
        title: "Read the high-level architecture",
        description: "Identify the synchronous path, asynchronous fan-out, and system of record.",
        href: "/system-design/distributed-logging-system/#high-level-architecture",
        duration: 18,
        kind: "read",
      },
      {
        id: "lab-baseline",
        title: "Model a baseline architecture",
        description: "Use the Decision Lab to turn traffic and durability constraints into a concrete design.",
        href: "/architecture-lab/?preset=api",
        duration: 20,
        kind: "lab",
      },
      {
        id: "review-tradeoffs",
        title: "Review failure modes and trade-offs",
        description: "Practice explaining what fails first and which guarantees you intentionally weaken.",
        href: "/system-design/distributed-logging-system/#failure-modes",
        duration: 15,
        kind: "review",
      },
    ],
  },
  {
    slug: "senior-engineer-interview",
    code: "PATH 02",
    title: "Senior Engineer Interview",
    shortTitle: "Senior Interview",
    description:
      "Combine coding mechanics, scalable architecture, operational judgment, and concise interview communication.",
    audience: "Senior · Interview loop",
    steps: [
      {
        id: "lru-cache",
        title: "Refresh an interview-ready data structure",
        description: "Review LRU cache operations, invariants, complexity, and common follow-up questions.",
        href: "/coding/lru-cache/",
        duration: 25,
        kind: "read",
      },
      {
        id: "logging-overview",
        title: "Design a production-scale logging platform",
        description: "Work through ingestion, Kafka, indexing, object storage, querying, and failure handling.",
        href: "/system-design/distributed-logging-system/",
        duration: 35,
        kind: "read",
      },
      {
        id: "logging-practice",
        title: "Run the logging interview prompts",
        description: "Use question mode, rate your answers, and save weak areas for another pass.",
        href: "/system-design/distributed-logging-system/#practice-title",
        duration: 20,
        kind: "practice",
      },
      {
        id: "api-lab",
        title: "Stress-test an API architecture",
        description: "Change QPS, latency, consistency, and region assumptions in the Decision Lab.",
        href: "/architecture-lab/?preset=api",
        duration: 20,
        kind: "lab",
      },
      {
        id: "interview-review",
        title: "Review an interview debrief format",
        description: "Use the interview note structure to prepare a clear post-round retrospective.",
        href: "/interviews/example-interview/",
        duration: 12,
        kind: "review",
      },
    ],
  },
  {
    slug: "staff-principal-interview",
    code: "PATH 03",
    title: "Staff / Principal Interview",
    shortTitle: "Staff / Principal",
    description:
      "Practice the judgment signals senior interviewers look for: boundaries, failure containment, cost, and evolution.",
    audience: "Staff · Principal",
    steps: [
      {
        id: "system-of-record",
        title: "Choose the system of record deliberately",
        description: "Understand why durable storage, transport, and serving indexes should fail independently.",
        href: "/system-design/distributed-logging-system/#storage-and-retention",
        duration: 20,
        kind: "read",
      },
      {
        id: "multi-tenancy",
        title: "Design for multi-tenancy and quotas",
        description: "Reason about identity boundaries, noisy neighbors, redaction, and hierarchical limits.",
        href: "/system-design/distributed-logging-system/#multi-tenancy-quotas-and-security",
        duration: 18,
        kind: "read",
      },
      {
        id: "multi-region",
        title: "Define the multi-region posture",
        description: "Make failover, duplicate handling, search fan-out, and ordering trade-offs explicit.",
        href: "/system-design/distributed-logging-system/#multi-region-availability",
        duration: 18,
        kind: "read",
      },
      {
        id: "ledger-lab",
        title: "Compare strong and eventual consistency",
        description: "Use the ledger preset, then relax consistency and observe the architecture changes.",
        href: "/architecture-lab/?preset=ledger",
        duration: 25,
        kind: "lab",
      },
      {
        id: "staff-practice",
        title: "Complete a timed reasoning pass",
        description: "Answer every prompt, self-rate, and use the weak-topic summary to plan another attempt.",
        href: "/system-design/distributed-logging-system/#practice-title",
        duration: 25,
        kind: "practice",
      },
    ],
  },
  {
    slug: "distributed-systems-deep-dive",
    code: "PATH 04",
    title: "Distributed Systems Deep Dive",
    shortTitle: "Distributed Systems",
    description:
      "Trace one large system through delivery semantics, partitioning, storage tiers, query fan-out, and recovery.",
    audience: "Advanced · Architecture depth",
    steps: [
      {
        id: "delivery-semantics",
        title: "Delivery semantics and acknowledgement",
        description: "Follow an event from local spool to replicated Kafka and an idempotent search index.",
        href: "/system-design/distributed-logging-system/#reliable-ingestion-and-acknowledgement",
        duration: 20,
        kind: "read",
      },
      {
        id: "partitioning",
        title: "Partitioning and ordering",
        description: "Balance tenant isolation, source order, hot partitions, and horizontal scale.",
        href: "/system-design/distributed-logging-system/#partition-key-and-ordering",
        duration: 15,
        kind: "read",
      },
      {
        id: "storage-tiers",
        title: "Hot, warm, and cold storage",
        description: "Separate the durable archive from a rebuildable interactive search index.",
        href: "/system-design/distributed-logging-system/#storage-and-retention",
        duration: 20,
        kind: "read",
      },
      {
        id: "streaming-features",
        title: "Streaming features without search polling",
        description: "See how live tail and alerting reuse the event stream rather than overload OpenSearch.",
        href: "/system-design/distributed-logging-system/#live-tail-and-alerting",
        duration: 15,
        kind: "read",
      },
      {
        id: "logs-lab",
        title: "Model the logging workload",
        description: "Explore partition count, daily volume, storage choice, and regional replication.",
        href: "/architecture-lab/?preset=logs",
        duration: 25,
        kind: "lab",
      },
    ],
  },
  {
    slug: "two-week-interview-sprint",
    code: "PATH 05",
    title: "2-Week Interview Sprint",
    shortTitle: "2-Week Sprint",
    description:
      "A focused fourteen-session plan that alternates architecture, coding, drills, and current engineering signals.",
    audience: "14 sessions · Interview prep",
    steps: [
      { id: "day-01", title: "Day 1 · Requirements", description: "Frame functional and non-functional requirements.", href: "/system-design/distributed-logging-system/#scope-and-requirements", duration: 25, kind: "read" },
      { id: "day-02", title: "Day 2 · Estimation", description: "Recalculate capacity without looking at the worked answer.", href: "/system-design/distributed-logging-system/#capacity-estimation", duration: 25, kind: "practice" },
      { id: "day-03", title: "Day 3 · Coding pattern", description: "Implement or explain the LRU cache invariants.", href: "/coding/lru-cache/", duration: 35, kind: "practice" },
      { id: "day-04", title: "Day 4 · Architecture", description: "Redraw the logging architecture from memory.", href: "/system-design/distributed-logging-system/#high-level-architecture", duration: 30, kind: "practice" },
      { id: "day-05", title: "Day 5 · Delivery semantics", description: "Explain acknowledgement, retry, and deduplication.", href: "/system-design/distributed-logging-system/#reliable-ingestion-and-acknowledgement", duration: 25, kind: "read" },
      { id: "day-06", title: "Day 6 · Decision lab", description: "Tune a high-throughput API scenario.", href: "/architecture-lab/?preset=api", duration: 25, kind: "lab" },
      { id: "day-07", title: "Day 7 · Weekly signal", description: "Review the current weekly engineering topic trends.", href: "/eng-digest/weekly/", duration: 20, kind: "review" },
      { id: "day-08", title: "Day 8 · Storage", description: "Compare hot search storage with the durable archive.", href: "/system-design/distributed-logging-system/#storage-and-retention", duration: 25, kind: "read" },
      { id: "day-09", title: "Day 9 · Query execution", description: "Explain pruning, pagination, and cold-query routing.", href: "/system-design/distributed-logging-system/#query-execution", duration: 25, kind: "read" },
      { id: "day-10", title: "Day 10 · Practice deck", description: "Complete a timed questions-only pass and self-rate.", href: "/system-design/distributed-logging-system/#practice-title", duration: 30, kind: "practice" },
      { id: "day-11", title: "Day 11 · Multi-region", description: "Choose failover and replication semantics.", href: "/system-design/distributed-logging-system/#multi-region-availability", duration: 25, kind: "read" },
      { id: "day-12", title: "Day 12 · Consistency lab", description: "Compare ledger and global-feed presets.", href: "/architecture-lab/?preset=ledger", duration: 30, kind: "lab" },
      { id: "day-13", title: "Day 13 · Failure review", description: "Name what breaks first and how the system degrades.", href: "/system-design/distributed-logging-system/#where-the-system-breaks-first", duration: 25, kind: "review" },
      { id: "day-14", title: "Day 14 · Full mock", description: "Deliver the design in forty-five minutes, then compare with the summary.", href: "/system-design/distributed-logging-system/#interview-summary", duration: 45, kind: "practice" },
    ],
  },
];

export function learningPathDuration(path: LearningPath): number {
  return path.steps.reduce((total, step) => total + step.duration, 0);
}

export function findLearningPathForHref(href: string): LearningPath | undefined {
  const normalized = href.split("#")[0].split("?")[0].replace(/\/$/, "");
  return learningPaths.find((path) =>
    path.steps.some((step) => step.href.split("#")[0].split("?")[0].replace(/\/$/, "") === normalized)
  );
}
