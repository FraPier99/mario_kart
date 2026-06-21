from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import date, datetime

from app.controllers.schedine.schemas.schedine import PremioTorneoResponse


class SchedinaTorneoGroupStageCreate(BaseModel):
    tournament_id: int
    # 1. Finalisti: player ID che si prevede passino alla fase finale
    finalisti_ids: list[int] = Field(..., min_length=2)
    # 2. Classifica Finale: ordine podio previsto tra i finalisti (riparte da 0, separata dai gironi)
    classifica_finale_ordinata: list[int] = Field(..., min_length=2)
    # 2b. Classifica Gironi: per ciascun girone della fase 1, l'ordine completo previsto dei giocatori (1°→ultimo)
    classifiche_gironi: dict[str, list[int]] = Field(default_factory=dict)
    # 3. Il Duello: pronostico testa a testa tra i due giocatori scelti dall'admin
    duello_scelta_id: Optional[int] = None
    # 3b. Pronostico Pareggio nel Duello (A e B a pari punti totali)
    duello_pareggio: bool = False
    # 4. Spareggio: distanza esatta di punti tra 1° e 2° classificato del torneo
    spareggio_distanza: int = Field(..., ge=0)

    @model_validator(mode="after")
    def _validate_duello(self):
        if self.duello_pareggio and self.duello_scelta_id is not None:
            raise ValueError("Nel Duello scegli un giocatore oppure il Pareggio, non entrambi")
        return self


class SchedinaTorneoGroupStageResponse(BaseModel):
    id: int
    user_id: int
    tournament_id: int
    finalisti_ids: list[int]
    classifica_finale_ordinata: list[int]
    classifiche_gironi: dict[str, list[int]] = {}
    duello_player_a_id: Optional[int] = None
    duello_player_b_id: Optional[int] = None
    duello_scelta_id: Optional[int] = None
    duello_pareggio: bool = False
    spareggio_distanza: int
    total_points: int
    status: str
    created_at: datetime
    settled_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ClassificaFinalePositionItem(BaseModel):
    label: str
    pick_player_id: Optional[int] = None
    pick_nickname: Optional[str] = None
    correct: bool = False
    points: int = 0
    category: str = "position"


class FinalistiBreakdown(BaseModel):
    corretti: list[int] = []
    corretti_nicknames: list[Optional[str]] = []
    n_corretti: int = 0
    punti: int = 0


class ClassificaFinaleBreakdown(BaseModel):
    posizioni_corrette: int = 0
    punti: int = 0
    posizioni: list[ClassificaFinalePositionItem] = []


class DuelloBreakdown(BaseModel):
    corretto: bool = False
    punti: int = 0
    pareggio: bool = False


class GironeClassificaBreakdown(BaseModel):
    posizioni_corrette: int = 0
    punti: int = 0
    posizioni: list[ClassificaFinalePositionItem] = []


class ClassificheGironiBreakdown(BaseModel):
    punti: int = 0
    gironi: dict[str, GironeClassificaBreakdown] = {}


class SchedinaDeluxeScoreBreakdown(BaseModel):
    finalisti: FinalistiBreakdown
    classifica_finale: ClassificaFinaleBreakdown
    classifiche_gironi: ClassificheGironiBreakdown
    duello: DuelloBreakdown


class SchedinaDeluxeDetailEntry(BaseModel):
    schedina_id: int
    user_id: int
    username: str
    nickname: Optional[str] = None
    points: int = 0
    tie_breaker_distance: Optional[int] = None
    finalisti_ids: list[int]
    finalisti_nicknames: list[Optional[str]] = []
    classifica_finale_ordinata: list[int]
    classifica_finale_nicknames: list[Optional[str]] = []
    classifiche_gironi: dict[str, list[int]] = {}
    classifiche_gironi_nicknames: dict[str, list[Optional[str]]] = {}
    duello_scelta_id: Optional[int] = None
    duello_scelta_nickname: Optional[str] = None
    duello_pareggio: bool = False
    spareggio_distanza: Optional[int] = None
    created_at: datetime
    scoring_breakdown: SchedinaDeluxeScoreBreakdown

    model_config = {"from_attributes": True}


class SchedinaDeluxeTournamentDetailResponse(BaseModel):
    tournament_id: int
    tournament_name: str
    tournament_date: Optional[date] = None
    user_has_predicted: bool = False
    actual_finalisti: list[int] = []
    actual_finalisti_nicknames: list[Optional[str]] = []
    actual_classifica_finale: list[int] = []
    actual_classifica_finale_nicknames: list[Optional[str]] = []
    actual_classifiche_gironi: dict[str, list[int]] = {}
    actual_classifiche_gironi_nicknames: dict[str, list[Optional[str]]] = {}
    actual_top_two_gap: int = 0
    actual_duello_outcome: Optional[int] = None
    actual_duello_pareggio: bool = False
    winner_user_id: Optional[int] = None
    winner_schedina_id: Optional[int] = None
    winner_username: Optional[str] = None
    winner_nickname: Optional[str] = None
    winner_points: int = 0
    winner_tiebreak_distance: Optional[int] = None
    premio: Optional[PremioTorneoResponse] = None
    schedine: list[SchedinaDeluxeDetailEntry]
