/**
 * Request Admin Form
 * Allows administrators to manually create or edit Recommendation Requests.
 *
 * Key Features:
 * - Selects an existing Application to link the request to.
 * - Updates the Application's 'Attachments' record to reserve the slot.
 * - Generates secure PINs for external access.
 */

import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuid } from 'uuid';

// Context & Hooks
import { useConfig } from '../../../context/ConfigContext';
import { useAlert } from '../../../context/AlertContext';

// Config & Firebase
import { saveCollectionData, getCollectionData, getRealTimeApplications } from '../../../config/data/firebase';
import { attachmentFields, generate6DigitNumber, generateSecurePin, LettersOfRecommendation } from '../../../config/Constants';
import { collections } from '../../../config/data/collections';
import { blankAttachment } from '../../../config/data/Validation';
import { requestFormConfig } from '../../../config/ui/formConfig';

// Components
import GenericAdminForm from '../GenericAdminForm';

export const RequestForm = ({ request }) => {
	const config = useConfig();
	const { showAlert, handleError } = useAlert();

	const [applicationOptions, setApplicationOptions] = useState([]);
	const [initialData, setInitialData] = useState({ id: uuid() });

	// Initialization Effect: Set up ID, Expiry, and PIN
	useEffect(() => {
		const init = async () => {
			try {
				if (request) {
					setInitialData({
						...request,
						pinCode: request.pinCode || (await generateSecurePin(generate6DigitNumber())),
					});
				} else {
					setInitialData({
						id: uuid(),
						expiryDate: config.APPLICATION_DEADLINE,
						pinCode: await generateSecurePin(generate6DigitNumber()),
					});
				}
			} catch (error) {
				handleError(error, 'request-form-init');
			}
		};
		init();
	}, [request, config.APPLICATION_DEADLINE, handleError]);

	// Load Applications for Dropdown
	useEffect(() => {
		const unsubscribe = getRealTimeApplications(false, async (apps) => {
			try {
				// Fetch applicant details for each application to build a readable label
				const options = await Promise.all(
					apps.map(async (app) => {
						const profile = await getCollectionData(app.completedBy, collections.applicants, app.completedBy);
						const label = `${profile?.firstName || 'N/A'} ${profile?.lastName || ''} • ${app.type} • ${new Date(app.window).getFullYear()}`;
						return { id: app.id, label };
					})
				);
				setApplicationOptions(options);
			} catch (error) {
				handleError(error, 'Error loading applications for dropdown');
			}
		});
		return () => unsubscribe?.();
	}, [handleError]);

	// Configure Form Fields
	const dynamicFormConfig = useMemo(() => {
		const lorKeys = Object.keys(LettersOfRecommendation);
		const attachmentOptions = attachmentFields.filter((field) => lorKeys.includes(field.key)).map((a) => ({ label: a.label, value: a.key }));

		return {
			...requestFormConfig,
			fields: requestFormConfig.fields.map((field) => {
				if (field.name === 'attachmentType') {
					return { ...field, options: attachmentOptions };
				}
				if (field.name === 'applicationID') {
					return { ...field, options: applicationOptions };
				}
				return field;
			}),
		};
	}, [applicationOptions]);

	const handleSubmit = async (formData) => {
		try {
			// 1. Validate Application & Owner
			const application = await getCollectionData(formData.applicationID, collections.applications, formData.applicationID);
			const completedBy = application?.completedBy;
			if (!completedBy) throw new Error('Selected application does not have a valid owner.');

			// 2. Get Applicant Name (for the "From" field in emails)
			const applicant = await getCollectionData(completedBy, collections.applicants, completedBy);
			const fromName = `${applicant?.firstName || ''} ${applicant?.lastName || ''}`.trim();

			// 3. Prepare Data
			const attachmentsID = application.attachments || uuid();
			const dataToSave = { ...formData, fromName, completedBy, attachmentsID };

			// 4. Link Request to Application Attachment Slot
			let attachmentsDoc = (await getCollectionData(completedBy, collections.attachments, attachmentsID)) || { attachmentsID, completedBy };
			attachmentsDoc[dataToSave.attachmentType] = {
				...blankAttachment,
				requestID: dataToSave.id,
			};

			// 5. Save Both Records
			await saveCollectionData(collections.attachments, attachmentsID, attachmentsDoc);
			await saveCollectionData(collections.requests, dataToSave.id, dataToSave);

			showAlert({ message: 'Request saved successfully.', type: 'success' });
		} catch (error) {
			handleError(error, 'Error saving request');
		}
	};

	return <GenericAdminForm formConfig={{ ...dynamicFormConfig, name: 'request' }} initialData={initialData} onSubmit={handleSubmit} />;
};

RequestForm.propTypes = {
	request: PropTypes.object,
};
