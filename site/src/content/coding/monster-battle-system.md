---
title: "Monster Battle System: Turn Simulation and Smart Attacker Selection"
description: "Build a deterministic monster battle in Java and Python, then optimize repeated best-attacker queries without changing the rules."
date: 2026-10-09
difficulty: medium
patterns:
  - simulation
  - object-oriented-design
  - sorting
languages:
  - java
  - python
tags:
  - simulation
  - object-oriented-design
  - sorting
  - amortized-analysis
featured: true
draft: false
practice:
  - question: "Why is advancing a first-living-monster pointer safe?"
    topic: "Monotone state"
    hint: "Can an eliminated monster become alive again under these rules?"
    answer: "No. HP only decreases and there is no healing or resurrection. Once the pointer passes a monster, that monster can never become the first living monster again, so all pointer advances cost O(N) in total."
  - question: "Why can smart-targeting rankings be built before the battle?"
    topic: "Precomputation"
    hint: "What changes when a monster takes damage, and what determines its outgoing damage?"
    answer: "Only HP changes. Attack power, elemental type, and the chart remain fixed, so each monster's damage against a given defender type is fixed. Sort once per defender type and lazily skip attackers that later die."
  - question: "How do we preserve the earlier-monster tie-break in a precomputed ranking?"
    topic: "Deterministic ordering"
    hint: "Use the original team-list position as a secondary key."
    answer: "Order candidates by decreasing computed damage, then increasing original team index. The first living candidate has the highest damage and, among ties, the earliest position."
  - question: "Why might a battle with positive attack powers still never finish if the type chart is extended?"
    topic: "Integer damage"
    hint: "Consider an attack power of one in a half-damage matchup."
    answer: "Truncating 1 × 0.5 to an integer gives zero. A chart with two mutually weak types can make both sides deal zero, leaving the same first defenders forever. Detect two consecutive zero-damage turns and report a stalemate, or explicitly change the game rule to minimum-one damage. The four supplied types do not contain a mutually weak pair."
---

## Problem

Build a turn-based battle simulator for two teams of monsters. Each monster has a name, positive HP, and positive attack power. Team A attacks first; the teams alternate after each attack. An attack reduces the defender's HP, and a monster with HP at or below zero is eliminated. Return an event log containing every attack, each elimination, and the winner. The interviewer introduces three stages:

1. **Basic battle:** the first living monster on each team attacks the first living monster on the other team. Damage equals attack power.
2. **Elemental battle:** keep the same attack order, but adjust damage by a type chart. Fire beats Grass and is weak to Water; Water beats Fire and is weak to Grass; Grass beats Water and is weak to Fire; Electric beats Water. A strong matchup deals double damage, a weak matchup deals half damage, and every other matchup is neutral.
3. **Smart attacker:** the defender is still the defending team's first living monster. The attacking team chooses the *living* monster that would deal the most damage to that defender. If several tie, choose the one earlier in the team's original list.

For example, against a Water defender, a Fire monster with attack 20 deals `20 × 0.5 = 10`, while an Electric monster with attack 15 deals `15 × 2 = 30`. Stage 3 chooses Electric even if Fire appears first. Those numbers illustrate the rule; the implementation accepts arbitrary team sizes, names, HP, attack powers, and type-chart entries. It does not bake `20`, `15`, or a team size into the algorithm.

This is an object-oriented design problem as well as a simulation problem. A `Monster` owns HP and damage calculation, a `Team` owns ordering and selection, and a `BattleSimulator` owns turn progression and logging. The code below exposes a mode for each stage so one complete Java program and one complete Python program can demonstrate all three without repeating almost-identical class definitions.

## From the simple loop to efficient selection

For Stage 1, keep a pointer to each team's first living monster. HP never increases in the stated rules, so when the pointed-to monster dies, the pointer only moves forward. Across the entire battle it advances at most the number of monsters on that team. Stage 2 changes only the damage calculation. Encode the multiplier as an integer **twice-multiplier**: `1` means half damage, `2` means normal damage, and `4` means double damage. Then `damage = attack × twiceMultiplier // 2`, avoiding floating-point rounding surprises. The chart is an input to the simulator; an absent pair defaults to neutral.

The direct Stage 3 solution scans all living attackers every turn. It is easy to write and an excellent first implementation when teams are small. But if there are many rounds, it repeats the same comparison against the same defender type. An attacker's attack power and type never change, so its damage against *each defender type* is fixed throughout this battle.

Precompute one candidate order **per defender type** for each team. Sort by `(damage descending, original index ascending)`. During the battle, keep a cursor into each order. If its current candidate has died, advance the cursor; otherwise the current candidate is the correct attacker. A dead monster never revives, so each cursor advances at most once per candidate. We do not need a heap or a repeated full scan for the stated immutable attack rules.

```text
For a Water defender, Team A's precomputed order might be:
  ElectricEel: 30 damage, index 1
  GrassGolem:  24 damage, index 2
  FireDragon:  10 damage, index 0

If ElectricEel dies, advance the Water cursor to GrassGolem.
The Fire, Grass, and Electric defender cursors are independent.
```

The rank is by **calculated damage**, not raw attack power. Ties use the original list index, not a monster's name. The defender remains the first living monster in every stage; smart targeting changes only the attacker.

There are two edge contracts worth making explicit. An empty team loses before the first attack; if both teams are empty, the result is a draw. Also, integer conversion can turn a positive attack of one into **zero** in a half-damage matchup. The supplied chart has no mutually weak pair, so its two active monsters cannot both deal zero to each other. But the generic simulator accepts other charts; if an extended chart makes both sides' turns deal zero, the current defenders and HP cannot change, so it reports a stalemate after two such turns. This preserves the damage formula rather than silently inventing a minimum-one-damage rule.

## Java solution

Save as `Main.java` and run with Java 17 or newer. The names `FIRE`, `WATER`, and so on are example data in `main`; the simulator itself accepts any string types and any chart. The `BASIC`, `ELEMENTAL`, and `SMART` modes correspond to the three interview stages.

```java
import java.util.*;

enum Mode { BASIC, ELEMENTAL, SMART }

class Monster {
    final String name;
    final String type;
    final int attack;
    long hp;

    Monster(String name, long hp, int attack, String type) {
        if (name == null || name.isBlank() || type == null || type.isBlank()
                || hp <= 0 || attack <= 0) {
            throw new IllegalArgumentException("Invalid monster");
        }
        this.name = name;
        this.hp = hp;
        this.attack = attack;
        this.type = type;
    }

    boolean alive() { return hp > 0; }

    long damageTo(String defenderType, Map<String, Map<String, Integer>> chart) {
        int factor = chart.getOrDefault(type, Map.of()).getOrDefault(defenderType, 2);
        return (long) attack * factor / 2;
    }

    void takeDamage(long damage) { hp = Math.max(0, hp - damage); }
}

class Team {
    final String name;
    final List<Monster> monsters;
    private int front = 0;
    private final Map<String, List<Integer>> ranks = new HashMap<>();
    private final Map<String, Integer> cursors = new HashMap<>();

    Team(String name, List<Monster> monsters) {
        if (name == null || name.isBlank() || monsters == null
                || monsters.stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("Invalid team");
        }
        this.name = name;
        this.monsters = List.copyOf(monsters);
    }

    Monster firstAlive() {
        while (front < monsters.size() && !monsters.get(front).alive()) front++;
        return front == monsters.size() ? null : monsters.get(front);
    }

    void prepareRanks(Set<String> defenderTypes, Map<String, Map<String, Integer>> chart) {
        ranks.clear();
        cursors.clear();
        for (String defenderType : defenderTypes) {
            List<Integer> order = new ArrayList<>();
            for (int i = 0; i < monsters.size(); i++) order.add(i);
            order.sort((left, right) -> {
                long a = monsters.get(left).damageTo(defenderType, chart);
                long b = monsters.get(right).damageTo(defenderType, chart);
                int byDamage = Long.compare(b, a);
                return byDamage != 0 ? byDamage : Integer.compare(left, right);
            });
            ranks.put(defenderType, order);
            cursors.put(defenderType, 0);
        }
    }

    Monster bestAgainst(String defenderType) {
        List<Integer> order = ranks.get(defenderType);
        int cursor = cursors.get(defenderType);
        while (cursor < order.size() && !monsters.get(order.get(cursor)).alive()) cursor++;
        cursors.put(defenderType, cursor);
        return cursor == order.size() ? null : monsters.get(order.get(cursor));
    }
}

class BattleSimulator {
    private final Map<String, Map<String, Integer>> chart;

    BattleSimulator(Map<String, Map<String, Integer>> chart) {
        this.chart = Objects.requireNonNull(chart);
    }

    List<String> battle(Team teamA, Team teamB, Mode mode) {
        Objects.requireNonNull(mode);
        List<String> log = new ArrayList<>();
        log.add("Battle begins: " + teamA.name + " vs " + teamB.name);

        // Rankings are needed only for the smart-attacker stage.
        if (mode == Mode.SMART) {
            Set<String> types = new HashSet<>();
            for (Monster monster : teamA.monsters) types.add(monster.type);
            for (Monster monster : teamB.monsters) types.add(monster.type);
            teamA.prepareRanks(types, chart);
            teamB.prepareRanks(types, chart);
        }

        Team attacking = teamA;
        Team defending = teamB;
        int zeroDamageTurns = 0;
        while (teamA.firstAlive() != null && teamB.firstAlive() != null) {
            Monster defender = defending.firstAlive();
            Monster attacker = mode == Mode.SMART
                    ? attacking.bestAgainst(defender.type) : attacking.firstAlive();
            long damage = mode == Mode.BASIC ? attacker.attack : attacker.damageTo(defender.type, chart);
            defender.takeDamage(damage);

            // One line records both the attack and an elimination, if any.
            String effect = mode == Mode.BASIC ? ""
                    : damage > attacker.attack ? " (Super effective!)"
                    : damage < attacker.attack ? " (Not very effective...)" : "";
            String result = defender.alive()
                    ? defender.name + " has " + defender.hp + " HP remaining."
                    : defender.name + " is eliminated!";
            log.add(attacker.name + " attacks " + defender.name + " for "
                    + damage + " damage" + effect + ". " + result);

            // Two zero-damage turns leave both current defenders unchanged.
            zeroDamageTurns = damage == 0 ? zeroDamageTurns + 1 : 0;
            if (zeroDamageTurns == 2) break;
            Team previous = attacking;
            attacking = defending;
            defending = previous;
        }

        if (zeroDamageTurns == 2) log.add("Battle ends: stalemate (no damage).");
        else if (teamA.firstAlive() == null && teamB.firstAlive() == null)
            log.add("Battle ends: draw (both teams are empty).");
        else if (teamB.firstAlive() == null) log.add("Battle ends: " + teamA.name + " wins!");
        else log.add("Battle ends: " + teamB.name + " wins!");
        return log;
    }
}

public class Main {
    public static void main(String[] args) {
        Map<String, Map<String, Integer>> chart = Map.of(
                "FIRE", Map.of("GRASS", 4, "WATER", 1),
                "WATER", Map.of("FIRE", 4, "GRASS", 1),
                "GRASS", Map.of("WATER", 4, "FIRE", 1),
                "ELECTRIC", Map.of("WATER", 4));
        BattleSimulator simulator = new BattleSimulator(chart);

        // Test 1: Basic rules use the first living attacker; the sample begins with Dragon.
        Team heroes = new Team("Heroes", List.of(
                new Monster("Dragon", 100, 25, "FIRE"),
                new Monster("Griffin", 80, 20, "GRASS")));
        Team monsters = new Team("Monsters", List.of(
                new Monster("Goblin", 30, 10, "GRASS"),
                new Monster("Orc", 50, 15, "WATER"),
                new Monster("Troll", 70, 12, "ELECTRIC")));
        List<String> basic = simulator.battle(heroes, monsters, Mode.BASIC);
        System.out.println("Test 1: " + basic.get(1));
        System.out.println("Test 1 result: " + basic.get(basic.size() - 1));

        // Test 2: Fire loses half damage against Water; Water doubles against Fire.
        Team fire = new Team("Fire", List.of(new Monster("FireDragon", 100, 20, "FIRE")));
        Team water = new Team("Water", List.of(new Monster("WaterSerpent", 80, 15, "WATER")));
        List<String> elemental = simulator.battle(fire, water, Mode.ELEMENTAL);
        System.out.println("Test 2: " + elemental.get(1));
        System.out.println("Test 2: " + elemental.get(2));

        // Test 3: ElectricEel beats FireDragon as the attacker against Water.
        Team elements = new Team("Elements", List.of(
                new Monster("FireDragon", 100, 20, "FIRE"),
                new Monster("ElectricEel", 60, 15, "ELECTRIC")));
        Team aquatics = new Team("Aquatics", List.of(
                new Monster("WaterSerpent", 30, 10, "WATER")));
        List<String> smart = simulator.battle(elements, aquatics, Mode.SMART);
        System.out.println("Test 3: " + smart.get(1));

        // Test 4: After Water falls, FireDragon becomes best against Grass.
        Team changing = new Team("Changing", List.of(
                new Monster("FireDragon", 100, 20, "FIRE"),
                new Monster("ElectricEel", 100, 15, "ELECTRIC")));
        Team mixed = new Team("Mixed", List.of(
                new Monster("WaterMonster", 30, 5, "WATER"),
                new Monster("GrassMonster", 40, 5, "GRASS")));
        List<String> switched = simulator.battle(changing, mixed, Mode.SMART);
        System.out.println("Test 4 first: " + switched.get(1));
        System.out.println("Test 4 later: " + switched.get(3));

        // Test 5: Equal damage chooses the earlier attacker in the team list.
        Team tied = new Team("Tied", List.of(
                new Monster("First", 20, 20, "FIRE"),
                new Monster("Second", 20, 20, "WATER")));
        Team target = new Team("Target", List.of(new Monster("Dummy", 20, 5, "ELECTRIC")));
        List<String> tie = simulator.battle(tied, target, Mode.SMART);
        System.out.println("Test 5: " + tie.get(1));

        // Test 6: An extended chart can make both one-point attacks round to zero.
        BattleSimulator symmetricWeak = new BattleSimulator(Map.of(
                "LIGHT", Map.of("DARK", 1), "DARK", Map.of("LIGHT", 1)));
        Team tinyLight = new Team("TinyLight", List.of(new Monster("Spark", 5, 1, "LIGHT")));
        Team tinyDark = new Team("TinyDark", List.of(new Monster("Shade", 5, 1, "DARK")));
        List<String> stalemate = symmetricWeak.battle(tinyLight, tinyDark, Mode.ELEMENTAL);
        System.out.println("Test 6: " + stalemate.get(stalemate.size() - 1));

        // Test 7: An empty Team B loses before any attacks occur.
        Team lone = new Team("Lone", List.of(new Monster("Solo", 10, 3, "FIRE")));
        Team empty = new Team("Empty", List.of());
        List<String> noOpponent = simulator.battle(lone, empty, Mode.BASIC);
        System.out.println("Test 7: " + noOpponent.get(noOpponent.size() - 1));
    }
}
```

The first line of Test 1 is `Dragon attacks Goblin for 25 damage. Goblin has 5 HP remaining.` Test 2 starts with 10 damage from Fire to Water, then 30 from Water to Fire. Test 3 starts with `ElectricEel attacks WaterSerpent for 30 damage (Super effective!). WaterSerpent is eliminated!` Test 4 starts with Electric against Water and later switches to Fire against Grass. Test 5 chooses `First`, not `Second`. Test 6 ends in a stalemate rather than running forever; Test 7 has no attack at all. Each battle receives fresh monster objects because a battle intentionally mutates their HP.

## Python solution

This version uses the same contracts and ranking idea. It runs on Python 3.10 or newer. The data classes keep monster and team state explicit; the battle method contains the turn loop, so there is no forest of tiny helper functions.

```python
from dataclasses import dataclass, field


@dataclass
class Monster:
    name: str
    hp: int
    attack: int
    type: str

    def __post_init__(self) -> None:
        if not self.name or not self.type or self.hp <= 0 or self.attack <= 0:
            raise ValueError("Invalid monster")

    def damage_to(self, defender_type: str, chart: dict[str, dict[str, int]]) -> int:
        factor = chart.get(self.type, {}).get(defender_type, 2)
        return self.attack * factor // 2


@dataclass
class Team:
    name: str
    monsters: list[Monster]
    front: int = 0
    ranks: dict[str, list[int]] = field(default_factory=dict)
    cursors: dict[str, int] = field(default_factory=dict)

    def first_alive(self) -> Monster | None:
        while self.front < len(self.monsters) and self.monsters[self.front].hp <= 0:
            self.front += 1
        return self.monsters[self.front] if self.front < len(self.monsters) else None

    def prepare_ranks(self, defender_types: set[str], chart: dict[str, dict[str, int]]) -> None:
        # Damage is fixed for each attacker and defender type; tie by list position.
        self.ranks = {
            defender_type: sorted(
                range(len(self.monsters)),
                key=lambda index: (-self.monsters[index].damage_to(defender_type, chart), index),
            )
            for defender_type in defender_types
        }
        self.cursors = {defender_type: 0 for defender_type in defender_types}

    def best_against(self, defender_type: str) -> Monster | None:
        order = self.ranks[defender_type]
        cursor = self.cursors[defender_type]
        while cursor < len(order) and self.monsters[order[cursor]].hp <= 0:
            cursor += 1
        self.cursors[defender_type] = cursor
        return self.monsters[order[cursor]] if cursor < len(order) else None


class BattleSimulator:
    def __init__(self, chart: dict[str, dict[str, int]]) -> None:
        self.chart = chart

    def battle(self, team_a: Team, team_b: Team, mode: str) -> list[str]:
        if mode not in {"BASIC", "ELEMENTAL", "SMART"}:
            raise ValueError("Unknown battle mode")
        log = [f"Battle begins: {team_a.name} vs {team_b.name}"]

        # Build rankings only for the smart-attacker stage.
        if mode == "SMART":
            types = {monster.type for team in (team_a, team_b) for monster in team.monsters}
            team_a.prepare_ranks(types, self.chart)
            team_b.prepare_ranks(types, self.chart)

        attacking, defending = team_a, team_b
        zero_damage_turns = 0
        while team_a.first_alive() and team_b.first_alive():
            defender = defending.first_alive()
            attacker = (attacking.best_against(defender.type) if mode == "SMART"
                        else attacking.first_alive())
            damage = attacker.attack if mode == "BASIC" else attacker.damage_to(defender.type, self.chart)
            defender.hp = max(0, defender.hp - damage)

            # One line records both the attack and an elimination, if any.
            effect = ("" if mode == "BASIC" else
                      " (Super effective!)" if damage > attacker.attack else
                      " (Not very effective...)" if damage < attacker.attack else "")
            result = (f"{defender.name} has {defender.hp} HP remaining." if defender.hp > 0
                      else f"{defender.name} is eliminated!")
            log.append(f"{attacker.name} attacks {defender.name} for {damage} damage{effect}. {result}")

            # Both sides dealing zero leaves the same defender pair forever.
            zero_damage_turns = zero_damage_turns + 1 if damage == 0 else 0
            if zero_damage_turns == 2:
                break
            attacking, defending = defending, attacking

        if zero_damage_turns == 2:
            log.append("Battle ends: stalemate (no damage).")
        elif team_a.first_alive() is None and team_b.first_alive() is None:
            log.append("Battle ends: draw (both teams are empty).")
        elif team_b.first_alive() is None:
            log.append(f"Battle ends: {team_a.name} wins!")
        else:
            log.append(f"Battle ends: {team_b.name} wins!")
        return log


def main() -> None:
    chart = {
        "FIRE": {"GRASS": 4, "WATER": 1},
        "WATER": {"FIRE": 4, "GRASS": 1},
        "GRASS": {"WATER": 4, "FIRE": 1},
        "ELECTRIC": {"WATER": 4},
    }
    simulator = BattleSimulator(chart)

    # Test 1: Basic rules use the first living attacker from the stated example.
    heroes = Team("Heroes", [Monster("Dragon", 100, 25, "FIRE"), Monster("Griffin", 80, 20, "GRASS")])
    monsters = Team("Monsters", [Monster("Goblin", 30, 10, "GRASS"),
                                 Monster("Orc", 50, 15, "WATER"), Monster("Troll", 70, 12, "ELECTRIC")])
    basic = simulator.battle(heroes, monsters, "BASIC")
    print("Test 1:", basic[1])
    print("Test 1 result:", basic[-1])

    # Test 2: Fire's weak hit deals 10; Water's strong reply deals 30.
    fire = Team("Fire", [Monster("FireDragon", 100, 20, "FIRE")])
    water = Team("Water", [Monster("WaterSerpent", 80, 15, "WATER")])
    elemental = simulator.battle(fire, water, "ELEMENTAL")
    print("Test 2:", elemental[1])
    print("Test 2:", elemental[2])

    # Test 3: ElectricEel deals more damage than the earlier FireDragon against Water.
    elements = Team("Elements", [Monster("FireDragon", 100, 20, "FIRE"),
                                 Monster("ElectricEel", 60, 15, "ELECTRIC")])
    aquatics = Team("Aquatics", [Monster("WaterSerpent", 30, 10, "WATER")])
    smart = simulator.battle(elements, aquatics, "SMART")
    print("Test 3:", smart[1])

    # Test 4: The best attacker switches from Electric to Fire after Water falls.
    changing = Team("Changing", [Monster("FireDragon", 100, 20, "FIRE"),
                                  Monster("ElectricEel", 100, 15, "ELECTRIC")])
    mixed = Team("Mixed", [Monster("WaterMonster", 30, 5, "WATER"),
                           Monster("GrassMonster", 40, 5, "GRASS")])
    switched = simulator.battle(changing, mixed, "SMART")
    print("Test 4 first:", switched[1])
    print("Test 4 later:", switched[3])

    # Test 5: Equal damage is resolved by the original list order.
    tied = Team("Tied", [Monster("First", 20, 20, "FIRE"), Monster("Second", 20, 20, "WATER")])
    target = Team("Target", [Monster("Dummy", 20, 5, "ELECTRIC")])
    tie = simulator.battle(tied, target, "SMART")
    print("Test 5:", tie[1])

    # Test 6: An extended chart makes both one-point attacks round to zero.
    symmetric_weak = BattleSimulator({"LIGHT": {"DARK": 1}, "DARK": {"LIGHT": 1}})
    tiny_light = Team("TinyLight", [Monster("Spark", 5, 1, "LIGHT")])
    tiny_dark = Team("TinyDark", [Monster("Shade", 5, 1, "DARK")])
    stalemate = symmetric_weak.battle(tiny_light, tiny_dark, "ELEMENTAL")
    print("Test 6:", stalemate[-1])

    # Test 7: An empty Team B loses before the first attack.
    lone = Team("Lone", [Monster("Solo", 10, 3, "FIRE")])
    empty = Team("Empty", [])
    no_opponent = simulator.battle(lone, empty, "BASIC")
    print("Test 7:", no_opponent[-1])


if __name__ == "__main__":
    main()
```

## Why this works

For a basic or elemental turn, `firstAlive` is exactly the rule's attacker and defender. The pointer skips only monsters whose HP is zero; because HP never increases, none can become eligible again. The battle alternates teams after each attack and checks for a defeated team before the next one.

For smart targeting, the defender is still `firstAlive`. Each attacker has a fixed damage value against that defender's type, so the precomputed order ranks all possible attackers correctly. Skipping dead candidates cannot conceal a better *living* candidate: everything before the cursor is dead, and everything after it has no greater damage (or loses the tie-break). The cursor never moves backward, giving amortized constant-time selection after sorting.

Let `N` be the total monsters across both teams, `K` the number of distinct defender types in those teams, `R` the number of logged attacks, and `L` the total characters in the returned log. In Stages 1 and 2, total simulation time is **`O(N + R + L)`**: pointers advance at most `N` times, and every turn does constant work apart from constructing its log line. Extra state is **`O(N + L)`** including the team lists and returned log; if input objects are excluded, the simulation adds `O(L)`.

In Stage 3, sorting one order per team and defender type costs **`O(KN log N + R + L)`** time in the worst case. Each rank cursor skips at most `N` entries over the *whole battle*, for at most `KN` extra work already dominated by sorting. The rankings take **`O(KN)`** space, and the event log takes `O(L)`, so total extra space is **`O(KN + L)`**. With the four stated types, `K` is a small constant; after preprocessing, each attack selects its attacker in amortized `O(1)` time. Because the problem asks for a line per attack, no correct implementation can avoid `Ω(R)` log entries. For a tiny one-off battle, the simpler `O(RN)` scan may still be the better engineering choice.

## What if the interviewer adds thousands of moves?

The attachment also discusses a *possible later variant* in which a monster owns many typed moves, battles are replayed repeatedly, and individual turns may be too numerous to log. That is a different contract, not part of the three stated stages. Under those additional rules, keep only the highest-power move per move type, cache the best move for each defender type, and share immutable monster definitions across battles instead of deep-copying every move. If the requested result is only a winner or a compressed summary, a fixed-damage duel can sometimes jump by `ceil(remainingHP / damage)` hits; **it cannot skip individual turns while still returning a log for every attack**. This is why the output requirement matters as much as the data structure.
