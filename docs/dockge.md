# Dockge / Compose (AMS)

Temporary local stack for the Vite app on fsb-01. Production remains Firebase Hosting.

## Prerequisites

- Repo: `/home/jonaldo/stack/data/repos/ams`
- Root `.env` with `REACT_APP_*` values
- Docker + Dockge (or `docker compose`)

## Run

```bash
cd /home/jonaldo/stack/data/repos/ams
docker compose up --build
```

App: **http://\<host\>:3001** (port 3001 avoids clashing with PF on 3000).

Stop: `docker compose down`.
