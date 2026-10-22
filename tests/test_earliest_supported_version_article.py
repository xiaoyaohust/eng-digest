"""Execute the article's exact solutions against independent linear oracles."""

from itertools import product
from pathlib import Path
import random
import re
import shutil
import subprocess
import sys
import types

import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/coding/earliest-supported-library-version.md"
TEXT = ARTICLE.read_text()
PYTHON_SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
JAVA_SOURCE = re.search(r"```java\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXPECTED = re.search(r"```text\n(.*?)\n```", TEXT.split("## Expected output\n")[1], re.DOTALL).group(1).splitlines()
MODULE = types.ModuleType("earliest_supported_version_article")
sys.modules[MODULE.__name__] = MODULE
exec(compile(PYTHON_SOURCE, str(ARTICLE), "exec"), MODULE.__dict__)


def numeric(text):
    parts = [int(part.lstrip("0") or "0") for part in text.split(".")]
    return tuple(parts + [0] * (3 - len(parts)))


def oracle(catalog, values):
    return next((".".join(map(str, numeric(text))) for text, value in zip(catalog, values) if value), None)


def call_bound(catalog, values):
    if not catalog:
        return 0
    keys = [numeric(text) for text in catalog]
    majors = len({key[0] for key in keys})
    first = next((key for key, value in zip(keys, values) if value), None)
    if first is None:
        return majors.bit_length()
    minors = len({key[1] for key in keys if key[0] == first[0]})
    patches = sum(key[:2] == first[:2] for key in keys)
    return majors.bit_length() + minors.bit_length() + patches.bit_length()


def cases():
    yield [], []
    yield ["7"], [False]
    yield ["7"], [True]
    yield ["1.0.0", "1.0.1", "1.1.0", "1.1.1", "1.1.2", "2.0.0", "2.0.1"], [False, True, False, False, True, False, True]
    yield ["11.9.9", "12", "12.0.9", "12.3", "12.3.1", "13"], [False, True, True, False, True, True]
    yield ["9223372036854775807.0.0", "9223372036854775807.1.0"], [False, True]
    yield ["0" * 6000 + "1.0.0", "1.0.1"], [False, True]

    # Exhaust all support assignments in a tiny complete hierarchy, retaining
    # exactly those that satisfy patch, minor-existence, and major-existence monotonicity.
    catalog = [f"{major}.{minor}.{patch}" for major in (1, 4) for minor in (0, 7) for patch in (0, 9)]
    for values in product((False, True), repeat=len(catalog)):
        if any(values[index] and not values[index + 1] for index in range(0, 8, 2)):
            continue
        minor_exists = [any(values[index:index + 2]) for index in range(0, 8, 2)]
        if any(minor_exists[index] and not minor_exists[index + 1] for index in (0, 2)):
            continue
        if any(values[:4]) and not any(values[4:]):
            continue
        yield catalog, list(values)

    rng = random.Random(20261021)
    for _ in range(650):
        major_numbers = sorted(rng.sample(range(40), rng.randrange(1, 10)))
        first_major = rng.randrange(len(major_numbers) + 1)
        catalog, values = [], []
        for major_position, major in enumerate(major_numbers):
            minor_numbers = sorted(rng.sample(range(30), rng.randrange(1, 7)))
            first_minor = (len(minor_numbers) if major_position < first_major
                           else rng.randrange(len(minor_numbers)))
            for minor_position, minor in enumerate(minor_numbers):
                patches = sorted(rng.sample(range(40), rng.randrange(1, 10)))
                first_patch = (len(patches) if minor_position < first_minor
                               else rng.randrange(len(patches)))
                for patch_position, patch in enumerate(patches):
                    components = [str(major), str(minor), str(patch)]
                    if patch == 0 and rng.random() < 0.5:
                        components.pop()
                        if minor == 0 and rng.random() < 0.5:
                            components.pop()
                    text = ".".join("0" * rng.randrange(3) + component for component in components)
                    catalog.append(text)
                    values.append(patch_position >= first_patch)
        yield catalog, values

    # A large patch group must not turn the last stage into a linear API scan.
    catalog = [f"5.7.{patch}" for patch in range(10001)]
    yield catalog, [patch >= 9876 for patch in range(len(catalog))]
    # Many majors, and many minors, exercise the other two boundary searches.
    yield [f"{major}.0.0" for major in range(4097)], [major >= 3900 for major in range(4097)]
    yield [f"9.{minor}.0" for minor in range(4097)], [minor >= 3900 for minor in range(4097)]


@pytest.fixture(scope="module")
def java_program(tmp_path_factory):
    java, javac = shutil.which("java"), shutil.which("javac")
    if not java or not javac:
        pytest.skip("A JDK is required to compile the published example")
    directory = tmp_path_factory.mktemp("earliest_version_java")
    source = directory / "EarliestSupportedVersion.java"
    source.write_text(JAVA_SOURCE)
    harness = directory / "VersionHarness.java"
    harness.write_text(r"""
import java.util.*;

public class VersionHarness {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        var solver = new EarliestSupportedVersion();
        int cases = scanner.nextInt();
        for (int number = 0; number < cases; number++) {
            int size = scanner.nextInt();
            List<String> catalog = new ArrayList<>();
            Map<String, Boolean> values = new HashMap<>();
            for (int i = 0; i < size; i++) {
                String text = scanner.next();
                catalog.add(text);
                values.put(text, scanner.nextInt() == 1);
            }
            Set<String> seen = new HashSet<>();
            String result = solver.findEarliestSupported(catalog, text -> {
                if (!values.containsKey(text)) throw new AssertionError("Probed an unpublished version");
                if (!seen.add(text)) throw new AssertionError("Repeated an expensive API probe");
                return values.get(text);
            });
            System.out.println(result + "|" + seen.size());
        }

        // Invalid catalogs are rejected completely before any support probe.
        var badCatalogs = new ArrayList<List<String>>();
        badCatalogs.addAll(List.of(
                List.of("12", "12.0.0"), List.of("2.0.0", "1.9.9"),
                List.of("1.0.0", "1.0.0"), List.of("1", "1.0.1", "1..2"),
                List.of(""), List.of("1."), List.of(".1"), List.of("1.2.3.4"),
                List.of(" 1"), List.of("1\n"), List.of("+1"), List.of("-1"),
                List.of("1.0.0-alpha"), List.of("1.0.0+build"), List.of("\u0661.0.0"),
                List.of("9223372036854775808.0.0"), List.of("1.9223372036854775808.0"),
                List.of("1.0.9223372036854775808"), List.of("9".repeat(6000))));
        badCatalogs.add(Arrays.asList((String) null));
        for (var catalog : badCatalogs) {
            try {
                solver.findEarliestSupported(catalog, text -> {
                    throw new AssertionError("Validation must precede API calls");
                });
                throw new AssertionError("Expected validation failure");
            } catch (IllegalArgumentException expected) { }
        }

        // An API failure stays an API failure; the next search starts without stale cache.
        try {
            solver.findEarliestSupported(List.of("1"), text -> { throw new IllegalStateException("unavailable"); });
            throw new AssertionError("Expected checker failure");
        } catch (IllegalStateException expected) { }
        if (!solver.findEarliestSupported(List.of("1"), text -> true).equals("1.0.0")) {
            throw new AssertionError("Fresh search failed");
        }
    }
}
""")
    subprocess.run([javac, "--release", "17", str(source), str(harness)],
                   check=True, capture_output=True, text=True, timeout=30)
    return java, directory


def test_python_main_matches_published_output(capsys):
    MODULE.main()
    assert capsys.readouterr().out.splitlines() == EXPECTED


def test_java_main_matches_published_output(java_program):
    java, directory = java_program
    completed = subprocess.run([java, "-cp", str(directory), "EarliestSupportedVersion"],
                               check=True, capture_output=True, text=True, timeout=20)
    assert completed.stdout.splitlines() == EXPECTED
    assert completed.stderr == ""


def test_python_matches_linear_oracle_and_logarithmic_call_bound():
    solver = MODULE.EarliestSupportedVersion()
    for catalog, values in cases():
        known = dict(zip(catalog, values))
        seen = set()

        def checker(text):
            assert text in known, "Only supplied release strings can be probed"
            assert text not in seen, "Both true and false results must be cached"
            seen.add(text)
            return known[text]

        assert solver.find_earliest_supported(catalog, checker) == oracle(catalog, values)
        assert len(seen) <= call_bound(catalog, values)


def test_java_matches_linear_oracle_and_logarithmic_call_bound(java_program):
    java, directory = java_program
    entries = list(cases())
    lines = [str(len(entries))]
    for catalog, values in entries:
        lines.append(str(len(catalog)))
        lines.extend(f"{text} {int(value)}" for text, value in zip(catalog, values))
    completed = subprocess.run([java, "-cp", str(directory), "VersionHarness"],
                               input="\n".join(lines), check=True, capture_output=True, text=True, timeout=30)
    rows = completed.stdout.splitlines()
    assert len(rows) == len(entries)
    assert completed.stderr == ""
    for row, (catalog, values) in zip(rows, entries):
        actual, calls = row.split("|")
        expected = oracle(catalog, values)
        assert actual == ("null" if expected is None else expected)
        assert int(calls) <= call_bound(catalog, values)


@pytest.mark.parametrize("catalog", [
    ["12", "12.0.0"], ["2.0.0", "1.9.9"], ["1.0.0", "1.0.0"],
    ["1", "1.0.1", "1..2"], [""], ["1."], [".1"], ["1.2.3.4"], [" 1"], ["1\n"],
    ["+1"], ["-1"], ["1.0.0-alpha"], ["1.0.0+build"], ["\u0661.0.0"], [None],
    ["9223372036854775808.0.0"], ["1.9223372036854775808.0"],
    ["1.0.9223372036854775808"], ["9" * 6000],
])
def test_invalid_catalogs_never_spend_api_calls(catalog):
    def forbidden_probe(_):
        pytest.fail("Validation must complete before any API probe")

    with pytest.raises(ValueError):
        MODULE.EarliestSupportedVersion().find_earliest_supported(catalog, forbidden_probe)


def test_checker_failures_propagate_and_cache_is_per_search():
    solver = MODULE.EarliestSupportedVersion()

    def failure(_):
        raise RuntimeError("checker unavailable")

    with pytest.raises(RuntimeError, match="checker unavailable"):
        solver.find_earliest_supported(["1"], failure)
    assert solver.find_earliest_supported(["1"], lambda _: True) == "1.0.0"
    assert solver.find_earliest_supported(["1"], lambda _: False) is None


def test_article_states_guarantees_and_uses_english_only_code():
    assert "## Problem\n" in TEXT
    assert "English translation" not in TEXT
    assert "They cannot be established by observing a few successful tests" in TEXT
    assert "project-specific numeric format" in TEXT
    assert not re.search(r"[\u3400-\u9fff]", PYTHON_SOURCE + JAVA_SOURCE)
