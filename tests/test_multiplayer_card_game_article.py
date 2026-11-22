"""Check the published implementations against an explicit hand/pile simulation."""

from collections import deque
from itertools import permutations
from pathlib import Path
import random
import re
import shutil
import subprocess
import types

import pytest


ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "site/src/content/coding/multiplayer-card-game.md"
TEXT = ARTICLE.read_text()
TRANSLATION = (ROOT / "site/src/content/translations/coding/multiplayer-card-game.md").read_text()
JAVA = re.search(r"```java\n(.*?)\n```", TEXT, re.S).group(1)
PYTHON = re.search(r"```python\n(.*?)\n```", TEXT, re.S).group(1)
EXPECTED = re.search(r"```text\n(.*?)\n```", TEXT.split("## Expected output\n")[1], re.S).group(1)
MODULE = types.ModuleType("published_card_game")
exec(compile(PYTHON, str(ARTICLE), "exec"), MODULE.__dict__)


def oracle(n, deck, order):
    hands = [deque() for _ in range(n)]
    captured = [[] for _ in range(n)]
    for i, card in enumerate(deck):
        hands[order[i % n]].append(card)
    assert max(map(len, hands)) - min(map(len, hands)) <= 1
    while any(hands):
        revealed = [(hand.popleft(), i) for i, hand in enumerate(hands) if hand]
        winner = max(revealed)[1]
        captured[winner].extend(card for card, _ in revealed)
    assert sum(map(len, captured)) == len(deck)
    return max(range(n), key=lambda i: (len(captured[i]), max(captured[i], default=float("-inf"))))


def cases():
    # Exhaust every small card permutation and every player permutation.
    for n in range(1, 5):
        for m in range(1, 7):
            for deck in permutations(range(1, m + 1)):
                for order in permutations(range(n)):
                    yield n, list(deck), list(order)
    # Larger hands, negative values, and many players with empty hands.
    rng = random.Random(20261122)
    for _ in range(400):
        n, m = rng.randrange(1, 16), rng.randrange(1, 81)
        deck = rng.sample(range(-1000, 1000), m)
        order = list(range(n))
        rng.shuffle(order)
        yield n, deck, order
    yield 2, [-1, -(2 ** 31), -2, 0], [0, 1]
    yield 3, [14, 1, 15, 10, 2, 3, 4, 13, 5, 9, 6, 7, 8, 12, 11], [0, 1, 2]


def test_python_matches_queue_oracle_without_mutation_or_shared_scores():
    game = MODULE.MultiPlayerCardGame()
    for n, deck, order in cases():
        players = ["player" + str(i) for i in range(n)]
        before = players[:], deck[:], order[:]
        expected = players[oracle(n, deck, order)]
        assert game.score_deal(players, deck, order) == expected
        assert (players, deck, order) == before


def test_python_play_shuffles_the_deck_and_player_order_separately():
    class RotatingRandom:
        def __init__(self):
            self.inputs = []

        def shuffle(self, values):
            self.inputs.append(tuple(values))
            values[:] = values[1:] + values[:1]

    rng = RotatingRandom()
    game = MODULE.MultiPlayerCardGame(rng)
    names = ["player0", "player1", "player2"]
    expected = names[oracle(3, [2, 3, 4, 5, 1], [1, 2, 0])]
    assert game.play(names, 5) == expected
    assert rng.inputs == [(1, 2, 3, 4, 5), (0, 1, 2)]
    assert MODULE.MultiPlayerCardGame().play(["only"], 1) == "only"


@pytest.mark.parametrize("players,deck,order", [
    ([], [1], []), ([""], [1], [0]), ([None], [1], [0]),
    (["a"], [], [0]), (["a"], [1, 1], [0]),
    (["a", "b"], [1, 2], [0, 0]), (["a", "b"], [1], [0]),
    (["a", "b"], [1, 2], [-1, 0]), (["a", "b"], [1, 2], [0, 2]),
    (["a"], [True], [0]), (["a"], [1], [False]),
])
def test_python_rejects_undefined_deals(players, deck, order):
    with pytest.raises(ValueError):
        MODULE.MultiPlayerCardGame().score_deal(players, deck, order)


def test_printed_python_examples_and_seed_replay(capsys):
    MODULE.main()
    assert capsys.readouterr().out.rstrip() == EXPECTED
    names = ["a", "b", "c", "d", "e"]
    for count in [1, 3, 17, 52, 89]:
        first = MODULE.MultiPlayerCardGame(random.Random(77)).play(names, count)
        again = MODULE.MultiPlayerCardGame(random.Random(77)).play(names, count)
        assert first == again


@pytest.fixture(scope="module")
def java_program(tmp_path_factory):
    java, javac = shutil.which("java"), shutil.which("javac")
    if not java or not javac:
        pytest.skip("A JDK is needed to execute the published Java solution")
    directory = tmp_path_factory.mktemp("multiplayer_cards")
    (directory / "MultiPlayerCardGame.java").write_text(JAVA)
    (directory / "CardGameHarness.java").write_text("""
import java.util.*;

public class CardGameHarness {
    static class ZeroRandom extends Random {
        final List<Integer> bounds = new ArrayList<>();
        public int nextInt(int bound) { bounds.add(bound); return 0; }
    }

    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        int count = input.nextInt();
        MultiPlayerCardGame game = new MultiPlayerCardGame();
        for (int c = 0; c < count; c++) {
            int n = input.nextInt(), m = input.nextInt();
            String[] names = new String[n];
            for (int i = 0; i < n; i++) names[i] = "player" + i;
            int[] deck = new int[m], order = new int[n];
            for (int i = 0; i < m; i++) deck[i] = input.nextInt();
            for (int i = 0; i < n; i++) order[i] = input.nextInt();
            int[] deckBefore = deck.clone(), orderBefore = order.clone();
            String[] namesBefore = names.clone();
            System.out.println(game.scoreDeal(names, deck, order));
            if (!Arrays.equals(deck, deckBefore) || !Arrays.equals(order, orderBefore)
                    || !Arrays.equals(names, namesBefore)) throw new AssertionError("Input mutated");
        }
        ZeroRandom rng = new ZeroRandom();
        String[] names = {"player0", "player1", "player2"};
        if (!new MultiPlayerCardGame(rng).play(names, 5).equals("player0"))
            throw new AssertionError("Generated deal does not match the shuffle");
        if (!rng.bounds.equals(List.of(5, 4, 3, 2, 3, 2)))
            throw new AssertionError("Both arrays must be shuffled");
        if (!new MultiPlayerCardGame(new ZeroRandom()).play(
                new String[]{"p0", "p1", "p2", "p3", "p4", "p5", "p6"}, 1).equals("p1"))
            throw new AssertionError("Wrong recipient when players outnumber cards");
        for (int invalid = 0; invalid < 6; invalid++) {
            try {
                switch (invalid) {
                    case 0 -> game.scoreDeal(new String[]{"a"}, new int[0], new int[]{0});
                    case 1 -> game.scoreDeal(new String[]{"a"}, new int[]{1, 1}, new int[]{0});
                    case 2 -> game.scoreDeal(new String[]{"a", "b"}, new int[]{1}, new int[]{0, 0});
                    case 3 -> game.scoreDeal(new String[]{"a"}, new int[]{1}, new int[]{-1});
                    case 4 -> game.scoreDeal(new String[]{" "}, new int[]{1}, new int[]{0});
                    case 5 -> game.play(names, 0);
                }
                throw new AssertionError("Invalid deal accepted");
            } catch (IllegalArgumentException expected) { }
        }
        System.out.println("CHECKS_OK");
    }
}
""")
    subprocess.run([javac, "--release", "17", "-encoding", "UTF-8",
                    str(directory / "MultiPlayerCardGame.java"), str(directory / "CardGameHarness.java")],
                   check=True, capture_output=True, text=True, timeout=60)
    return java, directory


def test_printed_java_examples(java_program):
    java, directory = java_program
    result = subprocess.run([java, "-cp", str(directory), "MultiPlayerCardGame"],
                            check=True, capture_output=True, text=True, timeout=30)
    assert result.stdout.rstrip() == EXPECTED


def test_java_matches_queue_oracle_and_checks_random_dealing(java_program):
    java, directory = java_program
    inputs = list(cases())
    lines = [str(len(inputs))]
    expected = []
    for n, deck, order in inputs:
        lines.append(" ".join(map(str, [n, len(deck)] + deck + order)))
        expected.append("player" + str(oracle(n, deck, order)))
    result = subprocess.run([java, "-cp", str(directory), "CardGameHarness"],
                            input="\n".join(lines), check=True, capture_output=True,
                            text=True, timeout=60)
    assert result.stdout.splitlines() == expected + ["CHECKS_OK"]


def test_bilingual_code_output_and_illustration_positions_match():
    for language in ["java", "python", "text"]:
        blocks = lambda text: re.findall(r"```" + language + r"\n(.*?)\n```", text, re.S)
        assert blocks(TEXT) == blocks(TRANSLATION)
    assert not re.search(r"[\u3400-\u9fff]", JAVA + PYTHON)
    def structure(text):
        return re.findall(r"^## |^```(?:java|python|text)|^<div class=\"table-scroll\"", text, re.M)
    assert structure(TEXT) == structure(TRANSLATION)
