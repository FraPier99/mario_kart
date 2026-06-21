from datetime import datetime

from sqlalchemy import and_, case, func, or_
from sqlalchemy.orm import Session

from app.services.cards.inventory import grant_card
from app.models import (
    Player,
    PremioTorneo,
    Race,
    Result,
    SchedinaTorneo,
    Tournament,
    TournamentPlayer,
    User,
    UserInventory,
)
from app.controllers.schedine.schemas.schedine import SchedinaCreate


# Regolamento (REGOLAMENTO.md): ogni singolo pronostico indovinato assegna
# esattamente 3 punti, senza bonus né pesi differenziati per posizione.
PUNTI_PRONOSTICO = 3

POINTS_RULES = {
    "position": PUNTI_PRONOSTICO,
    "streak": PUNTI_PRONOSTICO,
    "duello": PUNTI_PRONOSTICO,
}


def create_schedina(db: Session, user_id: int, payload: SchedinaCreate):
    existing = (
        db.query(SchedinaTorneo)
        .filter(
            SchedinaTorneo.user_id == user_id,
            SchedinaTorneo.tournament_id == payload.tournament_id,
        )
        .first()
    )
    if existing:
        raise ValueError("Hai già compilato la schedina per questo torneo")

    tournament = (
        db.query(Tournament).filter(Tournament.id == payload.tournament_id).first()
    )
    if not tournament:
        raise ValueError("Tournament not found")

    if tournament.tournament_format != "classic":
        raise ValueError("Questo torneo non è in formato classic")
    # Chiusura a evento: schedine aperte solo finché non sono bloccate
    # (1° gara inserita / "Chiudi Schedine" / torneo avviato).
    if tournament.schedine_locked or tournament.status != "da_svolgere":
        raise ValueError("Le schedine per questo torneo sono chiuse")

    participant_ids = {
        pid
        for (pid,) in db.query(TournamentPlayer.player_id)
        .filter(TournamentPlayer.tournament_id == tournament.id)
        .all()
    }
    if not participant_ids:
        raise ValueError("Il torneo non ha ancora partecipanti assegnati")

    # La classifica generale pronosticata deve essere un riordino esatto dei partecipanti
    if set(payload.classifica_ordinata) != participant_ids or len(
        set(payload.classifica_ordinata)
    ) != len(payload.classifica_ordinata):
        raise ValueError(
            "La classifica generale pronosticata deve contenere esattamente tutti "
            "i partecipanti al torneo, senza ripetizioni"
        )

    if payload.maggiore_streak_vittorie_id not in participant_ids:
        raise ValueError(
            "Il pronostico 'Maggior Streak' deve indicare un partecipante del torneo"
        )

    # Il Duello è fissato dall'admin sul torneo: ignoriamo i valori del client per
    # quei due ID, altrimenti utenti diversi potrebbero registrare matchup diversi
    # e il pronostico perderebbe significato come confronto comune.
    duello_ids = {tournament.duello_player_a_id, tournament.duello_player_b_id} - {None}
    if (
        payload.duello_scelta_id is not None
        and payload.duello_scelta_id not in duello_ids
    ):
        raise ValueError(
            "Il pronostico del Duello deve essere uno dei due giocatori indicati dall'admin"
        )

    schedina_data = payload.model_dump()
    schedina_data["duello_player_a_id"] = tournament.duello_player_a_id
    schedina_data["duello_player_b_id"] = tournament.duello_player_b_id

    schedina = SchedinaTorneo(user_id=user_id, **schedina_data)
    db.add(schedina)
    db.commit()
    db.refresh(schedina)
    return schedina


def get_schedine(
    db: Session, user_id: int | None = None, tournament_id: int | None = None
):
    query = db.query(SchedinaTorneo)
    if user_id is not None:
        query = query.filter(SchedinaTorneo.user_id == user_id)
    if tournament_id is not None:
        query = query.filter(SchedinaTorneo.tournament_id == tournament_id)
    return query.order_by(
        SchedinaTorneo.created_at.asc(), SchedinaTorneo.id.asc()
    ).all()


def get_prizes(db: Session, user_id: int | None = None, redeemed: bool | None = None):
    query = db.query(PremioTorneo)
    if user_id is not None:
        query = query.filter(PremioTorneo.user_id == user_id)
    if redeemed is True:
        query = query.filter(PremioTorneo.redeemed_at.isnot(None))
    elif redeemed is False:
        query = query.filter(PremioTorneo.redeemed_at.is_(None))
    return query.order_by(PremioTorneo.created_at.desc(), PremioTorneo.id.desc()).all()


def get_public_schedina_overview(db: Session, game_id: int | None = None):
    winner_query = (
        db.query(
            PremioTorneo.user_id.label("user_id"),
            PremioTorneo.created_at.label("created_at"),
            PremioTorneo.redeemed_at.label("redeemed_at"),
            Tournament.id.label("tournament_id"),
            Tournament.name.label("tournament_name"),
            Tournament.date.label("tournament_date"),
            SchedinaTorneo.id.label("schedina_id"),
            SchedinaTorneo.total_points.label("points"),
            SchedinaTorneo.tie_breaker_distance.label("tie_breaker_distance"),
            User.username.label("username"),
            Player.nickname.label("nickname"),
        )
        .join(
            SchedinaTorneo,
            and_(
                SchedinaTorneo.user_id == PremioTorneo.user_id,
                SchedinaTorneo.tournament_id == PremioTorneo.torneo_sorgente_id,
            ),
        )
        .join(Tournament, Tournament.id == PremioTorneo.torneo_sorgente_id)
        .join(User, User.id == PremioTorneo.user_id)
        .outerjoin(Player, Player.id == User.player_id)
    )
    if game_id is not None:
        winner_query = winner_query.filter(Tournament.game_id == game_id)
    winner_rows = winner_query.order_by(
        Tournament.date.desc().nullslast(), Tournament.id.desc()
    ).all()

    compiled_query = db.query(
        SchedinaTorneo.user_id.label("user_id"),
        func.count(SchedinaTorneo.id).label("schedine_compiled"),
        func.coalesce(func.sum(SchedinaTorneo.total_points), 0).label("total_points"),
    ).join(Tournament, Tournament.id == SchedinaTorneo.tournament_id)
    if game_id is not None:
        compiled_query = compiled_query.filter(Tournament.game_id == game_id)
    compiled_rows = compiled_query.group_by(SchedinaTorneo.user_id).all()

    compiled_counts = {
        row.user_id: {
            "schedine_compiled": int(row.schedine_compiled or 0),
            "total_points": int(row.total_points or 0),
        }
        for row in compiled_rows
    }

    prize_query = db.query(
        PremioTorneo.user_id.label("user_id"),
        func.count(PremioTorneo.id).label("schedine_won"),
        func.sum(case((PremioTorneo.redeemed_at.isnot(None), 1), else_=0)).label(
            "prizes_redeemed"
        ),
    ).join(Tournament, Tournament.id == PremioTorneo.torneo_sorgente_id)
    if game_id is not None:
        prize_query = prize_query.filter(Tournament.game_id == game_id)
    prize_rows = prize_query.group_by(PremioTorneo.user_id).all()

    prize_counts = {
        row.user_id: {
            "schedine_won": int(row.schedine_won or 0),
            "prizes_redeemed": int(row.prizes_redeemed or 0),
        }
        for row in prize_rows
    }

    inventory_rows = (
        db.query(
            UserInventory.user_id.label("user_id"),
            func.count(UserInventory.id).label("cards_owned"),
            func.sum(case((UserInventory.is_consumed.is_(True), 1), else_=0)).label(
                "cards_used"
            ),
        )
        .group_by(UserInventory.user_id)
        .all()
    )

    inventory_counts = {
        row.user_id: {
            "cards_owned": int(row.cards_owned or 0),
            "cards_used": int(row.cards_used or 0),
        }
        for row in inventory_rows
    }

    user_rows = (
        db.query(
            User.id.label("user_id"),
            User.username.label("username"),
            Player.nickname.label("nickname"),
            Player.img_url.label("img_url"),
        )
        .outerjoin(Player, Player.id == User.player_id)
        .order_by(User.username.asc())
        .all()
    )

    usage_rows = []
    for row in user_rows:
        prize_row = prize_counts.get(row.user_id, {})
        inventory_row = inventory_counts.get(row.user_id, {})
        compiled_row = compiled_counts.get(row.user_id, {})
        usage_rows.append(
            {
                "user_id": row.user_id,
                "username": row.username,
                "nickname": row.nickname,
                "img_url": row.img_url,
                "schedine_compiled": compiled_row.get("schedine_compiled", 0),
                "total_points": compiled_row.get("total_points", 0),
                "schedine_won": prize_row.get("schedine_won", 0),
                "prizes_redeemed": prize_row.get("prizes_redeemed", 0),
                "cards_owned": inventory_row.get("cards_owned", 0),
                "cards_used": inventory_row.get("cards_used", 0),
            }
        )

    usage_rows.sort(
        key=lambda item: (
            -item["schedine_won"],
            -item["schedine_compiled"],
            item["username"].lower(),
        )
    )

    winners = [
        {
            "user_id": row.user_id,
            "username": row.username,
            "nickname": row.nickname,
            "tournament_id": row.tournament_id,
            "tournament_name": row.tournament_name,
            "tournament_date": row.tournament_date,
            "schedina_id": row.schedina_id,
            "points": int(row.points or 0),
            "tie_breaker_distance": row.tie_breaker_distance,
            "redeemed_at": row.redeemed_at,
            "created_at": row.created_at,
        }
        for row in winner_rows
    ]

    return {
        "rules": POINTS_RULES,
        "winners": winners,
        "usage": usage_rows,
    }


def _build_tournament_schedina_snapshot(
    db: Session, tournament_id: int, include_details: bool = True
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise ValueError("Tournament not found")

    schedine = get_schedine(db, tournament_id=tournament_id)

    # Non calcolare/esporre i punteggi finché il torneo non è concluso
    if tournament.status != "concluso":
        snapshot_rows = [
            {
                "schedina": s,
                "total_points": 0,
                "tie_breaker_distance": None,
                "winner_match": s.user_id,
                "scoring_breakdown": [],
            }
            for s in schedine
        ]
        return tournament, None, snapshot_rows, None

    leaderboard = _get_leaderboard(db, tournament_id)
    winner_id, winner_points = _get_actual_tournament_winner(tournament, leaderboard)
    streak_winners = _get_streak_winners(db, tournament_id)

    # _get_leaderboard ordina solo su punti/vittorie/podi e ignora l'esito
    # degli eventuali duelli di spareggio: per i tornei classic, la
    # classifica usata per valutare i pronostici "Classifica generale" deve
    # invece essere quella già risolta (vedi get_classic_final_classifica),
    # altrimenti un pronostico esatto su una posizione decisa da un duello
    # verrebbe segnato come errato.
    if tournament.tournament_format == "classic":
        from app.services.tornei.tournaments import get_classic_final_classifica

        classifica_ordinata = get_classic_final_classifica(db, tournament_id)
    else:
        classifica_ordinata = [row.player_id for row in leaderboard]

    if winner_id is None:
        return tournament, None, [], None

    actual = {
        "classifica_ordinata": classifica_ordinata,
        "winner_points": winner_points,
        "streak_winners": streak_winners,
        # Punti totali per giocatore: servono al Duello (confronto a punti, con pareggio)
        "points_by_player": {
            row.player_id: int(row.total_points or 0) for row in leaderboard
        },
    }

    prize = (
        db.query(PremioTorneo)
        .filter(PremioTorneo.torneo_sorgente_id == tournament_id)
        .first()
    )

    snapshot_rows = []
    for schedina in schedine:
        total_points, _breakdown = _score_schedina(schedina, actual)
        tie_breaker_distance = abs(schedina.spareggio_punti_vincitore - winner_points)

        if not include_details:
            schedina.classifica_ordinata = None
            schedina.maggiore_streak_vittorie_id = None
            schedina.duello_player_a_id = None
            schedina.duello_player_b_id = None
            schedina.duello_scelta_id = None
            schedina.spareggio_punti_vincitore = None

        snapshot_rows.append(
            {
                "schedina": schedina,
                "total_points": total_points,
                "tie_breaker_distance": tie_breaker_distance,
                "winner_match": schedina.user_id,
                "scoring_breakdown": _breakdown,
            }
        )

    snapshot_rows.sort(
        key=lambda item: (
            -item["total_points"],
            item["tie_breaker_distance"]
            if item["tie_breaker_distance"] is not None
            else 10**9,
            item["schedina"].created_at,
            item["schedina"].id,
        )
    )

    winner_row = None
    if prize:
        for item in snapshot_rows:
            if item["schedina"].user_id == prize.user_id:
                winner_row = item
                break

    if winner_row is None and snapshot_rows:
        winner_row = snapshot_rows[0]

    return tournament, actual, snapshot_rows, winner_row


def _get_leaderboard(db: Session, tournament_id: int):
    return (
        db.query(
            Result.player_id.label("player_id"),
            func.sum(Result.points).label("total_points"),
            func.sum(case((Result.position == 1, 1), else_=0)).label("first_places"),
            func.sum(case((Result.position <= 3, 1), else_=0)).label("podiums"),
        )
        .join(Race, Race.id == Result.race_id)
        .filter(Race.tournament_id == tournament_id, Race.is_duello.is_(False))
        .group_by(Result.player_id)
        .order_by(
            func.sum(Result.points).desc(),
            func.sum(case((Result.position == 1, 1), else_=0)).desc(),
            func.sum(case((Result.position <= 3, 1), else_=0)).desc(),
            Result.player_id.asc(),
        )
        .all()
    )


def _get_race_winners(db: Session, tournament_id: int):
    rows = (
        db.query(
            Race.race_order,
            Result.player_id,
            func.max(Result.points).label("race_points"),
        )
        .join(Result, Result.race_id == Race.id)
        .filter(Race.tournament_id == tournament_id, Race.is_duello.is_(False))
        .group_by(Race.race_order, Result.player_id)
        .order_by(Race.race_order.asc())
        .all()
    )

    winners = []
    current_order = None
    current_candidates = []

    for race_order, player_id, race_points in rows:
        if current_order is None:
            current_order = race_order
        if race_order != current_order:
            current_candidates.sort(key=lambda item: (-item[1], item[0]))
            winners.append(current_candidates[0][0])
            current_candidates = []
            current_order = race_order
        current_candidates.append((player_id, race_points or 0))

    if current_candidates:
        current_candidates.sort(key=lambda item: (-item[1], item[0]))
        winners.append(current_candidates[0][0])

    return winners


def _get_streak_winners(db: Session, tournament_id: int) -> set[int]:
    """
    Striscia di vittorie consecutive più lunga del torneo. Restituisce
    l'insieme di TUTTI i giocatori che hanno raggiunto quella lunghezza
    massima: se due o più giocatori sono a pari merito, un pronostico su
    QUALSIASI di loro è corretto (non si sceglie arbitrariamente un solo
    "vincitore" per rank in classifica). Una striscia di 1 vittoria non è
    una vera streak (serve un MINIMO di 2 vittorie consecutive): in quel
    caso restituisce un insieme vuoto e nessun pronostico Streak è valido.
    """
    winners = _get_race_winners(db, tournament_id)
    if not winners:
        return set()

    best_streak = 0
    best_players: set[int] = set()
    current_player_id = None
    current_streak = 0

    for player_id in winners:
        if player_id == current_player_id:
            current_streak += 1
        else:
            current_player_id = player_id
            current_streak = 1

        if current_streak > best_streak:
            best_streak = current_streak
            best_players = {player_id}
        elif current_streak == best_streak:
            best_players.add(player_id)

    if best_streak < 2:
        return set()

    return best_players


def _get_actual_tournament_winner(tournament: Tournament, leaderboard):
    if tournament.winner_id is not None:
        for row in leaderboard:
            if row.player_id == tournament.winner_id:
                return row.player_id, int(row.total_points or 0)

    if leaderboard:
        top = leaderboard[0]
        return top.player_id, int(top.total_points or 0)

    return None, 0


def _get_last_id(leaderboard):
    if not leaderboard:
        return []
    n = len(leaderboard)
    count = 2 if n >= 7 else 1
    return [leaderboard[-i].player_id for i in range(1, count + 1)]


def _last_ids_from_final_order(order: list[int]) -> list[int]:
    """
    Estrae l'ultimo (e, da 7 partecipanti in su, anche il penultimo)
    classificato da un ordine GIÀ risolto rispetto agli eventuali spareggi
    (vedi get_classic_final_classifica) — a differenza di _get_leaderboard,
    che ordina solo su punti/vittorie/podi e ignora l'esito dei duelli,
    quindi può indicare come "ultimo"/"penultimo" il giocatore sbagliato se
    c'è un pareggio nelle posizioni di coda.
    """
    if not order:
        return []
    n = len(order)
    count = 2 if n >= 7 else 1
    return list(reversed(order[-count:]))


def _score_schedina(
    schedina: SchedinaTorneo,
    actual: dict[str, object],
    players_nicknames: dict[int, str] | None = None,
):
    """Calcola il punteggio (flat 3 pt per ogni pronostico corretto) e il dettaglio."""
    score = 0
    breakdown = []

    classifica = schedina.classifica_ordinata or []
    actual_classifica = actual.get("classifica_ordinata", [])

    n_players = min(len(classifica), len(actual_classifica))
    for idx in range(n_players):
        pid = classifica[idx]
        correct = pid == actual_classifica[idx]
        label = f"{idx + 1}°"
        pts = PUNTI_PRONOSTICO if correct else 0
        if correct:
            score += pts
        pick_nick = _pn(pid, players_nicknames)
        breakdown.append(
            {
                "label": label,
                "pick_player_id": pid,
                "pick_nickname": pick_nick,
                "correct": correct,
                "points": pts,
                "bonus_points": 0,
                "category": "position",
            }
        )

    streak_correct = bool(
        schedina.maggiore_streak_vittorie_id
        and schedina.maggiore_streak_vittorie_id in actual.get("streak_winners", set())
    )
    streak_pts = PUNTI_PRONOSTICO if streak_correct else 0
    if streak_correct:
        score += streak_pts
    breakdown.append(
        {
            "label": "Maggior Streak",
            "pick_player_id": schedina.maggiore_streak_vittorie_id,
            "pick_nickname": _pn(
                schedina.maggiore_streak_vittorie_id, players_nicknames
            ),
            "correct": streak_correct,
            "bonus_points": 0,
            "points": streak_pts,
            "category": "streak",
        }
    )

    # Duello: confronto sui PUNTI TOTALI di A e B; "Pareggio" se pari punti.
    duel_correct = False
    duel_pts = 0
    if schedina.duello_player_a_id and schedina.duello_player_b_id:
        pts_map = actual.get("points_by_player", {})
        a_pts = pts_map.get(schedina.duello_player_a_id)
        b_pts = pts_map.get(schedina.duello_player_b_id)
        if a_pts is not None and b_pts is not None:
            if a_pts == b_pts:
                actual_winner = None  # pareggio
            else:
                actual_winner = (
                    schedina.duello_player_a_id
                    if a_pts > b_pts
                    else schedina.duello_player_b_id
                )
            if schedina.duello_pareggio:
                duel_correct = actual_winner is None
            elif schedina.duello_scelta_id:
                duel_correct = (
                    actual_winner is not None
                    and schedina.duello_scelta_id == actual_winner
                )
            duel_pts = PUNTI_PRONOSTICO if duel_correct else 0
            if duel_correct:
                score += duel_pts
    breakdown.append(
        {
            "label": "Duello",
            "pick_player_id": None
            if schedina.duello_pareggio
            else schedina.duello_scelta_id,
            "pick_nickname": "Pareggio"
            if schedina.duello_pareggio
            else _pn(schedina.duello_scelta_id, players_nicknames),
            "correct": duel_correct,
            "bonus_points": 0,
            "points": duel_pts,
            "category": "duello",
        }
    )

    return score, breakdown


def _pn(player_id: int | None, nicknames: dict[int, str] | None):
    if player_id is None or nicknames is None:
        return None
    return nicknames.get(player_id)


def _find_next_tournament(db: Session, tournament: Tournament):
    return (
        db.query(Tournament)
        .filter(
            or_(
                Tournament.date > tournament.date,
                and_(Tournament.date == tournament.date, Tournament.id > tournament.id),
            )
        )
        .order_by(Tournament.date.asc(), Tournament.id.asc())
        .first()
    )


def redeem_tournament_power(db: Session, prize_id: int, user_id: int):
    prize = (
        db.query(PremioTorneo)
        .filter(PremioTorneo.id == prize_id, PremioTorneo.user_id == user_id)
        .first()
    )
    if not prize:
        return None
    if prize.redeemed_at is not None:
        return prize

    prize.redeemed_at = datetime.utcnow()
    db.flush()
    return prize


def settle_tournament_schedine(db: Session, tournament_id: int):
    tournament, actual, snapshot_rows, winner_row = _build_tournament_schedina_snapshot(
        db, tournament_id
    )
    existing_prize = (
        db.query(PremioTorneo)
        .filter(PremioTorneo.torneo_sorgente_id == tournament_id)
        .first()
    )

    if not tournament:
        raise ValueError("Tournament not found")

    if existing_prize:
        return {
            "tournament_id": tournament_id,
            "winner_user_id": existing_prize.user_id,
            "winner_schedina_id": None,
            "winner_points": 0,
            "winner_tiebreak_distance": None,
            "premio": existing_prize,
            "status": "already_settled",
        }

    if not snapshot_rows:
        return {
            "tournament_id": tournament_id,
            "winner_user_id": None,
            "winner_schedina_id": None,
            "winner_points": 0,
            "winner_tiebreak_distance": None,
            "premio": None,
            "status": "no_schedine",
        }

    if actual is None or winner_row is None:
        return {
            "tournament_id": tournament_id,
            "winner_user_id": None,
            "winner_schedina_id": None,
            "winner_points": 0,
            "winner_tiebreak_distance": None,
            "premio": None,
            "status": "no_results",
        }

    # actual["classifica_ordinata"] è già l'ordine risolto rispetto agli
    # eventuali duelli/spareggi (vedi _build_tournament_schedina_snapshot):
    # va usato anche qui, altrimenti il Guscio Blu rischia di andare a chi
    # risultava "ultimo"/"penultimo" prima della risoluzione di un duello
    # sulle posizioni di coda.
    if tournament.tournament_format == "classic":
        last_two_ids = _last_ids_from_final_order(actual["classifica_ordinata"])
    else:
        last_two_ids = _get_last_id(_get_leaderboard(db, tournament_id))

    for item in snapshot_rows:
        schedina = item["schedina"]
        schedina.total_points = item["total_points"]
        schedina.actual_winner_points = actual["winner_points"]
        schedina.tie_breaker_distance = item["tie_breaker_distance"]
        schedina.status = "settled"
        schedina.settled_at = datetime.utcnow()
    winner_schedina = winner_row["schedina"]

    winner_user = db.query(User).filter(User.id == winner_schedina.user_id).first()
    tournament.vincitore_schedina_id = winner_user.player_id if winner_user else None

    # Ex-aequo: tutte le schedine in perfetta parità con il vincitore (stesso
    # punteggio totale E stessa distanza di spareggio) ricevono la Carta Master.
    ex_aequo_rows = [
        item
        for item in snapshot_rows
        if item["total_points"] == winner_row["total_points"]
        and item["tie_breaker_distance"] == winner_row["tie_breaker_distance"]
    ]

    next_tournament = _find_next_tournament(db, tournament)
    premio = None
    for item in ex_aequo_rows:
        schedina_row = item["schedina"]
        row_premio = PremioTorneo(
            user_id=schedina_row.user_id,
            torneo_sorgente_id=tournament_id,
            torneo_id_prossimo=next_tournament.id if next_tournament else None,
            potere_ottenuto_true=True,
        )
        db.add(row_premio)
        if schedina_row.id == winner_schedina.id:
            premio = row_premio

        grant_card(
            db,
            schedina_row.user_id,
            "master",
            source_tournament_id=tournament_id,
            source_schedina_id=schedina_row.id,
        )
    db.flush()

    blue_shell_user_ids = []
    for player_id in last_two_ids:
        player = db.query(Player).filter(Player.id == player_id).first()
        if player and player.user_account:
            grant_card(
                db,
                player.user_account.id,
                "blue_shell",
                source_tournament_id=tournament_id,
            )
            blue_shell_user_ids.append(player.user_account.id)

    winner_user = db.query(User).filter(User.id == winner_schedina.user_id).first()
    winner_player = (
        db.query(Player)
        .filter(Player.id == (winner_user.player_id if winner_user else None))
        .first()
        if winner_user
        else None
    )

    # Notifica vincitore(i) schedina — anche gli ex-aequo ricevono la notifica
    try:
        from app.services.utenti.notifications import create_single_notification

        for item in ex_aequo_rows:
            create_single_notification(
                db,
                item["schedina"].user_id,
                "schedina_winner",
                f"Hai vinto la schedina del torneo '{tournament.name}'! Controlla il tuo premio.",
                source_tournament_id=tournament_id,
            )
            create_single_notification(
                db,
                item["schedina"].user_id,
                "card_granted",
                f"Schedina vinta nel torneo '{tournament.name}': hai ricevuto una Carta Master.",
                source_tournament_id=tournament_id,
            )
        for user_id in blue_shell_user_ids:
            create_single_notification(
                db,
                user_id,
                "card_granted",
                f"Torneo '{tournament.name}' concluso: hai ricevuto un Guscio Blu.",
                source_tournament_id=tournament_id,
            )
    except Exception:
        pass

    return {
        "tournament_id": tournament_id,
        "winner_user_id": winner_schedina.user_id,
        "winner_schedina_id": winner_schedina.id,
        "winner_points": winner_schedina.total_points,
        "winner_tiebreak_distance": winner_schedina.tie_breaker_distance,
        "premio": premio,
        "status": "ok",
        "vincitore_schedina_id": winner_schedina.user_id,
        "vincitore_username": winner_user.username if winner_user else None,
        "vincitore_nickname": winner_player.nickname if winner_player else None,
    }


def get_public_tournament_schedina_overview(
    db: Session, tournament_id: int, include_details: bool = True
):
    tournament, actual, snapshot_rows, winner_row = _build_tournament_schedina_snapshot(
        db, tournament_id, include_details=include_details
    )
    if not tournament:
        return None

    if actual is None:
        # Se ci sono schedine ma il torneo non è ancora concluso,
        # restituiscile comunque (con punti a 0) per permettere la
        # consultazione delle previsioni senza spoilerare i punteggi.
        if snapshot_rows:
            schedine_placeholder = []
            for item in snapshot_rows:
                s = item["schedina"]
                uid = s.user_id
                u = db.query(User).filter(User.id == uid).first()
                pid = u.player_id if u else None
                p_obj = (
                    db.query(Player).filter(Player.id == pid).first() if pid else None
                )
                schedine_placeholder.append(
                    {
                        "schedina_id": s.id,
                        "user_id": uid,
                        "username": u.username if u else f"user-{uid}",
                        "nickname": p_obj.nickname if p_obj else None,
                        "points": 0,
                        "tie_breaker_distance": None,
                        "classifica_ordinata": [],
                        "maggiore_streak_vittorie_id": None,
                        "maggiore_streak_nickname": None,
                        "duello_scelta_id": None,
                        "duello_scelta_nickname": None,
                        "duello_pareggio": False,
                        "spareggio_punti_vincitore": None,
                        "created_at": s.created_at,
                        "scoring_breakdown": [],
                    }
                )
            return {
                "tournament_id": tournament.id,
                "tournament_name": tournament.name,
                "tournament_date": tournament.date,
                "user_has_predicted": False,
                "winner_user_id": None,
                "winner_schedina_id": None,
                "winner_username": None,
                "winner_nickname": None,
                "winner_points": 0,
                "winner_tiebreak_distance": None,
                "premio": None,
                "schedine": schedine_placeholder,
            }
        return {
            "tournament_id": tournament.id,
            "tournament_name": tournament.name,
            "tournament_date": tournament.date,
            "user_has_predicted": False,
            "winner_user_id": None,
            "winner_schedina_id": None,
            "winner_username": None,
            "winner_nickname": None,
            "winner_points": 0,
            "winner_tiebreak_distance": None,
            "premio": None,
            "schedine": [],
        }

    all_player_ids = set()
    for item in snapshot_rows:
        s = item["schedina"]
        if s.maggiore_streak_vittorie_id:
            all_player_ids.add(s.maggiore_streak_vittorie_id)
        if s.duello_player_a_id:
            all_player_ids.add(s.duello_player_a_id)
        if s.duello_player_b_id:
            all_player_ids.add(s.duello_player_b_id)
        if s.duello_scelta_id:
            all_player_ids.add(s.duello_scelta_id)

    players = {}
    if all_player_ids:
        for p in db.query(Player).filter(Player.id.in_(all_player_ids)).all():
            players[p.id] = p.nickname

    if actual is None:
        return {
            "tournament_id": tournament.id,
            "tournament_name": tournament.name,
            "tournament_date": tournament.date,
            "winner_user_id": None,
            "winner_schedina_id": None,
            "winner_username": None,
            "winner_nickname": None,
            "winner_points": 0,
            "winner_tiebreak_distance": None,
            "premio": None,
            "schedine": [],
        }

    prize = (
        db.query(PremioTorneo)
        .filter(PremioTorneo.torneo_sorgente_id == tournament_id)
        .first()
    )

    user_cache = {}
    player_cache = {}
    schedine = []
    for item in snapshot_rows:
        s = item["schedina"]
        uid = s.user_id
        if uid not in user_cache:
            u = db.query(User).filter(User.id == uid).first()
            user_cache[uid] = u
        user = user_cache[uid]
        pid = user.player_id if user else None
        if pid and pid not in player_cache:
            p = db.query(Player).filter(Player.id == pid).first()
            player_cache[pid] = p
        p_obj = player_cache.get(pid) if pid else None

        breakdown = item.get("scoring_breakdown", [])
        for b in breakdown:
            pid = b.get("pick_player_id")
            if pid and pid in players:
                b["pick_nickname"] = players[pid]

        schedine.append(
            {
                "schedina_id": s.id,
                "user_id": uid,
                "username": user.username if user else f"user-{uid}",
                "nickname": p_obj.nickname if p_obj else None,
                "points": item["total_points"],
                "tie_breaker_distance": item["tie_breaker_distance"],
                "classifica_ordinata": s.classifica_ordinata or [],
                "maggiore_streak_vittorie_id": s.maggiore_streak_vittorie_id,
                "maggiore_streak_nickname": players.get(s.maggiore_streak_vittorie_id)
                if s.maggiore_streak_vittorie_id
                else None,
                "duello_scelta_id": s.duello_scelta_id,
                "duello_scelta_nickname": players.get(s.duello_scelta_id)
                if s.duello_scelta_id
                else None,
                "duello_pareggio": bool(s.duello_pareggio),
                "spareggio_punti_vincitore": s.spareggio_punti_vincitore,
                "created_at": s.created_at,
                "scoring_breakdown": breakdown,
            }
        )

    winner_schedina = winner_row["schedina"] if winner_row else None
    winner_user = (
        db.query(User)
        .filter(User.id == (winner_schedina.user_id if winner_schedina else None))
        .first()
        if winner_schedina
        else None
    )
    winner_player = (
        db.query(Player).filter(Player.id == winner_user.player_id).first()
        if winner_user and winner_user.player_id
        else None
    )

    return {
        "tournament_id": tournament.id,
        "tournament_name": tournament.name,
        "tournament_date": tournament.date,
        "winner_user_id": winner_schedina.user_id if winner_schedina else None,
        "winner_schedina_id": winner_schedina.id if winner_schedina else None,
        "winner_username": winner_user.username if winner_user else None,
        "winner_nickname": winner_player.nickname if winner_player else None,
        "winner_points": winner_row["total_points"] if winner_row else 0,
        "winner_tiebreak_distance": winner_row["tie_breaker_distance"]
        if winner_row
        else None,
        "premio": prize,
        "schedine": schedine,
    }


get_tournament_schedina_detail = get_public_tournament_schedina_overview
