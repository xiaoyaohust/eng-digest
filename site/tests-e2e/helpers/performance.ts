export interface ShiftSample {
  startTime: number;
  value: number;
  hadRecentInput: boolean;
  sources?: string[];
}

export interface PerformanceLog {
  shifts: ShiftSample[];
  lcp: number;
  supported: string[];
}

/** CLS is the largest session window, not the sum over the whole page visit. */
export function calculateCLS(entries: ShiftSample[]): number {
  let start = -Infinity, previous = -Infinity, session = 0, maximum = 0;
  for (const entry of entries) {
    if (entry.hadRecentInput) continue;
    if (entry.startTime - previous < 1000 && entry.startTime - start < 5000) session += entry.value;
    else { start = entry.startTime; session = entry.value; }
    previous = entry.startTime;
    maximum = Math.max(maximum, session);
  }
  return maximum;
}

// Passed to addInitScript: it must have no runtime imports/closure dependencies.
export function observePerformance() {
  const log: PerformanceLog = { shifts: [], lcp: 0, supported: [...PerformanceObserver.supportedEntryTypes] };
  (window as Window & { __performanceLog?: PerformanceLog }).__performanceLog = log;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const shift = entry as PerformanceEntry & {
        value: number; hadRecentInput: boolean;
        sources?: { node?: Element }[];
      };
      log.shifts.push({
        startTime: shift.startTime, value: shift.value, hadRecentInput: shift.hadRecentInput,
        sources: shift.sources?.map(({ node }) => node?.id || node?.tagName || "unknown"),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) log.lcp = entry.startTime;
  }).observe({ type: "largest-contentful-paint", buffered: true });
}
