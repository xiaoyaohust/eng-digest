---
title: "Durable In-Memory KV Store with Size-Limited Snapshot Files"
description: "Build a recoverable KV snapshot with custom UTF-8 encoding, bounded chunk files, and runnable Java and Python solutions."
date: 2026-10-04
difficulty: hard
patterns:
  - serialization
  - chunking
  - crash-consistency
languages:
  - java
  - python
tags:
  - data-structures
  - persistence
  - file-io
  - serialization
featured: true
draft: false
practice:
  - question: "Why must a string's length prefix count UTF-8 bytes rather than characters?"
    topic: "Binary format"
    hint: "Compare the character count and encoded byte count of a non-ASCII string."
    answer: "The reader skips bytes, not characters. A string such as 你好 has two Unicode characters but six UTF-8 bytes; writing the character count would make the next field start in the middle of the value."
  - question: "Can a multibyte UTF-8 character be split between two chunk files?"
    topic: "Chunking"
    hint: "Ask when decoding happens."
    answer: "Yes. The files hold ordered byte slices of one complete snapshot. Restore concatenates every slice before decoding any string, so a character split across files is reconstructed exactly."
  - question: "Why is the manifest replaced only after all new chunks have been written?"
    topic: "Recovery"
    hint: "Imagine the process crashes halfway through a save."
    answer: "The old manifest still references a complete previous generation. Publishing the new manifest last makes it the commit point; publishing it first could point restore at missing or partial chunks."
---

## Problem

Implement an in-memory key-value store whose keys and values are strings. It supports `put(key, value)`, `get(key)`, and `delete(key)`. A call to `save()` writes the **entire current state** in a custom binary format. A newly constructed store pointed at the same directory must restore the last successfully saved state. Keys and values can be empty or contain punctuation, newlines, and Unicode; `null`/`None` is not a stored value. Changes after the last successful `save()` need not survive a restart.

The follow-up imposes a maximum file size, supplied as `maxFileBytes`: **no snapshot data file may exceed that many bytes**. The example limit is 1,024 bytes, but the algorithm must work for any supported limit. Our implementation also keeps the small manifest under that limit. The directory belongs to one store, with one writer and no concurrent restore while a save is cleaning old files.

There are two reasonable interpretations to clarify with an interviewer: may a serialized record span files, or must every record remain in one file? We solve the first—the natural interpretation when splitting a complete snapshot. If records must remain whole, an oversized record needs a separate rule, and packing becomes a different problem. First-fit and best-fit are unnecessary when we simply cut one ordered byte stream into consecutive chunks.

## Encode first, then split bytes

Using a delimiter such as `key:value\n` is ambiguous when keys or values themselves contain `:`, commas, or newlines. Instead, encode each string as a four-byte length followed by that many raw UTF-8 bytes. The snapshot is:

```text
"KVS1" | entry count (4 bytes)
       | key byte length (4) | key bytes | value byte length (4) | value bytes
       | ... repeated once per entry
```

All integers are big-endian. Lengths count **bytes**, not Java `String.length()` characters or Python `len(str)` code points. For example, `"你好"` is two characters but six UTF-8 bytes. Java's [`DataOutputStream.writeInt`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/io/DataOutputStream.html) writes big-endian integers; Python's [`struct` format prefix `>`](https://docs.python.org/3/library/struct.html) selects the same byte order. We write standard UTF-8 bytes ourselves rather than Java's `writeUTF`, which uses a different encoding.

Once the snapshot is a byte array of length `S`, chunk `i` is `snapshot[i*C : min((i+1)*C, S)]`, where `C = maxFileBytes`. The number of data files is `ceil(S/C)`. A Unicode character can straddle a file boundary: that is safe because restoration concatenates **bytes first** and decodes afterward. Decoding each file independently would be wrong.

An empty store still produces an eight-byte snapshot header and therefore one data file. This avoids treating “no manifest” (never saved) as equivalent to “a valid saved empty store.”

## Publish one complete generation

Writing directly over the current chunks would let a crash leave a mix of old and new bytes. Instead, each save gets a fresh generation ID and writes new chunk files without touching the generation named by the current manifest. Only after every new file has been written and flushed do we atomically replace `manifest.bin`. That replacement is the **logical commit point**. If the process stops earlier, restore still follows the old manifest; unreferenced new chunks are harmless and can be cleaned later.

```text
manifest.bin  -> generation G1, chunk count, total length, CRC32
chunk-G1-00000000.bin
chunk-G1-00000001.bin

save new state:
  write and flush chunk-G2-... files
  atomically replace manifest.bin -> G2
  best-effort delete G1 files
```

The fixed 44-byte manifest stores format magic and version, generation ID, chunk limit, chunk count, total snapshot length, and CRC32. Restore checks the file's exact size, every expected chunk's exact size, the overall checksum, entry boundaries, duplicate keys, and trailing bytes **before replacing the in-memory map**. CRC32 detects accidental damage; it is not an authentication mechanism against someone who can deliberately modify the files. A missing or corrupt chunk is an error, not an excuse to silently return partial data.

The code requires an atomic same-directory replacement for the manifest and **does not silently fall back to a non-atomic move**. Java documents [`ATOMIC_MOVE`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/nio/file/StandardCopyOption.html), and Python documents [`os.replace`](https://docs.python.org/3/library/os.html#os.replace). It flushes file contents before publication. A guarantee across sudden power loss additionally depends on filesystem behavior and syncing directory metadata; this compact interview implementation targets safe recovery from process interruption on a filesystem that supports the stated rename operation. For multiple writers, add an exclusive lock or a transactional storage layer.

## Java solution

Save the following complete program as `Main.java`. `maxFileBytes` is constructor input, not a size baked into the serializer. The format constants (`KVS1`, `KVM1`, version 1, and 44 manifest bytes) define the on-disk protocol; they are not values taken from the example. Helper methods handle binary encoding and file publication while the core operations remain `put`, `get`, `delete`, `save`, and `restore`.

```java
import java.io.*;
import java.nio.*;
import java.nio.channels.FileChannel;
import java.nio.charset.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.CRC32;

class DurableKVStore {
    private static final int SNAPSHOT_MAGIC = 0x4B565331; // KVS1
    private static final int MANIFEST_MAGIC = 0x4B564D31; // KVM1
    private static final int VERSION = 1;
    private static final int MANIFEST_BYTES = 44;

    private final Path directory;
    private final int maxFileBytes;
    private Map<String, String> values = new LinkedHashMap<>();

    DurableKVStore(Path directory, int maxFileBytes) throws IOException {
        if (directory == null || maxFileBytes < MANIFEST_BYTES) {
            throw new IllegalArgumentException("Invalid directory or file limit");
        }
        this.directory = directory;
        this.maxFileBytes = maxFileBytes;
        Files.createDirectories(directory);
        restore();
    }

    public void put(String key, String value) {
        if (key == null || value == null) throw new IllegalArgumentException("Null key/value");
        values.put(key, value);
    }

    public String get(String key) {
        return values.get(Objects.requireNonNull(key));
    }

    public void delete(String key) {
        values.remove(Objects.requireNonNull(key));
    }

    public void save() throws IOException {
        // Encode one unambiguous snapshot using UTF-8 byte lengths.
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        try (DataOutputStream out = new DataOutputStream(buffer)) {
            out.writeInt(SNAPSHOT_MAGIC);
            out.writeInt(values.size());
            for (Map.Entry<String, String> entry : values.entrySet()) {
                byte[] key = utf8(entry.getKey());
                byte[] value = utf8(entry.getValue());
                out.writeInt(key.length);
                out.write(key);
                out.writeInt(value.length);
                out.write(value);
            }
        }
        byte[] snapshot = buffer.toByteArray();
        UUID next = UUID.randomUUID();
        int chunkCount = 1 + (snapshot.length - 1) / maxFileBytes;

        // Publish complete, size-bounded chunks under a fresh generation ID.
        for (int i = 0; i < chunkCount; i++) {
            int start = i * maxFileBytes;
            int length = Math.min(maxFileBytes, snapshot.length - start);
            Path file = chunkPath(next, i);
            publish(file.resolveSibling(file.getFileName() + ".tmp"), file, snapshot, start, length);
        }

        CRC32 crc = new CRC32();
        crc.update(snapshot);
        byte[] manifest = ByteBuffer.allocate(MANIFEST_BYTES)
                .putInt(MANIFEST_MAGIC).putInt(VERSION)
                .putLong(next.getMostSignificantBits()).putLong(next.getLeastSignificantBits())
                .putInt(maxFileBytes).putInt(chunkCount)
                .putLong(snapshot.length).putInt((int) crc.getValue()).array();
        Path target = directory.resolve("manifest.bin");
        publish(directory.resolve("manifest.bin.tmp"), target, manifest, 0, manifest.length);

        // Cleanup happens only after the new manifest commits; failure leaves valid data.
        String currentPrefix = "chunk-" + next.toString().replace("-", "") + "-";
        try (DirectoryStream<Path> files = Files.newDirectoryStream(directory, "chunk-*")) {
            for (Path file : files) {
                String name = file.getFileName().toString();
                if (!name.startsWith(currentPrefix) || name.endsWith(".tmp")) {
                    try { Files.deleteIfExists(file); } catch (IOException ignored) { /* retry later */ }
                }
            }
        } catch (IOException ignored) { /* cleanup is best effort */ }
    }

    public void restore() throws IOException {
        Path manifestPath = directory.resolve("manifest.bin");
        if (!Files.exists(manifestPath)) {
            values = new LinkedHashMap<>();
            return;
        }

        // Validate metadata and reassemble exactly the named generation.
        byte[] raw = Files.readAllBytes(manifestPath);
        if (raw.length != MANIFEST_BYTES) throw new IOException("Invalid manifest size");
        ByteBuffer meta = ByteBuffer.wrap(raw);
        if (meta.getInt() != MANIFEST_MAGIC || meta.getInt() != VERSION) {
            throw new IOException("Unknown manifest format");
        }
        UUID id = new UUID(meta.getLong(), meta.getLong());
        int savedLimit = meta.getInt();
        int count = meta.getInt();
        long total = meta.getLong();
        long expectedCrc = Integer.toUnsignedLong(meta.getInt());
        if (savedLimit != maxFileBytes || total < 8 || total > Integer.MAX_VALUE
                || count != 1 + (total - 1) / savedLimit) {
            throw new IOException("Invalid manifest values or file limit");
        }

        ByteArrayOutputStream joined = new ByteArrayOutputStream((int) total);
        for (int i = 0; i < count; i++) {
            byte[] chunk = Files.readAllBytes(chunkPath(id, i));
            int expected = (int) Math.min(maxFileBytes, total - joined.size());
            if (chunk.length != expected) throw new IOException("Missing or invalid chunk");
            joined.write(chunk);
        }
        byte[] snapshot = joined.toByteArray();
        CRC32 crc = new CRC32();
        crc.update(snapshot);
        if (crc.getValue() != expectedCrc) throw new IOException("Snapshot checksum mismatch");

        // Parse into a temporary map, then swap only after full validation.
        ByteBuffer input = ByteBuffer.wrap(snapshot);
        if (input.getInt() != SNAPSHOT_MAGIC) throw new IOException("Unknown snapshot format");
        int entries = input.getInt();
        if (entries < 0 || entries > (snapshot.length - 8) / 8) {
            throw new IOException("Invalid entry count");
        }
        Map<String, String> restored = new LinkedHashMap<>();
        for (int i = 0; i < entries; i++) {
            String key = readString(input);
            String value = readString(input);
            if (restored.putIfAbsent(key, value) != null) throw new IOException("Duplicate key");
        }
        if (input.hasRemaining()) throw new IOException("Trailing snapshot bytes");
        values = restored;
    }

    private static byte[] utf8(String text) throws CharacterCodingException {
        ByteBuffer encoded = StandardCharsets.UTF_8.newEncoder()
                .onMalformedInput(CodingErrorAction.REPORT).encode(CharBuffer.wrap(text));
        byte[] bytes = new byte[encoded.remaining()];
        encoded.get(bytes);
        return bytes;
    }

    private static String readString(ByteBuffer input) throws IOException {
        if (input.remaining() < 4) throw new IOException("Truncated length");
        int length = input.getInt();
        if (length < 0 || length > input.remaining()) throw new IOException("Invalid string length");
        ByteBuffer bytes = input.slice();
        bytes.limit(length);
        String result = StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT).decode(bytes).toString();
        input.position(input.position() + length);
        return result;
    }

    private Path chunkPath(UUID id, int index) {
        return directory.resolve(String.format(Locale.ROOT, "chunk-%s-%08d.bin",
                id.toString().replace("-", ""), index));
    }

    private static void publish(Path temp, Path target, byte[] bytes, int start, int length)
            throws IOException {
        try (FileChannel file = FileChannel.open(temp,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING,
                StandardOpenOption.WRITE)) {
            ByteBuffer data = ByteBuffer.wrap(bytes, start, length);
            while (data.hasRemaining()) file.write(data);
            file.force(true);
        }
        Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING);
    }
}

public class Main {
    public static void main(String[] args) throws Exception {
        Path directory = Files.createTempDirectory("durable-kv-");
        int maxFileBytes = 1024; // Example input, not an algorithm constant.
        try {
            // Test 1: Ordinary, empty, delimiter-containing, and Unicode strings survive reopen.
            DurableKVStore first = new DurableKVStore(directory, maxFileBytes);
            first.put("name", "John:Doe");
            first.put("line,\nkey", "snow: 雪 and 🙂");
            first.put("", "");
            first.save();
            DurableKVStore reopened = new DurableKVStore(directory, maxFileBytes);
            System.out.println("Test 1: " + ("John:Doe".equals(reopened.get("name"))
                    && "snow: 雪 and 🙂".equals(reopened.get("line,\nkey"))
                    && "".equals(reopened.get("")))); // true

            // Test 2: One large value crosses chunk and UTF-8 boundaries safely.
            String large = "🙂".repeat(maxFileBytes);
            reopened.put("large", large);
            reopened.save();
            DurableKVStore split = new DurableKVStore(directory, maxFileBytes);
            long chunks = 0;
            boolean withinLimit = Files.size(directory.resolve("manifest.bin")) <= maxFileBytes;
            try (var files = Files.list(directory)) {
                for (Path file : files.toList()) {
                    if (file.getFileName().toString().startsWith("chunk-")
                            && file.getFileName().toString().endsWith(".bin")) {
                        chunks++;
                        withinLimit &= Files.size(file) <= maxFileBytes;
                    }
                }
            }
            System.out.println("Test 2: " + (large.equals(split.get("large"))
                    && chunks > 1 && withinLimit)); // true

            // Test 3: Overwrite and delete are reflected in the next saved generation.
            split.put("name", "Jane");
            split.delete("line,\nkey");
            split.save();
            DurableKVStore updated = new DurableKVStore(directory, maxFileBytes);
            System.out.println("Test 3: " + ("Jane".equals(updated.get("name"))
                    && updated.get("line,\nkey") == null)); // true

            // Test 4: Changes made after the last save do not survive a reopen.
            updated.put("unsaved", "temporary");
            DurableKVStore lastSaved = new DurableKVStore(directory, maxFileBytes);
            System.out.println("Test 4: " + (lastSaved.get("unsaved") == null)); // true

            // Test 5: Corrupting an active chunk must make restore fail, not return partial data.
            Path chunk;
            try (var files = Files.list(directory)) {
                chunk = files.filter(p -> p.getFileName().toString().endsWith(".bin")
                        && p.getFileName().toString().startsWith("chunk-"))
                        .findFirst().orElseThrow();
            }
            byte[] damaged = Files.readAllBytes(chunk);
            damaged[0] ^= 1;
            Files.write(chunk, damaged);
            boolean rejected = false;
            try { new DurableKVStore(directory, maxFileBytes); }
            catch (IOException expected) { rejected = true; }
            System.out.println("Test 5: " + rejected); // true
        } finally {
            try (var files = Files.list(directory)) {
                for (Path file : files.toList()) Files.deleteIfExists(file);
            }
            Files.deleteIfExists(directory);
        }
    }
}
```

The helper that publishes a file forces its contents to storage and then requests an atomic rename. If the filesystem cannot provide `ATOMIC_MOVE`, `save()` fails instead of weakening its recovery contract. The example's `1,024` appears only in the test setup; callers may supply a different supported `maxFileBytes`.

## Python solution

Save as `durable_kv_store.py` and run with Python 3.10 or newer. The Python and Java versions use the same big-endian format and manifest layout. `os.replace` replaces the manifest only after the new chunks are complete; the directory must stay on one filesystem.

```python
import os
import struct
import tempfile
import uuid
import zlib
from pathlib import Path


class DurableKVStore:
    MANIFEST = struct.Struct(">4sI16sIIQI")
    MAX_INT32 = (1 << 31) - 1

    def __init__(self, directory: str | Path, max_file_bytes: int):
        if not isinstance(max_file_bytes, int) or not (
            self.MANIFEST.size <= max_file_bytes <= self.MAX_INT32
        ):
            raise ValueError("Invalid file limit")
        self.directory = Path(directory)
        self.max_file_bytes = max_file_bytes
        self.directory.mkdir(parents=True, exist_ok=True)
        self.values: dict[str, str] = {}
        self.restore()

    def put(self, key: str, value: str) -> None:
        if not isinstance(key, str) or not isinstance(value, str):
            raise TypeError("Keys and values must be strings")
        self.values[key] = value

    def get(self, key: str) -> str | None:
        return self.values.get(key)

    def delete(self, key: str) -> None:
        self.values.pop(key, None)

    def save(self) -> None:
        # The custom snapshot uses byte lengths, never delimiters or character counts.
        if len(self.values) > self.MAX_INT32:
            raise ValueError("Too many entries")
        snapshot = bytearray(b"KVS1")
        snapshot.extend(struct.pack(">I", len(self.values)))
        for key, value in self.values.items():
            for text in (key, value):
                encoded = text.encode("utf-8")
                if len(encoded) > self.MAX_INT32:
                    raise ValueError("String is too large")
                snapshot.extend(struct.pack(">I", len(encoded)))
                snapshot.extend(encoded)
        if len(snapshot) > self.MAX_INT32:
            raise ValueError("Snapshot is too large for this in-memory implementation")

        # Write a new generation; an old manifest never points at these partial files.
        generation = uuid.uuid4().bytes
        name = generation.hex()
        count = (len(snapshot) + self.max_file_bytes - 1) // self.max_file_bytes
        for index in range(count):
            start = index * self.max_file_bytes
            chunk = memoryview(snapshot)[start : start + self.max_file_bytes]
            final = self.directory / f"chunk-{name}-{index:08d}.bin"
            self._publish(final.with_name(final.name + ".tmp"), final, chunk)

        manifest = self.MANIFEST.pack(
            b"KVM1", 1, generation, self.max_file_bytes,
            count, len(snapshot), zlib.crc32(snapshot),
        )
        final = self.directory / "manifest.bin"
        self._publish(self.directory / "manifest.bin.tmp", final, manifest)

        # Old chunks and abandoned temporary files are no longer referenced.
        prefix = f"chunk-{name}-"
        for file in self.directory.glob("chunk-*"):
            if not file.name.startswith(prefix) or file.name.endswith(".tmp"):
                try:
                    file.unlink()
                except OSError:
                    pass  # Cleanup can be retried after a later save.

    def restore(self) -> None:
        manifest_path = self.directory / "manifest.bin"
        if not manifest_path.exists():
            self.values = {}
            return

        raw = manifest_path.read_bytes()
        if len(raw) != self.MANIFEST.size:
            raise ValueError("Invalid manifest size")
        magic, version, generation, saved_limit, count, total, expected_crc = (
            self.MANIFEST.unpack(raw)
        )
        if (magic != b"KVM1" or version != 1 or saved_limit != self.max_file_bytes
                or total < 8 or total > self.MAX_INT32
                or count != (total + saved_limit - 1) // saved_limit):
            raise ValueError("Invalid manifest values or file limit")

        # Read only the chunks named by the manifest, in their original byte order.
        parts = []
        remaining = total
        for index in range(count):
            file = self.directory / f"chunk-{generation.hex()}-{index:08d}.bin"
            chunk = file.read_bytes()
            expected = min(saved_limit, remaining)
            if len(chunk) != expected:
                raise ValueError("Invalid chunk size")
            parts.append(chunk)
            remaining -= len(chunk)
        snapshot = b"".join(parts)
        if zlib.crc32(snapshot) != expected_crc:
            raise ValueError("Snapshot checksum mismatch")

        # Parse into a separate dictionary so failure cannot expose partial state.
        if snapshot[:4] != b"KVS1":
            raise ValueError("Unknown snapshot format")
        entries = struct.unpack_from(">I", snapshot, 4)[0]
        if entries > (len(snapshot) - 8) // 8:
            raise ValueError("Invalid entry count")
        restored = {}
        position = 8
        for _ in range(entries):
            key, position = self._read_string(snapshot, position)
            value, position = self._read_string(snapshot, position)
            if key in restored:
                raise ValueError("Duplicate key")
            restored[key] = value
        if position != len(snapshot):
            raise ValueError("Trailing snapshot bytes")
        self.values = restored

    @staticmethod
    def _read_string(snapshot: bytes, position: int) -> tuple[str, int]:
        if position + 4 > len(snapshot):
            raise ValueError("Truncated string length")
        length = struct.unpack_from(">I", snapshot, position)[0]
        position += 4
        if length > len(snapshot) - position:
            raise ValueError("Invalid string length")
        text = snapshot[position : position + length].decode("utf-8")
        return text, position + length

    @staticmethod
    def _publish(temp: Path, final: Path, data: bytes | memoryview) -> None:
        with temp.open("wb") as file:
            file.write(data)
            file.flush()
            os.fsync(file.fileno())
        os.replace(temp, final)


if __name__ == "__main__":
    with tempfile.TemporaryDirectory(prefix="durable-kv-") as root:
        max_file_bytes = 1024  # Example input, not an algorithm constant.

        # Test 1: Ordinary, empty, delimiter-containing, and Unicode strings survive reopen.
        first = DurableKVStore(root, max_file_bytes)
        first.put("name", "John:Doe")
        first.put("line,\nkey", "snow: 雪 and 🙂")
        first.put("", "")
        first.save()
        reopened = DurableKVStore(root, max_file_bytes)
        print("Test 1:", reopened.get("name") == "John:Doe"
              and reopened.get("line,\nkey") == "snow: 雪 and 🙂"
              and reopened.get("") == "")  # True

        # Test 2: A large value spans files; every file stays within the input limit.
        large = "🙂" * max_file_bytes
        reopened.put("large", large)
        reopened.save()
        split = DurableKVStore(root, max_file_bytes)
        chunks = list(Path(root).glob("chunk-*.bin"))
        within_limit = all(file.stat().st_size <= max_file_bytes for file in chunks)
        within_limit &= (Path(root) / "manifest.bin").stat().st_size <= max_file_bytes
        print("Test 2:", split.get("large") == large
              and len(chunks) > 1 and within_limit)  # True

        # Test 3: An overwrite and deletion persist in the next generation.
        split.put("name", "Jane")
        split.delete("line,\nkey")
        split.save()
        updated = DurableKVStore(root, max_file_bytes)
        print("Test 3:", updated.get("name") == "Jane"
              and updated.get("line,\nkey") is None)  # True

        # Test 4: Changes made after the last save do not survive a reopen.
        updated.put("unsaved", "temporary")
        last_saved = DurableKVStore(root, max_file_bytes)
        print("Test 4:", last_saved.get("unsaved") is None)  # True

        # Test 5: A damaged active chunk is rejected instead of partially restored.
        chunk = next(Path(root).glob("chunk-*.bin"))
        damaged = bytearray(chunk.read_bytes())
        damaged[0] ^= 1
        chunk.write_bytes(damaged)
        try:
            DurableKVStore(root, max_file_bytes)
            rejected = False
        except (OSError, ValueError):
            rejected = True
        print("Test 5:", rejected)  # True
```

## Complexity and boundaries

Let `S` be the total snapshot byte count (including length prefixes), and `C` the maximum file size. There are `F = ceil(S/C)` data files. `put`, `get`, and `delete` are **O(1) average time** in the in-memory hash table. `save` and `restore` are **O(S + F) time**, including serialization, disk I/O, and per-file work; since each file holds at least one byte, this is O(S) for a fixed limit. That is time-optimal for a full snapshot: every saved byte must be written and every restored byte read. Both implementations use **O(S) auxiliary memory** because they assemble the whole binary snapshot; during a save, old and new generations can temporarily occupy O(S) additional disk space.

If the interviewer adds a strict memory limit, stream the same length-prefixed format through a chunk writer and a chunk reader rather than building a whole blob. That can reduce the snapshot buffer to O(C) plus the largest string encoded at one time, but makes the code and error handling longer. The on-disk format and manifest-last commit rule do not change. If `put()` itself must be durable, a snapshot-only API is insufficient: add a write-ahead log or save synchronously on each update and discuss the write cost. If records may *not* cross files, use sequential rollover (often called next-fit), reject or specially handle records larger than `C`, and define a new per-file parsing format; do not import first-fit/best-fit unless the prompt actually allows reusing arbitrary earlier files.
