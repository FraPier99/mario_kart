"""
Misura il "costo dati" reale delle chiamate API — quanti KB scarica un client
per ogni endpoint, cioè l'egress che Railway fattura.

Colpisce un backend in esecuzione (default http://localhost:8000) e stampa
una tabella per endpoint con:
  - byte effettivamente trasferiti (rispettando Content-Encoding del server);
  - byte gzip potenziali (compressione calcolata in locale: se il server non
    comprime — oggi non c'è GZipMiddleware — mostra quanto si risparmierebbe);
  - header Cache-Control (assente = il browser riscarica tutto a ogni visita);
  - numero di elementi se la risposta è un array JSON;
  - KB di immagini base64 residue (stringhe "data:image/...") dentro il JSON,
    per verificare che la migrazione avatar->URL e la ricompressione WebP
    abbiano coperto tutto.

Il riepilogo finale somma i 7 endpoint di boot (quelli che AppDataContext
chiama a OGNI caricamento dell'app, per ogni utente) e segnala con [!] le
risposte sopra soglia.

Esempi:
    python scripts/measure_payloads.py
    python scripts/measure_payloads.py --base-url https://mio-backend.up.railway.app
    python scripts/measure_payloads.py --tournament-id 12 --username mario --password segreta
    python scripts/measure_payloads.py --threshold-kb 100
"""

import argparse
import gzip
import json
import sys

try:
    import requests
except ImportError:  # requests non nel venv: httpx c'è sempre (dipendenza FastAPI)
    import httpx as requests

# Gli endpoint chiamati da AppDataContext.refresh() a ogni caricamento app:
# il loro totale è il costo fisso che ogni utente paga sempre.
BOOT_ENDPOINTS = [
    "/players",
    "/characters",
    "/games",
    "/tournaments",
    "/races",
    "/results",
    "/circuits",
]

# Endpoint pesanti secondari, pubblici.
# NB: /gallery risponde 404 finché il router resta disattivato in app/main.py
# ("Galleria disattivata temporaneamente") — si misura comunque, così quando
# verrà riattivata il report la coprirà senza modifiche.
EXTRA_ENDPOINTS = [
    "/gallery",
]

# Endpoint autenticati (misurati solo con --username/--password).
AUTH_ENDPOINTS = [
    "/schedine/overview",
    "/schedine/me",
    "/schedine-deluxe/me",
    "/inventory/me",
    "/notifications",
]


def measure(session, base_url, path, headers=None):
    url = base_url.rstrip("/") + path
    try:
        resp = session.get(url, headers={"Accept-Encoding": "gzip", **(headers or {})}, timeout=30)
    except Exception as error:
        return {"path": path, "error": str(error)}

    body = resp.content  # già decompresso dalla libreria se il server ha compresso
    transferred = len(body)
    encoding = resp.headers.get("Content-Encoding", "")
    if encoding:
        # Il server ha compresso: il trasferito reale è il Content-Length,
        # se presente, altrimenti ricomprimiamo per stimarlo.
        content_length = resp.headers.get("Content-Length")
        transferred = int(content_length) if content_length else len(gzip.compress(body))

    gzip_potential = len(gzip.compress(body))

    item_count = None
    base64_kb = 0
    base64_count = 0
    try:
        data = json.loads(body)
        if isinstance(data, list):
            item_count = len(data)
        # Cerca immagini base64 residue in qualunque punto del JSON.
        text = body.decode("utf-8", errors="ignore")
        start = 0
        while True:
            idx = text.find("data:image/", start)
            if idx == -1:
                break
            end = text.find('"', idx)
            if end == -1:
                break
            base64_count += 1
            base64_kb += (end - idx) / 1024
            start = end
    except (json.JSONDecodeError, UnicodeDecodeError):
        pass

    return {
        "path": path,
        "status": resp.status_code,
        "transferred": transferred,
        "raw": len(body),
        "gzip_potential": gzip_potential,
        "encoding": encoding or "-",
        "cache_control": resp.headers.get("Cache-Control", "-"),
        "items": item_count,
        "base64_count": base64_count,
        "base64_kb": base64_kb,
    }


def kb(n):
    return f"{n / 1024:7.1f}"


def print_row(m, threshold_bytes):
    if "error" in m:
        print(f"  {m['path']:<44} ERRORE: {m['error']}")
        return
    flag = " [!]" if m["transferred"] > threshold_bytes else ""
    cache_flag = " [no-cache!]" if m["cache_control"] == "-" else ""
    items = f"{m['items']:>5}" if m["items"] is not None else "    -"
    b64 = f"  base64: {m['base64_count']}x/{m['base64_kb']:.0f}KB" if m["base64_count"] else ""
    print(
        f"  {m['path']:<44} {m['status']}  "
        f"trasf {kb(m['transferred'])}KB  "
        f"(gzip pot. {kb(m['gzip_potential'])}KB)  "
        f"n={items}  "
        f"cache: {m['cache_control']}{cache_flag}{flag}{b64}"
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://localhost:8000")
    parser.add_argument("--tournament-id", type=int, default=None,
                        help="misura anche overview/detail di questo torneo")
    parser.add_argument("--username", default=None)
    parser.add_argument("--password", default=None)
    parser.add_argument("--threshold-kb", type=float, default=200.0,
                        help="soglia [!] sui byte trasferiti (default 200KB)")
    args = parser.parse_args()

    threshold_bytes = args.threshold_kb * 1024
    session = requests.Session() if hasattr(requests, "Session") else requests.Client()

    endpoints = list(EXTRA_ENDPOINTS)
    if args.tournament_id:
        endpoints += [
            f"/tournaments/{args.tournament_id}/overview",
            f"/schedine/tournament/{args.tournament_id}/detail",
        ]

    auth_headers = None
    if args.username and args.password:
        login_url = args.base_url.rstrip("/") + "/auth/login"
        resp = session.post(login_url, json={"username": args.username, "password": args.password}, timeout=30)
        if resp.status_code == 200:
            auth_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
        else:
            print(f"Login fallito ({resp.status_code}): sezione autenticata saltata.\n")

    print(f"Backend: {args.base_url}\n")

    print("=== ENDPOINT DI BOOT (pagati a ogni caricamento app, da ogni utente) ===")
    boot_results = []
    for path in BOOT_ENDPOINTS:
        m = measure(session, args.base_url, path)
        boot_results.append(m)
        print_row(m, threshold_bytes)

    print("\n=== ENDPOINT SECONDARI ===")
    for path in endpoints:
        # Con login attivo il token si usa anche qui: /schedine/tournament/
        # {id}/detail è autenticato, gli endpoint pubblici lo ignorano.
        print_row(measure(session, args.base_url, path, headers=auth_headers), threshold_bytes)

    if auth_headers:
        print("\n=== ENDPOINT AUTENTICATI ===")
        for path in AUTH_ENDPOINTS:
            print_row(measure(session, args.base_url, path, headers=auth_headers), threshold_bytes)

    ok = [m for m in boot_results if "error" not in m]
    if ok:
        total = sum(m["transferred"] for m in ok)
        total_gzip = sum(m["gzip_potential"] for m in ok)
        no_compression = all(m["encoding"] == "-" for m in ok)
        print("\n=== RIEPILOGO BOOT ===")
        print(f"Costo di un caricamento app: {total / 1024:.1f} KB trasferiti "
              f"({total / 1024 / 1024:.2f} MB)")
        if no_compression:
            print(f"[!] Il server NON comprime le risposte (nessun Content-Encoding): "
                  f"con gzip il boot costerebbe {total_gzip / 1024:.1f} KB "
                  f"(-{(1 - total_gzip / total) * 100:.0f}%). "
                  f"Valutare GZipMiddleware in app/main.py.")
        missing_cache = [m["path"] for m in ok if m["cache_control"] == "-"]
        if missing_cache:
            print(f"[!] Endpoint di boot senza Cache-Control: {', '.join(missing_cache)}")
        heavy = [m for m in ok if m["transferred"] > threshold_bytes]
        for m in heavy:
            print(f"[!] {m['path']} pesa {m['transferred'] / 1024:.0f} KB "
                  f"(soglia {args.threshold_kb:.0f} KB)")
        b64_total = sum(m["base64_kb"] for m in ok)
        if b64_total > 0:
            print(f"[!] Immagini base64 residue nel JSON di boot: {b64_total:.0f} KB totali "
                  f"— eseguire scripts/recompress_images.py o verificare la migrazione avatar->URL.")


if __name__ == "__main__":
    main()
