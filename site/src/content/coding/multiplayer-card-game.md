---
title: "A Multiplayer Card Game: Fair Dealing and Linear Scoring"
description: "Shuffle a distinct integer deck, distribute leftover cards fairly, and determine the winner with an implicit deal and compact scoring state in Java and Python."
socialTitle: "A Multiplayer Card Game"
socialDescription: "Fair leftover cards, a short final round, and the correct score tiebreak. Tested Java and Python implementations."
date: 2026-11-22T08:50:41Z
difficulty: medium
patterns: [simulation, randomization, arrays]
languages: [java, python]
tags: [simulation, randomization, arrays, interview]
featured: true
draft: false
---

Joe and Jill each win one round, but Joe captures three cards while Jill captures two. Joe wins the game: points count captured cards, rather than rounds or card values. Generalizing a two-player game introduces exactly this situation when the deck does not divide evenly among the players.

A linear simulation handles the rules. Shuffle the deck and the player dealing order, treat consecutive deck blocks as rounds, and keep each player's score and highest captured card. Separate hand queues and scoring-pile lists are unnecessary for this dealing policy.

## Problem

The original game has two players and 52 distinct cards numbered `1` through `52`. Shuffle the cards and deal them evenly. Each round, both players reveal their top card. The player with the larger value captures both revealed cards, earning one point per card. Continue until both hands are empty. The higher score wins; equal scores are resolved by the highest card in each player's captured pile.

Generalize the game to an input list of `N` player names and `M` distinct integer cards:

1. Shuffle and deal as evenly as possible.
2. Give the `M % N` extra cards to randomly selected, different players.
3. Each player who still has cards reveals one card per round.
4. The highest revealed card captures all cards revealed in that round.
5. Rank final results by captured-card count, then highest captured card. Print the winner's name.

Captured cards stay in a separate scoring pile and are never played again. There is no decision about which card to play: each player follows their original hand order. Distinct card values guarantee one winner per round.

For 17 cards and five players, two players receive four cards and three receive three. The solution must calculate these counts from `M` and `N`; neither 52 nor a fixed player count belongs in the algorithm.

## Input contract and a testable API

`play(players, cardCount)` creates the standard deck `1..cardCount`, shuffles, and returns the winning name. `scoreDeal` in Java, or `score_deal` in Python, scores an explicit deck and dealing order without changing either input. This second operation supplies reproducible examples and also supports arbitrary distinct integer card values.

Names are nonblank display labels. Player identity is its position in the input, so repeated names still represent separate players. The requested output is a name; an application that must distinguish equal labels can return the winning index as well.

Require at least one player and one card. With no cards, every score is zero and every captured pile is empty, so the stated tiebreak has no highest card to compare. This implementation rejects that case. An alternative contract could return a draw or no winner. One player and more players than cards are both supported.

A supplied `dealOrder` must be a permutation of player indices `0..N-1`. Supplied card values must be distinct. Java accepts `int` values; Python accepts integers and explicitly excludes booleans. No positive-value sentinel is used for an empty captured pile.

## Randomize who receives the extra cards

Shuffling the cards alone does not randomize hand sizes. If every deal starts with player zero in the same player order, the first `M % N` players always receive the extras.

Shuffle a player-index array independently of the deck. Deal card at index `k` to `dealOrder[k % N]`. If `q` is the integer quotient of `M / N` and `r = M % N`, every player receives `q` cards, and the first `r` positions of the shuffled player order receive one more. With 17 cards and the order `[Cy, Eli, Ben, Ada, Dee]`, the hand sizes are `Cy: 4, Eli: 4, Ben: 3, Ada: 3, Dee: 3`.

Use Fisher–Yates shuffling: working backward from position `i`, choose `j` from `0..i` and swap those positions. Under independent uniform bounded choices, each permutation has probability `1 / length!`. Consequently, each size-`r` extra-card recipient set has probability `1 / C(N, r)`, and each player has probability `r / N` of receiving an extra card. This is the usual ideal-randomness model for the fairness argument.

The [Java shuffle documentation](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Collections.html) describes the backward-swap approach. The Java implementation below applies it directly to integer arrays; Python uses its generator's [in-place shuffle operation](https://docs.python.org/3.11/library/random.html).

## The shuffled deck already encodes the hands

After round-robin dealing, the player in dealing slot `j` receives deck positions `j`, `j + N`, `j + 2N`, and so on. Their next revealed card is therefore already present in the next consecutive block of the deck.

For player order `[Joe, Jill, Bob]` and deck `[3, 1, 2, 4, 5]`:

<div class="table-scroll" role="region" aria-label="Two rounds of a five-card game with three players" tabindex="0">

| Round | Joe | Jill | Bob | Round winner | Points awarded |
| --- | ---: | ---: | ---: | --- | ---: |
| 1 | 3 | 1 | 2 | Joe | 3 |
| 2 | 4 | 5 | No card | Jill | 2 |

</div>

Joe's hand is `[3, 4]`, Jill's is `[1, 5]`, and Bob's is `[2]`. Reading the deck in blocks produces exactly the same reveals as removing cards from those three queues. Final scores are `[3, 2, 0]`, so Joe wins even though Joe and Jill each won one round. Jill captures the largest card, 5, and a higher sum of card values, 9 against 6; neither replaces the captured-card count.

For a block starting at `start`, its size is `min(N, M - start)`. Scan that many cards, identify the largest, and map its block offset back through `dealOrder`. Award the actual block size. When `M < N`, there is one short round; players with no cards reveal nothing. When `N = 1`, each block contains one card and the sole player captures everything.

This representation relies on balanced round-robin dealing and captured cards staying out of the hands. For arbitrary unequal preexisting hands, changing turn order, or cards returned to play, actual hand queues may be appropriate.

## Store the captured maximum, not the initial hand maximum

Maintain `scores[player]` and `highestWon[player]`. If a round's highest card is `v`, the winner captures `v` and cards smaller than `v`. The maximum of that round's captured cards is therefore exactly `v`.

Increase the winner's score by the number revealed, then update its captured maximum with `v`. `null` or `None` means that the player has not won a round. Initializing to zero would fail for arbitrary negative cards; initializing the round maximum from a real revealed card also handles Java's minimum integer value.

An initially high card can be lost to another player, so the highest card dealt to a player is not necessarily in that player's captured pile. One test below gives Joe a 14 that Bob captures with 15. Joe and Jill later finish with six points each, but Jill's highest captured card is 13 and Joe's is 10. Jill wins. Joe's lost 14 cannot break the tie.

Compare total scores first. A player holding the overall maximum card can still lose by capturing fewer cards. At least one card is captured in a nonempty game, so the maximum final score is positive. Equal positive scores have nonempty, disjoint captured piles; their highest values differ because all cards are distinct. The specified final tiebreak therefore selects a unique player.

## Why the simulation is correct

Before each block, every player has revealed exactly the cards assigned to them by preceding blocks. The next block contains one next card for every player who still has one. This establishes that the implicit deal follows the actual turn rule.

After each block, `scores` counts every captured card exactly once. `highestWon` is the maximum over the round maxima captured by that player, which equals the maximum of their entire captured pile. The sum of scores at the end is `M`.

Every block consumes at least one card. After the last block, all hands are empty, and comparing the maintained score and captured maximum implements the game's final ranking.

## Java solution

Save as `MultiPlayerCardGame.java`; Java 17 or later is sufficient. The solving methods are `play`, `scoreDeal`, and the small `shuffle` helper. Constructors configure the random generator. Each `main` test creates or uses an instantiated game object, calls a method, and prints the result.

```java
import java.util.HashSet;
import java.util.Objects;
import java.util.Random;
import java.util.Set;

public class MultiPlayerCardGame {
    private final Random random;

    public MultiPlayerCardGame() {
        this(new Random());
    }

    public MultiPlayerCardGame(Random random) {
        this.random = Objects.requireNonNull(random, "random must not be null");
    }

    public String play(String[] players, int cardCount) {
        if (players == null || players.length == 0 || cardCount <= 0) {
            throw new IllegalArgumentException("players and deck must be nonempty");
        }

        // Shuffle both the cards and the player order used for dealing.
        int[] deck = new int[cardCount];
        for (int i = 0; i < cardCount; i++) deck[i] = i + 1;
        int[] dealOrder = new int[players.length];
        for (int i = 0; i < players.length; i++) dealOrder[i] = i;
        shuffle(deck);
        shuffle(dealOrder);
        return scoreDeal(players, deck, dealOrder);
    }

    public String scoreDeal(String[] players, int[] deck, int[] dealOrder) {
        if (players == null || players.length == 0 || deck == null
                || deck.length == 0 || dealOrder == null
                || dealOrder.length != players.length) {
            throw new IllegalArgumentException("invalid players, deck, or deal order");
        }
        int n = players.length;
        for (String name : players) {
            if (name == null || name.isBlank()) {
                throw new IllegalArgumentException("player names must be nonblank");
            }
        }

        // Validate a complete player permutation and distinct card values.
        boolean[] seenPlayer = new boolean[n];
        for (int player : dealOrder) {
            if (player < 0 || player >= n || seenPlayer[player]) {
                throw new IllegalArgumentException("deal order must be a permutation");
            }
            seenPlayer[player] = true;
        }
        Set<Integer> seenCard = new HashSet<>();
        for (int card : deck) {
            if (!seenCard.add(card)) {
                throw new IllegalArgumentException("card values must be distinct");
            }
        }

        int[] scores = new int[n];
        Integer[] highestWon = new Integer[n];

        // Every consecutive block is one round, including a short final round.
        for (int start = 0; start < deck.length; ) {
            int revealed = Math.min(n, deck.length - start);
            int winnerSlot = 0;
            int winningCard = deck[start];
            for (int slot = 1; slot < revealed; slot++) {
                if (deck[start + slot] > winningCard) {
                    winningCard = deck[start + slot];
                    winnerSlot = slot;
                }
            }
            int winner = dealOrder[winnerSlot];
            scores[winner] += revealed;
            if (highestWon[winner] == null || winningCard > highestWon[winner]) {
                highestWon[winner] = winningCard;
            }
            start += revealed;
        }

        // Compare total captured cards first, then the highest captured card.
        int winner = 0;
        for (int player = 1; player < n; player++) {
            if (scores[player] > scores[winner]
                    || (scores[player] == scores[winner]
                        && highestWon[player] != null
                        && (highestWon[winner] == null
                            || highestWon[player] > highestWon[winner]))) {
                winner = player;
            }
        }
        return players[winner];
    }

    private void shuffle(int[] values) {
        for (int i = values.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            int temp = values[i];
            values[i] = values[j];
            values[j] = temp;
        }
    }

    public static void main(String[] args) {
        MultiPlayerCardGame game = new MultiPlayerCardGame();
        String[] trio = {"Joe", "Jill", "Bob"};

        // Original two-player size: Jill has the larger card in every round.
        int[] originalDeck = new int[52];
        for (int i = 0; i < originalDeck.length; i++) originalDeck[i] = i + 1;
        System.out.println("Original size: " + game.scoreDeal(
                new String[]{"Joe", "Jill"}, originalDeck, new int[]{0, 1}));

        // Five cards: Joe captures three cards, Jill captures two.
        System.out.println("Short final round: " + game.scoreDeal(
                trio, new int[]{3, 1, 2, 4, 5}, new int[]{0, 1, 2}));

        // Both score two; Joe's highest captured card is four.
        System.out.println("Score tie: " + game.scoreDeal(
                new String[]{"Joe", "Jill"}, new int[]{4, 1, 2, 3}, new int[]{0, 1}));

        // Jill wins two rounds; Joe's nine cannot overcome a lower score.
        System.out.println("Points before maximum: " + game.scoreDeal(
                trio, new int[]{9, 1, 2, 3, 8, 4, 5, 7, 6}, new int[]{0, 1, 2}));

        // Joe's fourteen was lost to Bob; only captured cards break the tie.
        System.out.println("Captured maximum only: " + game.scoreDeal(
                trio, new int[]{14, 1, 15, 10, 2, 3, 4, 13, 5, 9, 6, 7, 8, 12, 11},
                new int[]{0, 1, 2}));

        // Cy and Eli receive the extras; Dee captures the three full rounds.
        int[] unevenDeck = new int[17];
        for (int i = 0; i < unevenDeck.length; i++) unevenDeck[i] = i + 1;
        System.out.println("Uneven deal: " + game.scoreDeal(
                new String[]{"Ada", "Ben", "Cy", "Dee", "Eli"},
                unevenDeck, new int[]{2, 4, 1, 0, 3}));

        // Only Lee, Bob, and Joe receive cards; Lee wins the only round.
        System.out.println("More players than cards: " + game.scoreDeal(
                new String[]{"Joe", "Jill", "Bob", "Amy", "Lee"},
                new int[]{3, 1, 2}, new int[]{4, 2, 0, 3, 1}));

        // Distinct arbitrary values: zero beats minus one in the score tie.
        System.out.println("Negative card values: " + game.scoreDeal(
                new String[]{"Joe", "Jill"},
                new int[]{-1, Integer.MIN_VALUE, -2, 0}, new int[]{0, 1}));

        // Exercise the shuffled game API: one player captures every card.
        System.out.println("Single player: " + game.play(new String[]{"Solo"}, 7));

        // Fresh generators with the same seed replay this implementation.
        String first = new MultiPlayerCardGame(new Random(1234)).play(trio, 17);
        String replay = new MultiPlayerCardGame(new Random(1234)).play(trio, 17);
        System.out.println("Seed replay: " + first.equals(replay));

        // An empty deck has no highest captured card to resolve the tie.
        try {
            game.scoreDeal(trio, new int[0], new int[]{0, 1, 2});
        } catch (IllegalArgumentException expected) {
            System.out.println("Empty deck: no game");
        }
    }
}
```

## Python solution

Save as `multi_player_card_game.py`. Python 3.9 or later is sufficient, with only the standard library. The class has two game operations; the library performs the shuffles.

```python
import random


class MultiPlayerCardGame:
    def __init__(self, rng=None):
        self.rng = random.Random() if rng is None else rng

    def play(self, players, card_count):
        if not players or type(card_count) is not int or card_count <= 0:
            raise ValueError("players and deck must be nonempty")

        # Shuffle both the cards and the player order used for dealing.
        deck = list(range(1, card_count + 1))
        deal_order = list(range(len(players)))
        self.rng.shuffle(deck)
        self.rng.shuffle(deal_order)
        return self.score_deal(players, deck, deal_order)

    def score_deal(self, players, deck, deal_order):
        if (not players or not deck or deal_order is None
                or len(deal_order) != len(players)):
            raise ValueError("invalid players, deck, or deal order")
        n = len(players)
        if any(not isinstance(name, str) or not name.strip() for name in players):
            raise ValueError("player names must be nonblank")

        # Validate a complete player permutation and distinct integer cards.
        seen_player = [False] * n
        for player in deal_order:
            if type(player) is not int or not 0 <= player < n or seen_player[player]:
                raise ValueError("deal order must be a permutation")
            seen_player[player] = True
        seen_card = set()
        for card in deck:
            if type(card) is not int or card in seen_card:
                raise ValueError("card values must be distinct integers")
            seen_card.add(card)

        scores = [0] * n
        highest_won = [None] * n

        # Every consecutive block is one round, including a short final round.
        for start in range(0, len(deck), n):
            revealed = min(n, len(deck) - start)
            winner_slot = 0
            winning_card = deck[start]
            for slot in range(1, revealed):
                if deck[start + slot] > winning_card:
                    winning_card = deck[start + slot]
                    winner_slot = slot
            winner = deal_order[winner_slot]
            scores[winner] += revealed
            if highest_won[winner] is None or winning_card > highest_won[winner]:
                highest_won[winner] = winning_card

        # Compare total captured cards first, then the highest captured card.
        winner = 0
        for player in range(1, n):
            if (scores[player] > scores[winner]
                    or (scores[player] == scores[winner]
                        and highest_won[player] is not None
                        and (highest_won[winner] is None
                             or highest_won[player] > highest_won[winner]))):
                winner = player
        return players[winner]


def main():
    game = MultiPlayerCardGame()
    trio = ["Joe", "Jill", "Bob"]

    # Original two-player size: Jill has the larger card in every round.
    print("Original size:", game.score_deal(
        ["Joe", "Jill"], list(range(1, 53)), [0, 1]))

    # Five cards: Joe captures three cards, Jill captures two.
    print("Short final round:", game.score_deal(
        trio, [3, 1, 2, 4, 5], [0, 1, 2]))

    # Both score two; Joe's highest captured card is four.
    print("Score tie:", game.score_deal(["Joe", "Jill"], [4, 1, 2, 3], [0, 1]))

    # Jill wins two rounds; Joe's nine cannot overcome a lower score.
    print("Points before maximum:", game.score_deal(
        trio, [9, 1, 2, 3, 8, 4, 5, 7, 6], [0, 1, 2]))

    # Joe's fourteen was lost to Bob; only captured cards break the tie.
    print("Captured maximum only:", game.score_deal(
        trio, [14, 1, 15, 10, 2, 3, 4, 13, 5, 9, 6, 7, 8, 12, 11], [0, 1, 2]))

    # Cy and Eli receive the extras; Dee captures the three full rounds.
    print("Uneven deal:", game.score_deal(
        ["Ada", "Ben", "Cy", "Dee", "Eli"], list(range(1, 18)), [2, 4, 1, 0, 3]))

    # Only Lee, Bob, and Joe receive cards; Lee wins the only round.
    print("More players than cards:", game.score_deal(
        ["Joe", "Jill", "Bob", "Amy", "Lee"], [3, 1, 2], [4, 2, 0, 3, 1]))

    # Distinct arbitrary values: zero beats minus one in the score tie.
    print("Negative card values:", game.score_deal(
        ["Joe", "Jill"], [-1, -(2 ** 31), -2, 0], [0, 1]))

    # Exercise the shuffled game API: one player captures every card.
    print("Single player:", game.play(["Solo"], 7))

    # Fresh generators with the same seed replay this implementation.
    first = MultiPlayerCardGame(random.Random(1234)).play(trio, 17)
    replay = MultiPlayerCardGame(random.Random(1234)).play(trio, 17)
    print("Seed replay:", str(first == replay).lower())

    # An empty deck has no highest captured card to resolve the tie.
    try:
        game.score_deal(trio, [], [0, 1, 2])
    except ValueError:
        print("Empty deck: no game")


if __name__ == "__main__":
    main()
```

## Expected output

Both programs were executed and produced this output. The fixed deals give exact winners; the shuffled single-player case always has the same winner. The replay test compares two fresh generators within the same language implementation.

```text
Original size: Jill
Short final round: Joe
Score tie: Joe
Points before maximum: Jill
Captured maximum only: Jill
Uneven deal: Dee
More players than cards: Lee
Negative card values: Jill
Single player: Solo
Seed replay: true
Empty deck: no game
```

[Java's `Random` documentation](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Random.html) specifies repeatable sequences for equal seeds and equal method calls. Java and Python use different generators, so the same numeric seed does not imply the same shuffle across languages. Explicit decks and player permutations are the common test fixtures. Default generators provide ordinary pseudorandom simulation; the uniformity proof above assumes ideal bounded choices.

## Time and space complexity

Let `M` be the number of cards and `N` the number of players. Count integer comparisons and bounded-size hashing as constant-time operations.

<div class="table-scroll" role="region" aria-label="Card game time and auxiliary space by phase" tabindex="0">

| Phase | Time | Additional storage |
| --- | --- | --- |
| Build and shuffle the deck | O(M) | O(M) deck |
| Build and shuffle the player order | O(N) | O(N) order |
| Validate the explicit deal | Expected O(M + N) | O(M + N) validation state |
| Score all rounds | O(M) | O(N) scores and maxima |
| Select the winner | O(N) | O(1) beyond scoring state |

</div>

Total time is **expected O(M + N)**, including hash-set validation, and total auxiliary space is **O(M + N)**. Each card participates in one round scan; the short final round scans only its revealed cards. The implementation does not scan all `N` empty hands repeatedly when `M < N`.

For an already trusted distinct deck and valid player permutation, the scoring core needs only **O(N)** auxiliary space; the extra card set belongs to defensive validation. The full shuffled game still stores the explicit deck. Reading an arbitrary supplied deal and its player list already requires linear work for complete validation and simulation. Sorting and a priority queue would add unnecessary work to this approach.

## Useful interview follow-ups

If asked to return scores or every captured card, return a result object containing the arrays or append each block's cards to the winner's pile. Storing complete captured piles adds O(M) retained entries; winner selection needs only the compact state used here.

If duplicate card values become legal, define a round-tie rule first. Returning tied cards, splitting points, or running another reveal produces different games. Likewise, an exactly equal final ranking would need a defined outcome. The distinct-card version avoids both ambiguities.
