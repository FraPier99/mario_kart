"""
One-shot script: ri-ottimizza le immagini già salvate in base64 nel DB
(avatar giocatori, foto campione, foto galleria) usando lo STESSO ottimizzatore
applicato ai nuovi upload — app.core.image_optim.optimize_image_data_url:
converte tutto in WebP ridimensionato, GIF animate incluse (→ WebP animato),
che a parità di qualità pesano molto meno (misurato: GIF -65/80%).

Aggiorna una riga solo se il risultato è effettivamente più piccolo
(l'ottimizzatore stesso restituisce l'originale se non c'è guadagno), quindi
è sicuro rilanciarlo più volte.

Run from project root:  python Scripts/recompress_images.py
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.db import SessionLocal
from app.core.image_optim import optimize_image_data_url
from app.models import Player, TournamentPhoto

# (modello, colonna, dimensione massima) — stessi valori dei punti di upload
# (vedi app/controllers/utenti/auth.py, players.py, services/utenti/gallery.py).
TARGETS = [
    (Player, "img_url", 400),
    (Player, "champion_photo", 1000),
    (TournamentPhoto, "image_data", 1280),
]


def main():
    db = SessionLocal()
    try:
        total_before = 0
        total_after = 0
        total_rows = 0

        for model, column, max_dimension in TARGETS:
            rows = db.query(model).filter(getattr(model, column).isnot(None)).all()
            print(f"{model.__tablename__}.{column}: {len(rows)} righe con immagine")

            for row in rows:
                raw_value = getattr(row, column)
                if not raw_value or not raw_value.startswith("data:"):
                    continue

                before_size = len(raw_value)
                new_value = optimize_image_data_url(raw_value, max_dimension=max_dimension)
                if new_value is None or len(new_value) >= before_size:
                    continue

                setattr(row, column, new_value)
                after_size = len(new_value)
                total_before += before_size
                total_after += after_size
                total_rows += 1
                print(f"    id={row.id}: {before_size // 1024}KB -> {after_size // 1024}KB")

        db.commit()

        print()
        print(f"Righe aggiornate: {total_rows}")
        print(f"Totale prima:     {total_before / 1024 / 1024:.2f} MB")
        print(f"Totale dopo:      {total_after / 1024 / 1024:.2f} MB")
        if total_before:
            saved_pct = (1 - total_after / total_before) * 100
            print(f"Risparmiato:      {saved_pct:.1f}%")
    finally:
        db.close()


if __name__ == "__main__":
    main()
