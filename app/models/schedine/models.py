from sqlalchemy import (
    Column,
    Boolean,
    Integer,
    String,
    ForeignKey,
    DateTime,
    JSON,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime

from app.models.base import Base


# -------------------
# SCHEDINA FISSA
# -------------------
class SchedinaTorneo(Base):
    __tablename__ = "schedine_torneo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)

    classifica_ordinata = Column(JSON, nullable=False)
    maggiore_streak_vittorie_id = Column(
        Integer, ForeignKey("players.id"), nullable=False
    )
    vittima_del_caos_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    duello_player_a_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    duello_player_b_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    duello_scelta_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    # Pronostico "Pareggio": True se l'utente prevede che A e B chiudano a pari
    # punti totali. In tal caso duello_scelta_id resta NULL.
    duello_pareggio = Column(Boolean, nullable=False, default=False)
    spareggio_punti_vincitore = Column(Integer, nullable=False)

    total_points = Column(Integer, nullable=False, default=0)
    # Ciclo di vita: "open" (compilata, in attesa del risultato) → "settled" (liquidata).
    # La scadenza agisce solo in compilazione: una schedina compilata non è mai "scaduta".
    status = Column(String, nullable=False, default="open")
    actual_winner_points = Column(Integer, nullable=True)
    tie_breaker_distance = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    settled_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="schedine")
    tournament = relationship("Tournament", back_populates="schedine")
    maggiore_streak_vittorie = relationship(
        "Player", foreign_keys=[maggiore_streak_vittorie_id]
    )
    vittima_del_caos = relationship("Player", foreign_keys=[vittima_del_caos_id])
    duello_player_a = relationship("Player", foreign_keys=[duello_player_a_id])
    duello_player_b = relationship("Player", foreign_keys=[duello_player_b_id])
    duello_scelta = relationship("Player", foreign_keys=[duello_scelta_id])

    __table_args__ = (
        UniqueConstraint(
            "user_id", "tournament_id", name="unique_schedina_per_tournament_user"
        ),
        CheckConstraint(
            "spareggio_punti_vincitore >= 0",
            name="check_schedina_tie_break_non_negative",
        ),
        CheckConstraint("total_points >= 0", name="check_schedina_points_non_negative"),
    )


# -------------------
# SCHEDINA GIRONI (formato group_stage, N gironi flessibili)
# -------------------
class SchedinaTorneoGroupStage(Base):
    __tablename__ = "schedine_torneo_deluxe"   # tabella mantenuta per compatibilità

    id            = Column(Integer, primary_key=True, autoincrement=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)

    # 1. Finalisti: lista di player_id che si pensa passino alla fase finale
    #    (lunghezza pari al numero di posti finale del torneo, es. 4 per un Final 4)
    finalisti_ids = Column(JSON, nullable=False)  # [player_id, ...]

    # 2. Classifica Finale: ordine podio previsto tra i finalisti (solo fase "finals", riparte da 0)
    classifica_finale_ordinata = Column(JSON, nullable=False)  # [player_id, ...] in ordine 1°→ultimo

    # 2b. Classifica per Girone: per ciascun girone della fase 1, l'ordine
    #     previsto di TUTTI i giocatori del girone (1°→ultimo) —
    #     {"<group_name>": [player_id, ...], ...}
    classifiche_gironi = Column(JSON, nullable=False, default=dict)

    # 3. Il Duello: testa a testa tra due giocatori scelti dall'admin in fase di creazione
    duello_player_a_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    duello_player_b_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    duello_scelta_id   = Column(Integer, ForeignKey("players.id"), nullable=True)
    # Pronostico "Pareggio": True se l'utente prevede A e B a pari punti totali
    # (duello_scelta_id resta NULL).
    duello_pareggio    = Column(Boolean, nullable=False, default=False)

    # 4. Spareggio (tie-breaker): distanza esatta di punti tra 1° e 2° classificato del torneo
    spareggio_distanza = Column(Integer, nullable=False, default=0)

    # Campi di scoring (popolati al settlement)
    total_points       = Column(Integer, nullable=False, default=0)
    status             = Column(String,  nullable=False, default="open")
    # "open" → in attesa | "settled" → liquidata | "scaduta" → non compilata in tempo
    created_at         = Column(DateTime, nullable=False, default=datetime.utcnow)
    settled_at         = Column(DateTime, nullable=True)
    # Ciclo di vita: "open" (compilata, in attesa del risultato) → "settled" (liquidata).
    # La scadenza agisce in fase di compilazione (dopo la deadline non si accettano
    # nuove schedine); una schedina già compilata NON diventa mai "scaduta".

    user            = relationship("User")
    tournament      = relationship("Tournament")
    duello_player_a = relationship("Player", foreign_keys=[duello_player_a_id])
    duello_player_b = relationship("Player", foreign_keys=[duello_player_b_id])
    duello_scelta   = relationship("Player", foreign_keys=[duello_scelta_id])

    __table_args__ = (
        UniqueConstraint("user_id", "tournament_id", name="unique_schedina_deluxe_per_torneo"),
        CheckConstraint("spareggio_distanza >= 0", name="check_deluxe_spareggio_non_negative"),
        CheckConstraint("total_points >= 0", name="check_deluxe_points_non_negative"),
    )


# -------------------
# PREMIO TORNEO
# -------------------
class PremioTorneo(Base):
    __tablename__ = "premi_torneo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    torneo_sorgente_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    torneo_id_prossimo = Column(Integer, ForeignKey("tournaments.id"), nullable=True)
    potere_ottenuto_true = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    redeemed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="premi_torneo")
    source_tournament = relationship(
        "Tournament",
        foreign_keys=[torneo_sorgente_id],
        back_populates="premi_assegnati",
    )
    next_tournament = relationship(
        "Tournament", foreign_keys=[torneo_id_prossimo], back_populates="premi_prossimi"
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id", "torneo_sorgente_id", name="unique_premio_per_torneo_sorgente"
        ),
    )
