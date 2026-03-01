const admin = require('firebase-admin');
const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https');
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const axios = require('axios');

const { brand, templates } = require('../config');

// ==================================================================
//  INTERNAL HELPER FUNCTIONS
// ==================================================================

const getZohoAccessToken = async () => {
	const clientid = process.env.ZOHO_CLIENTID;
	const clientsecret = process.env.ZOHO_CLIENTSECRET;
	const refreshtoken = process.env.ZOHO_REFRESHTOKEN;

	const tokenUrl = 'https://accounts.zoho.com/oauth/v2/token';
	const params = new URLSearchParams();
	params.append('refresh_token', refreshtoken);
	params.append('client_id', clientid);
	params.append('client_secret', clientsecret);
	params.append('grant_type', 'refresh_token');

	try {
		const response = await axios.post(tokenUrl, params);
		return response.data.access_token;
	} catch (error) {
		console.error('Error fetching Zoho access token:', error.response?.data);
		throw new HttpsError('internal', 'Could not authenticate with Zoho. Your refresh token may have expired.');
	}
};

const getInboxFolderId = async (accessToken, accountId) => {
	const foldersApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/folders`;
	try {
		const response = await axios.get(foldersApiUrl, {
			headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
		});
		const inboxFolder = response.data.data.find((folder) => folder.folderName === 'Inbox');
		if (!inboxFolder) {
			throw new HttpsError('not-found', 'Inbox folder not found.');
		}
		return inboxFolder.folderId;
	} catch (error) {
		console.error('Error fetching Zoho folders:', error.response?.data);
		throw new HttpsError('internal', 'Failed to fetch folder information from Zoho.');
	}
};

const _getZohoFolders = async (accessToken, accountId) => {
	const foldersApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/folders`;
	try {
		const response = await axios.get(foldersApiUrl, {
			headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
		});
		return response.data.data.map((folder) => ({
			folderId: folder.folderId,
			folderName: folder.folderName,
		}));
	} catch (error) {
		console.error('Error in _getZohoFolders helper:', error.response?.data);
		throw new HttpsError('internal', 'Failed to fetch folder list from Zoho.');
	}
};

const _getZohoTags = async (accessToken, accountId) => {
	const tagsApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/labels`;
	try {
		const response = await axios.get(tagsApiUrl, {
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
		console.error('Error in _getZohoTags helper:', error.response?.data);
		throw new HttpsError('internal', 'Failed to fetch tag list from Zoho.');
	}
};

const _sendForwardedEmail = async (to, subject, body) => {
	try {
		const accessToken = await getZohoAccessToken();
		const accountId = process.env.ZOHO_ACCOUNTID;
		const mailApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages`;

		const emailData = {
			toAddress: to,
			subject: `Fwd: ${subject}`,
			content: body,
			fromAddress: `"${brand.internalName} Notifications" <${brand.noreplyEmail}>`,
		};

		await axios.post(mailApiUrl, emailData, {
			headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
		});

		return { success: true };
	} catch (error) {
		console.error('Error sending forwarded email:', error.response?.data || error.message);
		return { success: false };
	}
};

// ==================================================================
//  EXPORTED FUNCTIONS
// ==================================================================

// Zoho Webhook Receiver
// HTTP Trigger: Receives pings from Zoho when new mail arrives and increments
// a stats counter to trigger the actual sync function (debouncing).
exports.zohoWebhookReceiver = onRequest(async (req, res) => {
	const configuredSecret = process.env.ZOHO_WEBHOOK_SECRET;
	const requestSecret = req.query.secret;

	if (!configuredSecret || !requestSecret || requestSecret !== configuredSecret) {
		console.error('Unauthorized webhook attempt. Secret mismatch or missing.');
		return res.status(401).send('Unauthorized');
	}

	try {
		const syncRef = admin.firestore().doc('mail_sync/stats');
		await syncRef.set({ trigger: admin.firestore.FieldValue.increment(1) }, { merge: true });
		return res.status(200).send('Success (Triggered)');
	} catch (error) {
		console.error('Error processing Zoho webhook ping:', error);
		return res.status(500).send('Internal Server Error');
	}
});

// Sync Zoho Mail Cache
// Firestore Trigger (on mail_sync/stats update)
// The core logic that fetches emails from Zoho and saves them to Firestore ('mail_cache').
exports.syncZohoMailCache = onDocumentUpdated('mail_sync/stats', async (event) => {
	if (!event.data) return null;

	const change = event.data;
	const beforeData = change.before.data();
	const afterData = change.after.data();

	// Skip self-writes or debouncing
	if (beforeData.trigger === afterData.trigger) {
		console.log('Sync skipped: Trigger value did not change (self-write).');
		return null;
	}

	const db = admin.firestore();
	const statsRef = db.doc('mail_sync/stats');
	const cacheCollectionRef = db.collection('mail_cache');

	if (change.before.data()?.lastSyncComplete) {
		const lastSyncTime = change.before.data().lastSyncComplete.toDate();
		const DEBOUNCE_MS = 30 * 1000; // 30 Seconds
		if (Date.now() - lastSyncTime.getTime() < DEBOUNCE_MS) {
			console.log('Sync skipped: Debouncing.');
			return null;
		}
	}
	await statsRef.update({ lastSyncAttempt: admin.firestore.FieldValue.serverTimestamp() });

	try {
		const accessToken = await getZohoAccessToken();
		const accountId = process.env.ZOHO_ACCOUNTID;
		const allFolders = await _getZohoFolders(accessToken, accountId);
		const allTagsMap = await _getZohoTags(accessToken, accountId);
		const tagIdToNameMap = new Map();
		allTagsMap.forEach((name, id) => tagIdToNameMap.set(id, name.toLowerCase()));
		const apiHeaders = { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } };

		console.log(`Starting sync for ${allFolders.length} folders...`);
		let batch = db.batch();
		let operationCounter = 0;
		const allFetchedEmailIds = new Set();

		const commitBatch = async () => {
			if (operationCounter > 0) {
				console.log(`Committing batch with ${operationCounter} operations...`);
				await batch.commit();
				batch = db.batch();
				operationCounter = 0;
			}
		};

		const addOperationToBatch = async (docRef, data, isMerge = true) => {
			if (isMerge) {
				batch.set(docRef, data, { merge: true });
			} else {
				batch.update(docRef, data);
			}
			operationCounter++;
			if (operationCounter >= 499) {
				await commitBatch();
			}
		};

		for (const folder of allFolders) {
			const folderName = folder.folderName.toLowerCase();
			const isSentFolder = folderName === 'sent';

			let moreAvailable = true;
			let start = 0;
			const limit = 50;
			console.log(`Fetching emails for folder: ${folder.folderName}`);

			while (moreAvailable) {
				const folderViewApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages/view`;
				const response = await axios.get(folderViewApiUrl, {
					...apiHeaders,
					params: {
						folderId: folder.folderId,
						includeto: true,
						includesent: isSentFolder,
						limit: limit,
						start: start,
					},
				});

				if (!response.data.data || response.data.data.length === 0) {
					moreAvailable = false;
					continue;
				}
				const emailSummaries = response.data.data;

				for (const emailSummary of emailSummaries) {
					const messageId = emailSummary.messageId;
					allFetchedEmailIds.add(messageId);

					let emailContent = null;
					let emailAttachments = [];
					let emailInlineAttachments = [];
					let emailHeaderContent = null;

					try {
						const base = `https://mail.zoho.com/api/accounts/${accountId}/folders/${folder.folderId}/messages/${messageId}`;

						const [contentRes, attachmentsRes, headersRes] = await Promise.all([axios.get(`${base}/content`, apiHeaders).catch(() => null), axios.get(`${base}/attachmentinfo`, { ...apiHeaders, params: { includeInline: true } }).catch(() => null), axios.get(`${base}/header`, { ...apiHeaders, params: { raw: false } }).catch(() => null)]);

						emailContent = contentRes?.data?.data?.content ?? null;
						emailAttachments = attachmentsRes?.data?.data?.attachments ?? [];
						emailInlineAttachments = attachmentsRes?.data?.data?.inline ?? [];
						emailHeaderContent = headersRes?.data?.data ?? null;
					} catch (fetchError) {
						console.error(`Error fetching full details for email ${messageId}:`, fetchError.message);
					}

					const tags = (emailSummary.labelId || []).map((id) => tagIdToNameMap.get(id)).filter(Boolean);
					const emailCacheDoc = {
						id: messageId,
						to: emailSummary.toAddress ?? null,
						sender: emailSummary.fromAddress ?? null,
						subject: emailSummary.subject ?? null,
						description: emailSummary.summary ?? null,
						timestamp: emailSummary.receivedTime ?? Date.now(),
						folderId: folder.folderId,
						folderName: folder.folderName.toLowerCase(),
						isRead: emailSummary.status === '1',
						tags: tags,
						hasAttachment: emailSummary.hasAttachment === '1',
						hasInline: emailSummary.hasInline,
						content: emailContent,
						headerContent: emailHeaderContent,
						attachments: emailAttachments,
						inlineAttachments: emailInlineAttachments,
					};
					const docRef = cacheCollectionRef.doc(messageId);
					await addOperationToBatch(docRef, emailCacheDoc, true);

					// Forwarding logic
					if (emailSummary && tags && tags.length > 0) {
						const membersSnapshot = await db.collection('members').where('notifications.forwardingEnabled', '==', true).get();
						if (!membersSnapshot.empty) {
							for (const memberDoc of membersSnapshot.docs) {
								const member = memberDoc.data();
								if (member.email && member.permissions?.emails) {
									const groupAliases = Object.keys(member.permissions.emails?.aliases || {}).filter((a) => member.permissions.emails.aliases[a]);
									const personalAlias = member.alias ? member.alias.split('@')[0].toLowerCase() : null;

									const allowedForwardingTags = [...groupAliases];
									if (personalAlias && !allowedForwardingTags.includes(personalAlias)) {
										allowedForwardingTags.push(personalAlias);
									}

									const shouldForward = tags.some((tag) => allowedForwardingTags.includes(tag));

									if (shouldForward) {
										await _sendForwardedEmail(member.email, emailSummary.subject, emailContent);
									}
								}
							}
						}
					}
				}

				start += emailSummaries.length;
				moreAvailable = emailSummaries.length === limit;
			}
		}

		// Pruning Check
		console.log('Starting pruning check...');
		const snapshot = await cacheCollectionRef.get();
		for (const doc of snapshot.docs) {
			if (!allFetchedEmailIds.has(doc.id)) {
				console.log(`Pruning old email from cache: ${doc.id}`);
				await addOperationToBatch(doc.ref, {}, false);
				batch.delete(doc.ref);
				operationCounter++;
				if (operationCounter >= 499) {
					await commitBatch();
				}
			}
		}
		console.log('Finished pruning check.');

		await commitBatch();
		await statsRef.update({ lastSyncComplete: admin.firestore.FieldValue.serverTimestamp(), lastSyncError: null });
		console.log(`Zoho Mail Cache Sync COMPLETE. Synced/Checked ${allFetchedEmailIds.size} total emails.`);
		return null;
	} catch (error) {
		console.error('Error during Zoho Mail Cache Sync:', error.response?.data || error.message);
		await statsRef.update({ lastSyncError: error.message });
		return null;
	}
});

// Fetch Emails By Folder
// Reads specific folder contents from Zoho via API (not cache).
exports.fetchEmailsByFolder = onCall(async (request) => {
	const context = request;
	if (!context.auth || !context.auth.token.email) {
		throw new HttpsError('permission-denied', 'User does not have email permissions.');
	}

	const { folderId } = request.data;
	if (!folderId) throw new HttpsError('invalid-argument', 'A folderId is required.');

	try {
		const accessToken = await getZohoAccessToken();
		const accountId = process.env.ZOHO_ACCOUNTID;
		const mailApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages/view`;

		const response = await axios.get(mailApiUrl, {
			headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
			params: { folderId: folderId, limit: 200 },
		});

		if (!response.data.data) return [];

		return response.data.data.map((email) => ({
			id: email.messageId,
			sender: email.fromAddress,
			subject: email.subject,
			description: email.summary,
			timestamp: email.receivedTime,
			isRead: email.status === '1',
		}));
	} catch (error) {
		console.error('Error fetching Zoho emails:', error.response?.data);
		throw new HttpsError('internal', 'Failed to fetch emails from Zoho.');
	}
});

// Fetch Zoho Folders
exports.fetchZohoFolders = onCall(async (request) => {
	const context = request;
	if (!context.auth || !context.auth.token.email) {
		throw new HttpsError('permission-denied', 'User does not have email permissions.');
	}

	const memberDoc = await admin.firestore().collection('members').doc(context.auth.uid).get();
	if (!memberDoc.exists || !memberDoc.data()?.permissions?.admin) {
		throw new HttpsError('permission-denied', 'You must be an admin to perform this action.');
	}

	try {
		const accessToken = await getZohoAccessToken();
		const accountId = process.env.ZOHO_ACCOUNTID;
		return await _getZohoFolders(accessToken, accountId);
	} catch (error) {
		console.error('Error fetching Zoho folders:', error.response?.data);
		throw new HttpsError('internal', 'Failed to fetch folder list from Zoho.');
	}
});

// Send Zoho Email
// Sends an email via Zoho, supporting aliases and branding injection.
exports.sendZohoEmail = onCall(async (request) => {
	const context = request;
	if (!context.auth) throw new HttpsError('permission-denied', 'User must be authenticated to send emails.');

	const { to, cc, bcc, subject, body, originalMessageId, fromAddress, useBranding } = request.data;
	if (!to || !subject || !body || !fromAddress) {
		throw new HttpsError('invalid-argument', 'Missing required fields: to, subject, body, fromAddress.');
	}

	try {
		const db = admin.firestore();
		const memberDoc = await db.collection('members').doc(context.auth.uid).get();
		if (!memberDoc.exists) throw new HttpsError('permission-denied', 'Sender is not a valid member.');

		const memberData = memberDoc.data();
		const memberFullName = `${memberData.firstName} ${memberData.lastName}`;

		let formattedFromAddress;
		const fromAlias = fromAddress.split('@')[0];

		const groupAliasDisplayNames = {
			applications: ` ${brand.organizationShortName}`,
			committee: `${brand.organizationShortName}`,
			chairman: `Chairman | ${brand.organizationShortName}`,
			webmaster: `Webmaster | ${brand.organizationShortName}`,
			inquiries: `${brand.organizationShortName}`,
			noreply: `${brand.organizationShortName}`,
			admin: `Admin | ${brand.organizationShortName}`,
			hello: `${brand.organizationShortName}`,
			help: `${brand.organizationShortName}`,
			test: `Test | ${brand.organizationShortName}`,
		};

		if (groupAliasDisplayNames[fromAlias]) {
			formattedFromAddress = `"${groupAliasDisplayNames[fromAlias]}" <${fromAddress}>`;
		} else {
			formattedFromAddress = `"${memberFullName}" <${fromAddress}>`;
		}

		let finalBody = body;
		if (useBranding) {
			const header = templates.emailHeader(brand);
			const footer = templates.staticEmailFooter(brand);
			finalBody = header + `<main style="font-family: Arial, Helvetica, sans-serif; color: #333; padding: 5px; margin: 5px;">` + body + `</main>` + footer;
		}

		const accessToken = await getZohoAccessToken();
		const accountId = process.env.ZOHO_ACCOUNTID;
		const mailApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/messages`;

		const emailData = {
			toAddress: Array.isArray(to) ? to.join(',') : to,
			ccAddress: Array.isArray(cc) ? cc.join(',') : cc,
			bccAddress: Array.isArray(bcc) ? bcc.join(',') : bcc,
			subject: subject,
			content: finalBody,
			fromAddress: formattedFromAddress,
		};

		if (originalMessageId) {
			emailData.inReplyTo = originalMessageId;
		}

		await axios.post(mailApiUrl, emailData, {
			headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
		});

		return { success: true, message: 'Email sent successfully.' };
	} catch (error) {
		console.error('Error sending Zoho email:', error.response?.data || error.message);
		throw new HttpsError('internal', error.response?.data?.data?.message || 'Failed to send email via Zoho.');
	}
});

// Fetch Email Content
// Retrieves body and header content for a specific message.
exports.fetchEmailContent = onCall(async (request) => {
	const context = request;
	if (!context.auth || !context.auth.token.email) {
		throw new HttpsError('permission-denied', 'User does not have email permissions.');
	}

	const { messageId, folderId } = request.data;
	if (!messageId || !folderId) throw new HttpsError('invalid-argument', 'A messageId and folderId are required.');

	try {
		const accessToken = await getZohoAccessToken();
		const accountId = process.env.ZOHO_ACCOUNTID;
		const base = `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}`;
		const apiHeaders = { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } };

		const [headersResponse, contentResponse, attachmentsInfoResponse] = await Promise.all([axios.get(`${base}/header`, { ...apiHeaders, params: { raw: false } }), axios.get(`${base}/content`, apiHeaders), axios.get(`${base}/attachmentinfo`, { ...apiHeaders, params: { includeInline: true } })]);

		return {
			...headersResponse.data.data,
			content: contentResponse.data.data.content,
			attachments: attachmentsInfoResponse.data.data.attachments || [],
			inlineAttachments: attachmentsInfoResponse.data.data.inline || [],
			folderId: folderId,
		};
	} catch (error) {
		console.error('Error fetching Zoho email content:', error.response?.data);
		throw new HttpsError('internal', 'Failed to fetch email content from Zoho.');
	}
});

// Fetch Attachment Content
// Returns base64 encoded attachment data.
exports.fetchAttachmentContent = onCall(async (request) => {
	const context = request;
	if (!context.auth || !context.auth.token.email) {
		throw new HttpsError('permission-denied', 'User does not have email permissions.');
	}

	const { messageId, attachmentId, folderId } = request.data;
	if (!messageId || !attachmentId || !folderId) {
		throw new HttpsError('invalid-argument', 'messageId, attachmentId, and folderId are all required.');
	}

	try {
		const accessToken = await getZohoAccessToken();
		const accountId = process.env.ZOHO_ACCOUNTID;
		const attachmentApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}/attachments/${attachmentId}`;

		const response = await axios.get(attachmentApiUrl, {
			headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
			responseType: 'arraybuffer',
		});

		const contentType = response.headers['content-type'];
		const base64Content = Buffer.from(response.data, 'binary').toString('base64');

		return { contentType, content: base64Content };
	} catch (error) {
		console.error('Error fetching Zoho attachment:', error.response ? error.response.data : error.message);
		throw new HttpsError('internal', 'Failed to fetch attachment from Zoho.');
	}
});

// Delete Zoho Email
// Moves a single email to trash and deletes it from cache.
exports.deleteZohoEmail = onCall(async (request) => {
	const context = request;
	if (!context.auth || !context.auth.token.email) {
		throw new HttpsError('permission-denied', 'User does not have email permissions.');
	}

	const { messageId } = request.data;
	if (!messageId) throw new HttpsError('invalid-argument', 'A messageId is required.');

	try {
		const accessToken = await getZohoAccessToken();
		const accountId = process.env.ZOHO_ACCOUNTID;
		const folderId = await getInboxFolderId(accessToken, accountId);
		const deleteApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}`;

		await axios.delete(deleteApiUrl, {
			headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
		});

		await admin.firestore().doc(`mail_cache/${messageId}`).delete();

		return { success: true, message: 'Email moved to trash.' };
	} catch (error) {
		console.error('Error deleting Zoho email:', error.response?.data);
		throw new HttpsError('internal', 'Failed to delete email via Zoho.');
	}
});

// Bulk Delete Zoho Emails
// Moves multiple emails to trash and removes them from cache.
exports.bulkDeleteZohoEmails = onCall(async (request) => {
	const context = request;
	if (!context.auth || !context.auth.token.email) {
		throw new HttpsError('permission-denied', 'User does not have email permissions.');
	}

	const { messageIds } = request.data;
	if (!Array.isArray(messageIds) || messageIds.length === 0) {
		throw new HttpsError('invalid-argument', 'An array of messageIds is required.');
	}

	try {
		const accessToken = await getZohoAccessToken();
		const accountId = process.env.ZOHO_ACCOUNTID;
		const folderId = await getInboxFolderId(accessToken, accountId);
		const apiHeaders = { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } };

		const deletionPromises = messageIds.map((messageId) => {
			const deleteApiUrl = `https://mail.zoho.com/api/accounts/${accountId}/folders/${folderId}/messages/${messageId}`;
			return axios.delete(deleteApiUrl, apiHeaders);
		});
		await Promise.all(deletionPromises);

		const batch = admin.firestore().batch();
		messageIds.forEach((id) => {
			const docRef = admin.firestore().doc(`mail_cache/${id}`);
			batch.delete(docRef);
		});
		await batch.commit();

		return { success: true, message: `${messageIds.length} email(s) moved to trash.` };
	} catch (error) {
		console.error('Error bulk deleting Zoho emails:', error.response?.data || error.message);
		throw new HttpsError('internal', 'Failed to delete one or more emails via Zoho.');
	}
});

// Update Email Read Status
// Marks emails as Read/Unread in Zoho and updates the cache.
exports.updateEmailReadStatus = onCall(async (request) => {
	const context = request;
	if (!context.auth || !context.auth.token.email) {
		throw new HttpsError('permission-denied', 'User does not have email permissions.');
	}

	const { messages, status } = request.data;
	if (!Array.isArray(messages) || messages.length === 0 || !['read', 'unread'].includes(status)) {
		throw new HttpsError('invalid-argument', 'An array of messages (with id) and a valid status are required.');
	}

	try {
		const accessToken = await getZohoAccessToken();
		const accountId = process.env.ZOHO_ACCOUNTID;
		const messageIds = messages.map((msg) => msg.id);

		const apiEndpoint = `https://mail.zoho.com/api/accounts/${accountId}/updatemessage`;
		const sanitizedStatus = status === 'read' ? 'markAsRead' : 'markAsUnread';

		await axios.put(apiEndpoint, { mode: sanitizedStatus, messageId: messageIds }, { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } });

		const batch = admin.firestore().batch();
		const newIsRead = status === 'read';
		messageIds.forEach((id) => {
			const docRef = admin.firestore().doc(`mail_cache/${id}`);
			batch.update(docRef, { isRead: newIsRead });
		});
		await batch.commit();

		return { success: true, message: `${messages.length} email(s) marked as ${status}.` };
	} catch (error) {
		console.error('Error updating email read status:', error.response?.data || error.message);
		throw new HttpsError('internal', 'Failed to update email status. Check function logs.');
	}
});
