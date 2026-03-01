/**
 * EMAIL ACTION CONTROLLER
 * ---------------------------------------------------------------------------
 * This hook manages the logic for Replying, Replying All, and Forwarding emails.
 *
 * * RESPONSIBILITIES:
 * 1. Data Normalization: Converts messy API responses (Zoho/Firestore) into a standard format.
 * 2. Recipient Calculation: For "Reply All", filters out the current user's email.
 * 3. Thread Generation: Creates the "On [Date], [User] wrote:" quoted body.
 * 4. Navigation: Redirects to the Compose page with pre-filled state.
 *
 * * USAGE:
 * const { handleReply, handleReplyAll } = useEmailActions({ navigate, member });
 * <Button onClick={() => handleReply(email)} />
 */

import { brand } from '../config/Constants';
import { paths } from '../config/navigation/paths';

// =============================================================================
//  HELPER UTILITIES
// =============================================================================

/**
 * Safely extracts an email address from a "Name <email@domain.com>" string.
 * @param {string} addressString - The raw address string.
 * @returns {string} The extracted email, or the original string if no email is found.
 */
const extractEmail = (addressString = '') => {
	if (!addressString) return '';
	// If it's already just an email (no brackets), return it
	if (!addressString.includes('<')) return addressString.trim();

	const regex = /<([^>]+)>/;
	const match = regex.exec(addressString);
	return match ? match[1].trim() : addressString.trim();
};

/**
 * Safely extracts a list of email addresses from varied inputs.
 * @param {string|string[]} addressData - The raw data (string or array of strings).
 * @returns {string[]} An array of clean email strings.
 */
const extractEmailList = (addressData) => {
	if (!addressData) return [];
	const list = Array.isArray(addressData) ? addressData : [addressData];
	return list.map(extractEmail).filter(Boolean);
};

/**
 * Normalizes email data from various sources (raw fetch vs. DB cache).
 * * Why is this needed?
 * Firestore cache often flattens structures, while live API calls nest them.
 * This function guarantees a consistent interface for the UI.
 * @param {object} email - The email object.
 * @returns {object} { id, subject, fromFull, fromEmail, to, cc, date, content }
 */
const normalizeEmailData = (email) => {
	// Check for the *two* possible header locations
	const rawHeader = email.headerContent || {}; // Structure 1 (List View)
	const cachedHeader = rawHeader.headerContent || rawHeader; // Structure 2 (Card View)

	// Helper to get a single value (string)
	// Tries Card structure, then List structure, then flat property as fallback
	const getVal = (key, fallbackKey) => {
		const cardVal = cachedHeader[key]?.[0];
		const listVal = rawHeader[key]?.[0];
		const flatVal = email[fallbackKey];
		return cardVal || listVal || flatVal || '';
	};

	// Helper to get a list of values (array)
	const getList = (key, fallbackKey) => {
		const data = cachedHeader[key] || rawHeader[key] || email[fallbackKey];
		return Array.isArray(data) ? data : [data].filter(Boolean);
	};

	const fromString = getVal('From', 'sender');

	return {
		id: email.id,
		subject: getVal('Subject', 'subject') || 'No Subject',
		fromFull: fromString || 'Unknown',
		fromEmail: extractEmail(fromString),
		to: getList('To', 'to'),
		cc: getList('Cc', 'cc'),
		date: new Date(getVal('Date', 'timestamp') || Date.now()).toLocaleString(),
		content: email.content || email.body || '',
	};
};

/**
 * Creates the quoted HTML body for a reply or forward.
 * @param {object} normalizedEmail - The standardized email object.
 * @param {string} actionType - 'reply' or 'forward'.
 * @returns {string} The quoted HTML string.
 */
const createQuotedBody = (normalizedEmail, actionType) => {
	const { fromFull, date, subject, to, content } = normalizedEmail;
	const toStr = Array.isArray(to) ? to.join(', ') : to;

	const quoteHeader = actionType === 'forward' ? `---------- Forwarded message ---------<br>From: ${fromFull}<br>Date: ${date}<br>Subject: ${subject}<br>To: ${toStr}<br>` : `--- On ${date}, ${fromFull} wrote: ---<br>`;

	return `
        <br><br>
        <div style="background-color: #f0f0f0; color: #333; padding: 10px; border-radius: 4px; border-left: 3px solid #ccc;">
            ${quoteHeader}
            <blockquote style="margin: 10px 0 0 5px; padding-left: 10px;">
                ${content}
            </blockquote>
        </div>
    `;
};

// =============================================================================
//  HOOK DEFINITION
// =============================================================================

export const useEmailActions = ({ navigate, permittedAliases, member }) => {
	const getFromEmail = () => {
		return member?.alias || (permittedAliases?.[0] ? `${permittedAliases[0]}@${brand.emailDomain}` : '');
	};

	const handleReply = (email) => {
		if (!email?.id) return;

		const data = normalizeEmailData(email);

		const navState = {
			title: 'Reply To Email',
			to: [data.fromEmail].filter(Boolean),
			subject: data.subject.startsWith('Re:') ? data.subject : `Re: ${data.subject}`,
			htmlPreview: createQuotedBody(data, 'reply'),
			originalMessageId: String(email.id),
			fromAddress: getFromEmail(),
			maxWidth: 'lg',
		};

		navigate(paths.composeEmail, { state: navState });
	};

	const handleReplyAll = (email) => {
		if (!email?.id) return;

		const data = normalizeEmailData(email);

		const from = data.fromEmail;
		const toList = extractEmailList(data.to);
		const ccList = extractEmailList(data.cc);

		// Logic: Filter out the current user's emails so they don't reply to themselves
		const currentUserEmails = [member?.email, member?.alias].filter(Boolean).map((e) => extractEmail(e).toLowerCase());
		const allRecipients = new Set([from, ...toList, ...ccList].map((e) => e.toLowerCase()));

		for (const userEmail of currentUserEmails) {
			allRecipients.delete(userEmail);
		}

		const toArray = Array.from(allRecipients).filter(Boolean); // Final cleanup

		const navState = {
			title: 'Reply to All',
			to: toArray, // Pass as an array
			cc: [], // Reply All usually puts everyone in TO (standard practice)
			subject: data.subject.startsWith('Re:') ? data.subject : `Re: ${data.subject}`,
			htmlPreview: createQuotedBody(data, 'reply'),
			originalMessageId: String(email.id),
			fromAddress: getFromEmail(),
			maxWidth: 'lg',
		};

		navigate(paths.composeEmail, { state: navState });
	};

	const handleForward = (email) => {
		if (!email?.id) return;

		const data = normalizeEmailData(email);

		const navState = {
			title: 'Forward Email',
			to: [],
			cc: [],
			bcc: [],
			subject: data.subject.startsWith('Fwd:') ? data.subject : `Fwd: ${data.subject}`,
			htmlPreview: createQuotedBody(data, 'forward'),
			originalMessageId: String(email.id),
			fromAddress: getFromEmail(),
			maxWidth: 'lg',
		};

		navigate(paths.composeEmail, { state: navState });
	};

	return { handleReply, handleReplyAll, handleForward };
};