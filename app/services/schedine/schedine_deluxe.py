"""
CRUD per le schedine dei tornei a gironi (formato group_stage, N gironi flessibili).

Regolamento (REGOLAMENTO.md):
  Ogni singola posizione/pronostico indovinato assegna esattamente 3 punti:
    1. Finalisti           — 3 pt per ogni finalista correttamente individuato
    2. Classifica Finale   — 3 pt per ogni posizione esatta del podio finale
                             (classifica separata e a sé stante rispetto ai gironi, riparte da 0)
    2b. Classifica Gironi  — 3 pt per ogni posizione esatta indovinata nella
                             classifica di ciascun girone della fase 1
    3. Il Duello           — 3 pt se il pronostico testa a testa è corretto
  Spareggio (tie-breaker): distanza esatta di punti tra 1° e 2° classificato del
  torneo — non assegna punti, si usa solo per risolvere la parità in classifica.
"""

from datetime import datetime
from app.core.timezone import now_rome

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.services.cards.inventory import grant_card
from app.services.schedine.schedine import (
    _find_next_tournament,
    _get_last_id,
    _get_leaderboard,
    _last_ids_from_final_order,
)
from app.models import (
    Player,
    PremioTorneo,
    Race,
    Result,
    SchedinaTorneoGroupStage,
    Tournament,
    User,
)
from app.controllers.schedine.schemas.schedine_deluxe import (
    SchedinaTorneoGroupStageCreate,
)

PUNTI_PRONOSTICO = 3


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _get_actual_finalisti(db: Session, tournament_id: int) -> list[int]:
    """
    Restituisce gli ID dei finalisti (group_name='top', phase='finals').

    Funzione di sola lettura (nessuna scrittura): prima le gare di finale già
    inserite, poi la composizione persistita in format_data['finals']['top']
    (generata esplicitamente dal Superadmin con l'avanzamento di fase).
    Se la finale non è ancora stata composta restituisce [].
    """
    finals_races = (
        db.query(Race)
        .filter(
            Race.tournament_id == tournament_id,
            Race.phase == "finals",
            Race.group_name == "top",
            Race.is_duello.is_(False),
        )
        .all()
    )
    if finals_races:
        race_ids = [r.id for r in finals_races]
        rows = (
            db.query(Result.player_id)
            .filter(Result.race_id.in_(race_ids))
            .distinct()
            .all()
        )
        return [r.player_id for r in rows]

    # Nessuna gara di finale: usa la composizione persistita, se già generata
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    persisted_top = (
        ((torneo.format_data or {}).get("finals") or {}).get("top") if torneo else None
    )
    return list(persisted_top) if persisted_top else []


def _get_actual_classifica_finale(db: Session, tournament_id: int) -> list[int]:
    """
    Classifica finale reale (podio della fase finale "top"), calcolata sommando
    i punti delle gare phase='finals'/group_name='top'. Riparte da 0: non
    cumula i punti dei gironi (fase 1).
    """
    finals_races = (
        db.query(Race)
        .filter(
            Race.tournament_id == tournament_id,
            Race.phase == "finals",
            Race.group_name == "top",
            Race.is_duello.is_(False),
        )
        .all()
    )
    if not finals_races:
        return []

    race_ids = [r.id for r in finals_races]
    rows = (
        db.query(Result.player_id, func.sum(Result.points).label("punti_totali"))
        .filter(Result.race_id.in_(race_ids))
        .group_by(Result.player_id)
        .order_by(func.sum(Result.points).desc(), Result.player_id.asc())
        .all()
    )
    return [r.player_id for r in rows]


def _get_actual_classifiche_gironi(
    db: Session, tournament_id: int
) -> dict[str, list[int]]:
    """
    Per ciascun girone della fase 1 (Race.phase='group'), la classifica completa
    secondo _classifica_girone (punti, vittorie, podi, id), come lista di
    player_id in ordine 1°→ultimo. Restituisce {} se le gare dei gironi non
    sono ancora state giocate.
    """
    from app.services.tornei.tournaments import _classifica_girone

    group_races = (
        db.query(Race)
        .filter(
            Race.tournament_id == tournament_id,
            Race.phase == "group",
            Race.is_duello.is_(False),
        )
        .all()
    )
    races_by_group: dict[str, list[int]] = {}
    for r in group_races:
        races_by_group.setdefault(r.group_name, []).append(r.id)

    classifiche: dict[str, list[int]] = {}
    for group_name, race_ids in races_by_group.items():
        classifica = _classifica_girone(db, race_ids)
        if classifica:
            classifiche[group_name] = [row["player_id"] for row in classifica]
    return classifiche


def _get_actual_winner_points(db: Session, tournament_id: int) -> int:
    """Punti totali del vincitore del torneo (winner_id) nella fase finale."""
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not torneo or not torneo.winner_id:
        return 0
    finals_races = (
        db.query(Race.id)
        .filter(
            Race.tournament_id == tournament_id,
            Race.phase == "finals",
            Race.group_name == "top",
            Race.is_duello.is_(False),
        )
        .all()
    )
    race_ids = [r.id for r in finals_races]
    if not race_ids:
        return 0
    row = (
        db.query(func.sum(Result.points))
        .filter(Result.race_id.in_(race_ids), Result.player_id == torneo.winner_id)
        .scalar()
    )
    return int(row or 0)


def _get_top_two_points_gap(db: Session, tournament_id: int) -> int:
    """Distanza reale tra i punti del 1° e del 2° classificato della fase finale."""
    finals_races = (
        db.query(Race.id)
        .filter(
            Race.tournament_id == tournament_id,
            Race.phase == "finals",
            Race.group_name == "top",
            Race.is_duello.is_(False),
        )
        .all()
    )
    race_ids = [r.id for r in finals_races]
    if not race_ids:
        return 0
    rows = (
        db.query(func.sum(Result.points).label("punti_totali"))
        .filter(Result.race_id.in_(race_ids))
        .group_by(Result.player_id)
        .order_by(func.sum(Result.points).desc())
        .limit(2)
        .all()
    )
    if len(rows) < 2:
        return 0
    return abs(int(rows[0].punti_totali or 0) - int(rows[1].punti_totali or 0))


DUELLO_PAREGGIO = "PAREGGIO"


def _resolve_duello_outcome(
    db: Session, tournament_id: int, player_a_id: int | None, player_b_id: int | None
):
    """
    Esito del Duello sui PUNTI TOTALI del torneo (tutte le fasi):
      - player_id del giocatore con più punti, oppure
      - DUELLO_PAREGGIO se A e B chiudono a pari punti, oppure
      - None se non determinabile.
    """
    if not player_a_id or not player_b_id:
        return None
    rows = (
        db.query(Result.player_id, func.sum(Result.points).label("pts"))
        .join(Race, Race.id == Result.race_id)
        .filter(
            Race.tournament_id == tournament_id,
            Race.is_duello.is_(False),
            Result.player_id.in_([player_a_id, player_b_id]),
        )
        .group_by(Result.player_id)
        .all()
    )
    pts = {r.player_id: int(r.pts or 0) for r in rows}
    a_pts = pts.get(player_a_id)
    b_pts = pts.get(player_b_id)
    if a_pts is None or b_pts is None:
        return None
    if a_pts == b_pts:
        return DUELLO_PAREGGIO
    return player_a_id if a_pts > b_pts else player_b_id


# ─── Scoring ──────────────────────────────────────────────────────────────────


def _score_schedina_groupstage(
    schedina: SchedinaTorneoGroupStage,
    actual_finalisti: list[int],
    actual_classifica_finale: list[int],
    actual_classifiche_gironi: dict[str, list[int]],
    actual_duello_outcome,
) -> tuple[int, dict]:
    """Calcola il punteggio (flat 3 pt per pronostico corretto) e il dettaglio."""
    score = 0
    breakdown = {}
    actual_finalisti_set = set(actual_finalisti)

    # 1. Finalisti — 3 pt per ogni finalista correttamente individuato
    pred_finalisti = set(schedina.finalisti_ids or [])
    corretti_finalisti = pred_finalisti & actual_finalisti_set
    pts_finalisti = len(corretti_finalisti) * PUNTI_PRONOSTICO
    score += pts_finalisti
    breakdown["finalisti"] = {
        "corretti": list(corretti_finalisti),
        "n_corretti": len(corretti_finalisti),
        "punti": pts_finalisti,
    }

    # 2. Classifica Finale — 3 pt per ogni posizione esatta del podio (riparte da 0)
    pred_classifica = schedina.classifica_finale_ordinata or []
    n = min(len(pred_classifica), len(actual_classifica_finale))
    posizioni_corrette = 0
    posizioni = []
    for idx, pid in enumerate(pred_classifica):
        correct = idx < n and pred_classifica[idx] == actual_classifica_finale[idx]
        if correct:
            posizioni_corrette += 1
        pts = PUNTI_PRONOSTICO if correct else 0
        posizioni.append(
            {
                "label": f"{idx + 1}°",
                "pick_player_id": pid,
                "correct": correct,
                "points": pts,
                "category": "position",
            }
        )
    pts_classifica = posizioni_corrette * PUNTI_PRONOSTICO
    score += pts_classifica
    breakdown["classifica_finale"] = {
        "posizioni_corrette": posizioni_corrette,
        "punti": pts_classifica,
        "posizioni": posizioni,
    }

    # 2b. Classifica Gironi — 3 pt per ogni posizione esatta in ciascun girone
    pred_gironi = schedina.classifiche_gironi or {}
    gironi_breakdown = {}
    pts_gironi_totali = 0
    for girone, pred_ordine in pred_gironi.items():
        actual_ordine = actual_classifiche_gironi.get(girone, [])
        n = min(len(pred_ordine), len(actual_ordine))
        posizioni = []
        posizioni_corrette = 0
        for idx, pid in enumerate(pred_ordine):
            correct = idx < n and pred_ordine[idx] == actual_ordine[idx]
            if correct:
                posizioni_corrette += 1
            posizioni.append(
                {
                    "label": f"{idx + 1}°",
                    "pick_player_id": pid,
                    "correct": correct,
                    "points": PUNTI_PRONOSTICO if correct else 0,
                    "category": "position",
                }
            )
        pts_girone = posizioni_corrette * PUNTI_PRONOSTICO
        pts_gironi_totali += pts_girone
        gironi_breakdown[girone] = {
            "posizioni_corrette": posizioni_corrette,
            "punti": pts_girone,
            "posizioni": posizioni,
        }
    score += pts_gironi_totali
    breakdown["classifiche_gironi"] = {
        "punti": pts_gironi_totali,
        "gironi": gironi_breakdown,
    }

    # 3. Il Duello — 3 pt se il pronostico (giocatore o Pareggio) è corretto.
    #    actual_duello_outcome: player_id | DUELLO_PAREGGIO | None
    if schedina.duello_pareggio:
        duello_corretto = actual_duello_outcome == DUELLO_PAREGGIO
    else:
        duello_corretto = (
            schedina.duello_scelta_id is not None
            and actual_duello_outcome not in (None, DUELLO_PAREGGIO)
            and schedina.duello_scelta_id == actual_duello_outcome
        )
    pts_duello = PUNTI_PRONOSTICO if duello_corretto else 0
    score += pts_duello
    breakdown["duello"] = {
        "corretto": duello_corretto,
        "punti": pts_duello,
        "pareggio": bool(schedina.duello_pareggio),
    }

    return score, breakdown


# ─── CRUD ─────────────────────────────────────────────────────────────────────


def create_schedina_deluxe(
    db: Session, user_id: int, payload: SchedinaTorneoGroupStageCreate
) -> SchedinaTorneoGroupStage:
    torneo = db.query(Tournament).filter(Tournament.id == payload.tournament_id).first()
    if not torneo:
        raise ValueError("Torneo non trovato")
    if torneo.tournament_format != "group_stage":
        raise ValueError("Questo torneo non è in formato group_stage")
    # Chiusura a evento: schedine aperte solo finché non sono bloccate
    # (1° gara inserita / "Chiudi Schedine" / torneo avviato).
    if torneo.schedine_locked or torneo.status != "da_svolgere":
        raise ValueError("Le schedine per questo torneo sono chiuse")

    existing = (
        db.query(SchedinaTorneoGroupStage)
        .filter(
            SchedinaTorneoGroupStage.user_id == user_id,
            SchedinaTorneoGroupStage.tournament_id == payload.tournament_id,
        )
        .first()
    )
    if existing:
        raise ValueError("Hai già compilato la schedina per questo torneo")

    groups = (torneo.format_data or {}).get("groups")
    if not groups:
        raise ValueError(
            "Il Superadmin non ha ancora assegnato i gironi — attendi il seeding."
        )

    tutti_partecipanti: set[int] = set()
    for ids in groups.values():
        tutti_partecipanti |= set(ids)

    # I finalisti previsti devono essere partecipanti del torneo, senza duplicati
    if len(set(payload.finalisti_ids)) != len(payload.finalisti_ids):
        raise ValueError("I finalisti pronosticati non possono ripetersi")
    for pid in payload.finalisti_ids:
        if pid not in tutti_partecipanti:
            raise ValueError(f"Il giocatore {pid} non partecipa a questo torneo")

    # La classifica finale deve essere un riordino dei finalisti pronosticati
    if set(payload.classifica_finale_ordinata) != set(payload.finalisti_ids) or len(
        payload.classifica_finale_ordinata
    ) != len(payload.finalisti_ids):
        raise ValueError(
            "La classifica finale pronosticata deve contenere esattamente i finalisti scelti, in un ordine"
        )

    # Il pronostico del Duello deve coincidere con uno dei due giocatori scelti dall'admin
    duello_ids = {torneo.duello_player_a_id, torneo.duello_player_b_id} - {None}
    if (
        payload.duello_scelta_id is not None
        and payload.duello_scelta_id not in duello_ids
    ):
        raise ValueError(
            "Il pronostico del Duello deve essere uno dei due giocatori indicati dall'admin"
        )

    # Classifica Gironi: un pronostico per ciascun girone della fase 1, con
    # l'ordine completo previsto dei giocatori di quel girone
    if set(payload.classifiche_gironi.keys()) != set(groups.keys()):
        raise ValueError(
            "Devi pronosticare la classifica di ciascun girone della fase 1"
        )
    for girone, ordine in payload.classifiche_gironi.items():
        if set(ordine) != set(groups.get(girone, [])) or len(ordine) != len(
            groups.get(girone, [])
        ):
            raise ValueError(
                f"La classifica pronosticata per il girone {girone} deve contenere esattamente i giocatori di quel girone, in un ordine"
            )

    schedina = SchedinaTorneoGroupStage(
        user_id=user_id,
        tournament_id=payload.tournament_id,
        finalisti_ids=payload.finalisti_ids,
        classifica_finale_ordinata=payload.classifica_finale_ordinata,
        classifiche_gironi=payload.classifiche_gironi,
        duello_player_a_id=torneo.duello_player_a_id,
        duello_player_b_id=torneo.duello_player_b_id,
        duello_scelta_id=payload.duello_scelta_id,
        duello_pareggio=payload.duello_pareggio,
        spareggio_distanza=payload.spareggio_distanza,
    )
    db.add(schedina)
    db.commit()
    db.refresh(schedina)
    return schedina


def get_schedine_deluxe(
    db: Session,
    user_id: int | None = None,
    tournament_id: int | None = None,
) -> list[SchedinaTorneoGroupStage]:
    q = db.query(SchedinaTorneoGroupStage)
    if user_id is not None:
        q = q.filter(SchedinaTorneoGroupStage.user_id == user_id)
    if tournament_id is not None:
        q = q.filter(SchedinaTorneoGroupStage.tournament_id == tournament_id)
    return q.order_by(SchedinaTorneoGroupStage.created_at.asc()).all()


def settle_deluxe_schedine(db: Session, tournament_id: int) -> dict:
    """
    Liquida tutte le schedine a gironi aperte per il torneo.
    Va chiamata quando tournament.status diventa 'concluso' e tournament.winner_id
    è impostato (il vincitore della fase finale).

    Restituisce la classifica schedine ordinata per punti, con tie-break sulla
    distanza dal valore reale dello Spareggio (1°-2° posto) e poi sull'orario di invio.
    """
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not torneo:
        raise ValueError("Torneo non trovato")
    if torneo.tournament_format != "group_stage":
        raise ValueError("Torneo non in formato group_stage")
    if torneo.winner_id is None:
        raise ValueError("Imposta prima il vincitore della fase finale (winner_id)")

    schedine = get_schedine_deluxe(db, tournament_id=tournament_id)
    if not schedine:
        return {"status": "no_schedine", "standings": []}

    existing_prize = (
        db.query(PremioTorneo)
        .filter(PremioTorneo.torneo_sorgente_id == tournament_id)
        .first()
    )
    if existing_prize:
        return {
            "status": "already_settled",
            "tournament_id": tournament_id,
            "standings": [],
        }

    actual_finalisti = _get_actual_finalisti(db, tournament_id)
    actual_classifica_finale = _get_actual_classifica_finale(db, tournament_id)
    actual_classifiche_gironi = _get_actual_classifiche_gironi(db, tournament_id)
    actual_gap = _get_top_two_points_gap(db, tournament_id)
    actual_duello_outcome = _resolve_duello_outcome(
        db, tournament_id, torneo.duello_player_a_id, torneo.duello_player_b_id
    )

    rows = []
    for s in schedine:
        score, breakdown = _score_schedina_groupstage(
            s,
            actual_finalisti=actual_finalisti,
            actual_classifica_finale=actual_classifica_finale,
            actual_classifiche_gironi=actual_classifiche_gironi,
            actual_duello_outcome=actual_duello_outcome,
        )
        tiebreak = abs((s.spareggio_distanza or 0) - actual_gap)

        s.total_points = score
        s.status = "settled"
        s.settled_at = now_rome()

        user = db.query(User).filter(User.id == s.user_id).first()
        player = (
            db.query(Player).filter(Player.id == user.player_id).first()
            if user and user.player_id
            else None
        )
        rows.append(
            {
                "schedina_id": s.id,
                "user_id": s.user_id,
                "username": user.username if user else f"user-{s.user_id}",
                "nickname": player.nickname if player else None,
                "total_points": score,
                "tiebreak_distance": tiebreak,
                "breakdown": breakdown,
            }
        )

    # Ordina: punti desc, distanza spareggio asc (vince chi è più vicino), invio asc
    rows.sort(
        key=lambda r: (-r["total_points"], r["tiebreak_distance"], r["schedina_id"])
    )

    schedina_by_id = {s.id: s for s in schedine}
    winner_row = rows[0]
    winner_schedina = schedina_by_id[winner_row["schedina_id"]]
    winner_user = db.query(User).filter(User.id == winner_schedina.user_id).first()
    torneo.vincitore_schedina_id = winner_user.player_id if winner_user else None

    # Ex-aequo: tutte le schedine in perfetta parità con il vincitore (stesso
    # punteggio totale E stessa distanza di spareggio) ricevono la Carta Master.
    ex_aequo_rows = [
        r
        for r in rows
        if r["total_points"] == winner_row["total_points"]
        and r["tiebreak_distance"] == winner_row["tiebreak_distance"]
    ]

    next_tournament = _find_next_tournament(db, torneo)
    for r in ex_aequo_rows:
        schedina_row = schedina_by_id[r["schedina_id"]]
        premio = PremioTorneo(
            user_id=schedina_row.user_id,
            torneo_sorgente_id=tournament_id,
            torneo_id_prossimo=next_tournament.id if next_tournament else None,
            potere_ottenuto_true=True,
        )
        db.add(premio)

        # Nota: niente source_schedina_id qui — la FK di UserInventory punta
        # alla tabella delle schedine classic (schedine_torneo), non a
        # schedine_torneo_deluxe.
        grant_card(
            db,
            schedina_row.user_id,
            "master",
            source_tournament_id=tournament_id,
        )
    db.flush()

    # _get_leaderboard somma i punti su TUTTO il torneo (gironi + finale +
    # finalina insieme) — stessa trappola del gotcha "tournament.standings"
    # (vedi CLAUDE.md): per i gironi non è la classifica reale, perché mischia
    # fasi con griglie/punteggi diversi e ignora gli esiti degli spareggi.
    # get_group_stage_overall_classifica (Finale 1-4 + Finalina 5-N, già
    # risolta rispetto ai duelli) è l'unica fonte corretta per "chi è ultimo".
    from app.services.tornei.tournaments import get_group_stage_overall_classifica

    overall_order = get_group_stage_overall_classifica(db, tournament_id)
    last_ids = (
        _last_ids_from_final_order(overall_order)
        if overall_order
        else _get_last_id(_get_leaderboard(db, tournament_id))
    )
    blue_shell_user_ids = []
    for player_id in last_ids:
        player = db.query(Player).filter(Player.id == player_id).first()
        if player and player.user_account:
            grant_card(
                db,
                player.user_account.id,
                "blue_shell",
                source_tournament_id=tournament_id,
            )
            blue_shell_user_ids.append(player.user_account.id)

    # Notifica vincitore(i) schedina — anche gli ex-aequo ricevono la notifica
    try:
        from app.services.utenti.notifications import create_single_notification

        for r in ex_aequo_rows:
            create_single_notification(
                db,
                schedina_by_id[r["schedina_id"]].user_id,
                "schedina_winner",
                f"Hai vinto la schedina del torneo '{torneo.name}'! Controlla il tuo premio.",
                source_tournament_id=tournament_id,
            )
            create_single_notification(
                db,
                schedina_by_id[r["schedina_id"]].user_id,
                "card_granted",
                f"Schedina vinta nel torneo '{torneo.name}': hai ricevuto una Carta Master.",
                source_tournament_id=tournament_id,
            )
        for user_id in blue_shell_user_ids:
            create_single_notification(
                db,
                user_id,
                "card_granted",
                f"Torneo '{torneo.name}' concluso: hai ricevuto un Guscio Blu.",
                source_tournament_id=tournament_id,
            )
    except Exception:
        pass

    db.commit()

    return {
        "status": "ok",
        "tournament_id": tournament_id,
        "actual_finalisti": actual_finalisti,
        "actual_classifica_finale": actual_classifica_finale,
        "actual_classifiche_gironi": actual_classifiche_gironi,
        "actual_winner_id": torneo.winner_id,
        "actual_top_two_gap": actual_gap,
        "actual_duello_outcome": actual_duello_outcome,
        "standings": rows,
    }


def get_tournament_schedina_deluxe_detail(
    db: Session, tournament_id: int
) -> dict | None:
    """
    Stato live (o liquidato) delle schedine a gironi di un torneo, con il
    dettaglio del punteggio per ciascun pronostico (analogo a
    get_tournament_schedina_detail per il formato classic).
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        return None

    schedine = get_schedine_deluxe(db, tournament_id=tournament_id)

    actual_finalisti = _get_actual_finalisti(db, tournament_id)
    actual_classifica_finale = _get_actual_classifica_finale(db, tournament_id)
    actual_classifiche_gironi = _get_actual_classifiche_gironi(db, tournament_id)
    actual_gap = _get_top_two_points_gap(db, tournament_id)
    actual_duello_outcome = _resolve_duello_outcome(
        db, tournament_id, tournament.duello_player_a_id, tournament.duello_player_b_id
    )

    all_player_ids: set[int] = set()
    all_player_ids.update(actual_finalisti)
    all_player_ids.update(actual_classifica_finale)
    for ordine in actual_classifiche_gironi.values():
        all_player_ids.update(ordine)
    for s in schedine:
        all_player_ids.update(s.finalisti_ids or [])
        all_player_ids.update(s.classifica_finale_ordinata or [])
        for ordine in (s.classifiche_gironi or {}).values():
            all_player_ids.update(ordine)
        if s.duello_scelta_id:
            all_player_ids.add(s.duello_scelta_id)
    if tournament.duello_player_a_id:
        all_player_ids.add(tournament.duello_player_a_id)
    if tournament.duello_player_b_id:
        all_player_ids.add(tournament.duello_player_b_id)
    if isinstance(actual_duello_outcome, int):
        all_player_ids.add(actual_duello_outcome)

    nicknames: dict[int, str] = {}
    if all_player_ids:
        for p in db.query(Player).filter(Player.id.in_(all_player_ids)).all():
            nicknames[p.id] = p.nickname

    prize = (
        db.query(PremioTorneo)
        .filter(PremioTorneo.torneo_sorgente_id == tournament_id)
        .first()
    )

    # A torneo non ancora concluso, i pronostici altrui NON vanno mostrati —
    # stessa regola del formato classic (get_public_tournament_schedina_overview):
    # senza questo controllo, "Esito Schedina" mostrava da subito a chiunque i
    # finalisti/classifica/vincitori-gironi pronosticati da TUTTI, anche prima
    # dell'inizio del torneo. Si mostra solo che una schedina è stata inviata
    # (utente, orario), non il suo contenuto.
    tournament_concluded = tournament.status == "concluso"

    rows = []
    for s in schedine:
        user = db.query(User).filter(User.id == s.user_id).first()
        player = (
            db.query(Player).filter(Player.id == user.player_id).first()
            if user and user.player_id
            else None
        )

        if not tournament_concluded:
            rows.append(
                {
                    "schedina_id": s.id,
                    "user_id": s.user_id,
                    "username": user.username if user else f"user-{s.user_id}",
                    "nickname": player.nickname if player else None,
                    "points": 0,
                    "tie_breaker_distance": None,
                    "finalisti_ids": [],
                    "finalisti_nicknames": [],
                    "classifica_finale_ordinata": [],
                    "classifica_finale_nicknames": [],
                    "classifiche_gironi": {},
                    "classifiche_gironi_nicknames": {},
                    "duello_scelta_id": None,
                    "duello_scelta_nickname": None,
                    "duello_pareggio": False,
                    "spareggio_distanza": None,
                    "created_at": s.created_at,
                    # Stessa forma del breakdown reale (vedi _score_schedina_groupstage)
                    # ma vuota: il frontend accede a chiavi annidate senza optional
                    # chaining (es. bd.finalisti.n_corretti), un dict vuoto causerebbe
                    # un errore invece di mostrare semplicemente "0".
                    "scoring_breakdown": {
                        "finalisti": {"corretti": [], "n_corretti": 0, "punti": 0, "corretti_nicknames": []},
                        "classifica_finale": {"posizioni_corrette": 0, "punti": 0, "posizioni": []},
                        "classifiche_gironi": {"punti": 0, "gironi": {}},
                        "duello": {"corretto": False, "punti": 0, "pareggio": False},
                    },
                }
            )
            continue

        score, breakdown = _score_schedina_groupstage(
            s,
            actual_finalisti=actual_finalisti,
            actual_classifica_finale=actual_classifica_finale,
            actual_classifiche_gironi=actual_classifiche_gironi,
            actual_duello_outcome=actual_duello_outcome,
        )
        breakdown["finalisti"]["corretti_nicknames"] = [
            nicknames.get(pid) for pid in breakdown["finalisti"]["corretti"]
        ]
        for pos in breakdown["classifica_finale"]["posizioni"]:
            pos["pick_nickname"] = nicknames.get(pos["pick_player_id"])
        for girone_bd in breakdown["classifiche_gironi"]["gironi"].values():
            for pos in girone_bd["posizioni"]:
                pos["pick_nickname"] = nicknames.get(pos["pick_player_id"])

        tiebreak = abs((s.spareggio_distanza or 0) - actual_gap)

        rows.append(
            {
                "schedina_id": s.id,
                "user_id": s.user_id,
                "username": user.username if user else f"user-{s.user_id}",
                "nickname": player.nickname if player else None,
                "points": score,
                "tie_breaker_distance": tiebreak,
                "finalisti_ids": s.finalisti_ids or [],
                "finalisti_nicknames": [
                    nicknames.get(pid) for pid in (s.finalisti_ids or [])
                ],
                "classifica_finale_ordinata": s.classifica_finale_ordinata or [],
                "classifica_finale_nicknames": [
                    nicknames.get(pid) for pid in (s.classifica_finale_ordinata or [])
                ],
                "classifiche_gironi": s.classifiche_gironi or {},
                "classifiche_gironi_nicknames": {
                    girone: [nicknames.get(pid) for pid in ordine]
                    for girone, ordine in (s.classifiche_gironi or {}).items()
                },
                "duello_scelta_id": s.duello_scelta_id,
                "duello_scelta_nickname": nicknames.get(s.duello_scelta_id)
                if s.duello_scelta_id
                else None,
                "duello_pareggio": bool(s.duello_pareggio),
                "spareggio_distanza": s.spareggio_distanza,
                "created_at": s.created_at,
                "scoring_breakdown": breakdown,
            }
        )

    if tournament_concluded:
        rows.sort(key=lambda r: (-r["points"], r["tie_breaker_distance"], r["schedina_id"]))
    else:
        rows.sort(key=lambda r: r["schedina_id"])

    winner_row = rows[0] if (rows and tournament_concluded) else None

    return {
        "tournament_id": tournament.id,
        "tournament_name": tournament.name,
        "tournament_date": tournament.date,
        "actual_finalisti": actual_finalisti,
        "actual_finalisti_nicknames": [nicknames.get(pid) for pid in actual_finalisti],
        "actual_classifica_finale": actual_classifica_finale,
        "actual_classifica_finale_nicknames": [
            nicknames.get(pid) for pid in actual_classifica_finale
        ],
        "actual_classifiche_gironi": actual_classifiche_gironi,
        "actual_classifiche_gironi_nicknames": {
            girone: [nicknames.get(pid) for pid in ordine]
            for girone, ordine in actual_classifiche_gironi.items()
        },
        "actual_top_two_gap": actual_gap,
        "actual_duello_outcome": actual_duello_outcome
        if isinstance(actual_duello_outcome, int)
        else None,
        "actual_duello_pareggio": actual_duello_outcome == DUELLO_PAREGGIO,
        "winner_user_id": winner_row["user_id"] if winner_row else None,
        "winner_schedina_id": winner_row["schedina_id"] if winner_row else None,
        "winner_username": winner_row["username"] if winner_row else None,
        "winner_nickname": winner_row["nickname"] if winner_row else None,
        "winner_points": winner_row["points"] if winner_row else 0,
        "winner_tiebreak_distance": winner_row["tie_breaker_distance"]
        if winner_row
        else None,
        "premio": prize,
        "schedine": rows,
    }
