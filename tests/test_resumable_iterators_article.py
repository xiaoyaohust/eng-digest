"""Compile and run the article's actual solutions, including checkpoint restarts."""

import base64
from dataclasses import asdict, FrozenInstanceError
import json
from pathlib import Path
import random
import re
import shutil
import subprocess
import sys
import types

import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/coding/resumable-iterators.md"
TEXT = ARTICLE.read_text()
PYTHON_SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
JAVA_SOURCE = re.search(r"```java\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXPECTED = re.search(r"```text\n(.*?)\n```", TEXT.split("## Expected output\n")[1], re.DOTALL).group(1).splitlines()
MODULE = types.ModuleType("resumable_iterators_article")
sys.modules[MODULE.__name__] = MODULE
exec(compile(PYTHON_SOURCE, str(ARTICLE), "exec"), MODULE.__dict__)


def line_oracle(data):
    """Split only LF boundaries; retain a CR that is not part of CRLF."""
    result, position = [], 0
    while position < len(data):
        end = data.find(b"\n", position)
        after = len(data) if end == -1 else end + 1
        body = data[position:len(data) if end == -1 else end]
        if end != -1 and body.endswith(b"\r"):
            body = body[:-1]
        result.append((body.decode("utf-8"), after))
        position = after
    return result


def file_cases():
    cases = [b"", b"\n", b"\r", b"\r\n", b"\n\n", b"A\n", b"A\r\nB", b"A\r\r\nB\r",
             "cat\ncaf\u00e9\r\n\nbird\r".encode("utf-8"),
             ("\U0001f680" * 10000 + "\nlast").encode("utf-8")]
    rng = random.Random(20261017)
    alphabet = ["a", "Z", "\r", "\n", "\u00e9", "\u4f60", "\U0001f680", "\x00"]
    for _ in range(160):
        cases.append("".join(rng.choices(alphabet, k=rng.randrange(150))).encode("utf-8"))
    return cases


@pytest.fixture(scope="module")
def java_program(tmp_path_factory):
    java, javac = shutil.which("java"), shutil.which("javac")
    if not java or not javac:
        pytest.skip("A JDK is required to compile the published example")
    directory = tmp_path_factory.mktemp("resumable_java")
    source = directory / "ResumableIterators.java"
    source.write_text(JAVA_SOURCE)
    harness = directory / "ResumableHarness.java"
    harness.write_text(r"""
import java.nio.charset.CharacterCodingException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

public class ResumableHarness {
    public static void main(String[] args) throws Exception {
        Path file = Path.of(args[0]);
        Scanner scanner = new Scanner(System.in);
        int cases = Integer.parseInt(scanner.nextLine());
        for (int number = 0; number < cases; number++) {
            String[] fields = scanner.nextLine().split(" ", 2);
            int buffer = Integer.parseInt(fields[0]);
            byte[] data = fields[1].equals("-") ? new byte[0] : Base64.getDecoder().decode(fields[1]);
            Files.write(file, data);
            var iterator = new ResumableIterators.Utf8Lines(file, "source", "v1", null, buffer);
            List<String> results = new ArrayList<>();
            try {
                while (iterator.hasNext()) {
                    var before = iterator.checkpoint();
                    iterator.hasNext(); iterator.hasNext();
                    if (!before.equals(iterator.checkpoint())) throw new AssertionError("hasNext moved cursor");
                    String value = iterator.next();
                    var state = iterator.checkpoint();
                    results.add(Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8))
                            + "@" + state.nextOffset());
                    iterator.close();
                    iterator = new ResumableIterators.Utf8Lines(file, "source", "v1", state, buffer);
                }
                try { iterator.next(); throw new AssertionError("Expected exhaustion"); }
                catch (NoSuchElementException expected) { }
            } finally { iterator.close(); }
            System.out.println(String.join("|", results));
        }

        // A malformed line leaves the logical cursor unchanged and blocks further reads.
        Files.write(file, new byte[]{'o', 'k', '\n', (byte) 0xff, '\n'});
        try (var lines = new ResumableIterators.Utf8Lines(file, "invalid", "v1", null, 2)) {
            if (!lines.next().equals("ok")) throw new AssertionError();
            var before = lines.checkpoint();
            try { lines.next(); throw new AssertionError(); } catch (CharacterCodingException expected) { }
            if (!before.equals(lines.checkpoint())) throw new AssertionError("Decode failure moved cursor");
            try { lines.hasNext(); throw new AssertionError(); } catch (IllegalStateException expected) { }
        }

        // Validate ranges, line boundaries, identity, and snapshot length.
        Files.writeString(file, "abc\ndef\n");
        for (var state : List.of(
                new ResumableIterators.FileState("source", "v1", 8, -1),
                new ResumableIterators.FileState("source", "v1", 8, 9),
                new ResumableIterators.FileState("source", "v1", 8, 1),
                new ResumableIterators.FileState("other", "v1", 8, 0),
                new ResumableIterators.FileState("source", "v2", 8, 0),
                new ResumableIterators.FileState("source", "v1", 7, 0))) {
            try (var ignored = new ResumableIterators.Utf8Lines(file, "source", "v1", state, 3)) {
                throw new AssertionError("Expected checkpoint rejection");
            } catch (IllegalArgumentException expected) { }
        }

        // Array-backed defensive snapshots preserve duplicates, nulls, and input isolation.
        var original = new ArrayList<>(Arrays.asList("A", "A", null, "B"));
        var snapshot = new ResumableIterators.Snapshot<>("list", "v1", original);
        original.clear();
        for (int index = 0; index <= snapshot.items().size(); index++) {
            var iterator = new ResumableIterators.ResumableList<>(snapshot,
                    new ResumableIterators.ListState("list", "v1", index));
            for (int cursor = index; cursor < snapshot.items().size(); cursor++) {
                if (!Objects.equals(iterator.next(), snapshot.items().get(cursor))) throw new AssertionError();
                iterator = new ResumableIterators.ResumableList<>(snapshot, iterator.checkpoint());
            }
            if (iterator.hasNext()) throw new AssertionError();
        }
        try { snapshot.items().clear(); throw new AssertionError(); }
        catch (UnsupportedOperationException expected) { }
    }
}
""")
    subprocess.run([javac, "--release", "17", str(source), str(harness)],
                   check=True, capture_output=True, text=True, timeout=30)
    return java, directory


def test_python_main_matches_expected_output(capsys):
    MODULE.main()
    assert capsys.readouterr().out.splitlines() == EXPECTED


def test_java_main_matches_expected_output(java_program):
    java, directory = java_program
    completed = subprocess.run([java, "-cp", str(directory), "ResumableIterators"],
                               check=True, capture_output=True, text=True, timeout=20)
    assert completed.stdout.splitlines() == EXPECTED
    assert completed.stderr == ""


def test_python_lists_resume_at_every_position_and_keep_duplicate_occurrences():
    rng = random.Random(472917)
    for size in range(60):
        items = [rng.choice([None, "A", "A", 3]) for _ in range(size)]
        original = list(items)
        source = MODULE.Snapshot("source", "v1", items)
        items.clear()
        for index in range(size + 1):
            state = MODULE.ListState("source", "v1", index)
            iterator, actual = MODULE.ResumableList(source, state), []
            while iterator.has_next():
                assert iterator.checkpoint() == iterator.checkpoint()
                actual.append(next(iterator))
                iterator = MODULE.ResumableList(source, iterator.checkpoint())
            assert actual == original[index:]
            with pytest.raises(StopIteration):
                next(iterator)
    with pytest.raises(FrozenInstanceError):
        source.version = "v2"


@pytest.mark.parametrize("position", [-1, 4, True, 1.5])
def test_invalid_list_positions_are_rejected(position):
    source = MODULE.Snapshot("source", "v1", [1, 2, 3])
    with pytest.raises(ValueError):
        MODULE.ResumableList(source, MODULE.ListState("source", "v1", position))


@pytest.mark.parametrize("source_id,version", [("other", "v1"), ("source", "v2")])
def test_list_identity_mismatch_is_rejected(source_id, version):
    source = MODULE.Snapshot("source", "v1", [1])
    with pytest.raises(ValueError):
        MODULE.ResumableList(source, MODULE.ListState(source_id, version, 0))


def test_python_file_restarts_match_the_byte_oracle(tmp_path):
    path = tmp_path / "source.txt"
    for buffer_size in (2, 3, 7, 64):
        for data in file_cases():
            path.write_bytes(data)
            state, actual = None, []
            while True:
                with MODULE.Utf8Lines(path, "source", "v1", state, buffer_size) as iterator:
                    before = iterator.checkpoint()
                    available = iterator.has_next()
                    assert available == iterator.has_next()
                    assert before == iterator.checkpoint()
                    if not available:
                        with pytest.raises(StopIteration):
                            iterator.next()
                        break
                    text = iterator.next()
                    state = iterator.checkpoint()
                    actual.append((text, state.next_offset))
            assert actual == line_oracle(data), (data, buffer_size, actual)


def test_java_file_restarts_match_the_same_oracle(java_program, tmp_path):
    java, directory = java_program
    cases = [(buffer, data) for buffer in (2, 3, 7, 64) for data in file_cases()]
    tokens = [str(len(cases))]
    expected = []
    for buffer, data in cases:
        tokens.append(f"{buffer} {base64.b64encode(data).decode('ascii') if data else '-'}")
        expected.append("|".join(f"{base64.b64encode(text.encode('utf-8')).decode('ascii')}@{offset}"
                                 for text, offset in line_oracle(data)))
    completed = subprocess.run([java, "-cp", str(directory), "ResumableHarness", str(tmp_path / "data.txt")],
                               input="\n".join(tokens), check=True, capture_output=True, text=True, timeout=30)
    assert completed.stdout.splitlines() == expected
    assert completed.stderr == ""


@pytest.mark.parametrize("position", [-1, 9, 1, 2, 5, True, 4.5])
def test_invalid_file_positions_are_rejected(tmp_path, position):
    path = tmp_path / "source.txt"
    path.write_bytes(b"abc\ndef\n")
    state = MODULE.FileState("source", "v1", 8, position)
    with pytest.raises(ValueError):
        MODULE.Utf8Lines(path, "source", "v1", state)


def test_snapshot_mismatch_rejection_and_decode_failure_preserve_progress(tmp_path):
    path = tmp_path / "source.txt"
    path.write_bytes(b"ok\n\xff\n")
    for state in (MODULE.FileState("other", "v1", 5, 0), MODULE.FileState("source", "v2", 5, 0),
                  MODULE.FileState("source", "v1", 4, 0)):
        with pytest.raises(ValueError):
            MODULE.Utf8Lines(path, "source", "v1", state)
    with MODULE.Utf8Lines(path, "source", "v1", buffer_size=2) as iterator:
        assert iterator.next() == "ok"
        before = iterator.checkpoint()
        with pytest.raises(UnicodeDecodeError):
            iterator.next()
        assert iterator.checkpoint() == before
        with pytest.raises(ValueError):
            iterator.has_next()
    with pytest.raises(ValueError):
        iterator.next()


def test_file_checkpoint_is_portable_to_a_fresh_python_process(tmp_path):
    module_path = tmp_path / "published.py"
    module_path.write_text(PYTHON_SOURCE)
    first, replica = tmp_path / "original.txt", tmp_path / "replica.txt"
    first.write_bytes("first\ncaf\u00e9\nlast".encode("utf-8"))
    with MODULE.Utf8Lines(first, "source", "v1") as iterator:
        assert iterator.next() == "first"
        state = iterator.checkpoint()
    checkpoint_path = tmp_path / "state.json"
    checkpoint_path.write_text(json.dumps(asdict(state)))
    replica.write_bytes(first.read_bytes())
    first.unlink()
    completed = subprocess.run([sys.executable, "-c", """
import json
from pathlib import Path
from published import FileState, Utf8Lines
state = FileState(**json.loads(Path('state.json').read_text()))
with Utf8Lines('replica.txt', 'source', 'v1', state) as iterator:
    print(json.dumps(list(iterator)))
"""], cwd=tmp_path, check=True, capture_output=True, text=True, timeout=15)
    assert json.loads(completed.stdout) == ["caf\u00e9", "last"]
    assert completed.stderr == ""


def test_restore_reads_only_the_boundary_and_unread_suffix(tmp_path, monkeypatch):
    path = tmp_path / "source.txt"
    prefix = b"already returned\n" * 10000
    path.write_bytes(prefix + b"next\n")
    state = MODULE.FileState("source", "v1", path.stat().st_size, len(prefix))
    observed = []
    real_open = open

    class ObservedFile:
        def __init__(self, *args, **kwargs):
            self.wrapped = real_open(*args, **kwargs)

        def __getattr__(self, name):
            return getattr(self.wrapped, name)

        def read(self, size):
            observed.append(("read", self.wrapped.tell(), size))
            return self.wrapped.read(size)

        def readline(self, size):
            observed.append(("readline", self.wrapped.tell(), size))
            return self.wrapped.readline(size)

    monkeypatch.setattr(MODULE, "open", ObservedFile, raising=False)
    with MODULE.Utf8Lines(path, "source", "v1", state, 7) as iterator:
        assert observed == [("read", len(prefix) - 1, 1)]
        assert iterator.next() == "next"
    assert observed == [("read", len(prefix) - 1, 1), ("readline", len(prefix), 5)]


def test_article_contract_and_code_language():
    assert "## Problem\n" in TEXT
    assert "English translation" not in TEXT
    assert "A same-size overwrite under a reused version violates the input contract" in TEXT
    assert "cannot reconstruct progress that was never persisted" in TEXT
    assert len(re.findall(r"```java\n", TEXT)) == 1
    assert len(re.findall(r"```python\n", TEXT)) == 1
    assert not re.search(r"[\u3400-\u9fff]", JAVA_SOURCE + PYTHON_SOURCE)
