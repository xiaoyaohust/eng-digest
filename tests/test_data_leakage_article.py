"""Execute the published leakage experiment and test its information boundaries."""

import contextlib
import io
from pathlib import Path
import re

import numpy as np
import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/why-data-leakage-distorts-evaluation.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "data_leakage_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
FIT = EXAMPLE["fit_lookup"]
PREDICT = EXAMPLE["predict"]


def test_published_output_matches_execution():
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    expected = re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)
    assert output.getvalue().strip() == expected


def test_predefined_protocols_isolate_case_overlap_with_equal_row_counts():
    ids = np.array(["A", "A", "B", "B", "C", "C", "D", "D"])
    labels = np.array([0, 0, 1, 1, 0, 0, 1, 1])
    for train, held_out, expected, score, shared in [
        ([0, 2, 4, 6], [1, 3, 5, 7], [0, 1, 0, 1], 1.0, {"A", "B", "C", "D"}),
        ([0, 1, 2, 3], [4, 5, 6, 7], [0, 0, 0, 0], 0.5, set()),
    ]:
        assert len(train) == len(held_out) == 4
        assert not set(train) & set(held_out)
        assert set(ids[train]) & set(ids[held_out]) == shared
        model = FIT(ids[train], labels[train])
        predictions = PREDICT(model, ids[held_out])
        np.testing.assert_array_equal(predictions, expected)
        assert np.mean(predictions == labels[held_out]) == score
        assert np.mean(model[1] == labels[held_out]) == 0.5


def test_held_out_answers_do_not_enter_either_fitting_call(monkeypatch):
    calls = []

    def tracked(ids, labels):
        calls.append((ids.tolist(), labels.tolist()))
        return FIT(ids, labels)

    monkeypatch.setitem(EXAMPLE, "fit_lookup", tracked)
    with contextlib.redirect_stdout(io.StringIO()):
        EXAMPLE["main"]()
    assert calls == [(["A", "B", "C", "D"], [0, 1, 0, 1]),
                     (["A", "A", "B", "B"], [0, 0, 1, 1])]


def test_changing_held_out_labels_does_not_change_group_predictions():
    ids = np.array(["A", "A", "B", "B", "C", "C", "D", "D"])
    labels = np.array([0, 0, 1, 1, 0, 0, 1, 1])
    model = FIT(ids[:4], labels[:4])
    before = PREDICT(model, ids[4:])
    labels[4:] = 1 - labels[4:]
    np.testing.assert_array_equal(PREDICT(FIT(ids[:4], labels[:4]), ids[4:]), before)


def test_exercise_with_nonsevere_incident_d():
    ids = np.array(["A", "A", "B", "B", "C", "C", "D", "D"])
    labels = np.array([0, 0, 1, 1, 0, 0, 0, 0])
    for train, held_out, expected, score, baseline in [
        ([0, 2, 4, 6], [1, 3, 5, 7], [0, 1, 0, 0], 1.0, 0.75),
        ([0, 1, 2, 3], [4, 5, 6, 7], [0, 0, 0, 0], 1.0, 1.0),
    ]:
        model = FIT(ids[train], labels[train])
        predicted = PREDICT(model, ids[held_out])
        np.testing.assert_array_equal(predicted, expected)
        assert np.mean(predicted == labels[held_out]) == score
        assert np.mean(model[1] == labels[held_out]) == baseline


def test_generic_ids_majorities_ties_unknowns_and_immutable_inputs():
    ids = np.array(["incident-long", "incident-long", "incident-long", "other", "other"])
    labels = np.array([1, 0, 1, 0, 1])
    original_ids, original_labels = ids.copy(), labels.copy()
    model = FIT(ids, labels)
    assert model == ({"incident-long": 1, "other": 0}, 1)
    np.testing.assert_array_equal(PREDICT(model, ["other", "unknown", "incident-long"]), [0, 1, 1])
    assert PREDICT(model, np.array([], dtype=str)).shape == (0,)
    assert FIT(["single"], [0]) == ({"single": 0}, 0)
    assert FIT(["a", "b"], [0, 1])[1] == 0
    np.testing.assert_array_equal(ids, original_ids)
    np.testing.assert_array_equal(labels, original_labels)


@pytest.mark.parametrize("ids,labels", [
    ([], []), (["A"], []), ([["A"]], [[0]]), (["A"], [[0]]),
    ([1], [0]), (["A"], [2]), (["A"], [-1]), (["A"], [np.nan]),
    (["A"], [np.inf]), (["A"], ["0"]),
])
def test_invalid_training_inputs(ids, labels):
    with pytest.raises(ValueError):
        FIT(ids, labels)


@pytest.mark.parametrize("ids", ["A", [["A"]], [1], [None]])
def test_invalid_query_vectors(ids):
    with pytest.raises(ValueError):
        PREDICT(({"A": 0}, 0), ids)
