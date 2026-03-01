/**
 * Manual Uploader Form
 * Administrative tool to manually upload attachments for specific applicants.
 * Features cascading selection: Applicant -> Application -> Attachment Type.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Context & Hooks
import { useTheme } from '../../../context/ThemeContext';
import { useAlert } from '../../../context/AlertContext';
import { useTitle } from '../../../context/HelmetContext';

// Config & Firebase
import { getRealTimeCollection, getApplicationsForApplicant, getCollectionData, saveFile, getDownloadLinkForFile, saveCollectionData } from '../../../config/data/firebase';
import { collections, UploadType } from '../../../config/data/collections';
import { attachmentFields } from '../../../config/Constants';
import { manualUploadFormConfig } from '../../../config/ui/formConfig';

// Components
import GenericAdminForm from '../GenericAdminForm';
import Loader from '../../loader/Loader';

const ManualUploader = () => {
	const navigate = useNavigate();
	const { darkMode, boxShadow } = useTheme();
	const { showAlert, handleError } = useAlert();

	// Data State
	const [allApplicants, setAllApplicants] = useState([]);
	const [applicantApplications, setApplicantApplications] = useState([]);
	const [selectedApplication, setSelectedApplication] = useState(null);
	const [initialData, setInitialData] = useState({});
	const [loading, setLoading] = useState(true);

	useTitle({ title: 'Manual Uploader', appear: false });

	// Fetch all applicants on mount for the dropdown
	useEffect(() => {
		const unsub = getRealTimeCollection(collections.applicants, (data) => {
			const options = data.map((app) => ({
				id: app.id,
				label: `${app.firstName} ${app.lastName}`,
			}));
			setAllApplicants(options);
			setLoading(false);
		});
		return () => unsub();
	}, []);

	// Handle cascading dropdown logic
	const handleFieldChange = async (path, value) => {
		const fieldName = path.split('.').pop();
		setInitialData((prev) => ({ ...prev, [fieldName]: value }));

		// 1. Applicant Selected -> Fetch their Applications
		if (fieldName === 'applicantId') {
			setApplicantApplications([]);
			setSelectedApplication(null);
			setInitialData((prev) => ({ ...prev, applicationId: '', attachmentType: '' }));

			if (value) {
				const apps = await getApplicationsForApplicant(value);
				const appOptions = apps.map((app) => ({
					id: app.id,
					label: `${app.type} (${new Date(app.window).getFullYear()})`,
				}));
				setApplicantApplications(appOptions);
			}
		}

		// 2. Application Selected -> Fetch Application Details (for attachments list)
		if (fieldName === 'applicationId' && value) {
			const app = await getCollectionData(value, collections.applications, value);
			setSelectedApplication(app);
		}
	};

	// Dynamically rebuild form config based on selection state
	const dynamicFormConfig = useMemo(() => {
		const requiredAttachments = selectedApplication ? attachmentFields.filter((f) => f.requiredBy.includes(selectedApplication.type)) : [];

		const attachmentOptions = requiredAttachments.map((f) => ({ value: f.key, label: f.label }));

		return {
			...manualUploadFormConfig,
			fields: manualUploadFormConfig.fields.map((field) => {
				if (field.name === 'applicantId') {
					return { ...field, options: allApplicants };
				}
				if (field.name === 'applicationId') {
					return { ...field, options: applicantApplications, disabled: !initialData.applicantId };
				}
				if (field.name === 'attachmentType') {
					return { ...field, options: attachmentOptions, disabled: !initialData.applicationId };
				}
				return field;
			}),
		};
	}, [allApplicants, applicantApplications, selectedApplication, initialData]);

	const handleSubmit = async (formData) => {
		const { applicantId, applicationId, attachmentType, file } = formData;

		if (!applicantId || !applicationId || !attachmentType || !file) {
			showAlert({ message: 'All fields are required.', type: 'error' });
			return;
		}

		setLoading(true);
		try {
			// Get parent application to find attachment record ID
			const application = await getCollectionData(applicationId, collections.applications, applicationId);
			if (!application?.attachments) throw new Error("Could not find the application's attachment record.");

			// Upload File
			const savedFileRef = await saveFile(UploadType.applicationAttachment, applicationId, attachmentType, file);
			const downloadLink = await getDownloadLinkForFile(savedFileRef);

			const newAttachmentData = {
				displayName: file.name,
				home: downloadLink,
				refLoc: savedFileRef,
				uploadedBy: 'admin',
			};

			// Update Attachment Record
			await saveCollectionData(collections.attachments, application.attachments, { [attachmentType]: newAttachmentData });

			showAlert({ message: 'File uploaded and attached successfully!', type: 'success' });
			setInitialData({}); // Reset form
		} catch (error) {
			handleError(error, 'manual-upload-submit');
		} finally {
			setLoading(false);
		}
	};

	if (loading && allApplicants.length === 0) return <Loader />;

	return (
		<Box display='flex' height='100%' width='100%' flexDirection='column'>
			{/* Header */}
			<Box display='flex' padding='10px' margin='20px' bgcolor={darkMode ? 'background.main' : 'white'} borderRadius='12px' sx={{ boxShadow: boxShadow }} alignItems='center'>
				<IconButton onClick={() => navigate(-1)} sx={{ mr: 1, color: 'secondary.main' }}>
					<ArrowBackIcon />
				</IconButton>
				<Typography fontSize='20px' component='span' color='secondary.main'>
					Upload Attachment
				</Typography>
			</Box>

			{/* Form Area */}
			<Box sx={{ p: 3 }}>
				<Box sx={{ bgcolor: 'background.main', p: 3, borderRadius: '12px', boxShadow: boxShadow }}>
					<GenericAdminForm formConfig={dynamicFormConfig} initialData={initialData} onSubmit={handleSubmit} onFieldChange={handleFieldChange} />
				</Box>
			</Box>
		</Box>
	);
};

export default ManualUploader;
