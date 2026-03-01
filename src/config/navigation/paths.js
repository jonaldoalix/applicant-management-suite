/**
 * APPLICATION ROUTE PATHS
 * ---------------------------------------------------------------------------
 * This file serves as the "Central Registry" for all URL paths in the application.
 *
 * * HOW IT WORKS:
 * Instead of hardcoding strings like '/members/dashboard' in your components,
 * import this object and use `paths.memberDash`.
 *
 * * DYNAMIC PATHS:
 * Paths containing colons (e.g., '/:id') are dynamic.
 * Use the `generatePath(path, { id: '123' })` utility to build these URLs.
 */

export const paths = {
	// -------------------------
	// 1. Core & Authentication
	// -------------------------
	root: '/',
	home: '/home',
	login: '/login',
	logout: '/logout',
	redirect: '/redirect', // Intermediate page for handling auth redirects
	registerApplicant: '/register', // Public sign-up for Applicants
	registerMember: '/board-registration', // Secret sign-up for Admins

	// -------------------------
	// 2. Applicant Workflow
	// -------------------------
	apply: '/apply', // Applicant Dashboard (Workflow Selection)

	// :applicationType = 'newApplicants' | 'returningGrants' | 'scholarshipRecipients'
	createApplication: '/apply/:applicationType',

	// :applicationID = Firestore ID of the specific application draft
	updateApplication: '/apply/:applicationType/:applicationID',

	// Read-only view for applicant to see what they submitted
	reviewApp: '/review/:id',

	// -------------------------
	// 3. Admin / Member Dashboard
	// -------------------------
	members: '/members',
	memberDash: '/members/dashboard',
	contactCenter: '/members/contact', // Bulk Email/SMS Tool
	siteSettings: '/members/settings', // Global Config (Deadlines, Maintenance Mode)
	financeCenter: '/members/finances', // Financial Reports
	manualUpload: '/members/manual-upload', // Admin tool to attach files to users

	// -- Admin Management --
	allMembers: '/members/all',
	newMember: '/members/new',
	viewMember: '/members/view/:id',
	editMember: '/members/edit/:id',

	// -- Request Management (External References) --
	allRequests: '/members/requests',
	newRequest: '/members/requests/new',
	editRequest: '/members/requests/edit/:id',

	// -- Email System --
	inbox: '/members/email/mailbox',
	composeEmail: '/members/email/new',
	viewEmail: '/members/email/view/:id',

	// -------------------------
	// 4. Data Management (Admins)
	// -------------------------

	// -- Applicants --
	applicants: '/applicants',
	allApplicants: '/applicants/all',
	newApplicant: '/applicants/new',
	viewApplicant: '/applicants/view/:id',
	editApplicant: '/applicants/edit/:id',

	// -- Applications (Review Console) --
	applications: '/applications',
	allApps: '/applications/all',
	archives: '/applications/archives',

	// Queues by Status
	completedApps: '/applications/completed',
	eligibleApps: '/applications/eligible',
	invitedApps: '/applications/invited',
	awardedApps: '/applications/awarded',
	rejectedApps: '/applications/rejected',
	incompleteApps: '/applications/incomplete',
	deletedApps: '/applications/deleted',

	// Queues by Year & Type (e.g. /applications/2024/newApplicants)
	allAppsInYear: '/applications/:year/all',
	newAppsInYear: '/applications/:year/newApplicants',
	returningAppsInYear: '/applications/:year/returningGrants',
	scholarshipAppsInYear: '/applications/:year/scholarshipRecipients',

	// Single Application Actions
	viewApp: '/applications/view/:id', // The Review Console
	exportApp: '/applications/export/:id', // Reader-Friendly Print View

	// -------------------------
	// 5. Interviews & Scheduling
	// -------------------------
	interviewDash: '/members/interviews/dashboard', // Admin overview of schedule
	scheduling: '/members/interviews/scheduling', // Scheduling Tool

	// Virtual Meeting Rooms
	waitingRoom: '/interviews/waiting-room/:interviewId', // For Applicants
	interviewRoom: '/interviews/interview-room/:interviewId', // For Committee
	deliberationRoom: '/interviews/deliberation-room', // Private Committee Room

	// -------------------------
	// 6. Public Utilities
	// -------------------------
	// :token = Encrypted Request ID (for Recommenders to upload files)
	requests: '/requests/:token',

	// :encID = Encrypted Email/User ID (for opting out)
	unsubscribe: '/unsubscribe/:encID',

	rsvp: '/interviews/rsvp', // Rapid RSVP page for applicants

	// -------------------------
	// 7. System Pages
	// -------------------------
	notFound: '/not-found',
	caAccessDenied: '/access-denied', // Generic 403
	adminAccessDenied: '/members/access-denied', // Admin-specific 403

	// Catch-all (Wildcard)
	caRoot: '*',
};