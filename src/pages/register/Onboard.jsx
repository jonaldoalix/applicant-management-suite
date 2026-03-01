/**
 * MEMBER ONBOARDING PAGE
 * ---------------------------------------------------------------------------
 * This page registers new Committee Members (Staff).
 *
 * * WORKFLOW:
 * 1. Form Collection: Gathers name, position, and contact info.
 * 2. Identity Resolution:
 * - If email exists (e.g. former applicant), logs them in.
 * - If email is new, registers a new Firebase Auth account.
 * 3. Profile Creation: Creates a document in 'members' collection.
 * 4. Zero-Trust Init: Sets all sensitive permissions (finances, admin) to FALSE.
 *
 * * NOTE:
 * This page is distinct from 'Register.jsx', which is for Scholarship Applicants.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';

// UI Components
import { Avatar, Button, CssBaseline, TextField, Box } from '@mui/material';
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
import { registerUser, saveCollectionData, saveFile, getDownloadLinkForFile, getAuthUserByEmail, loginUser } from '../../config/data/firebase';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { UploadType, collections } from '../../config/data/collections';
import { memberRegistrationContent as onboardConfig } from '../../config/admin';

// --- Default Permission Schema ---
// New members start with NO access. An existing Admin must promote them.
const defaultPermissions = {
	admin: false,
	email: false,
	push: false,
	message: false,
	applications: false,
	site: false,
	finances: false,
	audit: false,
	archives: false,
	login: false, // Prevents login until approved
	interviews: {
		canHost: false,
		canAccess: false,
		canSchedule: false,
	},
	aliases: {
		committee: false,
		webmaster: false,
		chairman: false,
		applications: false,
		noreply: false,
		inquiries: false,
		help: false,
		hello: false,
		test: false,
		admin: false,
	},
	folders: {
		inbox: false,
		sent: false,
		spam: false,
		trash: false,
		outbox: false,
		archive: false,
		applications: false,
	},
};

export default function Onboard() {
	// --- Hooks & State ---
	const navigate = useNavigate();
	const { loading } = useAuth();
	const { boxShadow } = useTheme();
	const { showAlert } = useAlert();

	const [picture, setPicture] = useState({}); // Stores uploaded image metadata
	const [uploading, setUploading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	useTitle({ title: 'Onboard Member', appear: false });

	// Initialize form based on config to support dynamic fields
	const initialFormState = onboardConfig.fields.reduce((acc, field) => {
		if (field.component !== 'ProfilePictureUpload') {
			acc[field.name] = '';
		}
		return acc;
	}, {});
	const [formData, setFormData] = useState(initialFormState);

	// --- Handlers ---

	const handleChange = (e) => {
		const { name, value } = e.target;
		setFormData((prevState) => ({ ...prevState, [name]: value }));
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
		setIsSubmitting(true);

		// 1. Basic Validation
		if (formData.password !== formData.confirmPassword) {
			showAlert({ message: 'Passwords do not match!', type: 'error' });
			setIsSubmitting(false);
			return;
		}
		if (formData.firstName === '' || formData.lastName === '' || formData.position === '' || formData.since === '') {
			showAlert({ message: 'Please fill out all required fields.', type: 'error' });
			setIsSubmitting(false);
			return;
		}

		let user = null;

		try {
			// 2. Hybrid Auth Check
			// Check if this email is already an Applicant/User
			user = await getAuthUserByEmail(formData.email);

			if (user) {
				// If exists, log them in (Upgrade Path)
				const result = await loginUser(formData.email, formData.password);
				user = result.user;
			} else {
				// If new, create account (Fresh Path)
				const result = await registerUser(formData.email, formData.password);
				user = result.user;
			}

			if (user) {
				// 3. Create Member Profile
				const memberData = {
					id: user.uid,
					auth: user.uid,
					firstName: formData.firstName,
					lastName: formData.lastName,
					position: formData.position,
					since: formData.since,
					email: formData.email,
					cell: formData.cell,
					picture, // Linked from upload step
					permissions: defaultPermissions, // Zero-Trust defaults
					notifications: {
						email: true,
						sms: false,
					},
				};

				await saveCollectionData(collections.members, user.uid, memberData);

				showAlert({ message: 'Member successfully onboarded!', type: 'success' });
				navigate(generatePath(paths.redirect));
			} else {
				throw new Error('Error creating or authenticating user.');
			}
		} catch (error) {
			showAlert({ message: error.message, type: 'error' });
		} finally {
			setIsSubmitting(false);
		}
	};

	if (loading || isSubmitting || uploading) {
		return <Loader />;
	}

	return (
		<Box display='flex' flexDirection='column' justifyContent='center' alignItems='center' color='secondary.main' sx={{ height: '100vh' }}>
			<Box width='30rem' height='85vh' padding={3} bgcolor='background.main' color='secondary.main' sx={{ borderRadius: 4, boxShadow: boxShadow, overflow: 'hidden' }}>
				<CssBaseline />
				<Box sx={{ paddingTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', maxHeight: '100%' }}>
					{/* Header */}
					<Avatar sx={{ m: 1, mb: 2, bgcolor: 'secondary' }}>{onboardConfig.icon}</Avatar>
					{onboardConfig.title}

					{/* Dynamic Form */}
					<Box component='form' display='flex' flexDirection='column' justifyContent='center' width='90%' onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
						{onboardConfig.fields.map(({ component, name, ...rest }) => {
							if (component === 'TextField') {
								return <TextField key={name} margin='dense' fullWidth variant='outlined' name={name} value={formData[name]} onChange={handleChange} {...rest} />;
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
						{onboardConfig.buttons.map((button) => (
							<Button key={button.id} type={button.type || 'button'} fullWidth variant={button.variant} onClick={button.navigationPath ? () => navigate(generatePath(button.navigationPath)) : null} sx={{ my: 0.5 }}>
								{button.label}
							</Button>
						))}

						{/* Navigation Links */}
						{onboardConfig.links.map((link) => (
							<Button key={link.id} variant='text' onClick={() => navigate(generatePath(link.navigationPath))} sx={{ mt: 1 }}>
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