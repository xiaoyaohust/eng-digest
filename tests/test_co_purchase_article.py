"""Execute both published solutions against an independent basket-scan oracle."""

from copy import deepcopy
from pathlib import Path
import random
import re
import shutil
import subprocess
import types

import pytest


ARTICLE = (Path(__file__).resolve().parents[1]
           / "site/src/content/coding/most-frequently-co-purchased-items.md")
TEXT = ARTICLE.read_text()
PYTHON_SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
JAVA_SOURCE = re.search(r"```java\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXPECTED_OUTPUT = re.search(
    r"```text\n(.*?)\n```", TEXT.split("## Expected output\n", 1)[1], re.DOTALL
).group(1).splitlines()
MODULE = types.ModuleType("co_purchase_article")
exec(compile(PYTHON_SOURCE, str(ARTICLE), "exec"), MODULE.__dict__)


def oracle(baskets):
    """Rescan baskets for each candidate instead of building a pair table."""
    sets = [set(basket) for basket in baskets]
    items = sorted({item for basket in sets for item in basket})
    result = {}
    for item in items:
        best, best_count = None, 0
        for other in items:
            if item == other:
                continue
            count = sum(item in basket and other in basket for basket in sets)
            if count > best_count:
                best, best_count = other, count
        result[item] = best
    return result


def cases():
    # Empty input, duplicates, disconnected groups, later ties, and Unicode order.
    yield []
    yield [[], [], []]
    yield [["solo"] * 1000, ["other"]]
    yield [["a"] * 100 + ["b"], ["a", "c"], ["a", "c"]]
    yield [["a", "b"], ["a", "c"], ["a", "c"], ["a", "b"]]
    yield [["a", "b"], ["c", "d"], ["alone"]]
    yield [["anchor", "\ue000"], ["anchor", "\U0001f600"]]
    yield [["A", "a", "aa"], ["a", "aa"], ["A", "a"]]
    rng = random.Random(20261104)
    ids = ["a", "b", "c", "d", "e", "aa", "A", "\ue000", "\U0001f600"]
    for _ in range(1000):
        yield [[rng.choice(ids) for _ in range(rng.randrange(10))]
               for _ in range(rng.randrange(12))]


@pytest.fixture(scope="module")
def java_program(tmp_path_factory):
    javac, java = shutil.which("javac"), shutil.which("java")
    if not javac or not java:
        pytest.skip("A JDK is required to compile the published Java solution")
    directory = tmp_path_factory.mktemp("co_purchase_java")
    source = directory / "CoPurchaseAnalyzer.java"
    source.write_text(JAVA_SOURCE)
    harness = directory / "CoPurchaseHarness.java"
    harness.write_text("""
import java.util.*;
import java.nio.charset.StandardCharsets;

public class CoPurchaseHarness {
    public static void main(String[] args) {
        var analyzer = new CoPurchaseAnalyzer();
        Scanner input = new Scanner(System.in, StandardCharsets.UTF_8);
        int cases = input.nextInt();
        for (int test = 0; test < cases; test++) {
            int count = input.nextInt();
            List<List<String>> baskets = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                int size = input.nextInt();
                List<String> basket = new ArrayList<>();
                for (int j = 0; j < size; j++) basket.add(input.next());
                baskets.add(basket);
            }
            var before = baskets.stream().map(List::copyOf).toList();
            var result = analyzer.mostCoPurchased(baskets);
            if (!baskets.equals(before)) throw new AssertionError("Input was mutated");
            if (!analyzer.mostCoPurchased(List.of()).isEmpty()) {
                throw new AssertionError("Calls share state");
            }
            System.out.println(result.size());
            for (var entry : result.entrySet()) {
                System.out.println(entry.getKey() + " "
                    + (entry.getValue() == null ? "NONE" : entry.getValue()));
            }
        }
        for (var invalid : List.of(
                Arrays.<List<String>>asList((List<String>) null),
                List.of(Arrays.asList("a", null)), List.of(List.of("")))) {
            try {
                analyzer.mostCoPurchased(invalid);
                throw new AssertionError("Invalid input was accepted");
            } catch (IllegalArgumentException | NullPointerException expected) { }
        }
        try {
            analyzer.mostCoPurchased(null);
            throw new AssertionError("Null input was accepted");
        } catch (NullPointerException expected) { }
    }
}
""")
    subprocess.run([javac, "--release", "17", "-encoding", "UTF-8", str(source), str(harness)],
                   check=True, capture_output=True, text=True, timeout=30)
    return java, directory


def test_python_main_matches_published_output(capsys):
    MODULE.main()
    assert capsys.readouterr().out.splitlines() == EXPECTED_OUTPUT


def test_java_main_matches_published_output(java_program):
    java, directory = java_program
    result = subprocess.run([java, "-cp", str(directory), "CoPurchaseAnalyzer"],
                            check=True, capture_output=True, text=True, timeout=15)
    assert result.stdout.splitlines() == EXPECTED_OUTPUT
    assert result.stderr == ""


def test_python_matches_oracle_without_mutation_or_shared_state():
    analyzer = MODULE.CoPurchaseAnalyzer()
    for baskets in cases():
        before = deepcopy(baskets)
        assert analyzer.most_co_purchased(baskets) == oracle(baskets), baskets
        assert baskets == before
        assert analyzer.most_co_purchased([]) == {}


def test_java_matches_oracle_without_mutation_or_shared_state(java_program):
    java, directory = java_program
    inputs = list(cases())
    tokens = [str(len(inputs))]
    for baskets in inputs:
        tokens.append(str(len(baskets)))
        for basket in baskets:
            tokens.extend([str(len(basket)), *basket])
    process = subprocess.run(
        [java, "-Dfile.encoding=UTF-8", "-cp", str(directory), "CoPurchaseHarness"],
        input="\n".join(tokens), check=True, capture_output=True, text=True,
        encoding="utf-8", timeout=30,
    )
    lines = iter(process.stdout.splitlines())
    for baskets in inputs:
        result = {}
        for _ in range(int(next(lines))):
            item, partner = next(lines).split()
            result[item] = None if partner == "NONE" else partner
        assert result == oracle(baskets), baskets
    assert list(lines) == []
    assert process.stderr == ""


@pytest.mark.parametrize("invalid", [None, [None], [[None]], [[""]], [[1]]])
def test_python_rejects_invalid_input(invalid):
    with pytest.raises(ValueError):
        MODULE.CoPurchaseAnalyzer().most_co_purchased(invalid)


def test_basket_and_item_order_cannot_change_ties():
    analyzer = MODULE.CoPurchaseAnalyzer()
    baskets = [["z", "b", "a"], ["a", "z"], ["b", "z"]]
    expected = oracle(baskets)
    rng = random.Random(8831)
    for _ in range(100):
        rng.shuffle(baskets)
        for basket in baskets:
            rng.shuffle(basket)
        assert analyzer.most_co_purchased(baskets) == expected


def test_article_contract_and_code_are_english_and_generic():
    assert "## Problem\n" in TEXT
    assert "English translation" not in TEXT
    assert "not a universal lower bound" in TEXT
    assert len(re.findall(r"```java\n", TEXT)) == 1
    assert len(re.findall(r"```python\n", TEXT)) == 1
    assert not re.search(r"[\u3400-\u9fff]", JAVA_SOURCE + PYTHON_SOURCE)
