from sqlalchemy import (
    Column,
    Boolean,
    Integer,
    String,
    Text,
    ForeignKey,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.timezone import now_rome

from app.models.base import Base


# -------------------
# USER INVENTORY
# -------------------
class UserInventory(Base):
    __tablename__ = "user_inventory"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    card_type = Column(String, nullable=False)
    card_name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    source_tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=True)
    source_schedina_id = Column(
        Integer, ForeignKey("schedine_torneo.id"), nullable=True
    )
    is_consumed = Column(Boolean, nullable=False, default=False)
    consumed_in_race_id = Column(Integer, ForeignKey("races.id"), nullable=True)
    consumed_in_phase = Column(String, nullable=True)
    consumed_in_group_name = Column(String, nullable=True)
    consumed_effect = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=now_rome)
    consumed_at = Column(DateTime, nullable=True)

    game_id = Column(Integer, ForeignKey("games.id"), nullable=True)
    granted_by_admin = Column(Boolean, nullable=False, default=False)
    admin_note = Column(Text, nullable=True)
    granted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Quante volte questa carta si può usare in totale (1 per Master, 3 per
    # Guscio Blu — vedi CARD_META["max_uses"] in services/cards/inventory.py,
    # un solo posto da cambiare se il numero cambia in futuro) e quante ne
    # restano. is_consumed resta per compatibilità con gli endpoint che la
    # leggono già (/all, /public) ma è ormai derivato: True quando
    # uses_remaining arriva a 0. Il "bersaglio" (avversario colpito
    # dall'effetto) veniva raccolto dal modale ma non salvato mai — bug
    # corretto qui.
    max_uses = Column(Integer, nullable=False, default=1)
    uses_remaining = Column(Integer, nullable=False, default=1)
    target_player_id = Column(Integer, ForeignKey("players.id"), nullable=True)

    user = relationship(
        "User", back_populates="inventory_items", foreign_keys=[user_id]
    )
    consumed_in_race = relationship("Race")
    source_tournament = relationship("Tournament", foreign_keys=[source_tournament_id])
    game = relationship("Game", foreign_keys=[game_id])
    granted_by_user = relationship("User", foreign_keys=[granted_by_user_id])
    target_player = relationship("Player", foreign_keys=[target_player_id])

    @property
    def source_tournament_name(self) -> str | None:
        return self.source_tournament.name if self.source_tournament else None

    @property
    def source_game_name(self) -> str | None:
        if self.game:
            return self.game.name
        if self.source_tournament and self.source_tournament.game:
            return self.source_tournament.game.name
        return None

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "card_type",
            "source_tournament_id",
            name="unique_inventory_card_per_tournament",
        ),
    )


# -------------------
# CARD USAGE LOG
# -------------------
class CardUsageLog(Base):
    """Un rigo per OGNI singolo utilizzo di una carta — a differenza delle
    colonne piatte su UserInventory (che rappresentano solo l'ultimo uso),
    serve per il Guscio Blu che si può attivare fino a max_uses volte nello
    stesso torneo. Effetti Master "ban_pista"/"imponi_personaggio" nascono
    con race_id=NULL ("in sospeso": devono ancora influenzare una gara che
    non esiste finché non viene creata — vedi ClassicRaceForm) e vengono
    risolti in un secondo momento impostando race_id."""

    __tablename__ = "card_usage_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    inventory_item_id = Column(Integer, ForeignKey("user_inventory.id"), nullable=False)
    # Nullable: il percorso self-service ("segna come usata", Cards.jsx) può
    # inviare un uso senza alcun contesto torneo/gara — resta comunque un
    # uso valido, semplicemente senza legame tracciabile a un torneo.
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=True)
    target_player_id = Column(Integer, ForeignKey("players.id"), nullable=True)
    imposed_circuit_id = Column(Integer, ForeignKey("circuits.id"), nullable=True)
    imposed_character_id = Column(Integer, ForeignKey("characters.id"), nullable=True)
    effect = Column(String, nullable=False)
    used_at = Column(DateTime, nullable=False, default=now_rome)
    used_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    inventory_item = relationship("UserInventory")
    tournament = relationship("Tournament", foreign_keys=[tournament_id])
    race = relationship("Race", foreign_keys=[race_id])
    target_player = relationship("Player", foreign_keys=[target_player_id])
    imposed_circuit = relationship("Circuit", foreign_keys=[imposed_circuit_id])
    imposed_character = relationship("Character", foreign_keys=[imposed_character_id])
    used_by_user = relationship("User", foreign_keys=[used_by_user_id])
