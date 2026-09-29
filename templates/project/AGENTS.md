# AGENTS.md — __PROJECT_NAME__

Dieses Projekt nutzt `@compdata/cms`. Diese Datei gilt für Menschen und KI-Agenten;
es gibt keine CLAUDE.md.

## Aufteilung

- **Paket (nicht anfassen):** `node_modules/@compdata/cms`. Änderungen am CMS gehören ins
  Paket-Repo `compdataitgmbh/cms`, nicht hierher.
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
  - `src/routes/(site)/` — Website-Layout, Seitenzuordnung, Design; `src/app.css` — Website-Styles
  - `src/admin.css` — Markenwerte für den Admin
  - `static/`, `.env`, Docker-Dateien

## Regeln

1. Struktur nur über `defineBlock`, `defineCollection`, `defineMail`. Props von Blocks kommen
   ausschließlich aus `BlockProps<typeof def>`. Keine Datenzugriffe in Blocks.
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
- CMS aktualisieren: Tag in `package.json` erhöhen (`github:compdataitgmbh/cms#vX.Y.Z`),
  `npm install`, `npx cms check`, CHANGELOG des Pakets lesen.
- Alle Umgebungsvariablen sind in `.env.example` dokumentiert.

## Git

Commit-Nachrichten im Präsens, Deutsch, keine `Co-Authored-By`-Zeilen, keine Tool-Signaturen.
