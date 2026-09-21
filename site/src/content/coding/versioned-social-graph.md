---
title: "Design a Versioned Social Graph with Snapshots"
description: "Use logical time and edge-activity intervals to support O(1) snapshots, historical following queries, friend recommendations, and snapshot diffs."
date: 2026-09-21
difficulty: hard
patterns:
  - temporal-graph
  - interval-history
  - binary-search
languages:
  - java
  - python
tags:
  - graph
  - binary-search
  - data-structures
  - versioning
featured: true
draft: false
practice:
  - question: "Why is copying the whole graph on every snapshot not scalable, and what replaces the copy?"
    topic: "Snapshot Design"
    hint: "Separate state changes from the act of naming a version."
    answer: "A full copy costs O(E) time and space per snapshot. Instead, each successful follow or unfollow advances a logical clock, every edge stores the intervals in which it is active, and a snapshot stores only the current clock in O(1)."
  - question: "Why is an edge active at time T when start <= T < end rather than start <= T <= end?"
    topic: "Interval Boundaries"
    hint: "Consider a snapshot taken immediately after an unfollow."
    answer: "The unfollow operation closes the interval at its logical time. A half-open interval makes the edge active at its follow time but already inactive at its unfollow time, with no ambiguous boundary."
  - question: "What data must a recommendation query use to avoid mixing present and historical state?"
    topic: "Historical Queries"
    hint: "Every graph lookup needs the same version."
    answer: "Both the user's direct following set and every friend's outgoing set must be queried with the requested snapshot ID. Reading currentFollowing anywhere in the recommendation would mix the present graph into a historical result."
  - question: "What are the update, snapshot, and historical-following complexities?"
    topic: "Complexity"
    hint: "Let d be the number of distinct historical outgoing neighbors and k the maximum number of active intervals for one edge."
    answer: "Follow and unfollow are O(1) amortized, snapshot is O(1), and a historical following query is O(d log k), plus the cost of producing or sorting its result."
---

## Problem statement (English translation)

Design a social graph that supports the following operations:

1. `follow(A, B)` and `unfollow(A, B)` update a directed relationship from `A` to `B`.
2. `snapshot()` returns an ID representing the graph at that moment.
3. `getFollowing(snapshotId, user)` returns everyone that `user` followed in that snapshot.
4. `recommend(snapshotId, user, limit)` recommends friends of friends. Exclude the user and people already followed, rank by mutual-friend count descending, and break ties by user ID ascending.
5. `diff(oldSnapshotId, newSnapshotId, user)` reports which outgoing relationships were added and removed.

This article treats a follow as a **directed edge**. If the interviewer defines friendship as mutual, call the same update in both directions; the snapshot design does not change.

## The key observation

The obvious solution deep-copies the graph whenever `snapshot()` is called. It is easy to implement, but for `E` edges and `S` snapshots it costs:

- O(E) time per snapshot
- O(S × E) total snapshot space

That is wasteful because most snapshots differ by only a few edges.

Instead, maintain a monotonically increasing logical clock. Only a successful `follow` or `unfollow` advances the clock. A snapshot does not change the graph; it stores the current clock and returns its position in the snapshot list.

Each edge stores the time intervals during which it existed. If `A` follows `B` at time 1, unfollows at time 5, and follows again at time 8, its history is:

```text
A -> B: [1, 5), [8, infinity)
```

At time `T`, the edge is active when `start <= T < end`. The half-open boundary matters: at the exact logical time of an unfollow, the edge must already be inactive.

If an interview explicitly guarantees a tiny fixed universe—such as three users or five slots—copying a small adjacency matrix may be a reasonable shortcut. The general solution should not depend on those numbers, so the implementations below accept arbitrary user IDs, any number of snapshots, and a caller-provided recommendation limit.

## Data structures

```text
currentFollowing[A] = users currently followed by A

history[A][B] = sorted active intervals for edge A -> B

snapshotTimes[snapshotId] = logical time captured by that snapshot
```

`currentFollowing` makes duplicate follows and invalid unfollows O(1) no-ops. `history` preserves every version. Because intervals for one edge are appended in time order, binary search finds the last interval whose start is no later than the snapshot time.

## How each query works

### Historical following

Convert `snapshotId` to logical time `T`. For every user that the source has ever followed, binary-search that edge's interval list and keep it if the matching interval contains `T`.

### Friend recommendation

Read the user's direct following set at the requested snapshot. For every direct friend, read that friend's following set at the **same snapshot**. Count how many direct friends lead to each candidate, excluding the user and existing direct relationships. Finally sort by score descending and user ID ascending.

The common bug is consulting the current graph while answering a historical recommendation. Every lookup in the traversal must carry the same snapshot ID.

### Snapshot diff

Read the user's following set at both snapshots:

```text
added   = newFollowing - oldFollowing
removed = oldFollowing - newFollowing
```

## Java solution

The implementation below uses Java 17 records only for the two result types. All graph operations remain inside one class.

```java
import java.util.*;

public class VersionedSocialGraph {
    private static final long OPEN = Long.MAX_VALUE;

    private long clock = 0;
    private final List<Long> snapshotTimes = new ArrayList<>();
    private final Map<String, Set<String>> currentFollowing = new HashMap<>();
    private final Map<String, Map<String, List<Interval>>> history = new HashMap<>();

    private static final class Interval {
        final long start;
        long end;

        Interval(long start, long end) {
            this.start = start;
            this.end = end;
        }
    }

    public record Recommendation(String user, int mutualCount) {
        @Override
        public String toString() {
            return user + "(" + mutualCount + ")";
        }
    }

    public record FriendDiff(Set<String> added, Set<String> removed) {
        @Override
        public String toString() {
            return "added=" + added + ", removed=" + removed;
        }
    }

    public void follow(String follower, String followee) {
        checkUser(follower);
        checkUser(followee);

        // Ignore self-follow and duplicate follow operations.
        Set<String> following = currentFollowing.computeIfAbsent(
                follower, ignored -> new HashSet<>());
        if (follower.equals(followee) || following.contains(followee)) {
            return;
        }

        // Open a new active interval for this directed edge.
        clock++;
        following.add(followee);
        history.computeIfAbsent(follower, ignored -> new HashMap<>())
                .computeIfAbsent(followee, ignored -> new ArrayList<>())
                .add(new Interval(clock, OPEN));
    }

    public void unfollow(String follower, String followee) {
        checkUser(follower);
        checkUser(followee);

        // An absent edge is a no-op and must not advance logical time.
        Set<String> following = currentFollowing.get(follower);
        if (following == null || !following.remove(followee)) {
            return;
        }

        // Close the currently open interval at the new logical time.
        clock++;
        List<Interval> intervals = history.get(follower).get(followee);
        intervals.get(intervals.size() - 1).end = clock;
    }

    public int snapshot() {
        snapshotTimes.add(clock);
        return snapshotTimes.size() - 1;
    }

    public Set<String> getFollowing(int snapshotId, String user) {
        checkUser(user);
        if (snapshotId < 0 || snapshotId >= snapshotTimes.size()) {
            throw new IllegalArgumentException("Invalid snapshot id: " + snapshotId);
        }

        // Check each distinct historical outgoing edge at this snapshot time.
        long time = snapshotTimes.get(snapshotId);
        Set<String> result = new TreeSet<>();
        Map<String, List<Interval>> outgoing = history.get(user);
        if (outgoing == null) {
            return result;
        }

        for (Map.Entry<String, List<Interval>> edge : outgoing.entrySet()) {
            if (isActiveAt(edge.getValue(), time)) {
                result.add(edge.getKey());
            }
        }
        return result;
    }

    public List<Recommendation> recommend(int snapshotId, String user, int limit) {
        checkUser(user);
        if (limit < 0) {
            throw new IllegalArgumentException("Limit cannot be negative");
        }

        // Count how many direct friends lead to each eligible candidate.
        Set<String> direct = getFollowing(snapshotId, user);
        Map<String, Integer> scores = new HashMap<>();
        for (String friend : direct) {
            for (String candidate : getFollowing(snapshotId, friend)) {
                if (!candidate.equals(user) && !direct.contains(candidate)) {
                    scores.merge(candidate, 1, Integer::sum);
                }
            }
        }

        // Rank by mutual count descending, then user ID ascending.
        List<Recommendation> result = new ArrayList<>();
        scores.forEach((candidate, score) ->
                result.add(new Recommendation(candidate, score)));
        result.sort(Comparator.comparingInt(Recommendation::mutualCount)
                .reversed()
                .thenComparing(Recommendation::user));

        return new ArrayList<>(result.subList(0, Math.min(limit, result.size())));
    }

    public FriendDiff diff(int oldSnapshotId, int newSnapshotId, String user) {
        Set<String> oldFollowing = getFollowing(oldSnapshotId, user);
        Set<String> newFollowing = getFollowing(newSnapshotId, user);

        // Set difference gives the two directions of change.
        Set<String> added = new TreeSet<>(newFollowing);
        added.removeAll(oldFollowing);
        Set<String> removed = new TreeSet<>(oldFollowing);
        removed.removeAll(newFollowing);
        return new FriendDiff(
                Collections.unmodifiableSet(added),
                Collections.unmodifiableSet(removed));
    }

    private boolean isActiveAt(List<Interval> intervals, long time) {
        int left = 0;
        int right = intervals.size() - 1;
        int candidate = -1;

        // Find the final interval whose start is no later than time.
        while (left <= right) {
            int middle = left + (right - left) / 2;
            if (intervals.get(middle).start <= time) {
                candidate = middle;
                left = middle + 1;
            } else {
                right = middle - 1;
            }
        }
        return candidate >= 0 && time < intervals.get(candidate).end;
    }

    private void checkUser(String user) {
        if (user == null || user.isBlank()) {
            throw new IllegalArgumentException("User cannot be null or blank");
        }
    }

    public static void main(String[] args) {
        VersionedSocialGraph graph = new VersionedSocialGraph();

        graph.follow("Alice", "Bob");
        graph.follow("Alice", "Carol");
        graph.follow("Bob", "Dave");
        graph.follow("Bob", "Erin");
        graph.follow("Bob", "Alice");
        graph.follow("Bob", "Carol");
        graph.follow("Carol", "Dave");
        graph.follow("Carol", "Frank");
        graph.follow("Carol", "Alice");
        int first = graph.snapshot();

        // Test 1: Read the directed following set at the first snapshot.
        System.out.println("Test 1 following: "
                + graph.getFollowing(first, "Alice"));
        // Expected: [Bob, Carol]

        // Test 2: Rank candidates by mutual count, then alphabetically.
        System.out.println("Test 2 recommendations: "
                + graph.recommend(first, "Alice", 10));
        // Expected: [Dave(2), Erin(1), Frank(1)]

        graph.unfollow("Alice", "Carol");
        graph.follow("Alice", "Grace");
        int second = graph.snapshot();

        // Test 3: Later updates do not mutate the old snapshot.
        System.out.println("Test 3 old snapshot: "
                + graph.getFollowing(first, "Alice"));
        // Expected: [Bob, Carol]

        // Test 4: The new snapshot reflects both removal and addition.
        System.out.println("Test 4 new snapshot: "
                + graph.getFollowing(second, "Alice"));
        // Expected: [Bob, Grace]

        // Test 5: Diff reports only changed relationships.
        System.out.println("Test 5 diff: "
                + graph.diff(first, second, "Alice"));
        // Expected: added=[Grace], removed=[Carol]

        graph.follow("Alice", "Carol");
        int third = graph.snapshot();

        // Test 6: Re-follow creates a new interval without changing history.
        System.out.println("Test 6 re-follow: "
                + graph.diff(second, third, "Alice"));
        // Expected: added=[Carol], removed=[]
    }
}
```

## Python solution

The Python version uses the same model and the same asymptotic behavior. Lists hold intervals as mutable `[start, end]` pairs so an unfollow can close the most recent interval in O(1).

```python
from collections import defaultdict
from math import inf


class VersionedSocialGraph:
    def __init__(self):
        self.clock = 0
        self.snapshot_times = []
        self.current_following = defaultdict(set)
        self.history = defaultdict(lambda: defaultdict(list))

    def follow(self, follower: str, followee: str) -> None:
        self._check_user(follower)
        self._check_user(followee)

        # Ignore self-follow and duplicate follow operations.
        if follower == followee or followee in self.current_following[follower]:
            return

        # Open a new active interval for this directed edge.
        self.clock += 1
        self.current_following[follower].add(followee)
        self.history[follower][followee].append([self.clock, inf])

    def unfollow(self, follower: str, followee: str) -> None:
        self._check_user(follower)
        self._check_user(followee)

        # An absent edge is a no-op and must not advance logical time.
        if followee not in self.current_following.get(follower, set()):
            return

        # Close the currently open interval at the new logical time.
        self.clock += 1
        self.current_following[follower].remove(followee)
        self.history[follower][followee][-1][1] = self.clock

    def snapshot(self) -> int:
        self.snapshot_times.append(self.clock)
        return len(self.snapshot_times) - 1

    def get_following(self, snapshot_id: int, user: str) -> list[str]:
        self._check_user(user)
        if snapshot_id < 0 or snapshot_id >= len(self.snapshot_times):
            raise ValueError(f"Invalid snapshot id: {snapshot_id}")

        # Check each distinct historical outgoing edge at this snapshot time.
        time = self.snapshot_times[snapshot_id]
        result = []
        for followee, intervals in self.history.get(user, {}).items():
            if self._is_active_at(intervals, time):
                result.append(followee)
        return sorted(result)

    def recommend(self, snapshot_id: int, user: str, limit: int) -> list[tuple[str, int]]:
        self._check_user(user)
        if limit < 0:
            raise ValueError("Limit cannot be negative")

        # Count how many direct friends lead to each eligible candidate.
        direct = set(self.get_following(snapshot_id, user))
        scores = defaultdict(int)
        for friend in direct:
            for candidate in self.get_following(snapshot_id, friend):
                if candidate != user and candidate not in direct:
                    scores[candidate] += 1

        # Rank by mutual count descending, then user ID ascending.
        ranked = sorted(scores.items(), key=lambda item: (-item[1], item[0]))
        return ranked[:limit]

    def diff(self, old_snapshot_id: int, new_snapshot_id: int, user: str) -> dict:
        old_following = set(self.get_following(old_snapshot_id, user))
        new_following = set(self.get_following(new_snapshot_id, user))

        # Set difference gives the two directions of change.
        return {
            "added": sorted(new_following - old_following),
            "removed": sorted(old_following - new_following),
        }

    def _is_active_at(self, intervals: list[list[float]], time: int) -> bool:
        left, right, candidate = 0, len(intervals) - 1, -1

        # Find the final interval whose start is no later than time.
        while left <= right:
            middle = left + (right - left) // 2
            if intervals[middle][0] <= time:
                candidate = middle
                left = middle + 1
            else:
                right = middle - 1
        return candidate >= 0 and time < intervals[candidate][1]

    @staticmethod
    def _check_user(user: str) -> None:
        if not isinstance(user, str) or not user.strip():
            raise ValueError("User cannot be null or blank")


if __name__ == "__main__":
    graph = VersionedSocialGraph()

    graph.follow("Alice", "Bob")
    graph.follow("Alice", "Carol")
    graph.follow("Bob", "Dave")
    graph.follow("Bob", "Erin")
    graph.follow("Bob", "Alice")
    graph.follow("Bob", "Carol")
    graph.follow("Carol", "Dave")
    graph.follow("Carol", "Frank")
    graph.follow("Carol", "Alice")
    first = graph.snapshot()

    # Test 1: Read the directed following set at the first snapshot.
    print("Test 1 following:", graph.get_following(first, "Alice"))
    # Expected: ['Bob', 'Carol']

    # Test 2: Rank candidates by mutual count, then alphabetically.
    print("Test 2 recommendations:", graph.recommend(first, "Alice", 10))
    # Expected: [('Dave', 2), ('Erin', 1), ('Frank', 1)]

    graph.unfollow("Alice", "Carol")
    graph.follow("Alice", "Grace")
    second = graph.snapshot()

    # Test 3: Later updates do not mutate the old snapshot.
    print("Test 3 old snapshot:", graph.get_following(first, "Alice"))
    # Expected: ['Bob', 'Carol']

    # Test 4: The new snapshot reflects both removal and addition.
    print("Test 4 new snapshot:", graph.get_following(second, "Alice"))
    # Expected: ['Bob', 'Grace']

    # Test 5: Diff reports only changed relationships.
    print("Test 5 diff:", graph.diff(first, second, "Alice"))
    # Expected: {'added': ['Grace'], 'removed': ['Carol']}

    graph.follow("Alice", "Carol")
    third = graph.snapshot()

    # Test 6: Re-follow creates a new interval without changing history.
    print("Test 6 re-follow:", graph.diff(second, third, "Alice"))
    # Expected: {'added': ['Carol'], 'removed': []}
```

## Complexity analysis

Let:

- `d(u)` be the number of distinct users that `u` has ever followed
- `k` be the maximum number of active intervals stored for one edge
- `F` be the number of direct friends in the requested snapshot
- `C` be the number of recommendation candidates
- `M` be the number of successful follow operations
- `S` be the number of snapshots

| Operation | Time | Why |
|---|---:|---|
| `follow` | O(1) amortized | Hash lookup, set insertion, and one interval append |
| `unfollow` | O(1) amortized | Hash lookup, set removal, and closing the final interval |
| `snapshot` | O(1) | Append one logical timestamp |
| `getFollowing` | O(d(u) log k) plus output ordering | Inspect each historical outgoing edge and binary-search its intervals |
| `recommend` | O(sum of historical degrees visited + C log C) | Traverse friends of friends, count candidates, then sort them |
| `diff` | Cost of two historical queries plus set difference | Compare the two materialized following sets |

The total storage is O(M + S): one interval is created for each successful follow, and each snapshot stores one timestamp. The current graph and history indexes fit within the same bound.

## Edge cases to mention

- Duplicate `follow` and missing-edge `unfollow` operations are no-ops; they do not advance time.
- Two consecutive snapshots may map to the same logical time and correctly represent identical graphs.
- Re-following after an unfollow opens a new interval instead of overwriting history.
- Self-follow is ignored.
- Unknown users return an empty following set, while unknown snapshot IDs are invalid input.
- A recommendation must use the requested snapshot for every hop.

## Interview summary

The strongest explanation is short:

> I would not copy the graph at each snapshot. Every successful update advances a logical clock, and each directed edge stores the intervals during which it is active. A snapshot records only the current clock, so it is O(1). Historical following queries binary-search edge intervals; recommendation and diff are then built on top of that version-aware query.
