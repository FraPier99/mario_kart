"""
Copre settle_deluxe_schedine (group_stage) — il path che aveva il crash FK
critico documentato in docs/QA_REPORT.md (Bug 1, fixato). Questi test lo
tengono fixato: se qualcuno rimette un source_schedina_id che punta alla
tabella sbagliata (schedine_torneo invece di schedine_torneo_deluxe), il test
dell'ex-aequo fallisce con ForeignKeyViolation invece di un assert pulito.

Anche: idempotenza (Bug 4) e skip del Blue Shell per l'ultimo classificato
senza account utente collegato (comportamento verificato in QA scenario 3).
"""

from app.models import PremioTorneo, UserInventory
from app.controllers.tornei.schemas.tournaments import TournamentPlayoffRequest
from app.services.schedine.schedine_deluxe import settle_deluxe_schedine
from app.services.tornei.tournaments import (
    complete_group_stage_group,
    generate_group_stage_finals,
    set_tournament_playoff_winner,
)
from tests.factories import (
    get_superadmin,
    make_group_stage_tournament,
    make_players_and_users,
    run_race_with_positions,
    submit_group_stage_schedina,
)


def _play_8p_group_stage_to_finals(db, prefix):
    """8 giocatori → compute_group_layout(8) = [4, 4], niente semifinale
    (4 qualificati == FINAL_SLOTS): stesso scenario di QA_REPORT Scenario 3."""
    players, users = make_players_and_users(db, 8, prefix=prefix)
    pids = [p.id for p in players]
    superadmin = get_superadmin(db)

    tournament = make_group_stage_tournament(db, f"{prefix}_gs_torneo", pids, superadmin.id)
    db.refresh(tournament)
    groups = tournament.format_data["groups"]

    finalisti_ids = []
    classifiche_gironi = {}
    for gk in sorted(groups.keys(), key=int):
        gplayers = list(groups[gk])
        classifiche_gironi[gk] = gplayers
        finalisti_ids.extend(gplayers[:2])

    return tournament, players, users, groups, finalisti_ids, classifiche_gironi


def _run_group_races_and_finals(db, tournament, groups):
    race_order = 1
    for gk in sorted(groups.keys(), key=int):
        gplayers = list(groups[gk])
        positions = {pid: i + 1 for i, pid in enumerate(gplayers)}
        run_race_with_positions(
            db, tournament, race_order, f"Girone {gk}", positions,
            phase="group", group_name=gk,
        )
        race_order += 1

    for gk in sorted(groups.keys(), key=int):
        complete_group_stage_group(db, tournament.id, gk)

    generate_group_stage_finals(db, tournament.id, actor_user_id=get_superadmin(db).id)
    db.refresh(tournament)

    top_ids = tournament.format_data["finals"]["top"]
    positions = {pid: i + 1 for i, pid in enumerate(top_ids)}
    run_group_race = run_race_with_positions(
        db, tournament, race_order, "Finale", positions,
        phase="finals", group_name="top",
    )
    return top_ids


def test_settle_deluxe_exaequo_grants_master_without_fk_crash(db):
    """Bug 1 regression: due schedine identiche, esatta previsione finale
    → entrambe premiate. Prima del fix, la seconda grant_card crashava con
    ForeignKeyViolation su user_inventory_source_schedina_id_fkey."""
    tournament, players, users, groups, finalisti_ids, classifiche_gironi = (
        _play_8p_group_stage_to_finals(db, "deluxefk")
    )

    submit_group_stage_schedina(
        db, users[0].id, tournament.id, list(finalisti_ids), classifiche_gironi
    )
    submit_group_stage_schedina(
        db, users[1].id, tournament.id, list(finalisti_ids), classifiche_gironi
    )

    top_ids = _run_group_races_and_finals(db, tournament, groups)

    res, err = set_tournament_playoff_winner(
        db,
        tournament.id,
        TournamentPlayoffRequest(
            player_one_id=top_ids[0], player_two_id=top_ids[1], winner_id=top_ids[0]
        ),
    )
    assert err in (None, "ok"), err

    db.refresh(tournament)
    assert tournament.vincitore_schedina_id is not None

    premi = db.query(PremioTorneo).filter(PremioTorneo.torneo_sorgente_id == tournament.id).all()
    assert {p.user_id for p in premi} == {users[0].id, users[1].id}

    master_cards = (
        db.query(UserInventory)
        .filter(
            UserInventory.source_tournament_id == tournament.id,
            UserInventory.card_type == "master",
        )
        .all()
    )
    assert {c.user_id for c in master_cards} == {users[0].id, users[1].id}


def test_settle_deluxe_skips_blue_shell_for_player_without_user_account(db):
    """QA scenario 3: se l'ultimo classificato non ha un account utente
    collegato, il Blue Shell viene correttamente saltato (nessun crash)."""
    from app.controllers.utenti.schemas.players import CreatePlayer
    from app.services.utenti.players import create_player

    players, users = make_players_and_users(db, 7, prefix="noaccount")
    # ottavo giocatore SENZA user collegato
    unlinked_player = create_player(
        db, CreatePlayer(first_name="Senza", last_name="Account", nickname="noaccount_p8")
    )
    all_players = players + [unlinked_player]
    pids = [p.id for p in all_players]
    superadmin = get_superadmin(db)

    tournament = make_group_stage_tournament(db, "noaccount_gs_torneo", pids, superadmin.id)
    db.refresh(tournament)
    groups = tournament.format_data["groups"]

    for u in users:
        finalisti_ids, classifiche_gironi = [], {}
        for gk in sorted(groups.keys(), key=int):
            gplayers = list(groups[gk])
            classifiche_gironi[gk] = gplayers
            finalisti_ids.extend(gplayers[:2])
        submit_group_stage_schedina(db, u.id, tournament.id, finalisti_ids, classifiche_gironi)

    top_ids = _run_group_races_and_finals(db, tournament, groups)

    res, err = set_tournament_playoff_winner(
        db,
        tournament.id,
        TournamentPlayoffRequest(
            player_one_id=top_ids[0], player_two_id=top_ids[1], winner_id=top_ids[0]
        ),
    )
    assert err in (None, "ok"), err

    shells = (
        db.query(UserInventory)
        .filter(
            UserInventory.source_tournament_id == tournament.id,
            UserInventory.card_type == "blue_shell",
        )
        .all()
    )
    # Non deve crashare, e non deve esistere una carta assegnata a un utente
    # inesistente: se l'ultimo è unlinked_player, nessuna carta viene creata.
    for shell in shells:
        assert shell.user_id in {u.id for u in users}


def test_settle_deluxe_is_idempotent_on_resettlement(db):
    """Bug 4 regression: una seconda chiamata non deve ricreare PremioTorneo
    né sballare settled_at — deve fermarsi su already_settled come il path classic."""
    tournament, players, users, groups, finalisti_ids, classifiche_gironi = (
        _play_8p_group_stage_to_finals(db, "deluxeidem")
    )
    for u in users:
        submit_group_stage_schedina(
            db, u.id, tournament.id, list(finalisti_ids), classifiche_gironi
        )

    top_ids = _run_group_races_and_finals(db, tournament, groups)
    res, err = set_tournament_playoff_winner(
        db,
        tournament.id,
        TournamentPlayoffRequest(
            player_one_id=top_ids[0], player_two_id=top_ids[1], winner_id=top_ids[0]
        ),
    )
    assert err in (None, "ok"), err

    premi_before = db.query(PremioTorneo).filter(
        PremioTorneo.torneo_sorgente_id == tournament.id
    ).count()

    result = settle_deluxe_schedine(db, tournament.id)

    assert result["status"] == "already_settled"
    premi_after = db.query(PremioTorneo).filter(
        PremioTorneo.torneo_sorgente_id == tournament.id
    ).count()
    assert premi_after == premi_before
