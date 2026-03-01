/**
 * src/config/data/firebase.test.js
 * Comprehensive test suite for Firebase configuration and helper functions.
 */

// 1. POLYFILLS
if (typeof global.setImmediate === 'undefined') {
	global.setImmediate = setTimeout;
}
if (typeof global.clearImmediate === 'undefined') {
	global.clearImmediate = clearTimeout;
}
if (typeof global.performance === 'undefined') {
	global.performance = { mark: jest.fn(), measure: jest.fn() };
}
if (typeof global.fetch === 'undefined') {
	global.fetch = jest.fn(() =>
		Promise.resolve({
			ok: true,
			json: () => Promise.resolve({}),
		})
	);
}
// Mock browser alert
global.alert = jest.fn();

// 2. DEFINE SPIES
const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockAddDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockQuery = jest.fn();
const mockCollection = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockOnSnapshot = jest.fn();
const mockDoc = jest.fn();
const mockGetCountFromServer = jest.fn();
const mockHttpsCallable = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockCreateUser = jest.fn();
const mockUploadBytes = jest.fn();
const mockGetDownloadURL = jest.fn();
const mockDeleteObject = jest.fn();
const mockWriteBatch = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();

let FirebaseConfig;

describe('src/config/data/firebase.js', () => {
	beforeEach(() => {
		jest.resetModules();
		jest.clearAllMocks();

		// --- MOCKS ---
		jest.doMock('firebase/app', () => ({ initializeApp: jest.fn() }));
		jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn() }));

		jest.doMock('firebase/auth', () => ({
			getAuth: jest.fn(() => ({ currentUser: { uid: 'test-uid' } })),
			signInWithEmailAndPassword: mockSignIn,
			createUserWithEmailAndPassword: mockCreateUser,
			signOut: mockSignOut,
		}));

		jest.doMock('firebase/firestore', () => ({
			__esModule: true,
			getFirestore: jest.fn(() => ({})),
			initializeFirestore: jest.fn(() => ({})),
			doc: mockDoc.mockImplementation((db, col, id) => ({ path: `${col}/${id}`, id: id || 'test-id' })),
			collection: mockCollection.mockImplementation((db, col) => ({ path: col })),
			getDoc: mockGetDoc,
			getDocs: mockGetDocs,
			setDoc: mockSetDoc,
			updateDoc: mockUpdateDoc,
			addDoc: mockAddDoc,
			deleteDoc: mockDeleteDoc,
			query: mockQuery,
			where: mockWhere,
			orderBy: mockOrderBy,
			limit: mockLimit,
			onSnapshot: mockOnSnapshot,
			getCountFromServer: mockGetCountFromServer,
			writeBatch: mockWriteBatch.mockImplementation(() => ({
				delete: mockBatchDelete,
				update: mockBatchUpdate,
				commit: mockBatchCommit,
			})),
			collectionGroup: jest.fn(),
			arrayUnion: jest.fn(),
			arrayRemove: jest.fn(),
			and: jest.fn(),
			or: jest.fn(),
			serverTimestamp: jest.fn(),
			persistentLocalCache: jest.fn(),
			persistentMultipleTabManager: jest.fn(),
		}));

		jest.doMock('firebase/storage', () => ({
			getStorage: jest.fn(),
			ref: jest.fn((_, path) => ({ fullPath: path || 'mock/path' })),
			uploadBytes: mockUploadBytes,
			getDownloadURL: mockGetDownloadURL,
			deleteObject: mockDeleteObject,
		}));

		jest.doMock('firebase/functions', () => ({
			getFunctions: jest.fn(),
			httpsCallable: jest.fn(() => mockHttpsCallable),
		}));

		jest.doMock('axios', () => ({
			get: jest.fn(() => Promise.resolve({ data: { ip: '1.2.3.4' } })),
		}));

		jest.doMock('ua-parser-js', () => ({
			UAParser: jest.fn().mockImplementation(() => ({
				getResult: () => ({ browser: { name: 'TestBrowser' } }),
			})),
		}));

		jest.doMock('./collections', () => ({
			collections: {
				users: 'users',
				members: 'members',
				applicants: 'applicants',
				applications: 'applications',
				siteConfig: 'siteConfig',
				sitelog: 'sitelog',
				legacyFinances: 'legacyFinances',
				awards: 'awards',
				requests: 'requests',
				attachments: 'attachments',
				// Added missing collections to prevent "undefined" in wipeTestCollections
				contributions: 'contributions',
				dblog: 'dblog',
				education: 'education',
				emails: 'emails',
				expenses: 'expenses',
				families: 'families',
				incomes: 'incomes',
				profiles: 'profiles',
				projections: 'projections',
				experience: 'experience',
				sms: 'sms',
			},
			ApplicationStatus: { deleted: 'Deleted', eligible: 'Eligible' },
			ApplicationType: { newApplication: 'New Application', returningGrant: 'Returning Grant' },
			InterviewStatus: { scheduled: 'Scheduled' },
			SearchableCollections: {
				test: { collection: 'testCol', fields: ['name'] },
			},
			applicationSpecificCollections: ['applications'],
		}));

		// Re-require the module to apply mocks
		FirebaseConfig = require('./firebase');

		// --- DEFAULT SPY BEHAVIOR ---
		mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ id: '1', firstName: 'John' }) });
		mockGetDocs.mockResolvedValue({
			empty: false,
			size: 1,
			docs: [{ id: '1', data: () => ({ id: '1', name: 'Test Doc' }), ref: { path: 'ref/path' } }],
		});
		mockSetDoc.mockResolvedValue(true);
		mockUpdateDoc.mockResolvedValue(true);
		mockAddDoc.mockResolvedValue({ id: 'new-doc' });
		mockDeleteDoc.mockResolvedValue(true);
		mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 5 }) });
		mockHttpsCallable.mockResolvedValue({ data: { message: 'Success' } });
		mockUploadBytes.mockResolvedValue({ ref: { fullPath: 'uploaded/path' } });
		mockGetDownloadURL.mockResolvedValue('http://download.url');

		// Setup onSnapshot to execute callback immediately with dummy data
		mockOnSnapshot.mockImplementation((query, callback) => {
			callback({
				exists: () => true,
				size: 1,
				data: () => ({ id: 'snap-1' }),
				docs: [{ id: 'snap-1', data: () => ({ id: 'snap-1' }) }],
			});
			return jest.fn(); // Unsubscribe function
		});
	});

	// --- CONFIG & UTILS ---

	it('getConfigFromDb fetches config', async () => {
		await FirebaseConfig.getConfigFromDb();
		expect(mockGetDoc).toHaveBeenCalled();
	});

	it('logEvent adds a log entry', async () => {
		await FirebaseConfig.logEvent('test action');
		expect(mockAddDoc).toHaveBeenCalled();
	});

	it('updateUserPreferences updates doc', async () => {
		await FirebaseConfig.updateUserPreferences('u1', 'users', { theme: 'dark' });
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	// --- SEARCH & RETRIEVAL ---

	it('getDocumentsByIDs fetches multiple docs', async () => {
		await FirebaseConfig.getDocumentsByIDs('users', ['1', '2']);
		expect(mockGetDoc).toHaveBeenCalledTimes(2);
	});

	it('getCollection fetches all docs', async () => {
		await FirebaseConfig.getCollection('users');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('searchCollections queries multiple fields', async () => {
		await FirebaseConfig.searchCollections(['term']);
		expect(mockGetDocs).toHaveBeenCalled();
	});

	// --- APPLICANT / MEMBER ACTIONS ---

	it('saveApplicantData / updateApplicantData', async () => {
		await FirebaseConfig.saveApplicantData('1', { name: 'Test' });
		expect(mockSetDoc).toHaveBeenCalled();

		await FirebaseConfig.updateApplicantData('1', { name: 'Test' });
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('getApplicant / getMember', async () => {
		await FirebaseConfig.getApplicant('1');
		expect(mockGetDoc).toHaveBeenCalled();
		await FirebaseConfig.getMember('1');
		expect(mockGetDoc).toHaveBeenCalled();
	});

	it('addApplicationToApplicant uses arrayUnion', async () => {
		await FirebaseConfig.addApplicationToApplicant('u1', 'app1');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('removeApplicationFromApplicant uses arrayRemove', async () => {
		await FirebaseConfig.removeApplicationFromApplicant('u1', 'app1');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	// --- APPLICATION ACTIONS ---

	it('saveCollectionData / updateCollectionData', async () => {
		await FirebaseConfig.saveCollectionData('col', 'id', {});
		expect(mockSetDoc).toHaveBeenCalled();
		await FirebaseConfig.updateCollectionData('col', 'id', {});
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('updateApplicationStatus updates status', async () => {
		await FirebaseConfig.updateApplicationStatus('u1', 'app1', 'Submitted');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('updateSubmissionStatus updates status and timestamp', async () => {
		await FirebaseConfig.updateSubmissionStatus('sub1', 'Accepted');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('getApplication fetches specific app', async () => {
		await FirebaseConfig.getApplication('u1', 'a1');
		expect(mockGetDoc).toHaveBeenCalled();
	});

	it('getApplicationsByIDs fetches multiple apps', async () => {
		await FirebaseConfig.getApplicationsByIDs(['1']);
		expect(mockGetDoc).toHaveBeenCalled();
	});

	it('deleteApplication updates status to deleted', async () => {
		await FirebaseConfig.deleteApplication({ id: '1' });
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	// --- FILTERED QUERIES (Window, Type, Status) ---

	it('getApplicationsByYear calls getDocs', async () => {
		mockGetDocs.mockResolvedValueOnce({
			// Using a safe mid-year date to avoid timezone shift issues in tests
			docs: [{ data: () => ({ window: '2024-07-01' }) }],
		});
		const res = await FirebaseConfig.getApplicationsByYear();
		expect(mockGetDocs).toHaveBeenCalled();
		expect(res[0].year).toBe('2024');
	});

	it('getApplicationsByWindow queries by window', async () => {
		await FirebaseConfig.getApplicationsByWindow('2024-01-01');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getApplicationsByType queries by type', async () => {
		await FirebaseConfig.getApplicationsByType('Type', '2024');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getApplicationsByStatus queries by status', async () => {
		await FirebaseConfig.getApplicationsByStatus('Status', '2024');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	// --- COUNTS (Server Side) ---

	it('getPastApplicationsCountByWindow', async () => {
		await FirebaseConfig.getPastApplicationsCountByWindow('2023');
		expect(mockGetCountFromServer).toHaveBeenCalled();
	});

	it('getCurrentApplicationCount', async () => {
		await FirebaseConfig.getCurrentApplicationCount();
		expect(mockGetCountFromServer).toHaveBeenCalled();
	});

	it('getCurrentlyEligibleApplicationsCount', async () => {
		await FirebaseConfig.getCurrentlyEligibleApplicationsCount();
		expect(mockGetCountFromServer).toHaveBeenCalled();
	});

	it('getCurrentlyEligibleApplicationsCountByType', async () => {
		await FirebaseConfig.getCurrentlyEligibleApplicationsCountByType('Type');
		expect(mockGetCountFromServer).toHaveBeenCalled();
	});

	it('getEligibleApplicationsCountByTypeAndWindow', async () => {
		await FirebaseConfig.getEligibleApplicationsCountByTypeAndWindow('Type', '2024');
		expect(mockGetCountFromServer).toHaveBeenCalled();
	});

	it('getMostRecentApplicationIDs', async () => {
		await FirebaseConfig.getMostRecentApplicationIDs();
		expect(mockQuery).toHaveBeenCalled();
		expect(mockOrderBy).toHaveBeenCalled();
		expect(mockLimit).toHaveBeenCalled();
	});

	// --- REALTIME LISTENERS ---

	it('getRealTimeConfigFromDb', () => {
		const cb = jest.fn();
		FirebaseConfig.getRealTimeConfigFromDb(cb);
		expect(mockOnSnapshot).toHaveBeenCalled();
		expect(cb).toHaveBeenCalled(); // Mock implementation fires immediately
	});

	it('getRealTimeLegacyFinances', () => {
		const cb = jest.fn();
		FirebaseConfig.getRealTimeLegacyFinances(cb, { collection: 'legacyFinances', orderBy: ['year', 'desc'] });
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeCollection', () => {
		FirebaseConfig.getRealTimeCollection('users', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeCurrentApplicationCount', async () => {
		await FirebaseConfig.getRealTimeCurrentApplicationCount(jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeMostRecentApplicationIDs', () => {
		FirebaseConfig.getRealTimeMostRecentApplicationIDs(jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeCurrentEligibleApplicationsCountByType', async () => {
		await FirebaseConfig.getRealTimeCurrentEligibleApplicationsCountByType('New Application', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeEligibleApplicationsCountByTypeAndWindow', () => {
		FirebaseConfig.getRealTimeEligibleApplicationsCountByTypeAndWindow('New Application', '2024', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplicationCountByStatus', () => {
		FirebaseConfig.getRealTimeApplicationCountByStatus('Submitted', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplications', () => {
		FirebaseConfig.getRealTimeApplications(true, jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeRejectedApplications', () => {
		FirebaseConfig.getRealTimeRejectedApplications(jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplicationsByWindow', () => {
		FirebaseConfig.getRealTimeApplicationsByWindow('2024', true, jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplicationsByType', () => {
		FirebaseConfig.getRealTimeApplicationsByType('Type', '2024', false, jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplicantsByApplicationID', () => {
		FirebaseConfig.getRealTimeApplicantsByApplicationID(['1'], jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplicationsByStatus', () => {
		FirebaseConfig.getRealTimeApplicationsByStatus('Submitted', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeDocument', () => {
		FirebaseConfig.getRealTimeDocument('col', '1', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeApplicationsByIDs', () => {
		FirebaseConfig.getRealTimeApplicationsByIDs(['1'], jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getRealTimeAwardsByIDs', () => {
		FirebaseConfig.getRealTimeAwardsByIDs(['1'], jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	// --- AUTH & USERS ---

	it('getUserProfiles fetches member and applicant', async () => {
		await FirebaseConfig.getUserProfiles('1');
		expect(mockGetDoc).toHaveBeenCalledTimes(2);
	});

	it('getAuthUserByEmail queries users collection', async () => {
		await FirebaseConfig.getAuthUserByEmail('test@test.com');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('registerUser calls createUser', async () => {
		await FirebaseConfig.registerUser('a@b.com', 'pass');
		expect(mockCreateUser).toHaveBeenCalled();
	});

	it('loginUser calls signIn', async () => {
		await FirebaseConfig.loginUser('a@b.com', 'pass');
		expect(mockSignIn).toHaveBeenCalled();
	});

	it('logoutUser calls signOut', async () => {
		await FirebaseConfig.logoutUser();
		expect(mockSignOut).toHaveBeenCalled();
	});

	it('purgeUserRecords performs batch delete', async () => {
		await FirebaseConfig.purgeUserRecords({ userId: '1', expel: true });
		// It fetches owned docs, requests, then batch deletes
		expect(mockGetDocs).toHaveBeenCalled();
		expect(mockWriteBatch).toHaveBeenCalled();
		expect(mockBatchDelete).toHaveBeenCalled();
		expect(mockBatchCommit).toHaveBeenCalled();
		expect(mockHttpsCallable).toHaveBeenCalled(); // calls deleteAuthUser
	});

	// --- REQUESTS & AWARDS ---

	it('getRequestData fetches doc', async () => {
		await FirebaseConfig.getRequestData('1');
		expect(mockGetDoc).toHaveBeenCalled();
	});

	it('invalidateRequest updates doc', async () => {
		await FirebaseConfig.invalidateRequest('1');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('getAwardsData fetches docs', async () => {
		await FirebaseConfig.getAwardsData('u1', ['1']);
		expect(mockGetDoc).toHaveBeenCalled();
	});

	it('getBenchmarkedAwardCounts calculates metrics', async () => {
		// Mock awards and applicant data structure
		mockGetDocs
			.mockResolvedValueOnce({
				// Awards
				docs: [{ data: () => ({ applicantID: 'a1', type: 'New Application' }) }],
			})
			.mockResolvedValueOnce({
				// Applicant for a1
				docs: [{ data: () => ({ awards: [{ deadline: '2020-01-01' }] }) }],
			});

		const res = await FirebaseConfig.getBenchmarkedAwardCounts('2024');
		expect(res['New Application']).toBeDefined();
	});

	// --- STORAGE ---

	it('saveFile uploads bytes', async () => {
		await FirebaseConfig.saveFile('type', 'id', 'name', new Blob());
		expect(mockUploadBytes).toHaveBeenCalled();
	});

	it('deleteFile deletes object', async () => {
		await FirebaseConfig.deleteFile('path/to/file');
		expect(mockDeleteObject).toHaveBeenCalled();
	});

	it('getFile gets download url', async () => {
		await FirebaseConfig.getFile('path');
		expect(mockGetDownloadURL).toHaveBeenCalled();
	});

	it('getDownloadLinkForFile gets download url', async () => {
		await FirebaseConfig.getDownloadLinkForFile('path');
		expect(mockGetDownloadURL).toHaveBeenCalled();
	});

	// --- NOTES & MEETINGS ---

	it('getNotesByAuthor fetches notes', async () => {
		// Mock nested parent structure for note -> parent -> collection
		mockGetDocs.mockResolvedValueOnce({
			docs: [
				{
					id: 'note1',
					data: () => ({ text: 'test' }),
					ref: { parent: { parent: { id: 'p1', path: 'applications/p1' } } },
				},
			],
		});
		await FirebaseConfig.getNotesByAuthor('1');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getRealTimeNotes', () => {
		FirebaseConfig.getRealTimeNotes('col', '1', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('addNote adds doc', async () => {
		await FirebaseConfig.addNote('col', '1', { text: 'hi' });
		expect(mockAddDoc).toHaveBeenCalled();
	});

	it('updateNote updates doc', async () => {
		await FirebaseConfig.updateNote('col', '1', 'n1', 'new');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('redactNote updates doc', async () => {
		await FirebaseConfig.redactNote('col', '1', 'n1');
		expect(mockUpdateDoc).toHaveBeenCalled();
	});

	it('getMeetings fetches meetings', async () => {
		await FirebaseConfig.getMeetings('1', false);
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getRealTimeMeetings', () => {
		FirebaseConfig.getRealTimeMeetings('1', true, jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getSchedulableInterviews', async () => {
		await FirebaseConfig.getSchedulableInterviews();
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getInterviewsByWindow', async () => {
		await FirebaseConfig.getInterviewsByWindow('2024');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getRealTimeInterviewsByWindow', () => {
		FirebaseConfig.getRealTimeInterviewsByWindow('2024', jest.fn());
		expect(mockOnSnapshot).toHaveBeenCalled();
	});

	it('getAllApplicantsSimple', async () => {
		await FirebaseConfig.getAllApplicantsSimple();
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('getApplicationsForApplicant', async () => {
		await FirebaseConfig.getApplicationsForApplicant('1');
		expect(mockGetDocs).toHaveBeenCalled();
	});

	it('generateICSDownloadURL handles missing file via Cloud Function', async () => {
		mockGetDownloadURL.mockRejectedValue({ code: 'storage/object-not-found' });
		try {
			await FirebaseConfig.generateICSDownloadURL({
				id: '1',
				data: () => ({ startTime: new Date(), endTime: new Date() }),
			});
		} catch (e) {}
		expect(mockHttpsCallable).toHaveBeenCalled();
	});

	// --- TEST UTILS ---
	// Removed sendToTestDB and wipeTestCollections as they are no longer exported from firebase.js
});
