# Collections — Konvention

Eine Collection ist eine Datei `src/collections/<name>.ts`, deren Default-Export
`defineCollection(...)` ist. **Dateiname = `name`.** Nichts muss registriert werden.

- `fields` folgen denselben Regeln wie bei Blocks (`src/blocks/README.md`).
- `titleField` (Default `title`) muss ein `text`-Feld sein: Titel in Listen, Slug-Vorschlag.
- `blocks` listet erlaubte Block-Typen; `false` = keine Blocks (z. B. Tags, Kategorien).
- `path(slug, lang)` liefert den öffentlichen Pfad oder `null` (nicht direkt aufrufbar).
- Pages, Categories, Tags sind **nur Collections** — keine Sonderfälle im Kern.
  Zuordnungen laufen über `f.reference('categories')` / `f.references('tags')`.

Storage-Layout (`STORAGE_DIR`, Default `./storage`):

```
content/<collection>/<slug>.json          Basis: Struktur + nicht-lokalisierte Werte
content/<collection>/<slug>.<lang>.json   Overlay: lokalisierte Werte + Status je Sprache
history/<collection>/<slug>/<zeit>__<base|lang>.json   Versionen (vor jedem Schreiben)
media/<jahr>/<monat>/<id>.<ext>           Original + <id>__<variante>.webp + <id>.json (Metadaten)
```

Die Datenbank hält nur den Index (Listen, Suche, Verweise), Auth und nichts,
was nicht mit `cms.reindex()` aus dem Storage wiederherstellbar wäre.
