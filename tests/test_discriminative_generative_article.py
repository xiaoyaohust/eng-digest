"""Execute the article's exact code and check its probability calculations."""

import contextlib
from fractions import Fraction
import io
from pathlib import Path
import re

import numpy as np
import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/discriminative-and-generative-models.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "generative_models_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)


def test_published_output_matches_execution():
    expected = re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == expected


def test_joint_matches_independent_fraction_oracle():
    rng = np.random.default_rng(20261025)
    for _ in range(200):
        size = int(rng.integers(2, 50))
        x = rng.integers(0, 2, size=size)
        y = rng.integers(0, 2, size=size)
        y[0], y[1] = 0, 1
        for alpha in [Fraction(1, 4), Fraction(1), Fraction(2)]:
            expected = []
            for label in (0, 1):
                total = sum(int(value) == label for value in y)
                row = []
                for feature in (0, 1):
                    matches = sum(int(a) == feature and int(b) == label for a, b in zip(x, y))
                    row.append(float(Fraction(total, size) * (matches + alpha) / (total + 2 * alpha)))
                expected.append(row)
            actual = EXAMPLE["fit_joint"](x, y, float(alpha))
            assert actual.shape == (2, 2)
            np.testing.assert_allclose(actual, expected, rtol=1e-13, atol=0)
            np.testing.assert_allclose(actual.sum(), 1)
            assert np.isfinite(actual).all() and (actual >= 0).all()


@pytest.mark.parametrize("alpha", [1e-300, 1e300, 1e308, np.finfo(float).max])
def test_finite_smoothing_does_not_overflow(alpha):
    with np.errstate(over="raise", divide="raise", invalid="raise"):
        joint = EXAMPLE["fit_joint"]([0, 1, 0, 1], [0, 0, 1, 1], alpha)
    np.testing.assert_allclose(joint, np.full((2, 2), 0.25))


@pytest.mark.parametrize("x,y,alpha", [
    ([], [], 1), ([0], [0, 1], 1), ([[0], [1]], [0, 1], 1), ([0, 1], [[0], [1]], 1),
    ([0, 2], [0, 1], 1), ([0, 1], [0, 2], 1), ([0, 1], [1, 1], 1), ([0, 1], [0, 0], 1),
    ([0, 1], [0, 1], 0), ([0, 1], [0, 1], -1), ([0, 1], [0, 1], float("nan")),
    ([0, 1], [0, 1], float("inf")), ([float("nan"), 1], [0, 1], 1),
])
def test_rejects_inputs_outside_stated_contract(x, y, alpha):
    with pytest.raises(ValueError):
        EXAMPLE["fit_joint"](x, y, alpha)


def test_posterior_sampling_conditionals_and_prior_change_exercise():
    joint = EXAMPLE["fit_joint"]([0, 0, 1, 1, 1, 1], [0, 0, 1, 1, 0, 1])
    np.testing.assert_allclose(joint, [[0.3, 0.2], [0.1, 0.4]])
    posterior = joint / joint.sum(axis=0, keepdims=True)
    np.testing.assert_allclose(posterior[1], [0.25, 2 / 3])
    np.testing.assert_allclose(posterior.sum(axis=0), [1, 1])
    assert posterior.argmax(axis=0).tolist() == [0, 1]
    conditionals = joint / joint.sum(axis=1, keepdims=True)
    np.testing.assert_allclose(conditionals[:, 1], [0.4, 0.8])
    changed_joint = np.array([0.9, 0.1])[:, None] * conditionals
    changed_posterior = changed_joint / changed_joint.sum(axis=0, keepdims=True)
    np.testing.assert_allclose(changed_posterior[1, 1], float(Fraction(2, 11)))
    assert changed_posterior[1, 1] < 0.5
