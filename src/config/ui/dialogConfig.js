/**
 * DIALOG & MODAL CONFIGURATION
 * ---------------------------------------------------------------------------
 * This file defines the content and structure of the application's modal dialogs.
 * * HOW IT WORKS:
 * The 'DialogContext' or 'useDialog' hook reads these configurations to render
 * standard headers, warning messages, and input forms dynamically.
 *
 * * CONFIGURATION SCHEMA:
 * - title: The header text of the modal.
 * - message: Instructional or warning text displayed in the body.
 * - actionLabel: The text for the primary "Confirm/Submit" button.
 * - inputs: (Optional) Array of form fields to render inside the dialog.
 * - type: 'text' | 'select' | 'switch' | 'multiline'
 * - name: The key used in the submitted data object.
 * - label: Floating label text.
 * - options: (For 'select') Array of { value, label }.
 * - condition: (Optional) Function (data) => boolean to toggle visibility.
 * - actions: (Optional) Array of custom buttons if standard Cancel/Submit isn't enough.
 */

import { ApplicationStatus, InterviewStatus, UserType } from '../data/collections';

export const dialogConfig = {
	// --- 1. General & Safety ---
	confirmAction: {
		title: 'Please Confirm Action',
		message: 'Are you sure you want to proceed? This action cannot be undone.',
		actionLabel: 'Confirm',
	},
	adminActionConfirmation: {
		title: 'Confirm Administrative Action',
		message: 'Are you sure you want to proceed with this action?',
		actionLabel: 'Execute',
	},

	// --- 2. Application Management ---
	markEligibility: {
		title: 'Mark Eligibility',
		message: 'Did you want to make this applicant eligible for the interview process? If so, make sure everything is in order and click eligible or not eligible below.',
		actions: [
			{ label: 'Ineligible', value: ApplicationStatus.ineligible, color: 'error' },
			{ label: 'Eligible', value: ApplicationStatus.eligible, color: 'success' },
		],
	},
	changeAppStatus: {
		title: 'Change App Status',
		message: 'Did you want to manually change the status of this application? Choose a new status and click update if so.',
		inputs: [
			{
				type: 'select',
				label: 'App Status',
				name: 'status',
				options: Object.keys(ApplicationStatus).map((key) => ({
					value: ApplicationStatus[key],
					label: ApplicationStatus[key],
				})),
				defaultValue: '',
			},
		],
		actionLabel: 'Update Status',
	},
	addAward: {
		title: 'Award Details',
		message: 'Enter details for the award you wish to assign.',
		inputs: [
			{
				type: 'select',
				label: 'Award Type',
				name: 'awardName',
				options: [
					{ value: 'One Time Grant', label: 'One Time Grant' },
					{ value: 'Scholarship Installment', label: 'Scholarship Installment' },
				],
				defaultValue: 'One Time Grant',
			},
			{
				type: 'text',
				label: 'Award Amount (USD)',
				name: 'awardAmount',
			},
			{
				type: 'text',
				label: 'Award Message (Internal)',
				name: 'followUp',
			},
		],
		actionLabel: 'Add Award',
	},

	// --- 3. User & Profile Management ---
	changeLoginEmail: {
		title: 'New Username Email',
		message: "Changing the username email address will change this user's log in credentials. To change the email address we have on file for communications, update the applicant profile directly.",
		inputs: [{ type: 'text', label: 'New Login Email', name: 'newEmail' }],
		actionLabel: 'Update Login Email',
	},
	notificationsUpdate: {
		title: 'Notifications Settings',
		message: 'Changing this will impact your ability to get timely notifications. Urgent notifications will always override these settings.',
		inputs: [
			{ type: 'switch', label: 'Email Notifications', name: 'email' },
			{ type: 'switch', label: 'SMS Notifications', name: 'sms' },
			{ type: 'text', label: 'Display Name', name: 'callMe' },
			// Only show forwarding option for Admins (Members), not Applicants
			{ type: 'switch', label: 'Forward Emails', name: 'forwardingEnabled', condition: (data) => data.userType !== UserType.applicant },
		],
		actionLabel: 'Save Settings',
	},
	requestRecommendation: {
		title: 'Request Recommendation',
		message: 'To have your recommender upload the letter for you, enter their details below and we will send them an email to begin the process. To view the status of this in the future, review your application.',
		inputs: [
			{ type: 'text', label: 'Who is writing the recommendation?', name: 'name' },
			{ type: 'text', label: 'What is their email address?', name: 'email' },
			{ type: 'text', label: 'How do they know you?', name: 'relation' },
			{ type: 'text', label: 'Who should we say this is for?', name: 'fromName' },
		],
		actionLabel: 'Send Request',
	},

	// --- 4. Interviews & Scheduling ---
	changeInterviewStatus: {
		title: 'Change Interview Status',
		message: 'Select a new status for this interview. This may trigger other actions like creating or closing the video room.',
		inputs: [
			{
				type: 'select',
				label: 'Interview Status',
				name: 'status',
				options: Object.values(InterviewStatus).map((status) => ({
					value: status,
					label: status,
				})),
				defaultValue: '',
			},
		],
		actionLabel: 'Update Status',
	},
	updateRsvpStatus: {
		title: 'Update RSVP Status',
		message: 'Manually set the RSVP status for this interview.',
		inputs: [
			{
				type: 'select',
				label: 'RSVP Status',
				name: 'rsvpStatus',
				options: [
					{ value: 'yes', label: 'Yes' },
					{ value: 'no', label: 'No' },
					{ value: 'unknown', label: 'Unknown' },
				],
				defaultValue: 'unknown',
			},
		],
		actionLabel: 'Update RSVP',
	},
	deleteInterviewSlot: {
		title: 'Delete Interview Slot',
		message: 'Are you sure you want to delete this interview slot? This action cannot be undone.',
		actionLabel: 'Delete',
	},
	autoScheduleInterviews: {
		title: 'Auto-Schedule Interviews',
		message: 'This will attempt to match eligible applicants to open slots based on availability.',
		actionLabel: 'Run Scheduler',
	},
	manualScheduleInterview: {
		title: 'Manually Schedule an Interview',
		// Inputs typically handled by the custom component rendering this dialog
		actionLabel: 'Schedule',
	},
	rescheduleInterview: {
		title: 'Reschedule Interview',
		actionLabel: 'Confirm New Time',
	},

	// --- 5. Communications ---
	contactDialog: {
		title: 'Send a Message',
		// Typically renders the 'Messaging' component inside
	},
	customMessage: {
		title: 'Compose a Custom Message',
		inputs: [
			{ type: 'text', name: 'subject', label: 'Email Subject' },
			{ type: 'text', name: 'emailBody', label: 'Email HTML Body', multiline: true, rows: 10 },
			{ type: 'text', name: 'smsBody', label: 'SMS Text Body', multiline: true, rows: 3 },
		],
		actionLabel: 'Send Message',
	},
	templatedMessage: {
		title: 'Complete Message Template',
		actionLabel: 'Send Templated Message',
	},

	// --- 6. System & Maintenance (Destructive) ---
	purgeUserData: {
		title: 'Purge User Data',
		message: 'Select an applicant to permanently delete all their associated records. If you choose to expel them, their login credentials will also be deleted. This action is irreversible.',
		actionLabel: 'Remove User',
		inputs: [
			{
				name: 'userId',
				label: 'Select Applicant to Purge',
				type: 'select',
				options: [], // Populated dynamically at runtime
			},
			{
				name: 'expel',
				label: 'Remove user from system (deletes login)',
				type: 'switch',
				defaultValue: false,
			},
		],
	},
	wipeCollections: {
		title: 'Wipe Collections',
		message: 'Select the database you wish to wipe. This action deletes all records in the collections and is irreversible.',
		actionLabel: 'Wipe Database',
	},
};
