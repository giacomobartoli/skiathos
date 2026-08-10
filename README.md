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
3. Verifica in locale (vedi sotto), poi fai commit/push per pubblicare.

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
