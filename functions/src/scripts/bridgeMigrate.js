const admin = require('firebase-admin');
const path = require('path');

// --- Configuration ---
// Point to keys in root directory
const SOURCE_KEY = require('../../sourceServiceAccount.json');
const DEST_KEY = require('../../destServiceAccount.json');

const MIGRATION_TASKS = [
	{
		collection: 'members',
		targetCollection: 'members',
	},
	{
		collection: 'applicants',
		targetCollection: 'applicants',
		docId: 'SLAU6ZJHNaXRWFUncANsdpnNmOG2',
	},
];

// Initialize Firebase Apps
const sourceApp = admin.initializeApp(
	{
		credential: admin.credential.cert(SOURCE_KEY),
	},
	'sourceApp'
);

const destApp = admin.initializeApp(
	{
		credential: admin.credential.cert(DEST_KEY),
	},
	'destApp'
);

const sourceDb = sourceApp.firestore();
const destDb = destApp.firestore();

/**
 * Executes migration tasks defined in configuration.
 */
async function migrate() {
	console.log('Starting Cross-Project Migration...');

	for (const task of MIGRATION_TASKS) {
		if (task.docId) {
			console.log(`Processing Single Doc: ${task.collection}/${task.docId}`);
			const docSnap = await sourceDb.collection(task.collection).doc(task.docId).get();

			if (docSnap.exists) {
				await destDb.collection(task.targetCollection).doc(task.docId).set(docSnap.data());
				console.log(`Success: ${task.docId} migrated.`);
			} else {
				console.error(`Error: Source document ${task.docId} not found.`);
			}
		} else {
			console.log(`Processing Full Collection: ${task.collection}`);
			const snapshot = await sourceDb.collection(task.collection).get();

			if (snapshot.empty) {
				console.log(`Collection ${task.collection} is empty. Skipping.`);
				continue;
			}

			const batch = destDb.batch();
			let count = 0;

			snapshot.docs.forEach((doc) => {
				const docRef = destDb.collection(task.targetCollection).doc(doc.id);
				batch.set(docRef, doc.data());
				count++;
			});

			await batch.commit();
			console.log(`Migrated ${count} documents for ${task.collection}`);
		}
	}
}

migrate().catch(console.error);
