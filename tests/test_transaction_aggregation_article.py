"""Compile and execute the published solutions against a separate grouping oracle."""

from copy import deepcopy
from pathlib import Path
import random
import re
import shutil
import subprocess
import types

import pytest


ARTICLE = (Path(__file__).resolve().parents[1]
           / "site/src/content/coding/aggregate-transactions-by-merchant-and-hour.md")
TEXT = ARTICLE.read_text()
PYTHON_SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
JAVA_SOURCE = re.search(r"```java\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXPECTED_OUTPUT = re.search(r"```text\n(.*?)\n```", TEXT.split("## Expected output\n", 1)[1],
                            re.DOTALL).group(1).splitlines()
MODULE = types.ModuleType("transaction_aggregation_article")
exec(compile(PYTHON_SOURCE, str(ARTICLE), "exec"), MODULE.__dict__)
INT_MIN, INT_MAX = -(1 << 31), (1 << 31) - 1


def oracle(rows, now, window):
    """Rescan eligible rows for every distinct merchant/hour pair."""
    eligible = [row for row in rows if row[2] == "COMPLETED"
                and row[3] <= now and 0 <= row[4] < window]
    pairs = {(row[1], row[4]) for row in eligible}
    result = {}
    for merchant, hour in pairs:
        total = sum(row[0] for row in eligible if row[1] == merchant and row[4] == hour)
        if not INT_MIN <= total <= INT_MAX:
            raise OverflowError
        result.setdefault(merchant, {})[str(hour)] = total
    return result


def cases():
    # Rows are (amount, merchant, status, timestamp, supplied hour difference).
    yield [], 100, 24
    yield [(100, "m1", "COMPLETED", 90, 1), (50, "m1", "COMPLETED", 90, 1),
           (70, "m1", "PENDING", 80, 2), (30, "m2", "COMPLETED", 50, 5)], 100, 24
    yield [(10, "m1", "COMPLETED", 100, 0), (20, "m1", "COMPLETED", 77, 23),
           (999, "m1", "COMPLETED", 76, 24), (999, "m1", "COMPLETED", 101, 0),
           (999, "m2", "FAILED", 100, 0), (999, "m2", "CANCELLED", 100, 0),
           (999, "m3", "COMPLETED", 99, -1)], 100, 24
    yield [(100, "m1", "COMPLETED", 90, 1), (-100, "m1", "COMPLETED", 90, 1),
           (0, "m2", "COMPLETED", 80, 2)], 100, 24
    yield [(INT_MAX, "m1", "COMPLETED", 100, 0), (1, "m1", "COMPLETED", 100, 0),
           (-1, "m1", "COMPLETED", 100, 0)], 100, 24
    yield [(INT_MIN, "m1", "COMPLETED", 100, 0), (-1, "m1", "COMPLETED", 100, 0),
           (1, "m1", "COMPLETED", 100, 0)], 100, 24
    yield [(INT_MAX, "m1", "COMPLETED", 100, 0), (1, "m1", "COMPLETED", 100, 0)], 100, 24
    yield [(INT_MIN, "m1", "COMPLETED", 100, 0), (-1, "m1", "COMPLETED", 100, 0)], 100, 24
    yield [(5, "m1", "COMPLETED", 100, 0), (7, "m1", "COMPLETED", 90, 2),
           (9, "m1", "COMPLETED", 80, 3)], 100, 3
    yield [(7, "m1", "COMPLETED", 100, 999_999_999)], 100, 1_000_000_000
    yield [(7, "m1", "COMPLETED", 100, (1 << 63) - 1)], 100, 24
    # Generated helper values are opaque fixture responses, never recomputed by a solution.
    rng = random.Random(20261108)
    statuses = ["COMPLETED", "PENDING", "FAILED", "CANCELLED"]
    for _ in range(700):
        now, window = 1_000_000, rng.choice([1, 2, 3, 24, 37, 1000])
        rows = []
        hours = {}
        for _ in range(rng.randrange(45)):
            start = rng.randrange(now - 100, now + 10)
            hour = hours.setdefault(start, rng.randrange(-2, window + 3))
            amount = rng.choice([rng.randrange(-1000, 1001), 0, INT_MIN, INT_MAX])
            rows.append((amount, rng.choice(["m1", "m2", "m10", "merchant-z"]),
                         rng.choice(statuses), start, hour))
        yield rows, now, window
        yield list(reversed(rows)), now, window


@pytest.fixture(scope="module")
def java_program(tmp_path_factory):
    javac, java = shutil.which("javac"), shutil.which("java")
    if not javac or not java:
        pytest.skip("A JDK is required to compile the published Java solution")
    directory = tmp_path_factory.mktemp("transaction_aggregation_java")
    source = directory / "TransactionAggregator.java"
    source.write_text(JAVA_SOURCE)
    harness = directory / "TransactionHarness.java"
    harness.write_text("""
import java.util.*;

public class TransactionHarness {
    public static void main(String[] args) {
        var aggregator = new TransactionAggregator();
        Scanner input = new Scanner(System.in);
        int cases = input.nextInt();
        for (int test = 0; test < cases; test++) {
            int count = input.nextInt(), window = input.nextInt();
            long now = input.nextLong();
            List<TransactionAggregator.Transaction> rows = new ArrayList<>();
            Map<Long, Long> hours = new HashMap<>();
            for (int i = 0; i < count; i++) {
                int amount = input.nextInt();
                String merchant = input.next();
                var status = TransactionAggregator.Status.valueOf(input.next());
                long start = input.nextLong(), diff = input.nextLong();
                rows.add(new TransactionAggregator.Transaction(amount, merchant, status, "user", start));
                hours.put(start, diff);
            }
            var before = List.copyOf(rows);
            int[] calls = {0};
            TransactionAggregator.HourDifference helper = (current, start) -> {
                if (current != now) throw new AssertionError("Report time changed");
                calls[0]++;
                return hours.get(start);
            };
            try {
                var result = aggregator.aggregate(rows, now, window, helper);
                System.out.println("OK " + result.size());
                for (var merchant : result.entrySet()) {
                    System.out.println(merchant.getKey() + " " + merchant.getValue().size());
                    for (var bucket : merchant.getValue().entrySet()) {
                        System.out.println(bucket.getKey() + " " + bucket.getValue());
                    }
                }
            } catch (ArithmeticException expected) {
                System.out.println("OVERFLOW");
            }
            System.out.println("CALLS " + calls[0]);
            if (!rows.equals(before)) throw new AssertionError("Input changed");
            if (!aggregator.aggregate(List.of(), now, window, helper).isEmpty()) {
                throw new AssertionError("Calls share state");
            }
        }
        for (int window : new int[]{0, -1}) {
            try {
                aggregator.aggregate(List.of(), 100, window, (now, start) -> 0L);
                throw new AssertionError("Invalid window accepted");
            } catch (IllegalArgumentException expected) { }
        }
        try {
            aggregator.aggregate(null, 100, 24, (now, start) -> 0L);
            throw new AssertionError("Null input accepted");
        } catch (NullPointerException expected) { }
        try {
            aggregator.aggregate(List.of(), 100, 24, null);
            throw new AssertionError("Missing helper accepted");
        } catch (NullPointerException expected) { }
        for (String merchant : new String[]{null, ""}) {
            try {
                aggregator.aggregate(List.of(new TransactionAggregator.Transaction(
                    1, merchant, TransactionAggregator.Status.COMPLETED, "user", 100)),
                    100, 24, (now, start) -> 0L);
                throw new AssertionError("Invalid eligible merchant accepted");
            } catch (IllegalArgumentException expected) { }
        }
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
    completed = subprocess.run([java, "-cp", str(directory), "TransactionAggregator"],
                               check=True, capture_output=True, text=True, timeout=15)
    assert completed.stdout.splitlines() == EXPECTED_OUTPUT
    assert completed.stderr == ""


def test_python_matches_oracle_without_mutation_and_calls_supplied_helper_once():
    aggregator = MODULE.TransactionAggregator()
    for rows, now, window in cases():
        objects = [MODULE.Transaction(amount, merchant, MODULE.Status[status], "user", start)
                   for amount, merchant, status, start, _ in rows]
        before = deepcopy(objects)
        hours = {row[3]: row[4] for row in rows}
        calls = []

        def helper(current, start):
            assert current == now
            calls.append(start)
            return hours[start]

        try:
            expected = oracle(rows, now, window)
        except OverflowError:
            with pytest.raises(OverflowError):
                aggregator.aggregate(objects, now, window, helper)
        else:
            assert aggregator.aggregate(objects, now, window, helper) == expected
        assert calls == [row[3] for row in rows if row[2] == "COMPLETED" and row[3] <= now]
        assert objects == before
        assert aggregator.aggregate([], now, window, helper) == {}


def test_java_matches_oracle_and_preserves_helper_contract(java_program):
    java, directory = java_program
    inputs = list(cases())
    tokens = [str(len(inputs))]
    for rows, now, window in inputs:
        tokens.append(f"{len(rows)} {window} {now}")
        tokens.extend(f"{amount} {merchant} {status} {start} {hour}"
                      for amount, merchant, status, start, hour in rows)
    completed = subprocess.run([java, "-cp", str(directory), "TransactionHarness"],
                               input="\n".join(tokens), check=True, capture_output=True,
                               text=True, timeout=30)
    lines = iter(completed.stdout.splitlines())
    for rows, now, window in inputs:
        header = next(lines)
        try:
            expected = oracle(rows, now, window)
        except OverflowError:
            assert header == "OVERFLOW"
        else:
            result = {}
            kind, merchants = header.split()
            assert kind == "OK"
            for _ in range(int(merchants)):
                merchant, count = next(lines).split()
                result[merchant] = {}
                for _ in range(int(count)):
                    key, value = next(lines).split()
                    result[merchant][key] = int(value)
            assert result == expected
        expected_calls = sum(row[2] == "COMPLETED" and row[3] <= now for row in rows)
        assert next(lines) == f"CALLS {expected_calls}"
    assert list(lines) == []
    assert completed.stderr == ""


@pytest.mark.parametrize("window", [0, -1, True, 2.5, "24"])
def test_python_rejects_invalid_windows(window):
    with pytest.raises(ValueError):
        MODULE.TransactionAggregator().aggregate([], 100, window, lambda now, start: 0)


@pytest.mark.parametrize("rows,helper", [(None, lambda now, start: 0), ([], None), ([None], lambda now, start: 0)])
def test_python_rejects_missing_dependencies(rows, helper):
    with pytest.raises(ValueError):
        MODULE.TransactionAggregator().aggregate(rows, 100, 24, helper)


@pytest.mark.parametrize("merchant,amount", [(None, 1), ("", 1), (1, 1), ("m1", True),
                                            ("m1", 1.5), ("m1", INT_MAX + 1)])
def test_python_rejects_invalid_eligible_fields(merchant, amount):
    row = MODULE.Transaction(amount, merchant, MODULE.Status.COMPLETED, "user", 100)
    with pytest.raises(ValueError):
        MODULE.TransactionAggregator().aggregate([row], 100, 24, lambda now, start: 0)


def test_python_rejects_noninteger_helper_result():
    row = MODULE.Transaction(5, "m1", MODULE.Status.COMPLETED, "user", 100)
    with pytest.raises(ValueError):
        MODULE.TransactionAggregator().aggregate([row], 100, 24, lambda now, start: 0.5)
