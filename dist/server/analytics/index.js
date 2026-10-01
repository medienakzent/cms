/**
 * Cookieless visitor statistics. Nothing is stored in the browser. A visit is recognised by
 * a hash of IP, user agent and a random salt that lives in memory only and is replaced at
 * midnight, so visits cannot be linked across days or after a restart. The database holds
 * random visit ids, paths and coarse categories only, never the IP or the user agent.
 *
 * The tables are operational data, not part of the index (not reconstructible), and are
 * trimmed to ANALYTICS_RETENTION_DAYS.
 */
import { createHash, randomBytes } from 'node:crypto';
import { getDb } from '../db';
import { serverConfig } from '../runtime';
import { addDays, browserOf, campaignValue, channelOf, deviceOf, isBot, languageOf, localTime, normalizePath, osOf, referrerHost } from './classify';
const SCHEMA = `
CREATE TABLE IF NOT EXISTS cms_analytics_sessions (
	id TEXT PRIMARY KEY,
	day TEXT NOT NULL,
	started_at TEXT NOT NULL,
	last_at TEXT NOT NULL,
	entry_path TEXT NOT NULL,
	exit_path TEXT NOT NULL,
	views INTEGER NOT NULL DEFAULT 1,
	channel TEXT NOT NULL,
	referrer TEXT NOT NULL DEFAULT '',
	source TEXT NOT NULL DEFAULT '',
	medium TEXT NOT NULL DEFAULT '',
	campaign TEXT NOT NULL DEFAULT '',
	device TEXT NOT NULL,
	browser TEXT NOT NULL,
	os TEXT NOT NULL,
	language TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS cms_analytics_sessions_day ON cms_analytics_sessions (day);
CREATE TABLE IF NOT EXISTS cms_analytics_views (
	id TEXT PRIMARY KEY,
	session_id TEXT NOT NULL,
	day TEXT NOT NULL,
	hour INTEGER NOT NULL,
	at TEXT NOT NULL,
	path TEXT NOT NULL,
	previous_path TEXT,
	seconds INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS cms_analytics_views_day ON cms_analytics_views (day, path);
CREATE INDEX IF NOT EXISTS cms_analytics_views_path ON cms_analytics_views (path, day);
CREATE INDEX IF NOT EXISTS cms_analytics_views_session ON cms_analytics_views (session_id);`;
/** A visit ends after 30 minutes without a page view. */
const SESSION_TIMEOUT_MS = 30 * 60_000;
const ACTIVE_WINDOW_MS = 5 * 60_000;
const MAX_SECONDS_PER_VIEW = 60 * 60;
const TOP_LIMIT = 10;
const activeSessions = new Map();
let salt = { day: '', value: randomBytes(32) };
let lastSweep = 0;
function currentSalt(day) {
    if (salt.day !== day) {
        salt = { day, value: randomBytes(32) };
        activeSessions.clear();
        void purge().catch((error) => console.error('[cms] Statistik-Bereinigung fehlgeschlagen', error));
    }
    return salt.value;
}
function sweep(now) {
    if (now - lastSweep < 60_000)
        return;
    lastSweep = now;
    for (const [key, session] of activeSessions)
        if (session.lastSeen < now - SESSION_TIMEOUT_MS)
            activeSessions.delete(key);
}
function visitorKey(request, day) {
    return createHash('sha256')
        .update(currentSalt(day))
        .update(`${request.ip}\n${request.userAgent}\n${request.host}`)
        .digest('base64url');
}
async function purge() {
    const { retentionDays, timeZone } = serverConfig().analytics;
    const cutoff = addDays(localTime(new Date(), timeZone).day, -retentionDays);
    const db = await getDb();
    await db.run('DELETE FROM cms_analytics_views WHERE day < ?', [cutoff]);
    await db.run('DELETE FROM cms_analytics_sessions WHERE day < ?', [cutoff]);
}
/** Visits with a page view in the last five minutes. */
function activeCount() {
    return liveSnapshot().activeNow;
}
function liveSnapshot() {
    const threshold = Date.now() - ACTIVE_WINDOW_MS;
    const pages = new Map();
    let activeNow = 0;
    for (const session of activeSessions.values()) {
        if (session.lastSeen <= threshold)
            continue;
        activeNow += 1;
        pages.set(session.lastPath, (pages.get(session.lastPath) ?? 0) + 1);
    }
    return {
        activeNow,
        pages: [...pages]
            .map(([label, count]) => ({ label, count }))
            .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
            .slice(0, TOP_LIMIT)
    };
}
const liveListeners = new Set();
let lastPublished = '';
let liveTimer = null;
/** Sends the snapshot to live listeners when it changed; also runs on a timer because visits expire silently. */
function publish() {
    if (!liveListeners.size)
        return;
    const snapshot = liveSnapshot();
    const serialized = JSON.stringify(snapshot);
    if (serialized === lastPublished)
        return;
    lastPublished = serialized;
    for (const listener of liveListeners)
        listener(snapshot);
}
function granularityOf(days) {
    if (days === 1)
        return 'hour';
    if (days <= 31)
        return 'day';
    if (days <= 92)
        return 'week';
    return 'month';
}
function bucketKey(day, granularity) {
    if (granularity === 'month')
        return day.slice(0, 7);
    if (granularity === 'week') {
        const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
        return addDays(day, -((weekday + 6) % 7));
    }
    return day;
}
const toNumber = (value) => Number(value ?? 0) || 0;
export const analytics = {
    async ensureSchema() {
        await (await getDb()).exec(SCHEMA);
        await purge();
    },
    /** Records a page view; returns the view id for the later reading-time signal, or null if ignored. */
    async recordView(signal, request) {
        const config = serverConfig().analytics;
        const path = normalizePath(signal.path);
        if (!config.enabled || !path || request.optOut || isBot(request.userAgent))
            return null;
        const now = new Date();
        const { day, hour } = localTime(now, config.timeZone);
        const key = visitorKey(request, day);
        sweep(now.getTime());
        const db = await getDb();
        const viewId = randomBytes(12).toString('base64url');
        const at = now.toISOString();
        let session = activeSessions.get(key);
        if (session && session.lastSeen < now.getTime() - SESSION_TIMEOUT_MS)
            session = undefined;
        if (session && session.lastPath === path) {
            // Reload of the same page: counts as one view.
            session.lastSeen = now.getTime();
            return session.viewIds.at(-1) ?? null;
        }
        if (!session) {
            const referrer = referrerHost(signal.referrer, request.host);
            const source = campaignValue(signal.source);
            session = {
                id: randomBytes(12).toString('base64url'),
                lastSeen: now.getTime(),
                lastPath: path,
                viewIds: [viewId]
            };
            activeSessions.set(key, session);
            publish();
            await db.run(`INSERT INTO cms_analytics_sessions (id, day, started_at, last_at, entry_path, exit_path, views,
				channel, referrer, source, medium, campaign, device, browser, os, language)
				VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                session.id,
                day,
                at,
                at,
                path,
                path,
                channelOf(referrer, source),
                referrer,
                source,
                campaignValue(signal.medium),
                campaignValue(signal.campaign),
                deviceOf(request.userAgent, request.mobileHint),
                browserOf(request.userAgent),
                osOf(request.userAgent),
                languageOf(request.acceptLanguage)
            ]);
            await db.run('INSERT INTO cms_analytics_views (id, session_id, day, hour, at, path, previous_path) VALUES (?, ?, ?, ?, ?, ?, NULL)', [viewId, session.id, day, hour, at, path]);
            return viewId;
        }
        const previousPath = session.lastPath;
        session.lastSeen = now.getTime();
        session.lastPath = path;
        session.viewIds = [...session.viewIds.slice(-19), viewId];
        publish();
        await db.run('INSERT INTO cms_analytics_views (id, session_id, day, hour, at, path, previous_path) VALUES (?, ?, ?, ?, ?, ?, ?)', [viewId, session.id, day, hour, at, path, previousPath]);
        await db.run('UPDATE cms_analytics_sessions SET views = views + 1, exit_path = ?, last_at = ? WHERE id = ?', [path, at, session.id]);
        return viewId;
    },
    /** Visible reading time of a view, reported cumulatively by the browser. */
    async recordReadingTime(viewId, seconds, request) {
        const config = serverConfig().analytics;
        if (!config.enabled || typeof viewId !== 'string' || typeof seconds !== 'number')
            return;
        if (!Number.isFinite(seconds) || seconds <= 0)
            return;
        const session = activeSessions.get(visitorKey(request, localTime(new Date(), config.timeZone).day));
        if (!session?.viewIds.includes(viewId))
            return;
        const capped = Math.min(Math.round(seconds), MAX_SECONDS_PER_VIEW);
        await (await getDb()).run('UPDATE cms_analytics_views SET seconds = ? WHERE id = ? AND seconds < ?', [
            capped,
            viewId,
            capped
        ]);
    },
    /** Report for the last `days` days, for the whole site or one path. */
    async report(options) {
        const { timeZone } = serverConfig().analytics;
        const days = Math.min(Math.max(Math.round(options.days) || 30, 1), 366);
        const path = options.path ? normalizePath(options.path) : null;
        const to = localTime(new Date(), timeZone).day;
        const from = addDays(to, -(days - 1));
        const db = await getDb();
        const viewScope = (start, end) => path
            ? { where: 'v.day BETWEEN ? AND ? AND v.path = ?', params: [start, end, path] }
            : { where: 'v.day BETWEEN ? AND ?', params: [start, end] };
        const sessionScope = (start, end) => path
            ? {
                where: 's.day BETWEEN ? AND ? AND s.id IN (SELECT session_id FROM cms_analytics_views WHERE path = ? AND day BETWEEN ? AND ?)',
                params: [start, end, path, start, end]
            }
            : { where: 's.day BETWEEN ? AND ?', params: [start, end] };
        async function totals(start, end) {
            const views = viewScope(start, end);
            const sessions = sessionScope(start, end);
            const viewRow = await db.get(`SELECT COUNT(*) AS views, AVG(CASE WHEN v.seconds > 0 THEN v.seconds END) AS seconds
				FROM cms_analytics_views v WHERE ${views.where}`, views.params);
            const sessionRow = await db.get(`SELECT COUNT(*) AS sessions, SUM(CASE WHEN s.views = 1 THEN 1 ELSE 0 END) AS bounces
				FROM cms_analytics_sessions s WHERE ${sessions.where}`, sessions.params);
            const durationRow = path
                ? viewRow
                : await db.get(`SELECT AVG(total) AS seconds FROM (SELECT SUM(v.seconds) AS total
						FROM cms_analytics_views v WHERE ${views.where} GROUP BY v.session_id) AS visits`, views.params);
            return {
                views: toNumber(viewRow?.views),
                sessions: toNumber(sessionRow?.sessions),
                bounces: toNumber(sessionRow?.bounces),
                averageSeconds: Math.round(toNumber(durationRow?.seconds))
            };
        }
        async function breakdown(sql, params, limit = TOP_LIMIT) {
            const rows = await db.all(`${sql} ORDER BY count DESC, label ASC LIMIT ${limit}`, params);
            return rows.map((row) => ({ label: String(row.label ?? ''), count: toNumber(row.count) }));
        }
        const views = viewScope(from, to);
        const sessions = sessionScope(from, to);
        const sessionBreakdown = (column, extra = '') => breakdown(`SELECT s.${column} AS label, COUNT(*) AS count FROM cms_analytics_sessions s
				WHERE ${sessions.where} ${extra} GROUP BY s.${column}`, sessions.params);
        const current = await totals(from, to);
        const previous = await totals(addDays(from, -days), addDays(from, -1));
        // Visits are cut at midnight, so summing daily distinct visits into weeks or months is exact.
        const granularity = granularityOf(days);
        const timelineRows = await db.all(`SELECT ${granularity === 'hour' ? 'v.hour' : 'v.day'} AS bucket, COUNT(*) AS views,
			COUNT(DISTINCT v.session_id) AS sessions, SUM(v.seconds) AS seconds,
			COUNT(DISTINCT CASE WHEN s.views = 1 THEN v.session_id END) AS bounces
			FROM cms_analytics_views v LEFT JOIN cms_analytics_sessions s ON s.id = v.session_id
			WHERE ${views.where}
			GROUP BY ${granularity === 'hour' ? 'v.hour' : 'v.day'}`, views.params);
        const buckets = new Map();
        if (granularity === 'hour')
            for (let hour = 0; hour < 24; hour++)
                buckets.set(String(hour), {
                    key: String(hour),
                    views: 0,
                    sessions: 0,
                    seconds: 0,
                    bounces: 0
                });
        else
            for (let offset = 0; offset < days; offset++) {
                const key = bucketKey(addDays(from, offset), granularity);
                if (!buckets.has(key))
                    buckets.set(key, { key, views: 0, sessions: 0, seconds: 0, bounces: 0 });
            }
        for (const row of timelineRows) {
            const key = granularity === 'hour'
                ? String(toNumber(row.bucket))
                : bucketKey(String(row.bucket), granularity);
            const bucket = buckets.get(key);
            if (!bucket)
                continue;
            bucket.views += toNumber(row.views);
            bucket.sessions += toNumber(row.sessions);
            bucket.seconds += toNumber(row.seconds);
            bucket.bounces += toNumber(row.bounces);
        }
        const timeline = [...buckets.values()];
        const hourRows = await db.all(`SELECT v.hour AS hour, COUNT(*) AS count FROM cms_analytics_views v WHERE ${views.where} GROUP BY v.hour`, views.params);
        const hours = Array.from({ length: 24 }, () => 0);
        for (const row of hourRows)
            hours[toNumber(row.hour)] = toNumber(row.count);
        const pageRows = path
            ? []
            : await db.all(`SELECT v.path AS path, COUNT(*) AS views, COUNT(DISTINCT v.session_id) AS sessions,
					AVG(CASE WHEN v.seconds > 0 THEN v.seconds END) AS seconds
					FROM cms_analytics_views v WHERE ${views.where}
					GROUP BY v.path ORDER BY views DESC, path ASC LIMIT 25`, views.params);
        const entryScope = path ? 'AND s.entry_path = ?' : '';
        const entryParams = path ? [...sessions.params, path] : sessions.params;
        const counted = async (sql, params) => toNumber((await db.get(sql, params))?.count);
        const transitionRows = path
            ? []
            : await db.all(`SELECT v.previous_path AS source, v.path AS target, COUNT(*) AS count
					FROM cms_analytics_views v WHERE ${views.where} AND v.previous_path IS NOT NULL
					GROUP BY v.previous_path, v.path ORDER BY count DESC, source ASC LIMIT ${TOP_LIMIT}`, views.params);
        return {
            days,
            from,
            to,
            path,
            activeNow: path ? 0 : activeCount(),
            totals: {
                ...current,
                entries: await counted(`SELECT COUNT(*) AS count FROM cms_analytics_sessions s WHERE ${sessions.where} ${entryScope}`, entryParams),
                exits: await counted(`SELECT COUNT(*) AS count FROM cms_analytics_sessions s WHERE ${sessions.where} ${path ? 'AND s.exit_path = ?' : ''}`, entryParams),
                bounces: path
                    ? await counted(`SELECT COUNT(*) AS count FROM cms_analytics_sessions s WHERE ${sessions.where} ${entryScope} AND s.views = 1`, entryParams)
                    : current.bounces
            },
            previous,
            granularity,
            timeline,
            hours,
            pages: pageRows.map((row) => ({
                path: row.path,
                views: toNumber(row.views),
                sessions: toNumber(row.sessions),
                averageSeconds: Math.round(toNumber(row.seconds))
            })),
            entryPages: path ? [] : await sessionBreakdown('entry_path'),
            exitPages: path ? [] : await sessionBreakdown('exit_path'),
            channels: await breakdown(`SELECT s.channel AS label, COUNT(*) AS count FROM cms_analytics_sessions s
				WHERE ${sessions.where} ${entryScope} GROUP BY s.channel`, entryParams),
            referrers: await breakdown(`SELECT s.referrer AS label, COUNT(*) AS count FROM cms_analytics_sessions s
				WHERE ${sessions.where} ${entryScope} AND s.referrer <> '' GROUP BY s.referrer`, entryParams),
            campaigns: await breakdown(`SELECT s.source || ' / ' || s.medium || ' / ' || s.campaign AS label, COUNT(*) AS count
				FROM cms_analytics_sessions s WHERE ${sessions.where} ${entryScope} AND s.source <> ''
				GROUP BY s.source, s.medium, s.campaign`, entryParams),
            devices: await sessionBreakdown('device'),
            browsers: await sessionBreakdown('browser'),
            systems: await sessionBreakdown('os'),
            languages: await sessionBreakdown('language', "AND s.language <> ''"),
            depth: path
                ? []
                : (await breakdown(`SELECT CASE WHEN s.views >= 5 THEN '5+' ELSE CAST(s.views AS TEXT) END AS label,
						COUNT(*) AS count FROM cms_analytics_sessions s WHERE ${sessions.where}
						GROUP BY label`, sessions.params)).sort((left, right) => left.label.localeCompare(right.label)),
            transitions: transitionRows.map((row) => ({
                from: row.source,
                to: row.target,
                count: toNumber(row.count)
            })),
            cameFrom: path
                ? await breakdown(`SELECT v.previous_path AS label, COUNT(*) AS count FROM cms_analytics_views v
						WHERE ${views.where} AND v.previous_path IS NOT NULL GROUP BY v.previous_path`, views.params)
                : [],
            wentTo: path
                ? await breakdown(`SELECT v.path AS label, COUNT(*) AS count FROM cms_analytics_views v
						WHERE v.day BETWEEN ? AND ? AND v.previous_path = ? GROUP BY v.path`, [from, to, path])
                : []
        };
    },
    activeNow: activeCount,
    live: liveSnapshot,
    /** Live updates of the active visits; returns the unsubscribe function. */
    subscribe(listener) {
        liveListeners.add(listener);
        liveTimer ??= setInterval(publish, 15_000);
        return () => {
            liveListeners.delete(listener);
            if (!liveListeners.size && liveTimer) {
                clearInterval(liveTimer);
                liveTimer = null;
                lastPublished = '';
            }
        };
    }
};
