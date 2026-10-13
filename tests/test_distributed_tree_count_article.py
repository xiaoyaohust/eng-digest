"""Run the actual published snippets, including asynchronous fault cases."""

import asyncio
from collections import Counter
from pathlib import Path
import random
import re
import shutil
import subprocess
import sys
import types

import pytest


ARTICLE = (
    Path(__file__).resolve().parents[1]
    / "site/src/content/coding/distributed-tree-count-async-messages.md"
)
TEXT = ARTICLE.read_text()
PYTHON_SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
JAVA_SOURCE = re.search(r"```java\n(.*?)\n```", TEXT, re.DOTALL).group(1)
MODULE = types.ModuleType("distributed_tree_count_article")
sys.modules[MODULE.__name__] = MODULE
exec(compile(PYTHON_SOURCE, str(ARTICLE), "exec"), MODULE.__dict__)
Network = MODULE.Network
Message = MODULE.Message

EXPECTED_OUTPUT = [
    "Whole tree: 6",
    "Subtree: 3",
    "Leaf: 1",
    "Overlapping requests: 6, 3",
    "Retry + duplicates: 6",
    "Replay completed request: 6",
    "Single node with a negative ID: 1",
    "Chain of 40 nodes: 40",
    "Permanent failure: timeout",
]


def test_python_main_prints_the_documented_results(capsys):
    asyncio.run(MODULE.main())
    assert capsys.readouterr().out.splitlines() == EXPECTED_OUTPUT


def test_java_main_prints_the_same_results(tmp_path):
    javac, java = shutil.which("javac"), shutil.which("java")
    if not javac or not java:
        pytest.skip("A JDK is required to compile the published Java example")
    source = tmp_path / "DistributedTreeCount.java"
    source.write_text(JAVA_SOURCE)
    subprocess.run(
        [javac, "--release", "17", str(source)],
        check=True, capture_output=True, text=True, timeout=30,
    )
    completed = subprocess.run(
        [java, "-cp", str(tmp_path), "DistributedTreeCount"],
        check=True, capture_output=True, text=True, timeout=15,
    )
    assert completed.stdout.splitlines() == EXPECTED_OUTPUT
    assert completed.stderr == ""


def test_random_trees_overlap_and_duplicates_match_a_serial_oracle():
    async def scenario():
        rng = random.Random(20261012)
        for size in (1, 2, 7, 31, 80):
            for trial in range(4):
                ids = rng.sample(range(-10000, 10000), size)
                tree = {node_id: [] for node_id in ids}
                for index in range(1, size):
                    tree[ids[rng.randrange(index)]].append(ids[index])
                roots = [ids[0]] + rng.choices(ids, k=5)
                expected = []
                for root in roots:
                    stack, count = [root], 0
                    while stack:
                        current = stack.pop()
                        count += 1
                        stack.extend(tree[current])
                    expected.append(count)
                network = Network(tree, timeout=2, retry_interval=0.02, delivery_copies=3)
                try:
                    futures = [
                        network.countNodes(root, f"{size}-{trial}-{index}")
                        for index, root in enumerate(roots)
                    ]
                    assert await asyncio.gather(*futures) == expected
                finally:
                    network.close()
    asyncio.run(scenario())


@pytest.mark.parametrize("lost_kind", ["REQUEST", "RESPONSE"])
def test_lost_request_or_response_recovers_with_the_same_id(lost_kind):
    async def scenario():
        dropped = False
        attempts = Counter()

        def drop_rule(from_id, to_id, message):
            nonlocal dropped
            attempts[(from_id, to_id, message.kind, message.request_id)] += 1
            edge = (from_id, to_id)
            expected_edge = (0, 1) if lost_kind == "REQUEST" else (1, 0)
            if not dropped and message.kind == lost_kind and edge == expected_edge:
                dropped = True
                return True
            return False

        network = Network({0: [1], 1: []}, 1, 0.005, drop_rule=drop_rule)
        try:
            assert await network.countNodes(0, "retry") == 2
            assert dropped
            assert attempts[(0, 1, "REQUEST", "retry")] >= 2
            assert network.nodes[1].completed["retry"].count == 1
        finally:
            network.close()
    asyncio.run(scenario())


def test_duplicate_reply_is_ignored_before_the_other_child_finishes():
    async def scenario():
        network = Network({0: [1, 2], 1: [], 2: []}, 1, 0.02)
        try:
            future = network.countNodes(0, "dedup")
            node = network.nodes[0]
            node.receiveMessage(None, Message("dedup", "REQUEST"))
            node.receiveMessage(99, Message("dedup", "RESPONSE", 100))
            node.receiveMessage(1, Message("dedup", "RESPONSE", 1))
            node.receiveMessage(1, Message("dedup", "RESPONSE", 1))
            assert node.active["dedup"].count == 2
            assert node.active["dedup"].pending == {2}
            node.receiveMessage(2, Message("dedup", "RESPONSE", 1))
            assert await future == 3
        finally:
            network.close()
    asyncio.run(scenario())


def test_out_of_order_responses_do_not_change_the_total():
    async def scenario():
        network = Network({0: [1, 2], 1: [], 2: []}, 1, 0.05)
        original_send = network.sendAsyncMessage
        order = []

        def send(from_id, to_id, message):
            if message.kind == "RESPONSE" and to_id == 0:
                delay = 0.01 if from_id == 1 else 0
                network.loop.call_later(
                    delay, lambda: (order.append(from_id), original_send(from_id, to_id, message))
                )
            else:
                original_send(from_id, to_id, message)

        network.sendAsyncMessage = send
        try:
            assert await network.countNodes(0, "order") == 3
            assert order == [2, 1]
        finally:
            network.close()
    asyncio.run(scenario())


def test_permanent_failure_times_out_and_active_state_expires():
    async def scenario():
        network = Network(
            {0: [1], 1: []}, 0.04, 0.005,
            drop_rule=lambda from_id, to_id, message: to_id == 1,
        )
        try:
            with pytest.raises(TimeoutError):
                await network.countNodes(0, "missing")
            await asyncio.sleep(0.04)
            assert not network.nodes[0].active
            assert network.nodes[0].completed["missing"].kind == "FAILED"
        finally:
            network.close()
    asyncio.run(scenario())


def test_failed_child_propagates_failure_without_returning_a_partial_sum():
    async def scenario():
        network = Network({0: [1, 2], 1: [], 2: []}, 1, 0.02)
        try:
            future = network.countNodes(0, "failed")
            node = network.nodes[0]
            node.receiveMessage(None, Message("failed", "REQUEST"))
            node.receiveMessage(1, Message("failed", "RESPONSE", 1))
            node.receiveMessage(2, Message("failed", "FAILED", 999))
            with pytest.raises(TimeoutError):
                await future
            assert node.completed["failed"].kind == "FAILED"
            assert node.completed["failed"].count == 2
        finally:
            network.close()
    asyncio.run(scenario())


def test_deep_chain_does_not_use_recursive_calls():
    async def scenario():
        size = 1200
        tree = {i: [i + 1] if i + 1 < size else [] for i in range(size)}
        network = Network(tree, 2, 0.5)
        try:
            assert await network.countNodes(0, "deep") == size
        finally:
            network.close()
    asyncio.run(scenario())


def test_request_id_cannot_be_reused_for_another_root():
    async def scenario():
        network = Network({0: [1], 1: []}, 1, 0.02)
        try:
            first = network.countNodes(0, "same-id")
            assert network.countNodes(0, "same-id") is first
            with pytest.raises(ValueError, match="another root"):
                network.countNodes(1, "same-id")
            assert await first == 2
        finally:
            network.close()
    asyncio.run(scenario())


def test_snippets_are_english_and_the_problem_does_not_label_a_translation():
    assert not re.search("[\\u3400-\\u9fff]", JAVA_SOURCE + PYTHON_SOURCE)
    assert "English translation" not in TEXT
