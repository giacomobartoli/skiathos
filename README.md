# Skiathos 2026 — programma di viaggio

Web app statica (PWA) che mostra il programma giorno per giorno della vacanza
a Skiathos (15–26 agosto 2026). Funziona offline una volta aperta almeno una
volta, ed è installabile sulla home del telefono.

## Struttura

```
webapp/
  index.html
  css/style.css
  js/app.js
  data/itinerary.json      <- dati mostrati dall'app
  manifest.webmanifest      <- config PWA
  sw.js                      <- service worker (cache offline)
  icons/
  images/places/             <- foto dei luoghi per il carosello (vedi sotto)
  scripts/
    xlsx_to_json.py          <- rigenera data/itinerary.json da ../Skiathos.xlsx
    make_icons.py             <- rigenera le icone
```

## Aggiornare il programma

1. Modifica `../Skiathos.xlsx` (foglio "Giornaliero") come al solito.
2. Rilancia la conversione:
   ```bash
   cd webapp
   python3 scripts/xlsx_to_json.py
   ```
   Questo comando rigenera anche la "versione" della cache del service worker
   (basata su un hash di tutti i file dell'app), quindi va rilanciato anche
   dopo aver modificato codice (CSS/JS), non solo l'Excel — altrimenti chi ha
   già installato la PWA continuerebbe a vedere la versione vecchia.
3. Verifica in locale (vedi sotto), poi fai commit/push per pubblicare.

## Foto dei luoghi (carosello)

Ogni giorno mostra in cima alla card un carosello con le foto dei luoghi
citati in quella giornata (spiagge, monasteri, ecc.), riconosciuti
automaticamente nel testo. Le foto vivono in `images/places/<slug>.jpg`;
l'elenco dei luoghi riconosciuti e il relativo slug sono in `QUERY_TO_SLUG`
e `SLUG_LABELS` dentro `scripts/xlsx_to_json.py`. Se per un luogo non esiste
il file immagine corrispondente, l'app lo salta semplicemente (nessuna icona
rotta) — quindi puoi aggiungere le foto gradualmente.

Le foto attuali sono state cercate su Wikimedia Commons con licenza libera;
`images/places/credits.json` riporta autore/licenza/fonte di ciascuna — utile
se in futuro vuoi aggiungerne altre o verificarne l'attribuzione.

## Provarla in locale

```bash
cd webapp
python3 -m http.server 8080
```
Apri http://localhost:8080

## Pubblicare su GitHub Pages

1. Crea un repository su GitHub (es. `skiathos-2026`), pubblico.
2. Dalla cartella `webapp/` (che diventa la radice del repo):
   ```bash
   cd webapp
   git init
   git add .
   git commit -m "Programma vacanza Skiathos"
   git branch -M main
   git remote add origin https://github.com/<tuo-utente>/skiathos-2026.git
   git push -u origin main
   ```
3. Su GitHub: Settings → Pages → Source → "Deploy from a branch" → branch
   `main`, cartella `/ (root)` → Save.
4. Dopo un paio di minuti il sito è live su
   `https://<tuo-utente>.github.io/skiathos-2026/`.

## Installare la PWA sul telefono

- **iPhone (Safari):** apri il link → icona Condividi → "Aggiungi a Home".
- **Android (Chrome):** apri il link → menu ⋮ → "Installa app" (o banner
  automatico "Aggiungi a schermata Home").

Una volta installata, l'app apre a schermo intero (senza barra del browser)
e resta consultabile anche senza connessione.
