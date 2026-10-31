"""Execute the policy comparison printed in the AI task definition lesson."""

import contextlib
import io
from pathlib import Path
import re

import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/defining-goals-inputs-outputs-and-constraints.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "task_definition_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
LABELS = [1, 0, 1, 0, 1, 0]
POLICIES = [[0] * 6, [1, 0, 0, 0, 0, 0], [1, 1, 1, 0, 0, 0], [1, 1, 0, 0, 0, 0]]


def test_published_output_matches_execution():
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)


@pytest.mark.parametrize("index,correct,alerts,fp,fn,cost,feasible", [
    (0, 3, 0, 0, 3, 15, True), (1, 4, 1, 0, 2, 10, True),
    (2, 4, 3, 1, 1, 6, False), (3, 3, 2, 1, 2, 11, True),
])
def test_example_counts_and_capacity(index, correct, alerts, fp, fn, cost, feasible):
    labels, decisions = list(LABELS), list(POLICIES[index])
    assert EXAMPLE["evaluate_policy"](labels, decisions, 2) == {
        "correct": correct, "alerts": alerts, "fp": fp, "fn": fn,
        "cost": cost, "feasible": feasible,
    }
    assert labels == LABELS and decisions == POLICIES[index]


def test_exercise_costs_and_changed_capacity():
    results = [EXAMPLE["evaluate_policy"](LABELS, decisions, 3) for decisions in POLICIES]
    assert all(result["feasible"] for result in results)
    assert [result["cost"] for result in results] == [15, 10, 6, 11]
    changed = [EXAMPLE["evaluate_policy"](LABELS, decisions, 3, false_alarm_cost=6)["cost"]
               for decisions in POLICIES]
    assert changed == [15, 10, 11, 16]


def test_arbitrary_size_zero_costs_and_zero_capacity():
    result = EXAMPLE["evaluate_policy"]([1, 0], [1, 0], 0, miss_cost=0, false_alarm_cost=0)
    assert result == {"correct": 2, "alerts": 1, "fp": 0, "fn": 0, "cost": 0, "feasible": False}
    assert EXAMPLE["evaluate_policy"]([0], [0], 0)["feasible"] is True


@pytest.mark.parametrize("labels,decisions,capacity", [
    ([], [], 2), ([1], [], 2), ([True], [1], 2), ([1], [False], 2),
    ([2], [1], 2), ([1], [0.0], 2), ([1], [1], -1), ([1], [1], True),
    ([1], [1], 1.5), ([1], [1], "2"),
])
def test_invalid_labels_decisions_and_capacity(labels, decisions, capacity):
    with pytest.raises(ValueError):
        EXAMPLE["evaluate_policy"](labels, decisions, capacity)


@pytest.mark.parametrize("costs", [
    {"miss_cost": -1}, {"false_alarm_cost": float("nan")},
    {"miss_cost": float("inf")}, {"false_alarm_cost": True}, {"miss_cost": "5"},
])
def test_invalid_costs(costs):
    with pytest.raises(ValueError):
        EXAMPLE["evaluate_policy"]([1], [1], 2, **costs)
