/**
 * APPLICATION WIZARD CONFIGURATION
 * ---------------------------------------------------------------------------
 * This file defines the structure, flow, and data requirements for the different
 * types of applications candidates can submit via the Applicant Portal.
 * * * HOW IT WORKS:
 * The 'GenericApplicationWizard' component reads these configs to generate
 * the stepper UI, render the correct form pages, and handle data saving.
 *
 * * CONFIGURATION SCHEMA:
 * - title: Displayed at the top of the application wizard.
 * - type: The 'ApplicationType' enum value (links to database 'type' field).
 * - steps: Array of string labels visible in the UI Progress Stepper.
 * - dataCollections: Maps internal data keys to Firestore collections.
 * - key: The internal state key (e.g., 'profile').
 * - collectionName: The actual Firestore collection path (e.g., 'st_profile').
 * - pages: Defines the sequence of components rendered.
 * - component: The React component to render (usually 'GenericFormPage').
 * - section: The form configuration ID (maps to 'formConfig.js') to load fields from.
 * - template: The initial empty state object for the main application record.
 */

import { collections, ApplicationType } from '../data/collections';
import { templateApp, templateApp2 } from '../data/Validation';

export const applicationConfigurations = {
	// -------------------------
	// 1. STANDARD GRANT APPLICATION
	// -------------------------
	// The full, comprehensive application for first-time applicants.
	newApplicants: {
		title: 'Standard Grant Application',
		type: ApplicationType.newApplication,
		// The visual labels for the Stepper
		steps: ['Profile', 'Family', 'Education', 'Experience', 'Expenses', 'Income', 'Contributions', 'Projections', 'Attachments', 'Confirm'],
		// Where data is saved in Firestore
		dataCollections: [
			{ key: 'profile', collectionName: collections.profiles },
			{ key: 'family', collectionName: collections.families },
			{ key: 'education', collectionName: collections.education },
			{ key: 'experience', collectionName: collections.experience },
			{ key: 'expenses', collectionName: collections.expenses },
			{ key: 'incomes', collectionName: collections.incomes },
			{ key: 'contributions', collectionName: collections.contributions },
			{ key: 'projections', collectionName: collections.projections },
			{ key: 'attachments', collectionName: collections.attachments },
		],
		// The Components to render for each step (index must match 'steps' array)
		pages: [
			{ component: 'GenericFormPage', section: 'profile' },
			{ component: 'GenericFormPage', section: 'family' },
			{ component: 'GenericFormPage', section: 'education' },
			{ component: 'GenericFormPage', section: 'experience' },
			{ component: 'GenericFormPage', section: 'expenses' },
			{ component: 'GenericFormPage', section: 'incomes' },
			{ component: 'GenericFormPage', section: 'contributions' },
			{ component: 'GenericFormPage', section: 'projections' },
			{ component: 'GenericFormPage', section: 'attachments' },
			{ component: 'GenericFormPage', section: 'confirmation' },
		],
		template: templateApp,
	},

	// -------------------------
	// 2. RENEWAL APPLICATION
	// -------------------------
	// Similar to standard, but typically pre-filled or slightly modified for returning users.
	returningGrants: {
		title: 'Grant Renewal Application',
		type: ApplicationType.returningGrant,
		steps: ['Profile', 'Family', 'Education', 'Experience', 'Expenses', 'Income', 'Contributions', 'Projections', 'Attachments', 'Confirm'],
		dataCollections: [
			{ key: 'profile', collectionName: collections.profiles },
			{ key: 'family', collectionName: collections.families },
			{ key: 'education', collectionName: collections.education },
			{ key: 'experience', collectionName: collections.experience },
			{ key: 'expenses', collectionName: collections.expenses },
			{ key: 'incomes', collectionName: collections.incomes },
			{ key: 'contributions', collectionName: collections.contributions },
			{ key: 'projections', collectionName: collections.projections },
			{ key: 'attachments', collectionName: collections.attachments },
		],
		pages: [
			{ component: 'GenericFormPage', section: 'profile' },
			{ component: 'GenericFormPage', section: 'family' },
			{ component: 'GenericFormPage', section: 'education' },
			{ component: 'GenericFormPage', section: 'experience' },
			{ component: 'GenericFormPage', section: 'expenses' },
			{ component: 'GenericFormPage', section: 'incomes' },
			{ component: 'GenericFormPage', section: 'contributions' },
			{ component: 'GenericFormPage', section: 'projections' },
			{ component: 'GenericFormPage', section: 'attachments' },
			{ component: 'GenericFormPage', section: 'confirmation' },
		],
		template: templateApp,
	},

	// -------------------------
	// 3. COMPLIANCE CHECK-IN
	// -------------------------
	// A shorter flow for Scholarship recipients to verify enrollment/grades.
	scholarshipRecipients: {
		title: 'Compliance Check-In',
		type: ApplicationType.scholarship,
		steps: ['Profile', 'Education', 'Attachments', 'Confirm'],
		dataCollections: [
			{ key: 'profile', collectionName: collections.profiles },
			{ key: 'education', collectionName: collections.education },
			{ key: 'attachments', collectionName: collections.attachments },
		],
		pages: [
			{ component: 'GenericFormPage', section: 'profile' },
			{ component: 'GenericFormPage', section: 'education' },
			{ component: 'GenericFormPage', section: 'attachments' },
			{ component: 'GenericFormPage', section: 'confirmation' },
		],
		// Uses a simpler template (templateApp2) which likely omits financial fields
		template: templateApp2,
	},
};
