/**
 * ACTION BUTTON CONFIGURATION
 * ---------------------------------------------------------------------------
 * This file defines the "Primary Actions" available on Single Asset Views
 * (e.g., Applicant Profile, Application Review, Member Profile).
 *
 * * HOW IT WORKS:
 * Components (like 'DynamicActionGroup') call these functions to get an array
 * of button configurations. They then render buttons based on the props provided.
 *
 * * ACTION OBJECT SCHEMA:
 * - label: Text displayed on the button.
 * - onClick: (Optional) Direct function to execute when clicked.
 * - dialogId: (Optional) ID of a modal/dialog to open (handled by the parent component).
 * - navTo: (Optional) Function returning a path object { path, params } to navigate to.
 * - hide: (Optional) Boolean to conditionally hide the button.
 */

import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../data/firebase';
import { paths } from '../navigation/paths';

// --- 1. Member Actions (Admins) ---

/**
 * Generates actions for the Admin/Member Profile view.
 * @param {Function} showAlert - Hook to display toast notifications.
 * @param {Function} handleError - Hook to parse and display errors.
 * @param {boolean} showNotes - Toggle state for the Notes section.
 * @param {Function} setShowNotes - Setter for the Notes toggle.
 * @param {boolean} showSignature - Toggle state for the Signature image.
 * @param {Function} setShowSignature - Setter for the Signature toggle.
 */
export const getMemberActions = (showAlert, handleError, showNotes, setShowNotes, showSignature, setShowSignature) => {
	return [
		{
			label: 'Send Password Reset Email',
			onClick: async (member) => {
				try {
					await sendPasswordResetEmail(auth, member.email);
					showAlert({ message: 'Reset email sent successfully.', type: 'success' });
				} catch (err) {
					handleError(err, 'resetPasswordEmail');
				}
			},
		},
		{
			label: 'Change Login Email',
			dialogId: 'changeLoginEmail', // Triggers the 'Change Email' modal
		},
		{
			label: 'Contact Member',
			navTo: () => ({
				path: paths.contactCenter,
			}),
		},
		{
			label: showNotes ? 'Hide Notes' : 'Show Notes',
			onClick: () => setShowNotes(!showNotes),
		},
		{
			label: showSignature ? 'Hide Signature' : 'Show Signature',
			onClick: () => setShowSignature(!showSignature),
		},
	];
};

// --- 2. Applicant Actions ---

/**
 * Generates actions for the Applicant Profile view.
 */
export const getApplicantActions = (showAlert, handleError, showNotes, setShowNotes) => [
	{
		label: 'Send Password Reset Email',
		onClick: async (applicant) => {
			try {
				await sendPasswordResetEmail(auth, applicant.email);
				showAlert({ message: 'Reset email sent successfully.', type: 'success' });
			} catch (err) {
				handleError(err, 'resetPasswordEmail');
			}
		},
	},
	{
		label: 'Change Login Email',
		dialogId: 'changeLoginEmail',
	},
	{
		label: 'Contact Applicant',
		navTo: () => ({
			path: paths.contactCenter,
		}),
	},
	{
		label: showNotes ? 'Hide Notes' : 'Show Notes',
		onClick: () => setShowNotes(!showNotes),
	},
];

// --- 3. Application Actions ---

/**
 * Generates actions for the Application Review view.
 * @param {Object} member - The current logged-in admin (used for permission checks).
 */
export const getApplicationActions = (showNotes, setShowNotes, member = null) => [
	{
		label: 'Change Status',
		dialogId: 'changeAppStatus', // Triggers Status Change Dialog
	},
	{
		label: 'Mark Eligibility',
		dialogId: 'markEligibility', // Triggers Eligibility Checklist
	},
	{
		label: 'Export / Reader Friendly',
		navTo: (application) => ({
			path: paths.exportApp,
			params: { id: application.id },
		}),
	},
	{
		label: 'Add Award',
		dialogId: 'addAward',
		hide: !member, // Only show if member data is loaded/available
	},
	{
		label: showNotes ? 'Hide Notes' : 'Show Notes',
		onClick: () => setShowNotes(!showNotes),
	},
];

// --- 4. Request Actions ---

/**
 * Generates actions for the Reference Request view.
 */
export const getRequestActions = (showNotes, setShowNotes) => [
	{
		label: showNotes ? 'Hide Notes' : 'Show Notes',
		onClick: () => setShowNotes(!showNotes),
	},
];
