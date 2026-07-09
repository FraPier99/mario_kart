from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    ForeignKey,
    Date,
    DateTime,
    JSON,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.timezone import now_rome

from app.models.base import Base


# -------------------
# GAME
# -------------------
class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(String)

    characters = relationship("Character", back_populates="game")
    tournaments = relationship("Tournament", back_populates="game")
    circuits = relationship("Circuit", back_populates="game")


# -------------------
# CHARACTER
# -------------------
class Character(Base):
    __tablename__ = "characters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(String)
    img_url = Column(Text, nullable=True)

    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)

    game = relationship("Game", back_populates="characters")
    results = relationship("Result", back_populates="character")
    fans = relationship("Player", back_populates="favorite_character")
    __table_args__ = (
        UniqueConstraint("name", "game_id", name="unique_character_per_game"),
    )


# -------------------
# CIRCUIT
# -------------------
class Circuit(Base):
    __tablename__ = "circuits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(String)
    image_url = Column(Text, nullable=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    game = relationship("Game", back_populates="circuits")
    races = relationship("Race", back_populates="circuit")
    __table_args__ = (
        UniqueConstraint("name", "game_id", name="unique_circuit_name_per_game"),
    )


# -------------------
# TOURNAMENT
# -------------------
class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    date = Column(Date)

    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)

    n_races = Column(Integer, nullable=False)
    n_players = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default="da_svolgere")
    # Formato competitivo: "classic" (tutti insieme) | "group_stage" (gironi)
    tournament_format = Column(String, nullable=False, default="classic")

    # Chiusura schedine a evento (non più a countdown temporale rigido):
    # diventa True quando l'Admin inserisce la prima gara oppure quando il
    # SuperAdmin preme "Chiudi Schedine". Finché è False (e status="da_svolgere")
    # gli utenti possono compilare la schedina.
    schedine_locked = Column(Boolean, nullable=False, default=False)

    winner_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    deadline_lock = Column(DateTime, nullable=True)
    # Nonostante il nome, contiene un player_id (non uno user_id): assegnato
    # da winner_user.player_id in schedine.py/schedine_deluxe.py, e la
    # migrazione reale (bootstrap.py) referenzia "players(id)".
    vincitore_schedina_id = Column(Integer, ForeignKey("players.id"), nullable=True)

    duello_player_a_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    duello_player_b_id = Column(Integer, ForeignKey("players.id"), nullable=True)

    # Config specifica del formato (JSON generico per qualsiasi formato)
    # group_stage: {"groups": {"1": [player_id,...], "2": [player_id,...], ...}}
    #   numero di gironi calcolato dinamicamente in base al numero di partecipanti
    #   (vedi app.services.tornei.tournaments.compute_group_layout)
    format_data = Column(JSON, nullable=True)
    # Vincitore della finale di consolazione (gruppo "bottom" della Fase 2)
    consolation_winner_id = Column(Integer, ForeignKey("players.id"), nullable=True)

    # Audit: creazione e ultimo avanzamento di fase del torneo.
    created_at = Column(DateTime, nullable=True, default=now_rome)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    last_phase_change_at = Column(DateTime, nullable=True)
    last_phase_change_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    game = relationship("Game", back_populates="tournaments")
    races = relationship(
        "Race", back_populates="tournament", cascade="all, delete-orphan"
    )
    winner = relationship("Player", back_populates="wins", foreign_keys=[winner_id])
    vincitore_schedina = relationship("Player", foreign_keys=[vincitore_schedina_id])
    duello_player_a = relationship("Player", foreign_keys=[duello_player_a_id])
    duello_player_b = relationship("Player", foreign_keys=[duello_player_b_id])
    consolation_winner = relationship("Player", foreign_keys=[consolation_winner_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    last_phase_change_by = relationship("User", foreign_keys=[last_phase_change_by_id])
    player_links = relationship(
        "TournamentPlayer", back_populates="tournament", cascade="all, delete-orphan"
    )
    schedine = relationship(
        "SchedinaTorneo", back_populates="tournament", cascade="all, delete-orphan"
    )
    premi_assegnati = relationship(
        "PremioTorneo",
        back_populates="source_tournament",
        foreign_keys="PremioTorneo.torneo_sorgente_id",
        cascade="all, delete-orphan",
    )
    premi_prossimi = relationship(
        "PremioTorneo",
        back_populates="next_tournament",
        foreign_keys="PremioTorneo.torneo_id_prossimo",
    )
    __table_args__ = (
        UniqueConstraint("name", "date", name="unique_tournament_name_date"),
    )


# -------------------
# TOURNAMENT PLAYER (many-to-many)
# -------------------
class TournamentPlayer(Base):
    __tablename__ = "tournament_players"

    tournament_id = Column(Integer, ForeignKey("tournaments.id"), primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), primary_key=True)

    # Giocatore Ritirato: il giocatore ha abbandonato il torneo a metà corsa.
    # I risultati già registrati restano validi e contano in classifica; il
    # giocatore viene semplicemente escluso dal pool per le gare successive.
    withdrawn = Column(Boolean, nullable=False, default=False)
    withdrawn_at = Column(DateTime, nullable=True)

    tournament = relationship("Tournament", back_populates="player_links")
    player = relationship("Player", back_populates="tournament_links")


# -------------------
# PLAYOFF HISTORY
# -------------------
class PlayoffHistory(Base):
    __tablename__ = "playoff_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    player_one_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    player_two_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    winner_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    created_at = Column(Date, nullable=False)

    tournament = relationship("Tournament")


# -------------------
# RACE
# -------------------
class Race(Base):
    __tablename__ = "races"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String)
    race_order = Column(Integer, nullable=False)

    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    circuit_id = Column(Integer, ForeignKey("circuits.id"), nullable=False)

    # Campi per la modalità Deluxe con gironi
    # phase: "group" (Fase 1 — gironi) | "finals" (Fase 2 — finali)
    phase = Column(String, nullable=True)
    # group_name: "A"/"B" in Fase 1; "top"/"bottom" in Fase 2
    group_name = Column(String, nullable=True)
    # gara di Duello (gara secca / spareggio): esclusa da statistiche e classifiche
    is_duello = Column(Boolean, nullable=False, default=False, server_default="false")

    tournament = relationship("Tournament", back_populates="races")
    circuit = relationship("Circuit", back_populates="races")
    results = relationship(
        "Result", back_populates="race", cascade="all, delete-orphan"
    )


# -------------------
# RESULT
# -------------------
class Result(Base):
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, autoincrement=True)

    race_id = Column(Integer, ForeignKey("races.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    character_id = Column(Integer, ForeignKey("characters.id"), nullable=False)

    position = Column(Integer, nullable=False)
    points = Column(Integer, nullable=False)

    race = relationship("Race", back_populates="results")
    player = relationship("Player", back_populates="results")
    character = relationship("Character", back_populates="results")

    __table_args__ = (
        UniqueConstraint("race_id", "player_id", name="unique_player_per_race"),
        UniqueConstraint("race_id", "position", name="unique_position_per_race"),
        CheckConstraint("position > 0", name="check_position_positive"),
        CheckConstraint("points >= 0", name="check_points_non_negative"),
    )


# -------------------
# ENGAGEMENT
# -------------------
class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    predicted_player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    coins_wagered = Column(Integer, nullable=False, default=10)
    status = Column(String, nullable=False, default="open")
    actual_winner_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=now_rome)
    settled_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="predictions")
    tournament = relationship("Tournament")
    predicted_player = relationship("Player", foreign_keys=[predicted_player_id])
    actual_winner = relationship("Player", foreign_keys=[actual_winner_id])
