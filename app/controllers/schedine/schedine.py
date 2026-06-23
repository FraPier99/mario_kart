from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_current_user, require_roles
from app.services.schedine.schedine import (
    create_schedina,
    get_prizes,
    get_schedine,
    get_public_schedina_overview,
    get_public_tournament_schedina_overview,
    get_tournament_schedina_detail,
    redeem_tournament_power,
    settle_tournament_schedine,
)
from app.services.schedine.schedine_deluxe import get_schedine_deluxe
from app.models import (
    Player,
    SchedinaTorneo,
    SchedinaTorneoGroupStage,
    Tournament,
    TournamentPlayer,
    User,
)
from app.controllers.schedine.schemas.schedine import (
    AllByTournamentEntry,
    AllByTournamentResponse,
    ParticipantStatusResponse,
    PremioTorneoResponse,
    SchedinaCreate,
    SchedinaDetailEntry,
    SchedinaOverviewResponse,
    SchedinaPendingNotification,
    SchedinaResponse,
    SchedinaSettlementResponse,
    SchedinaTournamentDetailResponse,
    SchedinaTournamentOverviewResponse,
)
from datetime import datetime
from app.core.timezone import now_rome


router = APIRouter(prefix="/schedine", tags=["Schedine"])


@router.get("/overview", response_model=SchedinaOverviewResponse)
def get_schedina_overview(
    game_id: int | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_public_schedina_overview(db, game_id=game_id)


@router.get(
    "/tournament/{tournament_id}/overview",
    response_model=SchedinaTournamentOverviewResponse,
)
def get_schedina_tournament_overview(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found"
        )

    is_privileged = current_user.role in {"admin", "superadmin"}
    include_details = is_privileged or tournament.status in {
        "da_svolgere",
        "in_corso",
        "concluso",
    }

    result = get_public_tournament_schedina_overview(
        db, tournament_id, include_details=include_details
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Tournament not found"
        )
    return result


@router.get("/pending-notifications", response_model=list[SchedinaPendingNotification])
def get_pending_notifications(
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    subquery_partecipanti = (
        db.query(TournamentPlayer.tournament_id)
        .join(Player, Player.id == TournamentPlayer.player_id)
        .join(User, User.player_id == Player.id)
        .filter(User.id == current_user.id)
        .subquery()
    )

    candidates = (
        db.query(Tournament)
        .filter(
            Tournament.id.in_(subquery_partecipanti),
            Tournament.status == "da_svolgere",
            # The tournament must have a schedina feature
            or_(
                Tournament.deadline_lock.isnot(None),
                Tournament.duello_player_a_id.isnot(None),
            ),
        )
        .all()
    )

    # ~Tournament.schedine.any(...) controllava solo SchedinaTorneo (classic):
    # per i tornei group_stage la schedina vive in SchedinaTorneoGroupStage,
    # quindi quel check era sempre vero e il promemoria non scompariva mai
    # dopo l'invio. Va controllata la tabella giusta in base al formato.
    pending = []
    for t in candidates:
        schedina_model = (
            SchedinaTorneoGroupStage
            if t.tournament_format == "group_stage"
            else SchedinaTorneo
        )
        has_schedina = (
            db.query(schedina_model)
            .filter(
                schedina_model.tournament_id == t.id,
                schedina_model.user_id == current_user.id,
            )
            .first()
            is not None
        )
        if not has_schedina:
            pending.append(t)

    return [
        SchedinaPendingNotification(
            tournament_id=t.id,
            tournament_name=t.name,
            tournament_date=t.date,
            deadline_lock=t.deadline_lock,
            tournament_format=t.tournament_format,
            message=f"Hai una schedina da compilare per il torneo del {t.date.strftime('%d/%m') if t.date else 'data TBD'}",
        )
        for t in pending
    ]


@router.get(
    "/tournament/{tournament_id}/participants-status",
    response_model=list[ParticipantStatusResponse],
)
def get_tournament_participants_status(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "superadmin")),
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # tournament.participant_ids non è una colonna reale: è un attributo
    # iniettato a runtime da _load_participants(), che qui non viene
    # chiamata. Va quindi letto direttamente dalla tabella ponte.
    participant_ids = [
        row.player_id
        for row in db.query(TournamentPlayer.player_id)
        .filter(TournamentPlayer.tournament_id == tournament_id)
        .all()
    ]
    if not participant_ids:
        return []

    players = db.query(Player).filter(Player.id.in_(participant_ids)).all()

    if tournament.tournament_format == "group_stage":
        schedine = (
            db.query(SchedinaTorneoGroupStage)
            .filter(SchedinaTorneoGroupStage.tournament_id == tournament_id)
            .all()
        )
    else:
        schedine = (
            db.query(SchedinaTorneo)
            .filter(SchedinaTorneo.tournament_id == tournament_id)
            .all()
        )
    schedina_map = {s.user_id: s for s in schedine}

    result = []
    for player in players:
        user = db.query(User).filter(User.player_id == player.id).first()
        if not user:
            continue
        s = schedina_map.get(user.id)
        result.append(
            ParticipantStatusResponse(
                user_id=user.id,
                username=user.username,
                nickname=player.nickname,
                player_id=player.id,
                has_compiled=s is not None,
                schedina_id=s.id if s else None,
                compiled_at=s.created_at if s else None,
            )
        )

    return result


@router.get(
    "/tournament/{tournament_id}/detail",
    response_model=SchedinaTournamentDetailResponse,
)
def get_tournament_schedine_detail_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    is_privileged = current_user.role in {"admin", "superadmin"}
    deadline_passed = bool(
        tournament.deadline_lock and now_rome() >= tournament.deadline_lock
    )
    include_details = (
        tournament.status in {"da_svolgere", "in_corso", "concluso"}
        or deadline_passed
        or (is_privileged and tournament.status == "concluso")
    )

    result = get_tournament_schedina_detail(
        db, tournament_id, include_details=include_details
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # get_schedine guarda solo SchedinaTorneo (classic): per i tornei
    # group_stage la schedina inviata vive in SchedinaTorneoGroupStage,
    # quindi qui risultava sempre "non compilata" anche dopo l'invio.
    if tournament.tournament_format == "group_stage":
        user_has_predicted = bool(
            get_schedine_deluxe(
                db, user_id=current_user.id, tournament_id=tournament_id
            )
        )
    else:
        user_has_predicted = bool(
            get_schedine(db, user_id=current_user.id, tournament_id=tournament_id)
        )
    result["user_has_predicted"] = user_has_predicted
    return result


@router.get("/all-by-tournament", response_model=AllByTournamentResponse)
def get_all_schedine_by_tournament(
    current_user=Depends(require_roles("superadmin")), db: Session = Depends(get_db)
):
    tournaments = (
        db.query(Tournament)
        .filter(Tournament.status.in_(["in_corso", "finito", "concluso"]))
        .order_by(Tournament.date.desc(), Tournament.id.desc())
        .all()
    )

    result = []
    for t in tournaments:
        # t.participant_ids non è una colonna reale (vedi nota in
        # get_tournament_participants_status): va letta dalla tabella ponte.
        participant_ids = [
            row.player_id
            for row in db.query(TournamentPlayer.player_id)
            .filter(TournamentPlayer.tournament_id == t.id)
            .all()
        ]
        if not participant_ids:
            continue

        users_with_player = (
            db.query(User)
            .filter(
                User.player_id.in_(participant_ids),
                User.player_id.isnot(None),
            )
            .all()
        )
        participant_user_ids = {u.id for u in users_with_player}
        if not participant_user_ids:
            continue

        if t.tournament_format == "group_stage":
            schedine_deluxe = get_schedine_deluxe(db, tournament_id=t.id)
            n_compiled = len(schedine_deluxe)

            all_compiled = n_compiled >= len(participant_user_ids)
            if not all_compiled and t.status not in {"in_corso", "finito", "concluso"}:
                continue

            schedine_entries = []
            for s in schedine_deluxe:
                user = db.query(User).filter(User.id == s.user_id).first()
                player = (
                    db.query(Player).filter(Player.id == user.player_id).first()
                    if user and user.player_id
                    else None
                )
                schedine_entries.append(
                    SchedinaDetailEntry(
                        schedina_id=s.id,
                        user_id=s.user_id,
                        username=user.username if user else f"user-{s.user_id}",
                        nickname=player.nickname if player else None,
                        points=s.total_points or 0,
                        tie_breaker_distance=None,
                        classifica_ordinata=s.classifica_finale_ordinata or [],
                        duello_scelta_id=s.duello_scelta_id,
                        created_at=s.created_at,
                    )
                )
        else:
            schedine = get_schedine(db, tournament_id=t.id)
            n_compiled = len(schedine)

            all_compiled = n_compiled >= len(participant_user_ids)
            if not all_compiled and t.status not in {"in_corso", "finito", "concluso"}:
                continue

            detail = get_tournament_schedina_detail(db, t.id, include_details=True)
            schedine_entries = detail.get("schedine", []) if detail else []

        result.append(
            AllByTournamentEntry(
                tournament_id=t.id,
                tournament_name=t.name,
                tournament_date=t.date,
                tournament_status=t.status,
                n_participants=len(participant_user_ids),
                n_compiled=n_compiled,
                all_compiled=all_compiled,
                schedine=schedine_entries,
            )
        )

    return AllByTournamentResponse(tournaments=result)


@router.get("/me")
def get_my_schedine_activity(
    current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    return {
        "schedine": get_schedine(db, user_id=current_user.id),
        "premi": get_prizes(db, user_id=current_user.id),
        "premio_da_riscattare": get_prizes(db, user_id=current_user.id, redeemed=False),
    }


@router.post("", response_model=SchedinaResponse, status_code=201)
def insert_schedina(
    payload: SchedinaCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Gli amministratori super non possono compilare schedine",
        )
    if not current_user.player_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account non collegato a nessun giocatore",
        )
    is_participant = (
        db.query(TournamentPlayer)
        .filter(
            TournamentPlayer.tournament_id == payload.tournament_id,
            TournamentPlayer.player_id == current_user.player_id,
        )
        .first()
    )
    if not is_participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Non sei un partecipante di questo torneo",
        )
    try:
        return create_schedina(db, current_user.id, payload)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.get("/tournament/{tournament_id}", response_model=list[SchedinaResponse])
def get_tournament_schedine(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "superadmin")),
):
    return get_schedine(db, tournament_id=tournament_id)


@router.post(
    "/tournament/{tournament_id}/settle", response_model=SchedinaSettlementResponse
)
def settle_schedine_for_tournament(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("admin", "superadmin")),
):
    try:
        result = settle_tournament_schedine(db, tournament_id)
        db.commit()
        return result
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.post("/premi/{prize_id}/redeem", response_model=PremioTorneoResponse)
def redeem_prize(
    prize_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)
):
    prize = redeem_tournament_power(db, prize_id, current_user.id)
    if not prize:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Premio non trovato"
        )

    db.commit()
    return prize
