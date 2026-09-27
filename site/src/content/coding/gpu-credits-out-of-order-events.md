---
title: "GPU Credits II: Out-of-Order Grants and Expiring Credits"
description: "Replay timestamped credit events with an expiry-ordered heap, then cache balances across a bounded time horizon. Includes tested Java and Python solutions."
date: 2026-09-27
difficulty: hard
patterns:
  - event-replay
  - min-heap
  - lazy-caching
languages:
  - java
  - python
tags:
  - heap
  - event-sourcing
  - simulation
  - caching
featured: true
draft: false
practice:
  - question: "Why can a grant received after a subtraction change the result of that earlier subtraction?"
    topic: "Event time"
    hint: "Compare the grant's start time with its API arrival time."
    answer: "Events are evaluated by their timestamps, not arrival order. A late-arriving grant whose active interval covers the subtraction time may become the earliest-expiring eligible grant, changing both the allocation and later balances."
  - question: "Why are grants removed when expirationTime <= currentTime?"
    topic: "Interval boundary"
    hint: "The active interval is half-open."
    answer: "A grant is active on [startTime, expirationTime), so it is already invalid at expirationTime. Removing it before the event at that time also subtracts its unused credits from the balance."
  - question: "Can a grant starting after an uncovered subtraction make a later balance valid?"
    topic: "Historical validity"
    hint: "Check whether the grant was active at the subtraction's own timestamp."
    answer: "No. A future-starting grant cannot cover an earlier subtraction. Only a subsequently received grant whose start time is early enough and whose expiration time is late enough can repair that historical deficit on replay."
---

## Problem

Implement a `CreditSystem` for GPU credits. A grant has a unique ID, an amount, and an active interval `[startTime, expirationTime)`: it becomes usable at `startTime` and is no longer usable at `expirationTime`. Grants may overlap.

The class supports three operations:

- `grantCredit(id, amount, startTime, expirationTime)` records a grant.
- `subtract(amount, timestamp)` records usage at a particular time. It must consume active grants in **earliest-expiration-first** order.
- `getBalance(timestamp)` returns the credits available at that time after replaying every currently known grant and usage event in chronological order. If any subtraction at or before that time could not be fully covered *at its own timestamp*, return `-1`.

Grants and subtractions can arrive in any API order. Queries can be made at any time, including an event's timestamp. No two **grant or subtraction events** have the same timestamp; queries are not subject to that restriction. In the stated problem, amounts and timestamps are in `[0, 1000]`. A query may change its answer after a late historical event arrives.

The half-open interval and historical-failure rule are important. A grant ending at time 40 contributes nothing at time 40. A grant starting at time 20 cannot rescue an uncovered subtraction at time 10, even if we query at time 50.

## Why a running balance is not enough

Suppose grant A gives five credits on `[0, 100)`, and a subtraction of three occurs at time 50. If those are the only known events, three credits come from A, leaving two at time 70. Now grant B arrives *later through the API* but was active on `[20, 60)` and gives three credits. Replaying by event time makes B the earliest-expiring grant at time 50. The subtraction now consumes B, and A still has five credits at time 70.

That is why we store the events instead of permanently deducting from grant A when `subtract` is called. A new event invalidates previous answers; a query replays the current set of known events.

## A simple replay, then the useful optimization

The straightforward solution sorts all known events on every query. Replay them through the requested timestamp with a min-heap of active grants, ordered by expiration time. At each time, first remove expired grants, then apply the grant or subtraction. This is correct, but repeated queries redo the sort and replay even when no event has changed.

The stated timestamp range is small and fixed. Let `T` be the **maximum allowed timestamp**, supplied to the class constructor; the no-argument constructor uses the problem's `T = 1000`. Store at most one event in each slot of an array of length `T + 1`. Also maintain a cached balance for every timestamp and a `dirty` flag. Adding an event writes one slot and marks the cache dirty. The next query rebuilds all balances once; later queries are O(1) until another event arrives. This is a good fit for this bounded-time problem, not a reason to allocate a billion slots if timestamps were unbounded.

During a rebuild, each heap entry contains `(expirationTime, startTime, remainingAmount)`. The earliest expiration is at the top. `startTime` is only a deterministic tie-breaker; the problem does not specify how to break equal-expiration ties. The original grant ID is retained separately to enforce uniqueness, while each replay creates fresh mutable heap entries. A cached total tracks the sum of remaining *active* credits.

For each time `t` from zero through `T`:

1. Pop every grant with `expirationTime <= t`, removing its unused amount from the total.
2. If a grant starts at `t`, add it to the heap and total. If usage occurs at `t`, first check whether the total covers it; if not, set balances from `t` onward to `-1` and stop. Otherwise, consume from the heap top until the usage is paid.
3. Store the resulting total as the balance at `t`. Thus a query at the subtraction's exact timestamp includes that subtraction.

Because events have unique timestamps, no grant and subtraction need an arbitrary within-timestamp ordering. If that constraint were removed, the API would need to define one.

### Walk through the given example

Grant A supplies three credits on `[10, 60)`. Grant B supplies two on `[20, 40)`. Usage is one at time 30 and three at time 50.

| Query time | What has happened by then | Balance |
| --- | --- | ---: |
| 10 | A starts. | 3 |
| 20 | B starts. | 5 |
| 30 | One credit is taken from B, which expires first. | 4 |
| 35 | No change. | 4 |
| 40 | B's unused one credit expires. | 3 |
| 50 | Three credits are taken from A. | 0 |

Notice that the query at time 10 remains three even after the calls for time 30 and 50 have been received: a query asks for a historical snapshot, not the current API-call state.

## Java solution

The complete program below can be saved as `Main.java`. `CreditSystem` has the three requested operations and one rebuild method; the small nested classes only represent data. Validation happens **before** the ID is reserved, so a rejected grant does not accidentally make its ID unusable.

```java
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.PriorityQueue;
import java.util.Set;

class CreditSystem {
    private static final int PROBLEM_MAX_TIMESTAMP = 1000;

    private static final class Event {
        final boolean grant;
        final int amount;
        final int expirationTime;

        Event(boolean grant, int amount, int expirationTime) {
            this.grant = grant;
            this.amount = amount;
            this.expirationTime = expirationTime;
        }
    }

    private static final class ActiveGrant {
        final int expirationTime;
        final int startTime;
        int remaining;

        ActiveGrant(int expirationTime, int startTime, int remaining) {
            this.expirationTime = expirationTime;
            this.startTime = startTime;
            this.remaining = remaining;
        }
    }

    private final int maxTimestamp;
    private final Event[] events;
    private final int[] balances;
    private final Set<String> grantIds = new HashSet<>();
    private boolean dirty = true;

    public CreditSystem() {
        this(PROBLEM_MAX_TIMESTAMP);
    }

    public CreditSystem(int maxTimestamp) {
        if (maxTimestamp < 0) throw new IllegalArgumentException("Negative time limit");
        this.maxTimestamp = maxTimestamp;
        this.events = new Event[maxTimestamp + 1];
        this.balances = new int[maxTimestamp + 1];
    }

    public void grantCredit(String id, int amount, int startTime, int expirationTime) {
        if (id == null || id.isEmpty() || amount < 0 || startTime < 0
                || startTime >= expirationTime || expirationTime > maxTimestamp
                || grantIds.contains(id) || events[startTime] != null) {
            throw new IllegalArgumentException("Invalid or duplicate grant");
        }

        // Save the immutable event; replay will create a fresh mutable heap entry.
        events[startTime] = new Event(true, amount, expirationTime);
        grantIds.add(id);
        dirty = true;
    }

    public void subtract(int amount, int timestamp) {
        if (amount < 0 || timestamp < 0 || timestamp > maxTimestamp
                || events[timestamp] != null) {
            throw new IllegalArgumentException("Invalid or duplicate usage event");
        }

        events[timestamp] = new Event(false, amount, -1);
        dirty = true;
    }

    public int getBalance(int timestamp) {
        if (timestamp < 0 || timestamp > maxTimestamp) {
            throw new IllegalArgumentException("Timestamp out of range");
        }
        if (dirty) rebuild();
        return balances[timestamp];
    }

    private void rebuild() {
        PriorityQueue<ActiveGrant> active = new PriorityQueue<>(
                Comparator.comparingInt((ActiveGrant g) -> g.expirationTime)
                        .thenComparingInt(g -> g.startTime));
        int total = 0;

        for (int time = 0; time <= maxTimestamp; time++) {
            // Expiration is exclusive; discard only the unused part.
            while (!active.isEmpty() && active.peek().expirationTime <= time) {
                total -= active.poll().remaining;
            }

            Event event = events[time];
            if (event != null && event.grant && event.amount > 0) {
                active.add(new ActiveGrant(event.expirationTime, time, event.amount));
                total += event.amount;
            } else if (event != null && !event.grant) {
                // A historical deficit invalidates this and every later timestamp.
                if (event.amount > total) {
                    Arrays.fill(balances, time, maxTimestamp + 1, -1);
                    dirty = false;
                    return;
                }

                int needed = event.amount;
                while (needed > 0) {
                    ActiveGrant grant = active.peek();
                    int taken = Math.min(needed, grant.remaining);
                    grant.remaining -= taken;
                    total -= taken;
                    needed -= taken;
                    if (grant.remaining == 0) active.poll();
                }
            }

            balances[time] = total;
        }
        dirty = false;
    }
}

public class Main {
    public static void main(String[] args) {
        // Test 1: Original example, including the half-open expiration boundary.
        CreditSystem example = new CreditSystem();
        example.grantCredit("a", 3, 10, 60);
        System.out.println("initial t=10: " + example.getBalance(10)); // 3
        example.grantCredit("b", 2, 20, 40);
        example.subtract(1, 30);
        example.subtract(3, 50);
        for (int time : new int[]{10, 20, 30, 35, 40, 50}) {
            System.out.println("t=" + time + ": " + example.getBalance(time));
        } // 3, 5, 4, 4, 3, 0

        // Test 2: A late historical grant repairs an uncovered subtraction.
        CreditSystem repaired = new CreditSystem();
        repaired.subtract(2, 30);
        System.out.println("before repair: " + repaired.getBalance(30)); // -1
        repaired.grantCredit("late", 2, 10, 40);
        System.out.println("after repair: " + repaired.getBalance(30)); // 0

        // Test 3: A late, earlier-expiring grant changes the allocation.
        CreditSystem reallocated = new CreditSystem();
        reallocated.grantCredit("long", 5, 0, 100);
        reallocated.subtract(3, 50);
        System.out.println("before reallocation: " + reallocated.getBalance(70)); // 2
        reallocated.grantCredit("short", 3, 20, 60);
        System.out.println("after reallocation: " + reallocated.getBalance(70)); // 5

        // Test 4: The ending timestamp is excluded.
        CreditSystem boundary = new CreditSystem(20);
        boundary.grantCredit("edge", 3, 10, 20);
        System.out.println("t=19: " + boundary.getBalance(19)); // 3
        System.out.println("t=20: " + boundary.getBalance(20)); // 0

        // Test 5: A grant starting after an invalid subtraction cannot fix it.
        CreditSystem tooLate = new CreditSystem();
        tooLate.subtract(1, 10);
        tooLate.grantCredit("future", 2, 20, 100);
        System.out.println("future grant: " + tooLate.getBalance(50)); // -1
    }
}
```

## Python solution

Python uses the same method names as the problem statement. A heap entry is a list so only its remaining amount changes; the two ordering fields stay fixed.

```python
import heapq


class CreditSystem:
    PROBLEM_MAX_TIMESTAMP = 1000

    def __init__(self, max_timestamp=PROBLEM_MAX_TIMESTAMP):
        if max_timestamp < 0:
            raise ValueError("Negative time limit")
        self.max_timestamp = max_timestamp
        self.events = [None] * (max_timestamp + 1)
        self.balances = [0] * (max_timestamp + 1)
        self.grant_ids = set()
        self.dirty = True

    def grantCredit(self, grant_id, amount, start_time, expiration_time):
        if (not grant_id or amount < 0 or start_time < 0
                or start_time >= expiration_time
                or expiration_time > self.max_timestamp
                or grant_id in self.grant_ids
                or self.events[start_time] is not None):
            raise ValueError("Invalid or duplicate grant")

        # Keep original events unchanged; replay creates new heap entries.
        self.events[start_time] = ("grant", amount, expiration_time)
        self.grant_ids.add(grant_id)
        self.dirty = True

    def subtract(self, amount, timestamp):
        if (amount < 0 or timestamp < 0 or timestamp > self.max_timestamp
                or self.events[timestamp] is not None):
            raise ValueError("Invalid or duplicate usage event")

        self.events[timestamp] = ("usage", amount, None)
        self.dirty = True

    def getBalance(self, timestamp):
        if timestamp < 0 or timestamp > self.max_timestamp:
            raise ValueError("Timestamp out of range")
        if self.dirty:
            self._rebuild()
        return self.balances[timestamp]

    def _rebuild(self):
        active = []  # [expiration_time, start_time, remaining_amount]
        total = 0

        for time in range(self.max_timestamp + 1):
            # The expiration timestamp is not part of the grant's interval.
            while active and active[0][0] <= time:
                total -= heapq.heappop(active)[2]

            event = self.events[time]
            if event is not None and event[0] == "grant" and event[1] > 0:
                heapq.heappush(active, [event[2], time, event[1]])
                total += event[1]
            elif event is not None and event[0] == "usage":
                # Do not partially apply an impossible historical usage.
                if event[1] > total:
                    self.balances[time:] = [-1] * (self.max_timestamp - time + 1)
                    self.dirty = False
                    return

                needed = event[1]
                while needed > 0:
                    grant = active[0]
                    taken = min(needed, grant[2])
                    grant[2] -= taken
                    total -= taken
                    needed -= taken
                    if grant[2] == 0:
                        heapq.heappop(active)

            self.balances[time] = total
        self.dirty = False


if __name__ == "__main__":
    # Test 1: Original example, including the half-open expiration boundary.
    example = CreditSystem()
    example.grantCredit("a", 3, 10, 60)
    print("initial t=10:", example.getBalance(10))  # 3
    example.grantCredit("b", 2, 20, 40)
    example.subtract(1, 30)
    example.subtract(3, 50)
    for time in (10, 20, 30, 35, 40, 50):
        print(f"t={time}: {example.getBalance(time)}")
    # Expected balances: 3, 5, 4, 4, 3, 0

    # Test 2: A late historical grant repairs an uncovered subtraction.
    repaired = CreditSystem()
    repaired.subtract(2, 30)
    print("before repair:", repaired.getBalance(30))  # -1
    repaired.grantCredit("late", 2, 10, 40)
    print("after repair:", repaired.getBalance(30))  # 0

    # Test 3: A late, earlier-expiring grant changes the allocation.
    reallocated = CreditSystem()
    reallocated.grantCredit("long", 5, 0, 100)
    reallocated.subtract(3, 50)
    print("before reallocation:", reallocated.getBalance(70))  # 2
    reallocated.grantCredit("short", 3, 20, 60)
    print("after reallocation:", reallocated.getBalance(70))  # 5

    # Test 4: The ending timestamp is excluded.
    boundary = CreditSystem(20)
    boundary.grantCredit("edge", 3, 10, 20)
    print("t=19:", boundary.getBalance(19))  # 3
    print("t=20:", boundary.getBalance(20))  # 0

    # Test 5: A grant starting after an invalid subtraction cannot fix it.
    too_late = CreditSystem()
    too_late.subtract(1, 10)
    too_late.grantCredit("future", 2, 20, 100)
    print("future grant:", too_late.getBalance(50))  # -1
```

Both programs print the same results:

```text
initial t=10: 3
t=10: 3
t=20: 5
t=30: 4
t=35: 4
t=40: 3
t=50: 0
before repair: -1
after repair: 0
before reallocation: 2
after reallocation: 5
t=19: 3
t=20: 0
future grant: -1
```

## Why the algorithm is correct

Immediately before processing time `t`, every positive-remaining grant in the heap started earlier and has not expired: expired grants are removed first, and grants from later timestamps have not been inserted. Adding the event at `t` preserves this invariant. The cached total is exactly the sum of the heap entries' remaining amounts.

For a subtraction, the heap top has the earliest expiration among eligible grants. Taking from it until it is empty, then repeating, follows the required priority rule. If the total is smaller than the requested amount, no allocation across those same grants could cover the subtraction. Every balance from `t` onward is therefore `-1` for the *current* event set. A newly received historical event marks the cache dirty and causes a fresh replay, so an earlier grant can still repair that result.

## Complexity and limits

Let `T` be the maximum timestamp, `E` the number of recorded grant and subtraction events, and `G` the maximum number of simultaneously active grants.

| Operation | Time | Why |
| --- | --- | --- |
| `grantCredit`, `subtract` | O(1) average | Array write; grant-ID hash lookup is expected O(1). |
| `getBalance` with a clean cache | O(1) | One array lookup. |
| First `getBalance` after a new event | O(T + E log(G + 1)) | Sweep `T + 1` times; each grant enters and leaves the heap at most once. |
| Space | O(T + E + G) | Timeline and balance arrays, grant-ID set, and replay heap. |

The heap work across one rebuild is bounded even if a single subtraction consumes several grants: every fully consumed grant is popped only once, and at most one grant is partially consumed per subtraction. Because the problem forbids two events at the same timestamp, `E <= T + 1`. With the stated `T = 1000`, the full rebuild is small; repeated queries between updates are constant-time. If almost every call is an update followed by one query, the rebuild cost is paid repeatedly—there is no free O(1) historical update when an old event can change later allocations.

For a large or sparse timestamp domain, replace the dense event array with an ordered map and replay only event times through the requested query. That trades the fixed-horizon O(1) cache lookup for a different memory/query balance. The expiry-ordered heap and correctness argument remain the same.
