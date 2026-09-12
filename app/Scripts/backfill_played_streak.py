"""
Ricostruisce PlayerGameParticipation.played_streak/last_played_streak_tournament_id
leggendo lo storico reale dei tornei conclusi (non amichevoli) — il contatore
è stato introdotto per correggere il badge "Costanza" (prima leggeva
current_streak, che si incrementa alla creazione/iscrizione del torneo e
non quando il torneo viene davvero giocato). Senza questo backfill, un
giocatore con uno streak reale già in corso perderebbe il badge finché non
concluda 1-3 nuovi tornei da zero — una regressione visibile evitabile
rigiocando la storia una volta sola.

A differenza di backfill_participation_tracking.py, NON cancella le righe
esistenti: sovrascrive solo played_streak/last_played_streak_tournament_id
per ogni riga (o ne crea di nuove se un giocatore ha giocato ma non ha mai
avuto una riga in player_game_participation), lasciando current_streak/
tournaments_missed_in_a_row/last_tournament_id_seen/last_nudged_at_missed_count
— il meccanismo di iscrizione/promemoria, indipendente — completamente
intatti.

Esecuzione:
    $env:PYTHONPATH = "."
    python app/Scripts/backfill_played_streak.py
"""

from app.core.db import SessionLocal
from app.models import Game, PlayerGameParticipation, Race, Result, Tournament
from app.services.tornei.tournaments import _recompute_played_streak


def main():
    db = SessionLocal()
    try:
        print("=== BACKFILL PLAYED STREAK ===")

        already_populated = (
            db.query(PlayerGameParticipation)
            .filter(PlayerGameParticipation.played_streak > 0)
            .count()
        )
        if already_populated:
            print(
                f"Trovate {already_populated} righe con played_streak già valorizzato."
            )
            confirm = input("Ricalcolare comunque e sovrascrivere? [s/N] ").strip().lower()
            if confirm != "s":
                print("Annullato.")
                return

        games = db.query(Game).all()
        total = 0

        for game in games:
            player_ids = {
                row[0]
                for row in db.query(Result.player_id)
                .join(Race, Race.id == Result.race_id)
                .join(Tournament, Tournament.id == Race.tournament_id)
                .filter(
                    Tournament.game_id == game.id,
                    Tournament.is_friendly.is_(False),
                    Tournament.winner_id.isnot(None),
                    Race.is_duello.is_(False),
                )
                .distinct()
                .all()
            }
            if not player_ids:
                continue

            print(f"\n--- {game.name}: {len(player_ids)} giocatori ---")
            for player_id in player_ids:
                _recompute_played_streak(db, player_id, game.id)
                total += 1

        print(f"\nFatto. played_streak ricalcolato per {total} coppie giocatore/gioco.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
