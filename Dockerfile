# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app

# git + ssh: @compdata/ui kommt als privates Git-Paket von GitHub.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git openssh-client ca-certificates python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Laufzeitdaten (SQLite-Index) und Storage (Inhalte, Medien) — im Prod-Stack Volumes.
RUN mkdir -p /data /storage && chown node:node /data /storage /app
USER node
RUN mkdir -p /home/node/.ssh && chmod 700 /home/node/.ssh
# Leeres node_modules, damit das anonyme Volume im Dev-Stack dem node-User gehört.
RUN mkdir -p /app/node_modules

# ── Dev: Vite-Dev-Server; node_modules installiert der Entrypoint ───────────
FROM base AS dev
ENV NODE_ENV=development
COPY --chown=node:node . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ── Build: Abhängigkeiten via SSH-Agent des Hosts (privates ui-Repo) ────────
#   docker compose -f docker-compose.prod.yml build      # build.ssh: default
FROM base AS build
ENV NODE_ENV=production
COPY --chown=node:node package*.json ./
RUN --mount=type=ssh,uid=1000 \
    ssh-keyscan -H github.com >>/home/node/.ssh/known_hosts 2>/dev/null \
    && npm ci --include=dev
COPY --chown=node:node . .
RUN npm run build && npm prune --omit=dev

# ── Prod: schlanker Node-Server (adapter-node) ──────────────────────────────
FROM node:22-bookworm-slim AS prod
ENV NODE_ENV=production
WORKDIR /app
RUN mkdir -p /data /storage && chown node:node /data /storage /app
USER node
COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
ENV PORT=3000 DATA_DIR=/data STORAGE_DIR=/storage BODY_SIZE_LIMIT=64M
VOLUME ["/data", "/storage"]
EXPOSE 3000
CMD ["node", "build"]
