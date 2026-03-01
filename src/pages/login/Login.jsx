/**
 * LOGIN PAGE & AUTHENTICATION GATEWAY
 * ---------------------------------------------------------------------------
 * This component handles user sign-in and enforces global access policies.
 *
 * * AUTHENTICATION FLOW:
 * 1. Maintenance Check: Blocks login if site is in maintenance mode.
 * 2. Firebase Auth: Validates email/password with Google Identity Platform.
 * 3. Profile Resolution: Fetches user roles (Member vs. Applicant).
 * 4. Access Control: Checks if the user's role is currently allowed to log in
 * based on global config (e.g. 'APPLICANT_ACCESS').
 * 5. Redirection: Sends user to their intended destination or the default dashboard.
 *
 * * DYNAMIC UI:
 * The form layout (inputs, labels, buttons) is derived from 'loginContent'
 * in 'src/config/content/content.js'.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';

// UI Components
import { Avatar, Button, CssBaseline, TextField, FormControlLabel, Checkbox, Box, Typography } from '@mui/material';
import Copyright from '../../components/footer/CopyrightFooter';
import Loader from '../../components/loader/Loader';

// Contexts
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';

// Backend & Config
import { loginUser, auth, getUserProfiles, logoutUser } from '../../config/data/firebase';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { loginContent as loginConfig } from '../../config/content/content';

// User-Friendly Error Messages for Firebase Codes
const firebaseLoginErrorMessages = {
	'auth/invalid-credential': 'Invalid credentials. Please try again.',
	'auth/user-not-found': 'No account found with this email.',
	'auth/wrong-password': 'Incorrect password. Please try again.',
	'auth/invalid-email': 'Invalid email address format.',
	'auth/user-disabled': 'This account has been disabled.',
	'auth/too-many-requests': 'Too many attempts. Please try again later.',
	'auth/network-request-failed': 'Network error. Check your connection and try again.',
};

const firebaseResetErrorMessages = {
	'auth/invalid-email': 'Invalid email address format.',
	'auth/user-not-found': 'No account found with this email.',
};

export default function Login() {
	// --- Hooks & State ---
	const navigate = useNavigate();
	const location = useLocation();
	const config = useConfig();

	const { boxShadow } = useTheme();
	const { loading } = useAuth(); // Global auth loading state
	const { showAlert, handleError } = useAlert();

	const [isSubmitting, setIsSubmitting] = useState(false); // Local form loading state

	useTitle({ title: 'Login', appear: true });

	// --- Form State Initialization ---
	// Dynamically build initial state based on config fields
	const initialFormState = loginConfig.fields.reduce((acc, field) => {
		acc[field.name] = field.component === 'Checkbox' ? false : '';
		return acc;
	}, {});
	const [formData, setFormData] = useState(initialFormState);

	// --- Handlers ---

	const handleInputChange = (event) => {
		const { name, value, type, checked } = event.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value,
		}));
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setIsSubmitting(true);

		// 1. Maintenance Mode Guard
		if (config.DOWN_FOR_MAINTENANCE) {
			showAlert({ message: config.MAINTENANCE_MESSAGE || 'The site is currently down for maintenance.', type: 'info' });
			setIsSubmitting(false);
			return;
		}

		try {
			// 2. Perform Authentication
			const loginResult = await loginUser(formData.email.trim(), formData.password);
			const user = loginResult.user;

			// 3. Fetch Roles (Member vs Applicant)
			const profiles = await getUserProfiles(user.uid);
			const isMember = !!profiles.member;
			const isApplicant = !!profiles.applicant;

			// 4. Role-Based Access Control (RBAC)
			// Ensure the specific role is currently allowed to access the site
			if ((isMember && !config.MEMBER_ACCESS) || (isApplicant && !isMember && !config.APPLICANT_ACCESS)) {
				const message = isMember ? 'Access for members is currently disabled.' : 'Access for applicants is currently disabled.';

				showAlert({ message: `${message} Please try again later.`, type: 'error' });
				await logoutUser(); // Force logout if access is denied
			} else {
				// 5. Success & Redirect
				showAlert({ message: 'Login successful!', type: 'success' });

				// Redirect to where they were trying to go, or the default dashboard
				const from = location.state?.from?.pathname || generatePath(paths.redirect);
				navigate(from, { replace: true });
			}
		} catch (error) {
			const userFriendlyMessage = firebaseLoginErrorMessages[error.code] || 'An unexpected error occurred.';
			showAlert({ message: userFriendlyMessage, type: 'error' });
			handleError(error, 'login-handleSubmit', false);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handlePasswordReset = () => {
		const email = prompt('Please enter your email address');
		if (email) {
			sendPasswordResetEmail(auth, email.trim())
				.then(() => {
					showAlert({ message: 'Password reset email sent. Check your inbox.', type: 'success' });
				})
				.catch((error) => {
					const message = firebaseResetErrorMessages[error.code] || 'Failed to send reset email.';
					showAlert({ message, type: 'error' });
					handleError(error, 'login-passwordReset', false);
				});
		}
	};

	const actionMap = { handlePasswordReset: handlePasswordReset };

	if (loading || isSubmitting) return <Loader />;

	return (
		<Box display='flex' flexDirection='column' justifyContent='center' alignItems='center' bgcolor='background.passive' color='secondary.main' sx={{ height: '100vh' }}>
			<Box width={{ xs: '100%', sm: '75%', md: '50%', lg: '35%' }} height={{ xs: '100%', md: '85vh' }} padding={3} bgcolor='background.main' color='secondary.main' sx={{ borderRadius: { xs: 0, md: 4 }, boxShadow: boxShadow }}>
				<CssBaseline />

				<Box sx={{ paddingTop: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
					<Avatar sx={{ m: 1, bgcolor: 'secondary' }}>{loginConfig.icon}</Avatar>
					<Typography component='h1' variant='h5' marginBottom={2} textAlign={'center'}>
						{loginConfig.title}
					</Typography>

					{/* Dynamic Form Generation */}
					<Box component='form' display='flex' flexDirection='column' justifyContent='space-around' alignItems='center' gap={1} width='90%' onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
						{loginConfig.fields.map(({ component, name, label, ...rest }) => {
							const commonProps = { name, onChange: handleInputChange, ...rest };

							if (component === 'TextField') {
								return <TextField key={name} {...commonProps} value={formData[name]} label={label} />;
							}
							if (component === 'Checkbox') {
								return <FormControlLabel key={name} control={<Checkbox key={`${name}-checkbox`} {...commonProps} color='primary' checked={formData[name]} />} label={label} />;
							}
							return null;
						})}

						{/* Action Buttons (Login, Register, etc.) */}
						{loginConfig.buttons.map((button) => (
							<Button key={button.id} type={button.type || 'button'} variant={button.variant} fullWidth={button.fullWidth} onClick={button.navigationPath ? () => navigate(generatePath(button.navigationPath)) : null} disabled={isSubmitting} sx={{ mt: 2, mb: 1 }}>
								{button.label}
							</Button>
						))}

						{/* Links (Forgot Password) */}
						<Box display='flex' flexDirection='row' gap={1} justifyContent='center' alignItems='center' textAlign='center'>
							{loginConfig.links.map((link) => (
								<Button key={link.id} variant='text' disabled={isSubmitting} onClick={link.action ? actionMap[link.action] : () => navigate(generatePath(link.navigationPath))}>
									{link.label}
								</Button>
							))}
						</Box>
					</Box>
				</Box>

				<Copyright sx={{ mt: 4, mb: 4 }} />
			</Box>
		</Box>
	);
}