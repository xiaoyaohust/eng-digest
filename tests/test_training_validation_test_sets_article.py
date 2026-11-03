"""Execute the published split example and check its fitting and evaluation boundaries."""

import contextlib
import io
from pathlib import Path
import re

import numpy as np
import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/training-validation-and-test-sets.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "training_validation_test_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
FIT = EXAMPLE["fit_candidates"]
MAE = EXAMPLE["mean_absolute_error"]


def test_published_output_matches_execution():
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)


def test_fitted_parameters_validation_selection_and_final_test():
    x = np.arange(1, 11, dtype=float)
    y = np.array([3, 5, 7, 9, 11, 13, 15, 18, 21, 22], dtype=float)
    models = FIT(x[:6], y[:6], [0, 2])
    assert models == [(0.0, 8.0), (2.0, 1.0)]
    training = [MAE(y[:6], a * x[:6] + b) for a, b in models]
    validation = [MAE(y[6:8], a * x[6:8] + b) for a, b in models]
    assert training == [3, 0]
    assert validation == [8.5, 0.5]
    selected = min(range(len(models)), key=lambda index: validation[index])
    assert selected == 1
    slope, offset = models[selected]
    np.testing.assert_array_equal(slope * x[8:] + offset, [19, 21])
    assert MAE(y[8:], slope * x[8:] + offset) == 1.5


def test_main_selects_without_test_error_and_evaluates_only_selected_candidate(monkeypatch):
    calls = []

    def tracked(actual, predicted):
        calls.append((np.asarray(actual).tolist(), np.asarray(predicted).tolist()))
        return MAE(actual, predicted)

    monkeypatch.setitem(EXAMPLE, "mean_absolute_error", tracked)
    with contextlib.redirect_stdout(io.StringIO()):
        EXAMPLE["main"]()
    assert len(calls) == 5
    assert [len(actual) for actual, _ in calls] == [6, 2, 6, 2, 2]
    assert calls[-1] == ([21.0, 22.0], [19.0, 21.0])
    assert all(actual != [21.0, 22.0] for actual, _ in calls[:-1])


def test_predeclared_refit_exercise():
    x = np.arange(1, 9, dtype=float)
    y = [3, 5, 7, 9, 11, 13, 15, 18]
    slope, offset = FIT(x, y, [2])[0]
    assert offset == 1.125
    predictions = slope * np.array([9, 10]) + offset
    np.testing.assert_array_equal(predictions, [19.125, 21.125])
    assert MAE([21, 22], predictions) == 1.375


def test_generic_sizes_slopes_and_immutable_training_data():
    x = np.array([-2, 0, 1, 4], dtype=float)
    y = 3 * x - 2
    original_x, original_y = x.copy(), y.copy()
    models = FIT(x, y, [0, 1.5, 3])
    assert models[-1] == (3.0, -2.0)
    assert MAE(y, 3 * x - 2) == 0
    np.testing.assert_array_equal(x, original_x)
    np.testing.assert_array_equal(y, original_y)
    assert FIT([4], [7], [2]) == [(2.0, -1.0)]


@pytest.mark.parametrize("x,y", [([], []), ([1, 2], [1]), ([[1, 2]], [[1, 2]]),
                                   ([1, 2], [[1, 2]]), ([float("nan")], [1]),
                                   ([1], [float("inf")])])
def test_invalid_training_vectors(x, y):
    with pytest.raises(ValueError):
        FIT(x, y, [0, 2])


@pytest.mark.parametrize("slopes", [[], [[0, 2]], float("nan"), [float("nan")], [float("inf")]])
def test_invalid_candidate_vectors(slopes):
    with pytest.raises(ValueError):
        FIT([1, 2], [3, 5], slopes)


@pytest.mark.parametrize("actual,predicted", [([], []), ([1], [1, 2]), ([[1]], [[1]]),
                                               ([1], [[1]]), ([float("inf")], [1]),
                                               ([1], [float("nan")])])
def test_invalid_evaluation_vectors(actual, predicted):
    with pytest.raises(ValueError):
        MAE(actual, predicted)
