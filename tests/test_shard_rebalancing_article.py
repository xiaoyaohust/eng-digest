"""Execute the published solutions and compare them with a per-key oracle."""

from collections import Counter
from pathlib import Path
import random
import re
import shutil
import subprocess
import sys
import types

import pytest


ARTICLE = (
    Path(__file__).resolve().parents[1]
    / "site/src/content/coding/rebalance-overlapping-shard-ranges.md"
)
TEXT = ARTICLE.read_text()
PYTHON_SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
JAVA_SOURCE = re.search(r"```java\n(.*?)\n```", TEXT, re.DOTALL).group(1)
OUTPUT_SECTION = TEXT.split("## Expected output\n", 1)[1]
EXPECTED_OUTPUT = re.search(r"```text\n(.*?)\n```", OUTPUT_SECTION, re.DOTALL).group(1).splitlines()
MODULE = types.ModuleType("shard_rebalancing_article")
sys.modules[MODULE.__name__] = MODULE
exec(compile(PYTHON_SOURCE, str(ARTICLE), "exec"), MODULE.__dict__)
Shard, Shards = MODULE.Shard, MODULE.Shards


def oracle(inputs, limit):
    """Keep all earlier ranges; inspect every key instead of using a heap."""
    coverage = Counter()
    result = []
    covered_through = None
    for shard_id, original_start, end in sorted(inputs, key=lambda s: (s[1], s[0])):
        start = original_start
        if covered_through is not None and start > covered_through + 1:
            start = covered_through + 1
        # A suffix must begin after the last full key in the entire interval.
        for key in range(start, end + 1):
            if coverage[key] == limit:
                start = key + 1
        if start <= end:
            result.append((shard_id, start, end))
            coverage.update(range(start, end + 1))
            covered_through = end if covered_through is None else max(covered_through, end)
    return sorted(result, key=lambda s: (s[1], s[0]))


def rebalance(inputs, limit):
    collection = Shards(limit)
    original_objects = [Shard(*item) for item in inputs]
    for shard in original_objects:
        collection.add_shard(shard)
    collection.rebalance()
    first = collection.get_shards()
    collection.rebalance()
    assert collection.get_shards() == first
    assert [(s.id, s.start, s.end) for s in original_objects] == inputs
    return [(s.id, s.start, s.end) for s in first]


@pytest.fixture(scope="module")
def java_program(tmp_path_factory):
    javac, java = shutil.which("javac"), shutil.which("java")
    if not javac or not java:
        pytest.skip("A JDK is required to compile the published Java example")
    directory = tmp_path_factory.mktemp("shard_rebalancing_java")
    source = directory / "ShardRangeRebalancer.java"
    source.write_text(JAVA_SOURCE)
    harness = directory / "ShardRebalanceHarness.java"
    harness.write_text("""
import java.util.*;

public class ShardRebalanceHarness {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        int cases = scanner.nextInt();
        for (int test = 0; test < cases; test++) {
            int limit = scanner.nextInt();
            int count = scanner.nextInt();
            var collection = new ShardRangeRebalancer.Shards(limit);
            for (int index = 0; index < count; index++) {
                collection.addShard(new ShardRangeRebalancer.Shard(
                    scanner.next(), scanner.nextInt(), scanner.nextInt()));
            }
            collection.rebalance();
            var first = collection.getShards();
            collection.rebalance();
            if (!first.equals(collection.getShards())) {
                throw new AssertionError("Rebalance is not idempotent");
            }
            System.out.println(first);
        }
    }
}
""")
    subprocess.run(
        [javac, "--release", "17", str(source), str(harness)],
        check=True, capture_output=True, text=True, timeout=30,
    )
    return java, directory


def test_python_main_matches_published_output(capsys):
    MODULE.main()
    assert capsys.readouterr().out.splitlines() == EXPECTED_OUTPUT


def test_java_main_matches_published_output(java_program):
    java, directory = java_program
    result = subprocess.run(
        [java, "-cp", str(directory), "ShardRangeRebalancer"],
        check=True, capture_output=True, text=True, timeout=15,
    )
    assert result.stdout.splitlines() == EXPECTED_OUTPUT
    assert result.stderr == ""


def test_random_ranges_match_per_key_oracle_and_coverage_contract():
    rng = random.Random(20261014)
    for _ in range(2500):
        count, limit = rng.randrange(20), rng.randrange(1, 8)
        inputs = []
        for index in range(count):
            left, right = sorted((rng.randrange(-15, 16), rng.randrange(-15, 16)))
            inputs.append((f"S{index:02}", left, right))
        rng.shuffle(inputs)
        actual = rebalance(inputs, limit)
        assert actual == oracle(inputs, limit), (inputs, limit, actual)
        coverage = Counter()
        original_ends = {shard_id: end for shard_id, _, end in inputs}
        for shard_id, start, end in actual:
            assert end == original_ends[shard_id]
            coverage.update(range(start, end + 1))
        if inputs:
            domain = range(min(s[1] for s in inputs), max(s[2] for s in inputs) + 1)
            assert all(1 <= coverage[key] <= limit for key in domain)
        else:
            assert actual == []


def test_java_random_ranges_and_integer_boundaries(java_program):
    rng = random.Random(81733)
    cases = []
    for _ in range(500):
        inputs = []
        for index in range(rng.randrange(16)):
            left, right = sorted((rng.randrange(-12, 13), rng.randrange(-12, 13)))
            inputs.append((f"S{index:02}", left, right))
        rng.shuffle(inputs)
        limit = rng.randrange(1, 7)
        cases.append((limit, inputs, oracle(inputs, limit)))
    minimum, maximum = -(1 << 31), (1 << 31) - 1
    cases.extend([
        (1, [("A", minimum, minimum), ("B", minimum + 2, maximum),
             ("C", maximum, maximum)],
         [("A", minimum, minimum), ("B", minimum + 1, maximum)]),
        (2, [("A", minimum, maximum), ("B", minimum, maximum),
             ("C", minimum + 1, maximum), ("D", 0, maximum)],
         [("A", minimum, maximum), ("B", minimum, maximum)]),
    ])
    tokens = [str(len(cases))]
    expected = []
    for limit, inputs, output in cases:
        tokens.append(f"{limit} {len(inputs)}")
        tokens.extend(f"{name} {left} {right}" for name, left, right in inputs)
        expected.append("[" + ", ".join(f"({name}, {left}, {right})" for name, left, right in output) + "]")
    java, directory = java_program
    result = subprocess.run(
        [java, "-cp", str(directory), "ShardRebalanceHarness"],
        input="\n".join(tokens), check=True, capture_output=True, text=True, timeout=20,
    )
    assert result.stdout.splitlines() == expected
    assert result.stderr == ""


def test_short_deleted_ranges_do_not_erase_earlier_ownership():
    inputs = [("A", 0, 100), ("B", 50, 60), ("C", 70, 150)]
    assert rebalance(inputs, 1) == [("A", 0, 100), ("C", 101, 150)]


def test_python_large_coordinates_do_not_expand_the_key_space():
    boundary = 10 ** 80
    inputs = [("A", -boundary, boundary), ("B", -1, 1), ("C", 2, boundary + 5)]
    assert rebalance(inputs, 1) == [("A", -boundary, boundary), ("C", boundary + 1, boundary + 5)]


@pytest.mark.parametrize("limit", [0, -1, True, 1.5, "2"])
def test_invalid_limit_is_rejected(limit):
    with pytest.raises(ValueError):
        Shards(limit)


@pytest.mark.parametrize("shard", [("", 0, 1), ("A", 3, 2), ("A", True, 2), ("A", 0, 1.5)])
def test_invalid_shard_is_rejected(shard):
    with pytest.raises(ValueError):
        Shard(*shard)


def test_duplicate_add_does_not_replace_an_existing_shard_and_getter_is_a_copy():
    collection = Shards(1)
    collection.add_shard(Shard("A", 0, 10))
    with pytest.raises(ValueError):
        collection.add_shard(Shard("A", 20, 30))
    snapshot = collection.get_shards()
    snapshot.clear()
    collection.remove_shard("absent")
    collection.rebalance()
    assert collection.get_shards() == [Shard("A", 0, 10)]


def test_code_fences_and_headings_do_not_label_the_problem_as_a_translation():
    assert "English translation" not in TEXT
    assert "## Problem\n" in TEXT
    assert len(re.findall(r"```java\n", TEXT)) == 1
    assert len(re.findall(r"```python\n", TEXT)) == 1
    assert not re.search(r"[\u4e00-\u9fff]", JAVA_SOURCE + PYTHON_SOURCE)
