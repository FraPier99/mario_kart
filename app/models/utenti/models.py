from sqlalchemy import (
    Column,
    Boolean,
    Integer,
    String,
    Text,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    JSON,
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
    accent_color = Column(String, nullable=True)
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
    ownership_declared_at = Column(DateTime, nullable=True)

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
    game_ownerships = relationship(
        "UserGameOwnership", back_populates="user", cascade="all, delete-orphan"
    )
    console_ownerships = relationship(
        "UserConsoleOwnership", back_populates="user", cascade="all, delete-orphan"
    )
    r4_devices = relationship(
        "UserR4Device", back_populates="user", cascade="all, delete-orphan"
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
    image_data = Column(Text, nullable=True)
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


# -------------------
# GAME / CONSOLE OWNERSHIP (auto-dichiarato dall'utente)
# -------------------
class UserGameOwnership(Base):
    __tablename__ = "user_game_ownership"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    # Numero di copie fisiche possedute (0 = non posseduto). Sostituisce il
    # vecchio campo booleano `owned` (colonna DB rimasta ma non più letta/scritta).
    quantity = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=now_rome, onupdate=now_rome)

    user = relationship("User", back_populates="game_ownerships")
    game = relationship("Game")

    __table_args__ = (
        UniqueConstraint("user_id", "game_id", name="unique_user_game_ownership"),
    )


class UserConsoleOwnership(Base):
    __tablename__ = "user_console_ownership"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Chiave stabile da app.data.consoles.CONSOLE_KEYS, validata a livello di
    # servizio (nessun CHECK/enum a DB, coerente con Tournament.status ecc.)
    console_key = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=now_rome)

    user = relationship("User", back_populates="console_ownerships")

    __table_args__ = (
        UniqueConstraint("user_id", "console_key", name="unique_user_console"),
    )


class UserR4Device(Base):
    __tablename__ = "user_r4_devices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Sottoinsieme famiglia DS da app.data.consoles.R4_DEVICE_KEYS. Consentito
    # solo se l'utente possiede Mario Kart DS (game_id=1), applicato a livello
    # di servizio, non a DB.
    device_type = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, nullable=False, default=now_rome)

    user = relationship("User", back_populates="r4_devices")

    __table_args__ = (
        UniqueConstraint("user_id", "device_type", name="unique_user_r4_device"),
    )


# -------------------
# SITE CONTENT IMAGE
# -------------------
class SiteContentImage(Base):
    """Immagini gestibili dal superadmin per contenuti statici (es. la
    pagina /faq) — non legate a un giocatore/torneo specifico. Una riga per
    "slot", identificato da una `key` stabile scelta dal frontend (es.
    "faq_lega_founding"): permette di aggiungere nuovi slot in futuro senza
    modifiche allo schema, semplicemente usando una nuova key."""
    __tablename__ = "site_content_images"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String, nullable=False, unique=True)
    image_data = Column(Text, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    updated_by = relationship("User", foreign_keys=[updated_by_id])


# -------------------
# OVERLAY TEXT
# -------------------
class OverlayText(Base):
    """Testo dell'overlay di festeggiamento, per gioco — stesso principio di
    SiteContentImage (una riga per "slot", qui identificato dalla game key
    'mkds'/'mk8d') ma editabile dal superadmin da /superadmin invece che
    hardcoded in un file statico del frontend (frontend/src/assets/
    overlay-texts/<key>/texts.json, tenuto solo come fallback offline).
    `data` rispecchia la stessa forma di quel JSON (thankyou, countdown.*,
    derapata)."""
    __tablename__ = "overlay_texts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String, nullable=False, unique=True)
    data = Column(JSON, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    updated_by = relationship("User", foreign_keys=[updated_by_id])
