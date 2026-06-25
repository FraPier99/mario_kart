"""
Helper per servire come URL le immagini salvate in base64 nel DB
(Player.img_url, Player.champion_photo) invece di incorporarle nelle
risposte JSON — un avatar da ~1MB ripetuto in ogni risposta (e in /gallery,
una volta per ogni commento di quella persona) è la causa principale
dell'egress eccessivo misurato su questo progetto.

Lo storage resta com'è (base64 in colonna TEXT): qui si trasforma solo
l'OUTPUT delle API. L'URL include un hash corto del contenuto come query
string, quindi può essere cachato in modo aggressivo (cambia da solo quando
l'immagine cambia, niente invalidazione manuale né colonna "updated_at" da
aggiungere).
"""

import base64
import hashlib

from app.core.config import PUBLIC_API_URL


def to_image_url(path: str, raw_value: str | None) -> str | None:
    """Se raw_value è un data URL base64, lo sostituisce con un URL assoluto
    verso `path` (con query string di versione). Se è già un URL esterno
    (caso legacy/inserito a mano), lo lascia invariato."""
    if not raw_value:
        return None
    if not raw_value.startswith("data:"):
        return raw_value
    version = hashlib.md5(raw_value.encode("utf-8")).hexdigest()[:10]
    return f"{PUBLIC_API_URL}{path}?v={version}"


def decode_data_url(data_url: str) -> tuple[str, bytes]:
    """Decodifica 'data:<mime>;base64,<payload>' in (mime, bytes grezzi)."""
    header, _, payload = data_url.partition(",")
    mime = "application/octet-stream"
    if header.startswith("data:") and ";base64" in header:
        mime = header[len("data:"):].split(";", 1)[0] or mime
    return mime, base64.b64decode(payload)
