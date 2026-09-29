# Changelog

Alle relevanten Änderungen. Format: Datum, Version, Abschnitte Neu / Geändert / Breaking.

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
