const admin = require('firebase-admin');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const Twilio = require('twilio');

const { collections } = require('../config');

// Initialize Twilio Client
const twilioClient = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ==================================================================
//  INTERNAL HELPER FUNCTIONS
// ==================================================================

/**
 * Sends the actual SMS via Twilio and updates the Firestore document with the result.
 */
async function deliverSMS(payload, ref) {
	const update = {
		'delivery.endTime': admin.firestore.FieldValue.serverTimestamp(),
		'delivery.leaseExpireTime': null,
		'delivery.state': 'SUCCESS',
		'delivery.info': {},
		'delivery.errorCode': '',
		'delivery.errorMessage': '',
	};

	try {
		const from = payload.from || process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_PHONE_NUMBER;

		// Construct the callback URL dynamically based on project ID and region
		const projectId = process.env.GCLOUD_PROJECT || admin.instanceId().app.options.projectId;
		const region = 'us-central1'; // Standard Firebase region
		const callbackUrl = `https://${region}-${projectId}.cloudfunctions.net/sms-updateSMSStatus`;

		const messageOptions = {
			from: from,
			to: payload.to,
			body: payload.body,
			statusCallback: callbackUrl,
		};

		// Add media URL if present (MMS)
		if (payload.mediaUrl) {
			messageOptions.mediaUrl = payload.mediaUrl;
		}

		const message = await twilioClient.messages.create(messageOptions);

		const info = {
			messageSid: message.sid,
			status: message.status,
			dateCreated: message.dateCreated ? admin.firestore.Timestamp.fromDate(message.dateCreated) : null,
			dateSent: message.dateSent ? admin.firestore.Timestamp.fromDate(message.dateSent) : null,
			dateUpdated: message.dateUpdated ? admin.firestore.Timestamp.fromDate(message.dateUpdated) : null,
			messagingServiceSid: message.messagingServiceSid,
			numMedia: message.numMedia,
			numSegments: message.numSegments,
		};

		update['delivery.state'] = 'SUCCESS';
		update['delivery.info'] = info;
		console.log(`Delivered SMS: ${ref.path} successfully. SID: ${message.sid}`);
	} catch (error) {
		update['delivery.state'] = 'ERROR';
		update['delivery.errorCode'] = error.code ? error.code.toString() : 'unknown';
		update['delivery.errorMessage'] = `${error.message || ''} ${error.moreInfo || ''}`;
		console.error(`Error delivering SMS: ${ref.path}`, error);
	}

	return ref.update(update);
}

// ==================================================================
//  EXPORTED FUNCTIONS
// ==================================================================

/**
 * Process SMS Queue
 * Firestore Trigger: Watches the 'sms' collection for new documents or state changes.
 * Acts as a queue processor: Pending -> Processing -> Success/Error.
 */
exports.processSMSQueue = onDocumentWritten(`${collections.sms}/{docId}`, async (event) => {
	// 1. Check if document exists (it might be a delete event)
	if (!event.data) return null;

	const change = event.data;
	const ref = change.after.ref;
	const payload = change.after.data();

	// 2. Handle New Document Creation (Initialize Delivery State)
	if (!change.before.exists && change.after.exists) {
		return ref.update({
			delivery: {
				startTime: admin.firestore.FieldValue.serverTimestamp(),
				state: 'PENDING',
				errorCode: null,
				errorMessage: null,
				info: null,
			},
		});
	}

	// 3. Validation
	if (!payload || !payload.delivery) {
		if (change.after.exists) {
			console.error(`Message ${ref.path} is missing 'delivery' field`);
		}
		return null;
	}

	// 4. State Machine
	switch (payload.delivery.state) {
		case 'SUCCESS':
		case 'ERROR':
			return null; // Processing complete

		case 'PROCESSING':
			// Check for lease expiration (stuck messages) - 60s timeout
			if (payload.delivery.leaseExpireTime && payload.delivery.leaseExpireTime.toMillis() < Date.now()) {
				return ref.update({
					'delivery.state': 'ERROR',
					'delivery.errorMessage': 'Message processing lease expired.',
				});
			}
			return null;

		case 'PENDING':
			// Lock the message and attempt delivery
			await ref.update({
				'delivery.state': 'PROCESSING',
				'delivery.leaseExpireTime': admin.firestore.Timestamp.fromMillis(Date.now() + 60000),
			});
			return deliverSMS(payload, ref);

		default:
			return null;
	}
});

/**
 * Update SMS Status
 * HTTP Trigger (Webhook): Receives status updates (delivered, failed, undelivered) from Twilio.
 */
exports.updateSMSStatus = onRequest(async (req, res) => {
	const { MessageSid, MessageStatus } = req.body;

	if (!MessageSid) {
		return res.status(400).send('No MessageSid found.');
	}

	const db = admin.firestore();
	const collectionRef = db.collection(collections.sms);

	try {
		const snapshot = await collectionRef.where('delivery.info.messageSid', '==', MessageSid).limit(1).get();

		if (snapshot.empty) {
			console.warn(`Could not find document for message SID: ${MessageSid}`);
		} else {
			const doc = snapshot.docs[0];
			const currentStatus = doc.get('delivery.info.status');
			const terminalStatuses = ['delivered', 'undelivered', 'failed'];

			if (terminalStatuses.includes(currentStatus)) {
				console.log(`SMS ${MessageSid} is already terminal (${currentStatus}). Skipping update.`);
			} else {
				await doc.ref.update({
					'delivery.info.status': MessageStatus,
					'delivery.info.dateUpdated': admin.firestore.FieldValue.serverTimestamp(),
				});
				console.log(`Updated SMS status for ${MessageSid} to ${MessageStatus}`);
			}
		}
	} catch (error) {
		console.error('Error in updateSMSStatus:', error);
	}

	res.set('Content-Type', 'text/xml');
	res.send('<Response></Response>');
});
