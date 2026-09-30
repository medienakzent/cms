# AGENTS.md — **PROJECT_NAME**

Dieses Projekt nutzt `@medienakzent/cms`. Diese Datei gilt für Menschen und KI-Agenten;
es gibt keine CLAUDE.md.

## Aufteilung

- **Paket (nicht anfassen):** `node_modules/@medienakzent/cms`. Änderungen am CMS gehören ins
  Paket-Repo `medienakzent/cms`, nicht hierher.
- **Generierte Stubs (nicht bearbeiten):** Dateien mit Header `@generated` unter `src/routes/admin`,
  `src/routes/api`, `src/routes/media`, `src/hooks.server.ts`, `src/params/lang.ts`.
  Sie werden bei `npm install`/`npm update` automatisch aktualisiert (`npx cms sync`).
  Wer einen Stub wirklich ändern muss, akzeptiert, dass Updates ihn nicht mehr anfassen —
  `npx cms check` zeigt solche Dateien.
- **Projektdateien (gehören uns):**
  - `src/cms.config.ts` — Sprachen, Routing, Medien
  - `src/cms.ts` — Registry (sammelt Blocks, Collections, Mail-Vorlagen ein; normalerweise unverändert)
  - `src/blocks/<name>/` — je ein `block.ts` und genau eine `.svelte`-Datei
  - `src/collections/<name>.ts` oder gebündelt `src/cms.content.ts`
  - `src/mail/<name>.ts` — Formulare und Mail-Vorlagen
  - `src/previews/<collection>.svelte` — Live-Vorschau einer Collection, deren Seite aus Feldern besteht (optional)
  - `src/routes/(site)/` — Website-Layout, Seitenzuordnung, Design; `src/app.css` — Website-Styles
  - `src/admin.css` — Markenwerte für den Admin
  - `static/`, `.env`, Docker-Dateien

## Regeln

1. Struktur nur über `defineBlock`, `defineCollection`, `defineMail`. Props von Blocks kommen
   ausschließlich aus `BlockProps<typeof definition>`. Keine Datenzugriffe in Blocks.
2. Inhalte liegen unter `storage/`; die Datenbank ist nur Index. `storage/content` darf
   versioniert werden, Medien und Historie nicht.
3. Übersetzbare Felder tragen `localized: true` — ganz oder gar nicht.
4. Schema-Änderung an einem Block = `version` erhöhen und `migrate` liefern.
5. Vor jedem Commit: `npm run check` (enthält `cms check`).

## Betrieb

- Entwicklung: `docker compose -f docker-compose.dev.yml up -d --build`,
  Prüfen mit `docker exec -w /app __PROJECT_NAME__-dev npm run check`.
- Produktion: `docker compose -f docker-compose.prod.yml up -d --build` — ein Container,
  ein Node-Prozess (Website, Admin, API, Mail). Volumes: `/data` (Index), `/storage` (Inhalte).
- CMS aktualisieren: Release-Tag in `package.json` erhöhen (`github:medienakzent/cms#release/vX.Y.Z`,
  immer `release/…`, das ist der vorgebaute Stand; der Quell-Tag `vX.Y.Z` würde bei jeder
  Installation neu gebaut),
  Lock-Datei neu erzeugen (`rm package-lock.json && npm install --package-lock-only`),
  dann den Dev-Container neu starten — der Entrypoint installiert und synchronisiert die
  Stubs. Nicht im laufenden Container austauschen: Vite stürzt ab, wenn das Paket unter ihm
  wechselt. Danach `npx cms check` und CHANGELOG des Pakets lesen.
- Alle Umgebungsvariablen sind in `.env.example` dokumentiert.

## Code-Stil

Kommentare auf Englisch und minimal (nur das Warum). Bezeichner immer ausgeschrieben, keine
Kürzel oder Ein-Buchstaben-Variablen; der Feld-Builder heißt `field`. Texte der Oberfläche Deutsch.

## Git

Commit-Nachrichten im Präsens, Deutsch, keine `Co-Authored-By`-Zeilen, keine Tool-Signaturen.
