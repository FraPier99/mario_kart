from pydantic import BaseModel, Field, StringConstraints
from typing import Annotated, Literal, Optional
from datetime import date, datetime


NormalizeStr = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True)]
TournamentStatus = Literal["da_svolgere", "in_corso", "finito", "concluso"]
TournamentFormat = Literal["classic", "group_stage"]


class CreateTournament(BaseModel):
    name: NormalizeStr
    n_players: int = Field(
        ..., gt=0, description="Number of players must be greater than 0"
    )
    n_races: Optional[int] = Field(
        default=None, gt=0, description="Number of races (auto-computed if not set)"
    )
    n_races_group_stage: Optional[int] = Field(
        default=None, gt=0, description="Gare per girone (solo torneo a gironi)"
    )
    n_races_semifinals: Optional[int] = Field(
        default=None, gt=0, description="Gare per semifinale (solo torneo a gironi)"
    )
    n_races_final: Optional[int] = Field(
        default=None, gt=0, description="Gare per finale (solo torneo a gironi)"
    )
    date: date
    game_id: int
    status: TournamentStatus = "da_svolgere"
    winner_id: Optional[int] = None
    duello_player_a_id: Optional[int] = None
    duello_player_b_id: Optional[int] = None
    participant_ids: list[int] = Field(
        default_factory=list, description="IDs dei giocatori partecipanti"
    )
    tournament_format: TournamentFormat = "classic"


class TournamentResponse(BaseModel):
    id: int
    name: NormalizeStr
    n_players: int
    n_races: int
    date: date
    game_id: int
    status: TournamentStatus = "da_svolgere"
    winner_id: Optional[int] = None
    deadline_lock: Optional[datetime] = None
    vincitore_schedina_id: Optional[int] = None
    duello_player_a_id: Optional[int] = None
    duello_player_b_id: Optional[int] = None
    participant_ids: list[int] = Field(default_factory=list)
    withdrawn_player_ids: list[int] = Field(default_factory=list)
    schedine_locked: bool = False
    tournament_format: TournamentFormat = "classic"
    format_data: Optional[dict] = (
        None  # format-specific JSON (es. {"A":[...], "B":[...]})
    )
    consolation_winner_id: Optional[int] = None

    model_config = {"from_attributes": True}


class UpdateTournament(BaseModel):
    name: Optional[NormalizeStr] = None
    n_races: Optional[int] = None
    date: Optional[date] = None
    game_id: Optional[int] = None
    status: Optional[TournamentStatus] = None
    winner_id: Optional[int] = None
    deadline_lock: Optional[datetime] = None
    duello_player_a_id: Optional[int] = None
    duello_player_b_id: Optional[int] = None
    participant_ids: Optional[list[int]] = None
    tournament_format: Optional[TournamentFormat] = None
    consolation_winner_id: Optional[int] = None
    format_data: Optional[dict] = None


class TournamentPlayoffRequest(BaseModel):
    player_one_id: int
    player_two_id: int
    winner_id: int


class SetPlayerWithdrawal(BaseModel):
    withdrawn: bool


class CompleteGroupRequest(BaseModel):
    group_key: str
