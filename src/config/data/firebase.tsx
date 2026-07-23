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
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics';
import {
	initializeFirestore,
	persistentLocalCache,
	persistentMultipleTabManager,
	doc,
	getDoc,
	setDoc,
	updateDoc,
	getDocs,
	query,
	collection,
	where,
	or,
	and,
	orderBy,
	limit,
	onSnapshot,
	addDoc,
	arrayUnion,
	arrayRemove,
	deleteDoc,
	writeBatch,
	collectionGroup,
	serverTimestamp,
	Timestamp,
} from 'firebase/firestore';
import type { DocumentData, DocumentReference, Firestore, QuerySnapshot, Unsubscribe, UpdateData, WriteBatch } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { v4 as uuid } from 'uuid';
import { UAParser } from 'ua-parser-js';
import axios from 'axios';

// Config Imports
import { collections, ApplicationStatus, ApplicationType, InterviewStatus, applicationSpecificCollections, SearchableCollections } from './collections';
import type { ApplicationStatusValue, ApplicationTypeValue, CollectionKey } from './collections';
import type {
	CollectionName,
	InterviewRecord,
	MeetingRecord,
	PurgeUserRecordsParams,
	RealtimeCallback,
	SiteConfig,
} from '../../types/firebase';
import { normalizeSiteConfigDates, toJsDate } from './dateValue';

type WipeCollectionsInput = { conn?: string } | Firestore | null | undefined;

type InterviewICSInput = {
	id: string;
	data?: () => Record<string, unknown>;
	startTime?: unknown;
	endTime?: unknown;
	title?: unknown;
	description?: unknown;
};

type AttachmentRef = { refLoc?: string; [key: string]: unknown };

type BatchDeleteResult = {
	count: number;
	applicationIds: string[];
	filePromises: Promise<boolean>[];
};

type SearchCollectionInfo = {
	collection: string;
	fields: readonly string[];
};

export interface AwardTrendYear {
	year: number;
	New: number;
	Returning: number;
	Scholarship: number;
}

export interface DashboardBenchmarkData {
	currentCounts: Record<ApplicationTypeValue, number>;
	benchmarkTargets: Record<ApplicationTypeValue, number>;
	awardTrends: AwardTrendYear[];
}

export type OutlookSectionId =
	| 'brandNewAccounts'
	| 'expectedNewApplications'
	| 'lostInTheWeeds'
	| 'expectedReturningGrants'
	| 'expectedReturningScholarships';

export type OutlookRowCycleStatus = 'none' | 'correct' | 'wrong';

export interface DashboardApplicantOutlookRow {
	applicantId: string;
	name: string;
	gradYear: string | null;
	awardDisplay: string;
	lastAwardType: string | null;
	lastCycleYear: number | null;
	cycleStatus: OutlookRowCycleStatus;
}

export interface DashboardApplicantOutlookSection {
	id: OutlookSectionId;
	title: string;
	link: string;
	expectedType: ApplicationTypeValue | null;
	applicants: DashboardApplicantOutlookRow[];
	isComplete: boolean;
}

export interface DashboardApplicantOutlook {
	cycleYear: number;
	sections: DashboardApplicantOutlookSection[];
}

const getErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const isFirestoreTimestampLike = (value: unknown): value is { toDate: () => Date } =>
	typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function';

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
// Lazy Analytics: avoid init noise when GA isn't configured for this web app (common in local/demo).
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined' && process.env.REACT_APP_ENABLE_ANALYTICS === 'true') {
	isAnalyticsSupported()
		.then((supported) => {
			if (supported) analytics = getAnalytics(app);
		})
		.catch(() => {});
}
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
const CONFIG_DOC_ID = process.env.REACT_APP_configKey ?? '';

// Export the active database instance based on environment
export const db = useTestDB ? testDB : prodDB;

// --- 2. Cloud Functions (Server-Side Logic) ---
// These are wrappers for backend scripts located in /functions (Node.js).

// User Management
export const changeUserEmail = httpsCallable(functions, 'changeUserEmail');
export const submitPublicContact = httpsCallable(functions, 'submitPublicContact');
export const getUserAuthRecord = httpsCallable(functions, 'getUserAuthRecord');
export const getApplicantsByEmail = httpsCallable(functions, 'getApplicantsByEmail');
export const getApplicantsForMerge = httpsCallable(functions, 'getApplicantsForMerge');
export const mergeApplicantAccounts = httpsCallable(functions, 'mergeApplicantAccounts');

// Maintenance & Backfill
export const backfillLastUpdated = httpsCallable(functions, 'backfillLastUpdated');
export const backfillSentEmailTags = httpsCallable(functions, 'backfillSentEmailTags');
export const backfillSearchableTerms = httpsCallable(functions, 'backfillSearchableTerms');
export const backfillEmailContent = httpsCallable(functions, 'backfillEmailContent');
export const purgeDeletedApplications = httpsCallable(functions, 'purgeDeletedApplications');
export const findUnownedRecords = httpsCallable(functions, 'findUnownedRecords');
export const purgeUnownedRecords = httpsCallable(functions, 'purgeUnownedRecords');
export const cleanupOrphanedStorage = httpsCallable(functions, 'cleanupOrphanedStorage');
export const purgeLogs = httpsCallable(functions, 'purgeLogs');

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
		for (const key of Object.keys(collections) as CollectionKey[]) {
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

const deleteAllDocsInCollection = async (collectionName: CollectionName, conn: Firestore = testDB) => {
	const querySnapshot = await getDocs(collection(conn, collectionName));
	const deletePromises = querySnapshot.docs.map((docSnapshot) => deleteDoc(doc(conn, collectionName, docSnapshot.id)));
	await Promise.all(deletePromises);
	console.log(`All documents in ${collectionName} deleted successfully.`);
	return true;
};

const clearApplicantsApplications = async (conn: Firestore = testDB) => {
	const querySnapshot = await getDocs(collection(conn, collections.applicants));
	const updatePromises = querySnapshot.docs.map((docSnapshot) => updateDoc(doc(conn, collections.applicants, docSnapshot.id), { applications: [], awards: [] }));
	await Promise.all(updatePromises);
	return true;
};

/**
 * Deletes all documents in specific collections.
 * Use with EXTREME caution.
 */
export const wipeCollections = async (input: WipeCollectionsInput = null) => {
	let targetDB: Firestore = testDB;

	if (input && typeof input === 'object' && 'conn' in input && input.conn) {
		if (input.conn === '(default)') {
			targetDB = prodDB;
		} else if (input.conn === 'ams-test') {
			targetDB = testDB;
		}
	} else if (input && typeof input === 'object' && !('conn' in input)) {
		targetDB = input as Firestore;
	}

	const connLabel = input && typeof input === 'object' && 'conn' in input ? input.conn : 'direct-instance';
	console.log(`Wiping collection using database: ${connLabel}`);

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

export const migrateEmailTemplates = async () => {
	try {
		const { emailTemplates } = await import('../content/emailTemplates');
		for (const [key, templateData] of Object.entries(emailTemplates)) {
			const newRef = doc(db, collections.emailTemplates, key);
			await setDoc(newRef, { ...templateData, key, id: key, isSystem: true });
		}
		return { success: true };
	} catch (error) {
		logEvent('Error migrating email templates', error);
		throw error;
	}
};

export const migrateDeadlinesToCycleYear = async () => {
	const results: {
		applications: number;
		awards: number;
		interviews: number;
		siteConfig: boolean;
		errors: string[];
	} = { applications: 0, awards: 0, interviews: 0, siteConfig: false, errors: [] };
	const parseCycleYear = (val: unknown): number | null => {
		if (typeof val === 'number') return val;
		if (typeof val === 'string') {
			const d = new Date(val);
			return Number.isNaN(d.getTime()) ? null : d.getFullYear();
		}
		if (isFirestoreTimestampLike(val)) return val.toDate().getFullYear();
		return null;
	};
	const parseDeadlineDate = (val: unknown): Date | null => {
		if (val instanceof Date) return val;
		if (typeof val === 'string') {
			const d = new Date(val);
			return Number.isNaN(d.getTime()) ? null : d;
		}
		if (isFirestoreTimestampLike(val)) return val.toDate();
		return null;
	};
	try {
		const appsSnapshot = await getDocs(collection(db, collections.applications));
		const batch = writeBatch(db);
		let count = 0;
		for (const docSnap of appsSnapshot.docs) {
			const data = docSnap.data();
			const update: UpdateData<DocumentData> = {};
			if (data.cycleYear === undefined) {
				const year = parseCycleYear(data.window);
				if (year) update.cycleYear = year;
			}
			if (data.deadline === undefined || typeof data.deadline === 'string') {
				const d = parseDeadlineDate(data.deadline ?? data.window);
				if (d) update.deadline = d;
			}
			if (Object.keys(update).length > 0) {
				batch.update(doc(db, collections.applications, docSnap.id), update);
				results.applications++;
				count++;
			}
		}
		if (count > 0) await batch.commit();
	} catch (e) {
		results.errors.push(`Applications: ${getErrorMessage(e)}`);
	}
	try {
		const config = await getConfigFromDb();
		if (config?.CONFIG_ID && config.CYCLE_YEAR === undefined) {
			const year = parseCycleYear(config.APPLICATION_DEADLINE);
			if (year) {
				await updateDoc(doc(db, collections.siteConfig, String(config.CONFIG_ID)), { CYCLE_YEAR: year });
				results.siteConfig = true;
			}
		}
	} catch (e) {
		results.errors.push(`SiteConfig: ${getErrorMessage(e)}`);
	}
	return results;
};

export const backfillApplicantGradYears = async () => {
	const results: { updated: number; skipped: number; errors: string[] } = { updated: 0, skipped: 0, errors: [] };
	const normalize = (gradYear: unknown): number | null => {
		if (typeof gradYear === 'number' && gradYear >= 1900 && gradYear <= 2100) return gradYear;
		if (typeof gradYear === 'string' && /^\d{4}$/.test(gradYear.trim())) return Number(gradYear.trim());
		if (typeof gradYear === 'string') {
			const d = new Date(gradYear);
			return Number.isNaN(d.getTime()) ? null : d.getFullYear();
		}
		if (gradYear && typeof gradYear === 'object' && 'toDate' in gradYear && typeof (gradYear as { toDate?: unknown }).toDate === 'function') {
			return (gradYear as { toDate: () => Date }).toDate().getFullYear();
		}
		return null;
	};
	try {
		const snap = await getDocs(collection(db, collections.applicants));
		const batch = writeBatch(db);
		let count = 0;
		for (const docSnap of snap.docs) {
			const data = docSnap.data();
			const next = normalize(data.gradYear);
			if (next === null) {
				results.skipped++;
				continue;
			}
			if (data.gradYear === next) {
				results.skipped++;
				continue;
			}
			batch.update(doc(db, collections.applicants, docSnap.id), { gradYear: next });
			results.updated++;
			count++;
		}
		if (count > 0) await batch.commit();
	} catch (e) {
		results.errors.push(String(getErrorMessage(e)));
	}
	return results;
};


export const logEvent = async (actionDescription = '', errorDetails: unknown = null) => {
	// sitelog rules require auth; skip quietly for anonymous visitors
	if (!auth.currentUser) {
		if (errorDetails !== null && process.env.REACT_APP_environment !== 'production') {
			console.error(`Error!\nDescription: ${actionDescription}\nMessage: ${getErrorMessage(errorDetails)}\nError:`, errorDetails);
		}
		return;
	}

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
			console.error(`Error!\nDescription: ${actionDescription}\nMessage: ${getErrorMessage(errorDetails)}\nError:`, errorDetails);
		}
	} catch (error) {
		// Permission / network failures should not spam the console during normal browsing
		if (process.env.REACT_APP_environment !== 'production') {
			console.debug('Error logging user action:', getErrorMessage(error));
		}
	}
};

// --- 5. Configuration Fetchers ---

export const getConfigFromDb = async (): Promise<SiteConfig | null> => {
	try {
		const docRef = doc(db, collections.siteConfig, CONFIG_DOC_ID);
		const docSnap = await getDoc(docRef);
		return docSnap.exists() ? (normalizeSiteConfigDates(docSnap.data() as SiteConfig) as SiteConfig) : null;
	} catch (error) {
		logEvent('Error in getConfigFromDB', error);
		return null;
	}
};

export const getRealTimeConfigFromDb = (callback: RealtimeCallback<SiteConfig | null>) => {
	const docRef = doc(db, collections.siteConfig, CONFIG_DOC_ID);
	const unsubscribe = onSnapshot(docRef, (snapshot) => {
		snapshot.exists()
			? callback(normalizeSiteConfigDates(snapshot.data() as SiteConfig) as SiteConfig)
			: callback(null);
	});
	return unsubscribe;
};

export const updateUserPreferences = async (userId: string, collectionName: CollectionName, preferences: Record<string, unknown>) => {
	if (!userId || !collectionName) return;

	try {
		const userRef = doc(db, collectionName, userId);
		const updateData: UpdateData<DocumentData> = {};
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
export const getDocumentsByIDs = async (collectionName: CollectionName, ids: string[]) => {
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

const searchSingleCollection = async (collectionInfo: SearchCollectionInfo, termsArray: string[], uniqueResults: Map<string, DocumentData & { id: string; collection: string }>) => {
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

export const searchCollections = async (termsArray: string[]) => {
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

export const getApplicant = async (userID: string) => {
	try {
		const docRef = doc(db, collections.applicants, userID);
		const docSnap = await getDoc(docRef);
		return docSnap.exists() ? docSnap.data() : null;
	} catch (error) {
		logEvent('Error in getApplicant', error);
		return null;
	}
};

export const getMember = async (userID: string) => {
	try {
		const docRef = doc(db, collections.members, userID);
		const docSnap = await getDoc(docRef);
		return docSnap.exists() ? docSnap.data() : null;
	} catch (error) {
		logEvent('Error in getMember', error);
		return null;
	}
};

export const saveApplicantData = async (userID: string, data: Record<string, unknown>) => {
	try {
		const newRef = doc(db, collections.applicants, userID);
		await setDoc(newRef, data, { merge: true });
		return true;
	} catch (error) {
		logEvent('Error in saveApplicantData', error);
		return false;
	}
};

export const updateApplicantData = async (userID: string, data: Record<string, unknown>) => {
	try {
		const newRef = doc(db, collections.applicants, userID);
		await updateDoc(newRef, data as UpdateData<DocumentData>);
		return true;
	} catch (error) {
		logEvent('Error in updateApplicantData', error);
		return false;
	}
};

export const addApplicationToApplicant = async (userID: string, applicationID: string) => {
	try {
		const applicantRef = doc(db, collections.applicants, userID);
		await updateDoc(applicantRef, { applications: arrayUnion(applicationID) });
		return true;
	} catch (error) {
		logEvent('Error in addApplicationToApplicant', error);
		return false;
	}
};

export const removeApplicationFromApplicant = async (userId: string, applicationId: string) => {
	try {
		const applicantRef = doc(db, collections.applicants, userId);
		await updateDoc(applicantRef, { applications: arrayRemove(applicationId) });
		return true;
	} catch (error) {
		logEvent('Error in removingApplicationFromApplicant', error);
		return false;
	}
};

export const getAuthUserByEmail = async (email: string) => {
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

export const findApplicantAccountsByEmail = async (email: string, excludeId?: string) => {
	const normalized = email.trim().toLowerCase();
	if (!normalized) return [];

	const queries =
		normalized === email.trim()
			? [query(collection(db, collections.applicants), where('email', '==', normalized))]
			: [
					query(collection(db, collections.applicants), where('email', '==', normalized)),
					query(collection(db, collections.applicants), where('email', '==', email.trim())),
				];

	const matches = new Map<string, DocumentData & { id: string }>();
	for (const q of queries) {
		const snapshot = await getDocs(q);
		for (const docSnap of snapshot.docs) {
			if (excludeId && docSnap.id === excludeId) continue;
			matches.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
		}
	}

	return [...matches.values()];
};

/**
 * Fetches both member and applicant profiles for a given user ID.
 * @param {string} uid - The user's ID.
 * @returns {object} An object containing member and applicant data if they exist.
 */
export const getUserProfiles = async (uid: string) => {
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

export const registerUser = async (email: string, password: string) => {
	try {
		const user = await createUserWithEmailAndPassword(auth, email, password);
		return user;
	} catch (error) {
		logEvent('Error in registerUser', error);
		throw error;
	}
};

export const loginUser = async (email: string, password: string) => {
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

export const getApplicationsForApplicant = async (
	applicantId: string,
	statuses: ApplicationStatusValue[] | null = [ApplicationStatus.eligible, ApplicationStatus.completed],
) => {
	const appsRef = collection(db, collections.applications);
	const q =
		statuses === null
			? query(appsRef, where('completedBy', '==', applicantId))
			: query(appsRef, where('completedBy', '==', applicantId), where('status', 'in', statuses));
	const snapshot = await getDocs(q);
	return snapshot.docs
		.map((doc) => ({ id: doc.id, ...doc.data() }))
		.filter((app) => (app as DocumentData).status !== ApplicationStatus.deleted);
};

// --- 8. Applications (CRUD & Status) ---

export const saveCollectionData = async (collectionName: CollectionName, dataID: string, data: Record<string, unknown>) => {
	try {
		const newRef = doc(db, collectionName, dataID);
		await setDoc(newRef, data, { merge: true });
		return true;
	} catch (error) {
		logEvent('saveCollectionData error', error);
		return false;
	}
};

export const updateCollectionData = async (collectionName: CollectionName, dataID: string, data: Record<string, unknown>) => {
	try {
		const newRef = doc(db, collectionName, dataID);
		await updateDoc(newRef, data as UpdateData<DocumentData>);
		return true;
	} catch (error) {
		logEvent('updateCollectionData error', error);
		return false;
	}
};

export const updateApplicationStatus = async (userID: string, applicationID: string, newStatus: string) => {
	try {
		await updateCollectionData(collections.applications, applicationID, { status: newStatus });
		return true;
	} catch (error) {
		logEvent('Error updating application status:', error);
		return false;
	}
};

export const getApplication = async (userID: string, applicationID: string) => {
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

export const getCollection = async (collectionName: CollectionName) => {
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

export const getCollectionData = async (userID: string, collectionName: CollectionName, dataID: string) => {
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

export const deleteApplication = async (application: { id: string }) => {
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

export const updateSubmissionStatus = async (submissionID: string, status: string) => {
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

const processSnapshotForBatchDelete = (snapshot: QuerySnapshot<DocumentData>, collectionName: CollectionName, batch: WriteBatch, result: BatchDeleteResult) => {
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
				const attachment = value as AttachmentRef;
				if (attachment && typeof attachment === 'object' && attachment.refLoc) {
					result.filePromises.push(deleteFile(attachment.refLoc));
				}
			}
		}
	}
};

const batchDeleteOwnedDocuments = async (userId: string, batch: WriteBatch) => {
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

const batchDeleteRelatedRequests = async (applicationIds: string[], batch: WriteBatch) => {
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

export const purgeUserRecords = async ({ userId, expel = false }: PurgeUserRecordsParams) => {
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

const getOrderBy = (orderByConfig: string | string[] | [string, string] | [string, string][] | null | undefined) => {
	if (!orderByConfig || !Array.isArray(orderByConfig) || orderByConfig.length === 0) {
		return [];
	}
	if (Array.isArray(orderByConfig[0])) {
		return (orderByConfig as [string, string][]).map((config) => orderBy(config[0], config[1] as 'asc' | 'desc'));
	}
	const single = orderByConfig as [string, string];
	return [orderBy(single[0], single[1] as 'asc' | 'desc')];
};

/**
 * Fetches the legacy finances collection and maps the doc ID (year) to 'id'.
 */
export const getRealTimeLegacyFinances = (handler: RealtimeCallback<DocumentData[]>, { collection: collectionName, orderBy: orderByConfig }: { collection: CollectionName; orderBy?: string | string[] | [string, string][] }) => {
	if (typeof collectionName !== 'string' || collectionName.length === 0) {
		console.error('getRealTimeLegacyFinances error: collectionName is not a valid string.', collectionName);
		handler([]);
		return () => {};
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
		return () => {};
	}
};

export const getRealTimeCollection = (collectionRef: CollectionName, callback: RealtimeCallback<DocumentData[]>) => {
	const unsubscribe = onSnapshot(collection(db, collectionRef), (snapshot) => {
		const fetchedData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		callback(fetchedData);
	});

	return unsubscribe;
};


/** Coerce a cycle year number, "2026", or deadline/window date (string|Date|Timestamp) to a year. */
export const coerceCycleYear = (windowOrYear: unknown): number | null => {
	if (typeof windowOrYear === 'number' && Number.isFinite(windowOrYear)) return windowOrYear;
	if (typeof windowOrYear === 'string' && /^\d{4}$/.test(windowOrYear.trim())) {
		return Number(windowOrYear.trim());
	}
	const dated = toJsDate(windowOrYear);
	if (dated) return dated.getFullYear();
	return null;
};

export const resolveApplicationCycleYear = (app: DocumentData): number | null => {
	if (typeof app?.cycleYear === 'number' && !Number.isNaN(app.cycleYear)) return app.cycleYear;
	if (typeof app?.cycleYear === 'string' && /^\d{4}$/.test(app.cycleYear.trim())) {
		return Number(app.cycleYear.trim());
	}
	if (app?.window) {
		return coerceCycleYear(app.window);
	}
	return null;
};

export const resolveInterviewCycleYear = (interview: DocumentData): number | null => {
	if (typeof interview?.cycleYear === 'number' && !Number.isNaN(interview.cycleYear)) return interview.cycleYear;
	if (typeof interview?.cycleYear === 'string' && /^\d{4}$/.test(interview.cycleYear.trim())) {
		return Number(interview.cycleYear.trim());
	}
	const deadline = interview?.deadline ?? interview?.window;
	if (deadline) {
		return coerceCycleYear(deadline);
	}
	return null;
};

export const siteConfigCycleYear = (config: SiteConfig | null): number => {
	if (typeof config?.CYCLE_YEAR === 'number' && Number.isFinite(config.CYCLE_YEAR)) return config.CYCLE_YEAR;
	if (typeof config?.CYCLE_YEAR === 'string' && /^\d{4}$/.test(String(config.CYCLE_YEAR).trim())) {
		return Number(String(config.CYCLE_YEAR).trim());
	}
	const deadline = toJsDate(config?.APPLICATION_DEADLINE);
	return deadline ? deadline.getFullYear() : new Date().getFullYear();
};

const COUNT_PIPELINE_STATUSES = new Set<string>([
	ApplicationStatus.completed,
	ApplicationStatus.eligible,
	ApplicationStatus.invited,
	ApplicationStatus.deferred,
	ApplicationStatus.awarded,
	ApplicationStatus.denied,
]);

export const getPastApplicationsCountByWindow = async (windowOrYear: unknown) => {
	try {
		const year = coerceCycleYear(windowOrYear);
		if (year === null) return 0;
		const snapshot = await getDocs(collection(db, collections.applications));
		return snapshot.docs.reduce((acc, docSnap) => {
			const data = docSnap.data();
			if (resolveApplicationCycleYear(data) !== year) return acc;
			return COUNT_PIPELINE_STATUSES.has(String(data.status ?? '')) ? acc + 1 : acc;
		}, 0);
	} catch (error) {
		logEvent('Error in getPastApplicationsCountByWindow', error);
		return null;
	}
};

export const getCurrentApplicationCount = async () => {
	try {
		const config = await getConfigFromDb();
		const year = siteConfigCycleYear(config);
		const snapshot = await getDocs(collection(db, collections.applications));
		return snapshot.docs.reduce((acc, docSnap) => (resolveApplicationCycleYear(docSnap.data()) === year ? acc + 1 : acc), 0);
	} catch (error) {
		logEvent('Error in getCurrentApplicationCount', error);
		return null;
	}
};

export const getRealTimeCurrentApplicationCount = async (callback: RealtimeCallback<number>) => {
	try {
		const config = await getConfigFromDb();
		const year = siteConfigCycleYear(config);
		return onSnapshot(collection(db, collections.applications), (snapshot) => {
			const count = snapshot.docs.reduce((acc, docSnap) => (resolveApplicationCycleYear(docSnap.data()) === year ? acc + 1 : acc), 0);
			callback(count);
		});
	} catch (error) {
		logEvent('getRealTimeCurrentApplicationCount error', error);
		return null;
	}
};

export const getCurrentlyEligibleApplicationsCount = async () => {
	try {
		const config = await getConfigFromDb();
		const year = siteConfigCycleYear(config);
		const snapshot = await getDocs(collection(db, collections.applications));
		return snapshot.docs.reduce((acc, docSnap) => {
			const data = docSnap.data();
			if (resolveApplicationCycleYear(data) !== year) return acc;
			return COUNT_PIPELINE_STATUSES.has(String(data.status ?? '')) ? acc + 1 : acc;
		}, 0);
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

export const getRealTimeMostRecentApplicationIDs = (callback: RealtimeCallback<string[]>, limitCount = 10) => {
	const coll = collection(db, collections.applications);
	const q = query(coll, where('status', '!=', ApplicationStatus.deleted), orderBy('submittedOn', 'desc'), limit(limitCount));
	const unsubscribe = onSnapshot(q, (snapshot) => {
		const recentApplicationIDs = snapshot.docs.map((doc) => doc.id);
		callback(recentApplicationIDs);
	});
	return unsubscribe;
};

export const getApplicationsByYear = async () => {
	const config = await getConfigFromDb();
	const currentYear = siteConfigCycleYear(config);
	const excludedStatuses = new Set<string>([ApplicationStatus.deleted, ApplicationStatus.ineligible, ApplicationStatus.deferred]);
	const groupedData: Record<number, number> = {};
	for (let year = currentYear - 3; year <= currentYear; year++) groupedData[year] = 0;

	try {
		const snapshot = await getDocs(query(collection(db, collections.applications)));
		for (const docSnap of snapshot.docs) {
			const data = docSnap.data();
			if (excludedStatuses.has(String(data.status))) continue;
			const year = resolveApplicationCycleYear(data);
			if (year === null || year < currentYear - 3 || year > currentYear) continue;
			groupedData[year]++;
		}
	} catch (error) {
		logEvent('Error in getApplicationsByYear', error);
	}

	return Object.keys(groupedData)
		.sort((a, b) => Number(a) - Number(b))
		.map((year) => ({ name: year, count: groupedData[Number(year)] }));
};

export const getCurrentlyEligibleApplicationsCountByType = async (type: ApplicationTypeValue | ApplicationStatusValue) => {
	try {
		const config = await getConfigFromDb();
		const year = siteConfigCycleYear(config);
		const q = query(collection(db, collections.applications), where('type', '==', type));
		const snapshot = await getDocs(q);
		return snapshot.docs.reduce((acc, docSnap) => {
			const data = docSnap.data();
			if (resolveApplicationCycleYear(data) !== year) return acc;
			return COUNT_PIPELINE_STATUSES.has(String(data.status ?? '')) ? acc + 1 : acc;
		}, 0);
	} catch (error) {
		logEvent('getCurrentlyEligibleApplicationsCountByType error', error);
		return null;
	}
};

export const getRealTimeCurrentEligibleApplicationsCountByType = async (type: ApplicationTypeValue | ApplicationStatusValue, callback: RealtimeCallback<number>) => {
	try {
		const config = await getConfigFromDb();
		const year = siteConfigCycleYear(config);
		const coll = collection(db, collections.applications);

		let q;
		if (Object.values(ApplicationType).includes(type as ApplicationTypeValue)) {
			q = query(coll, where('type', '==', type));
		} else if ((Object.values(ApplicationStatus) as string[]).includes(type)) {
			q = query(coll, where('status', '==', type));
		} else {
			throw new Error(`Invalid type passed to getRealTimeCurrentEligibleApplicationsCountByType: ${type}`);
		}

		return onSnapshot(q, (snapshot) => {
			const count = snapshot.docs.reduce((acc, docSnap) => {
				const data = docSnap.data();
				if (resolveApplicationCycleYear(data) !== year) return acc;
				if ((Object.values(ApplicationStatus) as string[]).includes(type)) return acc + 1;
				return COUNT_PIPELINE_STATUSES.has(String(data.status ?? '')) ? acc + 1 : acc;
			}, 0);
			callback(count);
		});
	} catch (error) {
		logEvent('Error in getRealTimeCurrentEligibleApplicationsCountByType', error);
		return null;
	}
};

export const getEligibleApplicationsCountByTypeAndWindow = async (type: ApplicationTypeValue, windowOrYear: unknown) => {
	try {
		const year = coerceCycleYear(windowOrYear);
		if (year === null) return 0;
		const q = query(collection(db, collections.applications), where('type', '==', type));
		const snapshot = await getDocs(q);
		return snapshot.docs.reduce((acc, docSnap) => {
			const data = docSnap.data();
			if (resolveApplicationCycleYear(data) !== year) return acc;
			return COUNT_PIPELINE_STATUSES.has(String(data.status ?? '')) ? acc + 1 : acc;
		}, 0);
	} catch (error) {
		logEvent('Error in getEligibleApplicationsCountByTypeAndWindow', error);
		return null;
	}
};

export const getRealTimeApplicationCountByStatus = (status: ApplicationStatusValue, callback: RealtimeCallback<number>) => {
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

export const getRealTimeEligibleApplicationsCountByTypeAndWindow = (type: ApplicationTypeValue | ApplicationStatusValue, windowOrYear: unknown, callback: RealtimeCallback<number>) => {
	try {
		const year = coerceCycleYear(windowOrYear);
		const coll = collection(db, collections.applications);

		let q;
		if (Object.values(ApplicationType).includes(type as ApplicationTypeValue)) {
			q = query(coll, where('type', '==', type));
		} else if ((Object.values(ApplicationStatus) as string[]).includes(type)) {
			q = query(coll, where('status', '==', type));
		} else {
			throw new Error(`Invalid type passed to getRealTimeEligibleApplicationsCountByTypeAndWindow: ${type}`);
		}

		return onSnapshot(q, (snapshot) => {
			const count = snapshot.docs.reduce((acc, docSnap) => {
				const data = docSnap.data();
				if (year !== null && resolveApplicationCycleYear(data) !== year) return acc;
				if ((Object.values(ApplicationStatus) as string[]).includes(type)) return acc + 1;
				return COUNT_PIPELINE_STATUSES.has(String(data.status ?? '')) ? acc + 1 : acc;
			}, 0);
			callback(count);
		});
	} catch (error) {
		logEvent('Error in getRealTimeEligibleApplicationsCountByTypeAndWindow', error);
		return null;
	}
};


// --- Cycle year + last-touched sorting (PF parity) ---

const firestoreValueToDate = (value: unknown): Date => {
	if (!value) return new Date(NaN);
	if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
		return (value as { toDate: () => Date }).toDate();
	}
	if (typeof value === 'object' && value !== null && 'seconds' in value && typeof (value as { seconds?: unknown }).seconds === 'number') {
		return new Date((value as { seconds: number }).seconds * 1000);
	}
	return new Date(value as string | number | Date);
};

const applicationActivityTime = (app: DocumentData): number => {
	for (const key of ['lastUpdated', 'submittedOn', 'dated']) {
		const value = app?.[key];
		if (value === null || value === undefined || value === '') continue;
		const time = firestoreValueToDate(value).getTime();
		if (!Number.isNaN(time)) return time;
	}
	return 0;
};

const sortApplicationsByLastTouched = <T extends DocumentData>(apps: T[]): T[] =>
	[...apps].sort((a, b) => applicationActivityTime(b) - applicationActivityTime(a));


const PRESENCE_ACTIVE_WINDOW_MS = 2 * 60 * 1000;
const PRESENCE_QUERY_REFRESH_MS = 30 * 1000;
const PRESENCE_DOC_TTL_MS = 10 * 60 * 1000;

export const touchUserPresence = async ({ uid, role, displayName }: { uid: string; role: string; displayName: string }) => {
	if (!uid) return;
	const expiresAt = new Date(Date.now() + PRESENCE_DOC_TTL_MS);
	await setDoc(
		doc(db, collections.presence, uid),
		{
			uid,
			role,
			displayName,
			status: 'online',
			lastSeen: serverTimestamp(),
			expiresAt: Timestamp.fromDate(expiresAt),
		},
		{ merge: true }
	);
};

export const clearUserPresence = async (uid: string) => {
	if (!uid) return;
	await setDoc(doc(db, collections.presence, uid), { status: 'offline' }, { merge: true });
};

export const subscribeUserLastSeen = (uid: string, callback: RealtimeCallback<Date | null>) => {
	if (!uid) {
		callback(null);
		return () => {};
	}
	const ref = doc(db, collections.presence, uid);
	return onSnapshot(
		ref,
		(snap) => {
			if (!snap.exists()) {
				callback(null);
				return;
			}
			const lastSeen = snap.data().lastSeen;
			callback(lastSeen ? firestoreValueToDate(lastSeen) : null);
		},
		() => callback(null)
	);
};

export const getRealTimeActiveAuthenticatedUsersCount = (callback: RealtimeCallback<number>) => {
	let unsubscribe: Unsubscribe | null = null;
	let refreshTimer: ReturnType<typeof setInterval> | null = null;

	const subscribe = () => {
		try {
			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}
			const cutoff = Timestamp.fromDate(new Date(Date.now() - PRESENCE_ACTIVE_WINDOW_MS));
			const q = query(collection(db, collections.presence), where('lastSeen', '>', cutoff));
			unsubscribe = onSnapshot(
				q,
				(snapshot) => {
					const count = snapshot.docs.filter((docSnap) => docSnap.data().status === 'online').length;
					callback(count);
				},
				(error) => {
					logEvent('Error in getRealTimeActiveAuthenticatedUsersCount snapshot', error);
				}
			);
		} catch (error) {
			logEvent('Error in getRealTimeActiveAuthenticatedUsersCount', error);
		}
	};

	subscribe();
	refreshTimer = setInterval(subscribe, PRESENCE_QUERY_REFRESH_MS);
	return () => {
		if (unsubscribe) unsubscribe();
		if (refreshTimer) clearInterval(refreshTimer);
	};
};


const requestStatusRank = (request: DocumentData): number => {
	if (request?.completed) return 2;
	if (request?.attempts >= 5) return 1;
	return 0;
};

const sortReferenceRequests = (requests: DocumentData[]): DocumentData[] =>
	[...requests].sort((a, b) => {
		const statusDiff = requestStatusRank(a) - requestStatusRank(b);
		if (statusDiff !== 0) return statusDiff;
		return String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' });
	});

export const getRealTimeRequestsForCycleYear = (cycleYear: number, callback: RealtimeCallback<DocumentData[]>) => {
	let requests: DocumentData[] = [];
	let appsById = new Map<string, DocumentData>();

	const publish = () => {
		const filtered = requests.filter((request) => {
			const applicationId = String(request.applicationID ?? '');
			if (!applicationId) return false;
			const application = appsById.get(applicationId);
			if (!application) return false;
			return resolveApplicationCycleYear(application) === cycleYear;
		});
		callback(sortReferenceRequests(filtered));
	};

	const unsubRequests = onSnapshot(
		collection(db, collections.requests),
		(snapshot) => {
			requests = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
			publish();
		},
		(error) => {
			logEvent('getRealTimeRequestsForCycleYear requests error', error);
			callback([]);
		}
	);

	const unsubApps = onSnapshot(
		collection(db, collections.applications),
		(snapshot) => {
			appsById = new Map(snapshot.docs.map((docSnap) => [docSnap.id, docSnap.data()]));
			publish();
		},
		(error) => {
			logEvent('getRealTimeRequestsForCycleYear applications error', error);
		}
	);

	return () => {
		unsubRequests();
		unsubApps();
	};
};

const PIPELINE_STATUSES: ApplicationStatusValue[] = [
	ApplicationStatus.completed,
	ApplicationStatus.eligible,
	ApplicationStatus.invited,
	ApplicationStatus.deferred,
	ApplicationStatus.awarded,
	ApplicationStatus.denied,
];

const NEGATABLE_STATUSES = new Set<string>([
	ApplicationStatus.deleted,
	ApplicationStatus.ineligible,
	ApplicationStatus.deferred,
]);

const MAX_UNDERGRAD_AWARD_CYCLES = 4;

const SUBMITTED_OR_BEYOND_STATUSES = new Set<string>([
	ApplicationStatus.submitted,
	ApplicationStatus.completed,
	ApplicationStatus.eligible,
	ApplicationStatus.invited,
	ApplicationStatus.deferred,
	ApplicationStatus.awarded,
	ApplicationStatus.denied,
]);

const OUTLOOK_PIPELINE_SECTIONS: {
	id: OutlookSectionId;
	title: string;
	pathKey: 'applicants' | 'newAppsInYear' | 'returningAppsInYear' | 'scholarshipAppsInYear';
	expectedType: ApplicationTypeValue | null;
}[] = [
	{ id: 'brandNewAccounts', title: 'Brand New Accounts', pathKey: 'applicants', expectedType: null },
	{ id: 'expectedNewApplications', title: 'Expected New Applicant Applications', pathKey: 'newAppsInYear', expectedType: ApplicationType.newApplication },
	{ id: 'expectedReturningGrants', title: 'Expected Returning Grants', pathKey: 'returningAppsInYear', expectedType: ApplicationType.returningGrant },
	{ id: 'expectedReturningScholarships', title: 'Expected Returning Scholarships', pathKey: 'scholarshipAppsInYear', expectedType: ApplicationType.scholarship },
	{ id: 'lostInTheWeeds', title: 'Lost in the Weeds', pathKey: 'applicants', expectedType: ApplicationType.newApplication },
];

const emptyTypeCounts = (): Record<ApplicationTypeValue, number> => ({
	[ApplicationType.newApplication]: 0,
	[ApplicationType.returningGrant]: 0,
	[ApplicationType.scholarship]: 0,
});

const emptyAwardTrend = (year: number): AwardTrendYear => ({ year, New: 0, Returning: 0, Scholarship: 0 });

const incrementAwardTrend = (trends: Record<number, AwardTrendYear>, year: number, type: unknown) => {
	if (!trends[year]) trends[year] = emptyAwardTrend(year);
	if (type === ApplicationType.newApplication) trends[year].New++;
	else if (type === ApplicationType.returningGrant) trends[year].Returning++;
	else if (type === ApplicationType.scholarship) trends[year].Scholarship++;
};

const normalizeGradYear = (gradYear: unknown): number | null => {
	if (gradYear === null || gradYear === undefined) return null;
	if (typeof gradYear === 'number' && !Number.isNaN(gradYear)) {
		return gradYear >= 1900 && gradYear <= 2100 ? gradYear : null;
	}
	if (typeof gradYear === 'string') {
		const trimmed = gradYear.trim();
		if (/^\d{4}$/.test(trimmed)) return Number(trimmed);
		const parsed = new Date(trimmed);
		if (!Number.isNaN(parsed.getTime())) return parsed.getFullYear();
	}
	if (typeof gradYear === 'object' && gradYear !== null) {
		if ('toDate' in gradYear && typeof (gradYear as { toDate?: unknown }).toDate === 'function') {
			return (gradYear as { toDate: () => Date }).toDate().getFullYear();
		}
		if ('seconds' in gradYear && typeof (gradYear as { seconds?: unknown }).seconds === 'number') {
			return new Date((gradYear as { seconds: number }).seconds * 1000).getFullYear();
		}
	}
	return null;
};

const parseGradYear = (gradYear: unknown): number | null => normalizeGradYear(gradYear);

const applicantHasNotGraduated = (gradYear: unknown, cycleYear: number): boolean => {
	const parsed = parseGradYear(gradYear);
	if (parsed === null) return true;
	return parsed >= cycleYear;
};

export const getRealTimeCurrentNonNegatedApplicationsCountByType = async (type: ApplicationTypeValue, callback: RealtimeCallback<number>) => {
	try {
		const config = await getConfigFromDb();
		const year = siteConfigCycleYear(config);
		const q = query(collection(db, collections.applications), where('type', '==', type));
		return onSnapshot(q, (snapshot) => {
			const count = snapshot.docs.reduce((acc, d) => {
				const data = d.data();
				if (resolveApplicationCycleYear(data) !== year) return acc;
				return NEGATABLE_STATUSES.has(String(data.status ?? '')) ? acc : acc + 1;
			}, 0);
			callback(count);
		});
	} catch (error) {
		logEvent('Error in getRealTimeCurrentNonNegatedApplicationsCountByType', error);
		return null;
	}
};

export const getRealTimeNonNegatedApplicationsCountByTypeAndCycleYear = (type: ApplicationTypeValue, cycleYear: number, callback: RealtimeCallback<number>) => {
	try {
		const q = query(collection(db, collections.applications), where('type', '==', type));
		return onSnapshot(q, (snapshot) => {
			const count = snapshot.docs.reduce((acc, d) => {
				const data = d.data();
				if (resolveApplicationCycleYear(data) !== cycleYear) return acc;
				return NEGATABLE_STATUSES.has(String(data.status ?? '')) ? acc : acc + 1;
			}, 0);
			callback(count);
		});
	} catch (error) {
		logEvent('Error in getRealTimeNonNegatedApplicationsCountByTypeAndCycleYear', error);
		return null;
	}
};

export const getRealTimeCurrentNonNegatedApplicationsCountByStatus = async (status: ApplicationStatusValue, callback: RealtimeCallback<number>) => {
	try {
		const config = await getConfigFromDb();
		const year = siteConfigCycleYear(config);
		const q = query(collection(db, collections.applications), where('status', '==', status));
		return onSnapshot(q, (snapshot) => {
			const count = snapshot.docs.reduce((acc, d) => (resolveApplicationCycleYear(d.data()) === year ? acc + 1 : acc), 0);
			callback(count);
		});
	} catch (error) {
		logEvent('Error in getRealTimeCurrentNonNegatedApplicationsCountByStatus', error);
		return null;
	}
};

export const getRealTimeCurrentApplicationCountByStatus = async (status: ApplicationStatusValue, callback: RealtimeCallback<number>) => {
	try {
		const config = await getConfigFromDb();
		const year = siteConfigCycleYear(config);
		const q = query(collection(db, collections.applications), where('status', '==', status));
		return onSnapshot(q, (snapshot) => {
			const count = snapshot.docs.reduce((acc, d) => (resolveApplicationCycleYear(d.data()) === year ? acc + 1 : acc), 0);
			callback(count);
		});
	} catch (error) {
		logEvent('Error in getRealTimeCurrentApplicationCountByStatus', error);
		return null;
	}
};

export const getRealTimeCurrentRejectedApplicationsCount = async (callback: RealtimeCallback<number>) => {
	try {
		const config = await getConfigFromDb();
		const year = siteConfigCycleYear(config);
		const q = query(
			collection(db, collections.applications),
			or(where('status', '==', ApplicationStatus.denied), where('status', '==', ApplicationStatus.deferred), where('status', '==', ApplicationStatus.ineligible))
		);
		return onSnapshot(q, (snapshot) => {
			const count = snapshot.docs.reduce((acc, d) => (resolveApplicationCycleYear(d.data()) === year ? acc + 1 : acc), 0);
			callback(count);
		});
	} catch (error) {
		logEvent('Error in getRealTimeCurrentRejectedApplicationsCount', error);
		return null;
	}
};


const filterApplicationsForCycleYear = (apps: DocumentData[], cycleYear: number, includeDeleted: boolean): DocumentData[] =>
	apps.filter((app) => {
		if (!includeDeleted && app.status === ApplicationStatus.deleted) return false;
		return resolveApplicationCycleYear(app) === cycleYear;
	});

export const getRealTimeApplications = (includeDeleted: boolean, callback: RealtimeCallback<DocumentData[]>) => {
	try {
		const coll = collection(db, collections.applications);
		const q = includeDeleted ? coll : query(coll, where('status', '!=', ApplicationStatus.deleted));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const fetchedData = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
			callback(sortApplicationsByLastTouched(fetchedData));
		});

		return unsubscribe;
	} catch (error) {
		logEvent('Error in getRealTimeApplications:', error);
		return null;
	}
};

export const getRealTimeRejectedApplications = (callback: RealtimeCallback<DocumentData[]>, cycleYear: number | null = null) => {
	try {
		const coll = collection(db, collections.applications);

		const q = query(coll, or(where('status', '==', ApplicationStatus.denied), where('status', '==', ApplicationStatus.deferred), where('status', '==', ApplicationStatus.ineligible)));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			let fetchedData = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
			if (cycleYear !== null && cycleYear !== undefined) {
				fetchedData = fetchedData.filter((app) => resolveApplicationCycleYear(app) === cycleYear);
			}
			callback(sortApplicationsByLastTouched(fetchedData));
		});

		return unsubscribe;
	} catch (error) {
		logEvent('Error in getRealTimeRejectedApplications:', error);
		return null;
	}
};

export const getApplicationsByWindow = async (windowOrYear: unknown) => {
	try {
		const year = coerceCycleYear(windowOrYear);
		const snapshot = await getDocs(collection(db, collections.applications));
		return snapshot.docs
			.map((docSnap) => docSnap.data())
			.filter((app) => year === null || resolveApplicationCycleYear(app) === year);
	} catch (error) {
		logEvent('getApplicationsByWindow error', error);
		return null;
	}
};

export const getRealTimeApplicationsByWindow = (cycleYear: number, includeDeleted: boolean, callback: RealtimeCallback<DocumentData[]>) => {
	const appsRef = collection(db, collections.applications);
	const unsubscribe = onSnapshot(
		appsRef,
		(snapshot) => {
			const fetchedData = filterApplicationsForCycleYear(
				snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
				cycleYear,
				includeDeleted
			);
			callback(sortApplicationsByLastTouched(fetchedData));
		},
		(error) => {
			logEvent('getRealTimeApplicationsByWindow error', error);
			callback([]);
		}
	);

	return unsubscribe;
};

export const getApplicationsByType = async (type: ApplicationTypeValue, windowOrYear: unknown) => {
	try {
		const year = coerceCycleYear(windowOrYear);
		const q = query(collection(db, collections.applications), where('type', '==', type));
		const querySnapshot = await getDocs(q);
		return querySnapshot.docs
			.map((docSnap) => docSnap.data())
			.filter((app) => year === null || resolveApplicationCycleYear(app) === year);
	} catch (error) {
		logEvent('getApplicationsByType error', error);
		return null;
	}
};

export const getRealTimeApplicationsByType = (type: ApplicationTypeValue, cycleYear: number, includeDeleted: boolean, callback: RealtimeCallback<DocumentData[]>) => {
	const typeQuery = query(collection(db, collections.applications), where('type', '==', type));
	const unsubscribe = onSnapshot(
		typeQuery,
		(snapshot) => {
			const fetchedData = filterApplicationsForCycleYear(
				snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
				cycleYear,
				includeDeleted
			);
			callback(sortApplicationsByLastTouched(fetchedData));
		},
		(error) => {
			logEvent('getRealTimeApplicationsByType error', error);
			callback([]);
		}
	);

	return unsubscribe;
};

export const getRealTimeApplicantsByApplicationID = (applicantIDs: string[], callback: RealtimeCallback<DocumentData[]>) => {
	if (Array.isArray(applicantIDs) && applicantIDs.length > 0) {
		const matches: Record<string, DocumentData> = {};
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

export const getApplicationsByStatus = async (status: ApplicationStatusValue, windowOrYear: unknown) => {
	try {
		const year = coerceCycleYear(windowOrYear);
		const q = query(collection(db, collections.applications), where('status', '==', status));
		const querySnapshot = await getDocs(q);
		return querySnapshot.docs
			.map((docSnap) => docSnap.data())
			.filter((app) => year === null || resolveApplicationCycleYear(app) === year);
	} catch (error) {
		logEvent('getApplicationsByStatus error', error);
		return null;
	}
};

export const getRealTimeApplicationsByStatus = (type: ApplicationStatusValue, callback: RealtimeCallback<DocumentData[]>, cycleYear: number | null = null) => {
	const statusQuery = query(collection(db, collections.applications), where('status', '==', type));
	const unsubscribe = onSnapshot(statusQuery, (snapshot) => {
		let fetchedData = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
		if (cycleYear !== null && cycleYear !== undefined) {
			fetchedData = fetchedData.filter((app) => resolveApplicationCycleYear(app) === cycleYear);
		}
		callback(sortApplicationsByLastTouched(fetchedData));
	});
	return unsubscribe;
};

export const getRealTimeDocument = (type: CollectionName, id: string, callback: RealtimeCallback<DocumentData | null>) => {
	if (type && id && callback) {
		const docRef = doc(db, type, id);
		const unsubscribe = onSnapshot(
			docRef,
			(snapshot) => {
				snapshot.exists() ? callback(snapshot.data()) : callback(null);
			},
			(error) => {
				// Permission / network failures must not leave Auth/RouteGuard waiting forever
				console.error(`getRealTimeDocument(${type}/${id}):`, error?.message || error);
				callback(null);
			}
		);

		return unsubscribe;
	}
};

export const getRealTimeApplicationsByIDs = (applicationIDs: string[], callback: RealtimeCallback<DocumentData[]>) => {
	if (!Array.isArray(applicationIDs) || applicationIDs.length === 0) {
		callback([]);
		return () => {};
	}

	const matches: Record<string, DocumentData> = {};
	const unsubscribeFunctions = applicationIDs.map((id) => {
		const docRef = doc(db, collections.applications, id);

		return onSnapshot(
			docRef,
			(snapshot) => {
				const data = snapshot.data();

				if (snapshot.exists() && data && data.status !== ApplicationStatus.deleted) {
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

export const getRealTimeAwardsByIDs = (awardIDs: string[], callback: RealtimeCallback<DocumentData[]>) => {
	if (!Array.isArray(awardIDs) || awardIDs.length === 0) {
		throw new TypeError('awardIDs must be a non-empty array');
	}

	const matches: Record<string, DocumentData> = {};
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

export const getAwardsData = async (userID: string, awardIDs: string[]) => {
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

export const getApplicationsByIDs = async (applicationIDs: string[]) => {
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

const applicantDisplayName = (applicant: DocumentData | undefined, applicantId: string): string => {
	if (!applicant) return applicantId;
	const first = String(applicant.firstName ?? '').trim();
	const last = String(applicant.lastName ?? '').trim();
	const name = `${first} ${last}`.trim();
	return name || String(applicant.email ?? applicantId);
};

const applicantAccountCycleYear = (applicant: DocumentData | undefined): number | null => {
	const created = applicant?.accountCreated;
	if (created && typeof created === 'object' && typeof created.seconds === 'number') {
		return new Date(created.seconds * 1000).getFullYear();
	}
	if (created && typeof created?.toDate === 'function') return created.toDate().getFullYear();
	if (created instanceof Date) return created.getFullYear();
	return null;
};

const appsForApplicant = (applicantId: string, apps: DocumentData[]) => apps.filter((app) => String(app.completedBy ?? '') === applicantId);

const hasApplicationBeforeCycle = (applicantId: string, cycleYear: number, apps: DocumentData[]): boolean =>
	appsForApplicant(applicantId, apps).some((app) => {
		const year = resolveApplicationCycleYear(app);
		return year !== null && year < cycleYear;
	});

const currentCycleApplicationTypes = (applicantId: string, cycleYear: number, apps: DocumentData[]): ApplicationTypeValue[] => {
	const types = new Set<ApplicationTypeValue>();
	for (const app of appsForApplicant(applicantId, apps)) {
		if (resolveApplicationCycleYear(app) !== cycleYear) continue;
		if (Object.values(ApplicationType).includes(app.type as ApplicationTypeValue)) types.add(app.type as ApplicationTypeValue);
	}
	return [...types];
};

const countUndergraduateAwardCycles = (applicantId: string, apps: DocumentData[]): number => {
	const years = new Set();
	for (const app of appsForApplicant(applicantId, apps)) {
		if (app.status !== ApplicationStatus.awarded) continue;
		const year = resolveApplicationCycleYear(app);
		if (year !== null) years.add(year);
	}
	return years.size;
};

const applicantIsUndergradEligible = (gradYear: unknown, cycleYear: number): boolean => {
	const parsed = parseGradYear(gradYear);
	if (parsed === null) return true;
	return parsed >= cycleYear;
};

const activeAppsForApplicant = (applicantId: string, apps: DocumentData[]): DocumentData[] =>
	appsForApplicant(applicantId, apps).filter((app) => app.status !== ApplicationStatus.deleted);

const hasCompletedApplicationEver = (applicantId: string, apps: DocumentData[]): boolean =>
	activeAppsForApplicant(applicantId, apps).some((app) => SUBMITTED_OR_BEYOND_STATUSES.has(String(app.status)));

const hasAnyAward = (applicantId: string, apps: DocumentData[]): boolean =>
	activeAppsForApplicant(applicantId, apps).some((app) => app.status === ApplicationStatus.awarded);

const hasScholarshipAwardEver = (applicantId: string, apps: DocumentData[]): boolean =>
	activeAppsForApplicant(applicantId, apps).some(
		(app) => app.status === ApplicationStatus.awarded && app.type === ApplicationType.scholarship
	);

const isOutlookEligible = (applicantId: string, applicant: DocumentData | undefined, cycleYear: number, apps: DocumentData[]): boolean => {
	if (!applicantIsUndergradEligible(applicant?.gradYear, cycleYear)) return false;
	if (countUndergraduateAwardCycles(applicantId, apps) >= MAX_UNDERGRAD_AWARD_CYCLES) return false;
	return true;
};

const isCurrentCycleAccount = (applicant: DocumentData | undefined, cycleYear: number): boolean => {
	const accountYear = applicantAccountCycleYear(applicant);
	return accountYear === null || accountYear >= cycleYear;
};

const isLostInTheWeeds = (applicantId: string, applicant: DocumentData | undefined, cycleYear: number, apps: DocumentData[]): boolean => {
	if (hasCompletedApplicationEver(applicantId, apps)) return false;
	if (isCurrentCycleAccount(applicant, cycleYear) && !hasApplicationBeforeCycle(applicantId, cycleYear, apps)) return false;
	return true;
};

const lastAwardedApplicationMatching = (applicantId: string, apps: DocumentData[], types: Set<string>) => {
	let latest = null;
	for (const app of activeAppsForApplicant(applicantId, apps)) {
		if (app.status !== ApplicationStatus.awarded || !types.has(String(app.type))) continue;
		const year = resolveApplicationCycleYear(app);
		if (year === null) continue;
		if (!latest || year > latest.cycleYear) latest = { type: String(app.type), cycleYear: year };
	}
	return latest;
};

const resolveOutlookSectionId = (applicantId: string, applicant: DocumentData | undefined, cycleYear: number, apps: DocumentData[]): OutlookSectionId | null => {
	if (!isOutlookEligible(applicantId, applicant, cycleYear, apps)) return null;
	if (hasScholarshipAwardEver(applicantId, apps)) return 'expectedReturningScholarships';
	if (hasAnyAward(applicantId, apps)) return 'expectedReturningGrants';
	const currentTypes = currentCycleApplicationTypes(applicantId, cycleYear, apps);
	const hasAnyCurrentCycleApp = currentTypes.length > 0;
	const isNewThisCycle = isCurrentCycleAccount(applicant, cycleYear) && !hasApplicationBeforeCycle(applicantId, cycleYear, apps);
	if (isNewThisCycle && !hasAnyCurrentCycleApp) return 'brandNewAccounts';
	if (isLostInTheWeeds(applicantId, applicant, cycleYear, apps)) return 'lostInTheWeeds';
	return 'expectedNewApplications';
};

const resolveCycleStatus = (expectedType: ApplicationTypeValue | null, currentTypes: ApplicationTypeValue[]): OutlookRowCycleStatus => {
	if (!expectedType) return 'none';
	if (currentTypes.length === 0) return 'none';
	return currentTypes.includes(expectedType) ? 'correct' : 'wrong';
};

const resolveAwardDisplay = (applicantId: string, apps: DocumentData[], sectionId: OutlookSectionId) => {
	if (sectionId === 'expectedReturningScholarships') {
		const last = lastAwardedApplicationMatching(applicantId, apps, new Set([ApplicationType.scholarship]));
		if (last) return { display: `${last.type} (${last.cycleYear})`, lastAwardType: last.type, lastCycleYear: last.cycleYear };
	}
	if (sectionId === 'expectedReturningGrants') {
		const last = lastAwardedApplicationMatching(applicantId, apps, new Set([ApplicationType.returningGrant, ApplicationType.newApplication]));
		if (last) return { display: `${last.type} (${last.cycleYear})`, lastAwardType: last.type, lastCycleYear: last.cycleYear };
	}
	if (activeAppsForApplicant(applicantId, apps).length === 0) {
		return { display: 'Account Created', lastAwardType: null, lastCycleYear: null };
	}
	return { display: 'First Time Applicant', lastAwardType: null, lastCycleYear: null };
};

const outlookSectionLink = (pathKey: string, cycleYear: number): string => {
	if (pathKey === 'applicants') return '/applicants/all';
	if (pathKey === 'newAppsInYear') return `/applications/${cycleYear}/newApplicants`;
	if (pathKey === 'returningAppsInYear') return `/applications/${cycleYear}/returningGrants`;
	return `/applications/${cycleYear}/scholarshipRecipients`;
};

const toOutlookRow = (applicantId: string, applicant: DocumentData | undefined, cycleYear: number, apps: DocumentData[], sectionId: OutlookSectionId, expectedType: ApplicationTypeValue | null): DashboardApplicantOutlookRow => {
	const gradYearParsed = normalizeGradYear(applicant?.gradYear);
	const award = resolveAwardDisplay(applicantId, apps, sectionId);
	return {
		applicantId,
		name: applicantDisplayName(applicant, applicantId),
		gradYear: gradYearParsed === null ? null : String(gradYearParsed),
		awardDisplay: award.display,
		lastAwardType: award.lastAwardType,
		lastCycleYear: award.lastCycleYear,
		cycleStatus: resolveCycleStatus(expectedType, currentCycleApplicationTypes(applicantId, cycleYear, apps)),
	};
};

const sortOutlookRows = (rows: DashboardApplicantOutlookRow[]): DashboardApplicantOutlookRow[] =>
	[...rows].sort((a, b) => {
		const yearDiff = (b.lastCycleYear ?? 0) - (a.lastCycleYear ?? 0);
		if (yearDiff !== 0) return yearDiff;
		return a.name.localeCompare(b.name);
	});

const isOutlookSectionComplete = (applicants: DashboardApplicantOutlookRow[]): boolean => applicants.length > 0 && applicants.every((row) => row.cycleStatus === 'correct');

export const buildDashboardApplicantOutlook = (apps: DocumentData[], applicantsById: Map<string, DocumentData>, cycleYear: number): DashboardApplicantOutlook => {
	const sectionRows = new Map<OutlookSectionId, DashboardApplicantOutlookRow[]>(OUTLOOK_PIPELINE_SECTIONS.map(({ id }) => [id, []]));
	for (const [applicantId, applicant] of applicantsById.entries()) {
		const sectionId = resolveOutlookSectionId(applicantId, applicant, cycleYear, apps);
		if (!sectionId) continue;
		const meta = OUTLOOK_PIPELINE_SECTIONS.find((section) => section.id === sectionId);
		if (!meta) continue;
		sectionRows.get(sectionId)?.push(toOutlookRow(applicantId, applicant, cycleYear, apps, sectionId, meta.expectedType));
	}
	const sections = OUTLOOK_PIPELINE_SECTIONS.map(({ id, title, pathKey, expectedType }) => {
		const applicants = sortOutlookRows(sectionRows.get(id) ?? []);
		if (id === 'brandNewAccounts' || id === 'lostInTheWeeds') {
			applicants.sort((a, b) => a.name.localeCompare(b.name));
		}
		return {
			id,
			title,
			link: outlookSectionLink(pathKey, cycleYear),
			expectedType,
			applicants,
			isComplete: isOutlookSectionComplete(applicants),
		};
	});
	return { cycleYear, sections };
};

export const getRealTimeDashboardApplicantOutlook = (callback: RealtimeCallback<DashboardApplicantOutlook>) => {
	let cycleYear = new Date().getFullYear();
	let apps: DocumentData[] = [];
	let applicantsById = new Map<string, DocumentData>();
	let configLoaded = false;

	const publish = () => {
		if (!configLoaded) return;
		try {
			callback(buildDashboardApplicantOutlook(apps, applicantsById, cycleYear));
		} catch (error) {
			logEvent('buildDashboardApplicantOutlook publish error', error);
		}
	};

	void getConfigFromDb()
		.then((config) => {
			cycleYear = siteConfigCycleYear(config);
			configLoaded = true;
			publish();
		})
		.catch((error) => {
			logEvent('Error loading config for getRealTimeDashboardApplicantOutlook', error);
			configLoaded = true;
			publish();
		});

	try {
		const unsubApps = onSnapshot(collection(db, collections.applications), (snapshot) => {
			apps = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
			publish();
		});
		const unsubApplicants = onSnapshot(collection(db, collections.applicants), (snapshot) => {
			applicantsById = new Map(snapshot.docs.map((docSnap) => [docSnap.id, { id: docSnap.id, ...docSnap.data() }]));
			publish();
		});
		return () => {
			unsubApps();
			unsubApplicants();
		};
	} catch (error) {
		logEvent('Error in getRealTimeDashboardApplicantOutlook', error);
		return null;
	}
};

export const getDashboardBenchmarkData = async (cycleYear: number): Promise<DashboardBenchmarkData> => {
	const priorYear = cycleYear - 1;
	const trendYears = [cycleYear - 3, cycleYear - 2, cycleYear - 1];
	const pipelineStatusSet = new Set(PIPELINE_STATUSES);
	const currentCounts = emptyTypeCounts();
	const benchmarkTargets = emptyTypeCounts();
	const returningPool = new Set();
	const scholarshipPool = new Set();
	const awardTrendMap: Record<number, AwardTrendYear> = {};
	for (const year of trendYears) awardTrendMap[year] = emptyAwardTrend(year);

	try {
		const [appsSnapshot, applicantsSnapshot] = await Promise.all([
			getDocs(collection(db, collections.applications)),
			getDocs(collection(db, collections.applicants)),
		]);
		const applicantsById = new Map(applicantsSnapshot.docs.map((docSnap) => [docSnap.id, docSnap.data()]));

		for (const docSnap of appsSnapshot.docs) {
			const app = docSnap.data();
			const appYear = resolveApplicationCycleYear(app);
			if (appYear === null) continue;
			const type = app.type;
			const status = app.status;
			const applicantId = app.completedBy ? String(app.completedBy) : '';

			if (appYear === cycleYear && pipelineStatusSet.has(status)) {
				if (type === ApplicationType.newApplication) currentCounts[ApplicationType.newApplication]++;
				else if (type === ApplicationType.returningGrant) currentCounts[ApplicationType.returningGrant]++;
				else if (type === ApplicationType.scholarship) currentCounts[ApplicationType.scholarship]++;
			}

			if (appYear === priorYear && pipelineStatusSet.has(status) && type === ApplicationType.newApplication) {
				benchmarkTargets[ApplicationType.newApplication]++;
			}

			if (status === ApplicationStatus.awarded && trendYears.includes(appYear) && applicantId) {
				incrementAwardTrend(awardTrendMap, appYear, type);
				const applicant = applicantsById.get(applicantId);
				if (applicantHasNotGraduated(applicant?.gradYear, cycleYear)) {
					if (type === ApplicationType.returningGrant) returningPool.add(applicantId);
					else if (type === ApplicationType.scholarship) scholarshipPool.add(applicantId);
				}
			}
		}

		benchmarkTargets[ApplicationType.returningGrant] = returningPool.size;
		benchmarkTargets[ApplicationType.scholarship] = scholarshipPool.size;

		return {
			currentCounts,
			benchmarkTargets,
			awardTrends: trendYears.map((year) => awardTrendMap[year] ?? emptyAwardTrend(year)),
		};
	} catch (error) {
		logEvent('Error in getDashboardBenchmarkData', error);
		return {
			currentCounts: emptyTypeCounts(),
			benchmarkTargets: emptyTypeCounts(),
			awardTrends: trendYears.map((year) => emptyAwardTrend(year)),
		};
	}
};

export const getBenchmarkedAwardCounts = async (cycleYear?: number) => {
	const year = typeof cycleYear === 'number' ? cycleYear : siteConfigCycleYear(await getConfigFromDb());
	const data = await getDashboardBenchmarkData(year + 1);
	return data.benchmarkTargets;
};

// --- 11. Notes System ---

const getParentNameForNote = async (parentRef: DocumentReference<DocumentData>) => {
	try {
		const parentDocSnap = await getDoc(parentRef);
		if (!parentDocSnap.exists()) return parentRef.id;

		const parentData = parentDocSnap.data() as DocumentData;
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
			const appYear = coerceCycleYear(parentData.window) ?? new Date().getFullYear();
			return `${appHolderName}'s ${parentData.status} ${parentData.type} (${appYear})`;
		}

		return parentRef.id;
	} catch (error) {
		logEvent('Error in getParentNameForNote', error);
		return parentRef.id;
	}
};

export const getNotesByAuthor = async (authorId: string) => {
	if (!authorId) return [];

	const notesQuery = query(collectionGroup(db, 'notes'), where('authorId', '==', authorId), orderBy('createdAt', 'desc'));
	const snapshot = await getDocs(notesQuery);

	const userNotesPromises = snapshot.docs.map(async (noteDoc) => {
		const data = noteDoc.data();
		const parentRef = noteDoc.ref.parent.parent;
		if (!parentRef) {
			return {
				id: noteDoc.id,
				...data,
				parent: { id: '', collection: '', name: 'Unknown' },
			};
		}
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

export const getRealTimeNotes = (targetCollection: CollectionName, targetId: string, callback: RealtimeCallback<DocumentData[]>) => {
	const auth = getAuth();
	const currentUser = auth.currentUser;

	if (!currentUser) return () => {};

	const notesRef = collection(db, targetCollection, targetId, 'notes');

	const q = query(notesRef, or(where('visibility', '==', 'committee'), where('authorId', '==', currentUser.uid)), orderBy('createdAt', 'desc'));

	const unsubscribe = onSnapshot(q, (snapshot) => {
		const notes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		callback(notes);
	});

	return unsubscribe;
};

export const addNote = async (targetCollection: CollectionName, targetId: string, noteData: Record<string, unknown>) => {
	const notesRef = collection(db, targetCollection, targetId, 'notes');
	await addDoc(notesRef, {
		...noteData,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
};

export const updateNote = async (targetCollection: CollectionName, targetId: string, noteId: string, newText: string) => {
	const noteRef = doc(db, targetCollection, targetId, 'notes', noteId);
	await updateDoc(noteRef, {
		text: newText,
		updatedAt: new Date(),
	});
};

export const redactNote = async (targetCollection: CollectionName, targetId: string, noteId: string) => {
	const noteRef = doc(db, targetCollection, targetId, 'notes', noteId);
	await updateDoc(noteRef, {
		redacted: true,
		redactedOn: new Date(),
	});
};

// --- 12. Requests (References) ---

export const getRequestData = async (dataID: string) => {
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

export const invalidateRequest = async (dataID: string) => {
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

export const saveFile = async (type: string, assetID: string, name: string, file: Blob) => {
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

export const deleteFile = async (location: string) => {
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

export const getFile = async (refLoc: string) => {
	if (!refLoc) throw new Error('Missing refLoc path');
	const storageRef = ref(storage, refLoc);
	const url = await getDownloadURL(storageRef);
	return url;
};

export const getDownloadLinkForFile = async (file: string) => {
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

export const getMeetings = async (userId: string, isCommittee: boolean): Promise<MeetingRecord[]> => {
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
			const meeting: MeetingRecord = { id: document.id, ...document.data() };

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
		} as MeetingRecord);
	}

	return meetings;
};

export const getRealTimeMeetings = (userId: string, isCommittee: boolean, callback: RealtimeCallback<MeetingRecord[]>, isDash = false) => {
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
				const meeting: MeetingRecord = { id: document.id, ...document.data() };
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

export const getInterviewsByWindow = async (window: string) => {
	const interviewsRef = collection(db, 'interviews');
	const q = query(interviewsRef, where('deadline', '==', window), orderBy('startTime', 'asc'));

	const snapshot = await getDocs(q);
	if (snapshot.empty) {
		return [];
	}

	const interviewsWithNames = await Promise.all(
		snapshot.docs.map(async (details) => {
			const interview: InterviewRecord = { id: details.id, ...details.data() };
			try {
				const applicantId = String(interview.applicantId ?? '');
				if (!applicantId) {
					interview.applicantName = 'Unknown Applicant';
					return interview;
				}
				const applicantDoc = await getDoc(doc(db, collections.applicants, applicantId));

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

export const getRealTimeInterviewsByWindow = (cycleYear: number, callback: RealtimeCallback<InterviewRecord[]>) => {
	const interviewsRef = collection(db, collections.interviews);
	const unsubscribe = onSnapshot(
		interviewsRef,
		(snapshot) => {
			const fetchedData = snapshot.docs
				.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
				.filter((interview) => resolveInterviewCycleYear(interview) === cycleYear);
			callback(fetchedData);
		},
		(error) => {
			logEvent('getRealTimeInterviewsByWindow error', error);
			callback([]);
		}
	);
	return unsubscribe;
};

const getInterviewICSFields = (interview: InterviewICSInput): Record<string, unknown> => {
	if (typeof interview.data === 'function') {
		return interview.data();
	}
	return {
		startTime: interview.startTime,
		endTime: interview.endTime,
		title: interview.title,
		description: interview.description,
	};
};

const toInterviewDate = (value: unknown): Date => {
	if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
		return (value as { toDate: () => Date }).toDate();
	}
	return new Date(value as string | number | Date);
};

export const generateICSDownloadURL = async (interview: InterviewICSInput): Promise<string> => {
	const path = `interview-invites/${interview.id}.ics`;
	const fileRef = ref(storage, path);

	try {
		return await getDownloadURL(fileRef);
	} catch (err) {
		const storageError = err as { code?: string };
		if (storageError.code === 'storage/object-not-found') {
			const ensureICS = httpsCallable(functions, 'ensureICSFile');
			const { startTime, endTime, title, description } = getInterviewICSFields(interview);
			const result = await ensureICS({
				interviewId: interview.id,
				startTime: toInterviewDate(startTime),
				endTime: toInterviewDate(endTime),
				title: (title as string | undefined) ?? 'AMS Interview',
				description: (description as string | undefined) ?? 'Scheduled interview session',
				url: `${globalThis.location.origin}/interviews/waiting-room/${interview.id}`,
			});

			return (result.data as { downloadUrl: string }).downloadUrl;
		}
		logEvent('Error in generateICSDownloadURL', err);
		throw err;
	}
};

export const backfillApplicantCreationDates = httpsCallable(functions, 'backfillApplicantCreationDates');

export const getEmailLogs = async (limitCount = 20) => {
	try {
		const q = query(collection(db, collections.emails), orderBy('createdAt', 'desc'), limit(limitCount));
		const querySnapshot = await getDocs(q);
		return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
	} catch (error) {
		console.warn('Error fetching ordered email logs, falling back to unordered:', error);
		try {
			const q = query(collection(db, collections.emails), limit(limitCount));
			const querySnapshot = await getDocs(q);
			return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		} catch (innerError) {
			console.error('Final error fetching email logs:', innerError);
			return [];
		}
	}
};

export const getRealTimeNewApplicantsThisYear = (callback: RealtimeCallback<DocumentData[]>, limitCount = 10) => {
	try {
		const currentYearStr = new Date().getFullYear().toString();
		const startOfYearDate = new Date(`${currentYearStr}-01-01T00:00:00Z`);

		const coll = collection(db, collections.applicants);
		const q = query(coll, where('accountCreated', '>=', startOfYearDate), orderBy('accountCreated', 'desc'), limit(limitCount));

		const unsubscribe = onSnapshot(q, (snapshot) => {
			const fetchedData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
			callback(fetchedData);
		});

		return unsubscribe;
	} catch (error) {
		console.error('Error listening to new applicants this year: ', error);
		return () => {};
	}
};

export const getAverageApplicationsPerYearByType = async (type: ApplicationTypeValue, currentYear: number, yearsBack = 3) => {
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
				const appYear = coerceCycleYear(data.window);
				if (appYear != null && appYear >= startYear && appYear < currentYear) totalApplicationsInWindow++;
			}
		});
		return Math.round(totalApplicationsInWindow / yearsBack);
	} catch (error) {
		logEvent('Error in getAverageApplicationsPerYearByType', error);
		return 0;
	}
};
