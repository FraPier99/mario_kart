"""
Test infra per i servizi core del backend (app/services/...).

Punta a un DB Postgres DEDICATO ai test (default: stesso host/credenziali di
DATABASE_URL ma con dbname "kart_test"), creato e bootstrappato in automatico
alla prima run. Ogni test gira dentro una transazione con SAVEPOINT che viene
sempre annullata a fine test (anche se il codice sotto test chiama
db.commit() — pattern standard SQLAlchemy per isolare test da servizi che
committano internamente, come fa questo backend).

Override del DB di test: variabile d'ambiente TEST_DATABASE_URL.
"""

import os
import re

import pytest

_DEFAULT_PROD_URL = "postgresql://postgres:gradino@localhost:5432/kart"
_prod_url = os.environ.get("DATABASE_URL", _DEFAULT_PROD_URL)
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", re.sub(r"/[^/]+$", "/kart_test", _prod_url)
)
# Deve essere impostata PRIMA di importare app.core.db (l'engine è creato a import-time).
os.environ["DATABASE_URL"] = TEST_DATABASE_URL

import psycopg2
from sqlalchemy import event

from app.core import bootstrap as bootstrap_module
from app.core.db import SessionLocal, engine


def _ensure_test_database_exists() -> None:
    admin_url = re.sub(r"/[^/]+$", "/postgres", TEST_DATABASE_URL)
    dbname = TEST_DATABASE_URL.rsplit("/", 1)[-1]
    conn = psycopg2.connect(admin_url)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,))
            if not cur.fetchone():
                cur.execute(f'CREATE DATABASE "{dbname}"')
    finally:
        conn.close()


@pytest.fixture(scope="session", autouse=True)
def _bootstrap_test_database():
    _ensure_test_database_exists()
    bootstrap_module.bootstrap_database()

    # bootstrap_database() non semina i personaggi (solo gioco+circuiti) —
    # servono per Result.character_id, riusa il seeder esistente.
    from app.data.mk8deluxe import MK8D_CHARACTERS
    from app.models import Character, Game

    session = SessionLocal()
    try:
        game = session.query(Game).filter(Game.name.ilike("%mario kart%")).first()
        if game and not session.query(Character).filter(Character.game_id == game.id).first():
            for data in MK8D_CHARACTERS:
                session.add(
                    Character(
                        name=data["name"],
                        description=data["description"],
                        game_id=game.id,
                        img_url=data.get("img_url"),
                    )
                )
            session.commit()
    finally:
        session.close()

    yield


@pytest.fixture()
def db():
    """Session isolata su SAVEPOINT: qualunque commit del codice sotto test
    viene assorbito, il rollback finale annulla sempre tutto."""
    connection = engine.connect()
    trans = connection.begin()
    session = SessionLocal(bind=connection)
    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def _restart_savepoint(sess, transaction):
        if transaction.nested and not transaction._parent.nested:
            sess.begin_nested()

    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()
