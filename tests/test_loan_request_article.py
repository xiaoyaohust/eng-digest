"""Run both published solutions against an independent parent-walk and loan-scan oracle."""

from copy import deepcopy
from dataclasses import FrozenInstanceError
import base64
from pathlib import Path
import random
import re
import shutil
import subprocess
import types

import pytest


ARTICLE = (Path(__file__).resolve().parents[1]
           / "site/src/content/coding/loan-requests-company-hierarchy-matching.md")
TEXT = ARTICLE.read_text()
PYTHON_SOURCE = re.search(r"```python\n(.*?)\n```", TEXT, re.DOTALL).group(1)
JAVA_SOURCE = re.search(r"```java\n(.*?)\n```", TEXT, re.DOTALL).group(1)
EXPECTED = re.search(r"```text\n(.*?)\n```", TEXT.split("## Expected output\n")[1], re.DOTALL).group(1)
MODULE = types.ModuleType("loan_request_article")
exec(compile(PYTHON_SOURCE, str(ARTICLE), "exec"), MODULE.__dict__)
Processor, Request = MODULE.LoanRequestProcessor, MODULE.Request


def oracle(hierarchy, loans, transactions):
    parent = {}
    companies = set(hierarchy)
    for owner, children in hierarchy.items():
        for child in children:
            if child in parent and parent[child] != owner:
                raise ValueError("Multiple owners")
            parent[child] = owner
            companies.add(child)

    # Deliberately walk from scratch instead of sharing the solution's root cache.
    def root(company):
        seen = set()
        while company in parent:
            if company in seen:
                raise ValueError("Cycle")
            seen.add(company)
            company = parent[company]
        return company

    for company in companies:
        root(company)
    if len({loan[0] for loan in loans}) != len(loans):
        raise ValueError("Duplicate loan ID")
    return [[loan[0] for loan in loans
             if loan[1] == tx[1] and root(loan[2]) == root(tx[2]) and loan[3] == tx[3]]
            for tx in transactions]


def cases():
    yield {}, [], [("q", "u", "unknown", 1)]
    yield {}, [("l", "u", "unknown", 1)], [("q", "u", "unknown", 1)]
    yield {"d": ["a"], "a": ["b", "c"], "x": ["y"], "solo": []}, [
        ("l1", "u1", "b", 100), ("l2", "u1", "c", 100),
        ("l3", "u2", "c", 100), ("l4", "u1", "d", 200),
    ], [("q1", "u1", "a", 100), ("q2", "u2", "d", 100),
        ("q3", "u1", "x", 100), ("q4", "u1", "d", 200)]
    yield {"root": ["leaf", "leaf"]}, [("l", "u", "leaf", 7)], [("q", "u", "root", 7)]
    yield {}, [("l1", "a|b", "c", 10), ("l2", "a", "b|c", 10),
               ("l3", "user with spaces", "商户", (1 << 63) - 1)], [
        ("q1", "a|b", "c", 10), ("q2", "a", "b|c", 10),
        ("q3", "user with spaces", "商户", (1 << 63) - 1),
        ("q4", "A", "b|c", 10)]
    yield {"a": ["a"]}, [], []
    yield {"a": ["b"], "b": ["a"]}, [], []
    yield {"valid": ["leaf"], "unrelated": ["cycle"], "cycle": ["unrelated"]}, [], []
    yield {"a": ["c"], "b": ["c"]}, [], []
    yield {}, [("duplicate", "u", "a", 1), ("duplicate", "v", "b", 2)], []
    rng = random.Random(20261111)
    for case in range(300):
        names = [f"company_{case}_{i}" for i in range(rng.randrange(1, 25))]
        hierarchy = {name: [] for name in names}
        for i in range(1, len(names)):
            if rng.random() < 0.8:
                owner = names[rng.randrange(i)]
                hierarchy[owner].append(names[i])
                if rng.random() < 0.1:
                    hierarchy[owner].append(names[i])
        # Input order is unrelated to ownership depth.
        entries = list(hierarchy.items())
        rng.shuffle(entries)
        hierarchy = dict(entries)
        merchants = names + ["independent"]
        loans = [(f"l{j}", rng.choice(["u1", "u2", "u3"]), rng.choice(merchants),
                  rng.choice([1, 7, 100, (1 << 63) - 1])) for j in range(rng.randrange(30))]
        transactions = [(f"q{j}", rng.choice(["u1", "u2", "u3", "missing"]), rng.choice(merchants),
                         rng.choice([1, 7, 100, 999, (1 << 63) - 1])) for j in range(20)]
        yield hierarchy, loans, transactions


@pytest.fixture(scope="module")
def java_program(tmp_path_factory):
    javac, java = shutil.which("javac"), shutil.which("java")
    if not javac or not java:
        pytest.skip("A JDK is required to compile the published Java solution")
    directory = tmp_path_factory.mktemp("loan_request_java")
    source = directory / "LoanRequestProcessor.java"
    source.write_text(JAVA_SOURCE)
    harness = directory / "LoanHarness.java"
    harness.write_text("""
import java.util.*;
import java.nio.charset.StandardCharsets;

public class LoanHarness {
    static String decode(Scanner input) {
        return new String(Base64.getDecoder().decode(input.next()), StandardCharsets.UTF_8);
    }
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int cases = input.nextInt();
        for (int t = 0; t < cases; t++) {
            Map<String, List<String>> hierarchy = new LinkedHashMap<>();
            int owners = input.nextInt();
            for (int i = 0; i < owners; i++) {
                String owner = decode(input);
                int count = input.nextInt();
                List<String> children = new ArrayList<>();
                for (int j = 0; j < count; j++) children.add(decode(input));
                hierarchy.put(owner, children);
            }
            List<LoanRequestProcessor.Request> loans = new ArrayList<>();
            int loanCount = input.nextInt();
            for (int i = 0; i < loanCount; i++) loans.add(new LoanRequestProcessor.Request(
                    decode(input), decode(input), decode(input), input.nextLong()));
            List<LoanRequestProcessor.Request> transactions = new ArrayList<>();
            int queries = input.nextInt();
            for (int i = 0; i < queries; i++) transactions.add(new LoanRequestProcessor.Request(
                    decode(input), decode(input), decode(input), input.nextLong()));
            try {
                var processor = new LoanRequestProcessor(hierarchy);
                for (var loan : loans) processor.addLoan(loan);
                System.out.println("OK");
                for (var transaction : transactions) {
                    List<String> ids = new ArrayList<>();
                    for (var loan : processor.matchTransaction(transaction)) ids.add(
                            Base64.getEncoder().encodeToString(loan.requestId().getBytes(StandardCharsets.UTF_8)));
                    System.out.println("MATCH:" + String.join(",", ids));
                }
            } catch (IllegalArgumentException expected) {
                System.out.println("ERROR");
            }
        }
    }
}
""")
    validation = directory / "LoanValidation.java"
    validation.write_text("""
import java.util.*;

public class LoanValidation {
    public static void main(String[] args) {
        var hierarchy = new HashMap<String, List<String>>();
        hierarchy.put("root", new ArrayList<>(List.of("leaf")));
        var processor = new LoanRequestProcessor(hierarchy);
        var loan = new LoanRequestProcessor.Request("l1", "u", "leaf", Long.MAX_VALUE);
        var tx = new LoanRequestProcessor.Request("q", "u", "root", Long.MAX_VALUE);
        processor.addLoan(loan);
        var snapshot = processor.matchTransaction(tx);
        hierarchy.get("root").clear();
        hierarchy.put("other", List.of("leaf"));
        if (processor.matchTransaction(tx).size() != 1) throw new AssertionError("Input alias");
        try { snapshot.clear(); throw new AssertionError("Exposed bucket"); }
        catch (UnsupportedOperationException expected) {}
        processor.addLoan(new LoanRequestProcessor.Request("l2", "u", "leaf", Long.MAX_VALUE));
        if (snapshot.size() != 1 || processor.matchTransaction(tx).size() != 2)
            throw new AssertionError("Snapshot changed");
        try { processor.addLoan(new LoanRequestProcessor.Request("l1", "other", "x", 1));
              throw new AssertionError("Duplicate accepted"); }
        catch (IllegalArgumentException expected) {}
        if (processor.matchTransaction(tx).size() != 2) throw new AssertionError("Duplicate changed index");
        for (long bad : new long[]{0, -1, Long.MIN_VALUE}) {
            try { new LoanRequestProcessor.Request("x", "u", "m", bad);
                  throw new AssertionError("Amount accepted"); }
            catch (IllegalArgumentException expected) {}
        }
        for (String bad : new String[]{null, ""}) {
            try { new LoanRequestProcessor.Request(bad, "u", "m", 1);
                  throw new AssertionError("Identifier accepted"); }
            catch (IllegalArgumentException expected) {}
        }
        try { processor.addLoan(null); throw new AssertionError("Null loan accepted"); }
        catch (IllegalArgumentException expected) {}
        try { processor.matchTransaction(null); throw new AssertionError("Null query accepted"); }
        catch (IllegalArgumentException expected) {}
        System.out.println("Validation passed");
    }
}
""")
    subprocess.run([javac, "--release", "17", str(source), str(harness), str(validation)],
                   cwd=directory, check=True, capture_output=True, text=True, timeout=30)
    return java, directory


def encoded(value):
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def serialized(data):
    output = [str(len(data))]
    for hierarchy, loans, transactions in data:
        output.append(str(len(hierarchy)))
        for owner, children in hierarchy.items():
            output.extend([encoded(owner), str(len(children))])
            output.extend(map(encoded, children))
        for requests in (loans, transactions):
            output.append(str(len(requests)))
            for identifier, user, merchant, amount in requests:
                output.extend([encoded(identifier), encoded(user), encoded(merchant), str(amount)])
    return "\n".join(output) + "\n"


def test_published_python_output(capsys):
    MODULE.main()
    assert capsys.readouterr().out.strip() == EXPECTED


def test_published_java_output(java_program):
    java, directory = java_program
    result = subprocess.run([java, "-cp", str(directory), "LoanRequestProcessor"],
                            capture_output=True, text=True, check=True, timeout=20)
    assert result.stdout.strip() == EXPECTED


def test_python_against_independent_scan_and_input_order():
    for hierarchy, loans, transactions in cases():
        original = deepcopy(hierarchy)
        try:
            expected = oracle(hierarchy, loans, transactions)
        except ValueError:
            with pytest.raises(ValueError):
                processor = Processor(hierarchy)
                for row in loans:
                    processor.add_loan(Request(*row))
            continue
        processor = Processor(hierarchy)
        for row in loans:
            processor.add_loan(Request(*row))
        actual = [[loan.request_id for loan in processor.match_transaction(Request(*tx))]
                  for tx in transactions]
        assert actual == expected
        assert hierarchy == original


def test_java_against_the_same_independent_scan(java_program):
    java, directory = java_program
    data = list(cases())
    expected = []
    for hierarchy, loans, transactions in data:
        try:
            matches = oracle(hierarchy, loans, transactions)
        except ValueError:
            expected.append("ERROR")
        else:
            expected.append("OK")
            expected.extend("MATCH:" + ",".join(map(encoded, ids)) for ids in matches)
    result = subprocess.run([java, "-cp", str(directory), "LoanHarness"], input=serialized(data),
                            capture_output=True, text=True, check=True, timeout=40)
    assert result.stdout.splitlines() == expected


def test_both_solutions_handle_a_deep_chain_without_recursion(java_program):
    count = 20_000
    hierarchy = {f"n{i}": [f"n{i + 1}"] for i in range(count)}
    loan = ("deep-loan", "u", f"n{count}", 1)
    tx = ("deep-query", "u", "n0", 1)
    processor = Processor(hierarchy)
    processor.add_loan(Request(*loan))
    assert [loan.request_id for loan in processor.match_transaction(Request(*tx))] == ["deep-loan"]
    java, directory = java_program
    result = subprocess.run([java, "-cp", str(directory), "LoanHarness"],
                            input=serialized([(hierarchy, [loan], [tx])]),
                            capture_output=True, text=True, check=True, timeout=40)
    assert result.stdout.splitlines() == ["OK", "MATCH:" + encoded("deep-loan")]


def test_snapshot_immutability_duplicate_rejection_and_fixed_hierarchy():
    hierarchy = {"root": ["leaf"]}
    processor = Processor(hierarchy)
    loan = Request("l1", "u", "leaf", 1)
    query = Request("q", "u", "root", 1)
    processor.add_loan(loan)
    snapshot = processor.match_transaction(query)
    hierarchy["root"].clear()
    hierarchy["different"] = ["leaf"]
    snapshot.clear()
    assert processor.match_transaction(query) == [loan]
    snapshot = processor.match_transaction(query)
    processor.add_loan(Request("l2", "u", "root", 1))
    assert snapshot == [loan]
    with pytest.raises(ValueError):
        processor.add_loan(Request("l1", "other", "independent", 2))
    assert len(processor.match_transaction(query)) == 2
    with pytest.raises(FrozenInstanceError):
        loan.amount = 2


def test_java_snapshots_duplicate_ids_and_request_validation(java_program):
    java, directory = java_program
    result = subprocess.run([java, "-cp", str(directory), "LoanValidation"],
                            capture_output=True, text=True, check=True, timeout=20)
    assert result.stdout.strip() == "Validation passed"


def test_unknown_queries_do_not_allocate_root_entries_or_empty_buckets():
    processor = Processor({"root": ["leaf"]})
    before = (len(processor._roots), len(processor._index))
    for i in range(100):
        assert processor.match_transaction(Request(f"q{i}", "u", f"unknown-{i}", 1)) == []
    assert (len(processor._roots), len(processor._index)) == before


@pytest.mark.parametrize("hierarchy", [None, [], {"": []}, {None: []}, {"r": None},
                                             {"r": "child"}, {"r": [""]}, {"r": [None]}])
def test_invalid_hierarchy_shapes(hierarchy):
    with pytest.raises(ValueError):
        Processor(hierarchy)


@pytest.mark.parametrize("fields", [("", "u", "m", 1), ("l", "", "m", 1),
                                         ("l", "u", "", 1), (None, "u", "m", 1),
                                         ("l", "u", "m", 0), ("l", "u", "m", -1),
                                         ("l", "u", "m", True), ("l", "u", "m", 1.0),
                                         ("l", "u", "m", 1 << 63)])
def test_invalid_request_fields(fields):
    with pytest.raises(ValueError):
        Request(*fields)


@pytest.mark.parametrize("value", [None, [], object()])
def test_invalid_request_objects_leave_the_processor_usable(value):
    processor = Processor({})
    with pytest.raises(ValueError):
        processor.add_loan(value)
    with pytest.raises(ValueError):
        processor.match_transaction(value)
    processor.add_loan(Request("valid", "u", "m", 1))
    assert len(processor.match_transaction(Request("q", "u", "m", 1))) == 1
