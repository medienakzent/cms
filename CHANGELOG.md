# Changelog

Alle relevanten Änderungen. Format: Datum, Version, Abschnitte Neu / Geändert / Breaking.

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
