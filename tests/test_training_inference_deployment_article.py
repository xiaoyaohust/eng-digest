"""Run the exact published model lifecycle example without a training framework."""

import contextlib
from dataclasses import FrozenInstanceError, asdict
import io
import json
from pathlib import Path
import re

import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/ai/training-inference-and-deployment.md"
TEXT = ARTICLE.read_text()
SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXAMPLE = {"__name__": "training_inference_example"}
exec(compile(SOURCE, str(ARTICLE), "exec"), EXAMPLE)
TRAINING = [(0, 0), (1, 0), (2, 1), (3, 1), (4, 0), (5, 1)]


def make_service(**overrides):
    model = asdict(EXAMPLE["fit_model"](TRAINING, "email-v1"))
    model.update(overrides)
    return EXAMPLE["EmailService"](json.dumps(model))


def test_published_output_matches_execution():
    expected = re.search(r"```text\n(.*?)\n```", TEXT, re.DOTALL).group(1)
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        EXAMPLE["main"]()
    assert output.getvalue().strip() == expected


def test_fitting_round_trip_and_inference_leave_parameters_unchanged():
    model = EXAMPLE["fit_model"](TRAINING, "email-v1")
    assert model.threshold == 2
    assert sum(int(x >= model.threshold) != y for x, y in TRAINING) == 1
    service = EXAMPLE["EmailService"](json.dumps(asdict(model)))
    before = asdict(service.model)
    predictions = [service.predict({"flagged_count": x, "feature_version": EXAMPLE["FEATURE_VERSION"]})["prediction"] for x in [0, 1, 2, 3, 4, 5]]
    assert predictions == [0, 0, 1, 1, 1, 1]
    assert asdict(service.model) == before == asdict(model)
    with pytest.raises(FrozenInstanceError):
        service.model.threshold = 3


@pytest.mark.parametrize("examples", [[], [(-1, 0)], [(True, 1)], [(1.5, 1)], [(1, 2)], [(1, False)]])
def test_rejects_invalid_training_data(examples):
    with pytest.raises(ValueError):
        EXAMPLE["fit_model"](examples, "v1")


def test_threshold_ties_follow_the_documented_rule():
    assert EXAMPLE["fit_model"]([(2, 1)], "v1").threshold == 0
    assert EXAMPLE["fit_model"]([(0, 0)], "v1").threshold == 1


@pytest.mark.parametrize("payload", [
    None, [], {"flagged_count": 3},
    {"flagged_count": 3, "feature_version": "distinct-count-v2"},
    {"flagged_count": 3, "feature_version": "flagged-count-v1", "label": 1},
    *[{"flagged_count": count, "feature_version": "flagged-count-v1"} for count in [True, -1, 2.5, "3", None]],
])
def test_rejects_incompatible_or_malformed_requests(payload):
    with pytest.raises(ValueError):
        make_service().predict(payload)


@pytest.mark.parametrize("override", [
    {"model_version": ""}, {"model_version": 1},
    {"feature_version": "distinct-count-v2"},
    {"threshold": -1}, {"threshold": True}, {"threshold": 2.0},
])
def test_rejects_incompatible_artifact_metadata(override):
    with pytest.raises(ValueError):
        make_service(**override)
