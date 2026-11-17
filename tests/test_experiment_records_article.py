"""Execute the published runner and test retained evidence and replay failures."""

import hashlib
import importlib.util
import json
from pathlib import Path
import random
import re
import subprocess
import sys

import numpy as np
import pytest


ROOT = Path(__file__).resolve().parents[1]
TEXT = (ROOT / "site/src/content/ai/experiment-records-version-control-and-reproduction.md").read_text()
CHINESE = (ROOT / "site/src/content/translations/ai/experiment-records-version-control-and-reproduction.md").read_text()
CODE = re.search(r"```python\n(.*?)\n```", TEXT, re.S).group(1)
EXPECTED = re.search(r"```text\n(.*?)\n```", TEXT, re.S).group(1)
DATA = b"id,size,minutes\nt1,1,2\nt2,2,4\nt3,3,6\nt4,4,8\nv1,5,10\nv2,6,12\nv3,7,14\n"
SPLIT = {"train": ["t1", "t2", "t3", "t4"], "validation": ["v1", "v2", "v3"]}


@pytest.fixture(scope="module")
def runner(tmp_path_factory):
    script = tmp_path_factory.mktemp("published_records") / "recorded_experiment.py"
    script.write_text(CODE)
    spec = importlib.util.spec_from_file_location("published_records", script)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_both_languages_publish_identical_executable_code_and_output(runner):
    assert re.search(r"```python\n(.*?)\n```", CHINESE, re.S).group(1) == CODE
    assert re.search(r"```text\n(.*?)\n```", CHINESE, re.S).group(1) == EXPECTED
    result = subprocess.run([sys.executable, runner.__file__], check=True,
                            capture_output=True, text=True, timeout=15)
    assert result.stdout.strip() == EXPECTED
    assert result.stderr == ""


@pytest.mark.parametrize("model,coefficients,mae", [("mean", [5.0, 0.0], 7.0), ("line", [0.0, 2.0], 0.0)])
def test_record_and_replay_preserve_complete_inputs_and_identified_outputs(runner, tmp_path, model, coefficients, mae):
    folder = runner.record_run(tmp_path / model, DATA, SPLIT, {"model": model})
    manifest = json.loads((folder / "manifest.json").read_text())
    assert manifest["status"] == "complete"
    assert manifest["schema_version"] == 1
    assert manifest["protocol"] == "build-duration-mae-v1"
    assert manifest["started_at"] <= manifest["finished_at"]
    assert len(manifest["files"]) == 6
    for name, digest in manifest["files"].items():
        assert hashlib.sha256((folder / name).read_bytes()).hexdigest() == digest
    assert (folder / "source.py").read_bytes() == Path(runner.__file__).read_bytes()
    assert json.loads((folder / "split.json").read_bytes()) == SPLIT
    result = runner.replay_run(folder)
    assert result["coefficients"] == coefficients
    assert result["mae_minutes"] == mae
    assert result["validation_count"] == 3
    assert [row["id"] for row in result["predictions"]] == SPLIT["validation"]


def test_generic_dataset_sizes_and_models_match_an_independent_numpy_oracle(runner):
    rng = random.Random(20261116)
    for _ in range(40):
        n, m = rng.randrange(3, 11), rng.randrange(1, 7)
        x = np.array(rng.sample(range(-50, 51), n + m), dtype=float)
        y = 3 + 1.5 * x + np.array([rng.uniform(-1, 1) for _ in x])
        ids = [f"case_{i}" for i in range(n + m)]
        data = ("id,size,minutes\n" + "\n".join(f"{key},{size!r},{duration!r}"
                for key, size, duration in zip(ids, x.tolist(), y.tolist())) + "\n").encode()
        split = {"train": ids[:n], "validation": ids[n:]}
        for model in ("mean", "line"):
            result = runner.evaluate(data, split, {"model": model})
            design = np.column_stack((np.ones(n), x[:n]))
            coefficients = np.array([y[:n].mean(), 0]) if model == "mean" else np.linalg.lstsq(design, y[:n], rcond=None)[0]
            predictions = coefficients[0] + coefficients[1] * x[n:]
            assert result["coefficients"] == pytest.approx(coefficients)
            assert [row["prediction"] for row in result["predictions"]] == pytest.approx(predictions)
            assert result["mae_minutes"] == pytest.approx(np.abs(predictions - y[n:]).mean())


@pytest.mark.parametrize("name", ["data.csv", "split.json", "config.json", "source.py", "environment.json", "result.json"])
def test_changed_artifact_is_rejected_before_any_fitting(runner, tmp_path, monkeypatch, name):
    folder = runner.record_run(tmp_path / "record", DATA, SPLIT, {"model": "line"})
    (folder / name).write_bytes((folder / name).read_bytes() + b" ")
    def forbidden(*args):
        pytest.fail("A changed artifact must not reach fitting")
    monkeypatch.setattr(runner, "evaluate", forbidden)
    with pytest.raises(ValueError, match="checksum mismatch"):
        runner.replay_run(folder)


@pytest.mark.parametrize("name", ["data.csv", "split.json", "config.json", "source.py", "environment.json", "result.json"])
def test_missing_artifact_cannot_be_recovered_from_its_checksum(runner, tmp_path, name):
    folder = runner.record_run(tmp_path / "record", DATA, SPLIT, {"model": "line"})
    (folder / name).unlink()
    with pytest.raises(FileNotFoundError):
        runner.replay_run(folder)


@pytest.mark.parametrize("field,value", [("status", "failed"), ("schema_version", 2),
                                        ("protocol", "other"), ("files", {"../outside": "abc"})])
def test_invalid_manifests_are_rejected_before_loading_arbitrary_paths(runner, tmp_path, field, value):
    folder = runner.record_run(tmp_path / "record", DATA, SPLIT, {"model": "line"})
    manifest = json.loads((folder / "manifest.json").read_text())
    manifest[field] = value
    (folder / "manifest.json").write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="Unsupported or incomplete"):
        runner.replay_run(folder)


def test_a_rehashed_false_prediction_still_fails_the_full_result_comparison(runner, tmp_path):
    folder = runner.record_run(tmp_path / "record", DATA, SPLIT, {"model": "line"})
    result = json.loads((folder / "result.json").read_text())
    result["predictions"][0]["prediction"] = 11
    result["mae_minutes"] = 0  # An unchanged summary cannot conceal changed predictions.
    payload = json.dumps(result).encode()
    (folder / "result.json").write_bytes(payload)
    manifest = json.loads((folder / "manifest.json").read_text())
    manifest["files"]["result.json"] = hashlib.sha256(payload).hexdigest()
    (folder / "manifest.json").write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="Replayed result differs"):
        runner.replay_run(folder)


def test_changed_recorded_source_cannot_be_replayed_as_current_code(runner, tmp_path):
    folder = runner.record_run(tmp_path / "record", DATA, SPLIT, {"model": "line"})
    payload = (folder / "source.py").read_bytes() + b"\n# changed source\n"
    (folder / "source.py").write_bytes(payload)
    manifest = json.loads((folder / "manifest.json").read_text())
    manifest["files"]["source.py"] = hashlib.sha256(payload).hexdigest()
    (folder / "manifest.json").write_text(json.dumps(manifest))
    with pytest.raises(ValueError, match="runner differs"):
        runner.replay_run(folder)


def test_recording_refuses_to_overwrite_existing_evidence(runner, tmp_path):
    folder = runner.record_run(tmp_path / "record", DATA, SPLIT, {"model": "line"})
    original = {file.name: file.read_bytes() for file in folder.iterdir()}
    with pytest.raises(FileExistsError):
        runner.record_run(folder, DATA, SPLIT, {"model": "mean"})
    assert {file.name: file.read_bytes() for file in folder.iterdir()} == original


@pytest.mark.parametrize("data,split,config", [
    (DATA, {"train": ["t1"], "validation": ["t1"]}, {"model": "line"}),
    (DATA, {"train": [], "validation": ["v1"]}, {"model": "mean"}),
    (DATA, {"train": ["missing"], "validation": ["v1"]}, {"model": "mean"}),
    (DATA, {"train": ["t1", "t1"], "validation": ["v1"]}, {"model": "mean"}),
    (DATA, SPLIT, {"model": "other"}),
    (DATA, SPLIT, {"model": "line", "hidden_default": 3}),
    (DATA.replace(b"t1,1,2", b"t1,1,nan"), SPLIT, {"model": "line"}),
    (DATA.replace(b"t1,1,2", b"t1,1,inf"), SPLIT, {"model": "line"}),
    (DATA.replace(b"t2,2,4", b"t1,2,4"), SPLIT, {"model": "line"}),
    (DATA.replace(b"id,size,minutes", b"id,size,target"), SPLIT, {"model": "line"}),
    (DATA.replace(b"t1,1,2", b"t1,1,2,extra"), SPLIT, {"model": "line"}),
    (DATA.replace(b"t1,1,2", b"t1,1"), SPLIT, {"model": "line"}),
    (DATA, {"train": ["t1"], "validation": ["v1"]}, {"model": "line"}),
])
def test_invalid_evaluation_records_a_failure_and_cannot_replay(runner, tmp_path, data, split, config):
    folder = tmp_path / "failed"
    with pytest.raises(ValueError):
        runner.record_run(folder, data, split, config)
    manifest = json.loads((folder / "manifest.json").read_text())
    assert manifest["status"] == "failed"
    assert "failure.json" in manifest["files"]
    assert not (folder / "result.json").exists()
    assert json.loads((folder / "failure.json").read_text())["error_type"] == "ValueError"
    with pytest.raises(ValueError, match="incomplete"):
        runner.replay_run(folder)


def test_validation_labels_cannot_change_fitted_coefficients_or_predictions(runner):
    before = runner.evaluate(DATA, SPLIT, {"model": "line"})
    after = runner.evaluate(DATA.replace(b"v1,5,10", b"v1,5,100"), SPLIT, {"model": "line"})
    assert before["coefficients"] == after["coefficients"]
    assert before["predictions"] == after["predictions"]
    assert after["mae_minutes"] == 30
    reversed_split = {"train": SPLIT["train"], "validation": SPLIT["validation"][::-1]}
    assert [row["id"] for row in runner.evaluate(DATA, reversed_split, {"model": "line"})["predictions"]] == reversed_split["validation"]
