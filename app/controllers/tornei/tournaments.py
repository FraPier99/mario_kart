from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import require_roles
from app.controllers.tornei.schemas.stats import LeaderBoardResponse
from app.services.tornei.stats import get_leaderboard as fetch_leaderboard
from app.services.tornei.tournaments import (
    complete_group_stage_group,
    reopen_group_stage_group,
    create_tournament,
    activate_tournament_live,
    lock_tournament_schedine,
    getAllTournaments,
    get_tournament,
    set_tournament_playoff_winner,
    undo_last_playoff,
    tournament_delete,
    update_tournament,
    generate_group_stage_finals,
    seed_group_stage,
    set_player_withdrawal,
    set_tournament_pass_enabled,
    get_group_stage_ties,
    get_group_stage_classifiche,
    get_classic_podium_ties,
    get_finals_podium_ties,
    get_consolation_podium_ties,
    decree_consolation_winner,
    get_group_stage_overall_classifica,
    get_tournament_resolution_notes,
    get_tournament_overview,
    get_tournament_audit,
)
from app.controllers.tornei.schemas.tournaments import (
    CompleteGroupRequest,
    CreateTournament,
    PassCircuitsRequest,
    SetPlayerWithdrawal,
    TournamentPlayoffRequest,
    TournamentResponse,
    UpdateTournament,
)


router = APIRouter(prefix="/tournaments", tags=["Tournaments"])


@router.get("", response_model=list[TournamentResponse])
def get_all_tournaments(response: Response, db: Session = Depends(get_db)):
    # Cache breve e non i 60s usati per /gallery e /players: questo endpoint
    # è anche il bersaglio del polling 20s che tiene live un torneo "in
    # corso" (TournamentDetail.jsx) — una cache più lunga lo renderebbe
    # silenziosamente inutile per metà dei tick. 10s aiuta comunque le
    # chiamate ravvicinate (più componenti che lo richiamano nello stesso
    # istante) senza intaccare quella freschezza.
    response.headers["Cache-Control"] = "public, max-age=10"
    return getAllTournaments(db)


@router.post("", response_model=TournamentResponse, status_code=201)
def insert_tournament(
    tmentData: CreateTournament,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        return create_tournament(db, tmentData, created_by_id=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esiste già un torneo con questo nome o data",
        )


@router.put("/{tournament_id}", response_model=TournamentResponse)
def update_t_by_id(
    tournament_id: int,
    tmentData: UpdateTournament,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        updated_tournament = update_tournament(db, tmentData, tournament_id)

        if not updated_tournament:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tournament with id {tournament_id} not found",
            )

        return updated_tournament
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tournament with this name already exists",
        )


@router.delete("/{tournament_id}", response_model=TournamentResponse)
def delete_tournament_by_id(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    try:
        tournament = tournament_delete(db, tournament_id)

        if not tournament:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tournament with id {tournament_id} not found",
            )

        return tournament
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete tournament: it has related data that could not be removed.",
        )


@router.post("/{tournament_id}/activate-live", response_model=TournamentResponse)
def activate_tournament_live_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    tournament = activate_tournament_live(
        db, tournament_id, actor_user_id=current_user.id
    )
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with id {tournament_id} not found",
        )
    return tournament


@router.post("/{tournament_id}/close-schedine", response_model=TournamentResponse)
def close_schedine_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """
    Chiusura manuale delle schedine (override SuperAdmin), in anticipo rispetto
    alla prima gara. Blocca la compilazione senza avviare il torneo.
    """
    tournament = lock_tournament_schedine(db, tournament_id)
    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with id {tournament_id} not found",
        )
    return tournament


@router.patch(
    "/{tournament_id}/players/{player_id}/withdrawal", response_model=TournamentResponse
)
def set_player_withdrawal_endpoint(
    tournament_id: int,
    player_id: int,
    payload: SetPlayerWithdrawal,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """
    Segna o reintegra un partecipante come 'Giocatore Ritirato'.
    Non tocca i risultati già registrati: esclude solo il giocatore dal pool
    per le gare ancora da disputare.
    """
    try:
        tournament = set_player_withdrawal(
            db, tournament_id, player_id, payload.withdrawn
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with id {tournament_id} not found",
        )
    return tournament


@router.get("/{tournament_id}", response_model=TournamentResponse)
def get_tournament_by_id(tournament_id: int, db: Session = Depends(get_db)):
    tournament = get_tournament(db, tournament_id)

    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with id {tournament_id} not found",
        )

    return tournament


@router.get("/{tournament_id}/leaderboard", response_model=list[LeaderBoardResponse])
def get_tournament_leaderboard(tournament_id: int, db: Session = Depends(get_db)):
    leaderboard = fetch_leaderboard(db, tournament_id)

    if not leaderboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No results for this tournament",
        )

    return leaderboard


@router.post("/{tournament_id}/playoff", response_model=TournamentResponse)
def set_playoff_winner(
    tournament_id: int,
    playoffData: TournamentPlayoffRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    tournament, outcome = set_tournament_playoff_winner(db, tournament_id, playoffData)

    # NOTA: ogni ramo d'errore del service restituisce tournament=None, quindi
    # il controllo di "non trovato" deve guardare solo `outcome` — un
    # `or not tournament` qui intercetterebbe (a torto) anche tutti gli altri
    # esiti d'errore sotto, che diventerebbero irraggiungibili.
    if outcome == "tournament_not_found":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with id {tournament_id} not found",
        )

    if outcome == "winner_already_set":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tournament already has a winner",
        )

    if outcome == "invalid_winner":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Playoff winner must be one of the two selected players",
        )

    if outcome == "invalid_participants":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected players are not part of this tournament",
        )

    if outcome == "winner_is_withdrawn":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossibile decretare vincitore un giocatore ritirato dal torneo",
        )

    if not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with id {tournament_id} not found",
        )

    return tournament


@router.post("/{tournament_id}/pass-circuits", response_model=TournamentResponse)
def set_pass_circuits_endpoint(
    tournament_id: int,
    body: PassCircuitsRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """
    Attiva/disattiva l'inclusione dei circuiti a pass/DLC per uno scope
    (torneo classic: 'classic'; torneo a gironi: 'group:<key>',
    'semifinal:<key>', 'finals:top'/'finals:bottom'). Utilizzabile in
    qualsiasi momento del torneo, per entrambi i formati.
    """
    tournament = set_tournament_pass_enabled(
        db, tournament_id, body.scope_key, body.enabled
    )
    if not tournament:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Torneo non trovato")
    return tournament


@router.post("/{tournament_id}/group-stage/seed")
def seed_groups_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """
    Assegna i partecipanti a Girone A e B via snake-draft sul ranking storico (stesso gioco).
    Persiste in tournament.format_data (advisory — non vincola le gare).
    """
    try:
        return seed_group_stage(db, tournament_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{tournament_id}/group-stage/complete-group")
def complete_group_endpoint(
    tournament_id: int,
    body: CompleteGroupRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """
    Marca un girone come completato. Previene ulteriori modifiche a quel
    girone e, quando tutti i gironi sono completati, sblocca il pulsante
    'Genera fase successiva'.
    """
    try:
        return complete_group_stage_group(db, tournament_id, body.group_key)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{tournament_id}/group-stage/reopen-group")
def reopen_group_endpoint(
    tournament_id: int,
    body: CompleteGroupRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """
    Riapre un girone già chiuso (es. chiuso per errore senza gare, o ne manca
    ancora qualcuna) — permesso solo se la fase successiva non è già stata
    generata da questi dati.
    """
    try:
        return reopen_group_stage_group(db, tournament_id, body.group_key)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{tournament_id}/group-stage/ties")
def group_stage_ties_endpoint(tournament_id: int, db: Session = Depends(get_db)):
    """
    Verifica se la classifica della fase corrente (gironi o semifinali) presenta
    pareggi al posto di qualificazione: in tal caso serve uno Spareggio
    (primo a 2 vittorie, piste random) prima di poter avanzare di fase.
    Visibile a tutti gli utenti (informativo, nessuna azione esposta qui).
    """
    try:
        return get_group_stage_ties(db, tournament_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{tournament_id}/group-stage/classifiche")
def group_stage_classifiche_endpoint(tournament_id: int, db: Session = Depends(get_db)):
    """
    Classifica risolta di ogni girone e batteria di semifinale (riordinata
    secondo l'esito degli eventuali spareggi di qualificazione). A differenza
    di /group-stage/ties, qui l'ordine resta disponibile anche dopo che lo
    spareggio è stato risolto o il torneo è avanzato di fase. Visibile a
    tutti gli utenti.
    """
    return get_group_stage_classifiche(db, tournament_id)


@router.get("/{tournament_id}/classic-ties")
def classic_podium_ties_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """
    Verifica se la classifica generale di un torneo classic presenta pareggi
    in posizione 1°/2° o 3°/4°: in tal caso serve uno Spareggio podio
    (best-of-3 per 1°/2°, gara secca per 3°/4°) prima di poter chiudere il torneo.
    """
    try:
        return get_classic_podium_ties(db, tournament_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{tournament_id}/finals-ties")
def finals_podium_ties_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """
    Verifica se la classifica della Finale (Final 4) di un torneo a gironi
    presenta pareggi in posizione 1°/2° o 3°/4°: in tal caso serve uno
    Spareggio podio (best-of-3 per 1°/2°, gara secca per 3°/4°) prima di
    poter chiudere il torneo.
    """
    try:
        return get_finals_podium_ties(db, tournament_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{tournament_id}/consolation-ties")
def consolation_podium_ties_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """
    Verifica se la classifica della Consolazione/"Finalina" di un torneo a
    gironi presenta pareggi in posizione 1°/2° o 3°/4° (della Consolazione,
    cioè 5°/6° o 7°/8° posto generale): in tal caso serve uno Spareggio
    podio, DISTINTO da quello della Finale (group_name dedicati), prima di
    poter considerare definitiva la classifica generale.
    """
    try:
        return get_consolation_podium_ties(db, tournament_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{tournament_id}/decree-consolation-winner")
def decree_consolation_winner_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """
    Calcola e assegna automaticamente il vincitore della Consolazione/
    "Finalina" dalla classifica reale — sostituisce la scelta manuale.
    """
    try:
        return decree_consolation_winner(db, tournament_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{tournament_id}/group-stage/overall-classifica")
def group_stage_overall_classifica_endpoint(
    tournament_id: int, db: Session = Depends(get_db)
):
    """
    Classifica generale combinata di un torneo a gironi: Finale (1°-4°,
    riordinata secondo gli eventuali spareggi podio) seguita dalla
    Consolazione/"Finalina" (5°-N). Vuota se la Finale non è ancora composta.
    Visibile a tutti gli utenti.
    """
    try:
        return {"order": get_group_stage_overall_classifica(db, tournament_id)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{tournament_id}/resolution-notes")
def resolution_notes_endpoint(tournament_id: int, db: Session = Depends(get_db)):
    """
    Note automatiche che spiegano come gli spareggi (gironi, semifinali e
    podio) hanno determinato l'ordine della classifica finale. Visibili a
    tutti gli utenti nella classifica finale del torneo.
    """
    try:
        return {"notes": get_tournament_resolution_notes(db, tournament_id)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{tournament_id}/overview")
def tournament_overview_endpoint(tournament_id: int, db: Session = Depends(get_db)):
    """
    Informazioni riassuntive del torneo (stato, fase, partecipanti, gironi,
    gare, schedine, timeline di avanzamento). Visibili a tutti gli utenti.
    """
    try:
        return get_tournament_overview(db, tournament_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{tournament_id}/audit")
def tournament_audit_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """
    Informazioni di audit (creazione, ultimo avanzamento di fase, attività
    recenti). Riservate ad Admin e SuperAdmin.
    """
    try:
        return get_tournament_audit(db, tournament_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{tournament_id}/group-stage/generate-finals")
def generate_finals_endpoint(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    """
    Calcola Final 4 e Consolazione dai risultati di Fase 1 (phase='group').
    Restituisce classifiche e composizione dei gruppi finali.
    """
    try:
        return generate_group_stage_finals(
            db, tournament_id, actor_user_id=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{tournament_id}/playoff/undo", response_model=TournamentResponse)
def undo_playoff(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles("superadmin", "admin")),
):
    tournament, outcome = undo_last_playoff(db, tournament_id)

    if outcome == "tournament_not_found" or not tournament:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tournament with id {tournament_id} not found",
        )

    if outcome == "no_history":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No playoff history to undo",
        )

    return tournament
