from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

ROME_TZ = ZoneInfo("Europe/Rome")


def now_rome() -> datetime:
    """Current date and time in Europe/Rome timezone, naive (no tzinfo).

    Tutte le colonne DateTime dei modelli sono naive (nessuna con
    timezone=True). Se questa funzione restituisse un datetime aware,
    Postgres convertirebbe implicitamente il valore al fuso di sessione
    (tipicamente UTC) scartando l'offset in scrittura — sottraendo
    silenziosamente 1-2 ore (l'offset di Roma) e sfasando ogni timestamp
    salvato. Restituendo già un valore naive con i campi corretti (ora di
    Roma) non avviene nessuna conversione implicita.
    """
    return datetime.now(ROME_TZ).replace(tzinfo=None)


def rome_deadline_lock(tournament_date) -> datetime | None:
    """Calcola deadline: 23:59 del giorno prima dell'evento in ora italiana."""
    if tournament_date is None:
        return None
    event_start = datetime.combine(tournament_date, datetime.min.time(), tzinfo=ROME_TZ)
    return (event_start - timedelta(minutes=1)).replace(tzinfo=None)
