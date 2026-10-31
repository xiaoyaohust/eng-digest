"""Execute the published NumPy example and verify ranking and cluster semantics."""

import contextlib
import io
from pathlib import Path
import re

import numpy as np
import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/classification-regression-ranking-and-clustering.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "task_types_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
POINTS = np.array([[0.10, 0.20], [0.20, 0.10], [0.80, 0.90], [0.90, 0.80]])
CENTERS = np.array([[0.0, 0.0], [1.0, 1.0]])


def test_published_output_matches_actual_execution():
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)


def test_metrics_and_exercise_are_independent_of_ranking_outputs():
    actual, estimates = [12, 40, 8, 20], [10, 35, 10, 25]
    assert sum(abs(a - b) for a, b in zip(actual, estimates)) / 4 == 3.5
    assert sum(abs(a - 20) for a in actual) / 4 == 10
    estimates[2] = 8
    assert sum(abs(a - b) for a, b in zip(actual, estimates)) / 4 == 3
    scores, grades = [0.70, 0.90, 0.60, 0.80], [3, 0, 2, 1]
    order = EXAMPLE["rank_candidates"](scores, 4).tolist()
    assert order == [1, 3, 0, 2]
    assert sum(grades[index] >= 2 for index in order[:2]) / 2 == 0
    assert sum(grade >= 2 for grade in grades[:2]) / 2 == 0.5


def test_ranking_supports_arbitrary_sizes_stable_ties_and_increasing_transforms():
    scores = np.array([0.1, 0.8, 0.8, -0.2, 0.5, 0.3, 0.7])
    before = scores.copy()
    assert EXAMPLE["rank_candidates"](scores, 3).tolist() == [1, 2, 6]
    assert EXAMPLE["rank_candidates"](10 * scores + 5, 3).tolist() == [1, 2, 6]
    assert np.array_equal(scores, before)
    assert EXAMPLE["rank_candidates"]([0.1], 1).tolist() == [0]


def test_cluster_assignment_update_and_arbitrary_numbering():
    assignments = EXAMPLE["assign_clusters"](POINTS, CENTERS)
    assert assignments.tolist() == [0, 0, 1, 1]
    updated = np.vstack([POINTS[assignments == j].mean(axis=0) for j in range(len(CENTERS))])
    assert np.allclose(updated, [[0.15, 0.15], [0.85, 0.85]])
    assert np.sum((POINTS - updated[assignments]) ** 2) == pytest.approx(0.02)
    assert EXAMPLE["assign_clusters"](POINTS, CENTERS[::-1]).tolist() == [1, 1, 0, 0]
    assert EXAMPLE["assign_clusters"]([[0.5, 0.5]], CENTERS).tolist() == [0]
    assert np.array_equal(POINTS, [[0.10, 0.20], [0.20, 0.10], [0.80, 0.90], [0.90, 0.80]])


def test_generic_cluster_shapes_match_scalar_distance_computation():
    rng = np.random.default_rng(20261031)
    for n, k, d in [(1, 1, 1), (7, 3, 4), (5, 8, 2)]:
        points, centers = rng.normal(size=(n, d)), rng.normal(size=(k, d))
        expected = [min(range(k), key=lambda j: sum((float(a) - float(b)) ** 2
                    for a, b in zip(point, centers[j]))) for point in points]
        assert EXAMPLE["assign_clusters"](points, centers).tolist() == expected


@pytest.mark.parametrize("scores,k", [
    ([], 1), ([[0.1]], 1), ([float("nan")], 1), ([float("inf")], 1),
    ([0.1], 0), ([0.1], 2), ([0.1], True), ([0.1], 1.5),
])
def test_rejects_invalid_ranking_inputs(scores, k):
    with pytest.raises(ValueError):
        EXAMPLE["rank_candidates"](scores, k)


@pytest.mark.parametrize("points,centers", [
    ([], [[0]]), ([[1]], []), ([1, 2], [[0]]), ([[1]], [0]),
    ([[1, 2]], [[0]]), ([[]], [[]]), ([[float("nan")]], [[0]]),
    ([[1]], [[float("inf")]]),
])
def test_rejects_invalid_cluster_inputs(points, centers):
    with pytest.raises(ValueError):
        EXAMPLE["assign_clusters"](points, centers)
