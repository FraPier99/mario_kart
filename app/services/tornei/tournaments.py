from app.controllers.tornei.schemas.tournaments import (
    CreateTournament,
    TournamentPlayoffRequest,
    UpdateTournament,
)
import logging
import random

from app.services.schedine.schedine import settle_tournament_schedine
from app.models import Tournament, TournamentPlayer, Player, User
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.data.punteggi import setUpTournament
from datetime import datetime, timedelta
from app.core.timezone import now_rome, rome_deadline_lock

logger = logging.getLogger(__name__)


def _get_superadmin_player_ids(db: Session) -> set[int]:
    """Player.id collegati ad account SuperAdmin: non possono partecipare ai
    tornei (non giocano, non compaiono in classifiche/schedine/card)."""
    rows = (
        db.query(User.player_id)
        .filter(User.role == "superadmin", User.player_id.isnot(None))
        .all()
    )
    return {row.player_id for row in rows}


def _reject_superadmin_participants(db: Session, participant_ids: list[int]) -> None:
    superadmin_ids = _get_superadmin_player_ids(db)
    if superadmin_ids.intersection(participant_ids):
        raise ValueError(
            "Un account SuperAdmin non può essere aggiunto come partecipante al torneo"
        )


def _compute_group_stage_n_races(n_players: int) -> int:
    """
    Stima indicativa del numero di gare per un torneo a gironi: una gara-slot
    per giocatore in Fase 1 (gironi) e una in Fase 2 (finali + consolazione).
    Le gare effettive vengono create manualmente dal Superadmin in base
    all'andamento del torneo, questo valore è solo informativo/di setup.
    """
    return n_players * 2


# Capienza massima di un girone, vincolata dallo schermo di gioco
# (max 4 giocatori per gara/TV alla volta).
MAX_GROUP_SIZE = 4
# Numero minimo di partecipanti per il formato a gironi (= 2 gironi pieni).
MIN_GROUP_STAGE_PLAYERS = 8


def compute_group_layout(n_players: int) -> list[int]:
    """
    Calcola la suddivisione in gironi in base al numero di partecipanti.

    Regola di composizione (flessibile e scalabile, vincolo schermo = 4 per girone):
      - minimo 8 partecipanti (2 gironi da 4)
      - il sistema spezza i giocatori nel minor numero di gironi bilanciati con
        dimensione massima 4 per girone e scarto massimo di un giocatore tra gironi.

    Esempi: 8 → [4, 4]; 10 → [4, 3, 3]; 11 → [4, 4, 3]; 12 → [4, 4, 4]; 16 → [4, 4, 4, 4].
    Restituisce la lista delle dimensioni dei gironi (scalabile a X gironi).
    """
    if n_players < MIN_GROUP_STAGE_PLAYERS:
        raise ValueError(
            f"Il formato a gironi richiede almeno {MIN_GROUP_STAGE_PLAYERS} giocatori"
        )

    n_groups = -(-n_players // MAX_GROUP_SIZE)  # ceil(n_players / 4)
    base, extra = divmod(n_players, n_groups)
    return [base + 1 if i < extra else base for i in range(n_groups)]


# Numero di posti nella finale (Final 4): vincolo schermo.
FINAL_SLOTS = 4


def compute_semifinal_layout(n_qualified: int) -> list[int]:
    """
    Suddivisione in batterie di semifinale (max 4 per batteria, vincolo schermo),
    usata solo quando i qualificati dai gironi sono più dei posti in finale.

    Esempi: 6 → [3, 3]; 8 → [4, 4]; 10 → [4, 3, 3].
    """
    n_heats = -(-n_qualified // MAX_GROUP_SIZE)  # ceil(n_qualified / 4)
    base, extra = divmod(n_qualified, n_heats)
    return [base + 1 if i < extra else base for i in range(n_heats)]


def _compute_deadline_lock(tournament_date):
    """Calcola deadline: 23:59 del giorno prima dell'evento in ora italiana."""
    return rome_deadline_lock(tournament_date)


def _normalize_tournament_status(tournament):
    if not tournament:
        return tournament

    if tournament.winner_id is not None:
        tournament.status = "concluso"
    elif tournament.status not in {"da_svolgere", "in_corso", "finito", "concluso"}:
        tournament.status = "da_svolgere"

    return tournament


def _touch_phase_change(
    db: Session,
    tournament: Tournament,
    actor_user_id: int | None,
    action: str,
    description: str,
) -> None:
    """Aggiorna i campi di audit 'ultimo avanzamento fase' e registra un AuditLog."""
    from app.services.utenti.audit_log import log_action

    tournament.last_phase_change_at = now_rome()
    tournament.last_phase_change_by_id = actor_user_id
    db.commit()
    log_action(
        db,
        action=action,
        description=description,
        actor_user_id=actor_user_id,
        target_type="tournament",
        target_id=tournament.id,
    )


def lock_tournament_schedine(db: Session, tournament_id: int):
    """
    Chiude le schedine di un torneo (compilazione bloccata).

    Chiamata da:
      - inserimento della prima gara (chiusura automatica anti-cheat),
      - pulsante manuale "Chiudi Schedine" del SuperAdmin,
      - avvio del torneo (activate_tournament_live).

    Le schedine GIÀ compilate restano "open" (in attesa del risultato) e verranno
    liquidate ("settled") alla conclusione: NON vanno marcate "scaduta", che
    significa "non compilata in tempo" e non si applica a una schedina esistente.
    Idempotente.
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        return None

    if not tournament.schedine_locked:
        tournament.schedine_locked = True
        db.commit()
        db.refresh(tournament)

    _load_participants(db, tournament)
    return _normalize_tournament_status(tournament)


def activate_tournament_live(
    db: Session, tournament_id: int, actor_user_id: int | None = None
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        return None

    # Avviare il torneo chiude le schedine e porta lo stato a "in_corso".
    tournament.status = "in_corso"
    tournament.schedine_locked = True
    db.commit()
    db.refresh(tournament)
    _touch_phase_change(
        db,
        tournament,
        actor_user_id,
        action="tournament_started",
        description=f"Il torneo '{tournament.name}' è stato avviato (In Corso).",
    )
    _load_participants(db, tournament)
    return _normalize_tournament_status(tournament)


def create_tournament(
    db: Session, tmentData: CreateTournament, created_by_id: int | None = None
):
    from datetime import date as date_type

    # Unicità nome (case-insensitive)
    name_lower = tmentData.name.strip().lower()
    existing = db.query(Tournament).filter(Tournament.name == name_lower).first()
    if existing:
        raise ValueError(f"Esiste già un torneo con il nome '{tmentData.name}'")

    # Data non nel passato
    if tmentData.date < date_type.today():
        raise ValueError("La data del torneo non può essere nel passato")

    _reject_superadmin_participants(db, tmentData.participant_ids)

    is_group_stage = tmentData.tournament_format == "group_stage"
    if is_group_stage:
        if tmentData.n_players < MIN_GROUP_STAGE_PLAYERS:
            raise ValueError(
                f"Il formato a gironi richiede almeno {MIN_GROUP_STAGE_PLAYERS} giocatori"
            )
        config = {
            "gare": _compute_group_stage_n_races(tmentData.n_players),
            "punteggi": [5, 3, 2, 1],
        }
    else:
        if tmentData.n_players < 2:
            raise ValueError(
                "Il formato a classifica unica richiede almeno 2 giocatori"
            )
        config = setUpTournament(tmentData.n_players)

    data = tmentData.model_dump(
        exclude={
            "participant_ids",
            "n_races",
            "n_races_group_stage",
            "n_races_semifinals",
            "n_races_final",
        }
    )
    data["n_races"] = (
        tmentData.n_races if tmentData.n_races is not None else config["gare"]
    )
    data.setdefault("status", "da_svolgere")
    if data.get("winner_id") is not None:
        data["status"] = "concluso"

    data["deadline_lock"] = _compute_deadline_lock(tmentData.date)
    data["created_at"] = now_rome()
    data["created_by_id"] = created_by_id

    new_tournament = Tournament(**data)

    db.add(new_tournament)
    db.commit()
    db.refresh(new_tournament)

    for pid in tmentData.participant_ids:
        link = TournamentPlayer(tournament_id=new_tournament.id, player_id=pid)
        db.add(link)

    db.commit()
    db.refresh(new_tournament)

    # auto-generate duello pair from participants
    if len(tmentData.participant_ids) >= 2:
        pair = random.sample(tmentData.participant_ids, 2)
        new_tournament.duello_player_a_id = pair[0]
        new_tournament.duello_player_b_id = pair[1]
        db.commit()
        db.refresh(new_tournament)

    _load_participants(db, new_tournament)

    # Generazione automatica e bilanciata dei gironi: nessun passaggio di
    # seeding manuale richiesto per i tornei a gironi.
    if (
        is_group_stage
        and len(new_tournament.participant_ids or []) >= MIN_GROUP_STAGE_PLAYERS
    ):
        seed_group_stage(db, new_tournament.id)
        _load_participants(db, new_tournament)
        # Salva il numero di gare per fase in format_data
        fd_updates = {}
        if tmentData.n_races_group_stage is not None:
            fd_updates["n_races_group_stage"] = tmentData.n_races_group_stage
        if tmentData.n_races_semifinals is not None:
            fd_updates["n_races_semifinals"] = tmentData.n_races_semifinals
        if tmentData.n_races_final is not None:
            fd_updates["n_races_final"] = tmentData.n_races_final
        if fd_updates:
            new_tournament.format_data = {
                **(new_tournament.format_data or {}),
                **fd_updates,
            }
            db.commit()
            db.refresh(new_tournament)

    # Notifiche: nuovo torneo + schedina da compilare (classico)
    try:
        from app.services.utenti.notifications import create_tournament_notifications

        game_name = new_tournament.game.name if new_tournament.game else "torneo"
        create_tournament_notifications(
            db,
            new_tournament.id,
            "new_tournament",
            f"Nuovo torneo: '{new_tournament.name}' ({game_name})",
        )
        if new_tournament.tournament_format == "classic":
            create_tournament_notifications(
                db,
                new_tournament.id,
                "schedina_pending",
                f"Compila la schedina per '{new_tournament.name}'",
            )
        db.commit()
    except Exception:
        pass

    return _normalize_tournament_status(new_tournament)


def getAllTournaments(db: Session):

    tournaments = db.query(Tournament).all()
    for t in tournaments:
        _load_participants(db, t)
        _normalize_tournament_status(t)
    return tournaments


def get_tournament(db: Session, tournament_id: int):

    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()

    if not t:
        return None

    _load_participants(db, t)
    return _normalize_tournament_status(t)


def _load_participants(db: Session, tournament):
    from app.models import TournamentPlayer, Result, Race

    links = (
        db.query(TournamentPlayer)
        .filter(TournamentPlayer.tournament_id == tournament.id)
        .all()
    )

    if links:
        tournament.participant_ids = [link.player_id for link in links]
        tournament.withdrawn_player_ids = [
            link.player_id for link in links if link.withdrawn
        ]
        return

    tournament.withdrawn_player_ids = []

    # fallback for old tournaments: infer participants from results
    race_ids = [
        r.id
        for r in db.query(Race.id).filter(Race.tournament_id == tournament.id).all()
    ]
    if not race_ids:
        tournament.participant_ids = []
        return

    result_players = (
        db.query(Result.player_id).filter(Result.race_id.in_(race_ids)).distinct().all()
    )
    tournament.participant_ids = [pid for (pid,) in result_players]


def set_player_withdrawal(
    db: Session, tournament_id: int, player_id: int, withdrawn: bool
):
    """
    Segna/rimuove lo stato 'Giocatore Ritirato' per un partecipante del torneo.

    Il ritiro NON elimina né altera i risultati già registrati (continuano a
    contare in classifica): serve solo a escludere il giocatore dal pool
    selezionabile per le gare ancora da disputare.
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        return None

    if tournament.status not in ("da_svolgere", "in_corso"):
        raise ValueError("Il ritiro è gestibile solo per tornei non ancora conclusi")

    link = (
        db.query(TournamentPlayer)
        .filter(
            TournamentPlayer.tournament_id == tournament_id,
            TournamentPlayer.player_id == player_id,
        )
        .first()
    )
    if not link:
        raise ValueError("Il giocatore non è un partecipante di questo torneo")

    link.withdrawn = withdrawn
    link.withdrawn_at = now_rome() if withdrawn else None

    db.commit()
    db.refresh(tournament)
    _load_participants(db, tournament)
    return _normalize_tournament_status(tournament)


def update_tournament(db: Session, tmentData: UpdateTournament, tournament_id: int):

    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()

    if not t:
        return None

    previous_status = t.status
    previous_winner_id = t.winner_id

    tUpdate = tmentData.model_dump(exclude_unset=True)
    participant_ids = tUpdate.pop("participant_ids", None)
    format_data_update = tUpdate.pop("format_data", None)
    if format_data_update is not None:
        current_fd = dict(t.format_data or {})
        current_fd.update(format_data_update)
        t.format_data = current_fd

    for key, value in tUpdate.items():
        setattr(t, key, value)

    if "deadline_lock" not in tUpdate and "date" in tUpdate:
        t.deadline_lock = _compute_deadline_lock(t.date)

    if t.winner_id is not None:
        t.status = "concluso"
    elif t.status == "concluso":
        t.status = "finito"

    # Avanzando a "in_corso" le schedine si chiudono definitivamente (non più
    # modificabili né compilabili) e diventa possibile inserire gare/risultati.
    if previous_status != "in_corso" and t.status == "in_corso":
        t.schedine_locked = True

    if t.status == "in_corso" and participant_ids is not None:
        raise ValueError("Impossibile modificare i partecipanti di un torneo in corso")

    if participant_ids is not None:
        _reject_superadmin_participants(db, participant_ids)
        db.query(TournamentPlayer).filter(
            TournamentPlayer.tournament_id == tournament_id
        ).delete()
        for pid in participant_ids:
            link = TournamentPlayer(tournament_id=tournament_id, player_id=pid)
            db.add(link)

    should_settle_schedine = (
        previous_status != "concluso" and t.status == "concluso"
    ) or (previous_winner_id is None and t.winner_id is not None)

    if should_settle_schedine:
        if t.tournament_format == "group_stage":
            from app.services.schedine.schedine_deluxe import settle_deluxe_schedine

            try:
                settle_deluxe_schedine(db, tournament_id)
            except ValueError:
                logger.exception(
                    "settle_deluxe_schedine fallita per torneo %s (update_tournament): "
                    "vincitore_schedina_id resta non impostato, nessuna Card Master assegnata.",
                    tournament_id,
                )
        else:
            settle_tournament_schedine(db, tournament_id)

    db.commit()
    db.refresh(t)
    _load_participants(db, t)

    # Generazione automatica e bilanciata dei gironi se i partecipanti sono
    # stati completati dopo la creazione del torneo (nessun seeding manuale).
    if (
        t.tournament_format == "group_stage"
        and t.status == "da_svolgere"
        and not (t.format_data or {}).get("groups")
        and len(t.participant_ids or []) >= MIN_GROUP_STAGE_PLAYERS
    ):
        seed_group_stage(db, t.id)
        _load_participants(db, t)

    if should_settle_schedine:
        try:
            from app.services.utenti.notifications import (
                create_tournament_notifications,
            )

            winner = (
                db.query(Player).filter(Player.id == t.winner_id).first()
                if t.winner_id
                else None
            )
            winner_name = winner.nickname if winner else "—"
            create_tournament_notifications(
                db,
                tournament_id,
                "tournament_ended",
                f"Torneo '{t.name}' concluso! Vincitore: {winner_name}",
            )
            _touch_phase_change(
                db,
                t,
                None,
                action="tournament_concluded",
                description=f"Il torneo '{t.name}' è concluso. Vincitore: {winner_name}.",
            )
            db.commit()

            # Socket.IO real-time broadcast
            try:
                from app.realtime.manager import broadcast_tournament_winner_sync

                winner_img = winner.img_url if winner else None
                broadcast_tournament_winner_sync(
                    db,
                    tournament_id,
                    {
                        "tournament_id": tournament_id,
                        "tournament_name": t.name,
                        "winner_id": t.winner_id,
                        "winner_nickname": winner_name,
                        "winner_img_url": winner_img,
                    },
                )
            except Exception:
                pass
        except Exception:
            pass

    return _normalize_tournament_status(t)


def set_tournament_playoff_winner(
    db: Session, tournament_id: int, playoffData: TournamentPlayoffRequest
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()

    if not tournament:
        return None, "tournament_not_found"

    if tournament.winner_id is not None:
        return None, "winner_already_set"

    _load_participants(db, tournament)

    standings = []
    from app.models import Race, Result

    race_ids = [
        race.id
        for race in db.query(Race.id).filter(Race.tournament_id == tournament.id).all()
    ]
    if race_ids:
        standings = (
            db.query(Result.player_id)
            .filter(
                Result.race_id.in_(race_ids),
                Result.player_id.in_(
                    [playoffData.player_one_id, playoffData.player_two_id]
                ),
            )
            .distinct()
            .all()
        )

    valid_players = {playoffData.player_one_id, playoffData.player_two_id}
    if playoffData.winner_id not in valid_players:
        return None, "invalid_winner"

    if valid_players and tournament.participant_ids:
        missing = valid_players.difference(set(tournament.participant_ids))
        if missing:
            return None, "invalid_participants"

    # persist playoff history
    from app.models import PlayoffHistory

    history = PlayoffHistory(
        tournament_id=tournament.id,
        player_one_id=playoffData.player_one_id,
        player_two_id=playoffData.player_two_id,
        winner_id=playoffData.winner_id,
        created_at=now_rome().date(),
    )
    db.add(history)

    tournament.winner_id = playoffData.winner_id
    tournament.status = "concluso"
    if tournament.tournament_format == "group_stage":
        from app.services.schedine.schedine_deluxe import settle_deluxe_schedine

        try:
            settle_deluxe_schedine(db, tournament_id)
        except ValueError:
            logger.exception(
                "settle_deluxe_schedine fallita per torneo %s (playoff): "
                "vincitore_schedina_id resta non impostato, nessuna Card Master assegnata.",
                tournament_id,
            )
    else:
        settle_tournament_schedine(db, tournament_id)
    db.commit()
    db.refresh(tournament)
    _load_participants(db, tournament)

    try:
        from app.services.utenti.notifications import create_tournament_notifications

        winner = db.query(Player).filter(Player.id == playoffData.winner_id).first()
        winner_name = winner.nickname if winner else "—"
        create_tournament_notifications(
            db,
            tournament_id,
            "tournament_ended",
            f"Torneo '{tournament.name}' concluso! Vincitore: {winner_name}",
        )
        _touch_phase_change(
            db,
            tournament,
            None,
            action="tournament_concluded",
            description=f"Il torneo '{tournament.name}' è concluso. Vincitore: {winner_name}.",
        )
        db.commit()

        try:
            from app.realtime.manager import broadcast_tournament_winner_sync

            winner_img = winner.img_url if winner else None
            broadcast_tournament_winner_sync(
                db,
                tournament_id,
                {
                    "tournament_id": tournament_id,
                    "tournament_name": tournament.name,
                    "winner_id": tournament.winner_id,
                    "winner_nickname": winner_name,
                    "winner_img_url": winner_img,
                },
            )
        except Exception:
            pass
    except Exception:
        pass

    return _normalize_tournament_status(tournament), "ok"


def undo_last_playoff(db: Session, tournament_id: int):
    from app.models import PlayoffHistory

    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        return None, "tournament_not_found"

    # get history ordered by created_at desc, then id desc
    last = (
        db.query(PlayoffHistory)
        .filter(PlayoffHistory.tournament_id == tournament_id)
        .order_by(PlayoffHistory.created_at.desc(), PlayoffHistory.id.desc())
        .first()
    )

    if not last:
        return None, "no_history"

    # delete last entry
    db.delete(last)
    db.commit()

    # set tournament.winner_id to previous history winner if exists
    prev = (
        db.query(PlayoffHistory)
        .filter(PlayoffHistory.tournament_id == tournament_id)
        .order_by(PlayoffHistory.created_at.desc(), PlayoffHistory.id.desc())
        .first()
    )

    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if prev:
        tournament.winner_id = prev.winner_id
        tournament.status = "concluso" if prev.winner_id is not None else "da_svolgere"
    else:
        tournament.winner_id = None
        tournament.status = "da_svolgere"

    if tournament.status == "concluso":
        settle_tournament_schedine(db, tournament_id)

    db.commit()
    db.refresh(tournament)
    _load_participants(db, tournament)
    return _normalize_tournament_status(tournament), "ok"


def tournament_delete(db: Session, tournament_id: int):

    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()

    if not t:
        return None

    from app.models import (
        Notification,
        PlayoffHistory,
        Prediction,
        Race,
        Result,
        SchedinaTorneo,
        SchedinaTorneoGroupStage,
        PremioTorneo,
        TournamentPhoto,
        UserInventory,
        TournamentPlayer,
    )

    # 1. PlayoffHistory
    db.query(PlayoffHistory).filter(
        PlayoffHistory.tournament_id == tournament_id
    ).delete()

    # 2. Prediction
    db.query(Prediction).filter(Prediction.tournament_id == tournament_id).delete()

    # 3. Nullify UserInventory.source_schedina_id (before deleting SchedinaTorneo)
    schedina_ids = [
        r.id
        for r in db.query(SchedinaTorneo.id)
        .filter(SchedinaTorneo.tournament_id == tournament_id)
        .all()
    ]
    if schedina_ids:
        db.query(UserInventory).filter(
            UserInventory.source_schedina_id.in_(schedina_ids)
        ).update({UserInventory.source_schedina_id: None}, synchronize_session=False)

    # 4. SchedinaTorneo (formato classic) e SchedinaTorneoGroupStage (formato a gironi)
    db.query(SchedinaTorneo).filter(
        SchedinaTorneo.tournament_id == tournament_id
    ).delete()
    db.query(SchedinaTorneoGroupStage).filter(
        SchedinaTorneoGroupStage.tournament_id == tournament_id
    ).delete()

    # 4b. Nullify Notification.source_tournament_id (preserva lo storico notifiche)
    db.query(Notification).filter(
        Notification.source_tournament_id == tournament_id
    ).update({Notification.source_tournament_id: None}, synchronize_session=False)

    # 4c. Nullify TournamentPhoto.tournament_id (preserva le foto in galleria)
    db.query(TournamentPhoto).filter(
        TournamentPhoto.tournament_id == tournament_id
    ).update({TournamentPhoto.tournament_id: None}, synchronize_session=False)

    # 5. Nullify UserInventory.consumed_in_race_id (before deleting Race/Result)
    race_ids = [
        r.id
        for r in db.query(Race.id).filter(Race.tournament_id == tournament_id).all()
    ]
    if race_ids:
        db.query(UserInventory).filter(
            UserInventory.consumed_in_race_id.in_(race_ids)
        ).update({UserInventory.consumed_in_race_id: None}, synchronize_session=False)

    # 6. Result (before Race — bulk delete doesn't cascade)
    if race_ids:
        db.query(Result).filter(Result.race_id.in_(race_ids)).delete(
            synchronize_session=False
        )

    # 7. Race
    db.query(Race).filter(Race.tournament_id == tournament_id).delete()

    # 8. Nullify PremioTorneo.torneo_id_prossimo (nullable FK)
    db.query(PremioTorneo).filter(
        PremioTorneo.torneo_id_prossimo == tournament_id
    ).update({PremioTorneo.torneo_id_prossimo: None})

    # 9. Delete PremioTorneo where torneo_sorgente_id matches (explicit bulk delete)
    db.query(PremioTorneo).filter(
        PremioTorneo.torneo_sorgente_id == tournament_id
    ).delete()

    # 10. Delete unconsumed UserInventory cards, nullify consumed ones (history)
    db.query(UserInventory).filter(
        UserInventory.source_tournament_id == tournament_id,
        UserInventory.is_consumed == False,
    ).delete()
    db.query(UserInventory).filter(
        UserInventory.source_tournament_id == tournament_id,
        UserInventory.is_consumed == True,
    ).update({UserInventory.source_tournament_id: None})

    # 11. TournamentPlayer (before deleting Tournament)
    db.query(TournamentPlayer).filter(
        TournamentPlayer.tournament_id == tournament_id
    ).delete()

    # 12. Tournament
    db.delete(t)
    db.commit()

    return t


# ---------------------------------------------------------------------------
# GROUP STAGE — generazione automatica della Fase 2
# ---------------------------------------------------------------------------


def _classifica_girone(db: Session, race_ids: list[int]) -> list[dict]:
    """
    Calcola la classifica di un girone sommando i punti per giocatore.
    Criteri di ordinamento: 1) punti totali, 2) vittorie di gara, 3) podi,
    4) id giocatore (spareggio deterministico residuo, usato solo se il
    pareggio persiste anche dopo punti/vittorie/podi — vedi _tied_group).
    """
    from app.models import Result

    righe = (
        db.query(
            Result.player_id,
            func.sum(Result.points).label("punti_totali"),
            func.sum(case((Result.position == 1, 1), else_=0)).label("vittorie"),
            func.sum(case((Result.position <= 3, 1), else_=0)).label("podi"),
        )
        .filter(Result.race_id.in_(race_ids))
        .group_by(Result.player_id)
        .order_by(
            func.sum(Result.points).desc(),
            func.sum(case((Result.position == 1, 1), else_=0)).desc(),
            func.sum(case((Result.position <= 3, 1), else_=0)).desc(),
            Result.player_id.asc(),  # spareggio deterministico residuo
        )
        .all()
    )
    return [
        {
            "player_id": r.player_id,
            "punti_totali": int(r.punti_totali or 0),
            "vittorie": int(r.vittorie or 0),
            "podi": int(r.podi or 0),
        }
        for r in righe
    ]


def _tied_group(classifica: list[dict], cutoff: int) -> list[int] | None:
    """
    Verifica se l'ultimo qualificato e il primo escluso (posizioni cutoff-1 e
    cutoff, 0-indexed) sono in pareggio su (punti, vittorie, podi). In tal caso
    restituisce gli id di TUTTI i giocatori a quel pareggio: serve uno Spareggio
    (primo a 2 vittorie, su piste random) per decidere chi avanza.

    Se TUTTI i pareggiati sono in posizione di qualificazione (< cutoff) oppure
    TUTTI sono in posizione di esclusione (>= cutoff), non c'è un vero pareggio
    al confine: si restituisce None.
    """
    if cutoff <= 0 or cutoff >= len(classifica):
        return None
    boundary = classifica[cutoff - 1]
    key = (boundary["punti_totali"], boundary["vittorie"], boundary["podi"])
    tied = [
        row["player_id"]
        for row in classifica
        if (row["punti_totali"], row["vittorie"], row["podi"]) == key
    ]
    if len(tied) <= 1:
        return None
    tied_positions = [i for i, row in enumerate(classifica) if row["player_id"] in tied]
    all_qualify = all(pos < cutoff for pos in tied_positions)
    all_non_qualify = all(pos >= cutoff for pos in tied_positions)
    if all_qualify or all_non_qualify:
        return None
    return tied


def _resolve_tie_with_spareggio(
    db: Session,
    tournament_id: int,
    phase: str | None,
    group_name: str,
    tied_ids: list[int],
) -> list[int] | None:
    """
    Risolve un pareggio al posto di qualificazione (gironi/semifinali) tramite
    uno Spareggio is_duello=True con lo stesso (phase, group_name): primo a 2
    vittorie vince e si qualifica, valido per qualsiasi numero di pareggiati
    (2, 3 o 4). Le gare di spareggio non assegnano punti alla classifica
    ufficiale del girone (sono escluse ovunque tramite is_duello=False).

    Restituisce None se lo spareggio non è stato ancora creato/giocato (o non
    ha ancora un vincitore con 2 vittorie).
    """
    return _first_to_n_order(db, tournament_id, phase, group_name, tied_ids, n=2)


QUALIFY_PER_GROUP = 2  # primi 2 di ogni girone avanzano (semifinale o finale)


def _semifinal_keys_from_format_data(format_data: dict | None) -> list[str]:
    semis = (format_data or {}).get("semifinals") or {}
    return sorted(semis.keys(), key=lambda k: int(k[1:]) if k[1:].isdigit() else 0)


def _advance_top_n(heats_standings: dict[str, list[dict]], n: int) -> list[int]:
    """
    Da un insieme di batterie (semifinali) seleziona i primi `n` qualificati:
    prima i vincitori di ogni batteria (per punti), poi i secondi migliori, ecc.
    Mantiene il vincolo "finale ≤ n" indipendentemente dal numero di batterie.
    """
    advanced: list[int] = []
    rank = 0
    while len(advanced) < n:
        livello = []
        for standings in heats_standings.values():
            if rank < len(standings):
                livello.append(standings[rank])
        if not livello:
            break
        livello.sort(key=lambda r: (-r["punti_totali"], -r["vittorie"], r["player_id"]))
        for row in livello:
            if len(advanced) < n:
                advanced.append(row["player_id"])
        rank += 1
    return advanced


def _group_standings(
    db: Session,
    tournament_id: int,
    phase: str,
    keys: list[str],
    cutoff: int = QUALIFY_PER_GROUP,
) -> tuple[dict[str, list[dict]], dict[str, list[int]]]:
    """
    Classifica per ciascun gruppo/batteria di una fase, dalle gare ufficiali
    (is_duello=False — gli spareggi non assegnano punti né incidono sulle
    statistiche). Se al cutoff di qualificazione c'è un pareggio, verifica se
    esiste già uno Spareggio (is_duello=True, stesso phase/group_name) giocato
    da tutti i pareggiati: in tal caso riordina la classifica secondo il suo
    esito. Restituisce (classifiche, ties_non_risolti) — ties_non_risolti
    contiene solo i gruppi per cui serve ancora generare/giocare lo spareggio.
    """
    from app.models import Race

    gare = (
        db.query(Race)
        .filter(
            Race.tournament_id == tournament_id,
            Race.phase == phase,
            Race.is_duello.is_(False),
        )
        .all()
    )
    if not gare:
        raise ValueError(
            f"Nessuna gara trovata per la fase '{phase}' — inserisci prima i risultati."
        )

    classifiche: dict[str, list[dict]] = {}
    ties: dict[str, list[int]] = {}
    for key in keys:
        race_ids = [r.id for r in gare if r.group_name == key]
        if not race_ids:
            raise ValueError(f"Manca almeno una gara per '{key}'")
        classifica = _classifica_girone(db, race_ids)
        if len(classifica) < 2:
            raise ValueError(
                f"Servono almeno 2 classificati in '{key}' per avanzare di fase"
            )

        tied = _tied_group(classifica, cutoff)
        if tied:
            order = _resolve_tie_with_spareggio(db, tournament_id, phase, key, tied)
            if order:
                by_id = {row["player_id"]: row for row in classifica}
                tied_set = set(tied)
                start = next(
                    i
                    for i, row in enumerate(classifica)
                    if row["player_id"] in tied_set
                )
                reordered = [by_id[pid] for pid in order]
                classifica = (
                    classifica[:start] + reordered + classifica[start + len(order) :]
                )
            else:
                ties[key] = tied

        classifiche[key] = classifica
    return classifiche, ties


def _persist_format_data(db: Session, torneo: Tournament, **updates) -> None:
    """Aggiorna format_data sostituendo l'intero dict (richiesto per il tracking JSON)."""
    new_fd = dict(torneo.format_data or {})
    new_fd.update(updates)
    torneo.format_data = new_fd
    db.commit()
    db.refresh(torneo)


def complete_group_stage_group(db: Session, tournament_id: int, group_key: str) -> dict:
    """
    Marca un girone come completato aggiungendo group_key a
    format_data.completed_groups. Restituisce la lista aggiornata.
    """
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not torneo:
        raise ValueError("Torneo non trovato")
    if torneo.tournament_format != "group_stage":
        raise ValueError("Questo torneo non è in formato group_stage")

    completed = list((torneo.format_data or {}).get("completed_groups", []))
    if group_key not in completed:
        completed.append(group_key)
        _persist_format_data(db, torneo, completed_groups=completed)

    return {"completed_groups": completed}


def generate_group_stage_finals(
    db: Session, tournament_id: int, actor_user_id: int | None = None
) -> dict:
    """
    Avanza il torneo a gironi alla fase successiva, in modo idempotente e
    scalabile a un numero qualsiasi di gironi (vincolo schermo: max 4 per gara).

    Macchina a fasi:
      1. GIRONI (phase="group")
         - Calcola la classifica di ciascun girone; i primi 2 avanzano,
           i restanti vanno in Consolazione ("bottom").
      2a. Se i qualificati sono ≤ 4 → vanno direttamente in FINALE ("top").
      2b. Se i qualificati sono > 4 → si genera la SEMIFINALE (phase="semifinal",
          batterie "S1","S2"... da max 4); i primi di ogni batteria avanzano poi
          alla FINALE fino a riempire 4 posti.
      3. FINALE ("top", Final 4) + CONSOLAZIONE ("bottom").

    Persiste la composizione delle fasi in tournament.format_data:
      {"groups":{...}, "needs_semifinal":bool, "semifinals":{...},
       "finals":{"top":[...],"bottom":[...]}}
    """
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not torneo:
        raise ValueError("Torneo non trovato")
    if torneo.tournament_format != "group_stage":
        raise ValueError("Questo torneo non è in formato group_stage")

    fd = torneo.format_data or {}
    groups_seed = fd.get("groups") or {}
    if not groups_seed:
        raise ValueError(
            "I gironi non sono stati ancora assegnati — esegui prima il seeding"
        )
    group_keys = sorted(groups_seed.keys(), key=lambda k: int(k))

    completed_groups = set(fd.get("completed_groups") or [])
    missing = [k for k in group_keys if k not in completed_groups]
    if missing:
        gironi = ", ".join(f"girone {k}" for k in missing)
        raise ValueError(
            f"I seguenti gironi non sono ancora completati: {gironi}. "
            "Completa tutti i gironi prima di generare la fase successiva."
        )

    finals = fd.get("finals") or {}

    # ── Stato: finale già composta → idempotente, nessun ricalcolo ──────────────
    if finals.get("top"):
        return {
            "stage": "finals",
            "needs_semifinal": bool(fd.get("needs_semifinal")),
            "fase_2": {
                "top": finals.get("top", []),
                "bottom": finals.get("bottom", []),
            },
            "messaggio": "La finale è già stata generata.",
        }

    # ── Classifica gironi + qualificati/consolazione ────────────────────────────
    classifiche, ties = _group_standings(db, tournament_id, "group", group_keys)

    if ties:
        gironi = ", ".join(f"girone {k}" for k in ties.keys())
        raise ValueError(
            f"Pareggio (punti, vittorie e podi) al posto di qualificazione in: {gironi}. "
            "Registra uno Spareggio (primo a 2 vittorie, piste random) tra i giocatori in parità "
            "prima di generare la fase successiva."
        )

    qualificati: list[dict] = []  # {player_id, punti_totali, vittorie, group_rank}
    consolation_ids: list[int] = []
    for key in group_keys:
        classifica = classifiche[key]
        for rank, row in enumerate(classifica):
            if rank < QUALIFY_PER_GROUP:
                qualificati.append({**row, "group_rank": rank})
            else:
                consolation_ids.append(row["player_id"])

    needs_semifinal = len(qualificati) > FINAL_SLOTS

    # ── 2a. Nessuna semifinale: i qualificati vanno diretti in finale ───────────
    if not needs_semifinal:
        top_ids = [q["player_id"] for q in qualificati]
        _persist_format_data(
            db,
            torneo,
            needs_semifinal=False,
            finals={"top": top_ids, "bottom": consolation_ids},
        )
        _touch_phase_change(
            db,
            torneo,
            actor_user_id,
            action="tournament_phase_advanced",
            description=f"Il torneo '{torneo.name}' è passato alla fase Finale (Final 4).",
        )
        return {
            "stage": "finals",
            "needs_semifinal": False,
            "fase_1": {f"girone_{k}": classifiche[k] for k in group_keys},
            "fase_2": {"top": top_ids, "bottom": consolation_ids},
            "messaggio": (
                f"Finale generata: {len(top_ids)} qualificati alla Finale, "
                f"{len(consolation_ids)} alla Consolazione. "
                "Crea le gare con phase='finals' e group_name='top'/'bottom'."
            ),
        }

    # ── 2b. Servono le semifinali ───────────────────────────────────────────────
    semifinals = fd.get("semifinals") or {}
    if not semifinals:
        # Genera le batterie di semifinale dai qualificati (vincitori distribuiti)
        layout = compute_semifinal_layout(len(qualificati))
        n_heats = len(layout)
        # ordina: prima tutti i vincitori di girone, poi i secondi (per punti)
        qualificati_ordinati = sorted(
            qualificati,
            key=lambda q: (
                q["group_rank"],
                -q["punti_totali"],
                -q["vittorie"],
                q["player_id"],
            ),
        )
        heats: dict[str, list[int]] = {f"S{i + 1}": [] for i in range(n_heats)}
        for idx, q in enumerate(qualificati_ordinati):
            heats[f"S{(idx % n_heats) + 1}"].append(q["player_id"])
        _persist_format_data(
            db,
            torneo,
            needs_semifinal=True,
            semifinals=heats,
            finals={"bottom": consolation_ids},
        )
        _touch_phase_change(
            db,
            torneo,
            actor_user_id,
            action="tournament_phase_advanced",
            description=f"Il torneo '{torneo.name}' è passato alla fase Semifinali.",
        )
        riepilogo = ", ".join(f"{k} ({len(v)})" for k, v in heats.items())
        return {
            "stage": "semifinal",
            "needs_semifinal": True,
            "fase_1": {f"girone_{k}": classifiche[k] for k in group_keys},
            "semifinals": heats,
            "consolation": consolation_ids,
            "messaggio": (
                f"Semifinali generate: {riepilogo}. "
                "Crea le gare con phase='semifinal' e group_name='S1'/'S2'/…, "
                "poi rilancia per comporre la Finale."
            ),
        }

    # Semifinali già seedate → leggi i risultati e componi la Finale (Final 4)
    semi_keys = _semifinal_keys_from_format_data(fd)
    semi_standings, semi_ties = _group_standings(
        db, tournament_id, "semifinal", semi_keys
    )
    if semi_ties:
        batterie = ", ".join(f"batteria {k}" for k in semi_ties.keys())
        raise ValueError(
            f"Pareggio (punti, vittorie e podi) al posto di qualificazione in: {batterie}. "
            "Registra uno Spareggio (primo a 2 vittorie, piste random) tra i giocatori in parità "
            "prima di generare la Finale."
        )
    top_ids = _advance_top_n(semi_standings, FINAL_SLOTS)
    _persist_format_data(
        db,
        torneo,
        finals={"top": top_ids, "bottom": consolation_ids},
    )
    _touch_phase_change(
        db,
        torneo,
        actor_user_id,
        action="tournament_phase_advanced",
        description=f"Il torneo '{torneo.name}' è passato alla fase Finale (Final 4).",
    )
    return {
        "stage": "finals",
        "needs_semifinal": True,
        "semifinals": {k: semi_standings[k] for k in semi_keys},
        "fase_2": {"top": top_ids, "bottom": consolation_ids},
        "messaggio": (
            f"Finale composta dalle semifinali: {len(top_ids)} finalisti. "
            "Crea le gare con phase='finals' e group_name='top'/'bottom'."
        ),
    }


def get_group_stage_ties(db: Session, tournament_id: int) -> dict:
    """
    Verifica se la classifica della fase corrente (gironi o semifinali) presenta
    pareggi sul posto di qualificazione, per poter proporre uno Spareggio
    (primo a 2 vittorie, piste random) prima di avanzare di fase.
    """
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not torneo:
        raise ValueError("Torneo non trovato")
    if torneo.tournament_format != "group_stage":
        raise ValueError("Questo torneo non è in formato group_stage")

    fd = torneo.format_data or {}
    groups_seed = fd.get("groups") or {}
    if not groups_seed:
        return {"phase": None, "ties": {}}

    finals = fd.get("finals") or {}
    if finals.get("top"):
        return {"phase": None, "ties": {}}

    semifinals = fd.get("semifinals") or {}
    if semifinals:
        semi_keys = _semifinal_keys_from_format_data(fd)
        _, ties = _group_standings(db, tournament_id, "semifinal", semi_keys)
        return {"phase": "semifinal", "ties": ties}

    group_keys = sorted(groups_seed.keys(), key=lambda k: int(k))
    _, ties = _group_standings(db, tournament_id, "group", group_keys)
    return {"phase": "group", "ties": ties}


def get_group_stage_classifiche(db: Session, tournament_id: int) -> dict:
    """
    Classifica risolta (riordinata secondo l'esito degli eventuali spareggi
    di qualificazione) per ogni girone e ogni batteria di semifinale di un
    torneo a gironi — {"group": {key: [player_id in ordine,...]}, "semifinal": {...}}.

    A differenza di get_group_stage_ties (che segnala solo i pareggi ANCORA
    da risolvere nella fase corrente), questa espone l'ordine finale di ogni
    gruppo appena le gare sono giocate, indipendentemente dalla fase in cui
    si trova il torneo ora: serve alla UI per mostrare la classifica del
    girone già aggiornata con l'esito dello spareggio anche dopo che il
    torneo è avanzato (es. si è già in semifinale/finale).
    """
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not torneo or torneo.tournament_format != "group_stage":
        return {"group": {}, "semifinal": {}}

    fd = torneo.format_data or {}
    result: dict[str, dict[str, list[int]]] = {"group": {}, "semifinal": {}}

    groups_seed = fd.get("groups") or {}
    if groups_seed:
        group_keys = sorted(groups_seed.keys(), key=lambda k: int(k))
        try:
            classifiche, _ = _group_standings(db, tournament_id, "group", group_keys)
        except ValueError:
            classifiche = {}
        result["group"] = {
            k: [row["player_id"] for row in v] for k, v in classifiche.items()
        }

    semi_keys = _semifinal_keys_from_format_data(fd)
    if semi_keys:
        try:
            semi_classifiche, _ = _group_standings(
                db, tournament_id, "semifinal", semi_keys
            )
        except ValueError:
            semi_classifiche = {}
        result["semifinal"] = {
            k: [row["player_id"] for row in v] for k, v in semi_classifiche.items()
        }

    return result


# ---------------------------------------------------------------------------
# CLASSIC FORMAT — spareggi podio (1°/2° e 3°/4° posto, anche a N>2 giocatori)
# ---------------------------------------------------------------------------

# group_name usato per le gare secche di spareggio podio (is_duello=True,
# tournament_format == "classic"): distinguono il pool di circuiti dello
# spareggio da quello delle gare ufficiali (vedi controllers/tornei/races.py).
DUELLO_PODIO_1_2 = "duello_podio_1_2"
DUELLO_PODIO_3_4 = "duello_podio_3_4"

# group_name usato per gli spareggi podio della Finale (Final 4) nei tornei a
# gironi (phase="finals", is_duello=True).
FINALS_DUELLO_PODIO_1_2 = "finals_duello_podio_1_2"
FINALS_DUELLO_PODIO_3_4 = "finals_duello_podio_3_4"

# group_name usato per gli spareggi podio della Consolazione/"Finalina" —
# DISTINTI da quelli della Finale: senza nomi separati, un pareggio in
# Consolazione finirebbe per riusare lo stesso group_name di un pareggio
# (magari già risolto) della Finale, facendo apparire un duello come "già
# risolto" quando in realtà si trattava di un duello diverso.
FINALS_DUELLO_CONSOLAZIONE_1_2 = "finals_duello_consolazione_1_2"
FINALS_DUELLO_CONSOLAZIONE_3_4 = "finals_duello_consolazione_3_4"


def _classic_classifica(db: Session, tournament_id: int) -> list[dict]:
    """Classifica generale di un torneo classic (sole gare ufficiali, non duello)."""
    from app.models import Race

    race_ids = [
        r.id
        for r in db.query(Race.id)
        .filter(Race.tournament_id == tournament_id, Race.is_duello.is_(False))
        .all()
    ]
    if not race_ids:
        return []
    return _classifica_girone(db, race_ids)


def _first_to_n_order(
    db: Session,
    tournament_id: int,
    phase: str | None,
    group_name: str,
    tied_ids: list[int],
    n: int = 3,
) -> list[int] | None:
    """
    Spareggio multi-gara (is_duello=True, stesso phase/group_name) tra N
    giocatori in parità: vince chi ottiene n vittorie di gara (default 3).

    Il vincitore è il primo a raggiungere n vittorie; gli altri vengono
    ordinati per punti totali accumulati nelle gare duello (decrescente).

    Restituisce [vincitore, ...ordinati] una volta deciso, altrimenti None
    (spareggio non ancora creato o ancora in corso).
    """
    from app.models import Race, Result

    phase_filter = Race.phase.is_(None) if phase is None else Race.phase == phase
    race_ids = [
        r.id
        for r in db.query(Race.id)
        .filter(
            Race.tournament_id == tournament_id,
            phase_filter,
            Race.group_name == group_name,
            Race.is_duello.is_(True),
        )
        .all()
    ]
    if not race_ids:
        return None

    wins = dict(
        db.query(Result.player_id, func.sum(case((Result.position == 1, 1), else_=0)))
        .filter(Result.race_id.in_(race_ids), Result.player_id.in_(tied_ids))
        .group_by(Result.player_id)
        .all()
    )
    for pid in tied_ids:
        wins.setdefault(pid, 0)

    winner = next((pid for pid, w in wins.items() if w >= n), None)
    if winner is None:
        return None

    points = dict(
        db.query(Result.player_id, func.sum(Result.points))
        .filter(Result.race_id.in_(race_ids), Result.player_id.in_(tied_ids))
        .group_by(Result.player_id)
        .all()
    )
    remaining = sorted(
        [pid for pid in tied_ids if pid != winner],
        key=lambda pid: points.get(pid, 0),
        reverse=True,
    )
    return [winner] + remaining


def _resolve_podium_tie(
    db: Session,
    tournament_id: int,
    phase: str | None,
    group_name: str,
    tied_ids: list[int],
) -> list[int] | None:
    """
    Risolve un pareggio podio (1°/2°, 3°/4° o posizioni più basse, anche a
    N>2 giocatori) tramite uno Spareggio is_duello=True con lo stesso (phase,
    group_name): primo a 3 vittorie vince, gli altri ordinati per punti
    accumulati nelle gare duello.
    """
    return _first_to_n_order(db, tournament_id, phase, group_name, tied_ids, n=3)


def _all_tied_blocks(classifica: list[dict]) -> list[tuple[int, list[int]]]:
    """
    Scandisce l'intera classifica e restituisce ogni blocco massimale di
    posizioni consecutive in parità su (punti, vittorie, podi) — non solo
    podio (1°-4°), ma anche posizioni più basse (5°/6°, 7°/8°, ecc.).

    Restituisce una lista di (start_index, tied_ids), dove start_index è
    0-indexed (0 = 1° posto) e tied_ids contiene tutti i player_id del
    blocco (anche a 3+ giocatori in parità).
    """
    blocks: list[tuple[int, list[int]]] = []
    i = 0
    n = len(classifica)
    while i < n:
        key = (
            classifica[i]["punti_totali"],
            classifica[i]["vittorie"],
            classifica[i]["podi"],
        )
        j = i
        while (
            j + 1 < n
            and (
                classifica[j + 1]["punti_totali"],
                classifica[j + 1]["vittorie"],
                classifica[j + 1]["podi"],
            )
            == key
        ):
            j += 1
        if j > i:
            blocks.append((i, [row["player_id"] for row in classifica[i : j + 1]]))
        i = j + 1
    return blocks


def get_classic_podium_ties(db: Session, tournament_id: int) -> dict:
    """
    Rileva tutti i pareggi della classifica generale di un torneo classic
    (1°/2° posto, 3°/4° posto e qualunque altro blocco di posizioni più
    basse, anche a 3+ giocatori) e lo stato del relativo spareggio, se avviato.

    Restituisce {"top2": {...} | None, "top4": {...} | None, "others": [...]},
    dove ciascuna voce (incluse quelle di "others") contiene "tied" (i
    player_id in parità), "order" (l'ordine risolto dallo spareggio, None se
    non ancora concluso) e "winner_id" (order[0], per compatibilità con i
    consumer esistenti). Le voci di "others" includono anche "group_name",
    "start_position" e "end_position" (1-indexed) per identificare il
    duello corrispondente.

    Ogni blocco in parità (1°/2°, 3°/4°, o posizioni più basse, anche a 3+
    giocatori) si risolve con lo stesso meccanismo: spareggio "primo a 3
    vittorie" (vedi _resolve_podium_tie / _first_to_n_order).
    """
    classifica = _classic_classifica(db, tournament_id)
    result: dict[str, object] = {"top2": None, "top4": None, "others": []}

    for start_idx, tied in _all_tied_blocks(classifica):
        end_idx = start_idx + len(tied) - 1
        if start_idx == 0:
            order = _resolve_podium_tie(db, tournament_id, None, DUELLO_PODIO_1_2, tied)
            result["top2"] = {
                "tied": tied,
                "order": order,
                "winner_id": order[0] if order else None,
                "group_name": DUELLO_PODIO_1_2,
                "start_position": 1,
                "end_position": end_idx + 1,
            }
        elif start_idx == 2:
            order = _resolve_podium_tie(db, tournament_id, None, DUELLO_PODIO_3_4, tied)
            result["top4"] = {
                "tied": tied,
                "order": order,
                "winner_id": order[0] if order else None,
                "group_name": DUELLO_PODIO_3_4,
                "start_position": 3,
                "end_position": end_idx + 1,
            }
        else:
            group_name = f"duello_podio_{start_idx + 1}_{end_idx + 1}"
            order = _resolve_podium_tie(db, tournament_id, None, group_name, tied)
            result["others"].append(
                {
                    "tied": tied,
                    "order": order,
                    "winner_id": order[0] if order else None,
                    "group_name": group_name,
                    "start_position": start_idx + 1,
                    "end_position": end_idx + 1,
                }
            )

    return result


def get_classic_final_classifica(db: Session, tournament_id: int) -> list[int]:
    """
    Classifica generale di un torneo classic (player_id in ordine di arrivo),
    con tutti i blocchi in parità (1°/2°, 3°/4° e posizioni più basse, anche
    a N>2) riordinati in base all'esito degli eventuali spareggi (vedi
    get_classic_podium_ties). Se uno spareggio è ancora aperto, l'ordine di
    default (punti/vittorie/podi/player_id) resta invariato per quel blocco.
    """
    classifica = _classic_classifica(db, tournament_id)
    order = [row["player_id"] for row in classifica]
    ties = get_classic_podium_ties(db, tournament_id)

    all_ties = [ties.get("top2"), ties.get("top4"), *ties.get("others", [])]
    for tie in all_ties:
        if tie and tie["order"]:
            tied_set = set(tie["tied"])
            start = next(i for i, pid in enumerate(order) if pid in tied_set)
            order[start : start + len(tie["order"])] = tie["order"]

    return order


# ---------------------------------------------------------------------------
# GROUP STAGE — spareggi podio di Finale (Final 4: 1°/2° e 3°/4° posto)
# ---------------------------------------------------------------------------


def _finals_classifica(db: Session, tournament_id: int) -> list[dict]:
    """Classifica della Finale (Final 4) di un torneo a gironi (sole gare ufficiali)."""
    from app.models import Race

    race_ids = [
        r.id
        for r in db.query(Race.id)
        .filter(
            Race.tournament_id == tournament_id,
            Race.phase == "finals",
            Race.group_name == "top",
            Race.is_duello.is_(False),
        )
        .all()
    ]
    if not race_ids:
        return []
    return _classifica_girone(db, race_ids)


def get_finals_podium_ties(db: Session, tournament_id: int) -> dict:
    """
    Rileva TUTTI i pareggi della classifica della Finale (Final 4) di un
    torneo a gironi — 1°/2° posto, 3°/4° posto e qualunque altro blocco di
    posizioni in parità (anche a 3+ giocatori), non solo quelli che toccano
    il confine podio. Stessa logica di get_classic_podium_ties (_all_tied_blocks),
    applicata alla classifica calcolata sulle SOLE gare della Finale.

    In precedenza usava _tied_group (pensato per le qualificazioni di
    girone), che rileva un pareggio solo se "a cavallo" del confine 1°/2° o
    3°/4°: un pareggio interamente interno, es. solo tra 2° e 3° posto,
    veniva ignorato. Restituisce {"top2", "top4", "others"} come
    get_classic_podium_ties.
    """
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    result: dict[str, object] = {"top2": None, "top4": None, "others": []}
    if not torneo or torneo.tournament_format != "group_stage":
        return result

    fd = torneo.format_data or {}
    if not (fd.get("finals") or {}).get("top"):
        return result

    classifica = _finals_classifica(db, tournament_id)

    for start_idx, tied in _all_tied_blocks(classifica):
        end_idx = start_idx + len(tied) - 1
        if start_idx == 0:
            order = _resolve_podium_tie(
                db, tournament_id, "finals", FINALS_DUELLO_PODIO_1_2, tied
            )
            result["top2"] = {
                "tied": tied,
                "order": order,
                "winner_id": order[0] if order else None,
                "group_name": FINALS_DUELLO_PODIO_1_2,
                "start_position": 1,
                "end_position": end_idx + 1,
            }
        elif start_idx == 2:
            order = _resolve_podium_tie(
                db, tournament_id, "finals", FINALS_DUELLO_PODIO_3_4, tied
            )
            result["top4"] = {
                "tied": tied,
                "order": order,
                "winner_id": order[0] if order else None,
                "group_name": FINALS_DUELLO_PODIO_3_4,
                "start_position": 3,
                "end_position": end_idx + 1,
            }
        else:
            group_name = f"finals_duello_podio_{start_idx + 1}_{end_idx + 1}"
            order = _resolve_podium_tie(db, tournament_id, "finals", group_name, tied)
            result["others"].append(
                {
                    "tied": tied,
                    "order": order,
                    "winner_id": order[0] if order else None,
                    "group_name": group_name,
                    "start_position": start_idx + 1,
                    "end_position": end_idx + 1,
                }
            )

    return result


def get_finals_final_classifica(db: Session, tournament_id: int) -> list[int]:
    """
    Classifica della Finale (Final 4) di un torneo a gironi (player_id in
    ordine di arrivo), con 1°/2° e 3°/4° riordinati in base all'esito degli
    eventuali spareggi podio di Finale (vedi get_finals_podium_ties).
    """
    classifica = _finals_classifica(db, tournament_id)
    order = [row["player_id"] for row in classifica]
    ties = get_finals_podium_ties(db, tournament_id)

    all_ties = [ties.get("top2"), ties.get("top4"), *ties.get("others", [])]
    for tie in all_ties:
        if tie and tie["order"]:
            tied_set = set(tie["tied"])
            start = next(i for i, pid in enumerate(order) if pid in tied_set)
            order[start : start + len(tie["order"])] = tie["order"]

    return order


def _consolation_classifica(db: Session, tournament_id: int) -> list[dict]:
    """Classifica della Consolazione ("Finalina") di un torneo a gironi (sole gare ufficiali)."""
    from app.models import Race

    race_ids = [
        r.id
        for r in db.query(Race.id)
        .filter(
            Race.tournament_id == tournament_id,
            Race.phase == "finals",
            Race.group_name == "bottom",
            Race.is_duello.is_(False),
        )
        .all()
    ]
    if not race_ids:
        return []
    return _classifica_girone(db, race_ids)


def get_consolation_podium_ties(db: Session, tournament_id: int) -> dict:
    """
    Rileva TUTTI i pareggi della classifica della Consolazione/"Finalina" di
    un torneo a gironi (1°/2° e 3°/4° posto DELLA CONSOLAZIONE, cioè 5°/6° e
    7°/8° posto generali, e qualunque altro blocco di posizioni in parità
    più in basso — anche a 3+ giocatori). Stessa logica di
    get_finals_podium_ties (_all_tied_blocks), con group_name dedicati
    (FINALS_DUELLO_CONSOLAZIONE_*) per non condividere lo stato con gli
    eventuali pareggi della Finale.

    In precedenza usava _tied_group (limitato ai confini 1°/2° e 3°/4°): un
    pareggio interamente interno (es. solo tra il 2° e il 3° posto della
    Consolazione) o su posizioni più basse (5°+ della Consolazione, frequenti
    quando il girone iniziale aveva più di 4 partecipanti non qualificati)
    veniva ignorato.
    """
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    result: dict[str, object] = {"top2": None, "top4": None, "others": []}
    if not torneo or torneo.tournament_format != "group_stage":
        return result

    fd = torneo.format_data or {}
    if not (fd.get("finals") or {}).get("bottom"):
        return result

    classifica = _consolation_classifica(db, tournament_id)

    for start_idx, tied in _all_tied_blocks(classifica):
        end_idx = start_idx + len(tied) - 1
        if start_idx == 0:
            order = _resolve_podium_tie(
                db, tournament_id, "finals", FINALS_DUELLO_CONSOLAZIONE_1_2, tied
            )
            result["top2"] = {
                "tied": tied,
                "order": order,
                "winner_id": order[0] if order else None,
                "group_name": FINALS_DUELLO_CONSOLAZIONE_1_2,
                "start_position": 1,
                "end_position": end_idx + 1,
            }
        elif start_idx == 2:
            order = _resolve_podium_tie(
                db, tournament_id, "finals", FINALS_DUELLO_CONSOLAZIONE_3_4, tied
            )
            result["top4"] = {
                "tied": tied,
                "order": order,
                "winner_id": order[0] if order else None,
                "group_name": FINALS_DUELLO_CONSOLAZIONE_3_4,
                "start_position": 3,
                "end_position": end_idx + 1,
            }
        else:
            group_name = f"finals_duello_consolazione_{start_idx + 1}_{end_idx + 1}"
            order = _resolve_podium_tie(db, tournament_id, "finals", group_name, tied)
            result["others"].append(
                {
                    "tied": tied,
                    "order": order,
                    "winner_id": order[0] if order else None,
                    "group_name": group_name,
                    "start_position": start_idx + 1,
                    "end_position": end_idx + 1,
                }
            )

    return result


def get_consolation_final_classifica(db: Session, tournament_id: int) -> list[int]:
    """
    Classifica della Consolazione/"Finalina" di un torneo a gironi (player_id
    in ordine di arrivo), con 1°/2° e 3°/4° (della Consolazione) riordinati in
    base all'esito degli eventuali spareggi podio (vedi get_consolation_podium_ties).
    """
    classifica = _consolation_classifica(db, tournament_id)
    order = [row["player_id"] for row in classifica]
    ties = get_consolation_podium_ties(db, tournament_id)

    all_ties = [ties.get("top2"), ties.get("top4"), *ties.get("others", [])]
    for tie in all_ties:
        if tie and tie["order"]:
            tied_set = set(tie["tied"])
            start = next(i for i, pid in enumerate(order) if pid in tied_set)
            order[start : start + len(tie["order"])] = tie["order"]

    return order


def get_group_stage_overall_classifica(db: Session, tournament_id: int) -> list[int]:
    """
    Classifica generale combinata del torneo a gironi: le posizioni 1°-4°
    sono la Finale (riordinata secondo gli eventuali spareggi podio, vedi
    get_finals_final_classifica), seguite dalle posizioni 5°-N della
    Consolazione/"Finalina" (riordinata secondo i suoi propri spareggi podio,
    vedi get_consolation_final_classifica).

    Restituisce [] se la Finale non è ancora stata composta.
    """
    top_order = get_finals_final_classifica(db, tournament_id)
    if not top_order:
        return []
    bottom_order = get_consolation_final_classifica(db, tournament_id)
    return top_order + bottom_order


# ---------------------------------------------------------------------------
# NOTE AUTOMATICHE — spiegazioni sugli esiti degli spareggi in classifica
# ---------------------------------------------------------------------------


def _player_nickname(db: Session, player_id: int) -> str:
    player = db.query(Player).filter(Player.id == player_id).first()
    return player.nickname if player else f"#{player_id}"


def _join_names(db: Session, player_ids: list[int]) -> str:
    return " e ".join(_player_nickname(db, pid) for pid in player_ids)


def get_classic_resolution_notes(db: Session, tournament_id: int) -> list[str]:
    """
    Note automatiche che spiegano come gli spareggi podio hanno determinato
    l'ordine finale di un torneo classic (vedi: visibili in classifica finale).
    """
    notes: list[str] = []
    ties = get_classic_podium_ties(db, tournament_id)

    top2 = ties.get("top2")
    if top2 and top2.get("order"):
        winner, *others = top2["order"]
        notes.append(
            f"{_player_nickname(db, winner)} conquista il torneo grazie alla vittoria "
            f"nello spareggio finale contro {_join_names(db, others)}."
        )

    top4 = ties.get("top4")
    if top4 and top4.get("order"):
        winner, *others = top4["order"]
        notes.append(
            f"{_player_nickname(db, winner)} conquista il 3° posto grazie alla vittoria "
            f"nello spareggio contro {_join_names(db, others)}."
        )

    return notes


def get_group_stage_resolution_notes(db: Session, tournament_id: int) -> list[dict]:
    """
    Note automatiche che spiegano come gli spareggi (gironi, semifinali e
    podio di Finale) hanno determinato l'ordine finale di un torneo a gironi.

    Ogni nota è taggata con la fase a cui si riferisce ("group", "semifinal",
    "finals") così chi la mostra può filtrare — es. sotto "Classifica Finale"
    ha senso vedere solo le note della Finale, non quelle dei gironi.
    """
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not torneo or torneo.tournament_format != "group_stage":
        return []

    fd = torneo.format_data or {}
    notes: list[dict] = []

    groups_seed = fd.get("groups") or {}
    if groups_seed:
        group_keys = sorted(groups_seed.keys(), key=lambda k: int(k))
        try:
            classifiche, _ = _group_standings(db, tournament_id, "group", group_keys)
        except ValueError:
            classifiche = {}
        for key, classifica in classifiche.items():
            tied = _tied_group(classifica, QUALIFY_PER_GROUP)
            if not tied:
                continue
            order = _resolve_tie_with_spareggio(db, tournament_id, "group", key, tied)
            if order:
                winner, *others = order
                notes.append(
                    {
                        "phase": "group",
                        "text": (
                            f"{_player_nickname(db, winner)} passa il turno (Girone {key}) grazie alla "
                            f"vittoria nello spareggio contro {_join_names(db, others)}."
                        ),
                    }
                )

    semi_keys = _semifinal_keys_from_format_data(fd)
    if semi_keys:
        try:
            semi_classifiche, _ = _group_standings(
                db, tournament_id, "semifinal", semi_keys
            )
        except ValueError:
            semi_classifiche = {}
        for key, classifica in semi_classifiche.items():
            tied = _tied_group(classifica, QUALIFY_PER_GROUP)
            if not tied:
                continue
            order = _resolve_tie_with_spareggio(
                db, tournament_id, "semifinal", key, tied
            )
            if order:
                winner, *others = order
                notes.append(
                    {
                        "phase": "semifinal",
                        "text": (
                            f"{_player_nickname(db, winner)} passa il turno (Semifinale {key}) grazie alla "
                            f"vittoria nello spareggio contro {_join_names(db, others)}."
                        ),
                    }
                )

    finals_ties = get_finals_podium_ties(db, tournament_id)

    top2 = finals_ties.get("top2")
    if top2 and top2.get("order"):
        winner, *others = top2["order"]
        notes.append(
            {
                "phase": "finals",
                "text": (
                    f"{_player_nickname(db, winner)} conquista il torneo grazie alla vittoria "
                    f"nello spareggio finale contro {_join_names(db, others)}."
                ),
            }
        )

    top4 = finals_ties.get("top4")
    if top4 and top4.get("order"):
        winner, *others = top4["order"]
        notes.append(
            {
                "phase": "finals",
                "text": (
                    f"{_player_nickname(db, winner)} conquista il 3° posto grazie alla vittoria "
                    f"nello spareggio contro {_join_names(db, others)}."
                ),
            }
        )

    return notes


def get_tournament_resolution_notes(db: Session, tournament_id: int) -> list[dict]:
    """Note automatiche sugli esiti degli spareggi, indipendentemente dal formato torneo."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        return []
    if tournament.tournament_format == "classic":
        return [
            {"phase": None, "text": text}
            for text in get_classic_resolution_notes(db, tournament_id)
        ]
    return get_group_stage_resolution_notes(db, tournament_id)


def seed_group_stage(db: Session, tournament_id: int) -> dict:
    """
    Assegna i partecipanti a N gironi (calcolati in base al numero di
    partecipanti, vedi compute_group_layout) tramite distribuzione a
    round-robin sul ranking storico filtrato per lo stesso gioco del torneo.
    """
    torneo = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not torneo:
        raise ValueError("Torneo non trovato")
    if torneo.tournament_format != "group_stage":
        raise ValueError(
            "Il seeding è disponibile solo per tornei in formato group_stage"
        )
    if torneo.status != "da_svolgere":
        raise ValueError("Il seeding va eseguito prima di avviare il torneo")
    if (torneo.format_data or {}).get("groups"):
        raise ValueError(
            "I gironi sono già stati assegnati per questo torneo e non possono essere "
            "ricalcolati: cambierebbero i pronostici 'Finalisti' delle schedine già compilate."
        )

    _load_participants(db, torneo)
    participant_ids: list[int] = torneo.participant_ids or []

    layout = compute_group_layout(len(participant_ids))
    n_groups = len(layout)

    from app.models import Result, Race as RaceModel

    # Ranking storico filtrato per stesso gioco e torneo diverso
    ranking_rows = (
        db.query(Result.player_id, func.sum(Result.points).label("pts"))
        .join(RaceModel, RaceModel.id == Result.race_id)
        .join(Tournament, Tournament.id == RaceModel.tournament_id)
        .filter(
            Result.player_id.in_(participant_ids),
            RaceModel.tournament_id != tournament_id,
            Tournament.game_id == torneo.game_id,
            RaceModel.is_duello.is_(False),
        )
        .group_by(Result.player_id)
        .order_by(func.sum(Result.points).desc())
        .all()
    )

    ranked_ids = [r.player_id for r in ranking_rows]
    no_history = [pid for pid in participant_ids if pid not in set(ranked_ids)]
    random.shuffle(no_history)
    ordered = ranked_ids + no_history

    # Distribuzione round-robin: il girone i-esimo riceve gli indici idx % n_groups == i,
    # producendo naturalmente gironi bilanciati coerenti con compute_group_layout
    # (i primi `extra` gironi hanno un giocatore in più).
    groups: dict[str, list[int]] = {str(i + 1): [] for i in range(n_groups)}
    for idx, pid in enumerate(ordered):
        group_key = str((idx % n_groups) + 1)
        groups[group_key].append(pid)

    torneo.format_data = {"groups": groups}
    db.commit()
    db.refresh(torneo)

    # Notifica schedina disponibile ora che i gironi sono definiti
    try:
        from app.services.utenti.notifications import create_tournament_notifications

        create_tournament_notifications(
            db,
            tournament_id,
            "schedina_pending",
            f"Compila la schedina per '{torneo.name}' — gironi assegnati!",
        )
        db.commit()
    except Exception:
        pass

    riepilogo = ", ".join(
        f"Girone {key} ({len(ids)} giocatori)" for key, ids in groups.items()
    )
    return {
        "groups": groups,
        "layout": layout,
        "messaggio": (
            f"{riepilogo} assegnati tramite distribuzione bilanciata sul ranking storico (stesso gioco)."
        ),
    }


# ---------------------------------------------------------------------------
# PANORAMICA TORNEO — info riassuntive, status badge, timeline e audit
# ---------------------------------------------------------------------------


def _tournament_current_phase(tournament: Tournament) -> tuple[str, str]:
    """Restituisce (phase_key, status_label) in base allo stato e a format_data."""
    if tournament.status == "da_svolgere":
        return "creazione", "In Attesa"
    if tournament.status == "concluso":
        return "conclusione", "Concluso"

    if tournament.tournament_format != "group_stage":
        return "in_corso", "In Corso"

    fd = tournament.format_data or {}
    finals = fd.get("finals") or {}
    if finals.get("top"):
        return "finale", "Finale"
    if fd.get("semifinals"):
        return "semifinali", "Semifinali"
    return "gironi", "Gironi"


def _has_unresolved_ties(db: Session, tournament: Tournament) -> bool:
    """True se esiste uno spareggio (gironi/semifinali/podio) ancora da risolvere."""
    try:
        if tournament.tournament_format == "classic":
            ties = get_classic_podium_ties(db, tournament.id)
            return any(
                t and t["order"] is None for t in (ties.get("top2"), ties.get("top4"))
            )

        fd = tournament.format_data or {}
        finals = fd.get("finals") or {}
        if finals.get("top"):
            ties = get_finals_podium_ties(db, tournament.id)
            return any(
                t and t["order"] is None for t in (ties.get("top2"), ties.get("top4"))
            )

        result = get_group_stage_ties(db, tournament.id)
        return bool(result.get("ties"))
    except ValueError:
        return False


def _build_tournament_timeline(
    db: Session, tournament: Tournament, phase_key: str
) -> list[dict]:
    """Stepper di avanzamento del torneo, adattato al formato (classic/group_stage)."""
    has_unresolved = _has_unresolved_ties(db, tournament)

    if tournament.tournament_format == "classic":
        order = ["creazione", "in_corso", "spareggi", "conclusione"]
        labels = {
            "creazione": "Creazione",
            "in_corso": "In Corso",
            "spareggi": "Spareggi",
            "conclusione": "Conclusione",
        }
        phase_index = {"creazione": 0, "in_corso": 1, "conclusione": 3}.get(
            phase_key, 1
        )
        spareggi_index = 2
        skip_keys: set[str] = set()
    else:
        order = [
            "creazione",
            "gironi",
            "spareggi",
            "semifinali",
            "finale",
            "conclusione",
        ]
        labels = {
            "creazione": "Creazione",
            "gironi": "Gironi",
            "spareggi": "Spareggi",
            "semifinali": "Semifinali",
            "finale": "Finale",
            "conclusione": "Conclusione",
        }
        phase_index = {
            "creazione": 0,
            "gironi": 1,
            "semifinali": 3,
            "finale": 4,
            "conclusione": 5,
        }.get(phase_key, 1)
        spareggi_index = 2
        needs_semifinal = (tournament.format_data or {}).get("needs_semifinal")
        skip_keys = {"semifinali"} if needs_semifinal is False else set()

    steps = []
    for i, key in enumerate(order):
        if key in skip_keys:
            status = "skipped"
        elif i == spareggi_index:
            if has_unresolved:
                status = "current"
            elif tournament.status == "concluso" or phase_index > spareggi_index:
                status = "done"
            else:
                status = "pending"
        elif i < phase_index:
            status = "done"
        elif i == phase_index:
            status = "current"
        else:
            status = "pending"
        steps.append({"key": key, "label": labels[key], "status": status})

    return steps


def get_tournament_overview(db: Session, tournament_id: int) -> dict:
    """
    Informazioni riassuntive del torneo per la sezione "Info torneo" visibile
    a tutti gli utenti: stato/fase, partecipanti, gironi, gare, schedine e
    timeline di avanzamento.
    """
    from app.models import Race, SchedinaTorneo, SchedinaTorneoGroupStage

    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise ValueError("Torneo non trovato")

    _load_participants(db, tournament)
    _normalize_tournament_status(tournament)

    phase_key, status_label = _tournament_current_phase(tournament)

    races = db.query(Race).filter(Race.tournament_id == tournament_id).all()
    races_completed = sum(1 for r in races if r.results)

    fd = tournament.format_data or {}
    groups = fd.get("groups") or {}
    groups_count = (
        len(groups) if tournament.tournament_format == "group_stage" else None
    )

    if tournament.tournament_format == "group_stage":
        schedine_count = (
            db.query(SchedinaTorneoGroupStage)
            .filter(SchedinaTorneoGroupStage.tournament_id == tournament_id)
            .count()
        )
    else:
        schedine_count = (
            db.query(SchedinaTorneo)
            .filter(SchedinaTorneo.tournament_id == tournament_id)
            .count()
        )

    if tournament.status == "da_svolgere":
        schedina_status_label = "Chiuse" if tournament.schedine_locked else "Aperte"
    else:
        schedina_status_label = "Chiuse"

    return {
        "status": tournament.status,
        "status_label": status_label,
        "phase": phase_key,
        "tournament_format": tournament.tournament_format,
        "date": tournament.date.isoformat() if tournament.date else None,
        "created_at": tournament.created_at.isoformat()
        if tournament.created_at
        else None,
        "n_players": tournament.n_players,
        "participants_count": len(tournament.participant_ids or []),
        "groups_count": groups_count,
        "races_completed": races_completed,
        "races_total": tournament.n_races,
        "schedine_count": schedine_count,
        "schedine_locked": tournament.schedine_locked,
        "schedina_status_label": schedina_status_label,
        "timeline": _build_tournament_timeline(db, tournament, phase_key),
    }


def get_tournament_audit(db: Session, tournament_id: int) -> dict:
    """
    Informazioni di audit (creazione, ultimo avanzamento di fase, attività
    recenti) riservate agli amministratori.
    """
    from app.models import AuditLog

    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise ValueError("Torneo non trovato")

    def _user_info(user):
        if not user:
            return None
        return {"id": user.id, "username": user.username}

    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.target_type == "tournament", AuditLog.target_id == tournament_id
        )
        .order_by(AuditLog.created_at.desc())
        .limit(20)
        .all()
    )
    recent_activity = [
        {
            "action": entry.action,
            "description": entry.description,
            "actor_username": entry.actor.username if entry.actor else None,
            "created_at": entry.created_at.isoformat(),
        }
        for entry in logs
    ]

    return {
        "created_at": tournament.created_at.isoformat()
        if tournament.created_at
        else None,
        "created_by": _user_info(tournament.created_by),
        "last_phase_change_at": (
            tournament.last_phase_change_at.isoformat()
            if tournament.last_phase_change_at
            else None
        ),
        "last_phase_change_by": _user_info(tournament.last_phase_change_by),
        "recent_activity": recent_activity,
    }
