const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

// --- Configuration ---
// Point to keys and data in the root directory
const JSON_FILE_PATH = path.join(__dirname, '../../obfuscatedData.json');
const SERVICE_ACCOUNT_KEY_PATH = path.join(__dirname, '../../serviceAccountKey.json');
const TARGET_COLLECTION = 'legacy_financials';

let db;
try {
	const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);
	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
	});
	db = admin.firestore();
	console.log('Firebase Admin initialized.');
} catch (e) {
	console.error('Initialization Error:', e.message);
	process.exit(1);
}

async function uploadToStaging() {
	console.log(`Reading data from: ${JSON_FILE_PATH}`);

	let allYearData;
	try {
		allYearData = JSON.parse(await fs.readFile(JSON_FILE_PATH, 'utf8'));
	} catch (e) {
		console.error('Fatal Error: Could not read JSON file.', e.message);
		process.exit(1);
	}

	if (!Array.isArray(allYearData) || allYearData.length === 0) {
		console.error('Error: Data file is empty or invalid.');
		return;
	}

	console.log(`Uploading ${allYearData.length} records to collection: "${TARGET_COLLECTION}"`);

	const batch = db.batch();
	let count = 0;

	for (const yearData of allYearData) {
		const year = yearData.year ? yearData.year.toString() : null;

		if (!year) {
			console.warn('Skipping record with missing year.');
			continue;
		}

		const docRef = db.collection(TARGET_COLLECTION).doc(year);
		batch.set(docRef, yearData);
		count++;
	}

	if (count > 0) {
		await batch.commit();
		console.log(`Success: ${count} documents uploaded.`);
	} else {
		console.log('No documents to upload.');
	}
}

uploadToStaging();
