/**
 * DATABASE COLLECTIONS & CONSTANTS
 * ---------------------------------------------------------------------------
 * This file acts as the Schema Definition for the application.
 * It defines:
 * 1. The exact Firestore collection names (decoupling code from DB paths).
 * 2. The Status and Type enums that drive application logic/workflow.
 * 3. Configuration for Global Search (which fields in which collections to index).
 * 4. Storage paths for file uploads.
 */

// --- 1. Firestore Collection Names ---

/**
 * Central registry of all Firestore collection paths.
 * Use these keys in your code (e.g., `collections.applications`) instead of
 * hardcoded strings to ensure consistency across the app.
 */
export const collections = {
	// Core Application Data
	applications: 'applications', // The main application metadata record
	profiles: 'profiles', // Section 1: Personal Info
	families: 'families', // Section 2: Family structure
	education: 'educationRecords', // Section 3: School history
	experience: 'experienceRecords', // Section 4: Employment/Activity
	expenses: 'expenseReports', // Section 5: College costs
	incomes: 'incomeReports', // Section 6: Student income sources
	contributions: 'contributions', // Section 7: Parental support
	projections: 'projections', // Section 8: Financial gap analysis
	attachments: 'attachments', // Section 9: File uploads (PDFs/Images)

	// User Data
	applicants: 'applicants', // User profiles for Candidates
	members: 'members', // User profiles for Admins/Board Members
	users: 'authUsers', // Linked mapping between Auth UID and Role

	// System & Logs
	siteConfig: 'siteConfiguration', // Global settings (deadlines, maintenance mode)
	emails: 'emails', // Log of transactional emails sent via SendGrid/etc
	sms: 'sms', // Log of SMS messages (Twilio)
	sitelog: 'sitelog', // General activity log
	dblog: 'dblog', // Database modification log
	mailCache: 'mail_cache', // Cached inbox for the Admin Dashboard
	mailSync: 'mail_sync', // State tracking for the Email Sync background job

	// Features
	requests: 'requests', // External reference requests (Teachers/Clergy)
	awards: 'awards', // History of monetary grants given
	interviews: 'interviews', // Scheduling & Interview records
	legacyFinances: 'legacy_financials', // Historical financial data (pre-2023)
};

/**
 * A subset of collections that represent the "parts" of a single Application.
 * Used for:
 * 1. Cascading Deletes (Deleting an App deletes its profile, family, etc.)
 * 2. Bulk Fetching (Getting the full "Packet" for PDF generation)
 */
export const applicationSpecificCollections = [collections.applications, collections.profiles, collections.families, collections.education, collections.experience, collections.expenses, collections.incomes, collections.contributions, collections.projections, collections.attachments];

// --- 2. Enums & Constants ---

/**
 * The Lifecycle of an Application.
 * These values determine which queue the application appears in on the Admin Dashboard.
 */
export const ApplicationStatus = {
	started: 'Started', // Applicant has created the record but not finished
	submitted: 'Submitted', // Applicant clicked "Submit"; locked for editing
	completed: 'Completed', // Admin validated that all required docs are present
	incomplete: 'Incomplete', // Admin flagged missing info; returned to applicant
	eligible: 'Eligible', // Meets basic criteria; ready for review/interview
	ineligible: 'Ineligible', // Does not meet criteria; process ends here
	invited: 'Invited', // Selected for an interview
	deferred: 'Deferred', // Valid but not selected for interview this round
	awarded: 'Awarded', // Board voted to fund this applicant
	denied: 'Not Awarded', // Board voted not to fund
	deleted: 'Deleted', // Soft-delete status
};

/**
 * Distinguishes the "Track" or "Form" the applicant is using.
 * Determines which pages/steps are shown in the Wizard.
 */
export const ApplicationType = {
	newApplication: 'New Applicant', // The full, long-form application
	returningGrant: 'Returning Grant', // A slightly shorter renewal form
	scholarship: 'Scholarship Check In', // Compliance check only (upload grades)
};

/**
 * The Status of an Interview Appointment.
 */
export const InterviewStatus = {
	scheduled: 'Scheduled', // Time slot booked
	invited: 'Invited', // Invitation sent, waiting for RSVP
	confirmed: 'Confirmed', // Applicant RSVP'd Yes
	inProgress: 'In Progress', // Meeting currently happening
	completed: 'Completed', // Interview finished, feedback submitted
	cancelled: 'Cancelled', // Cancelled by either party
	missed: 'Missed', // No-show
};

/**
 * User Roles within the system.
 */
export const UserType = {
	applicant: 'Applicant', // Can only see their own data
	member: 'Member', // Admin/Board Member with Dashboard access
	both: 'both', // Edge case (rarely used)
};

/**
 * Classifications for Experience/Activity entries.
 */
export const OrganizationTypes = {
	nonprofit: 'Non-Profit',
	educational: 'Educational',
	community: 'Community',
	athletic: 'Athletic',
	other: 'Other',
	none: 'None',
};

// --- 3. Search Configuration ---

/**
 * Defines which collections are indexed by the Global Search Bar,
 * and which specific fields within those collections are text-searchable.
 */
export const SearchableCollections = {
	applicants: {
		collection: collections.applicants,
		fields: ['firstName', 'lastName', 'callMe', 'cell', 'email'],
	},
	education: {
		collection: collections.education,
		fields: ['schoolName', 'major'],
	},
	experience: {
		collection: collections.experience,
		fields: ['organization', 'type', 'role'],
	},
	profile: {
		collection: collections.profiles,
		fields: ['applicantFirstName', 'applicantLastName', 'applicantEmailAddress', 'applicantCellPhone'],
	},
};

// --- 4. Storage Paths ---

/**
 * Root folder names for Firebase Storage (File Uploads).
 */
export const UploadType = {
	applicationAttachment: 'applications', // Documents (Transcripts, Letters)
	applicantAvatar: 'applicants/avatars', // Profile Pictures
	memberAvatar: 'members/avatars', // Admin Photos
};