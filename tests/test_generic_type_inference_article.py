"""Execute the published code and compare both languages with a constraint oracle."""

from dataclasses import FrozenInstanceError
from pathlib import Path
import random
import re
import shutil
import subprocess
import sys
import types

import pytest


ARTICLE = Path(__file__).resolve().parents[1] / "site/src/content/coding/generic-return-type-inference.md"
TEXT = ARTICLE.read_text()
PYTHON_SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
JAVA_SOURCE = re.search(r"```java\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXPECTED = re.search(r"```text\n(.*?)\n```", TEXT.split("## Expected output\n")[1], re.DOTALL).group(1).splitlines()
MODULE = types.ModuleType("generic_type_inference_article")
sys.modules[MODULE.__name__] = MODULE
exec(compile(PYTHON_SOURCE, str(ARTICLE), "exec"), MODULE.__dict__)


def generic(node):
    return isinstance(node, str) and re.fullmatch(r"T[0-9]*", node) is not None


def oracle(parameters, result, actual):
    """Collect all constraints first, then require one concrete value per name."""
    pending = list(actual)
    while pending:
        node = pending.pop()
        if generic(node):
            return None
        if isinstance(node, tuple):
            pending.extend(node)
    if len(parameters) != len(actual):
        return None
    constraints, pending = {}, list(zip(parameters, actual))
    while pending:
        left, right = pending.pop()
        if generic(left):
            constraints.setdefault(left, set()).add(right)
        elif isinstance(left, str):
            if left != right:
                return None
        elif not isinstance(right, tuple) or len(left) != len(right):
            return None
        else:
            pending.extend(zip(left, right))
    if any(len(values) != 1 for values in constraints.values()):
        return None

    def resolve(node):
        if generic(node):
            return next(iter(constraints[node])) if node in constraints else None
        if isinstance(node, str):
            return node
        children = tuple(resolve(child) for child in node)
        return None if any(child is None for child in children) else children

    return resolve(result)


def render(node):
    if node is None:
        return "null"
    return node if isinstance(node, str) else "[" + ",".join(render(child) for child in node) + "]"


def to_type(node):
    return MODULE.Type.leaf(node) if isinstance(node, str) else MODULE.Type.tuple(*(to_type(child) for child in node))


def cases():
    explicit = [
        (("T", "T"), "T", (("int", "char"), ("int", "char"))),
        (("T", "T"), "T", (("int", "char"), ("int", "float"))),
        ((("T1", ("int", "T2")),), ("T2", "T1"), (("string", ("int", "float")),)),
        (((),), (), ((),)),
        (((),), "int", ("int",)),
        (("int",), "int", ((),)),
        ((), ("int", "string"), ()),
        ((), "T", ()),
        (("T",), ("int", "T2"), ("int",)),
        (("T",), (), (("int", "T9"),)),
        (("T01", "T1"), ("T1", "T01"), ("int", "char")),
        (("Tree", "T_value", "T1x", "t1"), "Tree", ("Tree", "T_value", "T1x", "t1")),
        (("T", "T"), "T", ("str", "string")),
        (("T",), "T", ()),
        ((), "int", ("int",)),
        (("T",), ("T", "T"), (tuple("int" for _ in range(200)),)),
    ]
    deep_pattern, deep_actual = "T27", "float"
    for _ in range(30):
        deep_pattern, deep_actual = (deep_pattern,), (deep_actual,)
    explicit.append(((deep_pattern,), ("T27",), (deep_actual,)))
    yield from explicit
    rng = random.Random(20261018)
    leaves = ["int", "char", "float", "string", "str", "Tree", "T_value", "T1x", "t1"]
    variables = ["T", "T1", "T2", "T27", "T01"]

    def tree(depth, symbolic=False):
        if depth and rng.random() < 0.45:
            return tuple(tree(depth - 1, symbolic) for _ in range(rng.randrange(4)))
        return rng.choice(leaves + variables if symbolic else leaves)

    def apply(node, bindings):
        if generic(node):
            return bindings[node]
        return node if isinstance(node, str) else tuple(apply(child, bindings) for child in node)

    for index in range(1200):
        parameters = tuple(tree(3, True) for _ in range(rng.randrange(6)))
        result = tree(3, True)
        bindings = {name: tree(3) for name in variables}
        actual = tuple(apply(node, bindings) for node in parameters)
        if index % 4 == 0 and actual:
            position = rng.randrange(len(actual))
            actual = actual[:position] + (tree(3, index % 8 == 0),) + actual[position + 1:]
        if index % 11 == 0:
            actual += (tree(2),)
        yield parameters, result, actual


@pytest.fixture(scope="module")
def java_program(tmp_path_factory):
    java, javac = shutil.which("java"), shutil.which("javac")
    if not java or not javac:
        pytest.skip("A JDK is required to compile the published example")
    directory = tmp_path_factory.mktemp("generic_inference_java")
    source = directory / "GenericTypeInference.java"
    source.write_text(JAVA_SOURCE)
    harness = directory / "InferenceHarness.java"
    harness.write_text(r"""
import java.util.*;

public class InferenceHarness {
    static GenericTypeInference.Type read(Scanner scanner) {
        String token = scanner.next();
        if (!token.equals("[")) return GenericTypeInference.Type.leaf(token);
        int count = scanner.nextInt();
        var children = new ArrayList<GenericTypeInference.Type>();
        for (int i = 0; i < count; i++) children.add(read(scanner));
        return new GenericTypeInference.Type(null, children);
    }

    public static void main(String[] args) {
        var solver = new GenericTypeInference();
        Scanner scanner = new Scanner(System.in);
        int count = scanner.nextInt();
        for (int number = 0; number < count; number++) {
            int size = scanner.nextInt();
            var parameters = new ArrayList<GenericTypeInference.Type>();
            for (int i = 0; i < size; i++) parameters.add(read(scanner));
            var result = read(scanner);
            size = scanner.nextInt();
            var actual = new ArrayList<GenericTypeInference.Type>();
            for (int i = 0; i < size; i++) actual.add(read(scanner));
            System.out.println(solver.infer(new GenericTypeInference.Function(parameters, result), actual));
        }

        // Child lists and function parameter lists are defensively copied.
        var integer = GenericTypeInference.Type.leaf("int");
        var t = GenericTypeInference.Type.leaf("T");
        var children = new ArrayList<>(List.of(integer));
        var tuple = new GenericTypeInference.Type(null, children);
        children.clear();
        if (!tuple.toString().equals("[int]")) throw new AssertionError();
        var parameters = new ArrayList<>(List.of(t));
        var function = new GenericTypeInference.Function(parameters, GenericTypeInference.Type.tuple(t, t));
        parameters.clear();
        var result = solver.infer(function, List.of(tuple));
        if (result.children().get(0) != tuple || result.children().get(1) != tuple) {
            throw new AssertionError("Bound subtrees should be shared");
        }
        try { tuple.children().clear(); throw new AssertionError(); }
        catch (UnsupportedOperationException expected) { }
        try { function.parameters().clear(); throw new AssertionError(); }
        catch (UnsupportedOperationException expected) { }
        for (String name : List.of("", "a,b", "T-1", "1int", "[int]")) {
            try { GenericTypeInference.Type.leaf(name); throw new AssertionError(); }
            catch (IllegalArgumentException expected) { }
        }
        try { new GenericTypeInference.Type(null, null); throw new AssertionError(); }
        catch (IllegalArgumentException expected) { }
        try { new GenericTypeInference.Type("int", List.of()); throw new AssertionError(); }
        catch (IllegalArgumentException expected) { }
    }
}
""")
    subprocess.run([javac, "--release", "17", str(source), str(harness)],
                   check=True, capture_output=True, text=True, timeout=30)
    return java, directory


def test_python_main_matches_published_output(capsys):
    MODULE.main()
    assert capsys.readouterr().out.splitlines() == EXPECTED


def test_java_main_matches_published_output(java_program):
    java, directory = java_program
    process = subprocess.run([java, "-cp", str(directory), "GenericTypeInference"],
                             check=True, capture_output=True, text=True, timeout=20)
    assert process.stdout.splitlines() == EXPECTED
    assert process.stderr == ""


def test_python_inference_matches_independent_constraints():
    solver = MODULE.GenericTypeInference()
    for parameters, result, actual in cases():
        function = MODULE.Function(tuple(to_type(node) for node in parameters), to_type(result))
        inferred = solver.infer(function, [to_type(node) for node in actual])
        assert ("null" if inferred is None else str(inferred)) == render(oracle(parameters, result, actual))


def test_java_inference_matches_independent_constraints(java_program):
    def tokens(node):
        return node if isinstance(node, str) else "[ " + str(len(node)) + " " + " ".join(tokens(child) for child in node)

    java, directory = java_program
    entries = list(cases())
    lines, expected = [str(len(entries))], []
    for parameters, result, actual in entries:
        lines.append(str(len(parameters)) + " " + " ".join(tokens(node) for node in parameters))
        lines.append(tokens(result))
        lines.append(str(len(actual)) + " " + " ".join(tokens(node) for node in actual))
        expected.append(render(oracle(parameters, result, actual)))
    process = subprocess.run([java, "-cp", str(directory), "InferenceHarness"],
                             input="\n".join(lines), check=True, capture_output=True, text=True, timeout=30)
    assert process.stdout.splitlines() == expected
    assert process.stderr == ""


def test_python_immutability_defensive_copies_and_result_sharing():
    integer, generic_type = MODULE.Type.leaf("int"), MODULE.Type.leaf("T")
    children = [integer]
    source = MODULE.Type(children=children)
    children.clear()
    parameters = [generic_type]
    function = MODULE.Function(parameters, MODULE.Type.tuple(generic_type, generic_type))
    parameters.clear()
    result = MODULE.GenericTypeInference().infer(function, [source])
    assert str(source) == "[int]"
    assert result.children[0] is source and result.children[1] is source
    with pytest.raises(FrozenInstanceError):
        source.name = "char"
    with pytest.raises(FrozenInstanceError):
        function.parameters = ()


@pytest.mark.parametrize("name", ["", "a,b", "T-1", "1int", "[int]", "T\u0661", 7])
def test_malformed_names_are_rejected(name):
    with pytest.raises(ValueError):
        MODULE.Type.leaf(name)


def test_malformed_objects_are_rejected():
    for options in ({}, {"name": "int", "children": ()}, {"children": [None]}):
        with pytest.raises(ValueError):
            MODULE.Type(**options)
    with pytest.raises(ValueError):
        MODULE.Function([None], MODULE.Type.leaf("int"))


def test_article_uses_problem_heading_and_english_only_code():
    assert "## Problem\n" in TEXT
    assert "English translation" not in TEXT
    assert not re.search(r"[\u3400-\u9fff]", PYTHON_SOURCE + JAVA_SOURCE)
