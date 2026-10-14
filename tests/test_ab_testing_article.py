"""Verify the bucketing protocol published in the system-design article."""

from copy import deepcopy
from pathlib import Path
import re


ARTICLE = (
    Path(__file__).resolve().parents[1]
    / "site/src/content/system-design/ab-testing-platform.md"
)
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL)
assert SOURCE is not None
SCOPE = {}
exec(compile(SOURCE.group(1), str(ARTICLE), "exec"), SCOPE)
bucket = SCOPE["bucket"]
evaluate = SCOPE["evaluate"]


def config(rollout_bps=10000):
    return {
        "tenant_id": "tenant_example",
        "app_id": "checkout",
        "run_id": "run_checkout_1",
        "bucketing_salt": "salt_v1",
        "enabled": True,
        "targeting_rules": {"country": ["US", "CA"]},
        "rollout_bps": rollout_bps,
        "revision": 42,
        "variants": [
            {"key": "control", "weight_bps": 5000},
            {"key": "treatment", "weight_bps": 5000},
        ],
    }


def test_published_golden_vector_matches_the_canonical_protocol():
    fields = ("tenant_example", "checkout", "run_checkout_1", "salt_v1", "user_456")
    assert bucket(*fields, "rollout") == 1542
    assert bucket(*fields, "variant") == 2342
    assert evaluate(config(1000), "user_456", {"country": "US"}) == "DEFAULT"
    assert evaluate(config(2000), "user_456", {"country": "US"}) == "control"


def test_rollout_expansion_preserves_every_existing_subject_variant():
    for subject_index in range(2000):
        subject = f"user_{subject_index}"
        previous = "DEFAULT"
        for percentage in (0, 1, 5, 10, 20, 50, 100):
            current = evaluate(config(percentage * 100), subject, {"country": "US"})
            if previous != "DEFAULT":
                assert current == previous
            previous = current
        assert previous in {"control", "treatment"}


def test_configuration_revision_does_not_change_assignment():
    original = config()
    refreshed = deepcopy(original)
    refreshed["revision"] = 43
    for subject_index in range(500):
        subject = f"user_{subject_index}"
        assert evaluate(original, subject, {"country": "US"}) == evaluate(
            refreshed, subject, {"country": "US"}
        )


def test_disabled_ineligible_and_missing_identity_return_default():
    disabled = config()
    disabled["enabled"] = False
    assert evaluate(disabled, "user_456", {"country": "US"}) == "DEFAULT"
    assert evaluate(config(), "user_456", {"country": "FR"}) == "DEFAULT"
    assert evaluate(config(), "user_456", {}) == "DEFAULT"
    assert evaluate(config(), None, {"country": "US"}) == "DEFAULT"
    assert evaluate(config(), "", {"country": "US"}) == "DEFAULT"


def test_length_prefixes_distinguish_ambiguous_concatenations():
    assert bucket("ab", "c", "run", "salt", "user", "variant") != bucket(
        "a", "bc", "run", "salt", "user", "variant"
    )
    assert bucket("tenant", "app", "run", "salt", "user", "rollout") != bucket(
        "tenant", "app", "run", "salt", "user", "variant"
    )


def test_subject_identity_includes_utf8_without_silent_normalization():
    for subject in ("é", "e\u0301", "用户", "0", "-17"):
        value = bucket("tenant", "app", "run", "salt", subject, "variant")
        assert 0 <= value < 10000
        assert value == bucket("tenant", "app", "run", "salt", subject, "variant")
    assert bucket("tenant", "app", "run", "salt", "User", "variant") != bucket(
        "tenant", "app", "run", "salt", "user", "variant"
    )


def test_article_contains_five_diagrams_and_labels_numbers_as_assumptions():
    assert TEXT.count("```mermaid") == 5
    assert "These are design targets and assumptions" in TEXT
    assert "A local SDK that is disconnected cannot observe the stop immediately." in TEXT
    assert "Result freshness does not imply outcome maturity" in TEXT
