const admin = require('firebase-admin');
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require('firebase-functions/v2/firestore');

// Trigger: On Document Create
// Logs the creation of any document in any collection (except specific skip lists) to the 'dblog' collection.
exports.onDocumentCreate = onDocumentCreated('{collection}/{docId}', (event) => {
	const { collection, docId } = event.params;
	const skipThese = ['dblog', 'sitelog'];
	if (skipThese.includes(collection)) {
		return null;
	}

	const newData = event.data.data();
	const log = {
		changeType: 'created',
		collectionName: collection,
		documentId: docId,
		timestamp: admin.firestore.FieldValue.serverTimestamp(),
		data: newData,
	};

	return admin.firestore().collection('dblog').add(log);
});

// Trigger: On Document Update
// Logs changes to documents, calculating a diff of modified fields.
// Skips 'emails' and 'sms' collections to prevent logging noisy automated tasks.
exports.onDocumentUpdate = onDocumentUpdated('{collection}/{docId}', (event) => {
	const { collection, docId } = event.params;
	const skipThese = ['emails', 'sms'];
	if (skipThese.includes(collection)) {
		return null;
	}

	const before = event.data.before.data();
	const after = event.data.after.data();

	// Find the changed fields
	let modifiedFields = {};
	Object.keys(after).forEach((key) => {
		if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
			modifiedFields[key] = {
				before: before[key],
				after: after[key],
			};
		}
	});

	if (Object.keys(modifiedFields).length > 0) {
		const log = {
			changeType: 'updated',
			collectionName: collection,
			documentId: docId,
			timestamp: admin.firestore.FieldValue.serverTimestamp(),
			modifiedFields: modifiedFields,
		};

		return admin.firestore().collection('dblog').add(log);
	}
	return null;
});

// Trigger: On Document Delete
// Logs the deletion of documents and preserves the data that was deleted.
exports.onDocumentDelete = onDocumentDeleted('{collection}/{docId}', (event) => {
	const { collection, docId } = event.params;
	const skipThese = ['dblog', 'sitelog', 'emails', 'sms'];
	if (skipThese.includes(collection)) {
		return null;
	}

	const deletedData = event.data.data();
	const log = {
		changeType: 'deleted',
		collectionName: collection,
		documentId: docId,
		timestamp: admin.firestore.FieldValue.serverTimestamp(),
		data: deletedData,
	};

	return admin.firestore().collection('dblog').add(log);
});
