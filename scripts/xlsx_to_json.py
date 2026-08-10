#!/usr/bin/env python3
"""
Converte Skiathos.xlsx (foglio "Giornaliero") in webapp/data/itinerary.json.

Rilancialo ogni volta che modifichi l'Excel:
    python3 scripts/xlsx_to_json.py

Logica di lettura (il foglio non ha una griglia rigida: ogni giorno è una
colonna B..M e il contenuto è sparso su righe diverse a seconda di cosa c'è
da dire quel giorno). Per ogni colonna/giorno raccogliamo tutti i blocchi di
testo non vuoti dalle righe 4-13, in ordine, e li classifichiamo così:
  - "heading": testo corto e in grassetto/font grande -> titolo/luogo
  - "paragraph": testo lungo (>=100 caratteri) -> descrizione della giornata
  - "note": tutto il resto -> chip con icona (voli, bagagli, spesa, cena...)
"""
import html
import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path
from urllib.parse import quote

import openpyxl

ROOT = Path(__file__).resolve().parent.parent.parent
XLSX_PATH = ROOT / "Skiathos.xlsx"
OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "itinerary.json"

SHEET_NAME = "Giornaliero"
DAY_COLUMNS = list("BCDEFGHIJKLM")  # 12 giorni
FIRST_ROW = 4
LAST_ROW = 13
YEAR = 2026
MONTH = 8

ICONS = [
    (r"malpensa|\bjsi\b|\bmpx\b|volo", "✈️"),      # ✈️ voli/treni
    (r"bagagli", "\U0001F9F3"),                               # 🧳
    (r"\bspesa\b", "\U0001F6D2"),                              # 🛒
    (r"dinner|cena|ristorante|restaurant|basilikos|windmill", "\U0001F37D️"),  # 🍽️
    (r"escursione|barca|boat", "⛵"),                      # ⛵
    (r"motorino|scooter", "\U0001F6F5"),                       # 🛵
    (r"arrivo|consegna", "\U0001F6EC"),                        # 🛬
]
DEFAULT_ICON = "\U0001F4CD"  # 📍

WEEKDAYS_IT = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"]

# owner della giornata (chi ha in mano il programma) — indicizzato per giorno del mese
OWNERS = {
    16: "Giulia", 17: "Giulia",
    18: "Giacomo", 19: "Giacomo",
    20: "Giulia", 21: "Giulia",
    22: "Giacomo", 23: "Giacomo", 24: "Giacomo",
}

# blocchi che erano solo un'annotazione informale di owner nel foglio originale
# (ora sostituita dal badge "owner" strutturato) -> li scartiamo per non duplicare
STRAY_NAME_ONLY = {"giulia", "giacomo"}

# luoghi/ristoranti riconosciuti nei testi -> query per Google Maps.
# Ordine: le frasi più specifiche/lunghe vanno PRIMA di quelle più generiche
# che le contengono (es. "Skopelos Town" prima di "Skopelos"), perché il
# regex di alternanza prova le alternative nell'ordine in cui compaiono.
PLACES = [
    ("Agios Ioannis a Castri", "Agios Ioannis Kastri, Skopelos, Grecia"),
    ("Monastero di Evangelistria", "Moni Evangelistrias, Skiathos, Grecia"),
    ("Holy Monastery of the Annunciation to the Virgin Mary", "Moni Evangelistrias, Skiathos, Grecia"),
    ("Evangelistria", "Moni Evangelistrias, Skiathos, Grecia"),
    ("The Windmill Restaurant", "The Windmill Restaurant, Skiathos, Grecia"),
    ("Skopelos Town", "Skopelos Town, Grecia"),
    ("Agia Eleni", "Agia Eleni Beach, Skiathos, Grecia"),
    ("Aegia Eleni", "Agia Eleni Beach, Skiathos, Grecia"),
    ("Kryfi Ammos", "Kryfi Ammos Beach, Skiathos, Grecia"),
    ("Krifi Ammos", "Kryfi Ammos Beach, Skiathos, Grecia"),
    ("Elia Beach", "Elia Beach, Skiathos, Grecia"),
    ("Lalaria Beach", "Lalaria Beach, Skiathos, Grecia"),
    ("Tripia Petra", "Tripia Petra, Skiathos, Grecia"),
    ("Megas Gialos", "Megas Gialos, Skiathos, Grecia"),
    ("Megas Giolas", "Megas Gialos, Skiathos, Grecia"),
    ("Mikros Aselinos", "Mikros Aselinos Beach, Skiathos, Grecia"),
    ("Raina Studio", "Raina Studio, Skiathos, Grecia"),
    ("Kastani", "Kastani Beach, Skopelos, Grecia"),
    ("Panormos", "Panormos Beach, Skopelos, Grecia"),
    ("Skotini", "Skotini Cave, Skiathos, Grecia"),
    ("Galazia", "Galazia Cave, Skiathos, Grecia"),
    ("Kastro", "Kastro, Skiathos, Grecia"),
    ("Skopelos", "Skopelos, Grecia"),
    ("Basilikos", "Basilikos, Skiathos, Grecia"),
    ("Elias", "Elia Beach, Skiathos, Grecia"),
]

_PLACE_LOOKUP = {phrase.lower(): query for phrase, query in PLACES}
_PLACE_PATTERN = re.compile(
    r"\b(" + "|".join(re.escape(html.escape(p)) for p, _ in PLACES) + r")\b",
    re.IGNORECASE,
)


def linkify(escaped_text: str) -> str:
    def repl(m):
        matched = m.group(0)
        query = _PLACE_LOOKUP.get(html.unescape(matched).lower())
        if not query:
            return matched
        url = f"https://www.google.com/maps/search/?api=1&query={quote(query)}"
        return f'<a class="place-link" href="{url}" target="_blank" rel="noopener">{matched}</a>'

    return _PLACE_PATTERN.sub(repl, escaped_text)


def to_html(raw_text: str) -> str:
    escaped = html.escape(raw_text).replace("\n", "<br>")
    return linkify(escaped)


def guess_icon(text: str) -> str:
    low = text.lower()
    for pattern, icon in ICONS:
        if re.search(pattern, low):
            return icon
    return DEFAULT_ICON


def classify(text: str, bold: bool, size: float):
    stripped = text.strip()
    if len(stripped) >= 100:
        return "paragraph"
    if bold or (size and size >= 11):
        if len(stripped) <= 60:
            return "heading"
    return "note"


def main():
    if not XLSX_PATH.exists():
        sys.exit(f"Non trovo {XLSX_PATH}")

    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True)
    ws = wb[SHEET_NAME]

    days = []
    for i, col in enumerate(DAY_COLUMNS):
        day_num = 15 + i
        d = date(YEAR, MONTH, day_num)

        blocks = []
        for row in range(FIRST_ROW, LAST_ROW + 1):
            cell = ws[f"{col}{row}"]
            val = cell.value
            if val is None:
                continue
            text = unicodedata.normalize("NFC", str(val)).strip()
            if not text:
                continue
            if text.lower() in STRAY_NAME_ONLY:
                # annotazione informale di owner nel foglio originale: la
                # sostituiamo con il campo "owner" strutturato, non la mostriamo
                continue
            font = cell.font
            blocks.append({
                "text": text,
                "type": classify(text, bool(font.bold), font.size or 0),
            })

        # dedup: lo stesso testo può comparire più volte nel foglio
        # (es. celle segnaposto ripetute non ancora personalizzate)
        seen = set()
        deduped = []
        for b in blocks:
            key = b["text"].lower()
            if key in seen:
                continue
            seen.add(key)
            deduped.append(b)
        blocks = deduped

        for b in blocks:
            if b["type"] == "note":
                b["icon"] = guess_icon(b["text"])
            b["html"] = to_html(b["text"])
            del b["text"]

        days.append({
            "date": d.isoformat(),
            "weekday": WEEKDAYS_IT[d.weekday()],
            "day": day_num,
            "owner": OWNERS.get(day_num),
            "blocks": blocks,
            "isComplete": len(blocks) > 1,
        })

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump({"trip": "Skiathos", "year": YEAR, "days": days}, f,
                   ensure_ascii=False, indent=2)

    print(f"Scritto {OUT_PATH} ({len(days)} giorni)")


if __name__ == "__main__":
    main()
