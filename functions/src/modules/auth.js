const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { collections } = require('../config');

// Create User In Collection
// Creates a new user document in Firestore when a new Firebase Auth user is created.
exports.createUserInCollection = functions.auth.user().onCreate(async (user) => {
	const db = admin.firestore();
	const userRef = db.collection(collections.users).doc(user.uid);

	console.log(`Creating new user document for UID: ${user.uid}`);

	return userRef.set({
		uid: user.uid,
		email: user.email,
		displayName: user.displayName || null,
		photoURL: user.photoURL || null,
		createdAt: admin.firestore.FieldValue.serverTimestamp(),
		authCreationTime: user.metadata.creationTime,
	});
});

// Delete User From Collection
// Deletes a user document from Firestore when the corresponding Firebase Auth user is deleted.
exports.deleteUserFromCollection = functions.auth.user().onDelete(async (user) => {
	const db = admin.firestore();
	const userRef = db.collection(collections.users).doc(user.uid);

	console.log(`Deleting user document for UID: ${user.uid}`);

	return userRef.delete();
});

// Change User Email
// Admin tool to update a user's email address in Authentication.
exports.changeUserEmail = onCall(async (request) => {
	const { uid, newEmail } = request.data;
	const context = request;

	if (!context.auth?.uid) {
		throw new HttpsError('unauthenticated', 'You must be logged in.');
	}

	const db = admin.firestore();

	try {
		const ref = db.doc(`members/${context.auth.uid}`);
		const memberSnap = await ref.get();

		if (!memberSnap.exists || !memberSnap.data()?.permissions?.admin) {
			throw new HttpsError('permission-denied', 'You must be an admin to perform this action.');
		}

		await admin.auth().updateUser(uid, { email: newEmail });
		return { success: true, message: 'Email updated successfully.' };
	} catch (err) {
		console.error('changeUserEmail error:', err);
		throw new HttpsError('internal', err.message || 'Unknown error');
	}
});

// Delete Auth User
// Admin tool to force delete a user from Firebase Authentication.
exports.deleteAuthUser = onCall(async (request) => {
	const data = request.data;
	const context = request;

	if (!context.auth?.uid) {
		throw new HttpsError('unauthenticated', 'You must be logged in to perform this action.');
	}

	const db = admin.firestore();
	const callerUid = context.auth.uid;

	try {
		const memberRef = db.doc(`members/${callerUid}`);
		const memberSnap = await memberRef.get();

		if (!memberSnap.exists || !memberSnap.data()?.permissions?.admin) {
			throw new HttpsError('permission-denied', 'You must be an admin to perform this action.');
		}

		const targetUid = data.uid;
		if (!targetUid) {
			throw new HttpsError('invalid-argument', "The function must be called with a 'uid' argument.");
		}

		await admin.auth().deleteUser(targetUid);
		return { message: `Successfully deleted user ${targetUid} from Firebase Authentication.` };
	} catch (error) {
		console.error('Error in deleteAuthUser:', error);
		if (error instanceof HttpsError) {
			throw error;
		}
		throw new HttpsError('internal', error.message);
	}
});

// Get User Auth Record
// Retrieves metadata (last sign-in, creation time) for a specific user.
exports.getUserAuthRecord = onCall(async (request) => {
	const context = request;
	if (!context.auth?.uid) {
		throw new HttpsError('unauthenticated', 'You must be logged in to perform this action.');
	}

	const { uid } = request.data;
	if (!uid) {
		throw new HttpsError('invalid-argument', "The function must be called with a 'uid' argument.");
	}

	try {
		const userRecord = await admin.auth().getUser(uid);
		const { lastSignInTime, creationTime } = userRecord.metadata;
		return { lastSignInTime, creationTime };
	} catch (error) {
		console.error(`Error fetching auth record for UID ${uid}:`, error);
		throw new HttpsError('not-found', 'User authentication record not found.');
	}
});
