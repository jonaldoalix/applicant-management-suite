/**
 * Applicant Admin Form
 * Allows administrators to edit an Applicant's profile (photo, contact info, school)
 * and view their associated applications.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuid } from 'uuid';
import { Box, Divider, Typography } from '@mui/material';

// Config & Context
import { saveApplicantData, saveFile, getDownloadLinkForFile } from '../../../config/data/firebase';
import { UploadType } from '../../../config/data/collections';
import { applicantFormConfig } from '../../../config/ui/formConfig';
import { useAlert } from '../../../context/AlertContext';

// Components
import Loader from '../../loader/Loader';
import GenericAdminForm from '../GenericAdminForm';
import Application from '../../widget/Application';

export const ApplicantForm = ({ applicant }) => {
	const [initialData, setInitialData] = useState({ id: uuid() });
	const [uploading, setUploading] = useState(false);
	const { showAlert, handleError } = useAlert();

	useEffect(() => {
		if (applicant) {
			setInitialData({
				...applicant,
				id: applicant.id || uuid(),
			});
		}
	}, [applicant]);

	const handleFileUpload = async (action, fieldPath, file) => {
		if (action !== 'upload' || !file) return;

		setUploading(true);
		try {
			const savedFile = await saveFile(UploadType.applicantAvatar, initialData.id, file.name, file);
			const returnedLink = await getDownloadLinkForFile(savedFile);

			if (returnedLink) {
				const newPictureData = { displayName: file.name, home: returnedLink, refLoc: savedFile };
				setInitialData((prev) => ({ ...prev, picture: newPictureData }));
				showAlert({ message: 'Picture updated!', type: 'success' });
			} else {
				throw new Error('Failed to get the download link.');
			}
		} catch (error) {
			handleError(error, 'applicant-picture-upload');
		} finally {
			setUploading(false);
		}
	};

	const handleSubmit = async (formData) => {
		const updatedApplicant = { ...initialData, ...formData };

		// Validate Graduation Year (Must be 4 digits)
		if (updatedApplicant.gradYear && !/^\d{4}$/.test(updatedApplicant.gradYear)) {
			showAlert({ message: 'Please enter a valid 4-digit graduation year.', type: 'error' });
			return;
		}

		// Ensure strictly numeric storage if valid
		if (updatedApplicant.gradYear) {
			updatedApplicant.gradYear = Number(updatedApplicant.gradYear);
		}

		try {
			await saveApplicantData(updatedApplicant.id, updatedApplicant);
			showAlert({ message: 'Applicant data saved successfully.', type: 'success' });
		} catch (error) {
			handleError(error, 'applicant-form-submit');
		}
	};

	if (uploading) return <Loader />;

	return (
		<>
			<GenericAdminForm formConfig={{ ...applicantFormConfig, name: 'applicant' }} initialData={initialData} onSubmit={handleSubmit} onFileUpload={handleFileUpload} />

			<Divider sx={{ my: 4 }} />

			<Typography variant='h5' component='h3' gutterBottom color='text.active'>
				Associated Applications
			</Typography>

			<Box display='flex' flexDirection='row' flexWrap='wrap' gap={2}>
				{initialData.applications?.length > 0 ? (
					initialData.applications.map((app) => (
						// Handle both full objects or ID strings
						<Application key={app.id || app} id={app.id || app} />
					))
				) : (
					<Typography color='text.secondary' sx={{ fontStyle: 'italic' }}>
						No application history found.
					</Typography>
				)}
			</Box>
		</>
	);
};

ApplicantForm.propTypes = {
	applicant: PropTypes.object,
};
