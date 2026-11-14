"""Execute the published repeat protocol and independently verify its arithmetic."""

import contextlib
import io
from pathlib import Path
import re

import numpy as np
import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/randomness-repeated-experiments-and-variation.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "randomness_article_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
RUN, SUMMARIZE = EXAMPLE["run_experiment"], EXAMPLE["summarize"]


def fixture():
    x = np.arange(1, 13, dtype=float)
    y = 1 + 2 * x + np.array([0, 5, -4, 1, -3, 4, 0, -5, 3, -1, 2, -2])
    return x, y, np.array([2.5, 4.5, 6.5, 8.5, 10.5]), np.array([7, 9, 15, 16, 23])


def test_verified_output_matches_execution():
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)


def test_saved_rows_and_scores_match_an_independent_scalar_regression():
    x, y, xv, yv = fixture()
    ids = [11, 23, 37, 41, 53, 67, 79, 83]
    scores, rows = RUN(x, y, xv, yv, ids, 4)
    assert rows.tolist() == [[1, 5, 8, 9], [0, 4, 6, 7], [1, 6, 7, 11],
                             [5, 9, 10, 11], [0, 6, 7, 8], [1, 4, 6, 7],
                             [0, 9, 10, 11], [0, 3, 6, 10]]
    expected = []
    for indices in rows:
        xs, ys = [float(x[i]) for i in indices], [float(y[i]) for i in indices]
        mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
        slope = sum((a - mx) * (b - my) for a, b in zip(xs, ys)) / sum((a - mx) ** 2 for a in xs)
        intercept = my - slope * mx
        expected.append([sum(abs(float(v) - my) for v in yv) / len(yv),
                         sum(abs(float(v) - (intercept + slope * float(a)))
                             for a, v in zip(xv, yv)) / len(yv)])
    np.testing.assert_allclose(scores, expected, atol=1e-12)
    expected_gain = sum(reference - candidate for reference, candidate in expected) / len(expected)
    assert SUMMARIZE(scores[:, 0] - scores[:, 1])[0] == pytest.approx(expected_gain)


def test_replay_and_run_order_do_not_depend_on_global_random_state():
    data = fixture()
    original = [a.copy() for a in data]
    first_scores, first_rows = RUN(*data, [11, 23, 37], 4)
    global_state = np.random.get_state()
    try:
        np.random.seed(987)
        np.random.random_sample(100)
        scores, rows = RUN(*data, [37, 23, 11], 4)
    finally:
        np.random.set_state(global_state)
    np.testing.assert_array_equal(rows, first_rows[::-1])
    np.testing.assert_array_equal(scores, first_scores[::-1])
    for actual, expected in zip(data, original):
        np.testing.assert_array_equal(actual, expected)


def test_validation_labels_never_enter_fitting_or_sampling(monkeypatch):
    data = fixture()
    calls = []
    solver = np.linalg.lstsq

    def tracked(design, labels, **kwargs):
        calls.append((design.copy(), labels.copy()))
        return solver(design, labels, **kwargs)

    monkeypatch.setattr(np.linalg, "lstsq", tracked)
    scores, rows = RUN(*data, [11, 23], 4)
    changed_scores, changed_rows = RUN(*data[:3], data[3] + 1000, [11, 23], 4)
    np.testing.assert_array_equal(rows, changed_rows)
    assert not np.allclose(scores, changed_scores)
    for index, (design, labels) in enumerate(calls):
        indices = rows[index % 2]
        np.testing.assert_array_equal(design, np.column_stack([np.ones(4), data[0][indices]]))
        np.testing.assert_array_equal(labels, data[1][indices])


def test_full_training_set_removes_sampling_variability():
    data = fixture()
    scores, rows = RUN(*data, [3, 7, 11, 19], len(data[0]))
    for selected, score in zip(rows, scores):
        np.testing.assert_array_equal(selected, np.arange(len(data[0])))
        np.testing.assert_array_equal(score, scores[0])
    assert SUMMARIZE(scores[:, 1])[1:] == (0.0, 0.0)


def test_generic_shapes_and_exact_linear_data():
    x = np.array([-7, -3, 1, 4, 8, 11, 15], dtype=float)
    y = 6 - 0.5 * x
    xv = np.array([-5, 0, 10], dtype=float)
    scores, rows = RUN(x, y, xv, 6 - 0.5 * xv, [0, 2**80, np.int64(5)], np.int64(3))
    assert scores.shape == (3, 2)
    assert rows.shape == (3, 3)
    np.testing.assert_allclose(scores[:, 1], 0, atol=1e-12)
    for selected in rows:
        assert len(set(selected)) == 3
        assert np.all(selected[:-1] < selected[1:])


def test_hand_calculation_and_standard_error_use_runs_as_the_unit():
    reference, candidate = np.array([0.25, 0.3, 0.2, 0.25]), np.array([0.2, 0.4, 0.1, 0.3])
    assert SUMMARIZE(candidate) == pytest.approx((0.25, (0.05 / 3) ** 0.5, (0.05 / 3) ** 0.5 / 2))
    gain = reference - candidate
    assert SUMMARIZE(gain) == pytest.approx((0, (0.025 / 3) ** 0.5, (0.025 / 3) ** 0.5 / 2), abs=1e-15)
    assert SUMMARIZE([2, 2, 2]) == (2, 0, 0)


@pytest.mark.parametrize("ids", [[], [1], [1, 1], [-1, 2], [1.5, 2], [True, 2], [np.bool_(False), 2]])
def test_invalid_or_duplicate_run_ids_are_rejected(ids):
    with pytest.raises(ValueError):
        RUN(*fixture(), ids, 4)


@pytest.mark.parametrize("sample_size", [0, 1, 13, 2.5, True])
def test_invalid_sampling_budgets_are_rejected(sample_size):
    with pytest.raises(ValueError):
        RUN(*fixture(), [1, 2], sample_size)


@pytest.mark.parametrize("position,value", [(0, []), (0, [[1, 2]]), (1, [1]),
                                           (2, []), (3, [[1, 2, 3, 4, 5]]),
                                           (0, [np.nan] * 12), (3, [np.inf] * 5)])
def test_invalid_or_nonfinite_input_vectors_are_rejected(position, value):
    data = list(fixture())
    data[position] = value
    with pytest.raises(ValueError):
        RUN(*data, [1, 2], 4)


@pytest.mark.parametrize("values", [[], [1], [[1, 2]], [np.nan, 1], [1, np.inf]])
def test_invalid_summary_inputs_are_rejected(values):
    with pytest.raises(ValueError):
        SUMMARIZE(values)


def test_nonfinite_solver_results_are_not_silently_dropped(monkeypatch):
    monkeypatch.setattr(np.linalg, "lstsq", lambda *args, **kwargs: (np.array([np.nan, 0]),))
    with pytest.raises(FloatingPointError, match="run 11"):
        RUN(*fixture(), [11, 23], 4)
