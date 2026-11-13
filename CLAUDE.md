# Hinweise für Claude

Webseite „Gute Nacht Geschichte“: Statisches Frontend (`index.html`) auf GitHub Pages plus Cloudflare Worker `bedtimestory-api` (`cloudflare/generate-story.js`), der die Anthropic API aufruft. Live unter `bedtime.aininger.com`.

## README und Wiki aktuell halten (wichtig)

Die `README.md` ist die einzige Quelle für das interne Wiki (`marioaininger-bot/wiki`). Das Wiki zieht sie jede Nacht vom Branch `main`, schreibt sie aber nie selbst um. Veraltet die README, veraltet das Wiki.

**Passe die README im selben Commit an, wenn du Folgendes änderst:**

- **Modell, `max_tokens`, Prompts** oder Wortziele (`DURATION_WORDS`) im Worker
- **Secrets oder Variablen**: `ANTHROPIC_API_KEY`, `STORY_KEY`, `ALLOWED_ORIGIN`
- **Zugriffsschutz** („Zauberwort“, CORS) oder Request-/Antwortformat
- **Worker-URL** (`STORY_API_ENDPOINT` in `index.html`), Domain oder Deployment
- **Bedienung** der Seite (Profil, Genres, Dauer, Vorlesen, Drucken)

Bei **neuen Projekten, Workern oder Secrets** zusätzlich im Wiki-Repo ergänzen: `docs/architektur.md` und `docs/betrieb/accounts.md`.

## Regeln

- **Nie Geheimnisse in Dateien schreiben**, auch nicht in die README: nur den **Namen** eines Secrets nennen, nie den Wert. Secrets werden mit `wrangler secret put` gesetzt.
- Die README folgt dieser Gliederung: Zweck, auf einen Blick (Tabelle), Datenfluss, Zugriffsschutz, Einrichtung/Deployment, Fallstricke. Das Diagramm in Mermaid.
- **Jeder Aufruf kostet Anthropic-Tokens.** Den Worker nie ohne Zugriffsschutz (`STORY_KEY`, fail closed) lassen.
- Die Seite verarbeitet Kinderdaten (Name, Alter, Geschlecht). Nichts davon serverseitig speichern oder loggen.
- Sprache der Doku und der Oberfläche: Deutsch (Österreich).
