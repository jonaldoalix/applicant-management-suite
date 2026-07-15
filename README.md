# Applicant Management Suite (AMS)

**Public flagship** for scholarship and grants operations: applicants apply and upload materials; committees review, interview, and decide; administrators run the program end to end.

**Live demo:** [ams.fullstackboston.com](https://ams.fullstackboston.com)  
**Repository:** [jonaldoalix/applicant-management-suite](https://github.com/jonaldoalix/applicant-management-suite)

AMS is the portfolio-ready product surface. Client production deployments (such as the Parker Memorial Fund site) share the same architecture and can track this suite for toolchain and product upgrades.

---

## What it demonstrates

- End-to-end application lifecycle (intake → review → interviews → awards)
- Admin datagrid workflows with folder/alias inbox filtering and bulk actions
- Contact center messaging (email / SMS templates) and notes with privacy toggles
- Real-time dashboards and award trend charts (Recharts)
- Video interview rooms via Daily.co, with scheduling and RSVP flows
- Firebase Auth, Firestore, Storage, and Cloud Functions Gen2 backends
- Synthetic seed data only — no real applicant PII is required to explore the suite

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js **24** |
| App build | **Vite 8** |
| UI | React 18, **MUI 9**, MUI X Data Grid / Date Pickers 9 |
| Routing | React Router **7.18** |
| State | React Context + Jotai |
| Backend | Firebase Auth, Firestore, Storage, Cloud Functions |
| Integrations | Daily.co (video), Twilio (SMS), Zoho Mail (sync) |
| Quality | ESLint, TypeScript check, Vitest + coverage (80% lines), OSV-Scanner |

Client sources are TypeScript (`.ts` / `.tsx`). Cloud Functions remain modular JavaScript under `functions/src/modules/`.

---

## Repository layout

```
src/                 React app (pages, components, context, config)
functions/           Cloud Functions + seed / migration scripts
scripts/             build-static.js (env-driven HTML / manifest)
docs/dockge.md       Optional Docker Compose notes for Dockge
compose.yaml         Local Docker/Vite helper for temporary hosting
```

---

## Getting started

### Prerequisites

- Node.js 24+ (see `.nvmrc`)
- Firebase project credentials for a **demo** environment
- Optional: `localhost+2.pem` / `localhost+2-key.pem` for local HTTPS (gitignored)

### Install

```bash
git clone https://github.com/jonaldoalix/applicant-management-suite.git
cd applicant-management-suite
npm install
cd functions && npm install && cd ..
```

### Environment

The app will not build without a root `.env`. `scripts/build-static.js` runs before `npm start` / `npm run build` and regenerates `public/index.html` and `public/manifest.json` from `.env` and `package.json`.

Copy the template below and replace every `REPLACE_…` value. Never commit a filled `.env`.

```ini
# --- Firebase & Google ---
REACT_APP_googleApiKey=REPLACE_WITH_YOUR_KEY
REACT_APP_apiKey=REPLACE_WITH_YOUR_KEY
REACT_APP_authDomain=REPLACE_WITH_YOUR_PROJECT.firebaseapp.com
REACT_APP_projectId=REPLACE_WITH_YOUR_PROJECT
REACT_APP_storageBucket=REPLACE_WITH_YOUR_PROJECT.appspot.com
REACT_APP_messagingSenderId=REPLACE_WITH_YOUR_SENDER_ID
REACT_APP_appId=REPLACE_WITH_YOUR_APP_ID
REACT_APP_measurementId=REPLACE_WITH_YOUR_MEASUREMENT_ID
REACT_APP_configKey=REPLACE_WITH_YOUR_CONFIG_KEY
REACT_APP_environment=development

# --- Brand & metadata ---
REACT_APP_ORGANIZATION_NAME="Applicant Management Suite"
REACT_APP_ORGANIZATION_SHORT_NAME="AMS"
REACT_APP_URL="https://ams.fullstackboston.com"
REACT_APP_META_DESCRIPTION="Applicant Management Suite — scholarship and grants operations demo."
REACT_APP_FAVICON="favicon-32x32.png"
REACT_APP_APPLE_TOUCH_ICON="android-chrome-192x192.png"
REACT_APP_MS_TILE_ICON="android-chrome-192x192.png"
REACT_APP_THEME_COLOR="#0288D1"
REACT_APP_PRELOAD_BG_DARK="#161C24"
REACT_APP_PRELOAD_BG_LIGHT="#F4F6F8"

# --- Dev ---
GENERATE_SOURCEMAP=false
HTTPS=false
```

### Run

```bash
npm start
```

Vite serves the app (default local URL printed in the terminal). Prefer `HTTPS=false` unless you have local certificates configured.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | `build-static.js` + Vite dev server |
| `npm run build` | Production build → `build/` |
| `npm test` | Vitest single run |
| `npm run test:coverage` | Vitest + coverage (fails under 80% lines) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint:prod` | ESLint on production sources |
| `cd functions && npm run lint` | Lint Cloud Functions |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, coverage, production build, and OSV lockfile scanning on every push to `main`.

---

## Seed & tooling (Cloud Functions)

From `functions/`, after configuring Firebase Admin credentials as appropriate for your project:

| Script | Purpose |
|--------|---------|
| `node src/scripts/seedData.js` | Wipe/seed mock applicants, apps, and financial metrics |
| `node src/scripts/seedInbox.js` | Seed realistic mock mailbox threads |
| `node src/scripts/migrate.js` | Upload processed historical data (when applicable) |

Use only on disposable / demo Firebase projects.

---

## Architecture notes

### Env-driven static shell

Do not hand-edit branding in `public/index.html` for lasting changes. Update `.env` or `package.json` and restart so `scripts/build-static.js` regenerates HTML and the web manifest.

### Dockge / Compose

See [`docs/dockge.md`](docs/dockge.md) and `compose.yaml` for a temporary containerized Vite spin-up (useful on a Dockge host). Force HTTP in compose when host env would otherwise inject HTTPS.

---

## Remotes

| Remote | Visibility | Purpose |
|--------|------------|---------|
| `origin` (`jonaldoalix/applicant-management-suite`) | Public | Portfolio + client-facing template |
| `business` (`Full-Stack-Boston/applicant-management-suite`) | Public | Org mirror clients clone / fork |
| Private `ams-demo` (personal + `Full-Stack-Boston`) | Private | Fully working backup with `.env` for Dockge demos and home-lab DR |

## Dockge demo

See [`docs/dockge.md`](docs/dockge.md). For a **zero-config** working demo, Dockge should clone **private `ams-demo`**, not this public template. Then NPM Proxy Host → host port **3001**.

## Related

- **Production client example:** [revparkermemorialfund.org](https://revparkermemorialfund.org) — same product family, organization-specific content and schema naming
- Built and maintained by [Full Stack Boston](https://fullstackboston.com)
