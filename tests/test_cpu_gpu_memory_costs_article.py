"""Execute the published memory and billing calculations without a GPU."""

import contextlib
import io
from pathlib import Path
import re

import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/cpu-gpu-memory-and-compute-costs.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "memory_cost_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
CONFIG = dict(parameters=3_000_000_000, weight_bytes=2, layers=24,
              kv_heads=8, head_dim=128, cache_bytes=2, workspace_gib=2,
              capacity_gib=16, safety_gib=2, batch=8, context_tokens=8192)


def test_printed_output_matches_the_article():
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)


@pytest.mark.parametrize("batch,tokens,total,fits,limit", [
    (4, 2048, 8.337935447692871, True, 34),
    (8, 8192, 13.587935447692871, True, 8),
    (12, 8192, 16.58793544769287, False, 8),
    (8, 4096, 10.587935447692871, True, 17),
])
def test_memory_examples_and_exercise(batch, tokens, total, fits, limit):
    config = dict(CONFIG, batch=batch, context_tokens=tokens)
    actual = EXAMPLE["memory_budget"](**config)
    assert actual[0] == pytest.approx(total)
    assert actual[1:] == (fits, limit)
    assert config == dict(CONFIG, batch=batch, context_tokens=tokens)


def test_oversized_weights_and_exact_fit():
    total, fits, limit = EXAMPLE["memory_budget"](**dict(CONFIG, capacity_gib=4))
    assert total > 2 and fits is False and limit == 0
    config = dict(parameters=2 ** 29, weight_bytes=2, layers=1, kv_heads=1,
                  head_dim=1, context_tokens=2 ** 28, cache_bytes=2,
                  workspace_gib=0, capacity_gib=2, safety_gib=0, batch=1)
    assert EXAMPLE["memory_budget"](**config) == (2, True, 1)


def test_weight_precision_and_cache_growth_are_separate():
    original = EXAMPLE["memory_budget"](**CONFIG)[0]
    quantized = EXAMPLE["memory_budget"](**dict(CONFIG, weight_bytes=0.5))[0]
    assert original - quantized == pytest.approx(3_000_000_000 * 1.5 / 2 ** 30)
    doubled_context = EXAMPLE["memory_budget"](**dict(CONFIG, context_tokens=16384))[0]
    assert doubled_context - original == 6


@pytest.mark.parametrize("rate,throughput,utilization,expected", [
    (2, 40, 1, 13.8888888889), (2, 40, 0.25, 55.5555555556),
    (3, 60, 0.2, 69.4444444444), (0, 40, 1, 0),
])
def test_costs(rate, throughput, utilization, expected):
    assert EXAMPLE["cost_per_million"](rate, throughput, utilization) == pytest.approx(expected)


@pytest.mark.parametrize("field,value", [
    ("parameters", 0), ("layers", -1), ("kv_heads", True), ("head_dim", 1.5),
    ("context_tokens", 0), ("batch", "8"), ("weight_bytes", float("nan")),
    ("cache_bytes", 0), ("workspace_gib", -1), ("capacity_gib", float("inf")),
    ("safety_gib", 16), ("safety_gib", -1), ("weight_bytes", True),
])
def test_invalid_memory_inputs(field, value):
    with pytest.raises(ValueError):
        EXAMPLE["memory_budget"](**dict(CONFIG, **{field: value}))


@pytest.mark.parametrize("rate,throughput,utilization", [
    (-1, 40, 1), (2, 0, 1), (2, 40, 0), (2, 40, 1.1),
    (True, 40, 1), (2, float("inf"), 1), (2, 40, float("nan")),
])
def test_invalid_billing_inputs(rate, throughput, utilization):
    with pytest.raises(ValueError):
        EXAMPLE["cost_per_million"](rate, throughput, utilization)
