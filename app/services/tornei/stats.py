from sqlalchemy import case, func
from sqlalchemy.orm import Session, aliased
from app.models import Circuit, Player, Race, Result, Tournament


def get_leaderboard(db: Session, tournament_id: int):

    lederboard = (
        db.query(
            Player.id, Player.nickname, func.sum(Result.points).label("total_point")
        )
        .join(Result, Result.player_id == Player.id)
        .join(Race, Race.id == Result.race_id)
        .filter(Race.tournament_id == tournament_id, Race.is_duello.is_(False))
        .group_by(Player.id, Player.nickname)
        .order_by(
            func.sum(Result.points).desc(),
            func.sum(case((Result.position == 1, 1), else_=0)).desc(),
            func.sum(case((Result.position <= 3, 1), else_=0)).desc(),
            Player.nickname.asc(),
        )
        .all()
    )
    return lederboard


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
        .filter(Race.is_duello.is_(False), Tournament.game_id == game_id)
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
        .filter(Race.is_duello.is_(False), Tournament.game_id == game_id, Result.position == 1)
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
        .filter(Race.circuit_id == circuit_id, Race.is_duello.is_(False))
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
