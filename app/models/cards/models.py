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

    user = relationship(
        "User", back_populates="inventory_items", foreign_keys=[user_id]
    )
    consumed_in_race = relationship("Race")
    source_tournament = relationship("Tournament", foreign_keys=[source_tournament_id])
    game = relationship("Game", foreign_keys=[game_id])
    granted_by_user = relationship("User", foreign_keys=[granted_by_user_id])

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
