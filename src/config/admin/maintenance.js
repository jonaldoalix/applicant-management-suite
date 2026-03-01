/**
 * ADMIN MAINTENANCE FUNCTIONS
 * ---------------------------------------------------------------------------
 * Defines the system maintenance tools and database scripts available to Admins.
 * Maps UI definitions to backend Firebase functions.
 */

import { purgeUserRecords, sendToTestDB, wipeCollections, backfillLastUpdated, backfillSentEmailTags, backfillSearchableTerms, backfillEmailContent } from '../data/firebase';

export const adminActions = {
	purgeUserData: purgeUserRecords,
	sendToTestDB: sendToTestDB,
	wipeCollections: wipeCollections,
	backfillLastUpdated: backfillLastUpdated,
	backfillSentEmailTags: backfillSentEmailTags,
	backfillSearchableTerms: backfillSearchableTerms,
	backfillEmailContent: backfillEmailContent,
};

export const adminFunctions = [
	// -------------------------
	// CRITICAL DESTRUCTIVE TOOLS
	// -------------------------
	{
		id: 'purgeUserData',
		label: 'Purge All User Data',
		description: 'PERMANENTLY deletes a user and all associated records (profiles, applications, attachments, etc.) from the database. This action is irreversible.',
		action: adminActions.purgeUserData,
		parameters: [
			{ name: 'userId', label: 'Select Applicant to Purge', type: 'select', required: true },
			{ name: 'expel', label: 'Remove user from system (deletes login)', type: 'switch', defaultValue: false },
		],
	},
	{
		id: 'wipeCollections',
		label: 'Wipe Collections',
		description: 'Deletes all collections in the selected database. This action is irreversible. USE WITH EXTREME CAUTION.',
		action: adminActions.wipeCollections,
		parameters: [
			{
				name: 'conn',
				label: 'Which database should be wiped?',
				type: 'select',
				options: [
					{ value: '(default)', label: 'Production DB' },
					{ value: 'ams-test', label: 'Test DB' },
				],
				required: true,
			},
		],
	},

	// -------------------------
	// DATA MIGRATION & TESTING
	// -------------------------
	{
		id: 'send-to-test-db',
		label: 'Copy Data to Test DB',
		description: 'Overwrites the Test Database with a snapshot of current Production data for safe testing.',
		action: adminActions.sendToTestDB,
		parameters: [],
	},

	// -------------------------
	// BACKFILL & MAINTENANCE
	// -------------------------
	{
		id: 'backfill-last-updated',
		label: 'Backfill "Last Updated"',
		description: 'Scans application records. If "lastUpdated" is missing, it populates it using the legacy "dated" field.',
		action: adminActions.backfillLastUpdated,
		parameters: [],
	},
	{
		id: 'backfill-sent-email-tags',
		label: 'Backfill Sent Email Tags',
		description: 'Scans the "sent_emails" collection and applies categorization tags (e.g. "To Applicant", "System") based on recipient aliases.',
		action: adminActions.backfillSentEmailTags,
		parameters: [],
	},
	{
		id: 'backfill-searchable-terms',
		label: 'Backfill Searchable Terms',
		description: 'Regenerates the "searchableTerms" array for all records. Run this if Search is failing to find known records.',
		action: adminActions.backfillSearchableTerms,
		parameters: [],
	},
	{
		id: 'backfill-email-content',
		label: 'Backfill Email Content',
		description: 'Fetches full HTML content for stored emails that may have only cached headers. Useful after importing external email logs.',
		action: adminActions.backfillEmailContent,
		parameters: [],
	},
];
