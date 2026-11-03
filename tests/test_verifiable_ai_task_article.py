"""Execute the published fixture evaluator and test its contract boundaries."""

import contextlib
import io
from pathlib import Path
import re

import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/from-a-vague-request-to-a-verifiable-task.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "verifiable_ai_task_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
EVALUATE = EXAMPLE["evaluate_cases"]
GUIDES = ["deploy-v2", "pull-image", "schema-v2", "rollback-v3", "tls-agent"]
CASES = [{"eligible": {guide}, "relevant": {guide}} for guide in GUIDES]
CASES.append({"eligible": {"deploy-v2", "pull-image"}, "relevant": set()})
BASELINE = [["deploy-v2"], [], ["schema-v2"], [], ["tls-agent"], []]
REPAIRED = [["deploy-v2"], ["pull-image"], ["schema-v2"], ["rollback-v3"], ["tls-agent"], []]


def test_published_output_matches_actual_execution():
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)


def test_baseline_and_supplied_candidate_fail_for_different_reasons():
    baseline = EVALUATE(CASES, BASELINE)
    assert baseline == {"hits": 3, "answerable": 5, "coverage": 0.6, "failures": 0, "fixture_pass": False}
    candidate = REPAIRED[:-1] + [["admin-reset"]]
    result = EVALUATE(CASES, candidate)
    assert result == {"hits": 5, "answerable": 5, "coverage": 1, "failures": 1, "fixture_pass": False}
    assert EVALUATE(CASES, REPAIRED)["fixture_pass"]
    assert REPAIRED[-1] == []


def test_review_reference_cannot_be_replaced_by_permitted_but_inapplicable_guides():
    outputs = REPAIRED[:-1] + [["deploy-v2"]]
    result = EVALUATE(CASES, outputs)
    assert result["coverage"] == 1
    assert result["failures"] == 1
    assert not result["fixture_pass"]


def test_an_acceptable_guide_does_not_cancel_an_unauthorized_reference():
    outputs = [["deploy-v2", "admin-reset"]] + REPAIRED[1:]
    result = EVALUATE(CASES, outputs)
    assert result["coverage"] == 0.8
    assert result["failures"] == 1
    assert not result["fixture_pass"]


def test_added_request_exercise_and_threshold_boundary():
    cases = CASES + [{"eligible": {"network-v2"}, "relevant": {"network-v2"}}]
    assert EVALUATE(cases, BASELINE + [[]])["coverage"] == 0.5
    result = EVALUATE(cases, REPAIRED + [["network-v2"]])
    assert result["coverage"] == 1
    assert result["fixture_pass"]
    result = EVALUATE(CASES, BASELINE, min_coverage=0.6)
    assert result["fixture_pass"]
    assert not EVALUATE(CASES, BASELINE, min_coverage=0.61)["fixture_pass"]


def test_undefined_coverage_cannot_pass_and_missing_answer_is_a_miss():
    cases = [{"eligible": {"a"}, "relevant": set()}]
    assert EVALUATE(cases, [[]]) == {"hits": 0, "answerable": 0, "coverage": None, "failures": 0, "fixture_pass": False}
    result = EVALUATE([{"eligible": {"a"}, "relevant": {"a"}}], [[]])
    assert result["coverage"] == 0
    assert result["failures"] == 0
    assert not result["fixture_pass"]


def test_generic_top_k_multiple_references_and_immutable_inputs():
    case = {"eligible": {"a", "b", "c"}, "relevant": {"b", "c"}}
    outputs = [["a", "b", "c"]]
    assert EVALUATE([case], outputs, top_k=3)["fixture_pass"]
    assert not EVALUATE([case], outputs, top_k=2)["fixture_pass"]
    assert EVALUATE([case], [["a", "c"]], top_k=2)["fixture_pass"]
    assert outputs == [["a", "b", "c"]]
    assert case == {"eligible": {"a", "b", "c"}, "relevant": {"b", "c"}}


@pytest.mark.parametrize("choices", ["deploy-v2", None, 1, {}, [None], [True], [["deploy-v2"]],
                                      [""], ["deploy-v2", "deploy-v2"], ["missing"],
                                      ["deploy-v2", "pull-image", "schema-v2"]])
def test_invalid_outputs_fail_the_contract_instead_of_receiving_coverage(choices):
    result = EVALUATE(CASES[:1], [choices])
    assert result["failures"] == 1
    assert result["hits"] == 0
    assert not result["fixture_pass"]


@pytest.mark.parametrize("top_k", [0, -1, True, 1.5, "2", None])
def test_invalid_top_k(top_k):
    with pytest.raises(ValueError):
        EVALUATE(CASES, REPAIRED, top_k=top_k)


@pytest.mark.parametrize("coverage", [-0.1, 1.1, True, float("nan"), float("inf"), "0.8", None])
def test_invalid_coverage_thresholds(coverage):
    with pytest.raises(ValueError):
        EVALUATE(CASES, REPAIRED, min_coverage=coverage)


def test_invalid_fixture_inputs():
    for cases, outputs in [([], []), (CASES, []), ([{"eligible": {"a"}, "relevant": {"b"}}], [["b"]])]:
        with pytest.raises(ValueError):
            EVALUATE(cases, outputs)
