"""Exercise the published Python snippet against a deliberately simple daily model."""

from itertools import product
from pathlib import Path
import re


ARTICLE = (
    Path(__file__).resolve().parents[1]
    / "site/src/content/coding/plant-infection-grid.md"
)
SOURCE = re.search(r"```python\n(.*?)\n```", ARTICLE.read_text(), re.DOTALL)
assert SOURCE is not None
NAMESPACE = {"__name__": "plant_article"}
exec(SOURCE.group(1), NAMESPACE)
PlantInfection = NAMESPACE["PlantInfection"]


def daily_reference(grid, recovery_days, threshold):
    rows, cols = len(grid), len(grid[0])
    state = list("".join(grid))
    recovery_due = [recovery_days if cell == "X" else None for cell in state]
    death_due = [None] * len(state)
    day = last_change = deaths = 0

    def infected_neighbors(cell):
        r, c = divmod(cell, cols)
        return sum(
            0 <= r + dr < rows
            and 0 <= c + dc < cols
            and state[(r + dr) * cols + c + dc] == "X"
            for dr in (-1, 0, 1)
            for dc in (-1, 0, 1)
            if dr or dc
        )

    while "X" in state:
        # Day-zero triggers and any previously untriggered infected cells.
        for cell, status in enumerate(state):
            if status == "X" and death_due[cell] is None:
                if infected_neighbors(cell) >= threshold:
                    death_due[cell] = day + recovery_days

        old_infected = [cell for cell, status in enumerate(state) if status == "X"]
        new_infections = set()
        for cell in old_infected:
            r, c = divmod(cell, cols)
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    if dr == dc == 0:
                        continue
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        neighbor = nr * cols + nc
                        if state[neighbor] == ".":
                            new_infections.add(neighbor)

        day += 1
        for cell in new_infections:
            state[cell] = "X"
            recovery_due[cell] = day + recovery_days
            last_change = day

        # New infections can trigger death before a recovery due today.
        for cell, status in enumerate(state):
            if status == "X" and death_due[cell] is None:
                if infected_neighbors(cell) >= threshold:
                    death_due[cell] = day + recovery_days

        for cell in old_infected:
            if death_due[cell] == day:
                state[cell] = "D"
                deaths += 1
                last_change = day
            elif death_due[cell] is None and recovery_due[cell] == day:
                state[cell] = "R"
                last_change = day
        assert day <= len(state) + 2 * recovery_days

    return last_change, deaths


def test_part_four_matches_daily_reference_on_every_small_grid():
    solver = PlantInfection()
    for cells in product("X.I", repeat=4):
        grid = ["".join(cells[:2]), "".join(cells[2:])]
        for recovery_days in (1, 2, 3):
            for threshold in range(5):
                assert solver.simulate_deaths(grid, recovery_days, threshold) == (
                    daily_reference(grid, recovery_days, threshold)
                ), (grid, recovery_days, threshold)


def test_firebreak_choice_never_costs_more_than_doing_nothing():
    solver = PlantInfection()
    for cells in product("X.I", repeat=4):
        grid = ["".join(cells[:2]), "".join(cells[2:])]
        natural_deaths = solver.simulate_deaths(grid, 2, 1)[1]
        assert solver.min_deaths(grid, 2, 1) <= natural_deaths, grid


def test_documented_firebreak_examples():
    solver = PlantInfection()
    assert solver.min_deaths(["XX"], 2, 1) == 1
    assert solver.min_deaths(["X"], 2, 1) == 0
    assert solver.spread_days(["XI.", ".I.", ".I."]) == 2
    assert solver.spread_days(["X."], 1) == 2
