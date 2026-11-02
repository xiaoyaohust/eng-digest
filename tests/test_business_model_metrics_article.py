"""Execute the published scorecard and verify its arithmetic and boundary cases."""

import contextlib
import io
from pathlib import Path
import re

import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/business-metrics-and-model-metrics.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "business_model_metrics_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
EVALUATE = EXAMPLE["evaluate_counts"]
A = (60, 10, 40, 890)
B = (90, 50, 10, 850)


def test_published_output_matches_actual_execution():
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)


def test_same_population_and_competing_rankings():
    assert sum(A) == sum(B) == 1000
    assert A[0] + A[2] == B[0] + B[2] == 100
    a = EVALUATE(*A, 20, 1, 150)
    b = EVALUATE(*B, 20, 1, 150)
    assert a["accuracy"] == pytest.approx(0.95)
    assert b["accuracy"] == pytest.approx(0.94)
    assert a["precision"] == pytest.approx(60 / 70)
    assert b["precision"] == pytest.approx(90 / 140)
    assert a["recall"] == pytest.approx(0.6)
    assert b["recall"] == pytest.approx(0.9)
    assert a["penalty"] == 810
    assert b["penalty"] == 250
    assert a["escalations"] == 70
    assert b["escalations"] == 140
    assert a["within_capacity"] and b["within_capacity"]


def test_capacity_is_independent_of_penalty():
    assert EVALUATE(*A, 20, 1, 100)["within_capacity"]
    assert not EVALUATE(*B, 20, 1, 100)["within_capacity"]
    assert EVALUATE(*B, 20, 1, 140)["within_capacity"]
    assert not EVALUATE(*B, 0, 0, 139)["within_capacity"]


def test_exercise_cost_changes_tie_and_relative_improvement():
    assert EVALUATE(*A, 3, 2, 150)["penalty"] == 140
    assert EVALUATE(*B, 3, 2, 150)["penalty"] == 130
    assert EVALUATE(*A, 8 / 3, 2, 150)["penalty"] == pytest.approx(EVALUATE(*B, 8 / 3, 2, 150)["penalty"])
    assert EVALUATE(*A, 1, 2, 150)["penalty"] == 60
    assert EVALUATE(*B, 1, 2, 150)["penalty"] == 110
    assert 100 * (86 / 100 - 80 / 100) == pytest.approx(6)
    assert (86 - 80) / 80 * 100 == pytest.approx(7.5)


def test_empty_denominators_are_missing_metrics_and_majority_baseline_is_weak():
    baseline = EVALUATE(0, 0, 100, 900, 20, 1, 0)
    assert baseline["accuracy"] == pytest.approx(0.9)
    assert baseline["precision"] is None
    assert baseline["recall"] == 0
    assert baseline["penalty"] == 2000
    assert baseline["within_capacity"]
    no_urgent = EVALUATE(0, 1, 0, 6, 20, 1, 1)
    assert no_urgent["recall"] is None
    assert no_urgent["precision"] == 0
    all_routine = EVALUATE(0, 0, 0, 7, 0, 0, 0)
    assert all_routine["recall"] is None and all_routine["precision"] is None


def test_generic_counts_and_fractional_weights():
    result = EVALUATE(3, 2, 1, 11, 2.5, 0.25, 5)
    assert result["accuracy"] == pytest.approx(14 / 17)
    assert result["precision"] == pytest.approx(3 / 5)
    assert result["recall"] == pytest.approx(3 / 4)
    assert result["penalty"] == 3
    assert result["within_capacity"]


@pytest.mark.parametrize("counts", [(0, 0, 0, 0), (-1, 0, 1, 0), (True, 0, 0, 0),
                                     (1.5, 1, 1, 1), (1, "0", 1, 0), (None, 0, 1, 0)])
def test_invalid_counts(counts):
    with pytest.raises(ValueError):
        EVALUATE(*counts, 20, 1, 150)


@pytest.mark.parametrize("capacity", [-1, True, 1.5, "150", None])
def test_invalid_capacity(capacity):
    with pytest.raises(ValueError):
        EVALUATE(*A, 20, 1, capacity)


@pytest.mark.parametrize("cost", [-1, True, float("inf"), float("nan"), "20", None])
def test_invalid_weights(cost):
    for weights in [(cost, 1), (20, cost)]:
        with pytest.raises(ValueError):
            EVALUATE(*A, *weights, 150)
