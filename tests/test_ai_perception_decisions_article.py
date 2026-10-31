"""Execute the published overlap and expected-loss example without model downloads."""

import contextlib
import io
from pathlib import Path
import re

import numpy as np
import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/detection-segmentation-generation-and-decision-making.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "perception_decisions_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
COSTS = np.array([[0, 40], [6, 2], [2, 3]], dtype=float)


def test_published_output_matches_execution():
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)


@pytest.mark.parametrize("second,expected", [
    ([3, 1, 7, 5], 0.6), ([4, 1, 8, 5], 1 / 3),
    ([2, 1, 6, 5], 1), ([6, 1, 8, 5], 0), ([10, 1, 12, 5], 0),
])
def test_box_convention_and_exercise(second, expected):
    assert EXAMPLE["box_iou"]([2, 1, 6, 5], second) == pytest.approx(expected)
    assert EXAMPLE["box_iou"](second, [2, 1, 6, 5]) == pytest.approx(expected)


def test_masks_empty_union_background_baseline_and_arbitrary_shapes():
    reference, prediction = np.zeros((6, 8), dtype=bool), np.zeros((6, 8), dtype=bool)
    for point in [(1, 2), (1, 3), (2, 2), (2, 3), (3, 3), (4, 3)]:
        reference[point] = True
    for point in [(1, 3), (1, 4), (2, 3), (2, 4), (3, 3), (4, 3)]:
        prediction[point] = True
    assert EXAMPLE["mask_scores"](reference, prediction) == pytest.approx((0.5, 44 / 48))
    assert EXAMPLE["mask_scores"](reference, np.zeros_like(reference)) == (0, 42 / 48)
    assert EXAMPLE["mask_scores"](np.zeros((2, 7)), np.zeros((2, 7))) == (None, 1)
    assert EXAMPLE["mask_scores"]([[1]], [[1]]) == (1, 1)
    rng = np.random.default_rng(20261031)
    for height, width in [(1, 5), (7, 3), (11, 9)]:
        first = rng.integers(0, 2, size=(height, width))
        second = rng.integers(0, 2, size=(height, width))
        pairs = list(zip(first.flat, second.flat))
        intersection = sum(bool(a) and bool(b) for a, b in pairs)
        union = sum(bool(a) or bool(b) for a, b in pairs)
        iou, accuracy = EXAMPLE["mask_scores"](first, second)
        assert iou == pytest.approx(intersection / union)
        assert accuracy == sum(a == b for a, b in pairs) / len(pairs)


@pytest.mark.parametrize("p,losses,action", [
    (0.10, [4, 5.6, 2.1], 2), (0.02, [0.8, 5.92, 2.02], 0),
    (0.90, [36, 2.4, 2.9], 1), (0, [0, 6, 2], 0), (1, [40, 2, 3], 1),
])
def test_expected_costs_and_exercises(p, losses, action):
    actual = EXAMPLE["expected_losses"]([1 - p, p], COSTS)
    assert actual == pytest.approx(losses)
    assert int(actual.argmin()) == action


def test_general_action_state_dimensions_and_no_input_mutation():
    probabilities = np.array([0.2, 0.3, 0.5])
    costs = np.array([[1, 2, 4], [2, 3, 1], [0, 5, 2], [4, 0, 2]])
    before = costs.copy()
    expected = [sum(float(cost) * float(p) for cost, p in zip(row, probabilities)) for row in costs]
    assert EXAMPLE["expected_losses"](probabilities, costs) == pytest.approx(expected)
    assert np.array_equal(costs, before)
    assert EXAMPLE["expected_losses"]([1], [[0], [0]]).argmin() == 0


@pytest.mark.parametrize("box", [[1, 2, 1, 4], [1, 2, 3, 2], [4, 2, 1, 3],
                                  [1, 2, 3], [1, 2, float("inf"), 4]])
def test_invalid_boxes(box):
    with pytest.raises(ValueError):
        EXAMPLE["box_iou"]([0, 0, 2, 2], box)


@pytest.mark.parametrize("reference,prediction", [
    ([], []), ([[1]], [[1, 0]]), ([1], [1]),
    ([[2]], [[1]]), ([[1]], [[float("nan")]]),
])
def test_invalid_masks(reference, prediction):
    with pytest.raises(ValueError):
        EXAMPLE["mask_scores"](reference, prediction)


@pytest.mark.parametrize("probabilities,costs", [
    ([], [[1]]), ([0.5, 0.4], [[1, 2]]), ([-0.1, 1.1], [[1, 2]]),
    ([float("nan"), 0], [[1, 2]]), ([[1]], [[1]]), ([1], []),
    ([1], [[1, 2]]), ([1], [[-1]]), ([1], [[float("inf")]]),
])
def test_invalid_probabilities_and_costs(probabilities, costs):
    with pytest.raises(ValueError):
        EXAMPLE["expected_losses"](probabilities, costs)
