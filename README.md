# 🔍 Freelance Watcher

Automatischer Projekt-Monitor für [freelancermap.com](https://www.freelancermap.com) mit E-Mail-Benachrichtigung.

## Features

- Automatische Suche nach neuen Projektausschreibungen
- Whitelist / Blacklist Filter
- E-Mail-Benachrichtigung bei neuen Treffern
- Konfigurierbare Ruhezeiten (Tage + Stunden)
- Browser-UI zur Konfiguration und manuellen Auslösung
- Läuft lokal (npm run dev) UND als GitHub Actions Pipeline

---

## Lokaler Betrieb

### Voraussetzungen
- Node.js >= 18
- npm

### Setup

```bash
# 1. Dependencies installieren
npm install

# 2. .env Datei anlegen
cp .env.example .env
# .env öffnen und Passwort eintragen:
# EMAIL_PASSWORD=dein-strato-passwort

# 3. config.json anpassen (E-Mail, Whitelist, etc.)
# data/config.json

# 4. Starten
npm run dev
```

### Browser-UI
Nach dem Start: [http://localhost:3000](http://localhost:3000)

- **„Jetzt prüfen"** – manueller Check (startet auch den automatischen Scheduler)
- **Einstellungen** – Whitelist, Blacklist, Ruhezeiten, E-Mail
- **Zurücksetzen** – seen.json leeren (alle Projekte wieder als neu behandeln)

---

## GitHub Actions Pipeline

### Pipeline-Struktur

```
.github/workflows/
├── watcher.yml        # Automatisch alle 30 Min, Mo-Sa 8-18 Uhr
└── manual-check.yml   # Manuell auslösbar im GitHub UI
```

### Stages (watcher.yml)

```
cron trigger (alle 30 Min)
    → seen.json aus Cache laden
    → npm ci
    → tsc (TypeScript kompilieren)
    → node dist/run-once.js (scrapen + filtern + E-Mail)
    → seen.json in Cache speichern
```

### Setup auf GitHub

**1. Repository anlegen**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/DEIN-USER/freelance-watcher.git
git push -u origin main
```

**2. Secrets hinterlegen**

Unter `Settings → Secrets and variables → Actions → New repository secret`:

| Secret | Wert |
|--------|------|
| `EMAIL_PASSWORD` | Dein Strato Postfach-Passwort |
| `EMAIL_USER` | z.B. `suchagent@bcx.one` |
| `EMAIL_RECIPIENT` | Empfänger-Adresse |

**3. Actions aktivieren**

Unter `Actions → Workflows` sicherstellen dass Workflows aktiviert sind.

**4. Manuellen Test starten**

`Actions → Manual Check → Run workflow`

Optional: Checkbox „seen.json zurücksetzen" für ersten vollständigen Test.

### Ruhezeiten-Hinweis (UTC vs. Berlin)

GitHub Actions cron läuft in **UTC**. Für Berlin (UTC+2 Sommer / UTC+1 Winter):

| Gewünschte Zeit (Berlin) | Sommer (UTC+2) | Winter (UTC+1) |
|--------------------------|---------------|----------------|
| 08:00 – 18:00            | 06:00 – 16:00 | 07:00 – 17:00  |

Aktuell in `watcher.yml` eingestellt: `6-15 UTC` = Sommerzeit.
Für Winterzeit auf `5-15 UTC` ändern.

---

## Projektstruktur

```
freelance-watcher/
├── src/
│   ├── index.ts        # Lokaler Server + Scheduler
│   ├── run-once.ts     # Einstiegspunkt für GitHub Actions
│   ├── scraper.ts      # Seite abrufen + parsen
│   ├── matcher.ts      # Whitelist/Blacklist Logik
│   ├── mailer.ts       # Strato SMTP
│   ├── scheduler.ts    # Timer + Ruhezeiten
│   ├── store.ts        # seen.json verwalten
│   └── config.ts       # config.json + .env laden
├── data/
│   ├── config.json     # Konfiguration (kein Passwort!)
│   └── seen.json       # Bereits gesehene Projekt-IDs
├── public/
│   └── index.html      # Browser-UI
├── .github/
│   └── workflows/
│       ├── watcher.yml       # Automatische Pipeline
│       └── manual-check.yml  # Manueller Trigger
├── .env.example        # Vorlage für .env
├── .env                # Secrets (nicht ins Git!)
└── .gitignore
```

---

## Konfiguration (data/config.json)

```json
{
  "intervalMinutes": 30,
  "daysBack": 5,
  "activeHours": { "start": 8, "end": 18 },
  "activeDays": [1, 2, 3, 4, 5, 6],
  "searchUrl": "https://www.freelancermap.com/projects?excludeDachProjects=true&sort=1&pagenr=1",
  "whitelist": ["SAP", "Python", "remote"],
  "blacklist": ["ANÜ", "Junior"],
  "email": {
    "smtpHost": "smtp.strato.de",
    "smtpPort": 465,
    "user": "deine@email.de",
    "password": "",
    "recipient": "deine@email.de"
  }
}
```

`activeDays`: 0=Sonntag, 1=Montag, ..., 6=Samstag
