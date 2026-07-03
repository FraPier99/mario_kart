from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class SchedinaCreate(BaseModel):
    tournament_id: int
    classifica_ordinata: list[int]
    maggiore_streak_vittorie_id: int
    duello_player_a_id: Optional[int] = None
    duello_player_b_id: Optional[int] = None
    duello_scelta_id: Optional[int] = None
    duello_pareggio: bool = False
    spareggio_punti_vincitore: int = Field(..., ge=0)

    @model_validator(mode="after")
    def _validate_duello(self):
        # Pronostico Pareggio e scelta di un giocatore sono mutuamente esclusivi
        if self.duello_pareggio and self.duello_scelta_id is not None:
            raise ValueError(
                "Nel Duello scegli un giocatore oppure il Pareggio, non entrambi"
            )
        return self


class SchedinaResponse(BaseModel):
    id: int
    user_id: int
    tournament_id: int
    classifica_ordinata: list[int]
    maggiore_streak_vittorie_id: Optional[int] = None
    vittima_del_caos_id: Optional[int] = None
    duello_player_a_id: Optional[int] = None
    duello_player_b_id: Optional[int] = None
    duello_scelta_id: Optional[int] = None
    duello_pareggio: bool = False
    spareggio_punti_vincitore: Optional[int] = None
    total_points: int
    status: str
    actual_winner_points: Optional[int] = None
    tie_breaker_distance: Optional[int] = None
    created_at: datetime
    settled_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PremioTorneoResponse(BaseModel):
    id: int
    user_id: int
    torneo_sorgente_id: int
    torneo_id_prossimo: Optional[int] = None
    potere_ottenuto_true: bool
    created_at: datetime
    redeemed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SchedinaTournamentWinnerResponse(BaseModel):
    tournament_id: int
    tournament_name: str
    tournament_date: Optional[date] = None
    user_id: int
    username: str
    nickname: Optional[str] = None
    schedina_id: int
    points: int
    tie_breaker_distance: Optional[int] = None
    redeemed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SchedinaStandingResponse(BaseModel):
    schedina_id: int
    user_id: int
    username: str
    nickname: Optional[str] = None
    points: int
    tie_breaker_distance: Optional[int] = None
    created_at: datetime
    redeemed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SchedinaUserUsageResponse(BaseModel):
    user_id: int
    username: str
    nickname: Optional[str] = None
    schedine_compiled: int = 0
    schedine_won: int = 0
    prizes_redeemed: int = 0
    cards_owned: int = 0
    cards_used: int = 0

    model_config = {"from_attributes": True}


class SchedinaOverviewResponse(BaseModel):
    rules: dict[str, int]
    winners: list[SchedinaTournamentWinnerResponse]
    usage: list[SchedinaUserUsageResponse]


class SchedinaTournamentOverviewResponse(BaseModel):
    tournament_id: int
    tournament_name: str
    tournament_date: Optional[date] = None
    winner_user_id: Optional[int] = None
    winner_schedina_id: Optional[int] = None
    winner_username: Optional[str] = None
    winner_nickname: Optional[str] = None
    winner_points: int = 0
    winner_tiebreak_distance: Optional[int] = None
    premio: Optional[PremioTorneoResponse] = None
    standings: list[SchedinaStandingResponse]

    model_config = {"from_attributes": True}


class SchedinaSettlementResponse(BaseModel):
    tournament_id: int
    winner_user_id: Optional[int] = None
    winner_schedina_id: Optional[int] = None
    winner_points: int = 0
    winner_tiebreak_distance: Optional[int] = None
    premio: Optional[PremioTorneoResponse] = None
    vincitore_schedina_id: Optional[int] = None
    vincitore_username: Optional[str] = None
    vincitore_nickname: Optional[str] = None


class SchedinaPendingNotification(BaseModel):
    tournament_id: int
    tournament_name: str
    tournament_date: Optional[date] = None
    # deadline_lock è legacy (la deadline non blocca più nulla): il client
    # deve basarsi su schedine_locked per distinguere "compila ora" da
    # "schedina non compilata" — la chiusura è solo a evento
    # (bottone "Chiudi Schedine" / avanzamento di stato).
    deadline_lock: Optional[datetime] = None
    schedine_locked: bool = False
    tournament_format: Optional[str] = None
    message: str


class ScoreBreakdownItem(BaseModel):
    label: str
    pick_player_id: Optional[int] = None
    pick_nickname: Optional[str] = None
    correct: bool = False
    points: int = 0
    bonus_points: int = 0
    category: str = "position"

    model_config = {"from_attributes": True}


class SchedinaDetailEntry(BaseModel):
    schedina_id: int
    user_id: int
    username: str
    nickname: Optional[str] = None
    points: int = 0
    tie_breaker_distance: Optional[int] = None
    classifica_ordinata: list[int]
    maggiore_streak_vittorie_id: Optional[int] = None
    maggiore_streak_nickname: Optional[str] = None
    vittima_del_caos_id: Optional[int] = None
    vittima_del_caos_nickname: Optional[str] = None
    duello_scelta_id: Optional[int] = None
    duello_scelta_nickname: Optional[str] = None
    duello_pareggio: bool = False
    spareggio_punti_vincitore: Optional[int] = None
    created_at: datetime
    scoring_breakdown: list[ScoreBreakdownItem] = []

    model_config = {"from_attributes": True}


class SchedinaTournamentDetailResponse(BaseModel):
    tournament_id: int
    tournament_name: str
    tournament_date: Optional[date] = None
    user_has_predicted: bool = False
    winner_user_id: Optional[int] = None
    winner_schedina_id: Optional[int] = None
    winner_username: Optional[str] = None
    winner_nickname: Optional[str] = None
    winner_points: int = 0
    winner_tiebreak_distance: Optional[int] = None
    premio: Optional[PremioTorneoResponse] = None
    schedine: list[SchedinaDetailEntry]


class ParticipantStatusResponse(BaseModel):
    user_id: int
    username: str
    nickname: Optional[str] = None
    player_id: Optional[int] = None
    has_compiled: bool
    schedina_id: Optional[int] = None
    compiled_at: Optional[datetime] = None


class AllByTournamentEntry(BaseModel):
    tournament_id: int
    tournament_name: str
    tournament_date: Optional[date] = None
    tournament_status: str
    n_participants: int = 0
    n_compiled: int = 0
    all_compiled: bool = False
    schedine: list[SchedinaDetailEntry]


class AllByTournamentResponse(BaseModel):
    tournaments: list[AllByTournamentEntry]
