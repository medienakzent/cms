#!/bin/sh
# Dev-Container-Entrypoint:
#   1. ~/.ssh sicherstellen (gemountetes DEV_SSH_DIR), ggf. ed25519-Key erzeugen
#   2. GitHub in known_hosts aufnehmen
#   3. node_modules installieren, falls package-lock.json sich geändert hat
#   4. an `command` (npm run dev) weiterreichen
set -e

SSH_DIR="${HOME}/.ssh"
KEY="${SSH_DIR}/id_ed25519"

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR" 2>/dev/null || true

if [ ! -f "$KEY" ]; then
	ssh-keygen -t ed25519 -N '' -C "${GIT_SSH_KEY_COMMENT:-cms-dev}" -f "$KEY"
	echo '────────────────────────────────────────────────────────────────'
	echo '  Neuer SSH-Key für den Dev-Container erzeugt.'
	echo '  Diesen Public Key in GitHub hinterlegen (Zugriff auf medienakzent/ui):'
	echo '────────────────────────────────────────────────────────────────'
	cat "${KEY}.pub"
	echo '────────────────────────────────────────────────────────────────'
fi

if [ -n "$GIT_SSH_HOST" ] && ! grep -q "$GIT_SSH_HOST" "${SSH_DIR}/known_hosts" 2>/dev/null; then
	ssh-keyscan -H "$GIT_SSH_HOST" >>"${SSH_DIR}/known_hosts" 2>/dev/null || true
fi

if [ ! -f "${SSH_DIR}/config" ]; then
	cat >"${SSH_DIR}/config" <<-CFG
		Host *
		    StrictHostKeyChecking accept-new
	CFG
fi
chmod 600 "$KEY" "${SSH_DIR}/config" 2>/dev/null || true

# ── Abhängigkeiten ins anonyme node_modules-Volume ─────────────────────────
STAMP='node_modules/.package-lock.sha1'

if [ -d node_modules ] && [ ! -w node_modules ]; then
	echo '!! /app/node_modules gehört nicht dem node-User (altes anonymes Volume).' >&2
	echo '   Auf dem Host: docker compose -f docker-compose.dev.yml down -v && up -d --build' >&2
fi

if [ -f package-lock.json ]; then
	LOCK_SUM="$(sha1sum package-lock.json | cut -d' ' -f1)"
	if [ "$(cat "$STAMP" 2>/dev/null)" != "$LOCK_SUM" ]; then
		echo '→ Abhängigkeiten installieren (npm ci) …'
		if npm ci; then
			echo "$LOCK_SUM" >"$STAMP"
		else
			echo '!! npm ci fehlgeschlagen — prüfen: ssh -T git@github.com (Zugriff auf medienakzent/ui?)' >&2
		fi
	fi
else
	echo '→ Keine package-lock.json — npm install …'
	npm install
fi

mkdir -p "${DATA_DIR:-/app/data}" "${STORAGE_DIR:-/app/storage}"

exec "$@"
