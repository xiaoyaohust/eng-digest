"""Execute the published protocol example without an LLM or external service."""

import contextlib
import copy
import io
import math
from pathlib import Path
import re

import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/large-language-models-and-agents.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "llm_agents_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
ORDERS = {
    "A17": {"owner": "alice", "status": "in_transit"},
    "B22": {"owner": "bob", "status": "delivered"},
}


def test_published_output_matches_execution():
    expected = re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == expected


@pytest.mark.parametrize("customer,order_id,status", [
    ("alice", "A17", "in transit"), ("bob", "B22", "delivered"),
    ("alice", "B22", "unavailable"), ("alice", "missing", "unavailable"),
])
def test_access_is_checked_against_authenticated_customer(customer, order_id, status):
    orders = copy.deepcopy(ORDERS)
    answer, history = EXAMPLE["run_agent"](EXAMPLE["scripted_model"], customer, order_id, orders)
    assert answer == f"Order {order_id}: {status}."
    assert len(history) == 2
    if status == "unavailable":
        assert history[-1]["content"] == {"error": "unavailable"}
    else:
        assert history[-1]["content"] == {"order_id": order_id, "status": status.replace(" ", "_")}
    assert orders == ORDERS


@pytest.mark.parametrize("action", [
    "get_order('B22')", [], None,
    {"type": "tool", "name": "delete_order", "arguments": {"order_id": "A17"}},
    {"type": "tool", "name": "get_order", "arguments": {"order_id": "B22"}},
    {"type": "tool", "name": "get_order", "arguments": {"order_id": "A17", "customer_id": "bob"}},
    {"type": "tool", "name": "get_order", "arguments": ["A17"]},
    {"type": "final", "text": "Order A17: delivered."},
])
def test_rejects_unsupported_actions_identity_arguments_and_answers_without_evidence(action):
    with pytest.raises(ValueError):
        EXAMPLE["run_agent"](lambda history: action, "alice", "A17", ORDERS)


def test_repeated_requests_stop_after_the_exact_proposal_budget():
    observed_counts = []

    def repeat(history):
        observed_counts.append(len(history) - 1)
        return {"type": "tool", "name": "get_order", "arguments": {"order_id": "A17"}}

    with pytest.raises(RuntimeError, match="Step limit"):
        EXAMPLE["run_agent"](repeat, "alice", "A17", ORDERS, max_steps=3)
    assert observed_counts == [0, 1, 2]
    with pytest.raises(RuntimeError):
        EXAMPLE["run_agent"](EXAMPLE["scripted_model"], "alice", "A17", ORDERS, max_steps=1)
    assert EXAMPLE["run_agent"](EXAMPLE["scripted_model"], "alice", "A17", ORDERS, max_steps=2)[0] == "Order A17: in transit."


@pytest.mark.parametrize("budget", [0, -1, 1.5, True, None])
def test_budget_must_be_a_positive_integer(budget):
    with pytest.raises(ValueError):
        EXAMPLE["run_agent"](EXAMPLE["scripted_model"], "alice", "A17", ORDERS, max_steps=budget)


@pytest.mark.parametrize("text", ["", "   ", None, 42])
def test_rejects_malformed_final_answers_even_after_an_observation(text):
    def propose(history):
        if len(history) == 1:
            return EXAMPLE["scripted_model"](history)
        return {"type": "final", "text": text}

    with pytest.raises(ValueError):
        EXAMPLE["run_agent"](propose, "alice", "A17", ORDERS)


def test_documented_shape_checks_do_not_prove_answer_faithfulness():
    def contradict(history):
        if len(history) == 1:
            return EXAMPLE["scripted_model"](history)
        return {"type": "final", "text": "Order A17: delivered."}

    answer, history = EXAMPLE["run_agent"](contradict, "alice", "A17", ORDERS)
    assert history[-1]["content"]["status"] == "in_transit"
    assert answer == "Order A17: delivered."
    assert "that answer would pass these shape checks" in TEXT


def test_probability_examples_and_exercise_arithmetic():
    assert 0.6 * 0.5 == pytest.approx(0.3)
    assert -(math.log(0.6) + math.log(0.5)) / 2 == pytest.approx(0.602, abs=0.0005)
    assert 0.5 * 0.4 * 0.25 == pytest.approx(0.05)
    assert -math.log(0.05) / 3 == pytest.approx(0.999, abs=0.0005)
