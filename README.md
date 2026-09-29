# @medienakzent/cms

Block-basiertes CMS für SvelteKit als npm-Paket: Übersetzung pro Feld, Versionierung,
Storage als Wahrheit, SQLite als Default-Index (PostgreSQL möglich), Anmeldung per lokalem
Konto oder OAuth, Formulare mit Mail-Versand und Datei-Uploads. Kundenprojekte installieren
das Paket und ergänzen nur eigene Dateien; alles läuft in einem Node-Prozess.

## Grundprinzipien

1. **Eine Quelle der Wahrheit pro Inhaltstyp.** `src/blocks/<name>/block.ts` bzw.
   `src/collections/<name>.ts` definieren die Felder. Daraus entstehen TypeScript-Typ
   der Svelte-Komponente, Admin-Formular, Validierung, Storage-Format, Übersetzbarkeit
   und Filter — ohne weiteren Code.
2. **Storage ist die Wahrheit, die Datenbank nur Index.** Inhalte liegen als JSON
   unter `storage/content/<collection>/<slug>[.<lang>].json`, Medien unter
   `storage/media/`, Versionen unter `storage/history/`. Die DB hält Index, Auth,
   Medien-Metadaten — alles per `cms.reindex()` rekonstruierbar.
3. **Ein Codepfad.** Admin-UI, REST-API (`/api/v1`), CLI und der Server-Aufruf
   `cms.collection('pages').get(...)` laufen alle über dieselben Funktionen.
4. **Das Paket kennt keine Kundendateien.** Das Kundenprojekt sammelt seine Blocks,
   Collections und Mail-Vorlagen in `src/cms.ts` ein und übergibt sie dem Paket.

## Kundenprojekt anlegen

```bash
mkdir mein-projekt && cd mein-projekt
npm init -y >/dev/null && npm install github:medienakzent/cms#v0.1.0
npx cms init .                 # Gerüst, Stubs, Docker, .env.example, AGENTS.md
cp .env.example .env           # AUTH_SECRET setzen
docker compose -f docker-compose.dev.yml up -d --build
```

- Website: http://localhost:5173 (Beispiel-Startseite beim ersten Start)
- Admin: http://localhost:5173/admin — mit `ALLOW_SIGNUP=1` registrieren; der erste Nutzer
  wird Admin. Danach `ALLOW_SIGNUP=0`.

Das Paket wird per Git-Tag installiert (privates `@compdata/ui` braucht SSH-Zugriff auf
GitHub, siehe `docker/dev-entrypoint.sh` der Vorlage).

## Updates ohne Bruch

Routen, Hooks und Param-Matcher liegen im Kundenprojekt als **Stubs** (Header
`@generated`, keine Logik). `npm install`/`npm update` zieht sie über `postinstall`
automatisch nach; manuell: `npx cms sync`. Ein Manifest (`.cms/manifest.json`) sorgt dafür,
dass nur unveränderte Stubs ersetzt werden — vom Kunden geänderte Dateien bleiben stehen und
werden gemeldet. `npx cms check` prüft den Stand (ist Teil von `npm run check`).
Projektdateien (Layout, Design, Blocks, Konfiguration) werden nur einmal von `cms init`
angelegt und nie überschrieben. Details und Versionsregeln: AGENTS.md.

## Struktur eines Kundenprojekts

```
src/cms.ts                   Registry (generiert, sammelt Kundendateien ein)
src/cms.config.ts            Sprachen, Routing, Bildvarianten
src/blocks/<name>/           block.ts + <Name>.svelte  (Konvention: README dort)
src/collections/<name>.ts    Collections; alternativ gebündelt in src/cms.content.ts
src/mail/<name>.ts           Formulare / Mail-Vorlagen
src/routes/(site)/           Website: Layout, Design, Zuordnung Pfad → Collection (Kunde)
src/app.css, src/admin.css   Website-Styles bzw. Markenwerte des Admins
src/routes/admin, api, media, hooks.server.ts, params/   Stubs (generiert)
```

## Dieses Repository

`src/lib` ist das Paket (Build mit `svelte-package` nach `dist`), `src/routes` samt
`src/blocks`, `src/collections`, `src/mail` ist die Spielwiese — ein Beispiel-Kundenprojekt,
das das Paket über den Alias `@medienakzent/cms` importiert. Entwicklung im Container:

```bash
docker compose -f docker-compose.dev.yml up -d --build
docker exec -w /app cms-dev npm run check     # Typen
docker exec -w /app cms-dev npm run test      # Unit-Tests
docker exec -w /app cms-dev npm run package   # Paket bauen + publint
```

## Inhalte im Code nutzen

```ts
import { cms } from '@medienakzent/cms/server';

const page = await cms.collection('pages').get('about', { lang: 'en' });    // veröffentlicht, mit Fallback
const pages = await cms.collection('pages').list({ lang: 'de', limit: 10 });
await cms.collection('pages').save('about', 'de', { fields, blocks }, { actor, status: 'published' });
```

```svelte
<script lang="ts">
	import { BlockRenderer } from '@medienakzent/cms/render';
	let { data } = $props();
</script>
<BlockRenderer blocks={data.doc.blocks} />
```

## Zusätzliche Content-Typen

Zwei gleichwertige Wege, beide ohne Registrierung:

- eine Datei je Typ: `src/collections/<name>.ts` mit `defineCollection(...)`
- gebündelt in `src/cms.content.ts`:

```ts
import { defineCollection, defineContent, f } from '@medienakzent/cms';

export default defineContent({
	collections: [
		defineCollection({
			name: 'events',
			label: 'Veranstaltung',
			labelPlural: 'Veranstaltungen',
			fields: {
				title: f.text({ localized: true, required: true }),
				start: f.date({ required: true }),
				city: f.text(),
				category: f.select(['konzert', 'lesung']),
				tags: f.references('tags')
			},
			blocks: ['text', 'image'],
			sortBy: { field: 'start', direction: 'asc' }
		})
	]
});
```

Jeder Typ bekommt automatisch Admin-Liste und Editor, Storage-Ordner, Index mit
Facetten und die REST-Endpunkte unter `/api/v1/<name>`.

## Abfragen (Filter, Sortierung)

Eine Definition für Bibliothek und REST (`src/lib/cms/query.ts`). Alles wird gegen
die Felddefinition geprüft; Unbekanntes ergibt `400` mit einer `issues`-Liste.

```
GET /api/v1/events?lang=de&status=published&limit=20&offset=0&sort=-start
    &filter[city]=Berlin                 eq (Text: Groß-/Kleinschreibung egal)
    &filter[start][gte]=2026-01-01       lt lte gt gte für number, date
    &filter[category][in]=konzert,lesung in/nin kommagetrennt
    &filter[tags]=jazz                   references: enthält den Slug
    &filter[seo.noindex]=false           Gruppenfelder mit Punkt
    &filter[title][contains]=jazz        contains nur für text
    &q=volltext
```

| Feldart | Operatoren | sortierbar |
| --- | --- | --- |
| text | eq ne in nin contains | ja |
| number, date | eq ne in nin lt lte gt gte | ja |
| boolean | eq ne | ja |
| select, reference | eq ne in nin | ja |
| multiselect, references | eq ne in nin | nein |
| textarea, richtext, media, link, list, blocks | — (nur Volltext `q`) | nein |

Sortierung: `sort=feld` oder `sort=-feld`, zusätzlich `updatedAt`, `createdAt`,
`publishedAt`, `title`, `slug`. Ohne `sort` gilt `sortBy` der Collection.
Grenzen: `limit` 1–200, `offset` bis 100000, `q` bis 200 Zeichen, `in` bis 50 Werte.

In Code identisch, nur typisiert:

```ts
await cms.collection('events').list({
	lang: 'de',
	filters: [{ field: 'start', op: 'gte', value: '2026-01-01' }, { field: 'tags', value: 'jazz' }],
	sort: '-start',
	limit: 20
});
```

## Strikte API und Rate-Limit

- Bodies müssen `application/json` sein; unbekannte Schlüssel ergeben `400`, falscher
  Content-Type `415`. Erlaubt: `fields`, `blocks`, `status` (PUT) plus `slug`, `lang` (POST).
- Unbekannte Query-Parameter ergeben `400`.
- Rate-Limit auf `/api/v1`: `RATE_LIMIT_PER_MINUTE` je Nutzer/Token (Default 300),
  `RATE_LIMIT_ANON_PER_MINUTE` je IP ohne Anmeldung (Default 30). Antworten tragen
  `x-ratelimit-limit`/`x-ratelimit-remaining`, bei Überschreitung `429` mit `retry-after`.
  Login-Endpunkte unter `/api/auth` limitiert Better Auth selbst.
  Der Zähler lebt im Prozess; für mehrere Instanzen siehe `src/lib/cms/server/rate-limit.ts`.

## Mail-Versand (Kontakt- und Anfrageformulare)

Vorlagen liegen je Kunde in `src/mail/<name>.ts` und nutzen das Feldsystem der Blocks:

```ts
export default defineMail({
	name: 'contact',
	fields: { name: f.text({ required: true }), email: f.text({ required: true }), message: f.textarea({ required: true }) },
	replyToField: 'email',
	to: ['office@example.com'],                       // leer → MAIL_TO_DEFAULT
	subject: { de: 'Kontaktanfrage von {{name}}', en: 'Contact request from {{name}}' },
	body: { de: '## Neue Anfrage\n\n{{all}}', en: '## New request\n\n{{all}}' },
	autoReply: { toField: 'email', subject: 'Ihre Anfrage', body: 'Hallo {{name}}, danke …' }
});
```

Platzhalter: `{{feld}}`, `{{gruppe.feld}}`, `{{all}}` (alle Felder als Liste),
`{{meta.lang}}`, `{{meta.url}}`, `{{meta.ip}}`, `{{meta.date}}`. Eingaben werden
escaped, Markdown wird zu HTML plus Textfassung.

- **Server:** `await cms.mail.send('contact', data, { lang: 'de' })` (z. B. in Form-Actions).
- **Öffentlich:** `POST /api/mail/contact` mit JSON oder Formulardaten. Optional `_lang`
  und `_redirect=/danke` für Formulare ohne JavaScript. Schutz: Rate-Limit je IP
  (`RATE_LIMIT_MAIL_PER_MINUTE`), Honeypot-Feld (`honeypot`, Default `website`), 64 KB Limit.
- **Datei-Uploads:** `f.file({ accept: ['application/pdf'], maxSize: 10 * 1024 * 1024, required: true })`.
  Dateien kommen per multipart, werden gegen Typ, Signatur und Größe geprüft (Summe:
  `maxTotalSize` der Vorlage, Default 32 MB) und unter `storage/mail/uploads/<token>/` abgelegt.
  Die Mail enthält Download-Links mit Token (`{{files}}` oder `{{feld}}`), erreichbar unter
  `/api/mail/download/<token>/<datei>`. Aufräumen nach `MAIL_UPLOAD_RETENTION_DAYS`.
  Für adapter-node `BODY_SIZE_LIMIT` entsprechend setzen.
- **Transport** über `MAIL_TRANSPORT`: `file` (Entwicklung, Ablage unter `storage/mail/outbox`),
  `smtp` (nodemailer, `SMTP_URL`), `microsoft` (Graph `sendMail`, App-Registrierung mit
  `Mail.Send`), `google` (Gmail API, Service-Account mit domänenweiter Delegation).
  Eigene Transporte implementieren `MailTransport` aus `src/lib/cms/server/mail/transport.ts`.
- Jede Einsendung wird unter `storage/mail/submissions/` gespeichert und im Admin unter
  „Einsendungen" gelistet (Detail, Dateien, Löschen), inklusive Spam (Honeypot) und Fehlern.
  Abruf per API nur mit Anmeldung oder Token: `GET /api/v1/submissions?template=&status=`,
  `GET|DELETE /api/v1/submissions/<id>` — nie öffentlich.
- Beispiel-Block `contact-form` rendert ein Formular gegen diese API.

## Captcha

Jedes Formular ist geschützt; die Prüfung sitzt in `mail.send`. Standard ist **ALTCHA**:
selbst gehostetes Proof-of-Work, keine Drittanbieter, keine Cookies, keine Einwilligung nötig.
Alternativ `CAPTCHA_PROVIDER=turnstile` mit `TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY`,
oder `none` für Tests. Einbau im Formular:

```svelte
<script>
	import { Captcha } from '@medienakzent/cms/forms';
	import { page } from '$app/state';   // data.captcha kommt aus dem Layout-Load: cms.forms.captcha()
</script>
<form …>
	…
	<Captcha config={page.data.captcha} />
</form>
```

Bei fehlender oder ungültiger Antwort liefert die API 422 mit `issues[].path === '_captcha'`.
Einzelne Vorlagen: `defineMail({ …, captcha: false })`.

## Datenschutz-Banner und Tracking

```ts
// cms.config.ts
import { defineConfig, defineConsent } from '@medienakzent/cms';
import { ga4, matomo, script } from '@medienakzent/cms/forms';

export default defineConfig({
	…,
	consent: defineConsent({
		version: 1,                 // erhöhen, wenn sich Dienste ändern → erneut fragen
		privacyHref: '/datenschutz',
		categories: [{ id: 'analytics', label: { de: 'Statistik', en: 'Analytics' }, description: { de: '…', en: '…' } }],
		services: [matomo({ url: 'https://stats.example.de/', siteId: 1 }), ga4({ measurementId: 'G-XXXX' })]
	})
});
```

```svelte
<!-- Layout -->
<Consent config={registry.config.consent} lang={data.lang} />
<button onclick={openConsent}>Datenschutz-Einstellungen</button>
```

Dienste laden erst nach Einwilligung ihrer Kategorie, Seitenwechsel werden gemeldet,
`track('name', props)` sendet Ereignisse. Die Entscheidung liegt in Cookie und localStorage
(`cms_consent`, 180 Tage) mit Versionsnummer. Ohne optionale Dienste erscheint kein Banner.
Gestaltung über die Klassen `cms-consent*` und CSS-Variablen `--cms-consent-*`.

## REST-API (Auszug)

| Methode | Pfad | Zweck |
| --- | --- | --- |
| GET | `/api/v1/collections` | Struktur (Collections, Blocks, Felder) |
| GET | `/api/v1/<coll>?lang=&status=&q=&sort=&filter[...]=` | Liste aus dem Index (siehe Abfragen) |
| POST | `/api/v1/<coll>` `{ slug, lang, fields, blocks, status }` | Anlegen |
| GET | `/api/v1/<coll>/<slug>?lang=&editable=1` | Dokument (zusammengeführt) |
| PUT | `/api/v1/<coll>/<slug>?lang=` `{ fields, blocks, status }` | Speichern einer Sprachfassung |
| POST | `/api/v1/<coll>/<slug>/status` `{ lang, status }` | Veröffentlichen / Entwurf |
| DELETE | `/api/v1/<coll>/<slug>[?lang=]` | Sprachfassung oder Dokument löschen |
| GET | `/api/v1/<coll>/<slug>/versions` · POST `…/versions/<id>/restore` | Versionen |
| GET/POST | `/api/v1/media` · PATCH/DELETE `/api/v1/media/<id>` | Medien |
| POST | `/api/v1/reindex` | Index neu aufbauen (Admin) |
| POST | `/api/mail/<vorlage>` | Öffentlich: Formular senden (Captcha, Rate-Limit, Honeypot) |
| GET | `/api/captcha/challenge` | Öffentlich: ALTCHA-Aufgabe (Rate-Limit) |
| GET | `/api/v1/submissions?template=&status=&limit=&offset=` · GET/DELETE `/api/v1/submissions/<id>` | Einsendungen (geschützt) |

## Datenbank-Adapter

`DATABASE_URL=sqlite:cms.db` (Default, Datei unter `DATA_DIR`) oder
`DATABASE_URL=postgres://…`. Der Index nutzt bewusst nur portables SQL
(`src/lib/cms/server/db/`); weitere Dialekte brauchen nur einen kleinen Treiber
mit `all/get/run/exec/transaction`. Better Auth legt seine Tabellen selbst an.

## Storage-Adapter

`src/lib/cms/server/storage/types.ts` — Default ist das Dateisystem (`STORAGE_DIR`).
Ein S3-Adapter implementiert dieselben sieben Methoden; Pfad-Konventionen liegen
zentral in `storage/index.ts`.
