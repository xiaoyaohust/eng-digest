---
title: "Build a Text Editor: Undo, Autocomplete, and Collaboration"
description: "An interview walkthrough from a mutable text buffer to reversible edits, a live prefix index, and convergent collaborative editing."
date: 2026-09-23
difficulty: hard
patterns:
  - text-buffer
  - undo-redo
  - trie
  - crdt
languages:
  - java
  - python
tags:
  - data-structures
  - trie
  - undo-redo
  - distributed-systems
featured: false
draft: false
---

## Problem statement (English translation)

Design a text editor in four stages:

1. Support `insert(position, text)`, `delete(start, end)`, and `get_text()`.
2. Add `undo()` and `redo()`. A new edit after an undo discards the redo branch. History should be efficient; do not copy the whole document after every edit.
3. Add `suggest(prefix, k)`: return up to `k` lowercase words beginning with `prefix`, ranked by frequency. Insertions, deletions, undo, and redo must update suggestions.
4. Explain how multiple users can edit concurrently, receive operations out of order, resolve conflicts, and eventually see the same text.

We use zero-based offsets and half-open deletion ranges: `delete(start, end)` removes `[start, end)`. `get_text()` and `suggest()` are queries; only edits enter undo history. Empty edits do nothing. Invalid offsets raise an exception.

**Frequency needs a precise definition.** “Number of insertions” could mean historical insertion events, but the requirement that deletion changes frequency points to a different interpretation. Here it means the number of **whole-word occurrences currently present in the document**. Words are maximal runs of `[a-z]`; other characters are separators. Thus inserting `s` after `cat` changes the index from `cat: 1` to `cats: 1`. If the interviewer truly wants lifetime insertion-event counts, record those events instead; do not decrement them on deletion. The rest of this solution uses the live-document interpretation consistently.

## The interview strategy

For an ordinary interview-sized buffer, use `StringBuilder` in Java or a character list in Python. Middle edits shift characters, so they cost O(n), but the code stays small enough to make undo and indexing correct. If requirements specify a huge document with frequent arbitrary-position edits, replace the buffer with a balanced rope or piece tree. That is a different engineering trade-off, not a reason to hand-write a balanced tree before the problem has established that scale.

The useful abstraction is a **replacement edit**:

```text
Edit(position, before, after)

insert(p, "abc")  = Edit(p, "", "abc")
delete(p, p + 3)  = Edit(p, "abc", "")
undo(Edit(p, a, b)) applies Edit(p, b, a)
```

Store the edit, not a snapshot. Normal edits go onto the undo stack and clear redo. Undo applies the inverse and moves the original edit to redo; redo reapplies it and moves it back. The apply routine does **not** change either stack, preventing undo from accidentally creating a new user edit.

For autocomplete, keep a trie with the frequency only at each complete-word node. A query walks the prefix in O(|prefix|), explores that subtree, and keeps only the best `k` words in a heap. We rank by frequency descending, then word ascending for deterministic ties. Caching a top-k list at every trie node can speed up read-heavy workloads, but makes every edit update many cached lists; the basic trie is the better starting point when the read/write ratio is unspecified.

### The boundary bug to catch

It is **not** enough to count words inside the inserted or deleted string. Deleting the space in `hello world` creates `helloworld`; inserting `s` at the end of `cat` creates `cats`. Before each edit, extend its two ends over adjacent lowercase letters. Remove all words in that old local window from the trie, apply the replacement, then add all words in the new local window. The rest of the document cannot change its word boundaries, so no full-document reindex is needed.

## Java solution

The code is a single class; `Edit` and `TrieNode` are small data holders. The same `apply` method handles normal edits, undo, and redo. Save it as `TextEditor.java` and run `javac TextEditor.java && java TextEditor`.

```java
import java.util.*;
import java.util.regex.*;

public class TextEditor {
    private final StringBuilder text = new StringBuilder();
    private final Deque<Edit> undo = new ArrayDeque<>();
    private final Deque<Edit> redo = new ArrayDeque<>();
    private final TrieNode root = new TrieNode();
    private static final Pattern WORD = Pattern.compile("[a-z]+");

    private static class Edit {
        final int position;
        final String before, after;
        Edit(int position, String before, String after) {
            this.position = position;
            this.before = before;
            this.after = after;
        }
    }

    private static class TrieNode {
        final Map<Character, TrieNode> children = new HashMap<>();
        int frequency;
        String word;
    }

    private static class Candidate {
        final String word;
        final int frequency;
        Candidate(String word, int frequency) {
            this.word = word;
            this.frequency = frequency;
        }
    }

    public void insert(int position, String value) {
        Objects.requireNonNull(value);
        if (position < 0 || position > text.length()) throw new IllegalArgumentException("Invalid position");
        if (value.isEmpty()) return;
        Edit edit = new Edit(position, "", value);
        apply(edit);
        undo.push(edit);
        redo.clear();
    }

    public void delete(int start, int end) {
        if (start < 0 || end < start || end > text.length()) throw new IllegalArgumentException("Invalid range");
        if (start == end) return;
        Edit edit = new Edit(start, text.substring(start, end), "");
        apply(edit);
        undo.push(edit);
        redo.clear();
    }

    public boolean undo() {
        if (undo.isEmpty()) return false;
        Edit edit = undo.pop();
        apply(new Edit(edit.position, edit.after, edit.before));
        redo.push(edit);
        return true;
    }

    public boolean redo() {
        if (redo.isEmpty()) return false;
        Edit edit = redo.pop();
        apply(edit);
        undo.push(edit);
        return true;
    }

    public String getText() {
        return text.toString();
    }

    public List<String> suggest(String prefix, int k) {
        Objects.requireNonNull(prefix);
        if (k <= 0) return List.of();
        for (int i = 0; i < prefix.length(); i++) {
            char c = prefix.charAt(i);
            if (c < 'a' || c > 'z') throw new IllegalArgumentException("Prefix must be lowercase a-z");
        }

        TrieNode node = root;
        for (char c : prefix.toCharArray()) {
            node = node.children.get(c);
            if (node == null) return List.of();
        }

        // The worst candidate is removed first: low frequency, then later alphabetically.
        PriorityQueue<Candidate> best = new PriorityQueue<>((a, b) -> {
            int byFrequency = Integer.compare(a.frequency, b.frequency);
            return byFrequency != 0 ? byFrequency : b.word.compareTo(a.word);
        });
        Deque<TrieNode> pending = new ArrayDeque<>();
        pending.push(node);
        while (!pending.isEmpty()) {
            TrieNode current = pending.pop();
            if (current.frequency > 0) {
                best.add(new Candidate(current.word, current.frequency));
                if (best.size() > k) best.poll();
            }
            for (TrieNode child : current.children.values()) {
                pending.push(child);
            }
        }
        List<Candidate> ranked = new ArrayList<>(best);
        ranked.sort((a, b) -> {
            int byFrequency = Integer.compare(b.frequency, a.frequency);
            return byFrequency != 0 ? byFrequency : a.word.compareTo(b.word);
        });
        List<String> result = new ArrayList<>();
        for (Candidate candidate : ranked) result.add(candidate.word);
        return result;
    }

    private void apply(Edit edit) {
        int end = edit.position + edit.before.length();
        int left = edit.position;
        int right = end;
        while (left > 0 && isLetter(text.charAt(left - 1))) left--;
        while (right < text.length() && isLetter(text.charAt(right))) right++;

        // Remove complete old words, edit the buffer, then add complete new words.
        adjust(text.substring(left, right), -1);
        text.replace(edit.position, end, edit.after);
        int newRight = right + edit.after.length() - edit.before.length();
        adjust(text.substring(left, newRight), 1);
    }

    private void adjust(String fragment, int delta) {
        Matcher matcher = WORD.matcher(fragment);
        while (matcher.find()) {
            String word = matcher.group();
            TrieNode node = root;
            List<TrieNode> path = new ArrayList<>();
            path.add(root);
            for (char c : word.toCharArray()) {
                if (delta > 0) node.children.putIfAbsent(c, new TrieNode());
                node = node.children.get(c);
                path.add(node);
            }
            node.frequency += delta;
            node.word = node.frequency > 0 ? word : null;

            // Prune a word that no longer occurs, without removing shared prefixes.
            if (delta < 0) {
                for (int i = word.length(); i > 0; i--) {
                    TrieNode child = path.get(i);
                    if (child.frequency != 0 || !child.children.isEmpty()) break;
                    path.get(i - 1).children.remove(word.charAt(i - 1));
                }
            }
        }
    }

    private static boolean isLetter(char c) {
        return c >= 'a' && c <= 'z';
    }

    public static void main(String[] args) {
        TextEditor editor = new TextEditor();

        // Test 1: Middle insertion and half-open deletion: heXXllo -> hllo.
        editor.insert(0, "hello");
        editor.insert(2, "XX");
        editor.delete(1, 4);
        System.out.println(editor.getText()); // hllo

        // Test 2: Undo, redo, and a new edit that clears the redo branch.
        editor.undo();
        System.out.println(editor.getText()); // heXXllo
        editor.redo();
        editor.undo();
        editor.insert(editor.getText().length(), "!");
        System.out.println(editor.redo()); // false

        // Test 3: Deleting a separator merges words; undo restores both words.
        TextEditor words = new TextEditor();
        words.insert(0, "hello world");
        words.delete(5, 6);
        System.out.println(words.suggest("hello", 5)); // [helloworld]
        words.undo();
        System.out.println(words.suggest("hello", 5)); // [hello]

        // Test 4: Frequency ranking and alphabetical tie-breaking.
        TextEditor ranking = new TextEditor();
        ranking.insert(0, "app apple apple apply");
        System.out.println(ranking.suggest("app", 2)); // [apple, app]
        ranking.delete(10, 16);
        System.out.println(ranking.suggest("app", 2)); // [app, apple]

        // Test 5: Inserting one letter changes a complete word.
        TextEditor boundary = new TextEditor();
        boundary.insert(0, "cat");
        boundary.insert(boundary.getText().length(), "s");
        System.out.println(boundary.suggest("cat", 5)); // [cats]
    }
}
```

## Python solution

This is the same algorithm. Save it as `text_editor.py` and run `python3 text_editor.py`.

```python
import heapq
import re


class TrieNode:
    def __init__(self):
        self.children = {}
        self.frequency = 0
        self.word = None


class TextEditor:
    def __init__(self):
        self.text = []
        self.undo_stack = []
        self.redo_stack = []
        self.root = TrieNode()

    def insert(self, position, value):
        if not isinstance(value, str) or not 0 <= position <= len(self.text):
            raise ValueError("Invalid insert")
        if not value:
            return
        edit = (position, "", value)
        self._apply(edit)
        self.undo_stack.append(edit)
        self.redo_stack.clear()

    def delete(self, start, end):
        if not 0 <= start <= end <= len(self.text):
            raise ValueError("Invalid range")
        if start == end:
            return
        edit = (start, "".join(self.text[start:end]), "")
        self._apply(edit)
        self.undo_stack.append(edit)
        self.redo_stack.clear()

    def undo(self):
        if not self.undo_stack:
            return False
        position, before, after = self.undo_stack.pop()
        self._apply((position, after, before))
        self.redo_stack.append((position, before, after))
        return True

    def redo(self):
        if not self.redo_stack:
            return False
        edit = self.redo_stack.pop()
        self._apply(edit)
        self.undo_stack.append(edit)
        return True

    def get_text(self):
        return "".join(self.text)

    def suggest(self, prefix, k):
        if not isinstance(prefix, str) or re.fullmatch(r"[a-z]*", prefix) is None:
            raise ValueError("Prefix must be lowercase a-z")
        if k <= 0:
            return []

        node = self.root
        for char in prefix:
            node = node.children.get(char)
            if node is None:
                return []

        def matches():
            pending = [node]
            while pending:
                current = pending.pop()
                if current.frequency:
                    yield current.word, current.frequency
                pending.extend(current.children.values())

        best = heapq.nsmallest(k, matches(), key=lambda item: (-item[1], item[0]))
        return [word for word, _ in best]

    def _apply(self, edit):
        position, before, after = edit
        end = position + len(before)
        left, right = position, end
        while left > 0 and "a" <= self.text[left - 1] <= "z":
            left -= 1
        while right < len(self.text) and "a" <= self.text[right] <= "z":
            right += 1

        # Remove complete old words, edit the buffer, then add complete new words.
        self._adjust("".join(self.text[left:right]), -1)
        self.text[position:end] = list(after)
        new_right = right + len(after) - len(before)
        self._adjust("".join(self.text[left:new_right]), 1)

    def _adjust(self, fragment, delta):
        for word in re.findall(r"[a-z]+", fragment):
            node = self.root
            path = [node]
            for char in word:
                if delta > 0:
                    node.children.setdefault(char, TrieNode())
                node = node.children[char]
                path.append(node)
            node.frequency += delta
            node.word = word if node.frequency > 0 else None

            # Prune a word that no longer occurs, without removing shared prefixes.
            if delta < 0:
                for i in range(len(word), 0, -1):
                    child = path[i]
                    if child.frequency or child.children:
                        break
                    del path[i - 1].children[word[i - 1]]


if __name__ == "__main__":
    editor = TextEditor()

    # Test 1: Middle insertion and half-open deletion: heXXllo -> hllo.
    editor.insert(0, "hello")
    editor.insert(2, "XX")
    editor.delete(1, 4)
    print(editor.get_text())  # hllo

    # Test 2: Undo, redo, and a new edit that clears the redo branch.
    editor.undo()
    print(editor.get_text())  # heXXllo
    editor.redo()
    editor.undo()
    editor.insert(len(editor.get_text()), "!")
    print(editor.redo())  # False

    # Test 3: Deleting a separator merges words; undo restores both words.
    words = TextEditor()
    words.insert(0, "hello world")
    words.delete(5, 6)
    print(words.suggest("hello", 5))  # ['helloworld']
    words.undo()
    print(words.suggest("hello", 5))  # ['hello']

    # Test 4: Frequency ranking and alphabetical tie-breaking.
    ranking = TextEditor()
    ranking.insert(0, "app apple apple apply")
    print(ranking.suggest("app", 2))  # ['apple', 'app']
    ranking.delete(10, 16)
    print(ranking.suggest("app", 2))  # ['app', 'apple']

    # Test 5: Inserting one letter changes a complete word.
    boundary = TextEditor()
    boundary.insert(0, "cat")
    boundary.insert(len(boundary.get_text()), "s")
    print(boundary.suggest("cat", 5))  # ['cats']
```

## Complexity

Let `n` be the document length; `e` the number of characters in the old and new local windows around an edit; `p` the prefix length; `v` the number of trie nodes below that prefix; `w` the number of complete words there; and `k` the requested result count.

| Operation | Time | Why |
| --- | --- | --- |
| `insert`, `delete`, `undo`, `redo` | O(n + e) | The array-backed buffer may shift O(n) characters; only the affected local words are retokenized and updated. |
| `get_text` | O(n) | It copies or joins the document into a string. |
| `suggest` | O(p + v + w log k) | Walk the prefix, traverse its subtree, and keep the best `k` complete words. |

The buffer uses O(n) space; the trie uses O(total length of the **currently distinct** words), because dead branches are pruned. History stores the inserted and deleted strings, using O(sum of retained edit lengths), not O(n) per edit. The query heap needs O(k) extra space; trie traversal needs space proportional to its pending frontier. Word strings are stored only at terminal nodes, so traversal does not rebuild a string at every prefix. The code treats offsets as native string units—UTF-16 code units in Java, Unicode code points in Python. A production editor must define cursor behavior for Unicode grapheme clusters explicitly.

There is no single universally optimal buffer. A rope or balanced piece tree can reduce arbitrary-position edits toward O(log n + edited length), but its balancing, metadata, and undo integration make the implementation substantially larger. If edits cluster around one cursor, a gap buffer may be simpler and faster in practice; random cursor jumps can still cost O(n). Pick based on the stated workload, not on the presence of a fancy data structure in an interview guide.

## Part 4: What changes with real-time collaboration?

The local editor above is correct for **one linear edit history**. Sending its absolute offsets to other users is not enough. Starting from `ab`, Alice and Bob both insert at position 1. If each blindly applies the remote operation at position 1, one replica can end at `aXYb` and the other at `aYXb`.

For a central server that orders every operation by revision, **operational transformation (OT)** is a reasonable design: transform a late operation against edits already accepted at the server, with explicit rules for insert/insert, insert/delete, and delete/delete. A tie-breaker such as user ID handles two inserts at the same logical location. The transform rules and revision tracking are the hard part.

If offline edits and out-of-order delivery are core requirements, use a **sequence CRDT** such as an RGA-style design:

```text
Insert { opId, elementId, afterElementId, character }
Delete { opId, targetElementId }

Replica state:
  elementId -> character, predecessor, tombstone
  seen opIds
  pending operations whose referenced element has not arrived
```

An insertion refers to a stable element ID, not a shifting integer offset. Concurrent children of the same predecessor use a deterministic total order, such as a Lamport counter plus user ID. A delete marks its target as a tombstone, so a later insert can still reference that ID. Duplicate operations are ignored; inserts that arrive before their predecessor are buffered; a delete that arrives before its target is retained until the target appears. If all replicas eventually receive the same valid operations and dependencies, they materialize the same visible sequence regardless of delivery order. This is the protocol-level guarantee—not something the local `TextEditor` class alone can provide. The formal [RGA-style convergence work](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/07/podc16-complete.pdf) explains the ordering and tombstone model.

Collaborative undo also changes meaning: Alice should undo **her own** last edit by emitting a new operation targeting her inserted element IDs, rather than restoring an old whole-document snapshot and erasing Bob's changes. Undoing a deletion requires a defined reinsertion policy and may not perfectly recreate the old position after concurrent edits. Persist operations or checkpoints, enforce unique site IDs, and handle missing dependencies and tombstone garbage collection before calling a prototype production-ready.

The key interview insight is the progression: a mutable buffer solves local edits; inverse operations solve local history; a trie plus local boundary repair solves dynamic suggestions; stable identities and a convergence protocol solve collaboration. Each stage changes the state model, not merely the number of methods on one class.
