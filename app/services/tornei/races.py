from sqlalchemy.orm import Session
from app.models import Race, Tournament, TournamentPlayer
from app.controllers.tornei.schemas.races import CreateRace, UpdateRace
from app.data.punteggi import PUNTEGGI_CONFIG


def get_races(db: Session):
    # Senza order_by l'ordine delle righe non è garantito (dipende dal piano
    # di query/storage fisico, non dall'ordine di inserimento) — i consumer
    # frontend (es. RaceList.jsx) derivano da questo l'ordine cronologico
    # delle gare per girone, quindi un ordine non deterministico può mostrare
    # "Gara 2 Girone 1" prima di "Gara 1 Girone 1" pur avendo i race_order
    # corretti.
    return db.query(Race).order_by(Race.race_order.asc()).all()


def _group_stage_race_roster_size(format_data: dict | None, phase: str | None, group_name: str | None) -> int | None:
    """
    Numero di piloti assegnati a un girone/batteria/fase di un torneo a
    gironi, secondo format_data — usato per congelare Race.active_player_count
    (vedi sotto) invece di lasciarlo ricadere su tournament.n_players (il
    totale iscritti al torneo, quasi sempre molto più alto dei 2-4 piloti
    che corrono davvero in quella gara). None se non risolvibile (girone/
    batteria non ancora seedato, o group_name sconosciuto) — il chiamante
    ricade su tournament.n_players in quel caso, comportamento invariato.
    """
    fd = format_data or {}
    if not group_name:
        return None
    if phase == "group":
        roster = (fd.get("groups") or {}).get(group_name)
    elif phase == "semifinal":
        roster = (fd.get("semifinals") or {}).get(group_name)
    elif phase == "finals":
        finals = fd.get("finals") or {}
        if group_name == "top":
            roster = finals.get("top")
        elif group_name == "bottom":
            roster = finals.get("bottom")
        elif group_name.startswith("bottom_"):
            # Batterie della Finalina quando la Consolazione supera
            # MAX_GROUP_SIZE: il Race.group_name è "bottom_B1"/"bottom_B2"/…
            # ma le chiavi in format_data.finals.bottom_heats sono nude
            # ("B1"/"B2"/…, vedi _distribute_to_heats) — va tolto il
            # prefisso "bottom_" per trovare la batteria giusta.
            heat_key = group_name[len("bottom_"):]
            roster = (finals.get("bottom_heats") or {}).get(heat_key)
        else:
            roster = None
    else:
        roster = None
    return len(roster) if roster else None


def create_race(db: Session, race_data: CreateRace):

    if race_data.is_duello and race_data.group_name:
        from app.services.tornei.tournaments import (
            get_classic_podium_ties,
            get_finals_podium_ties,
            DUELLO_PODIO_1_2,
            DUELLO_PODIO_3_4,
        )

        if race_data.group_name.startswith("duello_podio_"):
            ties = get_classic_podium_ties(db, race_data.tournament_id)
            block = None
            if race_data.group_name == DUELLO_PODIO_1_2:
                block = ties.get("top2")
            elif race_data.group_name == DUELLO_PODIO_3_4:
                block = ties.get("top4")
            else:
                block = next(
                    (
                        b
                        for b in ties.get("others", [])
                        if b.get("group_name") == race_data.group_name
                    ),
                    None,
                )
            if block and block.get("order") is not None:
                raise ValueError(f"Duello già risolto per {race_data.group_name}")
        elif race_data.phase == "finals" and race_data.group_name.startswith(
            "finals_duello_podio_"
        ):
            ties = get_finals_podium_ties(db, race_data.tournament_id)
            block = ties.get("top2") or ties.get("top4")
            if block and block.get("order") is not None:
                raise ValueError(f"Duello già risolto per {race_data.group_name}")

    tournament = db.query(Tournament).filter(Tournament.id == race_data.tournament_id).first()

    # Un girone completato (format_data.completed_groups) o una batteria di
    # semifinale già consumata dalla Finale (format_data.finals.top popolato)
    # non devono più accettare nuove gare: altrimenti i punti di una gara
    # aggiunta dopo la chiusura continuano a contare nella classifica di
    # quel girone/batteria (letta da _group_standings/_classifica_girone),
    # pur non essendo più raggiungibile dal form di inserimento normale —
    # un bug osservato in produzione (semifinale chiusa, Finale generata,
    # ma gare ancora inseribili nella batteria di semifinale). Il duello di
    # spareggio per risolvere un pareggio di qualificazione usa sempre un
    # group_name diverso (es. "duello_podio_2_3"), mai la chiave nuda del
    # girone/batteria, quindi non è mai bloccato da questo controllo — e
    # comunque deve risolversi PRIMA che il girone/batteria venga chiuso o
    # che la Finale venga generata (generate_group_stage_finals rifiuta di
    # procedere in presenza di pareggi non risolti).
    if tournament and tournament.tournament_format == "group_stage" and not race_data.is_duello:
        fd = tournament.format_data or {}
        if race_data.phase == "group":
            completed_groups = set(fd.get("completed_groups") or [])
            if race_data.group_name in completed_groups:
                raise ValueError(
                    f"Il girone {race_data.group_name} è già stato completato: "
                    "non è più possibile aggiungere gare. Riapri il girone se serve modificarlo."
                )
        elif race_data.phase == "semifinal":
            if (fd.get("finals") or {}).get("top"):
                raise ValueError(
                    "La Finale è già stata generata dalle semifinali: non è più "
                    "possibile aggiungere gare alle batterie di semifinale."
                )

    # Congela il numero di piloti della gara al momento della creazione —
    # vedi Race.active_player_count, letta da create_result/update_result
    # (app/services/tornei/results.py) per scegliere la riga giusta di
    # PUNTEGGI_CONFIG. Senza questo, ogni gara di girone/semifinale/finale
    # ricadeva su tournament.n_players (il totale iscritti al torneo, es.
    # 16) invece dei 2-4 piloti realmente in gara in quel girone — punti
    # sistematicamente sbagliati per OGNI gara di un torneo a gironi mai
    # giocata finora (bug pre-esistente, segnalato qui ma mai risolto).
    active_player_count = None
    if tournament and tournament.tournament_format == "group_stage":
        active_player_count = _group_stage_race_roster_size(
            tournament.format_data, race_data.phase, race_data.group_name
        )
    elif tournament and tournament.tournament_format == "classic":
        withdrawn_count = (
            db.query(TournamentPlayer)
            .filter(
                TournamentPlayer.tournament_id == tournament.id,
                TournamentPlayer.withdrawn.is_(True),
            )
            .count()
        )
        active_player_count = tournament.n_players - withdrawn_count

    new_race = Race(**race_data.model_dump(), active_player_count=active_player_count)
    db.add(new_race)
    db.commit()
    db.refresh(new_race)

    return new_race


def delete_race(db: Session, race_id: int):

    race = db.query(Race).filter(Race.id == race_id).first()

    if not race:
        return None
    db.delete(race)
    db.commit()
    return race


def get_race(db: Session, race_id: int):

    race = db.query(Race).filter(Race.id == race_id).first()

    if not race:
        return None

    return race


def update_race(db: Session, raceData: UpdateRace, race_id: int):

    race = db.query(Race).filter(Race.id == race_id).first()

    if not race:
        return None

    update_race = raceData.model_dump(exclude_unset=True)

    for key, value in update_race.items():
        setattr(race, key, value)

    db.commit()
    db.refresh(race)

    return race


def reorder_race_results(db: Session, race_id: int, assignments: list[dict]):
    """Riassegna posizione e personaggio di più risultati della STESSA gara in
    un'unica transazione (un solo commit finale, non uno per riga).

    Necessario perché il vincolo unique_position_per_race è DEFERRABLE
    INITIALLY DEFERRED (vedi bootstrap.py): riordinando via singole PUT
    /results/{id} indipendenti — ciascuna la propria transazione — uno
    scambio di posizione (es. 1° <-> 2°) fa quasi sempre collidere
    temporaneamente la nuova posizione di un risultato con quella non ancora
    aggiornata di un altro, perché il vincolo differito si applica solo
    all'interno di una singola transazione, non tra richieste separate.
    Facendo tutti gli UPDATE qui e un solo commit alla fine, lo stato
    intermedio (non ancora valido) non viene mai controllato.

    assignments: [{"result_id": int, "position": int, "character_id": int}, ...]
    """
    race = db.query(Race).filter(Race.id == race_id).first()
    if not race or not race.tournament:
        return None

    total_player = race.active_player_count if race.active_player_count is not None else race.tournament.n_players
    results_by_id = {r.id: r for r in race.results}

    updated = []
    for item in assignments:
        result = results_by_id.get(item["result_id"])
        if not result:
            raise ValueError("Result not found for this race")

        result.position = item["position"]
        result.character_id = item["character_id"]
        try:
            result.points = PUNTEGGI_CONFIG[total_player][result.position - 1]
        except KeyError:
            raise ValueError("Invalid Tournament Size")
        except IndexError:
            raise ValueError("Invalid Position")
        updated.append(result)

    db.commit()
    for result in updated:
        db.refresh(result)

    return updated
