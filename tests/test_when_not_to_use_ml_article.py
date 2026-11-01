"""Run the published registry-routing comparison and check its specification boundaries."""

import contextlib
import io
from pathlib import Path
import re

import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/when-you-dont-need-machine-learning.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "non_ml_routing_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
OWNERS = {"catalog": "Catalog", "checkout": "Payments", "auth": "Identity"}
EXPECTED = ["Catalog", "Payments", "Identity", "Catalog", "Payments", None]


def test_published_output_matches_execution():
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)


def test_registry_uses_current_values_and_reviews_unknown_inputs():
    owners = dict(OWNERS)
    assert EXAMPLE["route_incident"]("catalog", owners) == "Catalog"
    assert EXAMPLE["route_incident"]("inventory", owners) is None
    assert EXAMPLE["route_incident"](None, owners) is None
    assert EXAMPLE["route_incident"](" catalog", owners) is None
    assert owners == OWNERS
    owners["catalog"] = "Commerce"
    assert EXAMPLE["route_incident"]("catalog", owners) == "Commerce"


@pytest.mark.parametrize("decisions,result", [
    (EXPECTED, (5, 0, 1, 1)),
    (["Catalog", "Payments", "Identity", "Payments", "Payments", None], (5, 1, 1, 6)),
    ([None] * 6, (0, 0, 6, 6)),
])
def test_comparison_counts(decisions, result):
    original = list(decisions)
    assert EXAMPLE["evaluate_routes"](decisions, EXPECTED) == result
    assert decisions == original


def test_unknown_component_exercise_and_unpermitted_automatic_route():
    expected = EXPECTED + [None]
    assert EXAMPLE["evaluate_routes"](expected, expected) == (5, 0, 2, 2)
    candidate = ["Catalog", "Payments", "Identity", "Payments", "Payments", None, None]
    assert EXAMPLE["evaluate_routes"](candidate, expected) == (5, 1, 2, 7)
    assert EXAMPLE["evaluate_routes"](["Catalog"], [None]) == (1, 1, 0, 5)


def test_generic_sizes_and_zero_costs():
    assert EXAMPLE["evaluate_routes"]([None], ["A"], wrong_cost=0, review_cost=0) == (0, 0, 1, 0)
    expected = ["A", "B", None] * 7
    assert EXAMPLE["evaluate_routes"](expected, expected) == (14, 0, 7, 7)


def test_break_even_and_per_case_cost_exercise():
    assert 20_000 * (0.10 - 0.08) - 600 == pytest.approx(-200)
    assert 600 / (0.10 - 0.08) == pytest.approx(30_000)
    assert 50_000 * (0.10 - 0.08) - 600 == pytest.approx(400)
    assert 50_000 * (0.10 - 0.08 - 0.01) - 600 == pytest.approx(-100)
    assert 600 / (0.10 - 0.08 - 0.01) == pytest.approx(60_000)


@pytest.mark.parametrize("component", ["", 1, True, [], {}])
def test_invalid_component_identifiers(component):
    with pytest.raises(ValueError):
        EXAMPLE["route_incident"](component, OWNERS)


@pytest.mark.parametrize("decisions,expected", [([], []), ([None], []), ([True], ["A"]), (["A"], [""])])
def test_invalid_routing_comparison_inputs(decisions, expected):
    with pytest.raises(ValueError):
        EXAMPLE["evaluate_routes"](decisions, expected)


@pytest.mark.parametrize("costs", [
    {"wrong_cost": -1}, {"review_cost": True}, {"wrong_cost": float("inf")},
    {"review_cost": float("nan")}, {"wrong_cost": "5"},
])
def test_invalid_comparison_costs(costs):
    with pytest.raises(ValueError):
        EXAMPLE["evaluate_routes"](["A"], ["A"], **costs)
