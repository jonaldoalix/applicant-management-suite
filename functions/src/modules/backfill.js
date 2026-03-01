const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const axios = require('axios');
const dayjs = require('dayjs');

const { generateSearchTokens } = require('../utils');

// ==================================================================
//  INTERNAL HELPER FUNCTIONS (Zoho Specific)
// ==================================================================

const getZohoAccessToken = async () => {
	const params = new URLSearchParams({
		refresh_token: process.env.ZOHO_REFRESHTOKEN,
		client_id: process.env.ZOHO_CLIENTID,
		client_secret: process.env.ZOHO_CLIENTSECRET,
		grant_type: 'refresh_token',
	});

	try {
		const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', params);
		return response.data.access_token;
	} catch (error) {
		console.error('Error fetching Zoho token:', error.response?.data);
		throw new HttpsError('internal', 'Zoho authentication failed.');
	}
};

const _getZohoFolders = async (accessToken, accountId) => {
	try {
		const response = await axios.get(`https://mail.zoho.com/api/accounts/${accountId}/folders`, {
			headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
		});
		return response.data.data.map((folder) => ({
			folderId: folder.folderId,
			folderName: folder.folderName,
		}));
	} catch (error) {
		throw new Error('Failed to fetch Zoho folders.');
	}
};

const _getZohoTags = async (accessToken, accountId) => {
	try {
		const response = await axios.get(`https://mail.zoho.com/api/accounts/${accountId}/labels`, {
			headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
		});
		const tagMap = new Map();
		if (response.data.data) {
			response.data.data.forEach((tag) => {
				tagMap.set(tag.labelId, tag.displayName);
			});
		}
		return tagMap;
	} catch (error) {
		throw new Error('Failed to fetch Zoho tags.');
	}
};

// ==================================================================
//  EXPORTED FUNCTIONS
// ==================================================================

// Backfill Last Updated
// Migration Script: Ensures all applications have a 'lastUpdated' field, using 'dated' as fallback.
exports.backfillLastUpdated = onCall(async (request) => {
	if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');

	const db = admin.firestore();
	const member = await db.doc(`members/${request.auth.uid}`).get();
	if (!member.data()?.permissions?.admin) throw new HttpsError('permission-denied', 'Admin only.');

	console.log('Starting LastUpdated backfill...');
	const appsRef = db.collection('applications');
	const snapshot = await appsRef.get();

	if (snapshot.empty) return { success: true, message: 'No applications found.', updatedCount: 0 };

	const batchArray = [db.batch()];
	let operationCounter = 0;
	let batchIndex = 0;
	let updatedCount = 0;

	snapshot.forEach((doc) => {
		const appData = doc.data();
		if (appData.dated && appData.lastUpdated === undefined) {
			const docRef = appsRef.doc(doc.id);
			batchArray[batchIndex].update(docRef, { lastUpdated: appData.dated });

			operationCounter++;
			updatedCount++;

			if (operationCounter === 499) {
				batchArray.push(db.batch());
				batchIndex++;
				operationCounter = 0;
			}
		}
	});

	if (updatedCount > 0) {
		await Promise.all(batchArray.map((batch) => batch.commit()));
	}

	return {
		success: true,
		message: `Updated ${updatedCount} applications.`,
		updatedCount,
	};
});

// Backfill Sent Email Tags
// Scans the Zoho "Sent" folder and retroactively applies tags based on the "From" alias.
exports.backfillSentEmailTags = onCall({ timeoutSeconds: 300, memory: '1GB' }, async (request) => {
	if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');

	const db = admin.firestore();
	const member = await db.doc(`members/${request.auth.uid}`).get();
	if (!member.data()?.permissions?.admin) throw new HttpsError('permission-denied', 'Admin only.');

	try {
		const accessToken = await getZohoAccessToken();
		const accountId = process.env.ZOHO_ACCOUNTID;

		// 1. Get Folders & Tags
		const allFolders = await _getZohoFolders(accessToken, accountId);
		const sentFolder = allFolders.find((f) => f.folderName.toLowerCase() === 'sent');
		if (!sentFolder) throw new HttpsError('not-found', "Could not find 'Sent' folder.");

		const allTagsMap = await _getZohoTags(accessToken, accountId);
		const aliasToTagId = new Map();
		allTagsMap.forEach((name, id) => aliasToTagId.set(name.toLowerCase(), id));

		// 2. Fetch Sent Emails
		let allSentEmails = [];
		let hasMore = true;
		let start = 0;
		const apiHeaders = { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } };

		while (hasMore) {
			const res = await axios.get(`https://mail.zoho.com/api/accounts/${accountId}/messages/view`, {
				...apiHeaders,
				params: { folderId: sentFolder.folderId, start, limit: 200 },
			});

			const data = res.data.data;
			if (data && data.length > 0) {
				allSentEmails = allSentEmails.concat(data);
				start += data.length;
				hasMore = data.length === 200;
			} else {
				hasMore = false;
			}
		}

		// 3. Map Emails to Tags
		const tagUpdates = new Map(); // TagID -> [MessageIDs]

		allSentEmails.forEach((email) => {
			if (!email.fromAddress) return;

			// Extract alias (e.g., "help" from "help@domain.com")
			let alias = null;
			const match = email.fromAddress.match(/<([^>]+)>/);
			const cleanAddr = match ? match[1] : email.fromAddress;
			if (cleanAddr.includes('@')) alias = cleanAddr.split('@')[0].toLowerCase();

			if (alias) {
				const tagId = aliasToTagId.get(alias);
				// Apply if tag exists and isn't already applied
				if (tagId && !(email.labelId || []).includes(tagId)) {
					if (!tagUpdates.has(tagId)) tagUpdates.set(tagId, []);
					tagUpdates.get(tagId).push(email.messageId);
				}
			}
		});

		// 4. Execute Updates
		const promises = [];
		const url = `https://mail.zoho.com/api/accounts/${accountId}/updatemessage`;

		tagUpdates.forEach((msgIds, tagId) => {
			// Zoho batch limit handling (chunking by 100)
			for (let i = 0; i < msgIds.length; i += 100) {
				const batch = msgIds.slice(i, i + 100);
				promises.push(
					axios.put(
						url,
						{
							mode: 'applyLabel',
							messageId: batch,
							labelId: [tagId],
						},
						apiHeaders
					)
				);
			}
		});

		await Promise.all(promises);
		return { success: true, message: `Processed ${allSentEmails.length} emails. Tags updated.` };
	} catch (error) {
		console.error('Backfill Error:', error);
		throw new HttpsError('internal', 'Backfill failed check logs.');
	}
});

// Backfill Searchable Terms
// Re-indexes all major collections to populate the 'searchableTerms' array.
exports.backfillSearchableTerms = onCall({ timeoutSeconds: 540, memory: '1GB' }, async (request) => {
	if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');

	const db = admin.firestore();
	const member = await db.doc(`members/${request.auth.uid}`).get();
	if (!member.data()?.permissions?.admin) throw new HttpsError('permission-denied', 'Admin only.');

	let batch = db.batch();
	let ops = 0;

	const commitBatch = async () => {
		if (ops > 0) {
			await batch.commit();
			batch = db.batch();
			ops = 0;
		}
	};

	const processCollection = async (collName, extractorFn) => {
		const snap = await db.collection(collName).get();
		for (const doc of snap.docs) {
			const terms = extractorFn(doc.data());
			batch.update(doc.ref, { searchableTerms: terms });
			ops++;
			if (ops >= 400) await commitBatch();
		}
		console.log(`Indexed ${collName}`);
	};

	try {
		await processCollection('members', (d) => generateSearchTokens([d.firstName, d.lastName, d.email, d.cell, d.position, `${d.firstName} ${d.lastName}`, d.alias]));

		await processCollection('applicants', (d) => generateSearchTokens([d.firstName, d.lastName, d.email, d.cell, d.school, d.major, d.organization, `${d.firstName} ${d.lastName}`]));

		await processCollection('applications', (d) => generateSearchTokens([d.type, d.status]));

		await processCollection('mail_cache', (d) => generateSearchTokens([d.to, d.sender, d.subject, ...(d.tags || [])]));

		await processCollection('attachments', (d) => {
			const names = Object.values(d)
				.filter((v) => v && v.displayName)
				.map((v) => v.displayName);
			return generateSearchTokens(names);
		});

		await processCollection('families', (d) => {
			const vals = (d.familyMembers || []).flatMap((m) => [m.fullName, m.occupation]);
			return generateSearchTokens(vals);
		});

		await processCollection('educationRecords', (d) => {
			let year = null;
			if (d.expectedGraduationDate) {
				const dt = dayjs(d.expectedGraduationDate.toDate ? d.expectedGraduationDate.toDate() : d.expectedGraduationDate);
				if (dt.isValid()) year = dt.format('YYYY');
			}
			return generateSearchTokens([year, d.major, d.schoolName, ...(d.previousSchools || [])]);
		});

		await processCollection('experienceRecords', (d) => {
			const vals = (d.positions || []).flatMap((p) => [p.organization, p.role, p.location]);
			return generateSearchTokens(vals);
		});

		await processCollection('profiles', (d) => generateSearchTokens([d.applicantCellPhone, d.applicantEmailAddress, d.applicantFirstName, d.applicantLastName, `${d.applicantFirstName} ${d.applicantLastName}`]));

		await processCollection('requests', (d) => generateSearchTokens([d.email, d.name]));

		await commitBatch();
		return { success: true, message: 'Re-indexing complete.' };
	} catch (error) {
		console.error('Search Backfill Failed:', error);
		throw new HttpsError('internal', 'Re-indexing failed.');
	}
});

// Backfill Email Content
// Iterates through cached emails that are missing body content and fetches it from Zoho.
exports.backfillEmailContent = onCall({ timeoutSeconds: 540, memory: '1GB' }, async (request) => {
	if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');

	const db = admin.firestore();
	const member = await db.doc(`members/${request.auth.uid}`).get();
	if (!member.data()?.permissions?.admin) throw new HttpsError('permission-denied', 'Admin only.');

	try {
		const accessToken = await getZohoAccessToken();
		const accountId = process.env.ZOHO_ACCOUNTID;
		const apiHeaders = { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } };

		// Fetch emails missing content
		const snapshot = await db.collection('mail_cache').get();

		let batch = db.batch();
		let ops = 0;
		let updatedCount = 0;

		for (const doc of snapshot.docs) {
			const data = doc.data();
			// Skip if content exists or folderId is missing
			if (data.content || !data.folderId) continue;

			try {
				// Fetch Content, Attachments, and Headers in parallel
				const base = `https://mail.zoho.com/api/accounts/${accountId}/folders/${data.folderId}/messages/${data.id}`;

				const [contentRes, attachRes, headRes] = await Promise.all([axios.get(`${base}/content`, apiHeaders).catch(() => null), axios.get(`${base}/attachmentinfo`, { ...apiHeaders, params: { includeInline: true } }).catch(() => null), axios.get(`${base}/header`, { ...apiHeaders, params: { raw: false } }).catch(() => null)]);

				if (!contentRes && !headRes) continue; // Skip if fetch failed

				batch.update(doc.ref, {
					content: contentRes?.data?.data?.content || null,
					headerContent: headRes?.data?.data || null,
					attachments: attachRes?.data?.data?.attachments || [],
					inlineAttachments: attachRes?.data?.data?.inline || [],
				});

				ops++;
				updatedCount++;
				if (ops >= 400) {
					await batch.commit();
					batch = db.batch();
					ops = 0;
				}
			} catch (e) {
				console.warn(`Failed to fetch content for ${data.id}`);
			}
		}

		if (ops > 0) await batch.commit();

		return { success: true, message: `Backfilled content for ${updatedCount} emails.` };
	} catch (error) {
		console.error('Email Content Backfill Error:', error);
		throw new HttpsError('internal', 'Backfill failed.');
	}
});
