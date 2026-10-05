---
title: "Build a Memory Allocator: First-Fit, Best-Fit, and Coalescing"
description: "Track free intervals by address and size, merge on free, and implement both allocation policies in Java and Python."
date: 2026-10-04
difficulty: hard
patterns:
  - ordered-sets
  - interval-merging
  - balanced-trees
languages:
  - java
  - python
tags:
  - data-structures
  - intervals
  - trees
  - memory-management
featured: true
draft: false
practice:
  - question: "Why can free(ptr) merge with at most two existing free intervals?"
    topic: "Coalescing"
    hint: "The free intervals are ordered, disjoint, and never adjacent before the operation."
    answer: "Only the immediate predecessor can end at ptr, and only the immediate successor can start at ptr plus the allocation size. Any other free interval is farther away, so checking those two neighbors is sufficient."
  - question: "Why does best-fit need an index other than free intervals ordered by address?"
    topic: "Indexing"
    hint: "Best-fit minimizes block size, not address."
    answer: "An address-ordered tree supports neighbor lookup but cannot directly find the smallest block whose size is at least the request. A second tree ordered by (size, start) supports that lower-bound query in logarithmic time."
  - question: "Ten bytes are free in total, but malloc(8) returns -1. Is that a bug?"
    topic: "Fragmentation"
    hint: "An allocation must occupy one contiguous interval."
    answer: "No. The ten free bytes may be split into, for example, two nonadjacent five-byte intervals. Neither one can satisfy an eight-byte contiguous request."
---

## Problem

Implement a **simulated contiguous-memory allocator** for an address range `[0, capacity)`. `malloc(size)` reserves `size` consecutive units and returns the starting address, or `-1` if no single free interval is large enough. `free(pointer)` releases exactly the allocation that started at `pointer`. Released intervals that touch must be merged. Support two policies:

- **First-fit:** choose the first sufficiently large free interval in increasing address order.
- **Best-fit:** choose the *smallest* sufficiently large free interval; break equal-size ties by lower starting address.

Allocation always takes bytes from the **front** of the chosen interval. Requests and capacity are positive integers. `malloc(0)` is invalid. Freeing an address that was never returned, is inside rather than at the start of a live allocation, or has already been freed is invalid. This class models address bookkeeping; it does not manage actual process memory or return a dereferenceable pointer.

For example, with `capacity = 20`, `malloc(6)` returns `0`, then `malloc(5)` returns `6`. Freeing `0` produces `[0,6)` and `[11,20)`. Freeing `6` then joins everything back into `[0,20)`. The final algorithm uses the input `capacity` and each requested `size`; `20`, `6`, and `5` are examples, not hardcoded rules.

## The two invariants that make it work

Keep `allocated[pointer] = size`, because `free(pointer)` otherwise has no way to know where that allocation ends. Keep free intervals as half-open ranges `[start, start + size)`, ordered by `start`. Maintain the invariant that free intervals never overlap and are **never adjacent**: if two touch, merge them immediately.

To free `[p, p + size)`, inspect only the free interval immediately before `p` and the first one after it. If the predecessor ends at `p`, remove it and extend left. If the successor starts at the released interval's end, remove it and extend right. Insert the merged interval once. Random free order does not matter; each operation re-establishes the same nonadjacent-interval invariant.

For best-fit, add a second index sorted by `(size, start)`. A lower-bound search for `(requestedSize, -1)` returns the smallest block that fits, with deterministic address tie-breaking. Whenever a block is split or merged, **remove its old entry from both indexes and insert the new entry into both**. Mutating a field that controls an ordered set's sort order while the element remains inside the set would break the index.

```text
allocated:    pointer -> requested size
byAddress:    (start, size) ordered by start  -> first-fit and neighbors
bySize:       (size, start) ordered by size   -> best-fit lower bound

malloc: choose -> remove old free block -> allocate its front -> insert remainder
free:   recover size -> remove touching neighbors -> insert merged free block
```

A tempting alternative is to represent every address as a cell in an array. That makes the 20-cell example easy, but `malloc(k)` can scan the entire capacity and freeing or inspecting individual cells scales with the address-space size rather than the number of intervals. The interval representation instead uses space proportional to the number of live allocations and free blocks. A single size heap is not enough for best-fit: a heap exposes the *smallest overall* block, not the smallest block **at least** `k`.

## Java solution

Save this as `Main.java` and run it with Java 17 or newer. Java's [`TreeMap`](https://docs.oracle.com/javase/8/docs/api/java/util/TreeMap.html) provides ordered addresses and predecessor/successor lookup; [`TreeSet`](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/TreeSet.html) provides the size-ordered lower bound. The `Block` record is immutable, so removing and re-inserting a resized block keeps both trees valid.

```java
import java.util.*;

enum Fit { FIRST, BEST }

class MemoryAllocator {
    private record Block(int start, int size) {}

    private final int capacity;
    private final Fit fit;
    private final TreeMap<Integer, Block> byAddress = new TreeMap<>();
    private final TreeSet<Block> bySize = new TreeSet<>(
            Comparator.comparingInt(Block::size).thenComparingInt(Block::start));
    private final Map<Integer, Integer> allocated = new HashMap<>();

    MemoryAllocator(int capacity, Fit fit) {
        if (capacity <= 0 || fit == null) throw new IllegalArgumentException("Invalid configuration");
        this.capacity = capacity;
        this.fit = fit;
        addFree(new Block(0, capacity));
    }

    public int malloc(int size) {
        if (size <= 0) throw new IllegalArgumentException("Size must be positive");

        // First-fit scans addresses; best-fit uses the size index's lower bound.
        Block chosen = null;
        if (fit == Fit.FIRST) {
            for (Block block : byAddress.values()) {
                if (block.size() >= size) {
                    chosen = block;
                    break;
                }
            }
        } else {
            chosen = bySize.ceiling(new Block(-1, size));
        }
        if (chosen == null) return -1;

        // Split only after removing the old block from both ordered indexes.
        removeFree(chosen);
        int pointer = chosen.start();
        int remainder = chosen.size() - size;
        if (remainder > 0) addFree(new Block(pointer + size, remainder));
        allocated.put(pointer, size);
        return pointer;
    }

    public void free(int pointer) {
        Integer size = allocated.remove(pointer);
        if (size == null) throw new IllegalArgumentException("Invalid or freed pointer");

        int start = pointer;
        int end = pointer + size;

        // Only the immediate predecessor and successor can touch this interval.
        Map.Entry<Integer, Block> left = byAddress.lowerEntry(start);
        if (left != null && left.getValue().start() + left.getValue().size() == start) {
            Block block = left.getValue();
            removeFree(block);
            start = block.start();
        }
        Map.Entry<Integer, Block> right = byAddress.ceilingEntry(start);
        if (right != null && right.getKey() == end) {
            Block block = right.getValue();
            removeFree(block);
            end += block.size();
        }
        addFree(new Block(start, end - start));
    }

    public List<String> freeRanges() {
        List<String> ranges = new ArrayList<>();
        for (Block block : byAddress.values()) {
            ranges.add("[" + block.start() + "," + (block.start() + block.size()) + ")");
        }
        return ranges;
    }

    private void addFree(Block block) {
        if (byAddress.putIfAbsent(block.start(), block) != null || !bySize.add(block)) {
            throw new IllegalStateException("Free indexes disagree");
        }
    }

    private void removeFree(Block block) {
        if (!block.equals(byAddress.remove(block.start())) || !bySize.remove(block)) {
            throw new IllegalStateException("Free indexes disagree");
        }
    }
}

public class Main {
    public static void main(String[] args) {
        // Test 1: Freeing adjacent allocations in a different order coalesces the full range.
        MemoryAllocator merging = new MemoryAllocator(20, Fit.FIRST);
        int a = merging.malloc(6), b = merging.malloc(5), c = merging.malloc(4);
        merging.free(b);
        merging.free(a);
        merging.free(c);
        System.out.println("Test 1: " + (a == 0 && b == 6 && c == 11
                && merging.freeRanges().equals(List.of("[0,20)")))); // true

        // Test 2: The same holes make first-fit choose address 4 and best-fit choose 15.
        MemoryAllocator first = new MemoryAllocator(30, Fit.FIRST);
        MemoryAllocator best = new MemoryAllocator(30, Fit.BEST);
        int[] requests = {4, 8, 3, 7, 8};
        int[] firstPointers = new int[requests.length];
        int[] bestPointers = new int[requests.length];
        for (int i = 0; i < requests.length; i++) {
            firstPointers[i] = first.malloc(requests[i]);
            bestPointers[i] = best.malloc(requests[i]);
        }
        first.free(firstPointers[1]); first.free(firstPointers[3]);
        best.free(bestPointers[1]); best.free(bestPointers[3]);
        System.out.println("Test 2: " + (first.malloc(6) == 4 && best.malloc(6) == 15)); // true

        // Test 3: Equal-size best-fit holes choose the lower starting address.
        MemoryAllocator tied = new MemoryAllocator(24, Fit.BEST);
        int t0 = tied.malloc(6), t1 = tied.malloc(6);
        int t2 = tied.malloc(6), t3 = tied.malloc(6);
        tied.free(t0); tied.free(t2);
        System.out.println("Test 3: " + (t1 == 6 && t3 == 18 && tied.malloc(5) == 0)); // true

        // Test 4: Ten free units in two separated holes cannot satisfy an eight-unit request.
        MemoryAllocator fragmented = new MemoryAllocator(20, Fit.FIRST);
        int f0 = fragmented.malloc(5); fragmented.malloc(5);
        int f2 = fragmented.malloc(5); fragmented.malloc(5);
        fragmented.free(f0); fragmented.free(f2);
        System.out.println("Test 4: " + (fragmented.malloc(8) == -1
                && fragmented.freeRanges().equals(List.of("[0,5)", "[10,15)")))); // true

        // Test 5: A second free of the same pointer is rejected.
        MemoryAllocator checked = new MemoryAllocator(10, Fit.FIRST);
        int p = checked.malloc(4);
        checked.free(p);
        boolean rejected = false;
        try { checked.free(p); } catch (IllegalArgumentException expected) { rejected = true; }
        System.out.println("Test 5: " + rejected); // true
    }
}
```

## Python solution

Python's built-in `bisect` finds an insertion position quickly, but inserting into its underlying list still takes `O(F)` time because elements move; [the Python documentation](https://docs.python.org/3/library/bisect.html) calls out that cost. To preserve logarithmic insertion, deletion, and lower-bound search without an external package, the following solution includes a small AVL ordered index. It is bookkeeping for the allocator's two trees, not five separate allocation algorithms.

```python
class _Node:
    __slots__ = ("key", "left", "right", "height")

    def __init__(self, key):
        self.key = key
        self.left = None
        self.right = None
        self.height = 1


class _AVLIndex:
    def __init__(self):
        self.root = None

    @staticmethod
    def _height(node):
        return node.height if node else 0

    def _update(self, node):
        node.height = 1 + max(self._height(node.left), self._height(node.right))

    def _rotate_left(self, node):
        parent = node.right
        node.right = parent.left
        parent.left = node
        self._update(node)
        self._update(parent)
        return parent

    def _rotate_right(self, node):
        parent = node.left
        node.left = parent.right
        parent.right = node
        self._update(node)
        self._update(parent)
        return parent

    def _balance(self, node):
        self._update(node)
        tilt = self._height(node.left) - self._height(node.right)
        if tilt > 1:
            if self._height(node.left.left) < self._height(node.left.right):
                node.left = self._rotate_left(node.left)
            return self._rotate_right(node)
        if tilt < -1:
            if self._height(node.right.right) < self._height(node.right.left):
                node.right = self._rotate_right(node.right)
            return self._rotate_left(node)
        return node

    def _insert(self, node, key):
        if node is None:
            return _Node(key)
        if key < node.key:
            node.left = self._insert(node.left, key)
        elif key > node.key:
            node.right = self._insert(node.right, key)
        else:
            raise ValueError("Duplicate free block")
        return self._balance(node)

    def _delete(self, node, key):
        if node is None:
            raise KeyError("Missing free block")
        if key < node.key:
            node.left = self._delete(node.left, key)
        elif key > node.key:
            node.right = self._delete(node.right, key)
        else:
            if node.left is None:
                return node.right
            if node.right is None:
                return node.left
            successor = node.right
            while successor.left:
                successor = successor.left
            node.key = successor.key
            node.right = self._delete(node.right, successor.key)
        return self._balance(node)

    def add(self, key):
        self.root = self._insert(self.root, key)

    def remove(self, key):
        self.root = self._delete(self.root, key)

    def lower_bound(self, key):
        node, answer = self.root, None
        while node:
            if node.key >= key:
                answer, node = node.key, node.left
            else:
                node = node.right
        return answer

    def predecessor(self, key):
        node, answer = self.root, None
        while node:
            if node.key < key:
                answer, node = node.key, node.right
            else:
                node = node.left
        return answer

    def ordered(self):
        stack, node = [], self.root
        while stack or node:
            while node:
                stack.append(node)
                node = node.left
            node = stack.pop()
            yield node.key
            node = node.right


class MemoryAllocator:
    def __init__(self, capacity, fit):
        if not isinstance(capacity, int) or capacity <= 0 or fit not in ("first", "best"):
            raise ValueError("Invalid configuration")
        self.capacity = capacity
        self.fit = fit
        self.by_address = _AVLIndex()
        self.by_size = _AVLIndex()
        self.allocated = {}
        self._add_free(0, capacity)

    def malloc(self, size):
        if not isinstance(size, int) or size <= 0:
            raise ValueError("Size must be positive")

        # First-fit scans starts; best-fit finds the first size at least size.
        if self.fit == "first":
            chosen = next((key for key in self.by_address.ordered() if key[1] >= size), None)
        else:
            entry = self.by_size.lower_bound((size, -1))
            chosen = (entry[1], entry[0]) if entry else None
        if chosen is None:
            return -1

        # Remove the original hole, allocate its front, and index the remainder.
        start, available = chosen
        self._remove_free(start, available)
        if available > size:
            self._add_free(start + size, available - size)
        self.allocated[start] = size
        return start

    def free(self, pointer):
        size = self.allocated.pop(pointer, None)
        if size is None:
            raise ValueError("Invalid or freed pointer")

        start, end = pointer, pointer + size
        left = self.by_address.predecessor((start, -1))
        if left and left[0] + left[1] == start:
            self._remove_free(*left)
            start = left[0]
        right = self.by_address.lower_bound((start, -1))
        if right and right[0] == end:
            self._remove_free(*right)
            end += right[1]
        self._add_free(start, end - start)

    def free_ranges(self):
        return [f"[{start},{start + size})" for start, size in self.by_address.ordered()]

    def _add_free(self, start, size):
        self.by_address.add((start, size))
        self.by_size.add((size, start))

    def _remove_free(self, start, size):
        self.by_address.remove((start, size))
        self.by_size.remove((size, start))


if __name__ == "__main__":
    # Test 1: Freeing adjacent allocations in a different order coalesces the full range.
    merging = MemoryAllocator(20, "first")
    a, b, c = merging.malloc(6), merging.malloc(5), merging.malloc(4)
    merging.free(b)
    merging.free(a)
    merging.free(c)
    print("Test 1:", (a, b, c) == (0, 6, 11) and merging.free_ranges() == ["[0,20)"])  # True

    # Test 2: The same holes make first-fit choose address 4 and best-fit choose 15.
    first, best = MemoryAllocator(30, "first"), MemoryAllocator(30, "best")
    requests = [4, 8, 3, 7, 8]
    first_pointers = [first.malloc(size) for size in requests]
    best_pointers = [best.malloc(size) for size in requests]
    first.free(first_pointers[1]); first.free(first_pointers[3])
    best.free(best_pointers[1]); best.free(best_pointers[3])
    print("Test 2:", first.malloc(6) == 4 and best.malloc(6) == 15)  # True

    # Test 3: Equal-size best-fit holes choose the lower starting address.
    tied = MemoryAllocator(24, "best")
    t0, t1, t2, t3 = [tied.malloc(6) for _ in range(4)]
    tied.free(t0)
    tied.free(t2)
    print("Test 3:", t1 == 6 and t3 == 18 and tied.malloc(5) == 0)  # True

    # Test 4: Ten free units in two separated holes cannot satisfy an eight-unit request.
    fragmented = MemoryAllocator(20, "first")
    f0, _, f2, _ = [fragmented.malloc(5) for _ in range(4)]
    fragmented.free(f0)
    fragmented.free(f2)
    print("Test 4:", fragmented.malloc(8) == -1
          and fragmented.free_ranges() == ["[0,5)", "[10,15)"])  # True

    # Test 5: A second free of the same pointer is rejected.
    checked = MemoryAllocator(10, "first")
    pointer = checked.malloc(4)
    checked.free(pointer)
    try:
        checked.free(pointer)
        rejected = False
    except ValueError:
        rejected = True
    print("Test 5:", rejected)  # True
```

## Complexity and trade-offs

Let `F` be the number of free intervals and `A` the number of live allocations. First-fit checks free intervals in address order, so `malloc` is **O(F)** in the worst case; splitting the chosen interval adds `O(log F)` tree maintenance. Best-fit uses the `(size, start)` lower bound, so its `malloc` is **O(log F)**. `free` locates at most two neighbors and changes a constant number of tree entries, giving **O(log F)** time. Both implementations use **O(F + A)** space. The Python AVL helper keeps ordered operations worst-case logarithmic; Java's ordered collections provide that guarantee directly. Hash-map access to `allocated` is expected O(1).

First-fit is simpler and often avoids creating tiny leftover fragments, but it can scan many holes. Best-fit searches quickly and preserves larger blocks, yet allocating seven units from an eight-unit hole leaves a one-unit sliver that may be useless. Neither policy eliminates **external fragmentation**: ten units free in separate holes cannot satisfy one eight-unit request. A production allocator may use size classes, bins, pages, or compaction, but those introduce a different contract than this interview's exact contiguous-range policy.

If the interviewer additionally requires **O(log F) first-fit**, an address-ordered balanced tree can store the maximum free-block size in each subtree. Descend left whenever its maximum fits; otherwise check the current block, then descend right. That augmentation is a valid extension, but ordinary `TreeMap` or `bisect` does not expose subtree maxima. This article keeps the dual-index solution focused on the stated first-fit and best-fit behaviors while making their different search costs explicit.
