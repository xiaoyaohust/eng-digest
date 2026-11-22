---
title: "多人翻牌游戏：随机发牌与线性计分"
description: "将不同整数表示的牌随机分配给多名玩家，公平处理余牌，再用隐式发牌顺序和紧凑状态计算赢家，附可运行的 Java 与 Python 解法。"
socialTitle: "多人翻牌游戏：洗牌与计分"
socialDescription: "余牌如何公平分配，最后一轮如何计分，以及总分相同时怎样比较。附经过验证的 Java 和 Python 实现。"
lang: zh-CN
draft: false
---

Joe和Jill各赢一轮，但Joe收走了三张牌，Jill只收走两张。最终赢家是Joe：分数计算的是赢到的牌数，不是获胜轮数，也不是牌面数值之和。当双人游戏推广到多人，而总牌数又不能被人数整除时，就会出现这种情况。

这道题适合线性模拟。分别打乱牌堆和玩家的发牌顺序，把牌堆中连续的一组牌视为一轮，每个玩家只保存总分与赢牌堆中的最大牌。对于这种发牌方式，无需额外维护每个人的手牌队列或完整赢牌列表。

## 题目

原始游戏有两名玩家，使用编号为`1`到`52`的52张不同牌。先洗牌，再平均发给两人。每轮双方各翻出手牌最上方的一张，牌面较大者收走双方翻出的牌，每张计一分。双方手牌全部用完后比较总分；总分相同，则比较各自赢牌堆中的最大牌。

将规则推广到输入中的`N`个玩家名字和`M`张不同整数牌：

1. 随机洗牌，并尽量平均分配手牌。
2. 若有`M % N`张余牌，随机选择这么多名不同玩家，各多发一张。
3. 每轮，仍有手牌的玩家各翻一张。
4. 本轮牌面最大者收走这一轮所有翻出的牌。
5. 游戏结束后，先比较收走的牌数，再比较赢牌堆里的最大牌，打印赢家名字。

赢下来的牌只放进计分堆，不会重新加入手牌。玩家也不需要决定出哪张牌，而是始终按照原手牌顺序翻牌。由于所有牌面都不同，每轮都有唯一赢家。

例如17张牌分给5人，应有2人拿4张，3人拿3张。算法必须根据`M`和`N`计算这些数量，不能在实现中写死52张牌或固定玩家人数。

## 输入约定与便于测试的接口

`play(players, cardCount)`生成标准的`1..cardCount`牌堆，完成随机洗牌后返回赢家名字。Java的`scoreDeal`和Python的`score_deal`接收明确的牌堆与发牌顺序，在不修改输入的情况下结算。第二个接口用于给出可复现的测试，也支持任意不同整数作为牌面。

名字是非空白的显示标签。玩家身份由输入位置区分，因此两个同名玩家仍是不同的人。题目要求输出名字；如果应用需要区分同名玩家，可以另外返回获胜下标。

至少需要一名玩家和一张牌。没有牌时，所有人的分数都是零，赢牌堆也全部为空，无法按题目给出的规则比较最大牌。本文实现不接受这种情况；另一种约定可以返回平局或无赢家。只有一名玩家，以及人数多于牌数的情况，都可以正常处理。

传入的`dealOrder`必须是玩家下标`0..N-1`的一个排列，牌面不能重复。Java使用`int`牌面，Python接受整数并明确排除布尔值。空赢牌堆不使用某个正数或零作为哨兵。

## 让拿到余牌的人也随机

只打乱牌堆，并不能让每个人的手牌张数随机。如果始终按照固定玩家顺序从下标零开始发牌，那么多拿一张的永远是前`M % N`个人。

因此，还要独立打乱一个玩家下标数组。第`k`张牌发给`dealOrder[k % N]`。令`q`为`M / N`的整数商，`r = M % N`，每人先获得`q`张，打乱顺序中的前`r`人再各获得一张。17张牌按`[Cy, Eli, Ben, Ada, Dee]`发放时，手牌张数分别为`Cy: 4, Eli: 4, Ben: 3, Ada: 3, Dee: 3`。

使用Fisher–Yates洗牌：从后往前处理位置`i`，在`0..i`中随机选择`j`，交换这两个位置。在各次有界随机选择独立且均匀的模型下，每个排列的概率都是`1 / length!`。因此，每个大小为`r`的余牌接收者集合，出现概率为`1 / C(N, r)`；每位玩家多拿一张的概率为`r / N`。这里的公平性论证采用通常的理想随机模型。

[Java的洗牌文档](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Collections.html)介绍了这种从后往前交换的做法。下方Java实现直接处理整数数组，Python则使用随机生成器提供的[原地洗牌操作](https://docs.python.org/3.11/library/random.html)。

## 打乱后的牌堆已经记录了手牌顺序

轮流发牌以后，发牌顺序中位置为`j`的玩家，拿到的是牌堆中下标为`j`、`j + N`、`j + 2N`等位置的牌。因此，每个人下一张要翻出的牌，恰好已经位于牌堆的下一组连续位置中。

玩家顺序为`[Joe, Jill, Bob]`，牌堆为`[3, 1, 2, 4, 5]`：

<div class="table-scroll" role="region" aria-label="三人五张牌游戏的两轮过程" tabindex="0">

| 轮次 | Joe | Jill | Bob | 本轮赢家 | 获得分数 |
| --- | ---: | ---: | ---: | --- | ---: |
| 1 | 3 | 1 | 2 | Joe | 3 |
| 2 | 4 | 5 | 无牌 | Jill | 2 |

</div>

Joe的手牌是`[3, 4]`，Jill是`[1, 5]`，Bob是`[2]`。按连续分组扫描牌堆，与从这三个队列中依次取牌，得到的出牌过程完全相同。最终分数是`[3, 2, 0]`，虽然Joe和Jill各赢一轮，Joe仍以牌数领先。Jill赢到了最大牌5，牌面总和也是9，高于Joe的6，但这些都不能代替收走的牌数。

对于起点为`start`的一组，本轮牌数是`min(N, M - start)`。只扫描这么多张，找到最大牌，再通过`dealOrder`把组内位置转换成玩家下标。计分增加实际翻出的张数。`M < N`时，整场只有一轮不足人数的出牌，没拿到牌的玩家不参与；`N = 1`时，每轮只有一张，唯一玩家收走全部牌。

这种表示依赖尽量平均的轮流发牌，以及赢牌不再回到手中。如果输入直接给出任意不等长手牌、出牌顺序会变化，或者赢来的牌需要重新打出，那么真正的手牌队列可能更合适。

## 保存赢牌堆的最大值，而不是初始手牌最大值

维护`scores[player]`和`highestWon[player]`。若本轮最大牌为`v`，赢家收走的是`v`以及比它更小的牌，所以这一轮收走的所有牌中，最大值恰好就是`v`。

赢家总分增加本轮翻牌数，再用`v`更新其赢牌堆最大值。`null`或`None`表示这个玩家还没有赢过一轮。若允许任意负数牌面，初始值写成零就不正确；每轮最大值从一张真实翻出的牌开始，也能处理Java最小整数。

最初拿到的大牌可能输给别人，不一定仍属于自己的赢牌堆。后面的一个测试中，Joe的14被Bob的15赢走。Joe与Jill最终各得6分，但Jill赢牌堆最大值为13，Joe只有10，所以Jill获胜。Joe已经输掉的14不能参与最终比较。

最终必须先比总分。即使拿到整副牌中最大的一张，也可能因为收走的牌数更少而输。非空游戏中至少有一张牌被收走，因此最高总分一定大于零。总分并列的领先者都有非空、互不重叠的赢牌堆，而所有牌面不同，所以这些堆的最大值也不同。题目规定的最终比较能够选出唯一赢家。

## 为什么这样模拟是正确的

处理每个分组之前，各玩家已经翻出的，恰好是此前分组分配给自己的牌。下一组又恰好包含每个仍有牌的玩家的下一张牌，因此隐式发牌与真实逐轮出牌完全一致。

处理完一组后，`scores`对每张已收走的牌恰好计数一次。`highestWon`是该玩家所有获胜轮次的最大牌中的最大值，也就是整个赢牌堆的最大值。最终所有分数之和等于`M`。

每组至少消耗一张牌，因此一定结束。最后一组处理完成时，所有手牌都已用完，再比较维护的总分与赢牌堆最大值，就严格遵守了游戏的最终排名规则。

## Java解法

保存为`MultiPlayerCardGame.java`，使用Java 17或更新版本即可。主要解题方法是`play`、`scoreDeal`和一个简短的`shuffle`辅助方法。构造函数负责配置随机生成器。`main`中的每个测试都会创建或使用已经实例化的游戏对象，调用方法并打印结果。

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

## Python解法

保存为`multi_player_card_game.py`，Python 3.9或更新版本即可，只使用标准库。类中包含两个游戏操作，洗牌交给标准库完成。

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

## 预期输出

两份程序都已实际执行，并产生以下输出。固定牌堆能够给出确定赢家；随机洗牌的单人游戏也始终由同一个人获胜。种子复现测试比较的是同一种语言实现中的两个全新生成器。

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

[Java的`Random`文档](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/util/Random.html)说明，相同种子与相同方法调用顺序会产生可重复的序列。Java与Python使用不同生成器，因此相同数字种子并不意味着跨语言得到相同洗牌结果。明确写出的牌堆与玩家排列，才是两份实现共用的测试输入。默认生成器用于普通伪随机模拟，上文的均匀性证明采用理想的有界随机选择假设。

## 时间与空间复杂度

令`M`为牌数，`N`为玩家数。按整数比较和有界整数哈希操作为常数时间的通常模型分析。

<div class="table-scroll" role="region" aria-label="多人翻牌游戏各阶段的时间和辅助空间" tabindex="0">

| 阶段 | 时间 | 额外存储 |
| --- | --- | --- |
| 构造并打乱牌堆 | O(M) | O(M)牌堆 |
| 构造并打乱玩家顺序 | O(N) | O(N)顺序数组 |
| 校验明确给出的发牌 | 期望O(M + N) | O(M + N)校验状态 |
| 结算全部轮次 | O(M) | O(N)分数与最大值 |
| 选出最终赢家 | O(N) | 计分状态之外O(1) |

</div>

计入哈希集合校验，整体时间为**期望O(M + N)**，辅助空间为**O(M + N)**。每张牌只参与一次出牌扫描，最后不足人数的一轮也只扫描实际翻出的牌。`M < N`时，不会反复扫描全部`N`个空手牌队列。

如果已经信任牌面互异且玩家顺序合法，纯计分部分只需**O(N)**辅助空间；额外的牌面集合用于防御性校验。完整随机游戏仍需保存显式牌堆。对任意输入牌堆与玩家列表进行完整校验和模拟，本身就需要线性读取。这个做法无需排序，也无需优先队列。

## 面试中可以继续讨论的变体

如果需要返回所有人的分数或全部赢牌，可以返回包含数组的结果对象，或者把每一组牌加入赢家的牌堆。完整保存赢牌会多保留O(M)条记录，而只求赢家时，本文的紧凑状态已经足够。

如果允许牌面重复，需要先规定同一轮平局怎么处理。退还平局牌、平分分数、继续翻牌，都会得到不同的游戏；最终排名完全相同时，也要另行约定结果。牌面互不相同的版本避免了这两类歧义。
