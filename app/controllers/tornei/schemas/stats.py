from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel


class LeaderBoardResponse(BaseModel):
    id: int
    nickname: str
    total_point: int


class HeadToHeadPlayerRef(BaseModel):
    id: int
    nickname: str


class HeadToHeadSummaryResponse(BaseModel):
    total_races: int
    wins_a: int
    wins_b: int
    # Sempre 0 con le regole attuali: Result ha un UniqueConstraint su
    # (race_id, position), quindi due giocatori non possono mai condividere
    # la stessa posizione nella stessa gara. Il campo resta esposto per
    # future evoluzioni delle regole (es. introduzione di ex-aequo).
    ties: int
    win_pct_a: float
    win_pct_b: float


class HeadToHeadCircuitBreakdown(BaseModel):
    circuit_id: int
    circuit_name: str
    total_races: int
    wins_a: int
    wins_b: int
    ties: int


class HeadToHeadMatchHistoryItem(BaseModel):
    race_id: int
    tournament_id: int
    tournament_name: str
    tournament_date: Optional[date]
    circuit_id: int
    circuit_name: str
    position_a: int
    position_b: int
    winner: Optional[Literal["a", "b"]]


class HeadToHeadResponse(BaseModel):
    player_a: HeadToHeadPlayerRef
    player_b: HeadToHeadPlayerRef
    summary: HeadToHeadSummaryResponse
    by_circuit: list[HeadToHeadCircuitBreakdown]
    history: list[HeadToHeadMatchHistoryItem]


class CircuitTopWinner(BaseModel):
    player_id: int
    player_nickname: str
    wins: int


class CircuitStatsListItem(BaseModel):
    circuit_id: int
    circuit_name: str
    total_races: int
    total_podiums: int
    avg_points_per_race: float
    top_winner: Optional[CircuitTopWinner]


class CircuitPlayerRanking(BaseModel):
    player_id: int
    player_nickname: str
    races_played: int
    wins: int
    podiums: int
    podium_rate: float
    avg_position: Optional[float]


class CircuitStatsDetailResponse(BaseModel):
    circuit_id: int
    ranking: list[CircuitPlayerRanking]


class PlayerGameBadgeResponse(BaseModel):
    game_id: int
    game_name: str
    # Codice stabile per la palette/icona lato frontend — vedi
    # BADGE_TIER_RANK in app/services/tornei/stats.py per l'ordine di
    # esclusività. Il "label" (nome mostrato) può cambiare copy senza
    # rompere il frontend, il "tier" no.
    tier: Literal["leggenda", "campione", "veterano", "outsider", "sfidante", "esordiente"]
    label: str
    tournaments_played: int
    wins: int
    podiums: int
    podium_rate: float


class PlayerBestBadgeResponse(BaseModel):
    player_id: int
    game_id: int
    game_name: str
    tier: Literal["leggenda", "campione", "veterano", "outsider", "sfidante", "esordiente"]
    label: str
