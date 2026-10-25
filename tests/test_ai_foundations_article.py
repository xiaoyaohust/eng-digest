"""Execute the published NumPy example and independently check its results."""

import contextlib
import io
from pathlib import Path
import re

import numpy as np
import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/from-rules-to-machine-learning.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "ai_foundations_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)


def test_published_output_matches_actual_execution():
    expected = re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == expected


def test_fit_matches_independent_enumeration():
    rng = np.random.default_rng(20261024)
    for _ in range(200):
        size = int(rng.integers(1, 30))
        x = rng.integers(0, 12, size=size)
        y = rng.integers(0, 2, size=size)
        expected = [(sum((int(value) >= threshold) != int(label) for value, label in zip(x, y)), threshold)
                    for threshold in range(int(max(x)) + 2)]
        best, candidates, mistakes = EXAMPLE["fit_threshold"](x, y)
        assert best == min(expected)[1]
        assert mistakes.tolist() == [count for count, _ in expected]
        assert candidates.tolist() == list(range(int(max(x)) + 2))


@pytest.mark.parametrize("x,y", [([], []), ([0, 1], [0]), ([[1]], [0]), ([1], [[0]]),
                                     ([-1], [0]), ([1.5], [0]), ([1], [2])])
def test_rejects_inputs_outside_the_stated_contract(x, y):
    with pytest.raises(ValueError):
        EXAMPLE["fit_threshold"](x, y)


def test_weighted_error_exercise():
    x, y = [0, 1, 2, 3, 4, 5], [0, 0, 1, 1, 0, 1]
    def cost(threshold):
        return sum(5 if value >= threshold and label == 0 else 1 if value < threshold and label == 1 else 0
                   for value, label in zip(x, y))
    assert cost(2) == 5
    assert cost(5) == 2


def test_same_feature_requires_same_deterministic_prediction():
    test_x, test_y = np.array([1, 2, 2, 4]), np.array([0, 1, 0, 1])
    assert np.mean((test_x >= 2) != test_y) == 0.25
    assert np.mean((test_x >= 3) != test_y) == 0.25
    assert test_x[1] == test_x[2] and test_y[1] != test_y[2]
