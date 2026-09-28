"""
Le funzioni pure che compongono Semifinali e Finalina/Consolazione
(compute_semifinal_layout, _distribute_to_heats, _build_consolation_tiers)
devono garantire SEMPRE che nessuna gara superi MAX_GROUP_SIZE giocatori —
è il vincolo schermo/hardware ("massimo 4 console"), identico a quello già
testato per compute_group_layout in test_group_layout.py. Qui si blinda la
stessa garanzia per le funzioni usate nelle fasi successive ai Gironi,
finora non testate.
"""

import pytest

from app.services.tornei.tournaments import (
    MAX_GROUP_SIZE,
    _build_consolation_tiers,
    _distribute_to_heats,
    compute_semifinal_layout,
)


def _row(player_id: int, punti_totali: int = 0, vittorie: int = 0) -> dict:
    return {"player_id": player_id, "punti_totali": punti_totali, "vittorie": vittorie}


@pytest.mark.parametrize(
    "n_qualified, expected",
    [
        (6, [3, 3]),
        (8, [4, 4]),
        (10, [4, 3, 3]),
    ],
)
def test_compute_semifinal_layout_matches_documented_examples(n_qualified, expected):
    assert compute_semifinal_layout(n_qualified) == expected


def test_compute_semifinal_layout_never_exceeds_max_group_size():
    for n in range(2, 40):
        assert max(compute_semifinal_layout(n)) <= MAX_GROUP_SIZE


def test_compute_semifinal_layout_batteries_sum_to_n_qualified():
    for n in range(2, 40):
        assert sum(compute_semifinal_layout(n)) == n


def test_distribute_to_heats_never_exceeds_max_group_size():
    for n in range(1, 40):
        ids = list(range(1, n + 1))
        heats = _distribute_to_heats(ids, start_index=0)
        assert all(len(batteria) <= MAX_GROUP_SIZE for batteria in heats.values())


def test_distribute_to_heats_no_player_lost_or_duplicated():
    for n in range(1, 40):
        ids = list(range(1, n + 1))
        heats = _distribute_to_heats(ids, start_index=0)
        flattened = sorted(pid for batteria in heats.values() for pid in batteria)
        assert flattened == ids


@pytest.mark.parametrize(
    "tier_sizes",
    [
        [5],           # un tier solo, > MAX_GROUP_SIZE
        [2, 3],        # caso reale: 9 giocatori (2 eliminati in semifinale, 3 esclusi dai gironi)
        [2, 4],        # caso reale: 10 giocatori
        [2, 5],        # caso reale: 11 giocatori (un tier va sub-diviso)
        [2, 6],        # caso reale: 12 giocatori (un tier va sub-diviso)
        [1, 3],        # tier con un solo giocatore: deve fondersi col precedente (_build_consolation_tiers)
        [4],           # esattamente MAX_GROUP_SIZE, nessuna divisione necessaria
        [3],           # sotto MAX_GROUP_SIZE, nessuna divisione
    ],
)
def test_build_consolation_tiers_never_exceeds_max_group_size(tier_sizes):
    next_id = 1
    tiers = []
    for size in tier_sizes:
        tier_rows = [_row(pid) for pid in range(next_id, next_id + size)]
        tiers.append(tier_rows)
        next_id += size

    all_ids, heats, tier_order = _build_consolation_tiers(tiers)

    total = sum(tier_sizes)
    assert len(all_ids) == total
    assert sorted(all_ids) == list(range(1, total + 1))

    if heats is None:
        # Nessuna divisione necessaria: tutto il totale entra in una sola gara.
        assert total <= MAX_GROUP_SIZE
        assert tier_order is None
    else:
        assert all(len(batteria) <= MAX_GROUP_SIZE for batteria in heats.values())
        flattened = sorted(pid for batteria in heats.values() for pid in batteria)
        assert flattened == list(range(1, total + 1))
        # tier_order elenca le chiavi-batteria di ogni tier, nello stesso ordine
        assert sum(len(t) for t in tier_order) == len(heats)


def test_build_consolation_tiers_tier_order_never_mixes_tiers_in_same_battery():
    # 9 giocatori: tier0 (2 eliminati in semifinale) + tier1 (3 esclusi dai
    # gironi) — nessuna batteria deve contenere giocatori di entrambi i tier.
    tier0 = [_row(pid) for pid in (1, 2)]
    tier1 = [_row(pid) for pid in (3, 4, 5)]

    _, heats, tier_order = _build_consolation_tiers([tier0, tier1])

    assert heats is not None
    tier0_keys, tier1_keys = tier_order
    tier0_ids = {pid for k in tier0_keys for pid in heats[k]}
    tier1_ids = {pid for k in tier1_keys for pid in heats[k]}
    assert tier0_ids == {1, 2}
    assert tier1_ids == {3, 4, 5}
    assert tier0_ids.isdisjoint(tier1_ids)
