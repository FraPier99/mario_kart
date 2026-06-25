"""
Ottimizzazione automatica delle immagini caricate (avatar, foto galleria,
foto campione, allegati commenti). Punto unico, lato server, perché:

  - la conversione GIF ANIMATA → WebP animato non è fattibile col canvas del
    browser (appiattirebbe l'animazione a un solo frame), quindi va fatta qui;
  - è autoritativa: qualunque cosa mandi il client (JPEG, PNG, GIF…) viene
    normalizzata a WebP ridimensionato, il formato che a parità di qualità
    pesa molto meno (misurato: GIF animate -65/80%).

Lo storage resta `data:<mime>;base64,...` in colonna TEXT (vedi app.core.media
per il serving come URL): qui si cambia solo il contenuto/peso, non il modo in
cui viene salvato o servito.

Robusto per definizione: a QUALSIASI errore (formato non riconosciuto, Pillow
assente, immagine corrotta) restituisce il data URL originale invariato — non
deve mai far fallire un upload.
"""

import base64
import io

QUALITY = 72


def _scaled_size(width, height, max_dimension):
    if width <= max_dimension and height <= max_dimension:
        return width, height
    if width >= height:
        return max_dimension, max(1, round(height / width * max_dimension))
    return max(1, round(width / height * max_dimension)), max_dimension


def _static_to_webp(img, max_dimension, quality):
    from PIL import Image

    frame = img.convert("RGBA")
    new_size = _scaled_size(*frame.size, max_dimension)
    if new_size != frame.size:
        frame = frame.resize(new_size, Image.LANCZOS)
    buffer = io.BytesIO()
    frame.save(buffer, format="WEBP", quality=quality, method=4)
    return buffer.getvalue()


def _animated_to_webp(img, max_dimension, quality):
    from PIL import Image, ImageSequence

    new_size = _scaled_size(*img.size, max_dimension)
    frames = []
    durations = []
    for frame in ImageSequence.Iterator(img):
        durations.append(frame.info.get("duration", 100))
        f = frame.convert("RGBA")
        if f.size != new_size:
            f = f.resize(new_size, Image.LANCZOS)
        frames.append(f)

    buffer = io.BytesIO()
    # method=4 è il compromesso velocità/peso giusto per un upload sincrono
    # (~1-1.5s anche per GIF da molti frame, vs molti secondi con method=6).
    frames[0].save(
        buffer,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=img.info.get("loop", 0),
        quality=quality,
        method=4,
    )
    return buffer.getvalue()


def optimize_image_data_url(
    data_url: str | None, max_dimension: int = 512, quality: int = QUALITY
) -> str | None:
    """
    Se `data_url` è un'immagine base64, la converte in WebP ridimensionato
    (animato se l'originale è una GIF animata) e restituisce il nuovo data
    URL — ma solo se è effettivamente più piccolo dell'originale. Altrimenti,
    o per valori non-immagine (None, URL esterni, errori), restituisce il
    valore originale invariato.
    """
    if not data_url or not data_url.startswith("data:"):
        return data_url

    try:
        from PIL import Image

        header, _, payload = data_url.partition(",")
        raw = base64.b64decode(payload)

        img = Image.open(io.BytesIO(raw))
        is_animated = getattr(img, "n_frames", 1) > 1

        if is_animated:
            new_bytes = _animated_to_webp(img, max_dimension, quality)
        else:
            new_bytes = _static_to_webp(img, max_dimension, quality)

        if not new_bytes or len(new_bytes) >= len(raw):
            return data_url
        return "data:image/webp;base64," + base64.b64encode(new_bytes).decode("ascii")
    except Exception:
        # Mai far fallire un upload per un problema di ottimizzazione.
        return data_url
