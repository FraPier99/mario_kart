"""
One-shot script: ricomprime (resize + JPEG) le immagini già salvate in base64
nel DB — avatar giocatori, foto campione, foto galleria. Misurato prima di
questo script: avatar ~978KB di media, foto galleria ~432KB di media, tutte
caricate senza nessun ridimensionamento lato client (fix applicato solo per
i NUOVI upload, vedi frontend/src/lib/imageCompression.js — questo script
sistema i dati già esistenti, una volta sola).

Le GIF animate vengono ridimensionate frame-per-frame mantenendo
animazione/durata/loop (non convertite in JPEG, che le appiattirebbe a un
solo frame statico) — il grosso del peso di una GIF è la risoluzione, non il
fatto che sia animata, quindi il resize da solo basta a tagliarne molto il
peso senza perdere l'effetto.

Run from project root:  python Scripts/recompress_images.py
"""

import base64
import io
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from PIL import Image, ImageSequence

from app.core.db import SessionLocal
from app.models import Player, TournamentPhoto

QUALITY = 82

# (modello, colonna, dimensione massima) — stessi valori usati lato frontend
# in imageCompression.js, per consistenza tra nuovi upload e dati esistenti.
TARGETS = [
    (Player, "img_url", 400),
    (Player, "champion_photo", 1000),
    (TournamentPhoto, "image_data", 1280),
]


def _scaled_size(width, height, max_dimension):
    if width <= max_dimension and height <= max_dimension:
        return width, height
    if width >= height:
        return max_dimension, round(height / width * max_dimension)
    return round(width / height * max_dimension), max_dimension


def _resize_animated_gif(raw: bytes, max_dimension: int) -> bytes:
    img = Image.open(io.BytesIO(raw))
    new_size = _scaled_size(*img.size, max_dimension)
    loop = img.info.get("loop", 0)

    # RGB (non RGBA) + quantize esplicito a 256 colori per ogni frame: la
    # quantizzazione automatica di save() su frame RGBA con pochi colori
    # univoci (tipico di GIF semplici) falliva con "invalid palette size".
    # Si perde la trasparenza (accettabile per un avatar), in cambio di un
    # salvataggio molto più robusto.
    durations = []
    frames = []
    for frame in ImageSequence.Iterator(img):
        durations.append(frame.info.get("duration", 100))
        frame = frame.convert("RGB")
        if frame.size != new_size:
            frame = frame.resize(new_size, Image.LANCZOS)
        quantized = frame.quantize(colors=256)
        # .info può ancora portarsi dietro un valore "transparency" dal
        # frame P-mode originale, in un formato incompatibile con la nuova
        # palette ricalcolata qui — causa "Transparency for P mode should
        # be bytes or int" al salvataggio. Già persa la trasparenza
        # convertendo a RGB sopra, quindi va solo scartata.
        quantized.info.pop("transparency", None)
        frames.append(quantized)

    buffer = io.BytesIO()
    frames[0].save(
        buffer,
        format="GIF",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=loop,
        optimize=True,
    )
    return buffer.getvalue()


def _resize_static_image(raw: bytes, max_dimension: int) -> bytes:
    img = Image.open(io.BytesIO(raw)).convert("RGB")  # rimuove eventuale alpha, serve per JPEG
    new_size = _scaled_size(*img.size, max_dimension)
    if new_size != img.size:
        img = img.resize(new_size, Image.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=QUALITY, optimize=True)
    return buffer.getvalue()


def recompress(data_url: str, max_dimension: int) -> str | None:
    header, _, payload = data_url.partition(",")
    is_gif = "image/gif" in header

    try:
        raw = base64.b64decode(payload)
        if is_gif:
            new_bytes = _resize_animated_gif(raw, max_dimension)
            mime = "image/gif"
        else:
            new_bytes = _resize_static_image(raw, max_dimension)
            mime = "image/jpeg"

        if len(new_bytes) >= len(raw):
            return None  # il "compresso" è più pesante dell'originale, non vale la pena

        return f"data:{mime};base64,{base64.b64encode(new_bytes).decode('ascii')}"
    except Exception as exc:
        print(f"    saltata (errore: {exc})")
        return None


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
                new_value = recompress(raw_value, max_dimension)
                if new_value is None:
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
