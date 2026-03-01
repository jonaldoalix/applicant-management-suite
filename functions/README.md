# AMS Backend & Cloud Functions

This directory contains the server-side logic for the Application Management Suite (AMS). It uses Firebase Cloud Functions to handle authentication, database triggers, email/SMS notifications, and video interview scheduling.

## 📂 Directory Structure

* **`src/modules/`**: Core application logic.
    * `auth.js`, `interviews.js`, `dailyCo.js`, `zoho.js`, etc.
* **`src/scripts/`**: ETL tools for data migration and seeding.
* **`src/config.js`**: Shared constants (Collection names, Templates, API keys).
* **`src/utils.js`**: Shared helpers (Date formatting, Search token generation).

## 🚀 Setup & Configuration

This project uses **Environment Variables** for configuration.

### 1. Environment Variables (.env)
Create a `.env` file in this directory (do not commit it to git) with the following keys:

```env
# Daily.co (Video)
DAILY_KEY=your_daily_api_key_here

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Zoho Mail (Email Sync)
ZOHO_CLIENTID=your_zoho_client_id
ZOHO_CLIENTSECRET=your_zoho_client_secret
ZOHO_REFRESHTOKEN=your_refresh_token
ZOHO_ACCOUNTID=your_zoho_account_id
ZOHO_WEBHOOK_SECRET=your_custom_secret_string
```
### 2. Installation
```Bash
npm install
```

### 3. Deployment
To deploy all functions to Firebase:

```Bash
npm run deploy
```

## 🛠️ ETL & Data Tools
#### Located in **`src/scripts/`**. Run these locally using node:  

#### Generates a mock database with 50+ linked records (Applicants, Profiles, Applications).
```Bash
node src/scripts/seedData.js
```
#### `Stage 1:` Cleans raw JSON export data (types and defaults).
```
node src/scripts/transform.js
```
#### `Stage 2:` Standardizes fields (names, grades) for consistency.
```
node src/scripts/normalize.js
```
#### `Stage 3:` Merges normalized data with supplementary datasets.
```
node src/scripts/combine.js
```
#### `Stage 4:` Uploads the final processed dataset to Firestore.
```
node src/scripts/migrate.js
```
#### Utility to copy collections between Firebase projects (e.g., Prod -> Dev).
```
node src/scripts/bridgeMigrate.js
```

## 🔑 Credentials
These files are required for local scripts but are ignored by Git for security:

* **`serviceAccountKey.json:`** Admin SDK key for the active project.

* **`sourceServiceAccount.json` & `destServiceAccount.json:`** Required only for cross-project migrations.