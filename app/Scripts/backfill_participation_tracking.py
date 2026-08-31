"""
Ricostruisce app.models.PlayerGameParticipation (streak/assenze consecutive)
leggendo lo storico reale dei tornei già svolti, invece di far ripartire
tutti da zero da quando la feature è stata introdotta. Rigioca, in ordine
cronologico e per ciascun game_id, la stessa identica logica di
_sync_participation_tracking (app/services/tornei/tournaments.py) usata da
create_tournament per i tornei nuovi.

Un giocatore che risulta già oggi assente da 3+ tornei di fila riceve
SUBITO il promemoria di rientro "participation_nudge" (una tantum, come da
soglia PARTICIPATION_NUDGE_THRESHOLD) — è esattamente l'intervento voluto,
non ha senso aspettare la creazione di un torneo futuro.

Idempotente solo nel senso che ri-eseguirlo su dati invariati non produce
nuove notifiche (last_nudged_at_missed_count viene già aggiornato durante
il replay) — non va invece eseguito due volte se nel frattempo sono stati
creati nuovi tornei "veri" via create_tournament, che aggiornano già la
tabella da soli: in quel caso il replay ripartirebbe da zero e conterebbe
gli stessi tornei una seconda volta.

Esecuzione:
    $env:PYTHONPATH = "."
    python app/Scripts/backfill_participation_tracking.py
"""

from app.core.db import SessionLocal
from app.models import Game, PlayerGameParticipation, Tournament
from app.services.tornei.tournaments import (
    _load_participants,
    _sync_participation_tracking,
)
from app.services.utenti.notifications import create_single_notification
from app.models import User


def main():
    db = SessionLocal()
    try:
        print("=== BACKFILL PARTICIPATION TRACKING ===")

        existing = db.query(PlayerGameParticipation).count()
        if existing:
            print(
                f"Trovate {existing} righe già presenti in player_game_participation: "
                "annullo per evitare di contare i tornei due volte."
            )
            confirm = input("Procedere e ricostruire da zero? [s/N] ").strip().lower()
            if confirm != "s":
                print("Annullato.")
                return
            db.query(PlayerGameParticipation).delete(synchronize_session=False)
            db.commit()

        games = db.query(Game).all()
        total_nudges = 0

        for game in games:
            tournaments = (
                db.query(Tournament)
                .filter(
                    Tournament.game_id == game.id,
                    Tournament.is_friendly.is_(False),
                    Tournament.date.isnot(None),
                )
                .order_by(Tournament.date.asc(), Tournament.id.asc())
                .all()
            )
            if not tournaments:
                continue

            print(f"\n--- {game.name}: {len(tournaments)} tornei ---")
            nudge_user_ids: list[int] = []
            for t in tournaments:
                _load_participants(db, t)
                # L'ultima chiamata (torneo più recente) è quella il cui esito
                # "chi manca da 3+" riflette lo stato attuale: le precedenti
                # aggiornano solo streak/assenze intermedie senza notificare,
                # esattamente come farebbe create_tournament in sequenza.
                nudge_user_ids = _sync_participation_tracking(db, t)

            for user_id in nudge_user_ids:
                user = db.query(User).filter(User.id == user_id).first()
                create_single_notification(
                    db,
                    user_id,
                    "participation_nudge",
                    f"Nuovo badge in Lega Kart: torna a giocare a {game.name}, ti aspettiamo!",
                    source_tournament_id=tournaments[-1].id,
                )
                total_nudges += 1
                print(f"  promemoria inviato a user_id={user_id} ({user.username if user else '?'})")

            db.commit()

        print(f"\nFatto. {total_nudges} promemoria di rientro inviati.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
