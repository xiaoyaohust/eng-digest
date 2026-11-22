"""Check the published experiment against analytical results and split isolation."""

import contextlib
import io
from pathlib import Path
import re

import numpy as np
import pytest


ROOT = Path(__file__).resolve().parents[1]
SLUG = "reading-learning-curves-and-analyzing-failure-cases"
ENGLISH = (ROOT / f"site/src/content/ai/{SLUG}.md").read_text()
CHINESE = (ROOT / f"site/src/content/translations/ai/{SLUG}.md").read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", ENGLISH, re.S).group(1)


@pytest.fixture
def example():
    namespace = {"__name__": "learning_curves_article_example"}
    exec(compile(SOURCE, "learning_curves_article_example.py", "exec"), namespace)
    return namespace


def test_published_output_is_executed_and_identical_in_both_languages(example):
    assert re.search(r"```python\n(.*?)\n```", CHINESE, re.S).group(1) == SOURCE
    expected = re.search(r"```text\n(.*?)\n```", ENGLISH, re.S).group(1)
    assert re.search(r"```text\n(.*?)\n```", CHINESE, re.S).group(1) == expected
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        example["main"]()
    assert output.getvalue().strip() == expected


def test_fitting_converges_to_the_analytical_omitted_input_solution(example):
    result = example["run_experiment"]()
    assert result["progress"].shape == (81, 2)
    assert result["coefficients"] == pytest.approx([14.5, 7.0], abs=3e-6)
    assert result["progress"][0] == pytest.approx([233, 1592 / 7])
    assert result["progress"][-1] == pytest.approx([1.75, 1.75])
    assert np.all(np.diff(result["progress"], axis=0) <= 1e-12)
    assert result["baseline_mse"] == pytest.approx(481 / 28)


def test_case_counts_signed_errors_and_weighted_mae_agree(example):
    result = example["run_experiment"]()
    warm, cold = result["cold"] == 0, result["cold"] == 1
    assert warm.sum() == 56
    assert cold.sum() == 8
    assert result["residuals"][warm] == pytest.approx(np.full(56, 0.5), abs=3e-6)
    assert result["residuals"][cold] == pytest.approx(np.full(8, -3.5), abs=3e-6)
    assert np.mean(np.abs(result["residuals"])) == pytest.approx(0.875)
    assert np.mean(result["residuals"]) == pytest.approx(0, abs=1e-12)


def test_reordering_the_complete_pool_does_not_create_uncertainty(example):
    result = example["run_experiment"](repeats=7, seed=93)
    assert result["sizes"].tolist() == [8, 16, 32, 64]
    assert result["scores"].shape == (7, 4, 2)
    assert result["scores"][:, -1, :] == pytest.approx(np.full((7, 2), 1.75))
    train, labels, _ = example["make_data"]()
    assert train.shape == (64, 2) and labels.shape == (64,)
    # The fixed grid makes the intercept and standardized size orthogonal.
    assert train.T @ train == pytest.approx(np.diag([64, 192 / 7]))


def test_validation_labels_cannot_change_any_fitted_coefficient_or_training_error(example):
    original = example["make_data"]
    reference = example["run_experiment"](repeats=3)

    def changed_validation(validation=False):
        design, labels, cold = original(validation)
        return design, labels + 100 if validation else labels, cold

    example["make_data"] = changed_validation
    changed = example["run_experiment"](repeats=3)
    np.testing.assert_array_equal(reference["coefficients"], changed["coefficients"])
    np.testing.assert_array_equal(reference["progress"][:, 0], changed["progress"][:, 0])
    np.testing.assert_array_equal(reference["scores"][:, :, 0], changed["scores"][:, :, 0])
    assert not np.allclose(reference["progress"][:, 1], changed["progress"][:, 1])
