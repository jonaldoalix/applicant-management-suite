/**
 * APPLICANT REGISTRATION PAGE
 * ---------------------------------------------------------------------------
 * This is the public sign-up page for students/applicants.
 *
 * * WORKFLOW:
 * 1. User Input: Gathers basic identity info (Name, Email, Password).
 * 2. Firebase Auth: Creates the secure credential.
 * 3. Profile Creation: Creates a document in the 'applicants' collection.
 * 4. Welcome Automation: Triggers the 'welcome' notification template.
 *
 * * DIFFERENCE FROM ONBOARD.JSX:
 * - Onboard.jsx -> Creates 'Member' (Staff) profiles with permissions.
 * - Register.jsx -> Creates 'Applicant' profiles with no administrative access.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';

// UI Components
import { Avatar, Button, CssBaseline, TextField, Typography, Box } from '@mui/material';
import { Camera } from '@mui/icons-material';
import Copyright from '../../components/footer/CopyrightFooter';
import Loader from '../../components/loader/Loader';
import { VisuallyHiddenInput } from '../../components/visuallyHiddenInput/VisuallyHiddenInput';

// Contexts
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useAlert } from '../../context/AlertContext';

// Backend & Config
import { registerUser, saveApplicantData, saveFile, getDownloadLinkForFile } from '../../config/data/firebase';
import { generatePath } from '../../config/navigation/routeUtils';
import { ContactTemplate, pushNotice } from '../../config/content/push';
import { UploadType } from '../../config/data/collections';
import { applicantRegistrationContent as registerConfig } from '../../config/content/content';

export default function Register() {
	// --- Hooks & State ---
	const navigate = useNavigate();
	const { loading } = useAuth();
	const { boxShadow } = useTheme();
	const { showAlert, handleError } = useAlert();

	const [picture, setPicture] = useState({});
	const [uploading, setUploading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useTitle({ title: 'Sign Up', appear: true });

	// Initialize form state dynamically from config
	const initialFormState = registerConfig.fields.reduce((acc, field) => {
		if (field.component !== 'ProfilePictureUpload') {
			acc[field.name] = '';
		}
		return acc;
	}, {});
	const [formData, setFormData] = useState(initialFormState);

	// --- Handlers ---

	const handleInputChange = (event) => {
		const { name, value } = event.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleUpload = async (event) => {
		event.preventDefault();
		const name = event.target.name;
		const file = event.target.files[0];

		// 1. Validation
		if (!file?.type.match('image/.*')) {
			showAlert({ message: 'Please select a valid image file.', type: 'error' });
			return;
		}

		const maxSizeInBytes = 25 * 1024 * 1024; // 25MB
		if (file.size > maxSizeInBytes) {
			showAlert({ message: 'File size exceeds the 25MB limit.', type: 'error' });
			return;
		}

		setUploading(true);
		try {
			// 2. Upload to Firebase Storage
			const uploadID = uuid();
			const savedFileRef = await saveFile(UploadType.memberAvatar, uploadID, name, file);

			// 3. Get Public URL
			const downloadLink = await getDownloadLinkForFile(savedFileRef);

			if (downloadLink) {
				setPicture({ displayName: file.name, home: downloadLink, refLoc: savedFileRef });
				showAlert({ message: 'Profile picture uploaded!', type: 'success' });
			} else {
				throw new Error('Failed to get the download link for the uploaded file.');
			}
		} catch (error) {
			showAlert({ message: error.message, type: 'error' });
		} finally {
			setUploading(false);
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		event.stopPropagation();
		setIsSubmitting(true);

		// 1. Validation
		if (formData.password !== formData.confirmPassword) {
			showAlert('register', 'notmatching');
			setIsSubmitting(false);
			return;
		}
		if (!formData.firstName || !formData.lastName || !formData.callMe) {
			showAlert({ message: 'No first, last, or nickname indicated!', type: 'warning' });
			setIsSubmitting(false);
			return;
		}

		try {
			// 2. Create Authentication Credential
			const result = await registerUser(formData.email, formData.password);
			const user = result.user;

			if (!user) {
				showAlert('register', 'error');
				setIsSubmitting(false);
				return;
			}

			// 3. Prepare Profile Data
			const applicantData = {
				id: user.uid,
				auth: user.uid,
				firstName: formData.firstName,
				lastName: formData.lastName,
				name: `${formData.firstName} ${formData.lastName}`, // Full Searchable Name
				callMe: formData.callMe, // Preferred Nickname
				email: formData.email,
				picture,
				notifications: { email: true, sms: false }, // Default notification settings
			};

			// 4. Save to Firestore
			const isApplicantSaved = await saveApplicantData(user.uid, applicantData);
			if (!isApplicantSaved) {
				showAlert('register', 'error');
				setIsSubmitting(false);
				return;
			}

			// 5. Send Welcome Notification (Async)
			await pushNotice(ContactTemplate.welcome, applicantData, {});

			showAlert('register', 'success');
			// AuthContext will detect the login and Redirect.jsx will handle navigation
		} catch (error) {
			handleError(error, 'register-handleSubmit', true);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (loading || isSubmitting || uploading) {
		return <Loader />;
	}

	return (
		<Box display='flex' flexDirection='column' justifyContent='center' alignItems='center' bgcolor='background.passive' color='secondary.main' sx={{ height: { xs: '100%', md: '100vh' } }}>
			<Box width={{ xs: '100%', sm: '75%', md: '50%', lg: '35%' }} height={{ xs: '100%', md: '85vh' }} padding={3} bgcolor='background.main' color='secondary.main' sx={{ borderRadius: { xs: 0, md: 4 }, boxShadow: boxShadow }}>
				<CssBaseline />
				<Box sx={{ paddingTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', maxHeight: '100%' }}>
					{/* Header */}
					<Avatar sx={{ m: 1, mb: 2, bgcolor: 'secondary' }}>{registerConfig.icon}</Avatar>
					<Typography component='h1' variant='h5'>
						{registerConfig.title}
					</Typography>

					{/* Dynamic Form */}
					<Box component='form' display='flex' flexDirection='column' justifyContent='center' width='90%' onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
						{registerConfig.fields.map(({ component, name, ...rest }) => {
							if (component === 'TextField') {
								return <TextField key={name} margin='dense' fullWidth variant='outlined' name={name} value={formData[name]} onChange={handleInputChange} {...rest} />;
							}
							if (component === 'ProfilePictureUpload') {
								return (
									<Box key={name} display='flex' flexDirection='row' justifyContent='space-around' alignItems='center' width='100%' my={2}>
										<Avatar sx={{ width: 56, height: 56 }} alt={picture?.displayName || ''} src={picture?.home} />
										<Button size='small' component='label' variant='contained' color='secondary' startIcon={<Camera />}>
											Upload Profile Picture
											<VisuallyHiddenInput name={name} onChange={handleUpload} type='file' />
										</Button>
									</Box>
								);
							}
							return null;
						})}

						{/* Action Buttons */}
						{registerConfig.buttons.map((button) => (
							<Button key={button.id} type={button.type || 'button'} fullWidth variant={button.variant} onClick={button.navigationPath ? () => navigate(generatePath(button.navigationPath)) : null} disabled={isSubmitting} sx={{ my: 0.5 }}>
								{button.label}
							</Button>
						))}

						{/* Navigation Links */}
						{registerConfig.links.map((link) => (
							<Button key={link.id} variant='text' onClick={() => navigate(generatePath(link.navigationPath))} disabled={isSubmitting}>
								{link.label}
							</Button>
						))}
					</Box>
					<Copyright sx={{ mt: 4, mb: 4 }} />
				</Box>
			</Box>
		</Box>
	);
}