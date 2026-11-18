"""Execute the published Java/Python code against a raw-history, exact-rational oracle."""

from fractions import Fraction
import math
from pathlib import Path
import random
import re
import shutil
import subprocess
import sys
import types

import pytest


ROOT = Path(__file__).resolve().parents[1]
SLUG = "user-log-qualification-and-purchase-trust-scores"
ENGLISH = (ROOT / f"site/src/content/coding/{SLUG}.md").read_text()
CHINESE = (ROOT / f"site/src/content/translations/coding/{SLUG}.md").read_text()


def code(text, language):
    return re.search(r"```" + language + r"\n(.*?)\n```", text, re.S).group(1)


EXPECTED = code(ENGLISH.split("## Expected output\n", 1)[1], "text")
MODULE = types.ModuleType("user_log_trust_score_article")
sys.modules[MODULE.__name__] = MODULE
exec(compile(code(ENGLISH, "python"), SLUG, "exec"), MODULE.__dict__)


def cases():
    default = (50, 50, 1, 10, 10)
    yield ["d1", "d2"], 2, default, [
        ("Q",), ("S", "new", "phone", 100),
        ("R", "d1", "u", "phone", 10000),
        ("R", "d1", "u", "phone", 10000), ("Q",),
        ("R", "d1", "u", "web", 20000), ("Q",),
        ("R", "d2", "u", "phone", 10000), ("Q",), ("Q",),
        ("S", "u", "web", 22000), ("S", "u", "web", 22001),
        ("S", "u", "web", 8000), ("S", "u", "store", 25000),
        ("S", "u", "store", 25000),
        ("R", "later", "u", "store", 25000),
        ("S", "u", "store", 25000),
        ("R", "d1", "v", "web", 8000), ("R", "d2", "v", "web", 8000),
        ("R", "later", "v", "phone", 9000), ("Q",),
        ("S", "v", "phone", 9000), ("S", "u", "web", 0),
        ("R", "d2", "v", "app", 0), ("Q",),
        ("S", "u", "web", -1), ("S", "u", "store", 1000000000),
    ]
    rng = random.Random(20261117)
    policies = [default, (20, 30, 1, 20, 7), (0, 0, 1, 3, 2),
                (8, 12, 3, 2, 4), (50, 50, 1, (1 << 63) - 1, 10),
                ((1 << 31) - 1, 0, 1, 10, 1)]
    amounts = [1, 99, 10000, 20000, 22000, 22001,
               10**18, 2 * 10**18, 2200000000000000000,
               2200000000000000001, (1 << 63) - 1]
    for _ in range(120):
        days = [f"d{i}" for i in range(rng.randrange(1, 5))]
        threshold = rng.randrange(1, 6)
        operations = [("Q",)]
        previous = None
        for _ in range(35):
            user, order_type = f"u{rng.randrange(7)}", f"type{rng.randrange(8)}"
            amount = rng.choice(amounts) if rng.randrange(3) == 0 else rng.randrange(1, 30001)
            entry = previous if previous and rng.randrange(5) == 0 else (
                "R", rng.choice(days + ["later"]), user, order_type, amount)
            operations.extend([("S", entry[2], entry[3], entry[4]), entry,
                               ("S", entry[2], entry[3], entry[4]), ("Q",)])
            previous = entry
        yield days, threshold, rng.choice(policies), operations


def oracle(case):
    required, threshold, policy, operations = case
    history, qualified, output = [], [], []
    type_points, amount_points, step_num, step_den, deduction = policy
    for operation in operations:
        if operation[0] == "R":
            _, day, user, order_type, amount = operation
            if amount <= 0:
                output.append("E")
                continue
            history.append((day, user, order_type, amount))
            selected = [row for row in history if row[1] == user and row[0] in required]
            if (set(required) <= {row[0] for row in selected}
                    and len({row[2] for row in selected}) >= threshold
                    and user not in qualified):
                qualified.append(user)
        elif operation[0] == "Q":
            output.append("Q:" + ",".join(qualified))
        else:
            _, user, order_type, amount = operation
            if amount <= 0:
                output.append("E")
                continue
            previous = [row for row in history if row[1] == user]
            if not previous:
                output.append("S:0")
                continue
            low, high = min(row[3] for row in previous), max(row[3] for row in previous)
            type_score = type_points if any(row[2] == order_type for row in previous) else 0
            amount_score = amount_points
            if not low <= amount <= high:
                boundary = low if amount < low else high
                bands = Fraction(abs(amount - boundary), boundary) / Fraction(step_num, step_den)
                amount_score = max(0, amount_points - math.ceil(bands) * deduction)
            output.append(f"S:{type_score + amount_score}")
    return output


def python_trace(case):
    days, threshold, policy, operations = case
    analyzer = MODULE.PurchaseAnalyzer(days, threshold, MODULE.ScoringPolicy(*policy))
    output = []
    for operation in operations:
        try:
            if operation[0] == "R":
                analyzer.record(MODULE.LogEntry(*operation[1:]))
            elif operation[0] == "S":
                output.append(f"S:{analyzer.score(*operation[1:])}")
            else:
                result = analyzer.qualified_users()
                output.append("Q:" + ",".join(result))
                result.clear()
        except ValueError:
            output.append("E")
    return output


def test_python_streams_match_raw_history_oracle():
    for case in cases():
        assert python_trace(case) == oracle(case)


def test_both_translations_publish_identical_code_and_output(capsys):
    for language in ("java", "python"):
        assert code(ENGLISH, language) == code(CHINESE, language)
        assert not re.search(r"[\u3400-\u9fff]", code(ENGLISH, language))
    MODULE.main()
    assert capsys.readouterr().out.replace("'", "").strip() == EXPECTED.strip()


@pytest.mark.parametrize("changes", [
    {"type_points": -1}, {"amount_points": -1}, {"step_numerator": 0},
    {"step_denominator": 0}, {"points_per_step": 0}, {"step_numerator": 0.1},
])
def test_python_rejects_undefined_scoring_parameters(changes):
    config = dict(type_points=50, amount_points=50, step_numerator=1,
                  step_denominator=10, points_per_step=10)
    config.update(changes)
    with pytest.raises(ValueError):
        MODULE.ScoringPolicy(**config)


def test_configuration_copy_and_invalid_record_leave_state_unchanged():
    days = {"d1", "d2"}
    analyzer = MODULE.PurchaseAnalyzer(days, 2, MODULE.ScoringPolicy(50, 50, 1, 10, 10))
    days.clear()
    analyzer.record(MODULE.LogEntry("d1", "u", "a", 100))
    analyzer.record(MODULE.LogEntry("d2", "u", "b", 200))
    assert analyzer.qualified_users() == ["u"]
    for amount in (0, -1, 1.5, True):
        with pytest.raises(ValueError):
            analyzer.record(MODULE.LogEntry("d1", "u", "new", amount))
    assert analyzer.score("u", "new", 150) == 50
    assert analyzer.score("u", "a", 201) == 90


@pytest.fixture(scope="module")
def java_program(tmp_path_factory):
    if not shutil.which("javac") or not shutil.which("java"):
        pytest.skip("A JDK is needed to execute the published Java solution")
    directory = tmp_path_factory.mktemp("purchase_analyzer_java")
    (directory / "PurchaseAnalyzer.java").write_text(code(ENGLISH, "java"))
    (directory / "PurchaseHarness.java").write_text("""
import java.util.*;
public class PurchaseHarness {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int count = input.nextInt();
        for (int test = 0; test < count; test++) {
            int dayCount = input.nextInt(), threshold = input.nextInt();
            var days = new HashSet<String>();
            for (int d = 0; d < dayCount; d++) days.add(input.next());
            var policy = new PurchaseAnalyzer.ScoringPolicy(input.nextInt(), input.nextInt(),
                    input.nextLong(), input.nextLong(), input.nextInt());
            var analyzer = new PurchaseAnalyzer(days, threshold, policy);
            days.clear();
            int commands = input.nextInt();
            for (int i = 0; i < commands; i++) {
                String operation = input.next();
                try {
                    if (operation.equals("R")) {
                        analyzer.record(new PurchaseAnalyzer.LogEntry(
                                input.next(), input.next(), input.next(), input.nextLong()));
                    } else if (operation.equals("S")) {
                        System.out.println("S:" + analyzer.score(
                                input.next(), input.next(), input.nextLong()));
                    } else {
                        var ids = analyzer.qualifiedUsers();
                        System.out.println("Q:" + String.join(",", ids));
                        ids.clear();
                    }
                } catch (IllegalArgumentException exception) {
                    System.out.println("E");
                }
            }
        }
    }
}
""")
    subprocess.run(["javac", "--release", "17", str(directory / "PurchaseAnalyzer.java"),
                    str(directory / "PurchaseHarness.java")],
                   check=True, capture_output=True, text=True, timeout=40)
    return directory


def test_java_main_matches_published_output(java_program):
    result = subprocess.run(["java", "-cp", str(java_program), "PurchaseAnalyzer"],
                            check=True, capture_output=True, text=True, timeout=20)
    assert result.stdout.strip() == EXPECTED.strip()


def test_java_streams_match_raw_history_oracle(java_program):
    examples = list(cases())
    lines, expected = [str(len(examples))], []
    for days, threshold, policy, operations in examples:
        lines.append(f"{len(days)} {threshold} " + " ".join(days))
        lines.append(" ".join(map(str, policy)))
        lines.append(str(len(operations)))
        lines.extend(" ".join(map(str, operation)) for operation in operations)
        expected.extend(oracle((days, threshold, policy, operations)))
    result = subprocess.run(["java", "-cp", str(java_program), "PurchaseHarness"],
                            input="\n".join(lines), check=True, capture_output=True,
                            text=True, timeout=40)
    assert result.stdout.splitlines() == expected
