"""
Crea dati di test: tornei classifica unica con spareggi e schedine compilate.
Usa account test (player1..player10) senza modificare tornei esistenti.

Esecuzione:
    $env:PYTHONPATH = "."
    python app/Scripts/build_test_data.py
"""

import random
import sys
from datetime import date, timedelta

from sqlalchemy import func

from app.core.db import SessionLocal
from app.models import (
    Game,
    Circuit,
    Character,
    Player,
    User,
    Tournament,
    Race,
    UserInventory,
)

from app.controllers.tornei.schemas.tournaments import (
    CreateTournament,
    TournamentPlayoffRequest,
)
from app.controllers.tornei.schemas.races import CreateRace
from app.controllers.tornei.schemas.results import CreateResult
from app.controllers.schedine.schemas.schedine import SchedinaCreate
from app.controllers.schedine.schemas.schedine_deluxe import (
    SchedinaTorneoGroupStageCreate,
)
from app.controllers.utenti.schemas.players import CreatePlayer
from app.controllers.utenti.schemas.auth import CreateUser

from app.services.tornei.tournaments import (
    create_tournament,
    activate_tournament_live,
    set_tournament_playoff_winner,
    complete_group_stage_group,
    generate_group_stage_finals,
)
from app.services.tornei.races import create_race
from app.services.tornei.results import create_result
from app.services.schedine.schedine import create_schedina
from app.services.schedine.schedine_deluxe import create_schedina_deluxe
from app.services.utenti.users import create_user
from app.services.utenti.players import create_player
from app.services.cards.inventory import grant_card, consume_inventory_item


PREFIX = "[TEST]"
BASE_DATE = date.today() + timedelta(days=30)
N_RACES = 4


def find_game(db):
    game = db.query(Game).filter(Game.name.ilike("%mario kart%")).first()
    if game:
        return game
    game = db.query(Game).first()
    if game:
        return game
    print("ERRORE: nessun gioco trovato. Esegui prima seed_mk8deluxe.py")
    sys.exit(1)


def get_circuits(db, game_id):
    c = db.query(Circuit).filter(Circuit.game_id == game_id).all()
    if not c:
        print(f"ERRORE: nessun circuito per game_id={game_id}")
        sys.exit(1)
    return c


def get_characters(db, game_id):
    c = db.query(Character).filter(Character.game_id == game_id).all()
    if not c:
        print(f"ERRORE: nessun personaggio per game_id={game_id}")
        sys.exit(1)
    return c


def get_superadmin(db):
    u = db.query(User).filter(User.role == "superadmin").first()
    if not u:
        print("ERRORE: nessun superadmin")
        sys.exit(1)
    return u


def create_test_players_and_users(db):
    players = []
    for i in range(1, 11):
        nickname = f"test_player_{i}"
        existing = db.query(Player).filter(Player.nickname == nickname).first()
        if existing:
            players.append(existing)
            continue

        p = create_player(
            db,
            CreatePlayer(
                first_name=f"Test{i}", last_name=f"Utente{i}", nickname=nickname
            ),
        )
        print(f"  Player '{nickname}' creato (id={p.id})")

        username = f"test_user_{i}"
        if not db.query(User).filter(User.username == username).first():
            create_user(
                db,
                CreateUser(
                    username=username,
                    password="test123",
                    role="user",
                    player_id=p.id,
                    is_active=True,
                ),
            )
            print(f"  User '{username}' creato")
        players.append(p)

    db.commit()
    return players


def get_test_users(db, players):
    return [
        u
        for p in players
        for u in [db.query(User).filter(User.player_id == p.id).first()]
        if u
    ]


def build_schedina(tournament, player_ids):
    ordered = player_ids[:]
    random.shuffle(ordered)
    duello_a = tournament.duello_player_a_id
    duello_b = tournament.duello_player_b_id
    pick = random.choice([duello_a, duello_b, None])
    return SchedinaCreate(
        tournament_id=tournament.id,
        classifica_ordinata=ordered,
        maggiore_streak_vittorie_id=random.choice(player_ids),
        duello_scelta_id=pick,
        duello_pareggio=pick is None,
        spareggio_punti_vincitore=random.randint(30, 60),
    )


def compile_all_schedine(db, tournament, users, player_ids):
    count = 0
    for user in users:
        try:
            create_schedina(db, user.id, build_schedina(tournament, player_ids))
            count += 1
        except ValueError as e:
            print(f"    {user.username}: {e}")
    db.commit()
    print(f"  Schedine compilate: {count}/{len(users)}")


def create_races_and_results(
    db, tournament, circuits, characters, player_ids, tied_top2
):
    used_circuits = []
    n = len(player_ids)

    for race_idx in range(1, N_RACES + 1):
        circuit = random.choice([c for c in circuits if c.id not in used_circuits])
        used_circuits.append(circuit.id)

        race = create_race(
            db,
            CreateRace(
                name=f"Gara {race_idx}",
                race_order=race_idx,
                tournament_id=tournament.id,
                circuit_id=circuit.id,
            ),
        )
        print(f"  Gara {race_idx} (id={race.id}, circuito={circuit.name})")

        positions = [None] * n
        occupied = set()

        if tied_top2:
            p1, p2 = player_ids[0], player_ids[1]
            p1_pos = 0 if race_idx % 2 == 1 else 1
            p2_pos = 1 if race_idx % 2 == 1 else 0
            positions[player_ids.index(p1)] = p1_pos
            positions[player_ids.index(p2)] = p2_pos
            occupied.update([p1_pos, p2_pos])

        remaining = [pos for pos in range(n) if pos not in occupied]
        random.shuffle(remaining)
        ri = 0
        for idx in range(n):
            if positions[idx] is None:
                positions[idx] = remaining[ri]
                ri += 1

        for idx, pid in enumerate(player_ids):
            pos = positions[idx] + 1
            char = random.choice(characters)
            try:
                create_result(
                    db,
                    CreateResult(
                        race_id=race.id,
                        player_id=pid,
                        character_id=char.id,
                        position=pos,
                    ),
                )
            except ValueError as e:
                print(f"    player {pid} pos {pos}: {e}")

    db.commit()

    if tied_top2:
        tie_circuit = random.choice([c for c in circuits if c.id not in used_circuits])
        duello = create_race(
            db,
            CreateRace(
                name="Spareggio 1°/2°",
                race_order=N_RACES + 1,
                tournament_id=tournament.id,
                circuit_id=tie_circuit.id,
                group_name="duello_podio_1_2",
                is_duello=True,
            ),
        )
        print(f"  Gara spareggio (id={duello.id}, circuito={tie_circuit.name})")

        p1, p2 = player_ids[0], player_ids[1]
        for pid, pos in [(p1, 1), (p2, 2)]:
            char = random.choice(characters)
            create_result(
                db,
                CreateResult(
                    race_id=duello.id, player_id=pid, character_id=char.id, position=pos
                ),
            )
        db.commit()
        print(f"  Spareggio: player {p1} vince vs {p2}")


def create_tournament_with_data(
    db, game, circuits, characters, players, users, name_suffix, n_players, tied_top2
):
    selected = players[:n_players]
    pids = [p.id for p in selected]
    selected_users = [u for u in users if u.player_id in pids]

    tname = f"{PREFIX} classifica unica {name_suffix}"
    if (
        db.query(Tournament)
        .filter(func.lower(Tournament.name) == tname.lower())
        .first()
    ):
        print(f"Torneo '{tname}' esiste già. SKIP.")
        return

    t = create_tournament(
        db,
        CreateTournament(
            name=tname,
            n_players=n_players,
            date=BASE_DATE,
            game_id=game.id,
            participant_ids=pids,
            tournament_format="classic",
        ),
        created_by_id=superadmin.id,
    )
    print(f"\n--- Torneo '{tname}' (id={t.id}, {n_players} giocatori) ---")

    db.refresh(t)

    print("  Schedine...")
    compile_all_schedine(db, t, selected_users, pids)

    print("  Attivazione...")
    activate_tournament_live(db, t.id, actor_user_id=superadmin.id)
    db.refresh(t)

    print("  Gare e risultati...")
    create_races_and_results(db, t, circuits, characters, pids, tied_top2)

    print("  Playoff winner...")
    p1, p2 = pids[0], pids[1]
    winner = p1 if tied_top2 else p1
    res, err = set_tournament_playoff_winner(
        db,
        t.id,
        TournamentPlayoffRequest(
            player_one_id=p1,
            player_two_id=p2,
            winner_id=winner,
        ),
    )
    if err and err != "ok":
        print(f"  ERRORE playoff: {err}")
    else:
        db.refresh(t)
        print(f"  Concluso! Vincitore player_id={winner}, status={t.status}")

    return t


def create_race_with_positions(
    db,
    tournament,
    circuits,
    characters,
    race_order,
    name,
    positions_map,
):
    """Create a regular race with specific position assignments.
    All remaining players get the leftover positions randomly.
    """
    used_circuit_ids = [
        r.circuit_id
        for r in db.query(Race.circuit_id)
        .filter(Race.tournament_id == tournament.id)
        .all()
    ]
    available = [c for c in circuits if c.id not in used_circuit_ids]
    circuit = random.choice(available) if available else random.choice(circuits)

    race = create_race(
        db,
        CreateRace(
            name=name,
            race_order=race_order,
            tournament_id=tournament.id,
            circuit_id=circuit.id,
        ),
    )

    n = tournament.n_players
    participant_ids = sorted(tournament.participant_ids)
    positions = [None] * n
    occupied = set()

    for pid, pos in positions_map.items():
        if pid in participant_ids:
            idx = participant_ids.index(pid)
            positions[idx] = pos - 1
            occupied.add(pos - 1)

    remaining = [p for p in range(n) if p not in occupied]
    random.shuffle(remaining)
    ri = 0
    for idx in range(n):
        if positions[idx] is None:
            positions[idx] = remaining[ri]
            ri += 1

    for idx, pid in enumerate(participant_ids):
        pos = positions[idx] + 1
        char = random.choice(characters)
        try:
            create_result(
                db,
                CreateResult(
                    race_id=race.id,
                    player_id=pid,
                    character_id=char.id,
                    position=pos,
                ),
            )
        except ValueError as e:
            print(f"    player {pid} pos {pos}: {e}")

    db.commit()
    return race


def create_duello_race(
    db,
    tournament,
    circuits,
    characters,
    race_order,
    name,
    tied_player_ids,
    group_name,
    winner_idx=0,
    phase=None,
):
    """Create a duello/spareggio race with ONLY the tied players.
    No other players are assigned to this race.
    tied_player_ids: ordered list — first is the winner.
    phase: None for classic, "finals" for group stage finals duelli.
    """
    used_circuit_ids = [
        r.circuit_id
        for r in db.query(Race.circuit_id)
        .filter(Race.tournament_id == tournament.id)
        .all()
    ]
    available = [c for c in circuits if c.id not in used_circuit_ids]
    circuit = random.choice(available) if available else random.choice(circuits)

    race = create_race(
        db,
        CreateRace(
            name=name,
            race_order=race_order,
            tournament_id=tournament.id,
            circuit_id=circuit.id,
            is_duello=True,
            group_name=group_name,
            phase=phase,
        ),
    )

    for pos, pid in enumerate(tied_player_ids, start=1):
        char = random.choice(characters)
        create_result(
            db,
            CreateResult(
                race_id=race.id,
                player_id=pid,
                character_id=char.id,
                position=pos,
            ),
        )

    db.commit()
    winner = tied_player_ids[winner_idx]
    print(f"    {race.name}: {winner} vince")
    return race, winner


def create_group_stage_race_with_positions(
    db,
    tournament,
    circuits,
    characters,
    race_order,
    name,
    phase,
    group_name,
    positions_map,
):
    """Create a group stage race with specific position assignments.
    Only the players in positions_map get results (unlike create_race_with_positions).
    positions_map: {player_id: position, ...} (1-indexed positions).
    """
    used_circuit_ids = [
        r.circuit_id
        for r in db.query(Race.circuit_id)
        .filter(Race.tournament_id == tournament.id)
        .all()
    ]
    available = [c for c in circuits if c.id not in used_circuit_ids]
    circuit = random.choice(available) if available else random.choice(circuits)

    race = create_race(
        db,
        CreateRace(
            name=name,
            race_order=race_order,
            tournament_id=tournament.id,
            circuit_id=circuit.id,
            phase=phase,
            group_name=group_name,
        ),
    )

    for pid, pos in positions_map.items():
        char = random.choice(characters)
        try:
            create_result(
                db,
                CreateResult(
                    race_id=race.id, player_id=pid, character_id=char.id, position=pos
                ),
            )
        except ValueError as e:
            print(f"    player {pid} pos {pos}: {e}")

    db.commit()
    return race


def compile_all_schedine_group_stage(db, tournament, users, groups, pids):
    """Compile group stage schedine for all users."""
    from app.models import SchedinaTorneoGroupStage

    count = 0
    duello_a = tournament.duello_player_a_id
    duello_b = tournament.duello_player_b_id

    sort_by_seed_order = list(groups.keys())
    sort_by_seed_order.sort(key=lambda k: int(k))

    finalisti_ids = []
    classifiche_gironi = {}
    for gk in sort_by_seed_order:
        gplayers = groups[gk]
        classifiche_gironi[gk] = list(gplayers)
        finalisti_ids.extend(gplayers[:2])

    for user in users:
        try:
            existing = (
                db.query(SchedinaTorneoGroupStage)
                .filter(
                    SchedinaTorneoGroupStage.user_id == user.id,
                    SchedinaTorneoGroupStage.tournament_id == tournament.id,
                )
                .first()
            )
            if existing:
                continue

            pick = random.choice([duello_a, duello_b, None])
            create_schedina_deluxe(
                db,
                user.id,
                SchedinaTorneoGroupStageCreate(
                    tournament_id=tournament.id,
                    finalisti_ids=list(finalisti_ids),
                    classifica_finale_ordinata=list(finalisti_ids),
                    classifiche_gironi=classifiche_gironi,
                    duello_scelta_id=pick,
                    duello_pareggio=pick is None,
                    spareggio_distanza=random.randint(5, 20),
                ),
            )
            count += 1
        except ValueError as e:
            print(f"    {user.username}: {e}")
    db.commit()
    print(f"  Schedine compilate: {count}/{len(users)}")


def create_tournament_triple_tie(db, game, circuits, characters, players, users):
    """8-player tournament: top 3 tied, positions 4-5 tied."""
    selected = players[:8]
    pids = [p.id for p in selected]
    selected_users = [u for u in users if u.player_id in pids]

    tname = f"{PREFIX} classifica unica 8 player triple tie"
    if db.query(Tournament).filter(Tournament.name == tname.lower()).first():
        print(f"Torneo '{tname}' esiste già. SKIP.")
        return

    t = create_tournament(
        db,
        CreateTournament(
            name=tname,
            n_players=8,
            date=BASE_DATE,
            game_id=game.id,
            participant_ids=pids,
            tournament_format="classic",
        ),
        created_by_id=superadmin.id,
    )
    print(f"\n--- Torneo '{tname}' (id={t.id}, 8 giocatori) ---")
    db.refresh(t)

    print("  Schedine...")
    compile_all_schedine(db, t, selected_users, pids)

    print("  Attivazione...")
    activate_tournament_live(db, t.id, actor_user_id=superadmin.id)
    db.refresh(t)

    p1, p2, p3 = pids[0], pids[1], pids[2]
    p4, p5 = pids[3], pids[4]
    p6, p7, p8 = pids[5], pids[6], pids[7]

    print("  Gare e risultati (top 3 pari, 4-5 pari)...")
    # Positions per race for top 3: each gets {1,2,6,7} in rotation → 9+7+3+2 = 21pts each
    create_race_with_positions(
        db,
        t,
        circuits,
        characters,
        1,
        "Gara 1",
        {
            p1: 1,
            p2: 2,
            p3: 6,
            p4: 3,
            p5: 4,
        },
    )
    create_race_with_positions(
        db,
        t,
        circuits,
        characters,
        2,
        "Gara 2",
        {
            p1: 2,
            p2: 6,
            p3: 7,
            p4: 4,
            p5: 8,
        },
    )
    create_race_with_positions(
        db,
        t,
        circuits,
        characters,
        3,
        "Gara 3",
        {
            p1: 6,
            p2: 7,
            p3: 1,
            p4: 8,
            p5: 5,
        },
    )
    create_race_with_positions(
        db,
        t,
        circuits,
        characters,
        4,
        "Gara 4",
        {
            p1: 7,
            p2: 1,
            p3: 2,
            p4: 5,
            p5: 3,
        },
    )

    # P1: 9+7+3+2=21, P2: 7+3+2+9=21, P3: 3+2+9+7=21 — all tied
    # P4: 6+5+1+4=16, P5: 5+1+4+6=16 — tied
    print("  Spareggio triple tie (P1,P2,P3)...")
    create_duello_race(
        db,
        t,
        circuits,
        characters,
        5,
        "Spareggio 1°/2°/3°",
        [p1, p2, p3],
        group_name="duello_podio_1_3",
    )

    print("  Spareggio 4°/5°...")
    create_duello_race(
        db,
        t,
        circuits,
        characters,
        6,
        "Spareggio 4°/5°",
        [p4, p5],
        group_name="duello_podio_4_5",
    )

    print("  Playoff winner...")
    res, err = set_tournament_playoff_winner(
        db,
        t.id,
        TournamentPlayoffRequest(player_one_id=p1, player_two_id=p2, winner_id=p1),
    )
    if err and err != "ok":
        print(f"  ERRORE playoff: {err}")
    else:
        db.refresh(t)
        print(f"  Concluso! Vincitore player_id={p1}, status={t.status}")

    return t


def create_tournament_duo_duelli(db, game, circuits, characters, players, users):
    """8-player tournament: P1/P2 tied 1st, P3/P4 tied 3rd."""
    selected = players[:8]
    pids = [p.id for p in selected]
    selected_users = [u for u in users if u.player_id in pids]

    tname = f"{PREFIX} classifica unica 8 player duelli multipli"
    if db.query(Tournament).filter(Tournament.name == tname.lower()).first():
        print(f"Torneo '{tname}' esiste già. SKIP.")
        return

    t = create_tournament(
        db,
        CreateTournament(
            name=tname,
            n_players=8,
            date=BASE_DATE,
            game_id=game.id,
            participant_ids=pids,
            tournament_format="classic",
        ),
        created_by_id=superadmin.id,
    )
    print(f"\n--- Torneo '{tname}' (id={t.id}, 8 giocatori) ---")
    db.refresh(t)

    print("  Schedine...")
    compile_all_schedine(db, t, selected_users, pids)

    print("  Attivazione...")
    activate_tournament_live(db, t.id, actor_user_id=superadmin.id)
    db.refresh(t)

    p1, p2 = pids[0], pids[1]
    p3, p4 = pids[2], pids[3]

    print("  Gare e risultati (1°-2° pari, 3°-4° pari)...")
    # P1,P2: each gets {1,3,5,7} → 9+6+4+2 = 21pts each
    create_race_with_positions(
        db,
        t,
        circuits,
        characters,
        1,
        "Gara 1",
        {
            p1: 1,
            p2: 3,
            p3: 2,
            p4: 4,
        },
    )
    create_race_with_positions(
        db,
        t,
        circuits,
        characters,
        2,
        "Gara 2",
        {
            p1: 3,
            p2: 1,
            p3: 4,
            p4: 2,
        },
    )
    create_race_with_positions(
        db,
        t,
        circuits,
        characters,
        3,
        "Gara 3",
        {
            p1: 5,
            p2: 7,
            p3: 6,
            p4: 8,
        },
    )
    create_race_with_positions(
        db,
        t,
        circuits,
        characters,
        4,
        "Gara 4",
        {
            p1: 7,
            p2: 5,
            p3: 8,
            p4: 6,
        },
    )

    # P1: 9+6+4+2=21, P2: 6+9+2+4=21 — tied
    # P3: 7+5+3+1=16, P4: 5+7+1+3=16 — tied

    print("  Spareggio 1°/2°...")
    create_duello_race(
        db,
        t,
        circuits,
        characters,
        5,
        "Spareggio 1°/2°",
        [p1, p2],
        group_name="duello_podio_1_2",
    )

    print("  Spareggio 3°/4°...")
    create_duello_race(
        db,
        t,
        circuits,
        characters,
        6,
        "Spareggio 3°/4°",
        [p3, p4],
        group_name="duello_podio_3_4",
    )

    print("  Playoff winner...")
    res, err = set_tournament_playoff_winner(
        db,
        t.id,
        TournamentPlayoffRequest(player_one_id=p1, player_two_id=p2, winner_id=p1),
    )
    if err and err != "ok":
        print(f"  ERRORE playoff: {err}")
    else:
        db.refresh(t)
        print(f"  Concluso! Vincitore player_id={p1}, status={t.status}")

    return t


def create_tournament_group_stage(
    db, game, circuits, characters, players, users, n_players
):
    """Create a group stage tournament with schedine and duelli."""

    selected = players[:n_players]
    pids = [p.id for p in selected]
    selected_users = [u for u in users if u.player_id in pids]

    tname = f"{PREFIX} group stage {n_players} player"
    if (
        db.query(Tournament)
        .filter(func.lower(Tournament.name) == tname.lower())
        .first()
    ):
        print(f"Torneo '{tname}' esiste gia. SKIP.")
        return

    t = create_tournament(
        db,
        CreateTournament(
            name=tname,
            n_players=n_players,
            date=BASE_DATE,
            game_id=game.id,
            participant_ids=pids,
            tournament_format="group_stage",
        ),
        created_by_id=superadmin.id,
    )
    print(f"\n--- Torneo '{tname}' (id={t.id}, {n_players} giocatori) ---")
    db.refresh(t)

    groups: dict = t.format_data["groups"]
    group_keys = sorted(groups.keys(), key=lambda k: int(k))
    print(f"  Gironi: {', '.join(f'{k}({len(groups[k])})' for k in group_keys)}")

    print("  Schedine...")
    compile_all_schedine_group_stage(db, t, selected_users, groups, pids)

    print("  Attivazione...")
    activate_tournament_live(db, t.id, actor_user_id=superadmin.id)
    db.refresh(t)

    N_GROUP_RACES = 2
    race_order = 1

    print("  Gare gironi...")
    for gk in group_keys:
        gplayers = list(groups[gk])
        for ri in range(1, N_GROUP_RACES + 1):
            pos_map = {pid: i + 1 for i, pid in enumerate(gplayers)}
            create_group_stage_race_with_positions(
                db,
                t,
                circuits,
                characters,
                race_order,
                f"Girone {gk} - Gara {ri}",
                "group",
                gk,
                pos_map,
            )
            race_order += 1

    print("  Completamento gironi...")
    for gk in group_keys:
        complete_group_stage_group(db, t.id, gk)

    print("  Generazione fase successiva...")
    result = generate_group_stage_finals(db, t.id, actor_user_id=superadmin.id)
    db.refresh(t)

    if result.get("stage") == "semifinal":
        semis = t.format_data["semifinals"]
        semi_keys = sorted(
            semis.keys(), key=lambda k: int(k[1:]) if k[1:].isdigit() else 0
        )
        print(f"  Semifinali: {', '.join(f'{k}({len(semis[k])})' for k in semi_keys)}")

        print("  Gare semifinali...")
        for sk in semi_keys:
            splayers = list(semis[sk])
            for ri in range(1, N_GROUP_RACES + 1):
                pos_map = {pid: i + 1 for i, pid in enumerate(splayers)}
                create_group_stage_race_with_positions(
                    db,
                    t,
                    circuits,
                    characters,
                    race_order,
                    f"Semifinale {sk} - Gara {ri}",
                    "semifinal",
                    sk,
                    pos_map,
                )
                race_order += 1

        print("  Generazione finale...")
        generate_group_stage_finals(db, t.id, actor_user_id=superadmin.id)
        db.refresh(t)

    finals = t.format_data.get("finals") or {}
    top_ids = finals.get("top", [])
    bottom_ids = finals.get("bottom", [])
    print(f"  Finale: top={len(top_ids)} giocatori, bottom={len(bottom_ids)} giocatori")

    p1, p2, p3, p4 = top_ids[:4]

    print("  Gare finale...")
    create_group_stage_race_with_positions(
        db,
        t,
        circuits,
        characters,
        race_order,
        "Finale - Gara 1",
        "finals",
        "top",
        {p1: 1, p2: 2, p3: 3, p4: 4},
    )
    race_order += 1
    create_group_stage_race_with_positions(
        db,
        t,
        circuits,
        characters,
        race_order,
        "Finale - Gara 2",
        "finals",
        "top",
        {p2: 1, p1: 2, p4: 3, p3: 4},
    )
    race_order += 1

    print("  Spareggi finale...")
    create_duello_race(
        db,
        t,
        circuits,
        characters,
        race_order,
        "Spareggio 1/2 Finale",
        [p1, p2],
        group_name="finals_duello_podio_1_2",
        phase="finals",
    )
    race_order += 1
    create_duello_race(
        db,
        t,
        circuits,
        characters,
        race_order,
        "Spareggio 3/4 Finale",
        [p3, p4],
        group_name="finals_duello_podio_3_4",
        phase="finals",
    )
    race_order += 1

    print("  Playoff winner...")
    res, err = set_tournament_playoff_winner(
        db,
        t.id,
        TournamentPlayoffRequest(
            player_one_id=p1,
            player_two_id=p2,
            winner_id=p1,
        ),
    )
    if err and err != "ok":
        print(f"  ERRORE playoff: {err}")
    else:
        db.refresh(t)
        print(f"  Concluso! Vincitore player_id={p1}, status={t.status}")

    return t


def grant_and_use_cards(db, game, players, tournaments):
    """Grant cards to some players and mark them as used (without effects)."""
    print("\n--- Test carte potere ---")

    card_assignments = [
        ("master", "Carta Master"),
        ("blue_shell", "Carta Guscio Blu"),
        ("master", "Carta Master"),
        ("blue_shell", "Carta Guscio Blu"),
        ("master", "Carta Master"),
    ]

    used_any = False
    for idx, t in enumerate(tournaments):
        if t is None:
            continue
        card_type, label = card_assignments[idx % len(card_assignments)]

        race = (
            db.query(Race)
            .filter(Race.tournament_id == t.id, Race.is_duello == False)
            .order_by(Race.race_order)
            .first()
        )

        p_idx = idx % len(players)
        player_id = players[p_idx].id
        user = db.query(User).filter(User.player_id == player_id).first()
        if not user:
            print(f"  Nessun utente per player_id={player_id}")
            continue

        item = grant_card(db, user.id, card_type, source_tournament_id=t.id)
        item.game_id = game.id
        db.flush()
        print(
            f"  Assegnata {label} a {players[p_idx].nickname} (inventory_id={item.id})"
        )

        used = consume_inventory_item(
            db,
            item.id,
            user.id,
            race_id=race.id if race else None,
        )
        if used:
            used_any = True
            print(
                f"    Usata! consumed_at={used.consumed_at}, race_id={used.consumed_in_race_id}"
            )
        else:
            print(f"    ERRORE: impossibile usare la carta")

    db.commit()
    if used_any:
        print("  [OK] Carte test completato")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        print("=== BUILD TEST DATA ===")

        game = find_game(db)
        circuits = get_circuits(db, game.id)
        characters = get_characters(db, game.id)
        print(
            f"Gioco: {game.name} (id={game.id}, {len(circuits)} circuiti, {len(characters)} personaggi)"
        )

        global superadmin
        superadmin = get_superadmin(db)

        print("\nCreazione player/user test...")
        players = create_test_players_and_users(db)
        users = get_test_users(db, players)

        # Elimina tornei errati da run precedenti
        for old_id in [78, 79, 86, 87, 88, 93, 94, 95, 96, 97, 98, 99]:
            old = db.query(Tournament).filter(Tournament.id == old_id).first()
            if old:
                print(f"  Elimino torneo errato '{old.name}' (id={old.id})...")
                from app.models import (
                    Result,
                    SchedinaTorneo,
                    SchedinaTorneoGroupStage,
                    PremioTorneo,
                    PlayoffHistory,
                    Notification,
                    UserInventory,
                    TournamentPlayer,
                )

                race_ids = [
                    r.id
                    for r in db.query(Race).filter(Race.tournament_id == old.id).all()
                ]
                # Clear consumed_in_race_id references first (FK to races)
                db.query(UserInventory).filter(
                    UserInventory.consumed_in_race_id.in_(race_ids)
                ).update({"consumed_in_race_id": None}, synchronize_session=False)
                db.query(UserInventory).filter(
                    UserInventory.source_tournament_id == old.id
                ).delete(synchronize_session=False)
                db.query(Result).filter(Result.race_id.in_(race_ids)).delete(
                    synchronize_session=False
                )
                db.query(Race).filter(Race.tournament_id == old.id).delete()
                db.query(TournamentPlayer).filter(
                    TournamentPlayer.tournament_id == old.id
                ).delete()
                db.query(SchedinaTorneo).filter(
                    SchedinaTorneo.tournament_id == old.id
                ).delete()
                db.query(SchedinaTorneoGroupStage).filter(
                    SchedinaTorneoGroupStage.tournament_id == old.id
                ).delete()
                db.query(PremioTorneo).filter(
                    PremioTorneo.torneo_sorgente_id == old.id
                ).delete()
                db.query(PlayoffHistory).filter(
                    PlayoffHistory.tournament_id == old.id
                ).delete()
                db.query(Notification).filter(
                    Notification.source_tournament_id == old.id
                ).delete()
                db.delete(old)
                db.commit()
                print(f"    Eliminato.")

        t1 = create_tournament_with_data(
            db,
            game,
            circuits,
            characters,
            players,
            users,
            name_suffix="9 player spareggio",
            n_players=9,
            tied_top2=True,
        )
        t2 = create_tournament_with_data(
            db,
            game,
            circuits,
            characters,
            players,
            users,
            name_suffix="10 player spareggio",
            n_players=10,
            tied_top2=True,
        )

        t3 = create_tournament_triple_tie(
            db, game, circuits, characters, players, users
        )
        t4 = create_tournament_duo_duelli(
            db, game, circuits, characters, players, users
        )

        t5 = create_tournament_group_stage(
            db, game, circuits, characters, players, users, 8
        )
        t6 = create_tournament_group_stage(
            db, game, circuits, characters, players, users, 9
        )
        t7 = create_tournament_group_stage(
            db, game, circuits, characters, players, users, 10
        )

        existing_tournaments = [
            t for t in [t1, t2, t3, t4, t5, t6, t7] if t is not None
        ]
        if existing_tournaments:
            grant_and_use_cards(db, game, players, existing_tournaments)

        print("\n=== BUILD COMPLETATO ===")

    except Exception as e:
        db.rollback()
        print(f"\nERRORE FATALE: {e}")
        raise
    finally:
        db.close()
