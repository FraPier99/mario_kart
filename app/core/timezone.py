from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

ROME_TZ = ZoneInfo("Europe/Rome")


def now_rome() -> datetime:
    """Current date and time in Europe/Rome timezone."""
    return datetime.now(ROME_TZ)


def rome_deadline_lock(tournament_date) -> datetime | None:
    """Calcola deadline: 23:59 del giorno prima dell'evento in ora italiana."""
    if tournament_date is None:
        return None
    event_start = datetime.combine(tournament_date, datetime.min.time(), tzinfo=ROME_TZ)
    return event_start - timedelta(minutes=1)
