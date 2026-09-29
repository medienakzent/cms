# AGENTS.md — @medienakzent/cms

Anleitung für Menschen und KI-Agenten, die an diesem Repository arbeiten. Sie gilt
vor allen Standardannahmen. Es gibt bewusst keine CLAUDE.md; alles steht hier.

## Was das ist

`@medienakzent/cms` ist ein Block-basiertes CMS als npm-Paket für SvelteKit. Kundenprojekte
installieren das Paket, ergänzen **nur eigene Dateien** (Blocks, Collections, Mail-Vorlagen,
Konfiguration, Website-Layout) und laufen als ein Node-Prozess in einem Container.

- `src/lib/` — das Paket. Wird mit `svelte-package` nach `dist/` gebaut.
- `src/routes/`, `src/blocks/`, `src/collections/`, `src/mail/`, `src/cms.ts`, `src/cms.config.ts` —
  die **Spielwiese**: ein Beispiel-Kundenprojekt im selben Repo. Der Alias `@medienakzent/cms` zeigt
  auf `src/lib`, damit die Spielwiese das Paket exakt wie ein Kunde importiert.
- `templates/stubs/` — generierte Dateien für Kundenprojekte (Routen, Hooks, Param-Matcher).
- `templates/project/` — Projektgerüst, das `cms init` einmalig anlegt.
- `bin/cms.js` — CLI: `init`, `sync`, `check`, `postinstall`.
- `admin.css` — Admin-Stylesheet, das Kundenprojekte importieren.

## Grundprinzipien (nicht verhandelbar)

1. **Eine Quelle der Wahrheit pro Inhaltstyp.** `defineBlock`, `defineCollection`, `defineMail`
   beschreiben Felder; daraus entstehen Typen, Admin-Formular, Validierung, Storage-Format,
   Übersetzbarkeit und Filter. Keine zweite Beschreibung derselben Struktur.
2. **Storage ist die Wahrheit, die Datenbank nur Index.** Alles unter `storage/` ist Quelle;
   alles in der DB (Index, Facetten, Medien-Metadaten) muss mit `cms.reindex()` rekonstruierbar
   bleiben. Auth-Tabellen gehören Better Auth.
3. **Ein Codepfad.** Admin, REST-API, CLI und `cms.*` im Server-Code laufen über dieselben
   Funktionen in `src/lib/server/content.ts` bzw. `mail/index.ts`.
4. **Das Paket kennt keine Kundendateien.** Keine Pfade, kein `import.meta.glob`, kein `$env`,
   kein `$config` im Paket. Alles kommt über `defineRegistry` (Kunde) und `createHandle(registry, { env })`.
5. **Kundenprojekte dürfen durch Updates nie brechen.** Siehe „Update-Vertrag".

## Update-Vertrag

- **Stubs** (`templates/stubs`) sind logikfrei und tragen den Header `@generated`. `cms sync`
  (auch automatisch per `postinstall`) ersetzt nur Stubs, die laut Manifest `.cms/manifest.json`
  unverändert sind; vom Kunden geänderte Dateien bleiben stehen und werden gemeldet. Entfernte
  Stubs werden nur gelöscht, wenn unverändert.
- **Projektdateien** (`templates/project`) werden nur von `cms init` angelegt und nie überschrieben.
- **Neue Routen** kommen als neue Stubs. **Umbenannte oder entfernte Routen** nur in einer
  Major-Version, mit Eintrag im CHANGELOG unter „Breaking".
- **Öffentliche API** (Exporte von `.`, `./server`, `./render`, `./admin`, `./routes/*`,
  `./pages/*`): additive Änderungen in Minor, Entfernungen nur in Major mit Deprecation davor.
- **Storage-Format** (`content/*.json`, `history/`, `media/*.json`, `mail/`) ist Teil der API.
  Änderungen brauchen eine Migration beim Lesen (`schemaVersion`), nie ein Umschreiben ohne Sicherung.
- **Index-Schema:** `INDEX_SCHEMA_VERSION` in `src/lib/server/index/repo.ts` erhöhen, dann baut
  sich der Index beim Start neu auf. Kein manuelles Migrieren nötig.
- **Umgebungsvariablen:** neue Variablen brauchen Defaults; entfernte nur in Major.
- Vor jedem Release: `npm run check`, `npm run test`, `npm run package` (publint) und die
  Spielwiese im Browser prüfen (Login, Dokument speichern, Formular senden, Einsendung öffnen).

## Arbeiten im Repo

- Toolchain läuft im Dev-Container: `docker compose -f docker-compose.dev.yml up -d --build`,
  dann `docker exec -w /app cms-dev npm run check` bzw. `npm run test`.
- Spielwiese: http://localhost:5173, Admin unter `/admin`.
- Nach Änderungen an `templates/stubs`: `node bin/cms.js sync` im Repo ausführen — die
  Spielwiese ist selbst ein Kundenprojekt und muss die aktuellen Stubs tragen.
- Neue Feldart: `fields.ts` (Typ + Builder), `types.ts` (`InferField`), `validate.ts`
  (Default, Normalisierung, Prüfung), `admin/FieldEditor.svelte` (Widget), ggf. `query.ts`
  (filterbar?) und `facets.ts`, `localize.ts` nur wenn verschachtelt.
- Formulare: Captcha-Prüfung bleibt zentral in `mail.send`; neue Provider nur in `server/captcha.ts` und `forms/Captcha.svelte`. Consent-Adapter gehören nach `src/lib/tracking`.
- Neue Server-Funktion: in `content.ts`/`mail/index.ts` implementieren, dann REST-Route in
  `src/lib/routes/api`, dann Stub. Nie umgekehrt.
- Texte der Oberfläche sind Deutsch. **Code ist Englisch:** Kommentare auf Englisch, so wenige wie
  möglich und nur für das Warum. **Bezeichner immer ausgeschrieben** — keine Kürzel wie `f`, `r`,
  `s`, `idx`; der Feld-Builder heißt `field`. Keine Ein-Buchstaben-Variablen, auch nicht in
  Schleifen oder Callbacks (`for (const language of languages)`, `.map((row) => …)`).

## Konventionen für Kundendateien (gelten auch für die Spielwiese)

- `src/blocks/<name>/block.ts` + genau eine `.svelte`-Datei, Ordnername = `name`.
  Props ausschließlich `BlockProps<typeof definition>`. Keine Datenzugriffe in Blocks.
- `src/collections/<name>.ts`, Dateiname = `name`; alternativ gebündelt in `src/cms.content.ts`.
- `src/mail/<name>.ts`, Dateiname = `name`.
- `localized: true` markiert übersetzbare Felder; ganz oder gar nicht, in `list` nicht verschachtelt.
- Schema-Änderung an einem Block = `version` erhöhen und `migrate` liefern.

## Git

- Commit-Nachrichten: Präsens, Deutsch, erste Zeile ≤ 72 Zeichen, danach das Warum.
  **Keine `Co-Authored-By`-Zeilen und keine Tool-Signaturen.**
- Kein Commit ohne grünes `npm run check` und `npm run test`.
- Releases: Version in `package.json` erhöhen, CHANGELOG ergänzen, Tag `vX.Y.Z`. Kundenprojekte
  pinnen den Tag (`github:medienakzent/cms#vX.Y.Z`).

## Sicherheitsregeln

- Alles unter `/api/v1` bleibt hinter Sitzung oder API-Token (Hook). Öffentlich sind nur
  `/api/mail/<vorlage>`, `/api/mail/download/<token>/…`, `/api/captcha/challenge`, `/api/health`,
  `/sitemap.xml`, `/llms.txt` und `/media/…`; `/cms-preview` (Vorschau-Frame im Seitenlayout) nur
  angemeldet, sonst 404. Neue öffentliche Routen sind eine bewusste Entscheidung
  mit Rate-Limit und ohne Personendaten.
- Nutzer- und Schlüsselverwaltung nur mit Admin-Sitzung, nie per API-Zugang (`locals.user.api`).
  API-Zugänge tragen dieselben Rollen wie Nutzer; Rechteprüfungen gelten für beide gleich.
- Besucher-Eingaben (Formulare) werden escaped; Pfade aus URLs laufen durch `isValidSlug`, Tokens
  durch feste Muster; der Storage verweigert Pfade außerhalb seiner Wurzel.
- Geheimnisse zeitkonstant vergleichen, nie loggen.
- Zugriffsentscheidungen im Hook nur auf dem dekodierten Pfad (`decodeURIComponent`); SvelteKit
  routet dekodiert, ein roher `startsWith` ist umgehbar. Redirect-Ziele (`returnTo`, `_redirect`)
  nur seiteninterne Pfade. Markdown von Redakteuren nur über `renderMarkdown` ausgeben, nie roh in
  `{@html}`. Request-Bodies mit `limitRequestBody` begrenzen, nie auf Content-Length vertrauen.

## Was bewusst nicht im Paket liegt

- Website-Layout, Design, Fonts: Kundendateien unter `src/routes/(site)` und `src/app.css`.
- Zuordnung Pfad → Collection: `(site)/[[lang=lang]]/[...slug]/+page.server.ts` beim Kunden.
- Deployment-Details außer Dockerfile und Compose-Vorlagen.
