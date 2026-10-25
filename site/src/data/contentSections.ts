import { AI_SECTION_NAME } from "./ai.ts";
import { SCIENCE_SECTION_NAME } from "./scienceProjects.ts";

/** Editorial display order, shared by navigation, home tracks, and footer.
 * Module codes are stable identifiers, independent of display order. */
export const contentSections = [
  {
    id: "system-design", code: "01", title: "System Design", navLabel: "Systems", href: "/system-design/",
    description: "Architecture, trade-offs, distributed systems, and the decisions behind them.",
    label: "ARCHITECTURE", action: "Explore ↗",
  },
  {
    id: "ai", code: "06", title: AI_SECTION_NAME, navLabel: AI_SECTION_NAME, href: "/ai/",
    description: "Build understanding through worked examples, small Python experiments, and exercises, from fundamentals to models and agents.",
    label: "CONCEPTS / EXPERIMENTS", action: "Start learning ↗",
  },
  {
    id: "field-notes", code: "03", title: "Engineering Field Notes", navLabel: "Field Notes", href: "/field-notes/",
    description: "Production lessons, technical deep dives, and decisions from real engineering work.",
    label: "PRACTICE / EXPERIENCE", action: "Explore ↗",
  },
  {
    id: "eng-digest", code: "04", title: "Engineering Digest", navLabel: "Digest", href: "/eng-digest/",
    description: "A daily signal feed distilled from high-quality engineering blogs.",
    label: "DAILY SIGNAL", action: "Explore ↗",
  },
  {
    id: "science", code: "05", title: SCIENCE_SECTION_NAME, navLabel: SCIENCE_SECTION_NAME, href: "/science/",
    description: "Python pipelines, numerical experiments, and scientific measurements from public data.",
    label: "RESEARCH / EVIDENCE", action: "Explore ↗",
  },
  {
    id: "coding", code: "02", title: "Coding Patterns", navLabel: "Coding", href: "/coding/",
    description: "Reusable problem-solving patterns, algorithms, and interview-ready practice.",
    label: "ALGORITHMS", action: "Explore ↗",
  },
] as const;
