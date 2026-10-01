#!/bin/bash
# Deployment für Plesk (Node.js über Phusion Passenger).
#
# Plesk → Websites & Domains → <domain> → Git → Repository-Einstellungen →
# "Additional deployment actions":  bash plesk-deploy.sh
# Voraussetzung: Der Systemnutzer des Abonnements hat Shell-Zugriff (SSH); Startdatei der App
# (Node.js → Application Startup File) ist app.cjs.
#
# Die Node-Hauptversion steht in .node-version (Default 22). Sie muss zur Version im Plesk-Panel
# (Node.js → Node.js Version) passen, sonst laden Native Module wie better-sqlite3 nicht.
# Schlägt ein Schritt fehl, bricht das Skript ab und die App wird NICHT neu gestartet.
# Alle Ausgaben stehen zusätzlich in deployment.log.
set -euo pipefail
cd "$(dirname "$0")"

exec > >(tee -a deployment.log) 2>&1
trap 'echo "=== FEHLGESCHLAGEN $(date "+%F %T") in Zeile $LINENO, App NICHT neu gestartet"' ERR

NODE_MAJOR="$( (head -n 1 .node-version | cut -d . -f 1 | tr -dc '0-9') 2>/dev/null || true)"
NODE_MAJOR="${NODE_MAJOR:-22}"
NODE_BIN="/opt/plesk/node/${NODE_MAJOR}/bin"
echo "=== Deployment $(date '+%F %T')"
if [ ! -x "$NODE_BIN/node" ]; then
	echo "=== FEHLGESCHLAGEN: Node ${NODE_MAJOR} fehlt unter $NODE_BIN (Plesk → Tools & Settings → Node.js)"
	exit 1
fi
export PATH="$NODE_BIN:$PATH"
echo "node $(node --version) ($(command -v node)), npm $(npm --version)"

npm ci --include=dev --no-audit --no-fund
npm run build

mkdir -p tmp
touch tmp/restart.txt
echo "=== Erfolgreich $(date '+%F %T'), App startet beim nächsten Aufruf neu"
