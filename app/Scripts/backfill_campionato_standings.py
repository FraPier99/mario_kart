"""
Ricostruisce campionato_standings (posizione finale + punti campionato per
giocatore) per tutti i tornei già conclusi — retroattivo per costruzione:
usa la stessa funzione _settle_campionato_standings già chiamata alla
conclusione live di un torneo (update_tournament/set_tournament_playoff_
winner), quindi nessuna logica duplicata, solo riesecuzione sullo storico.

Idempotente (upsert su tournament_id+player_id, vedi
_settle_campionato_standings): rieseguibile senza rischio dopo aver
concluso nuovi tornei o se i punti-campionato ritoccati in
app/data/punteggi_campionato.py vanno riapplicati allo storico.

Esecuzione:
    $env:PYTHONPATH = "."
    python app/Scripts/backfill_campionato_standings.py
"""

from app.core.db import SessionLocal
from app.models import Tournament
from app.services.tornei.tournaments import _settle_campionato_standings


def main():
    db = SessionLocal()
    try:
        print("=== BACKFILL CAMPIONATO STANDINGS ===")

        tournaments = (
            db.query(Tournament)
            .filter(
                Tournament.status == "concluso",
                Tournament.is_friendly.is_(False),
            )
            .order_by(Tournament.date.asc().nullslast(), Tournament.id.asc())
            .all()
        )
        print(f"Tornei conclusi non amichevoli da processare: {len(tournaments)}")

        for t in tournaments:
            _settle_campionato_standings(db, t)
            print(f"  torneo #{t.id} '{t.name}' ({t.tournament_format}) — ok")

        print("=== FATTO ===")
    finally:
        db.close()


if __name__ == "__main__":
    main()
