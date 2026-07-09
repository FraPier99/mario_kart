"""
compute_group_layout è una funzione pura (nessun accesso DB) — la copro a
tabella per bloccare derive tra codice e REGOLAMENTO.md come già successo
(vedi docs/QA_REPORT.md, Bug 2: la doc diceva "girone unico" 6-8 giocatori
mentre il codice produce sempre gruppi da max 4).
"""

import pytest

from app.services.tornei.tournaments import (
    MAX_GROUP_SIZE,
    MIN_GROUP_STAGE_PLAYERS,
    compute_group_layout,
)


@pytest.mark.parametrize(
    "n_players, expected",
    [
        (8, [4, 4]),
        (9, [3, 3, 3]),
        (10, [4, 3, 3]),
        (11, [4, 4, 3]),
        (12, [4, 4, 4]),
        (16, [4, 4, 4, 4]),
        (17, [4, 4, 3, 3, 3]),
    ],
)
def test_compute_group_layout_matches_documented_examples(n_players, expected):
    assert compute_group_layout(n_players) == expected


@pytest.mark.parametrize("n_players", [1, 6, 7])
def test_compute_group_layout_rejects_below_minimum(n_players):
    with pytest.raises(ValueError):
        compute_group_layout(n_players)


def test_compute_group_layout_never_exceeds_max_group_size():
    for n in range(MIN_GROUP_STAGE_PLAYERS, 40):
        assert max(compute_group_layout(n)) <= MAX_GROUP_SIZE


def test_compute_group_layout_groups_sum_to_n_players():
    for n in range(MIN_GROUP_STAGE_PLAYERS, 40):
        assert sum(compute_group_layout(n)) == n
