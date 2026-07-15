# Dockge → Nginx Proxy Manager (AMS)

Goal: start the stack with **no extra Dockge configuration**, then point an NPM Proxy Host at it for a public demo.

## Recommended (working demo)

1. On the Dockge host, clone the **private** backup (includes `.env`):
   - `git@github.com:jonaldoalix/ams-demo.git` or
   - `git@github.com:Full-Stack-Boston/ams-demo.git`
2. In Dockge, create a stack pointing at that folder (compose file: `compose.yaml`).
3. Deploy / start. App listens on **http://\<host\>:3001**.
4. In NPM: Proxy Host → `http://\<dockge-host-or-ip\>:3001` (or the Docker network alias if colocated).

Stop: `docker compose down` (or Dockge stop).

## Public template (`applicant-management-suite`)

Public clones do **not** include secrets. Copy `.env.example` → `.env`, fill Firebase/client keys, then `docker compose up --build`.

Production hosting remains Firebase Hosting; Dockge is for temporary live demos only.
