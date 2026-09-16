---
title: "LRU Cache"
description: "Implementation, complexity analysis, and common interview follow-ups."
date: 2026-09-15
difficulty: medium
patterns:
  - hash-map
  - doubly-linked-list
languages:
  - python
  - java
tags:
  - data-structures
  - cache
featured: false
draft: false
practice:
  - question: "Which two data structures are needed to make both get and put O(1), and what does each one provide?"
    hint: "One structure finds an entry immediately; the other changes recency order immediately."
    answer: "Use a hash map from key to node for O(1) lookup and a doubly linked list for O(1) removal, insertion, and eviction-order maintenance."
  - question: "What exact operations happen when get finds an existing key?"
    hint: "A successful read also changes recency."
    answer: "Look up the node in the hash map, unlink it from its current list position, insert it at the most-recently-used end, and return its value. Each step is O(1)."
  - question: "When capacity is exceeded after inserting a new key, how is the evicted entry removed consistently?"
    hint: "The map and linked list must be updated together."
    answer: "Remove the node at the least-recently-used end of the list, then delete that node's key from the hash map. Sentinel head and tail nodes make the boundary operations uniform."
---

# Problem

Design a data structure that supports `get(key)` and `put(key, value)` in O(1) time, with a
fixed capacity that evicts the **least recently used** entry when it's full.

# Key Insight

O(1) `get` needs a hash map (key → node). O(1) eviction of the least-recently-used entry needs
a structure that can move an arbitrary node to the "most recent" end in O(1) — a doubly linked
list does that, because removing and re-inserting a node only touches its neighbors.

Combine both: a hash map from key to a node in a doubly linked list, ordered by recency.

# Approach

1. Maintain a doubly linked list with `head` (most recently used) and `tail` (least recently
   used) sentinel nodes.
2. Maintain a hash map from key → list node.
3. `get(key)`: if present, unlink the node and re-insert it at the head, return its value.
4. `put(key, value)`: if the key exists, update its value and move it to the head. Otherwise
   insert a new node at the head; if capacity is exceeded, remove the node just before the
   tail sentinel and delete it from the map.

# Complexity

- Time: O(1) for both `get` and `put`.
- Space: O(capacity) for the map and the linked list nodes.

# Implementation

```python
class Node:
    def __init__(self, key=0, value=0):
        self.key = key
        self.value = value
        self.prev = None
        self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node: Node) -> None:
        node.prev.next = node.next
        node.next.prev = node.prev

    def _insert_at_head(self, node: Node) -> None:
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._insert_at_head(node)
        return node.value

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self._remove(self.cache[key])

        node = Node(key, value)
        self.cache[key] = node
        self._insert_at_head(node)

        if len(self.cache) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]
```

# Walkthrough

For `capacity = 2`: `put(1, 1)`, `put(2, 2)`, `get(1)` → `1` (moves key 1 to the head),
`put(3, 3)` evicts key 2 (now the least recently used), `get(2)` → `-1`.

# Edge Cases

- `capacity == 0`: every `put` should immediately be a no-op or evict itself; guard for this.
- Updating an existing key's value should still mark it as most recently used.
- Repeated `get` calls on the same key should not affect other keys' order.

# Alternative Solutions

- Language built-ins: Python's `OrderedDict` supports `move_to_end` and `popitem(last=False)`,
  giving O(1) operations with far less code — good to mention, but interviewers usually want
  the hash map + linked list approach to confirm you understand *why* it's O(1).

# Interview Follow-ups

- How would you make this thread-safe?
- How would you implement an LFU (least-frequently-used) cache instead?
- How would you shard this cache across multiple machines?
