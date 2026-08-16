from sqlalchemy import inspect, text

from app.core.db import engine
from app.core.config import DEFAULT_SUPERADMIN_PASSWORD, DEFAULT_SUPERADMIN_USERNAME
from app.data.circuits import all_circuits as SEED_CIRCUITS
from app.data.mk8deluxe import MK8D_CIRCUITS, MK8D_GAME_NAME, MK8D_GAME_DESCRIPTION
from app.models import Base
from app.services.utenti.users import create_user, get_user_by_username
from app.controllers.utenti.schemas.auth import CreateUser


def create_tables():
    Base.metadata.create_all(bind=engine)


def ensure_player_img_url_column():
    inspector = inspect(engine)
    player_columns = {
        column_info["name"] for column_info in inspector.get_columns("players")
    }

    if "img_url" not in player_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE players ADD COLUMN img_url TEXT"))


def ensure_character_img_url_column():
    inspector = inspect(engine)
    character_columns = {
        column_info["name"] for column_info in inspector.get_columns("characters")
    }

    if "img_url" not in character_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE characters ADD COLUMN img_url TEXT"))


def ensure_user_virtual_coins_column():
    inspector = inspect(engine)
    user_columns = {
        column_info["name"] for column_info in inspector.get_columns("users")
    }

    if "virtual_coins" not in user_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN virtual_coins INTEGER NOT NULL DEFAULT 100"
                )
            )


# def seed_circuits():
#     with engine.begin() as connection:
#         result = connection.execute(
#             text("SELECT COUNT(*) FROM circuits WHERE game_id = 1")
#         )
#         count = result.scalar()

#         if count == 0:
#             for circuit in SEED_CIRCUITS:
#                 connection.execute(
#                     text(
#                         "INSERT INTO circuits (name, description, game_id, image_url) VALUES (:name, :description, :game_id, :image_url)"
#                         " ON CONFLICT (name, game_id) DO NOTHING"
#                     ),
#                     {
#                         "name": circuit["name"],
#                         "description": circuit["description"],
#                         "game_id": circuit["game_id"],
#                         "image_url": circuit.get("image_url"),
#                     },
#                 )


def seed_mk8d_data():
    """Inserisce il gioco MK8D e i suoi circuiti se non presenti."""
    with engine.begin() as connection:
        # get or create MK8D game
        result = connection.execute(
            text("SELECT id FROM games WHERE name = :name"),
            {"name": MK8D_GAME_NAME},
        )
        game = result.fetchone()
        if game is None:
            result = connection.execute(
                text(
                    "INSERT INTO games (name, description) VALUES (:name, :desc) RETURNING id"
                ),
                {"name": MK8D_GAME_NAME, "desc": MK8D_GAME_DESCRIPTION},
            )
            game_id = result.scalar()
            print(f"[BOOTSTRAP] MK8D game created — id={game_id}")
        else:
            game_id = game[0]

        # seed circuits
        result = connection.execute(
            text("SELECT COUNT(*) FROM circuits WHERE game_id = :gid"),
            {"gid": game_id},
        )
        count = result.scalar()
        if count == 0:
            for circuit in MK8D_CIRCUITS:
                connection.execute(
                    text(
                        "INSERT INTO circuits (name, description, game_id, image_url)"
                        " VALUES (:name, :description, :game_id, :image_url)"
                        " ON CONFLICT (name, game_id) DO NOTHING"
                    ),
                    {
                        "name": circuit["name"],
                        "description": circuit["description"],
                        "game_id": game_id,
                        "image_url": circuit.get("image_url"),
                    },
                )
            print(f"[BOOTSTRAP] MK8D circuits seeded ({len(MK8D_CIRCUITS)} inserted)")
        else:
            print(f"[BOOTSTRAP] MK8D circuits already present ({count} found)")


# Vecchio nome inglese -> nuovo nome italiano, circuiti MKDS (game_id=1).
# Migrazione idempotente: dopo il primo rename, i vecchi nomi non esistono
# più quindi le query successive non trovano righe da aggiornare.
MKDS_ITALIAN_CIRCUIT_NAMES = {
    "Figure-8 Circuit": "Ottotornante",
    "Yoshi Falls": "Cascate di Yoshi",
    "Cheep Cheep Beach": "Spiaggia Smack",
    "Luigi's Mansion": "Palazzo di Luigi",
    "Desert Hills": "Colli Desertici",
    "Delfino Square": "Borgo Delfino",
    "Waluigi Pinball": "Flipper di Waluigi",
    "Shroom Ridge": "Colli Fungo",
    "DK Pass": "Vette di DK",
    "Tick-Tock Clock": "Orologio Tic-toc",
    "Mario Circuit": "Circuito di Mario",
    "Airship Fortress": "Fortezza Volante",
    "Wario Stadium": "Stadio di Wario",
    "Peach Gardens": "Giardino di Peach",
    "Bowser Castle": "Castello di Bowser",
    "Rainbow Road": "Pista Arcobaleno",
    "Mario Circuit 1": "SNES Circuito di Mario 1",
    "Moo Moo Farm": "N64 Fattoria Muu Muu",
    "Peach Circuit": "GBA Circuito di Peach",
    "Luigi Circuit (GCN)": "GCN Circuito di Luigi",
    "Donut Plains 1": "SNES Pianura Ciambella 1",
    "Frappe Snowland": "N64 Innevata Frappè",
    "Bowser Castle 2": "GBA Castello di Bowser 2",
    "Baby Park": "GCN Parco Baby",
    "Koopa Beach 2": "SNES Spiaggia di Koopa 2",
    "Choco Mountain": "N64 Monte Cioccolato",
    "Luigi Circuit (GBA)": "GBA Circuito di Luigi",
    "Mushroom Bridge": "GCN Ponte Fungo",
    "Choco Island 2": "SNES Cioccoisola 2",
    "Banshee Boardwalk": "N64 Pontile Spettrale",
    "Sky Garden": "GBA Giardino Volante",
    "Yoshi Circuit": "GCN Circuito di Yoshi",
}


def rename_mkds_circuits_to_italian():
    """Rinomina i 32 circuiti MKDS (game_id=1) da inglese a italiano.

    Aggiorna solo il campo name (l'id resta invariato, quindi le gare/
    schedine che referenziano circuit_id non sono impattate).
    """
    with engine.begin() as connection:
        for old_name, new_name in MKDS_ITALIAN_CIRCUIT_NAMES.items():
            connection.execute(
                text(
                    "UPDATE circuits SET name = :new_name, description = :description"
                    " WHERE name = :old_name AND game_id = 1"
                ),
                {
                    "old_name": old_name,
                    "new_name": new_name,
                    "description": next(
                        (
                            c["description"]
                            for c in SEED_CIRCUITS
                            if c["name"] == new_name
                        ),
                        None,
                    ),
                },
            )


def ensure_mkds_dry_bones_character():
    """Aggiunge Tartosso (Dry Bones) al roster di Mario Kart DS (game_id=1)
    — presente in DB solo per MK8 Deluxe (game_id=2), mancava per MKDS
    nonostante sia un personaggio giocabile reale del gioco. Controllo
    case-insensitive su entrambi i nomi noti (non il solo vincolo
    unique_character_per_game, case-sensitive): un admin che rinomina il
    personaggio esistente cambiandone la capitalizzazione farebbe fallire
    il match esatto dell'ON CONFLICT e questo INSERT ne creerebbe un
    secondo duplicato ad ogni riavvio del backend — già successo una volta.
    Il nome del personaggio in lega è "Tartosso" (non l'inglese "Dry
    Bones", per coerenza col mapping dei versi audio in mkdsSounds.js)."""
    with engine.begin() as connection:
        existing = connection.execute(
            text(
                "SELECT 1 FROM characters WHERE game_id = :game_id"
                " AND (LOWER(name) = LOWER(:name) OR LOWER(name) = LOWER(:legacy_name))"
            ),
            {"name": "Tartosso", "legacy_name": "Dry Bones", "game_id": 1},
        ).first()
        if existing:
            return
        connection.execute(
            text(
                "INSERT INTO characters (name, description, game_id, img_url)"
                " VALUES (:name, :description, :game_id, :img_url)"
                " ON CONFLICT (name, game_id) DO NOTHING"
            ),
            {
                "name": "Tartosso",
                "description": "Lo scheletro corazzato dei Koopa, leggero e con un'ottima manovrabilità.",
                "game_id": 1,
                "img_url": "https://mario.wiki.gallery/images/thumb/b/bb/MKDS_Dry_Bones_Artwork.png/120px-MKDS_Dry_Bones_Artwork.png",
            },
        )


def backfill_circuit_image_urls():
    """Aggiorna image_url per i circuiti esistenti (MKDS game_id=1 e MK8D game_id=2)."""
    with engine.begin() as connection:
        # MKDS (game_id=1)
        for circuit in SEED_CIRCUITS:
            url = circuit.get("image_url")
            if url:
                connection.execute(
                    text(
                        "UPDATE circuits SET image_url = :image_url"
                        " WHERE name = :name AND game_id = :game_id"
                        " AND (image_url IS NULL OR image_url != :image_url)"
                    ),
                    {
                        "name": circuit["name"],
                        "game_id": circuit["game_id"],
                        "image_url": url,
                    },
                )
        # MK8D (game_id=2)
        for circuit in MK8D_CIRCUITS:
            url = circuit.get("image_url")
            if url:
                connection.execute(
                    text(
                        "UPDATE circuits SET image_url = :image_url"
                        " WHERE name = :name AND game_id = 2"
                        " AND (image_url IS NULL OR image_url != :image_url)"
                    ),
                    {
                        "name": circuit["name"],
                        "image_url": url,
                    },
                )


def ensure_tournament_status_column():
    inspector = inspect(engine)
    tournament_columns = {
        column_info["name"] for column_info in inspector.get_columns("tournaments")
    }

    if "status" not in tournament_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE tournaments ADD COLUMN status TEXT NOT NULL DEFAULT 'da_svolgere'"
                )
            )


def ensure_tournament_deadline_lock_column():
    inspector = inspect(engine)
    tournament_columns = {
        column_info["name"] for column_info in inspector.get_columns("tournaments")
    }

    if "deadline_lock" not in tournament_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE tournaments ADD COLUMN deadline_lock TIMESTAMP")
            )


def ensure_tournament_duello_columns():
    inspector = inspect(engine)
    tournament_columns = {
        column_info["name"] for column_info in inspector.get_columns("tournaments")
    }

    with engine.begin() as connection:
        if "duello_player_a_id" not in tournament_columns:
            connection.execute(
                text(
                    "ALTER TABLE tournaments ADD COLUMN duello_player_a_id INTEGER REFERENCES players(id)"
                )
            )

        if "duello_player_b_id" not in tournament_columns:
            connection.execute(
                text(
                    "ALTER TABLE tournaments ADD COLUMN duello_player_b_id INTEGER REFERENCES players(id)"
                )
            )


def ensure_tournament_player_withdrawn_columns():
    """Aggiunge le colonne per la gestione del 'Giocatore Ritirato'."""
    inspector = inspect(engine)
    tp_columns = {
        column_info["name"]
        for column_info in inspector.get_columns("tournament_players")
    }

    with engine.begin() as connection:
        if "withdrawn" not in tp_columns:
            connection.execute(
                text(
                    "ALTER TABLE tournament_players ADD COLUMN withdrawn BOOLEAN NOT NULL DEFAULT FALSE"
                )
            )

        if "withdrawn_at" not in tp_columns:
            connection.execute(
                text("ALTER TABLE tournament_players ADD COLUMN withdrawn_at TIMESTAMP")
            )


def ensure_tournament_schedine_locked_column():
    """Chiusura schedine a evento (lock al 1° match o manuale dal SuperAdmin)."""
    inspector = inspect(engine)
    tournament_columns = {
        column_info["name"] for column_info in inspector.get_columns("tournaments")
    }

    if "schedine_locked" not in tournament_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE tournaments ADD COLUMN schedine_locked BOOLEAN NOT NULL DEFAULT FALSE"
                )
            )


def ensure_tournament_vincitore_schedina_id_column():
    inspector = inspect(engine)
    tournament_columns = {
        column_info["name"] for column_info in inspector.get_columns("tournaments")
    }

    if "vincitore_schedina_id" not in tournament_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE tournaments ADD COLUMN vincitore_schedina_id INTEGER REFERENCES players(id)"
                )
            )


def ensure_inventory_consumed_columns():
    inspector = inspect(engine)
    inventory_columns = {
        column_info["name"] for column_info in inspector.get_columns("user_inventory")
    }

    with engine.begin() as connection:
        if "consumed_in_race_id" not in inventory_columns:
            connection.execute(
                text(
                    "ALTER TABLE user_inventory ADD COLUMN consumed_in_race_id INTEGER REFERENCES races(id)"
                )
            )

        if "consumed_effect" not in inventory_columns:
            connection.execute(
                text("ALTER TABLE user_inventory ADD COLUMN consumed_effect TEXT")
            )

        if "consumed_in_phase" not in inventory_columns:
            connection.execute(
                text("ALTER TABLE user_inventory ADD COLUMN consumed_in_phase TEXT")
            )

        if "consumed_in_group_name" not in inventory_columns:
            connection.execute(
                text(
                    "ALTER TABLE user_inventory ADD COLUMN consumed_in_group_name TEXT"
                )
            )


def ensure_inventory_admin_grant_columns():
    inspector = inspect(engine)
    inventory_columns = {
        column_info["name"] for column_info in inspector.get_columns("user_inventory")
    }

    with engine.begin() as connection:
        if "game_id" not in inventory_columns:
            connection.execute(
                text(
                    "ALTER TABLE user_inventory ADD COLUMN game_id INTEGER REFERENCES games(id)"
                )
            )
        if "granted_by_admin" not in inventory_columns:
            connection.execute(
                text(
                    "ALTER TABLE user_inventory ADD COLUMN granted_by_admin BOOLEAN DEFAULT FALSE"
                )
            )
        if "admin_note" not in inventory_columns:
            connection.execute(
                text("ALTER TABLE user_inventory ADD COLUMN admin_note TEXT")
            )
        if "granted_by_user_id" not in inventory_columns:
            connection.execute(
                text(
                    "ALTER TABLE user_inventory ADD COLUMN granted_by_user_id INTEGER REFERENCES users(id)"
                )
            )


def ensure_circuit_image_url_column():
    inspector = inspect(engine)
    circuit_columns = {col["name"] for col in inspector.get_columns("circuits")}
    if "image_url" not in circuit_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE circuits ADD COLUMN image_url TEXT"))


def ensure_circuit_requires_pass_column():
    """Aggiunge il flag 'requires_pass' ai circuiti (es. Booster Course Pass
    di Mario Kart 8 Deluxe) — generico, non legato a un game_id specifico."""
    inspector = inspect(engine)
    circuit_columns = {col["name"] for col in inspector.get_columns("circuits")}
    if "requires_pass" not in circuit_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE circuits ADD COLUMN requires_pass BOOLEAN NOT NULL DEFAULT FALSE"
                )
            )


def ensure_photo_comment_edit_columns():
    inspector = inspect(engine)
    if "photo_comments" not in inspector.get_table_names():
        return
    comment_columns = {col["name"] for col in inspector.get_columns("photo_comments")}
    with engine.begin() as connection:
        if "edited_by_user_id" not in comment_columns:
            connection.execute(
                text(
                    "ALTER TABLE photo_comments ADD COLUMN edited_by_user_id INTEGER REFERENCES users(id)"
                )
            )
        if "edited_at" not in comment_columns:
            connection.execute(
                text("ALTER TABLE photo_comments ADD COLUMN edited_at TIMESTAMP")
            )
        if "parent_id" not in comment_columns:
            connection.execute(
                text(
                    "ALTER TABLE photo_comments ADD COLUMN parent_id INTEGER REFERENCES photo_comments(id)"
                )
            )
        if "image_data" not in comment_columns:
            connection.execute(
                text("ALTER TABLE photo_comments ADD COLUMN image_data TEXT")
            )


def ensure_notifications_table():
    inspector = inspect(engine)
    if "notifications" not in inspector.get_table_names():
        with engine.begin() as connection:
            connection.execute(
                text("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    type TEXT NOT NULL DEFAULT 'mention',
                    content TEXT NOT NULL,
                    is_read BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    source_user_id INTEGER REFERENCES users(id),
                    source_photo_id INTEGER REFERENCES tournament_photos(id),
                    source_tournament_id INTEGER REFERENCES tournaments(id)
                )
            """)
            )


def ensure_notification_source_tournament_column():
    inspector = inspect(engine)
    if "notifications" not in inspector.get_table_names():
        return
    notif_columns = {col["name"] for col in inspector.get_columns("notifications")}
    if "source_tournament_id" not in notif_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE notifications ADD COLUMN source_tournament_id INTEGER REFERENCES tournaments(id)"
                )
            )


def ensure_audit_log_table():
    inspector = inspect(engine)
    if "audit_log" not in inspector.get_table_names():
        with engine.begin() as connection:
            connection.execute(
                text("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id SERIAL PRIMARY KEY,
                    actor_user_id INTEGER REFERENCES users(id),
                    action TEXT NOT NULL,
                    target_type TEXT,
                    target_id INTEGER,
                    description TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """)
            )


def ensure_user_must_change_password_column():
    inspector = inspect(engine)
    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "must_change_password" not in user_columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT TRUE"
                )
            )


def ensure_user_img_url_column():
    inspector = inspect(engine)
    user_columns = {col["name"] for col in inspector.get_columns("users")}
    if "img_url" not in user_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN img_url TEXT"))


def ensure_player_champion_photo_column():
    inspector = inspect(engine)
    player_columns = {col["name"] for col in inspector.get_columns("players")}
    if "champion_photo" not in player_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE players ADD COLUMN champion_photo TEXT")
            )


def ensure_player_bio_column():
    inspector = inspect(engine)
    player_columns = {col["name"] for col in inspector.get_columns("players")}
    if "bio" not in player_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE players ADD COLUMN bio TEXT"))


def ensure_temp_passwords_table():
    inspector = inspect(engine)
    if "temp_passwords" not in inspector.get_table_names():
        with engine.begin() as connection:
            connection.execute(
                text("""
                CREATE TABLE IF NOT EXISTS temp_passwords (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    temp_password TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    expires_at TIMESTAMP NOT NULL
                )
            """)
            )


def ensure_format_columns():
    """
    Aggiunge le colonne per i formati competitivi (group_stage, ecc.).
    Gestisce la migrazione da vecchi nomi (tournament_mode → tournament_format,
    deluxe_groups → format_data) per DB esistenti.
    """
    inspector = inspect(engine)
    tournament_cols = {col["name"] for col in inspector.get_columns("tournaments")}
    race_cols = {col["name"] for col in inspector.get_columns("races")}

    with engine.begin() as connection:
        # tournament_format (ex tournament_mode)
        if "tournament_format" not in tournament_cols:
            connection.execute(
                text(
                    "ALTER TABLE tournaments ADD COLUMN tournament_format TEXT NOT NULL DEFAULT 'classic'"
                )
            )
            # Migra i dati dall'eventuale colonna vecchia
            if "tournament_mode" in tournament_cols:
                connection.execute(
                    text("""
                    UPDATE tournaments
                    SET tournament_format = CASE
                        WHEN tournament_mode = 'deluxe_groups' THEN 'group_stage'
                        ELSE 'classic'
                    END
                """)
                )

        # format_data (ex deluxe_groups)
        if "format_data" not in tournament_cols:
            connection.execute(
                text("ALTER TABLE tournaments ADD COLUMN format_data JSON")
            )
            if "deluxe_groups" in tournament_cols:
                connection.execute(
                    text(
                        "UPDATE tournaments SET format_data = deluxe_groups WHERE deluxe_groups IS NOT NULL"
                    )
                )

        if "consolation_winner_id" not in tournament_cols:
            connection.execute(
                text(
                    "ALTER TABLE tournaments ADD COLUMN consolation_winner_id INTEGER REFERENCES players(id)"
                )
            )

        if "phase" not in race_cols:
            connection.execute(text("ALTER TABLE races ADD COLUMN phase TEXT"))

        if "group_name" not in race_cols:
            connection.execute(text("ALTER TABLE races ADD COLUMN group_name TEXT"))


def ensure_schedina_deluxe_table():
    """Crea la tabella schedine_torneo_deluxe se non esiste."""
    inspector = inspect(engine)
    if "schedine_torneo_deluxe" not in inspector.get_table_names():
        with engine.begin() as connection:
            connection.execute(
                text("""
                CREATE TABLE IF NOT EXISTS schedine_torneo_deluxe (
                    id                        INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id                   INTEGER NOT NULL REFERENCES users(id),
                    tournament_id             INTEGER NOT NULL REFERENCES tournaments(id),
                    qualificati_a_ids         JSON    NOT NULL,
                    qualificati_b_ids         JSON    NOT NULL,
                    vincitore_finale_id       INTEGER NOT NULL REFERENCES players(id),
                    vincitore_consolazione_id INTEGER NOT NULL REFERENCES players(id),
                    spareggio_punti_finale    INTEGER NOT NULL DEFAULT 0,
                    total_points              INTEGER NOT NULL DEFAULT 0,
                    status                    TEXT    NOT NULL DEFAULT 'open',
                    created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    settled_at                TIMESTAMP,
                    UNIQUE (user_id, tournament_id),
                    CHECK (spareggio_punti_finale >= 0),
                    CHECK (total_points >= 0)
                )
            """)
            )


def ensure_schedina_deluxe_v2_columns():
    """
    Migra schedine_torneo_deluxe dal vecchio schema cablato A/B (qualificati_a_ids,
    qualificati_b_ids, vincitore_finale_id, vincitore_consolazione_id,
    spareggio_punti_finale) al nuovo schema flessibile per N gironi
    (finalisti_ids, classifica_finale_ordinata, duello_*, spareggio_distanza).

    Le vecchie predizioni non sono compatibili con le nuove regole di punteggio,
    quindi la tabella viene svuotata durante la migrazione.
    """
    inspector = inspect(engine)
    if "schedine_torneo_deluxe" not in inspector.get_table_names():
        return

    columns = {
        column_info["name"]
        for column_info in inspector.get_columns("schedine_torneo_deluxe")
    }
    old_columns = {
        "qualificati_a_ids",
        "qualificati_b_ids",
        "vincitore_finale_id",
        "vincitore_consolazione_id",
        "spareggio_punti_finale",
    }
    needs_migration = bool(columns & old_columns) or "finalisti_ids" not in columns

    if not needs_migration:
        return

    with engine.begin() as connection:
        connection.execute(text("DELETE FROM schedine_torneo_deluxe"))

        for old_col in old_columns & columns:
            connection.execute(
                text(f"ALTER TABLE schedine_torneo_deluxe DROP COLUMN {old_col}")
            )

        if "finalisti_ids" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE schedine_torneo_deluxe ADD COLUMN finalisti_ids JSON NOT NULL DEFAULT '[]'"
                )
            )
        if "classifica_finale_ordinata" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE schedine_torneo_deluxe ADD COLUMN classifica_finale_ordinata JSON NOT NULL DEFAULT '[]'"
                )
            )
        if "duello_player_a_id" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE schedine_torneo_deluxe ADD COLUMN duello_player_a_id INTEGER REFERENCES players(id)"
                )
            )
        if "duello_player_b_id" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE schedine_torneo_deluxe ADD COLUMN duello_player_b_id INTEGER REFERENCES players(id)"
                )
            )
        if "duello_scelta_id" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE schedine_torneo_deluxe ADD COLUMN duello_scelta_id INTEGER REFERENCES players(id)"
                )
            )
        if "spareggio_distanza" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE schedine_torneo_deluxe ADD COLUMN spareggio_distanza INTEGER NOT NULL DEFAULT 0"
                )
            )


def ensure_race_is_duello_column():
    """Aggiunge il flag 'is_duello' alle gare (gare secche di spareggio escluse da stats/classifiche)."""
    inspector = inspect(engine)
    race_cols = {col["name"] for col in inspector.get_columns("races")}
    if "is_duello" not in race_cols:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE races ADD COLUMN is_duello BOOLEAN NOT NULL DEFAULT FALSE"
                )
            )


def ensure_schedina_duello_pareggio_columns():
    """Aggiunge il flag 'duello_pareggio' alle due tabelle schedine (pronostico Pareggio)."""
    inspector = inspect(engine)
    with engine.begin() as connection:
        for table in ("schedine_torneo", "schedine_torneo_deluxe"):
            if table not in inspector.get_table_names():
                continue
            cols = {c["name"] for c in inspector.get_columns(table)}
            if "duello_pareggio" not in cols:
                connection.execute(
                    text(
                        f"ALTER TABLE {table} ADD COLUMN duello_pareggio BOOLEAN NOT NULL DEFAULT FALSE"
                    )
                )


def ensure_tournament_audit_columns():
    """Aggiunge le colonne di audit (creazione e ultimo avanzamento di fase)."""
    inspector = inspect(engine)
    cols = {c["name"] for c in inspector.get_columns("tournaments")}
    with engine.begin() as connection:
        if "created_at" not in cols:
            connection.execute(
                text("ALTER TABLE tournaments ADD COLUMN created_at TIMESTAMP")
            )
        if "created_by_id" not in cols:
            connection.execute(
                text(
                    "ALTER TABLE tournaments ADD COLUMN created_by_id INTEGER REFERENCES users(id)"
                )
            )
        if "last_phase_change_at" not in cols:
            connection.execute(
                text(
                    "ALTER TABLE tournaments ADD COLUMN last_phase_change_at TIMESTAMP"
                )
            )
        if "last_phase_change_by_id" not in cols:
            connection.execute(
                text(
                    "ALTER TABLE tournaments ADD COLUMN last_phase_change_by_id INTEGER REFERENCES users(id)"
                )
            )


def ensure_schedina_deluxe_vincitori_gironi_column():
    """Aggiunge la colonna 'vincitori_gironi' (legacy, sostituita da 'classifiche_gironi')."""
    inspector = inspect(engine)
    if "schedine_torneo_deluxe" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("schedine_torneo_deluxe")}
    if "vincitori_gironi" not in cols:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE schedine_torneo_deluxe ADD COLUMN vincitori_gironi JSON NOT NULL DEFAULT '{}'"
                )
            )


def ensure_schedina_deluxe_classifiche_gironi_column():
    """Aggiunge la colonna 'classifiche_gironi' (pronostico classifica completa di ciascun girone)."""
    inspector = inspect(engine)
    if "schedine_torneo_deluxe" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("schedine_torneo_deluxe")}
    if "classifiche_gironi" not in cols:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE schedine_torneo_deluxe ADD COLUMN classifiche_gironi JSON NOT NULL DEFAULT '{}'"
                )
            )


def ensure_user_game_ownership_quantity_column():
    """Sostituisce il vecchio campo booleano 'owned' con una quantità (numero
    di copie possedute). Backfill: chi aveva owned=true diventa quantity=1."""
    inspector = inspect(engine)
    if "user_game_ownership" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("user_game_ownership")}
    if "quantity" not in cols:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE user_game_ownership ADD COLUMN quantity INTEGER NOT NULL DEFAULT 0"
                )
            )
            connection.execute(
                text(
                    "UPDATE user_game_ownership SET quantity = 1 WHERE owned = true"
                )
            )


def ensure_user_game_ownership_owned_default():
    """La vecchia colonna 'owned' non viene più scritta dal codice (sostituita
    da 'quantity'), ma resta NOT NULL a DB: senza un DEFAULT lì, ogni INSERT di
    una riga nuova (utente che dichiara un gioco per la prima volta) fallisce
    con NotNullViolation perché nessuno la valorizza più esplicitamente."""
    inspector = inspect(engine)
    if "user_game_ownership" not in inspector.get_table_names():
        return
    columns = {c["name"]: c for c in inspector.get_columns("user_game_ownership")}
    owned_column = columns.get("owned")
    if owned_column is not None and owned_column.get("default") is None:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE user_game_ownership ALTER COLUMN owned SET DEFAULT false")
            )


def ensure_user_console_ownership_quantity_column():
    """Aggiunge la quantità di unità possedute per console (le righe esistenti,
    che rappresentavano solo presenza, ottengono quantity=1 via DEFAULT)."""
    inspector = inspect(engine)
    if "user_console_ownership" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("user_console_ownership")}
    if "quantity" not in cols:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE user_console_ownership ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1"
                )
            )


def ensure_user_r4_devices_quantity_column():
    """Aggiunge la quantità di dispositivi R4 posseduti per tipo di device."""
    inspector = inspect(engine)
    if "user_r4_devices" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("user_r4_devices")}
    if "quantity" not in cols:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE user_r4_devices ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1"
                )
            )


def ensure_user_ownership_declared_at_column():
    """Traccia se l'utente ha mai salvato la sezione 'Possiedi' almeno una
    volta, indipendentemente dal contenuto — usato per il banner di sollecito."""
    inspector = inspect(engine)
    user_columns = {
        column_info["name"] for column_info in inspector.get_columns("users")
    }

    if "ownership_declared_at" not in user_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN ownership_declared_at TIMESTAMP")
            )


def ensure_result_position_constraint_deferrable():
    """Il vincolo unique_position_per_race va reso DEFERRABLE INITIALLY
    DEFERRED: riordinare i risultati di una gara (es. scambiare 1° e 2°
    posto) richiede più UPDATE nella stessa transazione che, prese una per
    volta, violerebbero temporaneamente l'unicità (race_id, position) prima
    di raggiungere lo stato finale valido. Con il vincolo differito, Postgres
    controlla l'unicità solo al COMMIT della transazione, non ad ogni
    singola riga — vedi reorder_race_results in services/tornei/races.py,
    l'unico punto che sfrutta questo comportamento (fa tutti gli update e un
    solo commit finale)."""
    with engine.begin() as connection:
        is_deferrable = connection.execute(
            text(
                "SELECT condeferrable FROM pg_constraint WHERE conname = 'unique_position_per_race'"
            )
        ).scalar()
        if is_deferrable is False:
            connection.execute(
                text("ALTER TABLE results DROP CONSTRAINT unique_position_per_race")
            )
            connection.execute(
                text(
                    "ALTER TABLE results ADD CONSTRAINT unique_position_per_race "
                    "UNIQUE (race_id, position) DEFERRABLE INITIALLY DEFERRED"
                )
            )


def ensure_inventory_uses_columns():
    """Guscio Blu ora si può attivare fino a max_uses volte nello stesso
    torneo (vedi CARD_META in services/cards/inventory.py) invece di un
    singolo uso — e il "bersaglio" che il modale raccoglieva ma non
    salvava mai ora ha una colonna. Le righe già esistenti erano tutte a
    uso singolo: backfill uses_remaining=0 per quelle già consumate,
    altrimenti resterebbero col default 1 pur essendo già state usate."""
    inspector = inspect(engine)
    inventory_columns = {
        column_info["name"] for column_info in inspector.get_columns("user_inventory")
    }

    with engine.begin() as connection:
        if "max_uses" not in inventory_columns:
            connection.execute(
                text(
                    "ALTER TABLE user_inventory ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 1"
                )
            )
        if "uses_remaining" not in inventory_columns:
            connection.execute(
                text(
                    "ALTER TABLE user_inventory ADD COLUMN uses_remaining INTEGER NOT NULL DEFAULT 1"
                )
            )
            connection.execute(
                text(
                    "UPDATE user_inventory SET uses_remaining = 0 WHERE is_consumed = TRUE"
                )
            )
        if "target_player_id" not in inventory_columns:
            connection.execute(
                text(
                    "ALTER TABLE user_inventory ADD COLUMN target_player_id INTEGER REFERENCES players(id)"
                )
            )


def bootstrap_database():
    create_tables()
    ensure_player_img_url_column()
    ensure_character_img_url_column()
    ensure_user_virtual_coins_column()
    ensure_user_must_change_password_column()
    ensure_user_img_url_column()
    ensure_player_champion_photo_column()
    ensure_player_bio_column()
    ensure_temp_passwords_table()
    ensure_tournament_status_column()
    ensure_tournament_deadline_lock_column()
    ensure_tournament_duello_columns()
    ensure_tournament_player_withdrawn_columns()
    ensure_tournament_schedine_locked_column()
    ensure_tournament_vincitore_schedina_id_column()
    ensure_inventory_consumed_columns()
    ensure_inventory_admin_grant_columns()
    ensure_circuit_image_url_column()
    ensure_circuit_requires_pass_column()
    ensure_photo_comment_edit_columns()
    ensure_notifications_table()
    ensure_notification_source_tournament_column()
    ensure_audit_log_table()
    ensure_format_columns()
    ensure_schedina_deluxe_table()
    ensure_schedina_deluxe_v2_columns()
    ensure_schedina_duello_pareggio_columns()
    ensure_race_is_duello_column()
    ensure_schedina_deluxe_vincitori_gironi_column()
    ensure_schedina_deluxe_classifiche_gironi_column()
    ensure_tournament_audit_columns()
    ensure_user_game_ownership_quantity_column()
    ensure_user_game_ownership_owned_default()
    ensure_user_console_ownership_quantity_column()
    ensure_user_r4_devices_quantity_column()
    ensure_user_ownership_declared_at_column()
    ensure_result_position_constraint_deferrable()
    ensure_inventory_uses_columns()
    # seed_circuits()
    seed_mk8d_data()
    rename_mkds_circuits_to_italian()
    backfill_circuit_image_urls()
    ensure_mkds_dry_bones_character()
    ensure_default_superadmin()


def ensure_default_superadmin():
    from app.core.db import SessionLocal

    db = SessionLocal()
    try:
        if get_user_by_username(db, DEFAULT_SUPERADMIN_USERNAME):
            return
        create_user(
            db,
            CreateUser(
                username=DEFAULT_SUPERADMIN_USERNAME,
                password=DEFAULT_SUPERADMIN_PASSWORD,
                role="superadmin",
                player_id=None,
                is_active=True,
            ),
        )
    finally:
        db.close()
