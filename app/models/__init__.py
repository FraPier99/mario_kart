"""
Modelli SQLAlchemy organizzati per dominio (tornei, schedine, utenti, cards).

Tutti i moduli condividono la stessa `Base` (vedi app.models.base): le relazioni
fra classi usano riferimenti a stringa (es. relationship("Tournament", ...)) che
SQLAlchemy risolve pigramente attraverso il registry condiviso, quindi le
relazioni cross-dominio funzionano a patto che ogni modulo venga importato qui
prima che venga eseguita una query.
"""
from app.models.base import Base

from app.models.utenti.models import (
    Player,
    User,
    TournamentPhoto,
    PhotoComment,
    Notification,
    Challenge,
    AuditLog,
    TempPassword,
    UserGameOwnership,
    UserConsoleOwnership,
    UserR4Device,
    SiteContentImage,
)
from app.models.tornei.models import (
    Game,
    Console,
    Character,
    Circuit,
    Tournament,
    TournamentPlayer,
    PlayoffHistory,
    Race,
    Result,
    Prediction,
    PointAdjustment,
)
from app.models.schedine.models import (
    SchedinaTorneo,
    SchedinaTorneoGroupStage,
    PremioTorneo,
)
from app.models.cards.models import UserInventory, CardUsageLog

__all__ = [
    "Base",
    "Player",
    "User",
    "TournamentPhoto",
    "PhotoComment",
    "Notification",
    "Challenge",
    "AuditLog",
    "TempPassword",
    "Game",
    "Console",
    "Character",
    "Circuit",
    "Tournament",
    "TournamentPlayer",
    "PlayoffHistory",
    "Race",
    "Result",
    "Prediction",
    "SchedinaTorneo",
    "SchedinaTorneoGroupStage",
    "PremioTorneo",
    "UserInventory",
    "CardUsageLog",
    "UserGameOwnership",
    "UserConsoleOwnership",
    "UserR4Device",
    "SiteContentImage",
]
