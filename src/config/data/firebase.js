/**
 * FIREBASE SERVICE CONFIGURATION & DATA LAYER
 * ---------------------------------------------------------------------------
 * This file serves as the Interface/Adapter between the React Frontend and the
 * Google Firebase Backend services (Firestore, Auth, Storage, Functions).
 *
 * * RESPONSIBILITIES:
 * 1. Initialize the Firebase App with environment variables.
 * 2. Export initialized service instances (auth, db, storage, functions).
 * 3. Provide wrapper functions for all Database CRUD operations.
 * 4. Provide "Real-Time" listeners for live data updates (used by Dashboard).
 * 5. Expose Cloud Functions (server-side logic) to the frontend.
 */

import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, updateDoc, getDocs, query, collection, where, getCountFromServer, or, and, orderBy, limit, onSnapshot, addDoc, arrayUnion, arrayRemove, deleteDoc, writeBatch, collectionGroup } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { v4 as uuid } from 'uuid';
import { UAParser } from 'ua-parser-js';
import axios from 'axios';

// Config Imports
import { collections, ApplicationStatus, ApplicationType, InterviewStatus, applicationSpecificCollections, SearchableCollections } from './collections';

// --- 1. Initialization & Configuration ---

let firebaseConfig = {
	apiKey: process.env.REACT_APP_apiKey,
	authDomain: process.env.REACT_APP_authDomain,
	projectId: process.env.REACT_APP_projectId,
	storageBucket: process.env.REACT_APP_storageBucket,
	messagingSenderId: process.env.REACT_APP_messagingSenderId,
	appId: process.env.REACT_APP_appId,
	measurementId: process.env.REACT_APP_measurementId,
};

const app = initializeApp(firebaseConfig);

// Service Exports
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Database Initialization (Prod vs. Test)
// We use persistent local cache to support offline mode and faster reloads.
const prodDB = initializeFirestore(app, {
	localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

const testDB = initializeFirestore(
	app,
	{
		localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
	},
	'ams-test'
);

const environment = process.env.REACT_APP_environment;
const useTestDB = environment !== 'production';

// Export the active database instance based on environment
export const db = useTestDB ? testDB : prodDB;

// --- 2. Cloud Functions (Server-Side Logic) ---
// These are wrappers for backend scripts located in /functions (Node.js).

// User Management
export const changeUserEmail = httpsCallable(functions, 'changeUserEmail');
export const getUserAuthRecord = httpsCallable(functions, 'getUserAuthRecord');

// Maintenance & Backfill
export const backfillLastUpdated = httpsCallable(functions, 'backfillLastUpdated');
export const backfillSentEmailTags = httpsCallable(functions, 'backfillSentEmailTags');
export const backfillSearchableTerms = httpsCallable(functions, 'backfillSearchableTerms');
export const backfillEmailContent = httpsCallable(functions, 'backfillEmailContent');

// Email & Communication
export const sendZohoEmail = httpsCallable(functions, 'sendZohoEmail');
export const updateEmailReadStatus = httpsCallable(functions, 'updateEmailReadStatus');
export const deleteZohoEmail = httpsCallable(functions, 'deleteZohoEmail');
export const fetchAttachmentContent = httpsCallable(functions, 'fetchAttachmentContent');
export const fetchEmailContent = httpsCallable(functions, 'fetchEmailContent');
export const bulkDeleteZohoEmails = httpsCallable(functions, 'bulkDeleteZohoEmails');

// Search & Scheduler
export const globalSearch = httpsCallable(functions, 'globalSearch');
export const getRoomDetails = httpsCallable(functions, 'getRoomDetails');
export const markInterviewAsMissed = httpsCallable(functions, 'markInterviewAsMissed');
export const endInterview = httpsCallable(functions, 'endInterview');
export const autoScheduleInterviews = httpsCallable(functions, 'autoScheduleInterviews');
export const scheduleSingleInterview = httpsCallable(functions, 'scheduleSingleInterview');
export const rescheduleInterview = httpsCallable(functions, 'rescheduleInterview');
export const deleteSingleInterview = httpsCallable(functions, 'deleteSingleInterview');
export const createInterviewRoom = httpsCallable(functions, 'createInterviewRoom');
export const closeInterviewRoom = httpsCallable(functions, 'closeInterviewRoom');
export const updateInterviewStatus = httpsCallable(functions, 'updateInterviewStatus');
export const sendInterviewInvitations = httpsCallable(functions, 'sendInterviewInvitations');
export const bulkDeleteInterviews = httpsCallable(functions, 'bulkDeleteInterviews');
export const deleteDeliberationRoom = httpsCallable(functions, 'deleteDeliberationRoom');
export const createDeliberationRoom = httpsCallable(functions, 'createDeliberationRoom');
export const bulkUpdateInterviewStatus = httpsCallable(functions, 'bulkUpdateInterviewStatus');
export const generateJoinToken = httpsCallable(functions, 'generateJoinToken');

// --- 3. Admin Tools (Destructive) ---

/**
 * Copies the entire Production Database to the Test Database.
 * Useful for debugging with real data safely.
 */
export const sendToTestDB = async () => {
	try {
		for (const key in collections) {
			const collectionName = collections[key];

			const defaultCollectionRef = collection(prodDB, collectionName);
			const testCollectionRef = collection(testDB, collectionName);

			const snapshot = await getDocs(defaultCollectionRef);

			const copyPromises = snapshot.docs.map(async (docSnapshot) => {
				const docData = docSnapshot.data();
				const docRef = doc(testCollectionRef, docSnapshot.id);
				await setDoc(docRef, docData);
			});

			await Promise.all(copyPromises);
		}

		alert('Database copied successfully!');
	} catch (error) {
		console.error('Error copying database:', error);
		alert('Error copying database.');
	}
};

const deleteAllDocsInCollection = async (collectionName, conn = testDB) => {
	const querySnapshot = await getDocs(collection(conn, collectionName));
	const deletePromises = querySnapshot.docs.map((docSnapshot) => deleteDoc(doc(conn, collectionName, docSnapshot.id)));
	await Promise.all(deletePromises);
	return true;
};

const clearApplicantsApplications = async (conn = testDB) => {
	const querySnapshot = await getDocs(collection(conn, collections.applicants));
	const updatePromises = querySnapshot.docs.map((docSnapshot) => updateDoc(doc(conn, collections.applicants, docSnapshot.id), { applications: [], awards: [] }));
	await Promise.all(updatePromises);
	return true;
};

/**
 * Deletes all documents in specific collections.
 * Use with EXTREME caution.
 */
export const wipeCollections = async (input) => {
	let targetDB = testDB;

	if (input?.conn) {
		if (input.conn === '(default)') {
			targetDB = prodDB;
		} else if (input.conn === 'ams-test') {
			targetDB = testDB;
		}
	} else if (input) {
		targetDB = input;
	}

	// Purposely omitted collections: collections.applicants, collections.members, collections.users, collections.siteConfig
	const collectionNames = [collections.applications, collections.attachments, collections.contributions, collections.education, collections.emails, collections.expenses, collections.families, collections.incomes, collections.profiles, collections.projections, collections.requests, collections.experience, collections.sitelog, collections.sms, collections.awards, collections.dblog];

	const collectionResults = await Promise.all(collectionNames.map((name) => deleteAllDocsInCollection(name, targetDB)));
	const collectionsSuccess = collectionResults.every(Boolean);
	const applicantsSuccess = await clearApplicantsApplications(targetDB);

	return collectionsSuccess && applicantsSuccess;
};

// --- 4. Logging & Analytics ---

/**
 * Logs user actions to the 'sitelog' collection for audit trails.
 * Captures IP, Browser, OS, and User ID.
 */
export const logEvent = async (actionDescription = '', errorDetails = null) => {
	try {
		const ipResponse = await axios.get(`https://ipapi.co/json/`);
		const locationData = ipResponse.data;

		const parser = new UAParser();
		const browserInfo = parser.getResult();

		const logData = {
			timestamp: new Date(),
			ip: locationData.ip || 'unknown',
			city: locationData.city,
			country: locationData.country_name,
			region: locationData.region,
			lat: locationData.latitude,
			lon: locationData.longitude,
			isp: locationData.org,
			org: locationData.org,
			timezone: locationData.timezone,
			userAgent: browserInfo.ua || 'unknown',
			browser: browserInfo.browser?.name || 'unknown',
			browserVersion: browserInfo.browser?.version || 'unknown',
			os: browserInfo.os?.name || 'unknown',
			osVersion: browserInfo.os?.version || 'unknown',
			device: {
				vendor: browserInfo.device?.vendor || 'unknown',
				model: browserInfo.device?.model || 'unknown',
				type: browserInfo.device?.type || 'unknown',
			},
			actionDescription: actionDescription || 'none',
			authDetails: auth.currentUser,
			errorDetails: errorDetails,
		};

		const cleanedLogData = JSON.parse(JSON.stringify(logData, (key, value) => (value === undefined ? null : value)));
		await addDoc(collection(db, collections.sitelog), cleanedLogData);

		if (errorDetails !== null && process.env.REACT_APP_environment !== 'production') {
			console.error(`Error!\nDescription: ${actionDescription}\nMessage: ${errorDetails.message}\nError:`, errorDetails);
		}
	} catch (error) {
		console.error('Error logging user action:', error.message);
	}
};

// --- 5. Configuration Fetchers ---

export const getConfigFromDb = async () => {
	try {
		const docRef = doc(db, collections.siteConfig, process.env.REACT_APP_configKey);
		const docSnap = await getDoc(docRef);
		return docSnap.exists() ? docSnap.data() : null;
	} catch (error) {
		logEvent('Error in getConfigFromDB', error);
		return null;
	}
};

export const getRealTimeConfigFromDb = (callback) => {
	const docRef = doc(db, collections.siteConfig, process.env.REACT_APP_configKey);
	const unsubscribe = onSnapshot(docRef, (snapshot) => {
		snapshot.exists() ? callback(snapshot.data()) : callback(null);
	});
	return unsubscribe;
};

export const updateUserPreferences = async (userId, collectionName, preferences) => {
	if (!userId || !collectionName) return;

	try {
		const userRef = doc(db, collectionName, userId);
		const updateData = {};
		for (const [key, value] of Object.entries(preferences)) {
			updateData[`preferences.${key}`] = value;
		}

		await updateDoc(userRef, updateData);
	} catch (error) {
		console.error('Error updating user preferences:', error);
	}
};

// --- 6. Helper Utilities ---

/**
 * Fetches multiple documents from a single collection by their IDs.
 * @param {string} collectionName - The name of the collection to query.
 * @param {string[]} ids - An array of document IDs to fetch.
 * @returns {Promise<object[]>} A promise that resolves to an array of document data.
 */
export const getDocumentsByIDs = async (collectionName, ids) => {
	if (!Array.isArray(ids) || ids.length === 0) {
		return [];
	}

	try {
		const docPromises = ids.map((id) => getDoc(doc(db, collectionName, id)));
		const docSnaps = await Promise.all(docPromises);
		return docSnaps.filter((doc) => doc.exists()).map((doc) => doc.data());
	} catch (error) {
		console.error(`Error in getDocumentsByIDs for collection ${collectionName}:`, error);
		return [];
	}
};

const searchSingleCollection = async (collectionInfo, termsArray, uniqueResults) => {
	const { collection: collectionName, fields } = collectionInfo;
	for (const term of termsArray) {
		const lowerTerm = term.toLowerCase();
		for (const field of fields) {
			const q = query(collection(db, collectionName), where(field, '>=', lowerTerm), where(field, '<=', lowerTerm + '\uf8ff'));
			const querySnapshot = await getDocs(q);
			for (const doc of querySnapshot.docs) {
				if (!uniqueResults.has(doc.id)) {
					const docData = doc.data();
					const document = { id: doc.id, ...docData, collection: collectionName };
					uniqueResults.set(doc.id, document);
				}
			}
		}
	}
};

export const searchCollections = async (termsArray) => {
	if (!Array.isArray(termsArray) || termsArray.length === 0) {
		throw new TypeError('Input must be a non-empty array of terms');
	}

	try {
		const uniqueResults = new Map();
		const searchPromises = Object.values(SearchableCollections).map((collectionInfo) => searchSingleCollection(collectionInfo, termsArray, uniqueResults));
		await Promise.all(searchPromises);
		return Array.from(uniqueResults.values());
	} catch (error) {
		console.error('Error searching collections:', error);
		throw error;
	}
};

// --- 7. User Profiles (Auth & DB) ---

export const getApplicant = async (userID) => {
	try {
		const docRef = doc(db, collections.applicants, userID);
		const docSnap = await getDoc(docRef);
		return docSnap.exists() ? docSnap.data() : null;
	} catch (error) {
		logEvent('Error in getApplicant', error);
		return null;
	}
};

export const getMember = async (userID) => {
	try {
		const docRef = doc(db, collections.members, userID);
		const docSnap = await getDoc(docRef);
		return docSnap.exists() ? docSnap.data() : null;
	} catch (error) {
		logEvent('Error in getMember', error);
		return null;
	}
};

export const saveApplicantData = async (userID, data) => {
	try {
		const newRef = doc(db, collections.applicants, userID);
		await setDoc(newRef, data, { merge: true });
		return true;
	} catch (error) {
		logEvent('Error in saveApplicantData', error);
		return false;
	}
};

export const updateApplicantData = async (userID, data) => {
	try {
		const newRef = doc(db, collections.applicants, userID);
		await updateDoc(newRef, data);
		return true;
	} catch (error) {
		logEvent('Error in updateApplicantData', error);
		return false;
	}
};

export const addApplicationToApplicant = async (userID, applicationID) => {
	try {
		const applicantRef = doc(db, collections.applicants, userID);
		await updateDoc(applicantRef, { applications: arrayUnion(applicationID) });
		return true;
	} catch (error) {
		logEvent('Error in addApplicationToApplicant', error);
		return false;
	}
};

export const removeApplicationFromApplicant = async (userId, applicationId) => {
	try {
		const applicantRef = doc(db, collections.applicants, userId);
		await updateDoc(applicantRef, { applications: arrayRemove(applicationId) });
		return true;
	} catch (error) {
		logEvent('Error in removingApplicationFromApplicant', error);
		return false;
	}
};

export const getAuthUserByEmail = async (email) => {
	try {
		const usersRef = collection(db, collections.users);
		const q = query(usersRef, where('email', '==', email));
		const querySnapshot = await getDocs(q);
		return querySnapshot.empty ? null : querySnapshot.docs[0].data();
	} catch (error) {
		logEvent('Error in getAuthUserByEmail', error);
		return null;
	}
};

/**
 * Fetches both member and applicant profiles for a given user ID.
 * @param {string} uid - The user's ID.
 * @returns {Promise<object>} An object containing member and applicant data if they exist.
 */
export const getUserProfiles = async (uid) => {
	if (uid) {
		try {
			const memberRef = doc(db, collections.members, uid);
			const applicantRef = doc(db, collections.applicants, uid);

			const [memberSnap, applicantSnap] = await Promise.all([getDoc(memberRef), getDoc(applicantRef)]);

			return {
				member: memberSnap.exists() ? memberSnap.data() : null,
				applicant: applicantSnap.exists() ? applicantSnap.data() : null,
			};
		} catch (error) {
			logEvent('Error in getUserProfiles', error);
			return { member: null, applicant: null };
		}
	}
	return null;
};

export const registerUser = async (email, password) => {
	try {
		const user = await createUserWithEmailAndPassword(auth, email, password);
		return user;
	} catch (error) {
		logEvent('Error in registerUser', error);
		throw error;
	}
};

export const loginUser = async (email, password) => {
	try {
		const user = await signInWithEmailAndPassword(auth, email, password);
		return user;
	} catch (error) {
		logEvent('Error in loginUser', error);
		throw error;
	}
};

export const logoutUser = async () => {
	await signOut(auth);
};

export const getAllApplicantsSimple = async () => {
	const applicantsRef = collection(db, collections.applicants);
	const q = query(applicantsRef, orderBy('lastName', 'asc'));
	const snapshot = await getDocs(q);

	return snapshot.docs.map((doc) => ({
		id: doc.id,
		name: `${doc.data().firstName} ${doc.data().lastName}`,
	}));
};

export const getApplicationsForApplicant = async (applicantId) => {
	const appsRef = collection(db, collections.applications);
	const q = query(appsRef, where('completedBy', '==', applicantId), where('status', 'in', ['Eligible', 'Completed']));
	const snapshot = await getDocs(q);
	return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// --- 8. Applications (CRUD & Status) ---

export const saveCollectionData = async (collectionName, dataID, data) => {
	try {
		const newRef = doc(db, collectionName, dataID);
		await setDoc(newRef, data, { merge: true });
		return true;
	} catch (error) {
		logEvent('saveCollectionData error', error);
		return false;
	}
};

export const updateCollectionData = async (collectionName, dataID, data) => {
	try {
		const newRef = doc(db, collectionName, dataID);
		await updateDoc(newRef, data, { merge: true });
		return true;
	} catch (error) {
		logEvent('updateCollectionData error', error);
		return false;
	}
};

export const updateApplicationStatus = async (userID, applicationID, newStatus) => {
	try {
		await updateCollectionData(collections.applications, applicationID, { status: newStatus });
		return true;
	} catch (error) {
		logEvent('Error updating application status:', error);
		return false;
	}
};

export const getApplication = async (userID, applicationID) => {
	try {
		if (applicationID) {
			const docRef = doc(db, collections.applications, applicationID);
			const docSnap = await getDoc(docRef);
			return docSnap.exists() ? docSnap.data() : null;
		}
	} catch (error) {
		logEvent('getApplication error', error);
		return null;
	}
};

export const getCollection = async (collectionName) => {
	try {
		const collector = [];
		const querySnapshot = await getDocs(collection(db, collectionName));
		for (const doc of querySnapshot.docs) {
			collector.push(doc.data());
		}
		return collector;
	} catch (error) {
		logEvent('getCollection error', error);
		return null;
	}
};

export const getCollectionData = async (userID, collectionName, dataID) => {
	if (dataID) {
		try {
			const docRef = doc(db, collectionName, dataID);
			const docSnap = await getDoc(docRef);
			return docSnap.exists() ? docSnap.data() : null;
		} catch (error) {
			logEvent('Error in getCollectionData', error);
			return null;
		}
	}
};

export const deleteApplication = async (application) => {
	try {
		const submissionRef = doc(db, collections.applications, application.id);
		await updateDoc(submissionRef, {
			status: ApplicationStatus.deleted,
			deletedOn: new Date(),
		});
		return true;
	} catch (error) {
		logEvent('Error in deleteApplication', error);
		return false;
	}
};

export const updateSubmissionStatus = async (submissionID, status) => {
	try {
		const submissionRef = doc(db, collections.applications, submissionID);
		await updateDoc(submissionRef, {
			status: status,
			updatedOn: new Date(),
		});
		return true;
	} catch (error) {
		logEvent('Error updating submission status', error);
		return false;
	}
};

const processSnapshotForBatchDelete = (snapshot, collectionName, batch, result) => {
	if (snapshot.empty) {
		return;
	}

	result.count += snapshot.size;
	for (const docSnap of snapshot.docs) {
		batch.delete(docSnap.ref);

		if (collectionName === collections.applications) {
			result.applicationIds.push(docSnap.id);
		}

		if (collectionName === collections.attachments) {
			const docData = docSnap.data();
			for (const value of Object.values(docData)) {
				if (value && typeof value === 'object' && value.refLoc) {
					result.filePromises.push(deleteFile(value.refLoc));
				}
			}
		}
	}
};

const batchDeleteOwnedDocuments = async (userId, batch) => {
	const result = {
		count: 0,
		applicationIds: [],
		filePromises: [],
	};

	for (const collectionName of applicationSpecificCollections) {
		const q = query(collection(db, collectionName), where('completedBy', '==', userId));
		const snapshot = await getDocs(q);

		processSnapshotForBatchDelete(snapshot, collectionName, batch, result);
	}
	return result;
};

const batchDeleteRelatedRequests = async (applicationIds, batch) => {
	if (!applicationIds || applicationIds.length === 0) {
		return 0;
	}
	const requestsQuery = query(collection(db, collections.requests), where('applicationID', 'in', applicationIds));
	const requestsSnapshot = await getDocs(requestsQuery);

	if (requestsSnapshot.empty) {
		return 0;
	}

	for (const docSnap of requestsSnapshot.docs) {
		batch.delete(docSnap.ref);
	}
	return requestsSnapshot.size;
};

export const purgeUserRecords = async ({ userId, expel = false }) => {
	if (!userId) {
		throw new Error('User ID is required to purge records.');
	}

	const batch = writeBatch(db);
	let deletedDocsCount = 0;

	const ownedDocsResult = await batchDeleteOwnedDocuments(userId, batch);
	deletedDocsCount += ownedDocsResult.count;
	await Promise.all(ownedDocsResult.filePromises);

	const deletedRequestsCount = await batchDeleteRelatedRequests(ownedDocsResult.applicationIds, batch);
	deletedDocsCount += deletedRequestsCount;

	if (expel) {
		batch.delete(doc(db, collections.applicants, userId));
		batch.delete(doc(db, collections.users, userId));
		deletedDocsCount += 2;
	} else {
		batch.update(doc(db, collections.applicants, userId), { applications: [] });
	}

	await batch.commit();

	if (expel) {
		const deleteAuthUser = httpsCallable(functions, 'deleteAuthUser');
		await deleteAuthUser({ uid: userId });
	}

	return { message: `Successfully purged ${deletedDocsCount} records for user ${userId}. This user was ${expel ? '' : 'not'} expelled.` };
};

// --- 9. Real-Time Dashboard Listeners ---

const getOrderBy = (orderByConfig) => {
	if (!orderByConfig || !Array.isArray(orderByConfig) || orderByConfig.length === 0) {
		return [];
	}
	if (Array.isArray(orderByConfig[0])) {
		return orderByConfig.map((config) => orderBy(config[0], config[1]));
	}
	return [orderBy(orderByConfig[0], orderByConfig[1])];
};

/**
 * Fetches the legacy finances collection and maps the doc ID (year) to 'id'.
 */
export const getRealTimeLegacyFinances = (handler, { collection: collectionName, orderBy: orderByConfig }) => {
	if (typeof collectionName !== 'string' || collectionName.length === 0) {
		console.error('getRealTimeLegacyFinances error: collectionName is not a valid string.', collectionName);
		handler([]);
		return () => { };
	}

	try {
		const collRef = collection(db, collectionName);
		const q = query(collRef, ...getOrderBy(orderByConfig));

		return onSnapshot(
			q,
			(snapshot) => {
				const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
				handler(data);
			},
			(error) => {
				console.error(`Error listening to collection ${collectionName}:`, error);
				handler([]);
			}
		);
	} catch (error) {
		console.error(`Failed to create query for ${collectionName}:`, error);
		handler([]);
		return () => { };
	}
};

export const getRealTimeCollection = (collectionRef, callback) => {
	const unsubscribe = onSnapshot(collection(db, collectionRef), (snapshot) => {
		const fetchedData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		callback(fetchedData);
	});

	return unsubscribe;
};

export const getPastApplicationsCountByWindow = async (window) => {
	try {
		const coll = collection(db, collections.applications);
		const q = query(coll, and(where('window', '==', window), or(where('status', '==', ApplicationStatus.eligible), where('status', '==', ApplicationStatus.invited), where('status', '==', ApplicationStatus.deferred), where('status', '==', ApplicationStatus.awarded), where('status', '==', ApplicationStatus.denied))));

		const snapshot = await getCountFromServer(q);
		return snapshot.data().count;
	} catch (error) {
		logEvent('Error in getPastApplicationsCountByWindow', error);
		return null;
	}
};

export const getCurrentApplicationCount = async () => {
	try {
		const config = await getConfigFromDb();
		const coll = collection(db, collections.applications);
		const q = query(coll, where('window', '==', config.APPLICATION_DEADLINE));
		const snapshot = await getCountFromServer(q);
		return snapshot.data().count;
	} catch (error) {
		logEvent('Error in getCurrentApplicationCount', error);
		return null;
	}
};

export const getRealTimeCurrentApplicationCount = async (callback) => {
	try {
		const config = await getConfigFromDb();
		const coll = collection(db, collections.applications);
		const q = query(coll, where('window', '==', config.APPLICATION_DEADLINE));
		const unsubscribe = onSnapshot(q, (snapshot) => {
			const count = snapshot.size;
			callback(count);
		});

		return unsubscribe;
	} catch (error) {
		logEvent('getRealTimeCurrentApplicationCount error', error);
		return null;
	}
};

export const getCurrentlyEligibleApplicationsCount = async () => {
	try {
		const config = await getConfigFromDb();
		const coll = collection(db, collections.applications);
		const q = query(coll, and(where('window', '==', config.APPLICATION_DEADLINE), or(where('status', '==', ApplicationStatus.completed), where('status', '==', ApplicationStatus.eligible), where('status', '==', ApplicationStatus.invited), where('status', '==', ApplicationStatus.deferred), where('status', '==', ApplicationStatus.awarded), where('status', '==', ApplicationStatus.denied))));

		const snapshot = await getCountFromServer(q);
		return snapshot.data().count;
	} catch (error) {
		logEvent('Error in getCurrentlyEligibleApplicationsCount', error);
		return null;
	}
};

export const getMostRecentApplicationIDs = async (limitCount = 10) => {
	try {
		const coll = collection(db, collections.applications);
		const q = query(coll, orderBy('submittedOn', 'desc'), limit(limitCount));
		const querySnapshot = await getDocs(q);
		const applicationIDs = querySnapshot.docs.map((doc) => doc.id);
		return applicationIDs;
	} catch (error) {
		logEvent('Error fetching most recent application IDs: ', error);
		return [];
	}
};

export const getRealTimeMostRecentApplicationIDs = (callback, limitCount = 10) => {
	const coll = collection(db, collections.applications);
	const q = query(coll, where('status', '!=', ApplicationStatus.deleted), orderBy('submittedOn', 'desc'), limit(limitCount));
	const unsubscribe = onSnapshot(q, (snapshot) => {
		const recentApplicationIDs = snapshot.docs.map((doc) => doc.id);
		callback(recentApplicationIDs);
	});
	return unsubscribe;
};

export const getApplicationsByYear = async () => {
	const coll = collection(db, collections.applications);
	const q = query(coll);
	const snapshot = await getDocs(q);

	const groupedData = {};
	for (const doc of snapshot.docs) {
		const data = doc.data();
		const year = new Date(data.window).getFullYear();
		if (!groupedData[year]) {
			groupedData[year] = 0;
		}
		groupedData[year]++;
	}

	return Object.keys(groupedData).map((year) => ({
		year,
		count: groupedData[year],
	}));
};

export const getCurrentlyEligibleApplicationsCountByType = async (type) => {
	try {
		const config = await getConfigFromDb();
		const coll = collection(db, collections.applications);
		const q = query(coll, and(where('type', '==', type), where('window', '==', config.APPLICATION_DEADLINE), or(where('status', '==', ApplicationStatus.completed), where('status', '==', ApplicationStatus.eligible), where('status', '==', ApplicationStatus.invited), where('status', '==', ApplicationStatus.deferred), where('status', '==', ApplicationStatus.awarded), where('status', '==', ApplicationStatus.denied))));
		const snapshot = await getCountFromServer(q);
		return snapshot.data().count;
	} catch (error) {
		logEvent('getCurrentlyEligibleApplicationsCountByType error', error);
		return null;
	}
};

export const getRealTimeCurrentEligibleApplicationsCountByType = async (type, callback) => {
	try {
		const config = await getConfigFromDb();
		const coll = collection(db, collections.applications);

		let q;

		if (Object.values(ApplicationType).includes(type)) {
			q = query(coll, and(where('type', '==', type), where('window', '==', config.APPLICATION_DEADLINE), or(where('status', '==', ApplicationStatus.completed), where('status', '==', ApplicationStatus.eligible), where('status', '==', ApplicationStatus.invited), where('status', '==', ApplicationStatus.deferred), where('status', '==', ApplicationStatus.awarded), where('status', '==', ApplicationStatus.denied))));
		} else if (Object.values(ApplicationStatus).includes(type)) {
			q = query(coll, and(where('window', '==', config.APPLICATION_DEADLINE), where('status', '==', type)));
		} else {
			throw new Error(`Invalid type passed to getRealTimeCurrentEligibleApplicationsCountByType: ${type}`);
		}

		const unsubscribe = onSnapshot(q, (snapshot) => {
			callback(snapshot.size);
		});

		return unsubscribe;
	} catch (error) {
		logEvent('Error in getRealTimeCurrentEligibleApplicationsCountByType', error);
		return null;
	}
};

export const getEligibleApplicationsCountByTypeAndWindow = async (type, window) => {
	try {
		const coll = collection(db, collections.applications);
		const q = query(coll, and(where('type', '==', type), where('window', '==', window), or(where('status', '==', ApplicationStatus.completed), where('status', '==', ApplicationStatus.eligible), where('status', '==', ApplicationStatus.invited), where('status', '==', ApplicationStatus.deferred), where('status', '==', ApplicationStatus.awarded), where('status', '==', ApplicationStatus.denied))));
		const snapshot = await getCountFromServer(q);
		return snapshot.data().count;
	} catch (error) {
		logEvent('Error in getEligibleApplicationsCountByTypeAndWindow', error);
		return null;
	}
};

export const getRealTimeApplicationCountByStatus = (status, callback) => {
	try {
		const coll = collection(db, collections.applications);
		const q = query(coll, where('status', '==', status));
		const unsubscribe = onSnapshot(q, (snapshot) => {
			callback(snapshot.size);
		});
		return unsubscribe;
	} catch (error) {
		logEvent('Error in getRealTimeApplicationCountByStatus', error);
		return null;
	}
};

export const getRealTimeEligibleApplicationsCountByTypeAndWindow = (type, window, callback) => {
	try {
		const coll = collection(db, collections.applications);
		let q;

		if (Object.values(ApplicationType).includes(type)) {
			q = query(coll, and(where('type', '==', type), where('window', '==', window), or(where('status', '==', ApplicationStatus.completed), where('status', '==', ApplicationStatus.eligible), where('status', '==', ApplicationStatus.invited), where('status', '==', ApplicationStatus.deferred), where('status', '==', ApplicationStatus.awarded), where('status', '==', ApplicationStatus.denied))));
		} else if (Object.values(ApplicationStatus).includes(type)) {
			q = query(coll, and(where('window', '==', window), where('status', '==', type)));
		} else {
			throw new Error(`Invalid type passed to getRealTimeCurrentEligibleApplicationsCountByType: ${type}`);
		}

		const unsubscribe = onSnapshot(q, (snapshot) => {
			callback(snapshot.size);
		});

		return unsubscribe;
	} catch (error) {
		logEvent('Error in getRealTimeCurrentEligibleApplicationsCountByType', error);
		return null;
	}
};

export const getRealTimeApplications = (includeDeleted, callback) => {
	try {
		const coll = collection(db, collections.applications);
		const q = includeDeleted ? coll : query(coll, where('status', '!=', ApplicationStatus.deleted));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const fetchedData = snapshot.docs.map((doc) => doc.data());
			callback(fetchedData);
		});

		return unsubscribe;
	} catch (error) {
		logEvent('Error in getRealTimeApplications:', error);
		return null;
	}
};

export const getRealTimeRejectedApplications = (callback) => {
	try {
		const coll = collection(db, collections.applications);

		const q = query(coll, or(where('status', '==', ApplicationStatus.denied), where('status', '==', ApplicationStatus.deferred), where('status', '==', ApplicationStatus.ineligible)));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			callback(snapshot.size);
		});

		return unsubscribe;
	} catch (error) {
		logEvent('Error in getRealTimeRejectedApplications:', error);
		return null;
	}
};

export const getApplicationsByWindow = async (window) => {
	try {
		const collector = [];
		const q = query(collection(db, collections.applications), where('window', '==', window));
		const querySnapshot = await getDocs(q);
		for (const doc of querySnapshot.docs) {
			collector.push(doc.data());
		}
		return collector;
	} catch (error) {
		logEvent('getApplicationsByWindow error', error);
		return null;
	}
};

export const getRealTimeApplicationsByWindow = (window, includeDeleted, callback) => {
	const typeQuery = query(collection(db, collections.applications), includeDeleted ? where('window', '==', window) : and(where('window', '==', window), where('status', '!=', ApplicationStatus.deleted)));
	const unsubscribe = onSnapshot(typeQuery, (snapshot) => {
		const fetchedData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		callback(fetchedData);
	});

	return unsubscribe;
};

export const getApplicationsByType = async (type, window) => {
	try {
		const collector = [];
		const q = query(collection(db, collections.applications), where('type', '==', type), where('window', '==', window));
		const querySnapshot = await getDocs(q);
		for (const doc of querySnapshot.docs) {
			collector.push(doc.data());
		}
		return collector;
	} catch (error) {
		logEvent('getApplicationsByType error', error);
		return null;
	}
};

export const getRealTimeApplicationsByType = (type, window, includeDeleted, callback) => {
	const typeQuery = query(collection(db, collections.applications), includeDeleted ? and(where('type', '==', type), where('window', '<=', window)) : and(where('type', '==', type), where('window', '<=', window), where('status', '!=', ApplicationStatus.deleted)));
	const unsubscribe = onSnapshot(typeQuery, (snapshot) => {
		const fetchedData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		callback(fetchedData);
	});

	return unsubscribe;
};

export const getRealTimeApplicantsByApplicationID = (applicantIDs, callback) => {
	if (Array.isArray(applicantIDs) && applicantIDs.length > 0) {
		const matches = {};
		const unsubscribeFunctions = applicantIDs.map((id) => {
			const docRef = doc(db, collections.applicants, id);
			return onSnapshot(
				docRef,
				(snapshot) => {
					if (snapshot.exists()) {
						matches[snapshot.id] = snapshot.data();
					} else {
						delete matches[snapshot.id];
					}
					callback(Object.values(matches));
				},
				(error) => {
					logEvent('Error in getRealTimeApplicantsByApplicationID', error);
				}
			);
		});

		return () => {
			for (const unsub of unsubscribeFunctions) {
				unsub();
			}
		};
	}
	return null;
};

export const getApplicationsByStatus = async (status, window) => {
	try {
		const collector = [];
		const q = query(collection(db, collections.applications), where('status', '==', status), where('window', '==', window));
		const querySnapshot = await getDocs(q);
		for (const doc of querySnapshot.docs) {
			collector.push(doc.data());
		}
		return collector;
	} catch (error) {
		logEvent('getApplicationsByStatus error', error);
		return null;
	}
};

export const getRealTimeApplicationsByStatus = (type, callback, window = null) => {
	let statusQuery;
	if (window === null) {
		statusQuery = query(collection(db, collections.applications), where('status', '==', type));
	} else {
		statusQuery = query(collection(db, collections.applications), and(where('status', '==', type), where('window', '==', window)));
	}
	const unsubscribe = onSnapshot(statusQuery, (snapshot) => {
		const fetchedData = snapshot.docs.map((doc) => doc.data());
		callback(fetchedData || []);
	});
	return unsubscribe;
};

export const getRealTimeDocument = (type, id, callback) => {
	if (type && id && callback) {
		const docRef = doc(db, type, id);
		const unsubscribe = onSnapshot(docRef, (snapshot) => {
			snapshot.exists() ? callback(snapshot.data()) : callback(null);
		});

		return unsubscribe;
	}
};

export const getRealTimeApplicationsByIDs = (applicationIDs, callback) => {
	if (!Array.isArray(applicationIDs) || applicationIDs.length === 0) {
		callback([]);
		return () => { };
	}

	const matches = {};
	const unsubscribeFunctions = applicationIDs.map((id) => {
		const docRef = doc(db, collections.applications, id);

		return onSnapshot(
			docRef,
			(snapshot) => {
				const data = snapshot.data();

				if (snapshot.exists() && data.status !== ApplicationStatus.deleted) {
					matches[snapshot.id] = data;
				} else {
					delete matches[snapshot.id];
				}

				callback(Object.values(matches));
			},
			(error) => {
				logEvent('Error in getRealTimeApplicationsByIDs', error);
			}
		);
	});

	return () => {
		for (const unsub of unsubscribeFunctions) {
			unsub();
		}
	};
};

export const getRealTimeAwardsByIDs = (awardIDs, callback) => {
	if (!Array.isArray(awardIDs) || awardIDs.length === 0) {
		throw new TypeError('awardIDs must be a non-empty array');
	}

	const matches = {};
	const unsubscribeFunctions = awardIDs.map((id) => {
		const docRef = doc(db, collections.awards, id);
		return onSnapshot(
			docRef,
			(snapshot) => {
				if (snapshot.exists()) {
					matches[snapshot.id] = snapshot.data();
				} else {
					delete matches[snapshot.id];
				}
				callback(Object.values(matches));
			},
			(error) => {
				logEvent('Error in getRealTimeAwardsByIDs', error);
			}
		);
	});

	return () => {
		for (const unsub of unsubscribeFunctions) {
			unsub();
		}
	};
};

export const getAwardsData = async (userID, awardIDs) => {
	if (!Array.isArray(awardIDs)) {
		throw new TypeError('awardIDs must be an array');
	}

	try {
		const awardPromises = awardIDs.map((appId) => getDoc(doc(db, collections.awards, appId)));
		const awardDocs = await Promise.all(awardPromises);
		const awards = awardDocs.filter((doc) => doc.exists()).map((doc) => doc.data());
		return awards;
	} catch (error) {
		logEvent('Error in getAwardsData', error);
		throw error;
	}
};

export const getApplicationsByIDs = async (applicationIDs) => {
	if (!Array.isArray(applicationIDs)) {
		throw new TypeError('applicationIDs must be an array');
	}

	try {
		const applicationPromises = applicationIDs.map((appId) => getDoc(doc(db, collections.applications, appId)));
		const applicationDocs = await Promise.all(applicationPromises);
		const applications = applicationDocs.filter((doc) => doc.exists()).map((doc) => doc.data());
		return applications;
	} catch (error) {
		logEvent('Error in getApplicationsByIDs', error);
		return null;
	}
};

// --- 10. Analytics & Reporting ---

const calculateBenchmarkStats = (awards, applicantMap) => {
	const totals = {
		[ApplicationType.newApplication]: { sum: 0, count: 0 },
		[ApplicationType.returningGrant]: { sum: 0, count: 0 },
		[ApplicationType.scholarship]: { sum: 0, count: 0 },
	};

	const usedApplicants = new Set();

	for (const award of awards) {
		const { applicantID, type } = award;

		if (totals[type] === undefined) continue;
		if (usedApplicants.has(`${type}:${applicantID}`)) continue;

		const applicant = applicantMap.get(applicantID);

		if (!applicant || !Array.isArray(applicant.awards)) continue;

		const distinctYears = new Set(applicant.awards.map((aw) => new Date(aw.deadline).getFullYear()));

		if (distinctYears.size >= 4) continue;

		totals[type].sum += Number(award.amount) || 0;
		totals[type].count++;
		usedApplicants.add(`${type}:${applicantID}`);
	}

	return {
		[ApplicationType.newApplication]: totals[ApplicationType.newApplication].count > 0 ? totals[ApplicationType.newApplication].sum / totals[ApplicationType.newApplication].count : 0,
		[ApplicationType.returningGrant]: totals[ApplicationType.returningGrant].count > 0 ? totals[ApplicationType.returningGrant].sum / totals[ApplicationType.returningGrant].count : 0,
		[ApplicationType.scholarship]: totals[ApplicationType.scholarship].count > 0 ? totals[ApplicationType.scholarship].sum / totals[ApplicationType.scholarship].count : 0,
	};
};

export const getBenchmarkedAwardCounts = async (priorYearWindow) => {
	const awardsRef = collection(db, collections.awards);

	try {
		const snapshot = await getDocs(query(awardsRef, where('deadline', '==', priorYearWindow)));

		const uniqueApplicantIDs = new Set();
		const awardsToProcess = [];

		for (const docSnap of snapshot.docs) {
			const award = docSnap.data();
			awardsToProcess.push(award);
			if (award.applicantID) {
				uniqueApplicantIDs.add(award.applicantID);
			}
		}

		const applicantIdsArray = Array.from(uniqueApplicantIDs);
		const applicantPromises = applicantIdsArray.map((id) => getDoc(doc(db, collections.applicants, id)));
		const applicantSnaps = await Promise.all(applicantPromises);

		const applicantMap = new Map();
		for (const snap of applicantSnaps) {
			if (snap.exists()) {
				applicantMap.set(snap.id, snap.data());
			}
		}

		return calculateBenchmarkStats(awardsToProcess, applicantMap);
	} catch (error) {
		logEvent('Error in getBenchmarkedAwardCounts', error);
		return null;
	}
};

export const getAverageApplicationsPerYearByType = async (type, currentYear, yearsBack = 3) => {
	try {
		const coll = collection(db, collections.applications);
		const q = query(
			coll,
			and(
				where('type', '==', type),
				where('status', 'in', [ApplicationStatus.completed, ApplicationStatus.eligible, ApplicationStatus.invited, ApplicationStatus.deferred, ApplicationStatus.awarded, ApplicationStatus.denied])
			)
		);
		const snapshot = await getDocs(q);

		let totalApplicationsInWindow = 0;
		const startYear = currentYear - yearsBack;

		snapshot.forEach((doc) => {
			const data = doc.data();
			if (data.window) {
				const appYear = new Date(data.window).getFullYear();
				// Only count applications that fall strictly within the history window (e.g. 2023, 2024, 2025 if current is 2026)
				if (appYear >= startYear && appYear < currentYear) {
					totalApplicationsInWindow++;
				}
			}
		});

		// By strictly dividing by `yearsBack`, years with 0 applications naturally pull the average down.
		return Math.round(totalApplicationsInWindow / yearsBack);
	} catch (error) {
		logEvent('Error in getAverageApplicationsPerYearByType', error);
		return 0;
	}
};

// --- 11. Notes System ---

const getParentNameForNote = async (parentRef) => {
	try {
		const parentDocSnap = await getDoc(parentRef);
		if (!parentDocSnap.exists()) return parentRef.id;

		const parentData = parentDocSnap.data();
		const parentCollection = parentRef.path.split('/')[0];

		if (parentCollection === collections.applicants) {
			return `${parentData.firstName} ${parentData.lastName}`;
		}

		if (parentCollection === collections.applications) {
			let appHolderName = 'Unknown Applicant';
			if (parentData.completedBy) {
				const applicantRef = doc(db, collections.applicants, parentData.completedBy);
				const applicantSnap = await getDoc(applicantRef);
				if (applicantSnap.exists()) {
					appHolderName = `${applicantSnap.data().firstName} ${applicantSnap.data().lastName}`;
				}
			}
			const appYear = new Date(parentData.window).getFullYear();
			return `${appHolderName}'s ${parentData.status} ${parentData.type} (${appYear})`;
		}

		return parentRef.id;
	} catch (error) {
		logEvent('Error in getParentNameForNote', error);
		return parentRef.id;
	}
};

export const getNotesByAuthor = async (authorId) => {
	if (!authorId) return [];

	const notesQuery = query(collectionGroup(db, 'notes'), where('authorId', '==', authorId), orderBy('createdAt', 'desc'));
	const snapshot = await getDocs(notesQuery);

	const userNotesPromises = snapshot.docs.map(async (noteDoc) => {
		const data = noteDoc.data();
		const parentRef = noteDoc.ref.parent.parent;
		const parentName = await getParentNameForNote(parentRef);

		return {
			id: noteDoc.id,
			...data,
			parent: {
				id: parentRef.id,
				collection: parentRef.path.split('/')[0],
				name: parentName,
			},
		};
	});

	return Promise.all(userNotesPromises);
};

export const getRealTimeNotes = (targetCollection, targetId, callback) => {
	const auth = getAuth();
	const currentUser = auth.currentUser;

	if (!currentUser) return () => { };

	const notesRef = collection(db, targetCollection, targetId, 'notes');

	const q = query(notesRef, or(where('visibility', '==', 'committee'), where('authorId', '==', currentUser.uid)), orderBy('createdAt', 'desc'));

	const unsubscribe = onSnapshot(q, (snapshot) => {
		const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		callback(notes);
	});

	return unsubscribe;
};

export const addNote = async (targetCollection, targetId, noteData) => {
	const notesRef = collection(db, targetCollection, targetId, 'notes');
	await addDoc(notesRef, {
		...noteData,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
};

export const updateNote = async (targetCollection, targetId, noteId, newText) => {
	const noteRef = doc(db, targetCollection, targetId, 'notes', noteId);
	await updateDoc(noteRef, {
		text: newText,
		updatedAt: new Date(),
	});
};

export const redactNote = async (targetCollection, targetId, noteId) => {
	const noteRef = doc(db, targetCollection, targetId, 'notes', noteId);
	await updateDoc(noteRef, {
		redacted: true,
		redactedOn: new Date(),
	});
};

// --- 12. Requests (References) ---

export const getRequestData = async (dataID) => {
	if (dataID) {
		try {
			const docRef = doc(db, collections.requests, dataID);
			const docSnap = await getDoc(docRef);
			return docSnap.exists() ? docSnap.data() : null;
		} catch (error) {
			logEvent('Error in getRequestData', error);
			return null;
		}
	}
};

export const invalidateRequest = async (dataID) => {
	try {
		const newRef = doc(db, collections.requests, dataID);
		await updateDoc(newRef, { expiryDate: new Date(Date.now() - 1000).toLocaleString() });
		return true;
	} catch (error) {
		logEvent('Error in invalidateRequest', error);
		return false;
	}
};

// --- 13. File Storage ---

export const saveFile = async (type, assetID, name, file) => {
	if (file == null || assetID == null) {
		throw new Error('No file or asset included in request.');
	}
	let filename = `${uuid()}_${name || ''}`;
	const fileRef = ref(storage, `${type}/${assetID}/${filename}`);
	try {
		const snapshot = await uploadBytes(fileRef, file);
		return snapshot.ref.fullPath;
	} catch (error) {
		logEvent('Error in saveFile', error);
		throw error;
	}
};

export const deleteFile = async (location) => {
	if (!location) {
		return false;
	}

	const fileRef = ref(storage, location);

	try {
		await deleteObject(fileRef);
		return true;
	} catch (error) {
		logEvent('Error in deleteFile', error);
		return false;
	}
};

export const getFile = async (refLoc) => {
	if (!refLoc) throw new Error('Missing refLoc path');
	const storageRef = ref(storage, refLoc);
	const url = await getDownloadURL(storageRef);
	return url;
};

export const getDownloadLinkForFile = async (file) => {
	if (file == null) {
		return null;
	}

	const directoryRef = ref(storage, file);

	try {
		const url = await getDownloadURL(directoryRef);
		return url;
	} catch (error) {
		logEvent('Error in getDownloadLinkForFile', error);
		return null;
	}
};

// --- 14. Interviews & Scheduling ---

export const getMeetings = async (userId, isCommittee) => {
	const interviewsRef = collection(db, 'interviews');
	let q;

	const relevantStatuses = [InterviewStatus.scheduled, InterviewStatus.invited, InterviewStatus.confirmed, InterviewStatus.inProgress, InterviewStatus.completed];

	if (isCommittee) {
		q = query(interviewsRef, where('status', 'in', relevantStatuses), orderBy('startTime', 'asc'));
	} else {
		q = query(interviewsRef, where('applicantId', '==', userId), where('status', 'in', relevantStatuses));
	}

	const querySnapshot = await getDocs(q);
	const meetings = await Promise.all(
		querySnapshot.docs.map(async (document) => {
			const meeting = { id: document.id, ...document.data() };

			if (meeting.applicantId) {
				try {
					const applicantRef = doc(db, collections.applicants, meeting.applicantId);
					const applicantDoc = await getDoc(applicantRef);
					if (applicantDoc.exists()) {
						const applicant = applicantDoc.data();
						meeting.displayName = `${applicant.callMe} | ${applicant.firstName} ${applicant.lastName}`;
					} else {
						meeting.displayName = 'Unknown Applicant';
					}
				} catch (error) {
					logEvent('Error in getMeetings', error);
					meeting.displayName = 'Error fetching name';
				}
			}
			return meeting;
		})
	);

	if (isCommittee) {
		meetings.push({
			id: 'deliberation',
			deliberation: true,
			displayName: 'Committee Deliberation',
		});
	}

	return meetings;
};

export const getRealTimeMeetings = (userId, isCommittee, callback, isDash = false) => {
	const interviewsRef = collection(db, 'interviews');
	let q;
	const relevantStatuses = isDash ? [InterviewStatus.scheduled, InterviewStatus.invited, InterviewStatus.confirmed, InterviewStatus.inProgress] : [InterviewStatus.scheduled, InterviewStatus.invited, InterviewStatus.confirmed, InterviewStatus.inProgress, InterviewStatus.completed, InterviewStatus.missed];

	if (isCommittee) {
		q = query(interviewsRef, where('status', 'in', relevantStatuses), orderBy('startTime', 'asc'));
	} else {
		q = query(interviewsRef, where('applicantId', '==', userId), where('status', 'in', relevantStatuses));
	}

	const unsubscribe = onSnapshot(q, async (querySnapshot) => {
		const meetings = await Promise.all(
			querySnapshot.docs.map(async (document) => {
				const meeting = { id: document.id, ...document.data() };
				if (meeting.applicantId) {
					try {
						const applicantRef = doc(db, collections.applicants, meeting.applicantId);
						const applicantDoc = await getDoc(applicantRef);
						if (applicantDoc.exists()) {
							const applicant = applicantDoc.data();
							meeting.displayName = `${applicant.callMe} | ${applicant.firstName} ${applicant.lastName}`;
						}
					} catch (error) {
						logEvent(`Error fetching applicant name for interview ${meeting.id}`, error);
					}
				}
				return meeting;
			})
		);
		callback(meetings);
	});
	return unsubscribe;
};

export const getSchedulableInterviews = async () => {
	const interviewsRef = collection(db, 'interviews');
	const q = query(interviewsRef, where('status', '==', 'scheduled'), where('roomId', '==', null));
	const querySnapshot = await getDocs(q);
	const interviews = [];
	for (const doc of querySnapshot.docs) {
		interviews.push({ id: doc.id, ...doc.data() });
	}
	return interviews;
};

export const getInterviewsByWindow = async (window) => {
	const interviewsRef = collection(db, 'interviews');
	const q = query(interviewsRef, where('deadline', '==', window), orderBy('startTime', 'asc'));

	const snapshot = await getDocs(q);
	if (snapshot.empty) {
		return [];
	}

	const interviewsWithNames = await Promise.all(
		snapshot.docs.map(async (details) => {
			const interview = { id: details.id, ...details.data() };
			try {
				const applicantDoc = await getDoc(doc(db, collections.applicants, interview.applicantId));

				if (applicantDoc.exists()) {
					const applicant = applicantDoc.data();
					interview.applicantName = `${applicant.firstName} ${applicant.lastName}`;
				} else {
					interview.applicantName = 'Unknown Applicant';
				}
			} catch {
				interview.applicantName = 'Error fetching name';
			}
			return interview;
		})
	);

	return interviewsWithNames;
};

export const getRealTimeInterviewsByWindow = (window, callback) => {
	const interviewsRef = collection(db, 'interviews');
	const q = query(interviewsRef, where('deadline', '==', window), orderBy('startTime', 'asc'));

	const unsubscribe = onSnapshot(q, async (snapshot) => {
		if (snapshot.empty) {
			callback([]);
			return;
		}

		const interviewsWithNames = await Promise.all(
			snapshot.docs.map(async (details) => {
				const interview = { id: details.id, ...details.data() };
				try {
					const applicantDoc = await getDoc(doc(db, collections.applicants, interview.applicantId));
					if (applicantDoc.exists()) {
						const applicant = applicantDoc.data();
						interview.applicantName = `${applicant.firstName} ${applicant.lastName}`;
					} else {
						interview.applicantName = 'Unknown Applicant';
					}
				} catch {
					interview.applicantName = 'Error fetching name';
				}
				return interview;
			})
		);

		callback(interviewsWithNames);
	});

	return unsubscribe;
};

export const generateICSDownloadURL = async (interview) => {
	const path = `interview-invites/${interview.id}.ics`;
	const fileRef = ref(storage, path);

	try {
		return await getDownloadURL(fileRef);
	} catch (err) {
		if (err.code === 'storage/object-not-found') {
			const ensureICS = httpsCallable(functions, 'ensureICSFile');

			const { startTime, endTime, title, description } = interview.data();
			const result = await ensureICS({
				interviewId: interview.id,
				startTime: startTime.toDate?.() ?? new Date(startTime),
				endTime: endTime.toDate?.() ?? new Date(endTime),
				title: title ?? 'AMS Interview',
				description: description ?? 'Scheduled interview session',
				url: `${globalThis.location.origin}/interviews/waiting-room/${interview.id}`,
			});

			return result.data.downloadUrl;
		} else {
			logEvent('Error in generateICSDownloadURL', err);
			throw err;
		}
	}
};
