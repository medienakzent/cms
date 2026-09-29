# Changelog

Alle relevanten Änderungen. Format: Datum, Version, Abschnitte Neu / Geändert / Breaking.

## 0.5.1 — 2026-09-29

### Geändert

- **Live-Vorschau im Seitenlayout**: Der Editor rendert die Vorschau in einem Frame der Route
  `/cms-preview` (Stub unter `src/routes/(site)/[[lang=lang]]/cms-preview`). Sie läuft im Layout
  der Website und lädt damit deren Stylesheet, Fonts und Layout-Daten; der ungespeicherte Stand kommt
  per `postMessage` (nur gleiche Origin). Die Route ist nur angemeldet erreichbar (sonst 404).
  Vorher wurden Blocks im Admin ohne Website-Styles gerendert.
- Captcha-Komponente rendert ohne Konfiguration nichts, statt in der Vorschau zu brechen.

## 0.5.0 — 2026-09-29

Sicherheitsreview und Code-Stil.

### Breaking

- Feld-Builder heißt `field` statt `f`: `import { field } from '@medienakzent/cms'`, `field.text(...)`.
  Kundenprojekte passen Blocks, Collections und Mail-Vorlagen an (Suchen/Ersetzen `f.` → `field.`).
- `ALLOW_SIGNUP` steht in der Vorlage auf 0; der erste Nutzer registriert sich weiterhin selbst.
- `BODY_SIZE_LIMIT` in Dockerfile und Compose auf 64M (vorher 512M), per `.env` überschreibbar.

### Sicherheit

- Zugriffsschutz in `createHandle` arbeitet auf dem dekodierten Pfad — prozentkodierte Pfade
  (`/%61pi/v1/…`) umgingen zuvor Anmeldung, Rate-Limits und Admin-Schutz.
- Richtext wird bereinigt gerendert (`renderMarkdown`): rohes HTML escaped, nur sichere Link-Ziele.
- `returnTo` nach dem Login akzeptiert nur seiteninterne Pfade.
- Vertrauenswürdige Origins in Produktion nur aus `ORIGIN` und neuem `TRUSTED_ORIGINS`;
  Forwarded-Header zählen nur in der Entwicklung.
- Request-Bodies werden beim Lesen begrenzt (auch ohne Content-Length); Medien-Upload ebenso.
- Einsendungen werden seitenweise gelesen; Download-Dateinamen RFC-5987-kodiert;
  Sidecar-Sperre in `/media` case-insensitiv; Prod-Compose setzt `ADDRESS_HEADER`/`XFF_DEPTH`.

### Geändert

- Alle Kommentare auf Englisch und minimal, Bezeichner ausgeschrieben (kein `f`, `v`, `e` …).
- CLI: Manifest merkt sich vom Kunden geänderte Stubs dauerhaft (`{ hash, modified }`), `check` meldet sie,
  `--force` ersetzt sie; `--name` wird beim Init sauber geparst.
- Gemeinsame Helfer: `format.ts` (Bytes, Datum), `server/mime.ts`, `name.ts`, `requireSessionAdmin`.
- `MAIL_TRANSPORT` wird validiert; Referenz-Auswahl im Editor nutzt die strikte Query-API korrekt;
  Nutzerzählung beim ersten Login bricht bei DB-Fehlern ab statt still 0 zu liefern.
- LIKE-Suchen escapen `%`/`_`; `restore` prüft den Versionsteil; unbekannte Mail-Vorlage in
  `/api/v1/submissions` liefert 400.
- Neue Tests: Markdown, Slug, Rate-Limit, Body-Limit, CLI-Sync-Matrix.

## 0.4.0 — 2026-09-29

### Neu

- **API-Zugänge mit Rollen** unter „Nutzer": Schlüssel anlegen (Name, Rolle admin oder editor), einmalige Anzeige, Widerruf, Anzeige der letzten Nutzung. Gespeichert wird nur der Hash. Endpunkte `GET|POST /api/v1/api-keys`, `DELETE /api/v1/api-keys/<id>` (Admin-Sitzung).
- **Konten sperren und entsperren** unter „Nutzer" (`PATCH /api/v1/users/<id>` mit `banned`).

### Geändert

- `API_TOKEN` aus der Umgebung bleibt als optionaler Bootstrap-Token mit Rolle admin (z. B. für Seeds); für den Betrieb sind verwaltete Schlüssel vorgesehen.
- `SessionUser.api` kennzeichnet API-Zugänge; Nutzer- und Schlüsselverwaltung verlangen eine Browser-Sitzung.

## 0.3.0 — 2026-09-29

Härtung für den Produktivbetrieb.

### Neu

- **Nutzerverwaltung** unter `/admin/users` (nur Rolle admin): Konten anlegen, Rolle setzen, Passwort setzen, entfernen. API `POST /api/v1/users`, `PATCH|DELETE /api/v1/users/<id>` — nur mit Admin-Sitzung, nicht per API-Token.
- **Passwort vergessen** auf der Login-Seite; Link per Mail über den CMS-Transport, Seite `/admin/reset`.
- **Registrierung**: der erste Nutzer kann sich immer registrieren und wird Admin; danach nur mit `ALLOW_SIGNUP=1`. Ein vergessener Schalter öffnet die Registrierung nicht mehr.
- `GET /api/health` für Docker-Healthchecks, `GET /sitemap.xml` (alle veröffentlichten Dokumente mit hreflang) und `GET /llms.txt` (Überblick für KI-Suchsysteme). Vorlage `static/robots.txt`.

### Geändert

- Sicherheits-Header auf Admin und API (`X-Frame-Options: DENY`, `nosniff`, Referrer-Policy); Medien mit `nosniff` und CSP-Sandbox (keine Skripte aus SVG).
- API-Token wird zeitkonstant verglichen; Slugs werden an allen Einstiegen geprüft (400 statt 500).
- Rollen laufen über das Admin-Plugin von Better Auth (`admin`, `editor`).

## 0.2.1 — 2026-09-29

### Geändert

- Nur noch ALTCHA als Captcha; Turnstile entfernt. `CAPTCHA_PROVIDER` entfällt, stattdessen `CAPTCHA=1|0` (Default an). Client-Konfiguration ist jetzt `{ enabled, challengeUrl, fieldName }`.

## 0.2.0 — 2026-09-29

### Neu

- **Captcha für alle Formulare.** Prüfung zentral in `mail.send`; Provider per `CAPTCHA_PROVIDER`: `altcha` (Default, selbst gehostetes Proof-of-Work ohne Drittanbieter und Cookies), `turnstile` (Cloudflare) oder `none`. Widget `<Captcha config={data.captcha} />` aus `@medienakzent/cms/forms`, Konfiguration über `cms.forms.captcha()` im Layout-Load. Route `GET /api/captcha/challenge` mit eigenem Rate-Limit, Replay-Schutz. Pro Vorlage abschaltbar mit `captcha: false`.
- **Datenschutz-Banner und Tracking.** `consent: defineConsent({ categories, services, texts })` in `cms.config.ts`; Komponente `<Consent config={config.consent} lang />` im Layout; Zustand in Cookie und localStorage mit Versionsnummer; Dienste laden erst nach Einwilligung, Seitenwechsel werden gemeldet. Adapter `ga4()` (Consent Mode), `matomo()`, `script()`; `openConsent()` für Footer-Links, `track()` für Ereignisse. Ohne optionale Dienste erscheint kein Banner.

### Geändert

- Neues Paket-Entry `@medienakzent/cms/forms`. Neue Umgebungsvariablen (alle mit Defaults): `CAPTCHA_PROVIDER`, `CAPTCHA_SECRET`, `ALTCHA_COST`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_CAPTCHA_PER_MINUTE`.
- Formulare bestehender Projekte brauchen das Widget, sonst antwortet die API mit 422 (`_captcha`). Übergangsweise `CAPTCHA_PROVIDER=none`.

## 0.1.2 — 2026-09-29

### Neu

- Bereich „Einsendungen" im Admin (`/admin/submissions`): Liste mit Filter nach Formular und Status, Seitenwechsel, Detailansicht mit allen Angaben, Dateien, Versand- und Herkunftsdaten, Löschen samt Dateien.
- Geschützte REST-API `GET /api/v1/submissions`, `GET|DELETE /api/v1/submissions/<id>` — nur mit Anmeldung oder API-Token, nie öffentlich.
- Einsendungen merken sich ihren Upload-Ordner (`uploadToken`).

### Geändert

- Ersetzt die frühere Seite „Anfragen" (`/admin/mail`); die Stubs werden per `cms sync` ausgetauscht.

## 0.1.1 — 2026-09-29

### Geändert

- Anmeldung hinter einem Proxy: Better Auth akzeptiert die Origin aus `X-Forwarded-Proto`/`X-Forwarded-Host`; in der Entwicklung beide Schemata des Hosts. Behebt „Invalid origin" über `https://<projekt>.test`.

## 0.1.0 — 2026-09-29

Erste Version als Paket.

### Neu

- Feld-Builder `f.*`, `defineBlock`, `defineCollection`, `defineContent`, `defineMail`, `defineConfig`, `defineRegistry`.
- Storage als Wahrheit (Basis + Sprach-Overlay je Dokument), Versionshistorie, Medien mit WebP-Varianten.
- Index mit Facetten, strikte Abfragesprache (Filter, Sortierung), REST-API unter `/api/v1` mit Rate-Limit.
- Better Auth (lokales Konto + OAuth), Rollen admin/editor, API-Token.
- Admin-Oberfläche mit `@compdata/ui`: Formular aus Schema, Block-Editor, Live-Vorschau, Markdown-Editor, Medien, Anfragen.
- Mail-Modul: Vorlagen mit Platzhaltern, Transporte file/smtp/microsoft/google, Datei-Uploads mit Download-Links, Honeypot, Protokoll.
- CLI `cms init | sync | check`; Stubs werden per Manifest sicher aktualisiert (`postinstall`).
