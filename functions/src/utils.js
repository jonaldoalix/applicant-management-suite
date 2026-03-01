const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const path = require('path');
const os = require('os');
const fs = require('fs');

dayjs.extend(timezone);
dayjs.extend(utc);

const { brand, configKeys, templates, collections } = require('./config');

// ==================================================================
//  CONFIGURATION & SEARCH UTILITIES
// ==================================================================

/**
 * Retrieves dynamic site configuration from Firestore.
 * Falls back to defaults if config doc is missing.
 */
const getConfigFromDb = async () => {
	const db = admin.firestore();
	const configDoc = await db.collection(collections.siteConfig).doc(configKeys.configVersionId).get();

	if (configDoc.exists) {
		return configDoc.data();
	}

	console.error('Site configuration not found! Using defaults.');
	return {
		SYSTEM_EMAIL: `"${brand.organizationShortName}" <${brand.systemEmail}>`,
		SYSTEM_REPLY_TO: `"${brand.organizationShortName}" <${brand.systemEmail}>`,
		SYSTEM_CC_EMAILS: [],
	};
};

/**
 * Generates search tokens (partial strings) for search bar.
 * Splits by spaces, dots, dashes, underscores.
 * @param {string[]} inputs - Array of strings to tokenize.
 */
const generateSearchTokens = (inputs = []) => {
	const tokens = new Set();
	const delimiterRegex = /[ @.\-_]/;

	for (const input of inputs) {
		if (typeof input !== 'string' || !input) continue;

		const lowerInput = input.toLowerCase();
		tokens.add(lowerInput);

		const parts = lowerInput.split(delimiterRegex);
		for (const part of parts) {
			if (!part) continue;
			for (let i = 1; i <= part.length; i++) {
				tokens.add(part.substring(0, i));
			}
		}
	}
	return Array.from(tokens);
};

/**
 * Replaces {{placeholder}} in strings with actual data.
 * Supports nested keys (e.g., {{user.profile.name}}).
 */
const processTemplate = (templateString, data) => {
	if (!templateString) return '';
	const regex = /{{\s*([\w.]+)\s*}}/g;

	return templateString.replace(regex, (match, key) => {
		const keys = key.split('.');
		let value = data;
		try {
			for (const k of keys) {
				if (value === null || value === undefined) return match;
				value = value[k];
			}
			return value === undefined || value === null ? '' : String(value);
		} catch (e) {
			console.warn(`Error processing template key "${key}":`, e.message);
			return match;
		}
	});
};

// ==================================================================
//  CALENDAR & FILE UTILITIES
// ==================================================================

/**
 * Generates an iCalendar (.ics) string.
 */
const generateICSFile = (startDate, endDate, title, description, url) => {
	const format = (date) => dayjs(date).utc().format('YYYYMMDDTHHmmss[Z]');

	const ics = `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AMS//Interview Scheduler//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${url}
DTSTAMP:${format(new Date())}
DTSTART:${format(startDate)}
DTEND:${format(endDate)}
SUMMARY:${title}
DESCRIPTION:${description}
LOCATION:${url}
END:VEVENT
END:VCALENDAR`.trim();

	// Enforce CRLF line endings required by ICS standard
	return ics.replace(/\n/g, '\r\n');
};

/**
 * Uploads string content (like .ics) to Firebase Storage.
 * Returns public download URL.
 */
const uploadICSFile = async (interviewId, calendarContent) => {
	const bucket = admin.storage().bucket();
	const fileName = `interview-invites/${interviewId}.ics`;
	const tempPath = path.join(os.tmpdir(), `${interviewId}.ics`);
	const token = uuidv4();

	fs.writeFileSync(tempPath, calendarContent, 'utf8');

	await bucket.upload(tempPath, {
		destination: fileName,
		metadata: {
			contentType: 'text/calendar',
			metadata: {
				firebaseStorageDownloadTokens: token,
			},
		},
	});

	fs.unlinkSync(tempPath);

	return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
};

// ==================================================================
//  EMAIL LOGIC HELPERS
// ==================================================================

/**
 * Orchestrates sending a single interview invitation.
 * Fetches data, generates ICS, builds email, queues in Firestore.
 */
const sendSingleInvitationHelper = async (interviewId, db, config) => {
	const interviewRef = db.collection(collections.interviews).doc(interviewId);
	const interviewDoc = await interviewRef.get();

	if (!interviewDoc.exists) return false;

	const interviewData = interviewDoc.data();
	const applicantDoc = await db.collection(collections.applicants).doc(interviewData.applicantId).get();

	if (!applicantDoc.exists) return false;

	const applicant = applicantDoc.data();

	// Update Application Status (if linked)
	if (interviewData.applicationId) {
		const appRef = db.collection(collections.applications).doc(interviewData.applicationId);
		await appRef.update({ status: 'Invited' });
	}

	// Generate Calendar Invite
	const start = interviewData.startTime.toDate();
	const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min duration
	const waitingRoomURL = `${brand.url}/interviews/waiting-room/${interviewId}`;

	const icsContent = generateICSFile(start, end, `Interview with ${brand.organizationShortName}`, `Interview regarding your application.`, waitingRoomURL);

	const icsUrl = await uploadICSFile(interviewId, icsContent);

	// Build Email
	const emailData = {
		to: `${applicant.firstName} ${applicant.lastName} <${applicant.email}>`,
		from: config.SYSTEM_EMAIL,
		replyTo: config.SYSTEM_REPLY_TO,
		cc: config.SYSTEM_CC_EMAILS,
		message: templates.interviewInvitation(brand, {
			waitingRoomURL,
			icsDownloadLink: icsUrl,
			name: applicant.firstName,
			interviewDate: new Date(start).toLocaleDateString('en-US', { timeZone: 'America/New_York' }),
			interviewTime: new Date(start).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true }),
			interviewId,
		}),
	};

	// Queue Email & Update Status
	await db.collection(collections.emails).add(emailData);
	await interviewRef.update({ status: 'Invited' });

	return true;
};

module.exports = {
	getConfigFromDb,
	generateSearchTokens,
	processTemplate,
	generateICSFile,
	uploadICSFile,
	sendSingleInvitationHelper,
};
