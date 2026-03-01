/**
 * NOTIFICATION DISPATCHER
 * ---------------------------------------------------------------------------
 * This file handles the generation and queuing of system notifications (Email & SMS).
 * * * ARCHITECTURE NOTE:
 * This frontend code does NOT send emails directly. It writes "Message Requests"
 * to specific Firestore collections ('emails', 'sms').
 * Backend Cloud Functions listen to these collections and trigger the actual
 * delivery via providers like SendGrid or Twilio.
 *
 * * KEY FUNCTIONS:
 * - send(): Bulk dispatch to multiple recipients (used by Contact Center).
 * - pushNotice(): Send a specific template to a single user.
 * - sendRequest(): Specialized dispatch for Letter of Recommendation requests.
 */

import { db, getConfigFromDb } from '../data/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import { brand, emailHeader, emailFooter, unsubscribeLink, staticEmailFooter, LettersOfRecommendation } from '../Constants';
import { collections } from '../data/collections';
import { emailTemplates } from './emailTemplates';

/**
 * Enumeration of available Email Template Keys.
 * Must match keys in 'emailTemplates.js'.
 */
export const ContactTemplate = {
	incompleteReminder: 'incompleteReminder',
	appAdvancedToInterview: 'appAdvancedToInterview',
	appDenied: 'appDenied',
	appApproved: 'appApproved',
	appIncomplete: 'appIncomplete',
	appCompleted: 'appCompleted',
	appSubmitted: 'appSubmitted',
	windowClosed: 'windowClosed',
	windowClosing: 'windowClosing',
	windowOpen: 'windowOpen',
	welcome: 'welcome',
	interviewInvitation: 'interviewInvitation',
	memberActivitySummary: 'memberActivitySummary',
	incompleteCountAlert: 'incompleteCountAlert',
};

// --- Helper Functions ---

/**
 * Replaces {{handlebars}} placeholders in a string with actual data.
 * Supports nested object paths like 'award.type'.
 * * @param {string} templateString - The raw string containing {{placeholders}}.
 * @param {object} data - The data context to resolve values from.
 * @returns {string} The processed string with values inserted.
 */
const processTemplate = (templateString, data) => {
	if (!templateString) return '';
	const regex = /{{\s*([\w.]+)\s*}}/g;
	return templateString.replaceAll(regex, (match, key) => {
		const keys = key.split('.');
		let value = data;
		for (const k of keys) {
			value = value?.[k];
			if (value === undefined) return match;
		}

		if (value === null) return 'null';
		if (typeof value === 'object' && !Array.isArray(value)) return match;

		return String(value);
	});
};

/**
 * Compiles a complete message object (Subject, Text, HTML) from a template key.
 * Injects the standard Header and Footer automatically.
 * * @param {string} templateKey - The ID of the template to use.
 * @param {object} data - Dynamic data for the specific recipient.
 * @returns {Promise<object>} { subject, text, html }
 */
const generateMessage = async (templateKey, data) => {
	const template = emailTemplates[templateKey];
	if (!template) throw new Error(`Template not found for key: ${templateKey}`);

	// Combine global brand details with specific user data
	const context = { brand, ...data };

	const subject = processTemplate(template.subject, context);
	let htmlBody = processTemplate(template.html, context);

	// Add standard sign-off
	htmlBody += `<p>Best regards,<br>${brand.boardName}</p>`;

	// Create a plain text version for SMS/Accessibility
	const plainText = htmlBody
		.replaceAll(/<[^>]+>/g, ' ')
		.replaceAll(/ {2,}/g, ' ')
		.trim();

	// Wrap content with standard Branding Header & Footer (w/ Unsubscribe Link)
	const unsub = await unsubscribeLink(data.id);
	const finalHtml = emailHeader + `<main style="font-family: Arial, Helvetica, sans-serif; color: #333; padding: 5px; margin: 5px;">${htmlBody}</main>` + emailFooter(unsub);

	return { subject, text: plainText, html: finalHtml };
};

// --- Dispatch Functions ---

/**
 * Bulk dispatch function. Sends a templated message to lists of recipients.
 * Used primarily by the Admin Contact Center.
 * * @param {string} templateKey - The template to use.
 * @param {Array} to - Primary recipients [{ name, email, ...data }].
 * @param {object} from - Sender details { name, email }.
 * @param {Array} cc - CC recipients.
 * @param {Array} smsTo - SMS recipients.
 * @param {object} data - Common data shared across all messages (e.g. custom note).
 */
export const send = async (templateKey, to, from, cc, smsTo, data) => {
	try {
		// Filter out invalid contacts
		to = to.filter((email) => email?.email);
		cc = cc.filter((email) => email?.email);
		smsTo = smsTo.filter((cell) => cell?.cell);

		const ccEmails = cc.map((ccRecipient) => `${ccRecipient.name} <${ccRecipient.email}>`);
		let ccRecipients = [...ccEmails];

		// Fetch System CCs (e.g. archive email)
		const config = await getConfigFromDb();
		if (config.SYSTEM_CC_EMAILS && config.SYSTEM_CC_EMAILS.length > 0) {
			ccRecipients = [...ccRecipients, ...config.SYSTEM_CC_EMAILS];
		}

		// 1. Process Emails
		if (to.length > 0 && from) {
			for (const recipient of to) {
				// Merge general data with recipient-specific data (allows {{name}} to work)
				const messageData = { ...data, ...recipient };
				const generatedMessage = await generateMessage(templateKey, messageData);

				const email = {
					to: `${recipient.name} <${recipient.email}>`,
					from: `${from.name} <${from.email}>`,
					replyTo: config.SYSTEM_REPLY_TO,
					cc: ccRecipients,
					message: generatedMessage,
				};

				// Writing to this collection triggers the Cloud Function to send
				const emailRef = doc(collection(db, collections.emails));
				await setDoc(emailRef, email);
			}
		}

		// 2. Process SMS
		if (smsTo.length > 0) {
			for (const recipient of smsTo) {
				const messageData = { ...data, ...recipient };
				const generatedMessage = await generateMessage(templateKey, messageData);
				const sms = {
					body: generatedMessage.text,
					to: `+1${recipient.cell}`,
				};
				const smsRef = doc(collection(db, collections.sms));
				await setDoc(smsRef, sms);
			}
		}
		return { success: true };
	} catch (error) {
		console.error(error.message);
		return { success: false, error: error };
	}
};

/**
 * Generates a specialized email payload for Reference Requests (LORs).
 * This uses a hardcoded template structure rather than the dynamic `emailTemplates.js`
 * because it requires complex link/pin logic.
 */
const uploadRequest = async (data) => {
	const subject = 'Letter of Recommendation Request';
	const typeName = LettersOfRecommendation[data.attachmentType]?.name || 'Recommendation';
	const purpose = LettersOfRecommendation[data.attachmentType]?.purpose || 'support the application';

	const plainText = `\nDear ${data.name},\n\nThis is a request sent from ${brand.theOrganizationName} on behalf of ${data.fromName} for a letter of recommendation. The applicant requests you submit a(n) ${typeName} to ${purpose}. Please contact the applicant to cancel this request or follow the link to make your submission. You can only submit an upload once. Please use the following pin to complete the upload.\n\nPin: ${data.pin}\nLink: ${data.link}\nRequest Expires: ${data.expiryDate}\n\nBest regards,\n${brand.boardName}`;

	const content = `<main style="font-family: Arial, Helvetica, sans-serif; color: #333; padding: 5px; margin: 5px;">
						<h3>Letter of Recommendation Request</h3>
						<p>Dear ${data.name},</p>
						<p>This is a request sent from ${brand.theOrganizationName} on behalf of ${data.fromName} for a letter of recommendation. The applicant requests you submit a(n) ${typeName} to ${purpose}. Please contact the applicant to cancel this request or follow the link to make your submission. You can only submit an upload once. Please use the following pin to complete the upload.</p>
						<ul><li><strong>Pin:</strong> ${data.pin}</li>
						<li><strong>Link:</strong> <a href="${data.link}">Ready to Submit?</a></li>
						<li><strong>Request Expires:</strong> ${data.expiryDate}</li></ul>
						<p>If you have any questions or need help, don't hesitate to reach out to us at <a href="mailto:${brand.contactEmail}">${brand.contactEmail}</a>.</p>
						<p>Best regards,<br>
						${brand.boardName}</p>
					</main>`;

	const htmlContent = emailHeader + content + staticEmailFooter;
	return { subject, text: plainText, html: htmlContent };
};

/**
 * Dispatches a Letter of Recommendation Request email.
 */
export const sendRequest = async (request, link, pin) => {
	try {
		const config = await getConfigFromDb();
		const email = {
			to: `${request.name} <${request.email}>`,
			from: config.SYSTEM_EMAIL,
			replyTo: config.SYSTEM_REPLY_TO,
			cc: config.SYSTEM_CC_EMAILS,
			message: await uploadRequest({ ...request, link, pin }),
		};

		const emailRef = doc(collection(db, collections.emails));
		await setDoc(emailRef, email);
	} catch (error) {
		console.error(error.message);
	}
};

/**
 * Sends a single notification to a specific user (System Alert).
 * Used for automated triggers (e.g., "Application Submitted" confirmation).
 */
export const pushNotice = async (templateKey, user, data) => {
	try {
		const config = await getConfigFromDb();
		const messageData = { ...data, ...user };
		const generatedMessage = await generateMessage(templateKey, messageData);

		const email = {
			to: `${user.firstName} ${user.lastName} <${user.email}>`,
			from: config.SYSTEM_EMAIL,
			replyTo: config.SYSTEM_REPLY_TO,
			cc: config.SYSTEM_CC_EMAILS,
			message: generatedMessage,
		};

		const emailRef = doc(collection(db, collections.emails));
		await setDoc(emailRef, email);
	} catch (error) {
		console.error(error.message);
	}
};

// --- UI Configuration ---

/**
 * Defines which templates are visible in the Admin "Contact Center".
 * Grouped by category for the dropdown menu.
 */
export const templates = [
	{
		title: 'Canned Notifications',
		options: [
			{ name: ContactTemplate.welcome, label: 'Welcome Email' },
			{ name: ContactTemplate.memberActivitySummary, label: 'Activity Summary' },
		],
	},
	{
		title: 'Reminders',
		options: [
			{ name: ContactTemplate.incompleteReminder, label: 'App Incomplete Reminder' },
			{ name: ContactTemplate.interviewInvitation, label: 'Interview Invitation' },
			{ name: ContactTemplate.incompleteCountAlert, label: 'Incomplete App Summary Alert' },
		],
	},
	{
		title: 'Deadline',
		options: [
			{ name: ContactTemplate.windowClosed, label: 'Window Closed' },
			{ name: ContactTemplate.windowClosing, label: 'Window Closing' },
			{ name: ContactTemplate.windowOpen, label: 'Window Open' },
		],
	},
	{
		title: 'Application Status',
		options: [
			{ name: ContactTemplate.appAdvancedToInterview, label: 'App Advanced To Interview' },
			{
				name: ContactTemplate.appDenied,
				label: 'App Denied',
				requiredFields: [{ label: 'Denial Reason', name: 'reason', type: 'text' }],
			},
			{
				name: ContactTemplate.appApproved,
				label: 'App Approved',
				requiredFields: [
					{ label: 'Award Type', name: 'award.type', type: 'text' },
					{ label: 'Award Amount', name: 'award.amount', type: 'text' },
					{ label: 'Follow Up Note', name: 'award.followUp', type: 'text' },
				],
			},
			{ name: ContactTemplate.appIncomplete, label: 'App Incomplete' },
			{ name: ContactTemplate.appCompleted, label: 'App Completed' },
			{ name: ContactTemplate.appSubmitted, label: 'App Submitted' },
		],
	},
];
