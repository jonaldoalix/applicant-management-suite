const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { Timestamp } = require('firebase-admin/firestore');

const { brand, configKeys, collections, ApplicationStatus, templates } = require('../config');
const { processTemplate } = require('../utils');

// ==================================================================
//  INTERNAL HELPER FUNCTIONS
// ==================================================================

/**
 * Queues a system email by writing to the 'emails' collection.
 * The email trigger (in a different module) will pick this up and send it.
 */
async function queueSystemEmail(templateKey, recipients, data, configData) {
	if (!recipients || recipients.length === 0) {
		console.warn(`No recipients configured for template ${templateKey}. Skipping.`);
		return;
	}

	try {
		const template = templates[templateKey];
		if (!template) throw new Error(`Template not found for key: ${templateKey}`);

		const context = { brand, ...data };
		const subject = processTemplate(template.subject, context);
		let htmlBody = processTemplate(template.html, context);

		htmlBody += `<p>Regards,<br>The ${brand.organizationShortName} System</p>`;

		// Create a plain text fallback
		const text = htmlBody
			.replace(/<[^>]+>/g, ' ')
			.replace(/ {2,}/g, ' ')
			.trim();

		// Wrap in standard header/footer
		const finalHtml = templates.emailHeader(brand) + `<main style="font-family: Arial, Helvetica, sans-serif; color: #333; padding: 5px; margin: 5px;">${htmlBody}</main>` + templates.staticEmailFooter(brand);

		const db = admin.firestore();
		const batch = db.batch();
		const emailsRef = db.collection(collections.emails);

		recipients.forEach((recipientEmail) => {
			const docRef = emailsRef.doc();
			batch.set(docRef, {
				to: recipientEmail,
				from: configData.SYSTEM_EMAIL,
				replyTo: configData.SYSTEM_REPLY_TO,
				message: { subject, text, html: finalHtml },
				createdAt: admin.firestore.FieldValue.serverTimestamp(),
			});
		});

		await batch.commit();
		console.log(`Queued system email "${templateKey}" for ${recipients.length} recipient(s).`);
	} catch (error) {
		console.error(`Failed to queue system email for template ${templateKey}:`, error);
	}
}

// ==================================================================
//  SCHEDULED TASKS
// ==================================================================

/**
 * Run Automated Tasks
 * Scheduled Trigger: Runs daily at 6:00 AM (New York Time).
 * Performs maintenance tasks defined in the 'siteConfiguration' document.
 */
exports.runAutomatedTasks = onSchedule(
	{
		schedule: '0 6 * * *',
		timeZone: 'America/New_York',
	},
	async (event) => {
		const db = admin.firestore();
		const configRef = db.collection(collections.siteConfig).doc(configKeys.configVersionId);
		const now = Timestamp.now();
		let configData;

		try {
			const configSnap = await configRef.get();
			if (!configSnap.exists) {
				console.error('Site configuration not found. Skipping automations.');
				return null;
			}
			configData = configSnap.data();
			const automations = configData.automations || {};

			console.log('Running automated tasks...');

			// ------------------------------------------------------
			// TASK 1: Member Activity Summary
			// ------------------------------------------------------
			const summaryConfig = automations.memberActivitySummary;
			if (summaryConfig?.enabled) {
				const intervalHours = summaryConfig.schedule === 'daily' ? 24 : 7 * 24;
				const lastRun = summaryConfig.lastRun;
				let shouldRun = !lastRun;

				// Check if enough time has passed since last run
				if (lastRun && now.toMillis() - lastRun.toMillis() >= intervalHours * 60 * 60 * 1000 - 5 * 60 * 1000) {
					shouldRun = true;
				}

				if (shouldRun) {
					console.log('Running Member Activity Summary...');
					const startDate = lastRun ? lastRun.toDate() : new Date(now.toMillis() - intervalHours * 60 * 60 * 1000);
					const endDate = now.toDate();

					const appsQuery = db.collection(collections.applications).where('window', '==', configData.APPLICATION_DEADLINE);
					const appsSnap = await appsQuery.get();

					// Initialize counters
					let stats = {
						newCount: 0,
						updatedCount: 0,
						submittedCount: 0,
						completedCount: 0,
						incompleteCount: 0,
						eligibleCount: 0,
						invitedCount: 0,
						awardedCount: 0,
						deniedCount: 0,
						deletedCount: 0,
					};

					appsSnap.forEach((doc) => {
						const app = doc.data();
						const createdDate = app.createdOn?.toDate ? app.createdOn.toDate() : null;
						const updatedDate = app.lastUpdated?.toDate ? app.lastUpdated.toDate() : null;

						if (createdDate && createdDate >= startDate && createdDate <= endDate) {
							stats.newCount++;
						}
						// Check if updated *after* start, excluding creation
						if (updatedDate && updatedDate >= startDate && updatedDate <= endDate && (!createdDate || updatedDate.getTime() !== createdDate.getTime())) {
							stats.updatedCount++;
						}

						switch (app.status) {
							case ApplicationStatus.submitted:
								stats.submittedCount++;
								break;
							case ApplicationStatus.completed:
								stats.completedCount++;
								break;
							case ApplicationStatus.incomplete:
								stats.incompleteCount++;
								break;
							case ApplicationStatus.eligible:
								stats.eligibleCount++;
								break;
							case ApplicationStatus.invited:
								stats.invitedCount++;
								break;
							case ApplicationStatus.awarded:
								stats.awardedCount++;
								break;
							case ApplicationStatus.denied:
								stats.deniedCount++;
								break;
							case ApplicationStatus.deleted:
								stats.deletedCount++;
								break;
							case ApplicationStatus.deferred:
								stats.deniedCount++;
								break; // Group deferred with denied
							case ApplicationStatus.ineligible:
								stats.deniedCount++;
								break; // Group ineligible with denied
						}
					});

					const totalActive = appsSnap.size - stats.deniedCount - stats.deletedCount;

					const summaryData = {
						startDate: startDate.toLocaleDateString('en-US'),
						endDate: endDate.toLocaleDateString('en-US'),
						...stats,
						totalActive,
					};

					await queueSystemEmail('memberActivitySummary', summaryConfig.recipients, summaryData, configData);
					await configRef.update({ 'automations.memberActivitySummary.lastRun': now });
					console.log('Member Activity Summary processed.');
				}
			}

			// ------------------------------------------------------
			// TASK 2: Incomplete Count Alert
			// ------------------------------------------------------
			const alertConfig = automations.incompleteCountAlert;
			if (alertConfig?.enabled) {
				const intervalHours = alertConfig.schedule === 'daily' ? 24 : 7 * 24;
				const lastRun = alertConfig.lastRun;
				let shouldRun = !lastRun;

				if (lastRun && now.toMillis() - lastRun.toMillis() >= intervalHours * 60 * 60 * 1000 - 5 * 60 * 1000) {
					shouldRun = true;
				}

				if (shouldRun) {
					console.log('Running Incomplete Count Alert Check...');
					const incompleteQuery = db.collection(collections.applications).where('window', '==', configData.APPLICATION_DEADLINE).where('status', '==', ApplicationStatus.incomplete);

					const incompleteSnap = await incompleteQuery.get();
					const incompleteCount = incompleteSnap.size;
					const threshold = alertConfig.threshold || 0;

					if (incompleteCount > threshold) {
						console.log(`Incomplete count (${incompleteCount}) exceeds threshold (${threshold}). Sending alert.`);
						await queueSystemEmail('incompleteCountAlert', alertConfig.recipients, { incompleteCount, threshold }, configData);
					}

					await configRef.update({ 'automations.incompleteCountAlert.lastRun': now });
				}
			}

			console.log('Finished automated tasks.');
			return null;
		} catch (error) {
			console.error('Error running automated tasks:', error);
			// Log error to Firestore for visibility in admin dashboard
			await configRef
				.update({
					'automations.errorLastRun': { timestamp: now, message: error.message },
				})
				.catch((err) => console.error('Failed to log automation error to config:', err));

			return null;
		}
	}
);
