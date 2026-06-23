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
# PLAYER
# -------------------
class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, autoincrement=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    nickname = Column(String, nullable=False, unique=True)
    img_url = Column(Text, nullable=True)
    champion_photo = Column(Text, nullable=True)

    bio = Column(Text, nullable=True)
    favorite_character_id = Column(Integer, ForeignKey("characters.id"), nullable=True)

    results = relationship("Result", back_populates="player")
    favorite_character = relationship("Character", back_populates="fans")
    wins = relationship(
        "Tournament", back_populates="winner", foreign_keys="Tournament.winner_id"
    )
    tournament_links = relationship("TournamentPlayer", back_populates="player")
    user_account = relationship("User", back_populates="player", uselist=False)
    __table_args__ = (UniqueConstraint("nickname", name="unique_player_nickname"),)
    # wins = relationship('HallOfFame', back_populates='player')


# -------------------
# USER / AUTH
# -------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")
    is_active = Column(Boolean, nullable=False, default=True)
    virtual_coins = Column(Integer, nullable=False, default=100)
    must_change_password = Column(Boolean, nullable=False, default=True)
    img_url = Column(Text, nullable=True)

    player_id = Column(Integer, ForeignKey("players.id"), nullable=True, unique=True)

    player = relationship("Player", back_populates="user_account")
    schedine = relationship(
        "SchedinaTorneo", back_populates="user", cascade="all, delete-orphan"
    )
    premi_torneo = relationship(
        "PremioTorneo", back_populates="user", cascade="all, delete-orphan"
    )
    inventory_items = relationship(
        "UserInventory",
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="UserInventory.user_id",
    )
    predictions = relationship(
        "Prediction", back_populates="user", cascade="all, delete-orphan"
    )
    sent_challenges = relationship(
        "Challenge",
        back_populates="sender",
        foreign_keys="Challenge.sender_user_id",
        cascade="all, delete-orphan",
    )
    received_challenges = relationship(
        "Challenge",
        back_populates="receiver",
        foreign_keys="Challenge.receiver_user_id",
        cascade="all, delete-orphan",
    )


# -------------------
# GALLERY
# -------------------
class TournamentPhoto(Base):
    __tablename__ = "tournament_photos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=True)
    uploaded_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    image_data = Column(Text, nullable=False)
    caption = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=now_rome)

    tournament = relationship("Tournament")
    uploaded_by = relationship("User", foreign_keys=[uploaded_by_user_id])
    comments = relationship(
        "PhotoComment", back_populates="photo", cascade="all, delete-orphan"
    )


class PhotoComment(Base):
    __tablename__ = "photo_comments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    photo_id = Column(Integer, ForeignKey("tournament_photos.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    parent_id = Column(Integer, ForeignKey("photo_comments.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=now_rome)
    edited_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    edited_at = Column(DateTime, nullable=True)

    photo = relationship("TournamentPhoto", back_populates="comments")
    user = relationship("User", foreign_keys=[user_id])
    edited_by = relationship("User", foreign_keys=[edited_by_user_id])
    parent = relationship("PhotoComment", remote_side=[id], backref="replies")


# -------------------
# NOTIFICATIONS
# -------------------
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False, default="mention")
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=now_rome)
    source_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    source_photo_id = Column(Integer, ForeignKey("tournament_photos.id"), nullable=True)
    source_tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=True)

    user = relationship("User", foreign_keys=[user_id], backref="notifications")
    source_user = relationship("User", foreign_keys=[source_user_id])
    source_tournament = relationship("Tournament", foreign_keys=[source_tournament_id])


class Challenge(Base):
    __tablename__ = "challenges"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sender_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, nullable=False, default="pending")
    created_at = Column(DateTime, nullable=False, default=now_rome)
    responded_at = Column(DateTime, nullable=True)

    sender = relationship(
        "User", foreign_keys=[sender_user_id], back_populates="sent_challenges"
    )
    receiver = relationship(
        "User", foreign_keys=[receiver_user_id], back_populates="received_challenges"
    )


# -------------------
# AUDIT LOG
# -------------------
class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    target_type = Column(String, nullable=True)
    target_id = Column(Integer, nullable=True)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=now_rome)

    actor = relationship("User", foreign_keys=[actor_user_id])


# -------------------
# TEMP PASSWORDS
# -------------------
class TempPassword(Base):
    __tablename__ = "temp_passwords"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    temp_password = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=now_rome)
    expires_at = Column(DateTime, nullable=False)

    user = relationship("User", foreign_keys=[user_id])
