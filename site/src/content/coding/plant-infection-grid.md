---
title: "Plant Infection on a Grid: Spread, Recovery, Death, and Firebreaks"
description: "Five escalating grid questions, from multi-source BFS to timed events and an exact firebreak planner, with Java and Python solutions."
date: 2026-09-29
difficulty: hard
patterns:
  - multi-source-bfs
  - event-simulation
  - state-space-search
languages:
  - java
  - python
tags:
  - graph
  - bfs
  - simulation
  - dynamic-programming
featured: true
draft: false
practice:
  - question: "Why does recovery after D days not change the first infection day in Part 3?"
    topic: "BFS invariant"
    hint: "Consider D = 1 and the order of spreading and recovery on the same day."
    answer: "Every infected plant gets to spread on the next day before it recovers, even when D = 1. Therefore the shortest eight-direction path from any initial X still determines each reachable plant's first infection day."
  - question: "Why can a Part 4 plant die even after its infected-neighbor count falls below K?"
    topic: "Timed trigger"
    hint: "K starts a countdown; it is not a condition that must hold for D consecutive days."
    answer: "The first instant at which an infected plant has at least K infected neighbors schedules death D days later and cancels normal recovery. A later drop in neighbor count does not cancel that scheduled death."
  - question: "Why does trying each row or column once not solve Part 5?"
    topic: "Optimization state"
    hint: "A useful action may depend on what happened on an earlier day."
    answer: "A burn changes future infections, neighbor counts, and death timers. Later choices depend on the resulting state, so an exact planner must compare sequences of daily actions, not only one line in the initial grid."
---

## Problem

You are given a rectangular grid of plants. `X` is infected, `.` is healthy, and—in later parts—`I` is immune. The eight neighbors of a cell include diagonals. Each day, infected plants spread to every adjacent healthy plant; newly infected plants cannot spread again until the following day. Answer five increasingly demanding questions:

1. With only `X` and `.`, how many days until no new infection is possible?
2. Add `I`, which neither catches nor spreads infection. How many days until infection stops?
3. An infected plant recovers into an immune plant exactly `D` days after it became infected. How many days until **no further infection or recovery** is pending?
4. If an infected plant ever has at least `K` infected neighbors, it starts a `D`-day death countdown. How many days until no change is pending, and how many plants die?
5. At the beginning of each day, you may burn one row or one column. What is the minimum total number of deaths?

The source notes briefly explore a different infection threshold `T`, then explicitly return to the original rule: **one infected neighbor is enough**. This solution follows that final version. `K` applies only to the death rule in Part 4 and its continuation in Part 5. Neither the dimensions nor `D` nor `K` is hard-coded.

### A precise daily timeline

The later parts need an order of events. We use this one consistently: optional burn at the **start** of a day; existing infected plants spread; all new infections for the next day become visible together; any newly satisfied `K` condition starts its countdown; due deaths happen; then due recoveries happen unless a death was scheduled. A plant infected on day `t` first spreads on day `t + 1` and normally recovers at the **end of day `t + D`**. Thus, even for `D = 1`, it spreads before recovering. Day 0 is the input state; the answer is the day of the last actual change, or 0 if no change can occur.

Once a plant enters the death countdown, it remains infected until it dies at trigger day `+ D`; its ordinary recovery is canceled. A later decrease below `K` does not cancel death. Only *infected* plants are eligible for this rule. These choices match the final interpretation in the supplied discussion. If an interviewer instead makes recovery win ties, or requires `K` to remain true continuously, the event order and state transitions must change.

Part 5 needs one more convention because the short prompt does not say what a burn costs. Here burning kills **every still-living plant on that line**, including healthy, infected, immune, and recovered plants. Those deaths count toward the objective; previously dead or burned cells are not counted twice. A burned cell is permanently empty and blocks spread. Burning is optional, at most one row *or* column per day, and may happen before the first day's spread and death-trigger check. Treating a burn as free removal would produce a very different optimization problem. We will also discuss alternative interpretations below.

## Parts 1 and 2: multi-source BFS

Put **all** initial `X` cells into a queue at distance zero. Each layer of the queue is one day. When processing one infected cell, visit its eight neighbors. A `.` becomes infected on first discovery and enters the next layer; `I` is simply skipped. Marking a cell immediately prevents duplicate queue entries, but the current layer's fixed size ensures a newly infected cell does not spread on the same day.

For a single row `X...`, the infection days are 0, 1, 2, and 3, so the answer is 3. With an immune wall, some `.` cells may never be reached; balance means **nothing more can change**, not that every plant was infected. Both parts are `O(mn)` time and `O(mn)` worst-case queue space for an `m × n` grid. The eight neighbor checks are a constant factor.

## Part 3: BFS plus the last recovery

The surprising simplification is that recovery does not change first-infection times under the stated timeline. Every infected cell has a chance to spread on its next day before any `D ≥ 1` recovery. Therefore the same multi-source BFS yields the first infection day of every reachable cell. If the last infection happens on day `L`, the final recovery happens on day `L + D`. If there was no initial `X`, return 0. This remains `O(mn)` time and space; there is no need to simulate `D` empty days.

## Part 4: infection times plus chronological events

Death adds a second clock. A plant can be infected on day 0, acquire its `K`th infected neighbor on day 4, and die on day `4 + D`, not day `0 + D`. Normal recovery is canceled at the trigger. The number of infected neighbors also falls when plants recover or die.

First run BFS to find infection days. This still works: each infected plant spreads once, on its next day, **before** a death or recovery due that day. We need three kinds of events, ordered by `(day, event type)`:

| Event | Same-day order | Effect |
| --- | ---: | --- |
| Infection | 1 | Make the plant infectious; increment each neighbor's infected count; check newly eligible death triggers. |
| Death | 2 | If still infected and this is its scheduled death, remove it and decrement neighbor counts. |
| Recovery | 3 | If still infected and no death was scheduled, remove it and decrement neighbor counts. |

The events have a useful extra property. BFS yields infection days in nondecreasing order. Adding the same `D` to each gives nondecreasing recovery days. We only schedule death as we process triggers in chronological order, so death days—trigger day `+ D`—also enter in nondecreasing order. Keep **three FIFO queues**, one per event type, and repeatedly take the earliest head; on ties use the table's order. This is a constant-time three-way merge, not a general-purpose priority queue.

For `XX..`, `D = 2`, and `K = 2`, the second plant gets its second infected neighbor on day 1 and schedules death for day 3. The third plant reaches the threshold on day 2 and dies on day 4. The outer plants recover. The answer is `(4 days, 2 deaths)`. A queued recovery can become stale after death is scheduled; check the plant's current state when processing it.

There are at most one infection, one normal recovery, and one scheduled death event per reached cell. BFS and the three-queue merge take `O(mn)` time and `O(mn)` space; each event examines at most eight neighbors. This is asymptotically optimal because reading the input already costs `Ω(mn)`. It also avoids allocating a bucket for every day when `D` is large.

## Part 5: an exact, but necessarily more expensive, planner

The first four parts ask for the outcome of a fixed process. Part 5 asks us to choose an action *each day*, and an action changes the later grid. A greedy rule such as “burn the row with the most infections” can sacrifice many healthy plants and still miss a cheaper column. Nor is trying each line only on day 0 enough: a useful second burn may depend on the first day's spread.

For a small interview grid, use memoized state-space search. A state records, for every cell, whether it is healthy, immune, recovered, dead, burned, or infected; an infected cell also stores its remaining recovery time and, if triggered, remaining death time. For each state, try **no burn** and every nonempty row or column burn. Apply the simultaneous one-day transition above, count deaths on that transition, and recurse. Cache the minimum future deaths for identical states. A state with no infected plants has cost zero; there are no pending live-cell transitions. This finds the minimum under our stated rules because it explores every allowed first action and optimally solves the remaining state.

If there are `A = m + n + 1` choices per day and at most `H` relevant days, a loose upper bound is `O(A^H · mn)` time without memoization. Here `H` is at most on the order of `mn + D`: infections move through at most `mn` new cells, and the final recovery or death is at most `D` days after the last trigger. The memoized bound is `O(S · A · mn)` time and `O(S · mn)` memory for `S` reachable states, which can still be exponential. This is an **exact optimal answer**, not a claim that a large-grid production planner is cheap. A larger input would need specified constraints, admissible lower bounds, or a stated approximation target before promising a faster algorithm.

For example, with `XX`, `D = 2`, `K = 1`, doing nothing makes both plants trigger death, for two deaths. Burn either one-cell column on day 0: one plant dies immediately, the other has no infected neighbor and later recovers. The minimum is one death. If the threshold had already been committed **before** the first allowed burn, that example's answer would be different; event timing is part of the problem.

## Java solution

Save this complete program as `PlantInfection.java`. The class exposes one method for Parts 1–3, one for Part 4, and one for Part 5. `main` instantiates it and prints the expected and actual outcomes. Small data-holder classes do not complicate the solving methods.

```java
import java.util.*;

public class PlantInfection {
    private static final int[] DR = {-1, -1, -1, 0, 0, 1, 1, 1};
    private static final int[] DC = {-1, 0, 1, -1, 1, -1, 0, 1};
    private int height, width, recoveryDays, deathThreshold;
    private Map<String, Integer> memo;

    public static final class Result {
        public final long days;
        public final int deaths;
        Result(long days, int deaths) { this.days = days; this.deaths = deaths; }
        public String toString() { return "(" + days + " days, " + deaths + " deaths)"; }
    }

    private static final class Event {
        final long day;
        final int type, id;
        Event(long day, int type, int id) {
            this.day = day; this.type = type; this.id = id;
        }
    }

    // Parts 1 and 2 pass recoveryDays = 0; Part 3 passes D >= 1.
    public long spreadDays(String[] grid, long recoveryDays) {
        if (recoveryDays < 0) throw new IllegalArgumentException("Negative recovery time");
        if (grid.length == 0 || grid[0].isEmpty()) return 0;
        int m = grid.length, n = grid[0].length();
        int[] distance = new int[m * n];
        Arrays.fill(distance, -1);
        ArrayDeque<Integer> queue = new ArrayDeque<>();
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r].charAt(c) == 'X') {
                    int id = r * n + c;
                    distance[id] = 0;
                    queue.add(id);
                }
            }
        }
        if (queue.isEmpty()) return 0;

        int lastInfection = 0;
        while (!queue.isEmpty()) {
            int id = queue.remove(), r = id / n, c = id % n;
            for (int d = 0; d < 8; d++) {
                int nr = r + DR[d], nc = c + DC[d];
                if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
                int next = nr * n + nc;
                if (grid[nr].charAt(nc) != '.' || distance[next] != -1) continue;
                distance[next] = distance[id] + 1;
                lastInfection = Math.max(lastInfection, distance[next]);
                queue.add(next);
            }
        }
        return lastInfection + recoveryDays;
    }

    public Result simulateDeaths(String[] grid, long dDays, int k) {
        if (dDays < 1 || k < 0) throw new IllegalArgumentException("Invalid D or K");
        if (grid.length == 0 || grid[0].isEmpty()) return new Result(0, 0);
        int m = grid.length, n = grid[0].length(), size = m * n;
        int[] infectedDay = new int[size];
        Arrays.fill(infectedDay, -1);
        ArrayDeque<Integer> bfs = new ArrayDeque<>();
        ArrayList<Integer> infectionOrder = new ArrayList<>();
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r].charAt(c) == 'X') {
                    int id = r * n + c;
                    infectedDay[id] = 0;
                    bfs.add(id);
                    infectionOrder.add(id);
                }
            }
        }
        if (bfs.isEmpty()) return new Result(0, 0);

        // Death cannot prevent next-day spread, so BFS still fixes first infection days.
        while (!bfs.isEmpty()) {
            int id = bfs.remove(), r = id / n, c = id % n;
            for (int direction = 0; direction < 8; direction++) {
                int nr = r + DR[direction], nc = c + DC[direction];
                if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
                int next = nr * n + nc;
                if (grid[nr].charAt(nc) != '.' || infectedDay[next] != -1) continue;
                infectedDay[next] = infectedDay[id] + 1;
                bfs.add(next);
                infectionOrder.add(next);
            }
        }

        ArrayDeque<Event> infections = new ArrayDeque<>();
        ArrayDeque<Event> deathsDue = new ArrayDeque<>();
        ArrayDeque<Event> recoveries = new ArrayDeque<>();
        for (int id : infectionOrder) {
            infections.add(new Event(infectedDay[id], 0, id));
            recoveries.add(new Event((long) infectedDay[id] + dDays, 2, id));
        }
        List<ArrayDeque<Event>> streams = Arrays.asList(infections, deathsDue, recoveries);
        boolean[] infected = new boolean[size];
        int[] neighborCount = new int[size];
        long[] deathDay = new long[size];
        Arrays.fill(deathDay, -1);
        long lastChange = 0;
        int deaths = 0;

        while (!infections.isEmpty() || !deathsDue.isEmpty() || !recoveries.isEmpty()) {
            Event event = null;
            ArrayDeque<Event> chosen = null;
            for (ArrayDeque<Event> stream : streams) {
                if (stream.isEmpty()) continue;
                Event head = stream.peek();
                if (event == null || head.day < event.day
                        || (head.day == event.day && head.type < event.type)) {
                    event = head;
                    chosen = stream;
                }
            }
            chosen.remove();
            int id = event.id, r = id / n, c = id % n;
            if (event.type == 0) {
                infected[id] = true;
                lastChange = event.day;
                // A new X can trigger itself or an already infected neighbor.
                for (int candidate = -1; candidate < 8; candidate++) {
                    int target;
                    if (candidate == -1) target = id;
                    else {
                        int nr = r + DR[candidate], nc = c + DC[candidate];
                        if (nr < 0 || nr >= m || nc < 0 || nc >= n) continue;
                        target = nr * n + nc;
                        neighborCount[target]++;
                    }
                    if (infected[target] && deathDay[target] == -1
                            && neighborCount[target] >= k) {
                        deathDay[target] = event.day + dDays;
                        deathsDue.add(new Event(deathDay[target], 1, target));
                    }
                }
            } else if (infected[id] && (event.type == 1
                    ? deathDay[id] == event.day : deathDay[id] == -1)) {
                // A scheduled death wins over the plant's old recovery event.
                infected[id] = false;
                lastChange = event.day;
                if (event.type == 1) deaths++;
                for (int direction = 0; direction < 8; direction++) {
                    int nr = r + DR[direction], nc = c + DC[direction];
                    if (nr >= 0 && nr < m && nc >= 0 && nc < n) {
                        neighborCount[nr * n + nc]--;
                    }
                }
            }
        }
        return new Result(lastChange, deaths);
    }

    public int minDeaths(String[] grid, int dDays, int k) {
        if (dDays < 1 || k < 0) throw new IllegalArgumentException("Invalid D or K");
        if (grid.length == 0 || grid[0].isEmpty()) return 0;
        // If doing nothing causes no deaths, zero is already optimal.
        if (simulateDeaths(grid, dDays, k).deaths == 0) return 0;
        height = grid.length; width = grid[0].length();
        recoveryDays = dDays; deathThreshold = k;
        char[] state = new char[height * width];
        int[] recovery = new int[state.length], death = new int[state.length];
        for (int r = 0; r < height; r++) {
            for (int c = 0; c < width; c++) {
                int id = r * width + c;
                state[id] = grid[r].charAt(c);
                if (state[id] == 'X') recovery[id] = dDays;
            }
        }
        memo = new HashMap<>();
        return search(state, recovery, death);
    }

    private int search(char[] state, int[] recovery, int[] death) {
        boolean hasInfection = false;
        for (char cell : state) if (cell == 'X') hasInfection = true;
        if (!hasInfection) return 0;
        String key = Arrays.toString(state) + Arrays.toString(recovery) + Arrays.toString(death);
        if (memo.containsKey(key)) return memo.get(key);
        int size = state.length, best = size;

        for (int action = -1; action < height + width; action++) {
            char[] next = state.clone();
            int[] rec = recovery.clone(), die = death.clone();
            int cost = 0;
            if (action >= 0) {
                for (int id = 0; id < size; id++) {
                    boolean onLine = action < height ? id / width == action
                        : id % width == action - height;
                    if (onLine && next[id] != 'D' && next[id] != 'B') {
                        next[id] = 'B'; rec[id] = die[id] = 0; cost++;
                    }
                }
                if (cost == 0) continue;
            }
            if (cost >= best) continue;

            // The burn happens before today's threshold check and spread.
            for (int id = 0; id < size; id++) {
                if (next[id] != 'X' || die[id] != 0) continue;
                int r = id / width, c = id % width, count = 0;
                for (int direction = 0; direction < 8; direction++) {
                    int nr = r + DR[direction], nc = c + DC[direction];
                    if (nr >= 0 && nr < height && nc >= 0 && nc < width
                            && next[nr * width + nc] == 'X') count++;
                }
                if (count >= deathThreshold) die[id] = recoveryDays;
            }

            boolean[] oldInfected = new boolean[size], newlyInfected = new boolean[size];
            for (int id = 0; id < size; id++) {
                if (next[id] != 'X') continue;
                oldInfected[id] = true;
                int r = id / width, c = id % width;
                for (int direction = 0; direction < 8; direction++) {
                    int nr = r + DR[direction], nc = c + DC[direction];
                    if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
                        int neighbor = nr * width + nc;
                        if (next[neighbor] == '.') newlyInfected[neighbor] = true;
                    }
                }
            }
            for (int id = 0; id < size; id++) {
                if (newlyInfected[id]) {
                    next[id] = 'X'; rec[id] = recoveryDays; die[id] = 0;
                }
            }

            // New infections can start a countdown before due recoveries.
            boolean[] justTriggered = new boolean[size];
            for (int id = 0; id < size; id++) {
                if (next[id] != 'X' || die[id] != 0) continue;
                int r = id / width, c = id % width, count = 0;
                for (int direction = 0; direction < 8; direction++) {
                    int nr = r + DR[direction], nc = c + DC[direction];
                    if (nr >= 0 && nr < height && nc >= 0 && nc < width
                            && next[nr * width + nc] == 'X') count++;
                }
                if (count >= deathThreshold) {
                    die[id] = recoveryDays;
                    justTriggered[id] = true;
                }
            }
            for (int id = 0; id < size; id++) {
                if (!oldInfected[id] || justTriggered[id]) continue;
                if (die[id] > 0) {
                    if (--die[id] == 0) { next[id] = 'D'; cost++; }
                } else if (--rec[id] == 0) {
                    next[id] = 'R';
                }
            }
            best = Math.min(best, cost + search(next, rec, die));
        }
        memo.put(key, best);
        return best;
    }

    public static void main(String[] args) {
        PlantInfection solver = new PlantInfection();
        // Part 1: a single-row chain advances one cell per day.
        System.out.println("P1 expected 3, actual " + solver.spreadDays(new String[]{"X..."}, 0));
        // Part 2: an immune column blocks the right side; the left side takes two days.
        System.out.println("P2 expected 2, actual " + solver.spreadDays(
            new String[]{"XI.", ".I.", ".I."}, 0));
        // Part 3: with D=1, spread precedes recovery on the same day.
        System.out.println("P3 expected 2, actual " + solver.spreadDays(new String[]{"X."}, 1));
        // Part 4: a later neighbor triggers the middle plants' deaths.
        System.out.println("P4 expected (4 days, 2 deaths), actual " + solver.simulateDeaths(
            new String[]{"XX.."}, 2, 2));
        // Part 4: an initially qualifying pair dies on day D.
        System.out.println("P4 expected (2 days, 2 deaths), actual " + solver.simulateDeaths(
            new String[]{"XX"}, 2, 1));
        // Part 5: burn one infected column before the first threshold check.
        System.out.println("P5 expected 1, actual " + solver.minDeaths(new String[]{"XX"}, 2, 1));
        // Part 5: no burn is best when the isolated plant will recover.
        System.out.println("P5 expected 0, actual " + solver.minDeaths(new String[]{"X"}, 2, 1));
    }
}
```

## Python solution

This version uses the same three public operations. Run it directly with Python 3; the tests at the bottom instantiate the class, call each method, and print the results.

```python
from collections import deque
from functools import lru_cache


class PlantInfection:
    DIRS = tuple((dr, dc) for dr in (-1, 0, 1) for dc in (-1, 0, 1)
                 if dr != 0 or dc != 0)

    def spread_days(self, grid, recovery_days=0):
        if recovery_days < 0:
            raise ValueError("Negative recovery time")
        if not grid or not grid[0]:
            return 0
        rows, cols = len(grid), len(grid[0])
        distance = [-1] * (rows * cols)
        queue = deque()
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "X":
                    cell = r * cols + c
                    distance[cell] = 0
                    queue.append(cell)
        if not queue:
            return 0

        last_infection = 0
        while queue:
            cell = queue.popleft()
            r, c = divmod(cell, cols)
            for dr, dc in self.DIRS:
                nr, nc = r + dr, c + dc
                if not (0 <= nr < rows and 0 <= nc < cols):
                    continue
                neighbor = nr * cols + nc
                if grid[nr][nc] != "." or distance[neighbor] != -1:
                    continue
                distance[neighbor] = distance[cell] + 1
                last_infection = max(last_infection, distance[neighbor])
                queue.append(neighbor)
        return last_infection + recovery_days

    def simulate_deaths(self, grid, days_to_recover, k):
        if days_to_recover < 1 or k < 0:
            raise ValueError("Invalid D or K")
        if not grid or not grid[0]:
            return (0, 0)
        rows, cols = len(grid), len(grid[0])
        size = rows * cols
        infected_day = [-1] * size
        queue = deque()
        infection_order = []
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == "X":
                    cell = r * cols + c
                    infected_day[cell] = 0
                    queue.append(cell)
                    infection_order.append(cell)
        if not queue:
            return (0, 0)

        # The first spread happens before any D >= 1 removal.
        while queue:
            cell = queue.popleft()
            r, c = divmod(cell, cols)
            for dr, dc in self.DIRS:
                nr, nc = r + dr, c + dc
                if not (0 <= nr < rows and 0 <= nc < cols):
                    continue
                neighbor = nr * cols + nc
                if grid[nr][nc] != "." or infected_day[neighbor] != -1:
                    continue
                infected_day[neighbor] = infected_day[cell] + 1
                queue.append(neighbor)
                infection_order.append(neighbor)

        infections = deque((infected_day[cell], 0, cell) for cell in infection_order)
        deaths_due = deque()
        recoveries = deque((infected_day[cell] + days_to_recover, 2, cell)
                           for cell in infection_order)
        infected = [False] * size
        neighbor_count = [0] * size
        death_day = [-1] * size
        last_change = deaths = 0

        while infections or deaths_due or recoveries:
            streams = [stream for stream in (infections, deaths_due, recoveries) if stream]
            chosen = min(streams, key=lambda stream: stream[0][:2])
            day, kind, cell = chosen.popleft()
            r, c = divmod(cell, cols)
            if kind == 0:
                infected[cell] = True
                last_change = day
                # Check this cell and every neighbor affected by the new infection.
                affected = [cell]
                for dr, dc in self.DIRS:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        neighbor = nr * cols + nc
                        neighbor_count[neighbor] += 1
                        affected.append(neighbor)
                for target in affected:
                    if infected[target] and death_day[target] == -1 \
                            and neighbor_count[target] >= k:
                        death_day[target] = day + days_to_recover
                        deaths_due.append((death_day[target], 1, target))
            elif infected[cell] and ((kind == 1 and death_day[cell] == day)
                                    or (kind == 2 and death_day[cell] == -1)):
                infected[cell] = False
                last_change = day
                if kind == 1:
                    deaths += 1
                for dr, dc in self.DIRS:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        neighbor_count[nr * cols + nc] -= 1
        return (last_change, deaths)

    def min_deaths(self, grid, days_to_recover, k):
        if days_to_recover < 1 or k < 0:
            raise ValueError("Invalid D or K")
        if not grid or not grid[0]:
            return 0
        # Zero natural deaths is an immediate optimal answer: do not burn.
        if self.simulate_deaths(grid, days_to_recover, k)[1] == 0:
            return 0
        rows, cols = len(grid), len(grid[0])
        size = rows * cols
        start = tuple("".join(grid))
        recovery = tuple(days_to_recover if cell == "X" else 0 for cell in start)
        death = (0,) * size

        @lru_cache(None)
        def search(state, remaining_recovery, remaining_death):
            if "X" not in state:
                return 0
            best = size
            for action in range(-1, rows + cols):
                current = list(state)
                rec = list(remaining_recovery)
                die = list(remaining_death)
                cost = 0
                if action >= 0:
                    for cell in range(size):
                        on_line = (cell // cols == action if action < rows
                                   else cell % cols == action - rows)
                        if on_line and current[cell] not in ("D", "B"):
                            current[cell] = "B"
                            rec[cell] = die[cell] = 0
                            cost += 1
                    if cost == 0:
                        continue
                if cost >= best:
                    continue

                # Threshold checks happen after today's optional burn.
                for cell in range(size):
                    if current[cell] != "X" or die[cell] != 0:
                        continue
                    r, c = divmod(cell, cols)
                    count = sum(0 <= r + dr < rows and 0 <= c + dc < cols
                                and current[(r + dr) * cols + c + dc] == "X"
                                for dr, dc in self.DIRS)
                    if count >= k:
                        die[cell] = days_to_recover

                old_infected = [cell == "X" for cell in current]
                newly_infected = [False] * size
                for cell, active in enumerate(old_infected):
                    if not active:
                        continue
                    r, c = divmod(cell, cols)
                    for dr, dc in self.DIRS:
                        nr, nc = r + dr, c + dc
                        if 0 <= nr < rows and 0 <= nc < cols:
                            neighbor = nr * cols + nc
                            if current[neighbor] == ".":
                                newly_infected[neighbor] = True
                for cell, new in enumerate(newly_infected):
                    if new:
                        current[cell] = "X"
                        rec[cell], die[cell] = days_to_recover, 0

                # New infections may trigger death before today's recoveries.
                just_triggered = [False] * size
                for cell in range(size):
                    if current[cell] != "X" or die[cell] != 0:
                        continue
                    r, c = divmod(cell, cols)
                    count = sum(0 <= r + dr < rows and 0 <= c + dc < cols
                                and current[(r + dr) * cols + c + dc] == "X"
                                for dr, dc in self.DIRS)
                    if count >= k:
                        die[cell] = days_to_recover
                        just_triggered[cell] = True
                for cell, old in enumerate(old_infected):
                    if not old or just_triggered[cell]:
                        continue
                    if die[cell] > 0:
                        die[cell] -= 1
                        if die[cell] == 0:
                            current[cell] = "D"
                            cost += 1
                    else:
                        rec[cell] -= 1
                        if rec[cell] == 0:
                            current[cell] = "R"
                best = min(best, cost + search(tuple(current), tuple(rec), tuple(die)))
            return best

        return search(start, recovery, death)


def main():
    solver = PlantInfection()
    # Part 1: one source in a row takes three days to reach the final cell.
    print("P1 expected 3, actual", solver.spread_days(["X..."]))
    # Part 2: an immune column blocks the right side, not the left-side spread.
    print("P2 expected 2, actual", solver.spread_days(["XI.", ".I.", ".I."]))
    # Part 3: D=1 still allows spread on the recovery day.
    print("P3 expected 2, actual", solver.spread_days(["X."], 1))
    # Part 4: threshold reached later; middle plants die on days 3 and 4.
    print("P4 expected (4, 2), actual", solver.simulate_deaths(["XX.."], 2, 2))
    # Part 4: both initial plants immediately meet K=1 and die on day 2.
    print("P4 expected (2, 2), actual", solver.simulate_deaths(["XX"], 2, 1))
    # Part 5: burning one of two infected plants saves the other from death.
    print("P5 expected 1, actual", solver.min_deaths(["XX"], 2, 1))
    # Part 5: an isolated plant recovers, so doing nothing costs zero.
    print("P5 expected 0, actual", solver.min_deaths(["X"], 2, 1))


if __name__ == "__main__":
    main()
```

## Complexity and what to clarify in the interview

Let `N = m × n`. Parts 1–3 use `O(N)` time and `O(N)` space because each cell enters BFS at most once. Part 4 has at most three events per reached cell, and each of its three queues is already date-ordered, so it also uses **`O(N)` time and `O(N)` space**. Part 5 visits `S` distinct daily states; with up to `m + n + 1` actions and an `O(N)` transition per action, it uses `O(S(m+n+1)N)` time and `O(SN)` memo space, plus the recursion stack. It is for small grids, not an unqualified large-input promise.

Three questions can materially change the answer: Does a burn itself count as a death? Is burning optional or required every day? Does the first `K` check happen before or after the first burn? The implementations make explicit, consistent choices. If burning is free removal, keep the state transition but do not add burn victims to `cost`; if a burn is mandatory, remove the no-burn action. If Part 5 is independent of recovery and the `K` rule, its state can be much smaller. State these alternatives instead of silently solving a different puzzle.
