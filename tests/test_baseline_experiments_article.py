"""Run the published experiment and independently check its controls and arithmetic."""

import contextlib
import io
from pathlib import Path
import re

import numpy as np
import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/baseline-models-and-controlled-experiments.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "baseline_experiments_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
FIT, PREDICT, MSE = (EXAMPLE[name] for name in ("fit_line", "predict", "mse"))


def test_published_output_matches_execution():
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)


def test_fitting_never_receives_validation_or_test_labels(monkeypatch):
    calls = []

    def tracked(x, y):
        calls.append((x.copy(), y.copy()))
        return FIT(x, y)

    monkeypatch.setitem(EXAMPLE, "fit_line", tracked)
    with contextlib.redirect_stdout(io.StringIO()):
        EXAMPLE["main"]()
    assert len(calls) == 2
    np.testing.assert_array_equal(calls[0][0], np.arange(1, 7))
    np.testing.assert_array_equal(calls[1][0], np.zeros(6))
    for _, labels in calls:
        np.testing.assert_array_equal(labels, [3, 5, 7, 9, 11, 13])


def test_selection_uses_validation_and_final_scoring_happens_afterwards(monkeypatch):
    evaluated = []

    def tracked(y, predicted):
        evaluated.append(y.tolist())
        return MSE(y, predicted)

    monkeypatch.setitem(EXAMPLE, "mse", tracked)
    with contextlib.redirect_stdout(io.StringIO()):
        EXAMPLE["main"]()
    assert evaluated == [[15, 18]] * 3 + [[21, 22]] * 2


@pytest.mark.parametrize("bad_model", [[8.0, 0.0], [0.0, 0.0]])
def test_baseline_selection_and_ties_still_print_one_final_score(monkeypatch, bad_model):
    monkeypatch.setitem(EXAMPLE, "fit_line", lambda x, y: np.array(bad_model))
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert "selected: mean" in output.getvalue()
    assert output.getvalue().count("test mean: MSE=182.50") == 1
    assert "test linear:" not in output.getvalue()


def test_independent_prediction_and_error_arithmetic():
    x = np.arange(1, 7, dtype=float)
    y = np.array([3, 5, 7, 9, 11, 13], dtype=float)
    model = FIT(x, y)
    np.testing.assert_allclose(model, [1, 2], atol=1e-12)
    validation = PREDICT(model, [7, 8])
    final = PREDICT(model, [9, 10])
    np.testing.assert_allclose(validation, [15, 17])
    np.testing.assert_allclose(final, [19, 21])
    assert MSE([15, 18], validation) == pytest.approx(0.5)
    assert MSE([21, 22], final) == pytest.approx(2.5)
    np.testing.assert_array_equal((np.array([21, 22]) - 8) ** 2, [169, 196])
    assert MSE([21, 22], [8, 8]) - MSE([21, 22], final) == pytest.approx(180)


def test_refitted_ablation_differs_from_inference_only_masking():
    ablated = FIT(np.zeros(6), [3, 5, 7, 9, 11, 13])
    np.testing.assert_allclose(ablated, [8, 0])
    assert MSE([15, 18], PREDICT(ablated, [0, 0])) == pytest.approx(74.5)
    assert MSE([15, 18], PREDICT([1, 2], [0, 0])) == pytest.approx(242.5)
    assert MSE([21, 22], [20, 23]) == 1


def test_generic_inputs_and_rank_deficient_cases_are_not_fixture_specific():
    x = np.array([-3.0, 0.0, 4.0, 11.0])
    y = 4.5 - 0.75 * x
    x_original, y_original = x.copy(), y.copy()
    np.testing.assert_allclose(FIT(x, y), [4.5, -0.75], atol=1e-12)
    np.testing.assert_allclose(PREDICT(FIT(x, y), [-10, 2]), [12, 3])
    np.testing.assert_allclose(FIT([0], [7]), [7, 0])
    np.testing.assert_allclose(PREDICT(FIT([2, 2], [3, 5]), [2]), [4])
    assert PREDICT([1, 2], []).shape == (0,)
    np.testing.assert_array_equal(x, x_original)
    np.testing.assert_array_equal(y, y_original)


@pytest.mark.parametrize("x,y", [([], []), ([1], []), ([[1]], [2]),
                                     ([1], [[2]]), ([np.nan], [1]), ([1], [np.inf])])
def test_fit_rejects_invalid_vectors(x, y):
    with pytest.raises(ValueError):
        FIT(x, y)


@pytest.mark.parametrize("theta,x", [([1], [2]), ([[1, 2]], [2]),
                                         ([1, 2], 3), ([1, 2], [[3]]),
                                         ([np.nan, 2], [3]), ([1, 2], [np.inf])])
def test_predict_rejects_invalid_shapes_and_nonfinite_values(theta, x):
    with pytest.raises(ValueError):
        PREDICT(theta, x)


@pytest.mark.parametrize("actual,predicted", [([], []), ([1, 2], [1]),
                                                   ([[1]], [[1]]), ([1], [[1]]),
                                                   ([np.nan], [0]), ([0], [np.inf])])
def test_mse_rejects_empty_mismatched_or_nonfinite_vectors(actual, predicted):
    with pytest.raises(ValueError):
        MSE(actual, predicted)
