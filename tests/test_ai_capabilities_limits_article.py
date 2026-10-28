"""Verify the published selective-routing arithmetic, including undefined risk."""

import contextlib
import io
from pathlib import Path
import re

import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/ai-capabilities-and-limits.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "ai_capabilities_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
SCORES = [0.95, 0.85, 0.70, 0.55, 0.45, 0.30, 0.15, 0.05]
LABELS = [1, 1, 0, 1, 0, 1, 0, 1]


def test_published_output_matches_actual_execution():
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    expected = re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)
    assert output.getvalue().strip() == expected


@pytest.mark.parametrize("threshold,coverage,error_rate,errors,deferred,cost", [
    (0.5, 1, 0.375, 3, 0, 9),
    (0.8, 0.5, 0.25, 1, 4, 7),
    (1, 0, None, 0, 8, 8),
])
def test_policy_metrics_and_empty_accepted_set(threshold, coverage, error_rate, errors, deferred, cost):
    scores, labels = list(SCORES), list(LABELS)
    assert EXAMPLE["evaluate_policy"](scores, labels, threshold) == {
        "coverage": coverage, "error_rate": error_rate,
        "errors": errors, "deferred": deferred, "cost": cost,
    }
    assert scores == SCORES and labels == LABELS


def test_high_confidence_error_survives_and_cost_assumptions_change_the_ranking():
    result = EXAMPLE["evaluate_policy"]([0.05], [1], 0.8)
    assert result["coverage"] == 1 and result["error_rate"] == 1
    assert EXAMPLE["evaluate_policy"](SCORES, LABELS, 0.5, error_cost=5)["cost"] == 15
    assert EXAMPLE["evaluate_policy"](SCORES, LABELS, 0.8, error_cost=5)["cost"] == 9
    assert EXAMPLE["evaluate_policy"](SCORES, LABELS, 1, error_cost=5)["cost"] == 8


def test_boundary_scores_and_zero_costs():
    result = EXAMPLE["evaluate_policy"]([0, 0.5, 1], [0, 1, 1], 0.5, error_cost=0, review_cost=0)
    assert result["coverage"] == 1 and result["error_rate"] == 0 and result["cost"] == 0
    result = EXAMPLE["evaluate_policy"]([0.8, 0.2], [1, 0], 0.8)
    assert result["coverage"] == 1 and result["error_rate"] == 0


@pytest.mark.parametrize("scores,labels,threshold", [
    ([], [], 0.8), ([0.9], [], 0.8),
    ([float("nan")], [1], 0.8), ([float("inf")], [1], 0.8),
    ([-0.1], [0], 0.8), ([1.1], [1], 0.8),
    ([True], [1], 0.8), (["0.9"], [1], 0.8),
    ([0.9], [True], 0.8), ([0.9], [2], 0.8),
    ([0.9], [1], 0.49), ([0.9], [1], 1.01),
    ([0.9], [1], float("nan")), ([0.9], [1], True),
])
def test_rejects_invalid_score_label_or_threshold_inputs(scores, labels, threshold):
    with pytest.raises(ValueError):
        EXAMPLE["evaluate_policy"](scores, labels, threshold)


@pytest.mark.parametrize("costs", [
    {"error_cost": -1}, {"review_cost": -1},
    {"error_cost": float("inf")}, {"review_cost": float("nan")},
    {"error_cost": True}, {"review_cost": "1"},
])
def test_costs_must_be_finite_nonnegative_numbers(costs):
    with pytest.raises(ValueError):
        EXAMPLE["evaluate_policy"](SCORES, LABELS, 0.8, **costs)
