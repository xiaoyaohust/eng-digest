"""Verify both published dictionaries using a plain-map oracle and every pool index."""

from collections import Counter
from pathlib import Path
import random
import re
import shutil
import subprocess
import types

import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/coding/random-value-dictionary.md"
TEXT = ARTICLE.read_text()
PYTHON = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
JAVA = re.search(r"```java\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXPECTED = re.search(r"```text\n(.*?)\n```", TEXT.split("## Expected output\n")[1], re.DOTALL).group(1)
MODULE = types.ModuleType("random_value_dictionary_article")
exec(compile(PYTHON, str(ARTICLE), "exec"), MODULE.__dict__)
Dictionary = MODULE.RandomValueDictionary


class IndexSource:
    def __init__(self):
        self.index = 0
        self.bound = 0

    def randrange(self, bound):
        assert bound == self.bound
        assert 0 <= self.index < bound
        return self.index


def traces():
    yield []
    yield [("P", 1, 5), ("P", 2, 5), ("P", 3, 6), ("P", 4, 5),
           ("P", 1, 6), ("P", 1, 6), ("D", 2), ("D", 4),
           ("D", 1), ("D", 3), ("D", 3), ("G", 3), ("P", 3, -7)]
    yield [("P", 1, 10), ("P", 2, 20), ("P", 3, 30),
           ("D", 2), ("P", 3, 40), ("D", 3), ("D", 1)]
    yield [("P", 0, -(1 << 63)), ("P", 1, (1 << 63) - 1),
           ("P", 2, -(1 << 63)), ("D", 0), ("D", 2)]
    rng = random.Random(20261114)
    for _ in range(80):
        commands = []
        for _ in range(200):
            key = rng.randrange(20)
            choice = rng.randrange(10)
            commands.append(("P", key, rng.randrange(-4, 5)) if choice < 5
                            else ("D" if choice < 8 else "G", key))
        yield commands


def check_state(dictionary, model, distinct, source):
    for key, value in model.items():
        assert dictionary.get(key) == value
    expected = Counter({value: 1 for value in model.values()}) if distinct else Counter(model.values())
    source.bound = len(expected) if distinct else len(model)
    if not model:
        with pytest.raises(LookupError):
            dictionary.get_rand_val()
    else:
        observed = []
        for index in range(source.bound):
            source.index = index
            observed.append(dictionary.get_rand_val())
        assert Counter(observed) == expected

    # These assertions check bookkeeping independently of the returned values.
    pool = dictionary._pool
    assert len(pool) == source.bound
    counts = Counter(id(binding[1]) for binding in dictionary._by_key.values())
    assert len(dictionary._by_key) == len(model)
    assert len({id(slot) for slot in pool}) == len(pool)
    for index, slot in enumerate(pool):
        assert slot.index == index
        assert slot.count == counts[id(slot)] > 0
    if distinct:
        assert set(dictionary._by_value) == set(model.values())
        for slot in pool:
            assert dictionary._by_value[slot.value] is slot


@pytest.mark.parametrize("distinct", [False, True])
def test_python_matches_oracle_after_every_mutation_and_lookup(distinct):
    for trace in traces():
        source, model = IndexSource(), {}
        dictionary = Dictionary(distinct, source)
        check_state(dictionary, model, distinct, source)
        for operation, key, *tail in trace:
            if operation == "P":
                dictionary.put(key, tail[0])
                model[key] = tail[0]
            elif operation == "D":
                exists = key in model
                assert dictionary.delete(key) is exists
                model.pop(key, None)
            elif key in model:
                assert dictionary.get(key) == model[key]
            else:
                with pytest.raises(KeyError):
                    dictionary.get(key)
            check_state(dictionary, model, distinct, source)


def test_python_main_matches_published_output(capsys):
    MODULE.main()
    assert capsys.readouterr().out.strip() == EXPECTED


@pytest.mark.parametrize("distinct", [False, True])
def test_python_preserves_equal_values_assigned_to_individual_keys(distinct):
    class EqualValue:
        def __hash__(self):
            return 1

        def __eq__(self, other):
            return isinstance(other, EqualValue)

    first, second, replacement = EqualValue(), EqualValue(), EqualValue()
    dictionary = Dictionary(distinct)
    dictionary.put("a", first)
    dictionary.put("b", second)
    assert dictionary.get("a") is first
    assert dictionary.get("b") is second
    dictionary.put("a", replacement)
    assert dictionary.get("a") is replacement
    dictionary.delete("b")
    assert dictionary.get_rand_val() == replacement


def test_python_unhashable_frequency_values_and_invalid_distinct_update():
    dictionary = Dictionary(False)
    value = [1, 2]
    dictionary.put(("tuple", 1), value)
    assert dictionary.get(("tuple", 1)) is value
    assert dictionary.get_rand_val() is value
    distinct = Dictionary(True)
    distinct.put("a", "original")
    with pytest.raises(TypeError):
        distinct.put("a", [])
    assert distinct.get("a") == "original"
    assert distinct.get_rand_val() == "original"


@pytest.mark.parametrize("distinct", [False, True])
def test_python_hash_collisions_do_not_corrupt_moves(distinct):
    class Key:
        def __init__(self, value):
            self.value = value

        def __hash__(self):
            return 0

        def __eq__(self, other):
            return isinstance(other, Key) and self.value == other.value

    dictionary = Dictionary(distinct)
    for i in range(100):
        dictionary.put(Key(i), i % 7)
    for i in range(1, 100, 2):
        assert dictionary.delete(Key(i))
    for i in range(0, 100, 2):
        assert dictionary.get(Key(i)) == i % 7
        dictionary.put(Key(i), 42)
    assert dictionary.get_rand_val() == 42


@pytest.mark.parametrize("distinct", [False, True])
@pytest.mark.parametrize("operation", ["put-key", "put-value", "get", "delete"])
def test_python_none_inputs_do_not_delete_existing_bindings(distinct, operation):
    dictionary = Dictionary(distinct)
    dictionary.put("a", 3)
    with pytest.raises(ValueError):
        if operation == "put-key":
            dictionary.put(None, 4)
        elif operation == "put-value":
            dictionary.put("a", None)
        elif operation == "get":
            dictionary.get(None)
        else:
            dictionary.delete(None)
    assert dictionary.get("a") == 3
    assert dictionary.get_rand_val() == 3


@pytest.fixture(scope="module")
def java_program(tmp_path_factory):
    javac, java = shutil.which("javac"), shutil.which("java")
    if not javac or not java:
        pytest.skip("A JDK is required to compile the published Java solution")
    directory = tmp_path_factory.mktemp("random_dictionary_java")
    (directory / "RandomValueDictionary.java").write_text(JAVA)
    (directory / "DictionaryHarness.java").write_text("""
import java.util.*;

public class DictionaryHarness {
    static class IndexRandom extends Random {
        int index, expectedBound;
        @Override public int nextInt(int bound) {
            if (bound != expectedBound || index < 0 || index >= bound) {
                throw new AssertionError("Wrong random pool bound");
            }
            return index;
        }
    }
    record CollisionKey(int id) {
        @Override public int hashCode() { return 0; }
    }
    static void check(RandomValueDictionary<Integer, Long> dictionary,
                      Map<Integer, Long> model, boolean distinct, IndexRandom random) {
        for (var entry : model.entrySet()) {
            if (!entry.getValue().equals(dictionary.get(entry.getKey()))) {
                throw new AssertionError("Lookup mismatch");
            }
        }
        Map<Long, Integer> expected = new TreeMap<>();
        for (long value : model.values()) {
            expected.put(value, distinct ? 1 : expected.getOrDefault(value, 0) + 1);
        }
        random.expectedBound = distinct ? expected.size() : model.size();
        if (model.isEmpty()) {
            try { dictionary.getRandVal(); throw new AssertionError("Empty sampling"); }
            catch (NoSuchElementException correct) { }
        } else {
            Map<Long, Integer> observed = new TreeMap<>();
            for (int i = 0; i < random.expectedBound; i++) {
                random.index = i;
                observed.merge(dictionary.getRandVal(), 1, Integer::sum);
            }
            if (!observed.equals(expected)) throw new AssertionError("Wrong multiplicities");
        }
    }
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int cases = input.nextInt();
        for (int test = 0; test < cases; test++) {
            boolean distinct = input.nextInt() == 1;
            IndexRandom random = new IndexRandom();
            var dictionary = new RandomValueDictionary<Integer, Long>(distinct, random);
            Map<Integer, Long> model = new HashMap<>();
            check(dictionary, model, distinct, random);
            int steps = input.nextInt();
            for (int step = 0; step < steps; step++) {
                String operation = input.next();
                int key = input.nextInt();
                if (operation.equals("P")) {
                    long value = input.nextLong();
                    dictionary.put(key, value);
                    model.put(key, value);
                } else if (operation.equals("D")) {
                    boolean exists = model.containsKey(key);
                    if (dictionary.delete(key) != exists) throw new AssertionError("Delete mismatch");
                    model.remove(key);
                } else if (model.containsKey(key)) {
                    if (!model.get(key).equals(dictionary.get(key))) throw new AssertionError("Get mismatch");
                } else {
                    try { dictionary.get(key); throw new AssertionError("Missing lookup accepted"); }
                    catch (NoSuchElementException correct) { }
                }
                check(dictionary, model, distinct, random);
            }
        }
        for (boolean distinct : new boolean[]{false, true}) {
            var dictionary = new RandomValueDictionary<CollisionKey, Integer>(distinct, new Random(1));
            for (int i = 0; i < 100; i++) dictionary.put(new CollisionKey(i), i % 7);
            for (int i = 1; i < 100; i += 2) dictionary.delete(new CollisionKey(i));
            for (int i = 0; i < 100; i += 2) {
                if (dictionary.get(new CollisionKey(i)) != i % 7) throw new AssertionError("Collision lookup");
                dictionary.put(new CollisionKey(i), 42);
            }
            if (dictionary.getRandVal() != 42) throw new AssertionError("Collision update");
            var values = new RandomValueDictionary<String, String>(distinct, new Random(2));
            String a = new String("same"), b = new String("same"), c = new String("same");
            values.put("a", a); values.put("b", b);
            if (values.get("a") != a || values.get("b") != b) throw new AssertionError("Assigned identity");
            values.put("a", c);
            if (values.get("a") != c) throw new AssertionError("Updated identity");
            for (int operation = 0; operation < 4; operation++) {
                try {
                    if (operation == 0) values.put(null, "bad");
                    else if (operation == 1) values.put("a", null);
                    else if (operation == 2) values.get(null);
                    else values.delete(null);
                    throw new AssertionError("Null accepted");
                } catch (NullPointerException correct) { }
                if (values.get("a") != c) throw new AssertionError("Rejected input mutated state");
            }
        }
        Object noHash = new Object() {
            @Override public int hashCode() { throw new AssertionError("Value was hashed"); }
        };
        var generic = new RandomValueDictionary<Integer, Object>(false, new Random(1));
        generic.put(17, noHash);
        if (generic.get(17) != noHash || generic.getRandVal() != noHash) throw new AssertionError("Generic value");
        System.out.println("ALL TRACE CHECKS PASSED " + cases);
    }
}
""")
    subprocess.run([javac, "--release", "17", "-encoding", "UTF-8",
                    str(directory / "RandomValueDictionary.java"), str(directory / "DictionaryHarness.java")],
                   check=True, text=True, capture_output=True, timeout=30)
    return java, directory


def test_java_main_matches_published_output(java_program):
    java, directory = java_program
    result = subprocess.run([java, "-cp", str(directory), "RandomValueDictionary"],
                            check=True, text=True, capture_output=True, timeout=15)
    assert result.stdout.strip() == EXPECTED
    assert result.stderr == ""


def test_java_matches_oracle_and_exact_sampling_multiplicities(java_program):
    java, directory = java_program
    inputs = [(distinct, trace) for distinct in (False, True) for trace in traces()]
    tokens = [str(len(inputs))]
    for distinct, commands in inputs:
        tokens.extend([str(int(distinct)), str(len(commands))])
        for command in commands:
            tokens.extend(map(str, command))
    result = subprocess.run([java, "-cp", str(directory), "DictionaryHarness"],
                            input="\n".join(tokens), check=True, text=True,
                            capture_output=True, timeout=30)
    assert result.stdout.strip() == f"ALL TRACE CHECKS PASSED {len(inputs)}"
    assert result.stderr == ""
