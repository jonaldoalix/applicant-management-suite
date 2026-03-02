# Application Management Suite (AMS)

[![SonarQube Cloud](https://sonarcloud.io/images/project_badges/sonarcloud-dark.svg)](https://sonarcloud.io/summary/new_code?id=jonaldoalix_pf-website)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=jonaldoalix_pf-website&metric=alert_status&token=064aa0568350f4cbed18a5bf8d10d93cde544ec0)](https://sonarcloud.io/summary/new_code?id=jonaldoalix_pf-website)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=jonaldoalix_pf-website&metric=bugs&token=064aa0568350f4cbed18a5bf8d10d93cde544ec0)](https://sonarcloud.io/summary/new_code?id=jonaldoalix_pf-website)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=jonaldoalix_pf-website&metric=code_smells&token=064aa0568350f4cbed18a5bf8d10d93cde544ec0)](https://sonarcloud.io/summary/new_code?id=jonaldoalix_pf-website)
![MUI Dashboard](https://img.shields.io/badge/MUI-primary?style=for-the-badge&logo=mui)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)

This repository contains the full stack for the **Application Management Suite (AMS)**: a React frontend for applicants/administrators and a Firebase Cloud Functions backend for logic and automation. 

It is designed as a robust administration dashboard for managing applications, financial grants, and scholarships. This project demonstrates complex state management, data visualization using Recharts, and deep integration with Firebase Firestore.

## 🚀 Key Features & Highlights
- **Real-time Analytics:** View application benchmarks and 3-year trailing award trends dynamically visualized via Recharts. Bar scaling is algorithmically balanced.
- **Data Generation:** Includes Node.js scripts capable of securely seeding hundreds of dynamically generated, randomized mock applicants, profiles, and financial metrics directly into Firestore.
- **Robust State Management:** Built leveraging React Context APIs, hooks, and Jotai for scalable, prop-drilled-free global state.
- **Responsive Architecture:** Crafted utilizing Material-UI (MUI), ensuring the dashboard flawlessly adapts to both desktop administration and mobile interactions.
- **Security & Privacy:** The codebase contains no sensitive real-world client data. All mock information on display is synthetically generated via `seedData.js` and `seedInbox.js`.

---

## 🏗 Tech Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Material UI (MUI v5), Jotai (State), React Router 6, SCSS |
| **Backend** | Node.js 20, Firebase Cloud Functions (v2), Firestore Triggers |
| **Auth & DB** | Firebase Authentication, Firestore (NoSQL), Cloud Storage |
| **Integrations** | **Daily.co** (Video Interviews), **Twilio** (SMS), **Zoho Mail** (Email Sync) |
| **Quality** | SonarCloud, ESLint, Jest |

---

## 📂 Project Structure

* **`src/`**: React Frontend application source code.
    * Components, Pages, State Store, and UI Logic.
* **`functions/`**: Backend Cloud Functions.
    * **`src/modules/`**: Core business logic (Auth, Interviews, Search, etc.).
    * **`src/scripts/`**: ETL & Data Migration tools (Seeding, Backfills).
* **`public/`**: Static assets (Images, Manifests).

---

## 💻 Getting Started

### Local Setup
1. Clone the repository.
   ```bash
   git clone https://github.com/jonaldoalix/applicant-management-suite.git
   ```
2. Install dependencies.
   ```bash
   npm install
   cd functions && npm install
   ```

### 🛠 Configure Environment Variables
This project **will not build** without a `.env` file because of the custom `build-static.js` script. 

Create a file named `.env` in the root directory and populate it:

```ini
# --- Firebase & Google Configuration ---
REACT_APP_googleApiKey=REPLACE_WITH_REAL_VALUE
REACT_APP_apiKey=REPLACE_WITH_REAL_VALUE
REACT_APP_authDomain=REPLACE_WITH_REAL_VALUE
REACT_APP_projectId=REPLACE_WITH_REAL_VALUE
REACT_APP_storageBucket=REPLACE_WITH_REAL_VALUE
REACT_APP_messagingSenderId=REPLACE_WITH_REAL_VALUE
REACT_APP_appId=REPLACE_WITH_REAL_APP_VALUE
REACT_APP_measurementId=REPLACE_WITH_REAL_VALUE
REACT_APP_configKey=REPLACE_WITH_REAL_VALUE
REACT_APP_environment=development # (development, testing, production)

# --- Brand & Metadata ---
REACT_APP_ORGANIZATION_SHORT_NAME="AMS"
REACT_APP_URL="https://ams.fullstackboston.com"
REACT_APP_META_DESCRIPTION="Demo application showcasing the Applicant Management Suite built by Full Stack Boston."
REACT_APP_FAVICON="favicon-32x32.png"
REACT_APP_APPLE_TOUCH_ICON="android-chrome-192x192.png"
REACT_APP_MS_TILE_ICON="touch-icon-ipad-retina.png"

# --- Dev Settings ---
GENERATE_SOURCEMAP=false
HTTPS=true
SSL_CRT_FILE=./localhost+2.pem
SSL_KEY_FILE=./localhost+2-key.pem
```

---

## 📜 Frontend Commands (Root)

| Command | Description |
| :--- | :--- |
| `npm start` | Runs build scripts and starts the React dev server. |
| `npm run build` | Compiles the React app for production into the `build/` directory. |
| `npm test` | Runs the test suite in watch mode with code coverage enabled. |

## ☁️ Backend Commands (in `/functions`)

| Command | Description |
| :--- | :--- |
| `npm run deploy` | Deploys all Cloud Functions and Security Rules to Firebase. |
| `npm run lint` | Checks backend code for style/syntax errors. |

---

## 🛠️ Data & Migration Tools

Located in `functions/src/scripts/`. Run these locally using `node` from the `functions/` directory:

* **`node src/scripts/seedData.js`**
    * Erases the database and generates a mock system with 150+ linked records (Applicants, Profiles, Financial Metrics, Mock Awards).
* **`node src/scripts/seedInbox.js`**
    * Populates the email module with contextual, realistic applicant mock conversations.
* **`node src/scripts/migrate.js`**
    * Uploads processed historical data to Firestore.

---

## 🤖 Project Architecture & Quirks

### Custom Build Process (`scripts/build-static.js`)
Unlike a standard Create-React-App, this project uses a custom pre-build script.
* **What it does:** Before `npm start` or `npm build` runs, `scripts/build-static.js` is executed.
* **Why:** It dynamically generates `public/index.html` and `public/manifest.json` using values from your `.env` file and `package.json`.
* **Important:** If you change the App Name, Theme Color, or Description, do NOT edit `index.html` directly. Edit the `.env` file or `package.json` instead. Each time you start the app, the HTML file will be overwritten with the new values.

---

## 🧪 Code Quality & SonarCloud
Code quality is monitored by SonarQube Cloud. Configuration is defined in `sonar-project.properties`.
* **Tests:** Component DOM rendering and unit logic are tested with Jest/React Testing Library.
* **Coverage:** Source files in `src/` are tracked; configuration files and web vitals are excluded.
