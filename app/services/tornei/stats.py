from sqlalchemy import case, func
from sqlalchemy.orm import Session, aliased
from app.models import Circuit, Game, Player, PlayerGameParticipation, Race, Result, Tournament


def get_leaderboard(db: Session, tournament_id: int):
    """Leaderboard pubblica per torneo, comprensiva delle eventuali rettifiche
    punti manuali del superadmin (vedi services/tornei/point_adjustments.py) —
    stessa somma applicata in _classic_classifica (tournaments.py), per
    coerenza tra questo endpoint (usato per il "leader" in tempo reale via
    SocketContext) e la classifica ufficiale mostrata in pagina."""
    from app.services.tornei.point_adjustments import get_point_adjustment_totals

    rows = (
        db.query(
            Player.id,
            Player.nickname,
            func.sum(Result.points).label("total_point"),
            func.sum(case((Result.position == 1, 1), else_=0)).label("wins"),
            func.sum(case((Result.position <= 3, 1), else_=0)).label("podiums"),
        )
        .join(Result, Result.player_id == Player.id)
        .join(Race, Race.id == Result.race_id)
        .filter(Race.tournament_id == tournament_id, Race.is_duello.is_(False))
        .group_by(Player.id, Player.nickname)
        .all()
    )

    leaderboard = {
        row.id: {
            "id": row.id,
            "nickname": row.nickname,
            "total_point": row.total_point,
            "wins": row.wins,
            "podiums": row.podiums,
        }
        for row in rows
    }

    adjustments = get_point_adjustment_totals(db, tournament_id)
    for player_id, delta in adjustments.items():
        entry = leaderboard.get(player_id)
        if entry:
            entry["total_point"] += delta
        else:
            player = db.query(Player).filter(Player.id == player_id).first()
            if player:
                leaderboard[player_id] = {
                    "id": player.id,
                    "nickname": player.nickname,
                    "total_point": delta,
                    "wins": 0,
                    "podiums": 0,
                }

    return sorted(
        leaderboard.values(),
        key=lambda r: (-r["total_point"], -r["wins"], -r["podiums"], r["nickname"]),
    )


def _head_to_head_base_query(db: Session, game_id: int, player_a_id: int, player_b_id: int):
    """Self-join su Result: ogni riga è una gara giocata da entrambi i
    giocatori, filtrata sul game_id del torneo. Le gare di duello/spareggio
    (is_duello=True) sono escluse, come in get_leaderboard."""
    ra = aliased(Result)
    rb = aliased(Result)
    return (
        db.query(ra, rb, Race)
        .join(ra, ra.race_id == Race.id)
        .join(rb, rb.race_id == Race.id)
        .join(Tournament, Tournament.id == Race.tournament_id)
        .filter(
            ra.player_id == player_a_id,
            rb.player_id == player_b_id,
            Race.is_duello.is_(False),
            Tournament.game_id == game_id,
            Tournament.is_friendly.is_(False),
        )
    )


def get_head_to_head_summary(db: Session, game_id: int, player_a_id: int, player_b_id: int):
    rows = _head_to_head_base_query(db, game_id, player_a_id, player_b_id).all()

    total = len(rows)
    wins_a = sum(1 for ra, rb, _ in rows if ra.position < rb.position)
    wins_b = sum(1 for ra, rb, _ in rows if rb.position < ra.position)
    # Un pareggio 1-gara tra due giocatori è strutturalmente impossibile:
    # Result ha UniqueConstraint("race_id", "position"), quindi due giocatori
    # non possono condividere la stessa posizione nella stessa gara. Il campo
    # resta esposto per future evoluzioni delle regole (es. ex-aequo).
    ties = total - wins_a - wins_b

    return {
        "total_races": total,
        "wins_a": wins_a,
        "wins_b": wins_b,
        "ties": ties,
        "win_pct_a": round(wins_a / total * 100, 1) if total else 0.0,
        "win_pct_b": round(wins_b / total * 100, 1) if total else 0.0,
    }


def get_head_to_head_by_circuit(db: Session, game_id: int, player_a_id: int, player_b_id: int):
    rows = _head_to_head_base_query(db, game_id, player_a_id, player_b_id).all()

    by_circuit: dict[int, dict] = {}
    for ra, rb, race in rows:
        entry = by_circuit.setdefault(
            race.circuit_id, {"total_races": 0, "wins_a": 0, "wins_b": 0, "ties": 0}
        )
        entry["total_races"] += 1
        if ra.position < rb.position:
            entry["wins_a"] += 1
        elif rb.position < ra.position:
            entry["wins_b"] += 1
        else:
            entry["ties"] += 1

    circuits = db.query(Circuit).filter(Circuit.game_id == game_id).order_by(Circuit.name.asc()).all()
    return [
        {
            "circuit_id": circuit.id,
            "circuit_name": circuit.name,
            **by_circuit.get(circuit.id, {"total_races": 0, "wins_a": 0, "wins_b": 0, "ties": 0}),
        }
        for circuit in circuits
    ]


def get_head_to_head_history(db: Session, game_id: int, player_a_id: int, player_b_id: int):
    rows = (
        _head_to_head_base_query(db, game_id, player_a_id, player_b_id)
        .add_columns(Tournament.name, Tournament.date, Circuit.name)
        .join(Circuit, Circuit.id == Race.circuit_id)
        .order_by(Tournament.date.desc(), Race.race_order.desc())
        .all()
    )

    history = []
    for ra, rb, race, tournament_name, tournament_date, circuit_name in rows:
        history.append(
            {
                "race_id": race.id,
                "tournament_id": race.tournament_id,
                "tournament_name": tournament_name,
                "tournament_date": tournament_date,
                "circuit_id": race.circuit_id,
                "circuit_name": circuit_name,
                "position_a": ra.position,
                "position_b": rb.position,
                "winner": "a" if ra.position < rb.position else "b" if rb.position < ra.position else None,
            }
        )
    return history


def get_circuit_stats_list(db: Session, game_id: int):
    """Statistiche aggregate per ogni circuito del gioco: gare totali,
    podi totali, media punti/gara e il giocatore con più vittorie."""
    circuits = db.query(Circuit).filter(Circuit.game_id == game_id).order_by(Circuit.name.asc()).all()

    # Query 1: gare totali, podi totali, punti totali (per la media) per circuito.
    race_stats_rows = (
        db.query(
            Race.circuit_id,
            func.count(func.distinct(Race.id)).label("total_races"),
            func.sum(case((Result.position <= 3, 1), else_=0)).label("total_podiums"),
            func.sum(Result.points).label("total_points"),
        )
        .join(Result, Result.race_id == Race.id)
        .join(Tournament, Tournament.id == Race.tournament_id)
        .filter(Race.is_duello.is_(False), Tournament.game_id == game_id, Tournament.is_friendly.is_(False))
        .group_by(Race.circuit_id)
        .all()
    )
    race_stats = {row.circuit_id: row for row in race_stats_rows}

    # Query 2: vittorie per giocatore+circuito, per determinare il top winner.
    win_rows = (
        db.query(
            Race.circuit_id,
            Player.id,
            Player.nickname,
            func.count(Result.id).label("wins"),
        )
        .join(Result, Result.race_id == Race.id)
        .join(Player, Player.id == Result.player_id)
        .join(Tournament, Tournament.id == Race.tournament_id)
        .filter(Race.is_duello.is_(False), Tournament.game_id == game_id, Tournament.is_friendly.is_(False), Result.position == 1)
        .group_by(Race.circuit_id, Player.id, Player.nickname)
        .all()
    )
    top_winner_by_circuit: dict[int, dict] = {}
    for row in win_rows:
        current = top_winner_by_circuit.get(row.circuit_id)
        if current is None or row.wins > current["wins"]:
            top_winner_by_circuit[row.circuit_id] = {
                "player_id": row.id,
                "player_nickname": row.nickname,
                "wins": row.wins,
            }

    results = []
    for circuit in circuits:
        stats = race_stats.get(circuit.id)
        total_races = stats.total_races if stats else 0
        total_podiums = int(stats.total_podiums) if stats and stats.total_podiums else 0
        total_points = int(stats.total_points) if stats and stats.total_points else 0
        results.append(
            {
                "circuit_id": circuit.id,
                "circuit_name": circuit.name,
                "total_races": total_races,
                "total_podiums": total_podiums,
                "avg_points_per_race": round(total_points / total_races, 1) if total_races else 0.0,
                "top_winner": top_winner_by_circuit.get(circuit.id),
            }
        )
    return results


def get_circuit_stats_detail(db: Session, circuit_id: int):
    """Ranking completo dei giocatori su un circuito: gare giocate, vittorie,
    podi, tasso podio, posizione media."""
    rows = (
        db.query(
            Player.id,
            Player.nickname,
            func.count(Result.id).label("races_played"),
            func.sum(case((Result.position == 1, 1), else_=0)).label("wins"),
            func.sum(case((Result.position <= 3, 1), else_=0)).label("podiums"),
            func.avg(Result.position).label("avg_position"),
        )
        .join(Result, Result.player_id == Player.id)
        .join(Race, Race.id == Result.race_id)
        .join(Tournament, Tournament.id == Race.tournament_id)
        .filter(Race.circuit_id == circuit_id, Race.is_duello.is_(False), Tournament.is_friendly.is_(False))
        .group_by(Player.id, Player.nickname)
        .order_by(
            func.sum(case((Result.position == 1, 1), else_=0)).desc(),
            func.sum(case((Result.position <= 3, 1), else_=0)).desc(),
            func.avg(Result.position).asc(),
            Player.nickname.asc(),
        )
        .all()
    )

    return [
        {
            "player_id": row.id,
            "player_nickname": row.nickname,
            "races_played": row.races_played,
            "wins": int(row.wins or 0),
            "podiums": int(row.podiums or 0),
            "podium_rate": round((row.podiums or 0) / row.races_played * 100, 1) if row.races_played else 0.0,
            "avg_position": round(float(row.avg_position), 2) if row.avg_position is not None else None,
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# BADGE GIOCATORE — livello per game_id, basato sui tornei conclusi
# ---------------------------------------------------------------------------

# Ordine dal più al meno esclusivo: usato sia per determinare il tier (primo
# predicato che risulta vero) sia lato frontend per scegliere il "badge
# migliore" fra più giochi.
BADGE_TIER_RANK = ["leggenda", "campione", "veterano", "outsider", "esordiente", "sfidante"]

# Soglia di vittorie totali che garantisce Leggenda a prescindere dalla
# percentuale (in OR con la regola "100% dei tornei giocati") — un solo
# numero qui, facile da tarare senza toccare la logica.
LEGGENDA_MIN_WINS = 3

_BADGE_LABELS = {
    "leggenda": "LEGGENDA",
    "campione": "CAMPIONE",
    "veterano": "VETERANO",
    "outsider": "OUTSIDER",
    "sfidante": "SFIDANTE",
    "esordiente": "ESORDIENTE",
}


def _badge_tier_from_stats(tournaments_played: int, wins: int, podiums: int) -> str:
    if tournaments_played == 0:
        return "sfidante"
    if wins == tournaments_played or wins >= LEGGENDA_MIN_WINS:
        return "leggenda"
    if wins > 0:
        return "campione"
    podium_rate = podiums / tournaments_played
    if podium_rate >= 0.5:
        return "veterano"
    if podiums > 0:
        return "outsider"
    return "esordiente"


# Servono almeno 6 tornei conclusi per esprimere un trend "in crescita":
# con meno dati un confronto ultimi-3-vs-precedenti-3 è rumore, non segnale.
_IMPROVEMENT_MIN_TOURNAMENTS = 6


def _tournament_placement_pct(order: list[int], player_id: int) -> float | None:
    """Piazzamento del giocatore in un torneo come percentuale 0-100 (stessa
    formula del placementIndex per-gara di docs/CLASSIFICA.md, applicata qui
    alla classifica finale del torneo intero), per confrontare tornei con un
    numero diverso di partecipanti sulla stessa scala."""
    n = len(order)
    if n <= 1 or player_id not in order:
        return None
    pos = order.index(player_id) + 1
    return (n - pos) / (n - 1) * 100


def _compute_improving_flag(db: Session, tournaments: list, player_id: int) -> bool:
    """True se il piazzamento medio del giocatore nelle sue ultime 3
    partecipazioni concluse (per questo gioco) è migliore che nelle 3
    precedenti — un modo per riconoscere chi sta migliorando anche se non
    vince mai, senza introdurre una classifica parallela (esplicitamente
    esclusa dal piano)."""
    from app.services.tornei.tournaments import (
        get_classic_final_classifica,
        get_group_stage_overall_classifica,
    )

    dated = sorted((t for t in tournaments if t.date is not None), key=lambda t: t.date)
    if len(dated) < _IMPROVEMENT_MIN_TOURNAMENTS:
        return False

    pct_by_tournament = []
    for t in dated:
        order = (
            get_group_stage_overall_classifica(db, t.id)
            if t.tournament_format == "group_stage"
            else get_classic_final_classifica(db, t.id)
        )
        pct = _tournament_placement_pct(order, player_id)
        if pct is not None:
            pct_by_tournament.append(pct)

    if len(pct_by_tournament) < _IMPROVEMENT_MIN_TOURNAMENTS:
        return False

    recent = pct_by_tournament[-3:]
    previous = pct_by_tournament[-6:-3]
    return (sum(recent) / 3) > (sum(previous) / 3)


def get_player_game_badge(db: Session, player_id: int, game_id: int) -> dict:
    """Calcola il badge di un giocatore per un dato gioco, sui soli tornei
    CONCLUSI (Tournament.winner_id.isnot(None)) a cui ha partecipato.

    Tournament.winner_id è già la fonte ufficiale per il 1° posto (valida
    identicamente per classic e group_stage). Per il 2°/3° posto non esiste
    un campo persistito: serve la classifica finale del torneo, calcolata
    SOLO per i tornei non vinti dal giocatore (il 1° posto si sa già)."""
    from app.services.tornei.tournaments import (
        get_classic_final_classifica,
        get_group_stage_overall_classifica,
    )

    # Partecipazione rilevata via Result/Race (non TournamentPlayer): alcuni
    # tornei più vecchi hanno gare/risultati reali ma nessuna riga
    # TournamentPlayer (gap di dati storico), e un giocatore che ha
    # effettivamente giocato — e persino vinto — un torneo del genere non
    # deve risultare "sfidante" (0 tornei giocati). Result/Race è anche la
    # fonte già usata da tutte le altre query di questo file (get_leaderboard,
    # head-to-head, ...).
    tournament_ids = {
        row[0]
        for row in db.query(Race.tournament_id)
        .join(Result, Result.race_id == Race.id)
        .join(Tournament, Tournament.id == Race.tournament_id)
        .filter(
            Result.player_id == player_id,
            Tournament.game_id == game_id,
            Tournament.winner_id.isnot(None),
            Tournament.is_friendly.is_(False),
            Race.is_duello.is_(False),
        )
        .distinct()
        .all()
    }
    tournaments = (
        db.query(Tournament).filter(Tournament.id.in_(tournament_ids)).all()
        if tournament_ids
        else []
    )

    tournaments_played = len(tournaments)
    wins = sum(1 for t in tournaments if t.winner_id == player_id)
    podiums = wins
    for t in tournaments:
        if t.winner_id == player_id:
            continue
        order = (
            get_group_stage_overall_classifica(db, t.id)
            if t.tournament_format == "group_stage"
            else get_classic_final_classifica(db, t.id)
        )
        if player_id in order[1:3]:
            podiums += 1

    tier = _badge_tier_from_stats(tournaments_played, wins, podiums)

    # Ricompense per la costanza/il miglioramento, indipendenti dal tier
    # tornei-vinti — vedi PlayerGameParticipation e _compute_improving_flag:
    # "premiare la via di mezzo" senza toccare la classifica ufficiale.
    participation = (
        db.query(PlayerGameParticipation)
        .filter(
            PlayerGameParticipation.player_id == player_id,
            PlayerGameParticipation.game_id == game_id,
        )
        .first()
    )
    streak = participation.played_streak if participation else 0
    improving = _compute_improving_flag(db, tournaments, player_id)
    consolation_wins = sum(1 for t in tournaments if t.consolation_winner_id == player_id)

    return {
        "tier": tier,
        "label": _BADGE_LABELS[tier],
        "tournaments_played": tournaments_played,
        "wins": wins,
        "podiums": podiums,
        "podium_rate": round(podiums / tournaments_played * 100, 1) if tournaments_played else 0.0,
        "streak": streak,
        "improving": improving,
        "consolation_wins": consolation_wins,
    }


def get_player_badges(db: Session, player_id: int) -> list[dict]:
    """Badge del giocatore per ogni gioco che ha almeno un torneo (di
    qualunque stato). Un gioco senza tornei non produce alcun badge: un
    tier come "sfidante" (0 tornei giocati) sarebbe rumore privo di
    significato per un gioco che nessuno ha mai potuto giocare."""
    game_ids_with_tournaments = {
        row[0] for row in db.query(Tournament.game_id).distinct().all()
    }
    games = (
        db.query(Game)
        .filter(Game.id.in_(game_ids_with_tournaments))
        .order_by(Game.name.asc())
        .all()
    )
    return [
        {
            "game_id": game.id,
            "game_name": game.name,
            **get_player_game_badge(db, player_id, game.id),
        }
        for game in games
    ]


def get_badges_for_players(db: Session, player_ids: list[int]) -> dict[int, list[dict]]:
    """Elenco completo dei badge (uno per gioco) per ciascun player_id — stessa
    forma di get_best_badges_for_players ma senza il collasso al migliore,
    per mostrare i badge di tutti i giochi anche in vista bulk (es. roster
    /players) invece del solo tier più alto."""
    return {player_id: get_player_badges(db, player_id) for player_id in player_ids}


def get_best_badges_for_players(db: Session, player_ids: list[int]) -> dict[int, dict]:
    """Badge di rango più alto per ciascun player_id, fra tutti i suoi giochi
    (stessa logica di pickBestBadge lato frontend, calcolata qui per evitare
    N+1 fetch di /players/{id}/badges dal roster di /players)."""
    result = {}
    for player_id in player_ids:
        badges = get_player_badges(db, player_id)
        if not badges:
            continue
        best = min(badges, key=lambda b: BADGE_TIER_RANK.index(b["tier"]))
        result[player_id] = best
    return result
