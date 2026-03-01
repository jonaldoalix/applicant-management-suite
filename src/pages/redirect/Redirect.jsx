/**
 * POST-LOGIN TRAFFIC CONTROLLER
 * ---------------------------------------------------------------------------
 * This component determines the user's destination based on their assigned role.
 *
 * * ROUTING LOGIC:
 * 1. Single Role: Automatically redirects to the appropriate dashboard.
 * - Applicant -> /apply
 * - Member -> /dashboard
 *
 * 2. Dual Role (Member + Applicant):
 * - Pauses automatic redirection.
 * - Renders a "Role Selection" UI allowing the user to choose their active session context.
 *
 * * NOTE:
 * Uses { replace: true } for all navigations to keep the browser history clean.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// UI Components
import { Avatar, Button, CssBaseline, Box, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Loader from '../../components/loader/Loader';
import Copyright from '../../components/footer/CopyrightFooter';

// Contexts & Config
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { UserType } from '../../config/data/collections';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';

const Redirect = () => {
	// --- Hooks & State ---
	const navigate = useNavigate();
	const { role, loading } = useAuth();
	const { boxShadow } = useTheme();

	// Local state to handle the selection if the user has multiple roles
	const [selectedRole, setSelectedRole] = useState(null);

	useTitle({ title: 'Redirecting...', appear: false });

	// --- Effect: Routing Logic ---
	useEffect(() => {
		// Wait for auth to finish loading
		if (!loading && role) {
			// Case A: Applicant Only
			if (role === UserType.applicant) {
				navigate(generatePath(paths.apply), { replace: true });
			}
			// Case B: Member Only
			else if (role === UserType.member) {
				navigate(generatePath(paths.memberDash), { replace: true });
			}
			// Case C: Dual Role (Wait for user selection)
			else if (role === UserType.both && selectedRole) {
				const destination = selectedRole === UserType.applicant ? paths.apply : paths.memberDash;
				navigate(generatePath(destination), { replace: true });
			}
		}
	}, [loading, role, selectedRole, navigate]);

	// --- Handlers ---

	const handleRoleSelection = (role) => {
		setSelectedRole(role);
	};

	const handleLogout = () => {
		navigate(generatePath(paths.logout));
	};

	// --- Render States ---

	// 1. Loading State
	if (!role || loading) {
		return <Loader />;
	}

	// 2. Dual Role Selection Screen
	if (role === UserType.both && !selectedRole) {
		return (
			<Box display='flex' flexDirection='column' justifyContent='center' alignItems='center' color='secondary.main' sx={{ height: '100vh' }}>
				<Box width={{ xs: '100%', sm: '75%', md: '50%', lg: '35%' }} height={{ xs: '100%', sm: '85vh' }} padding={3} bgcolor='background.main' color='secondary.main' sx={{ borderRadius: { xs: 0, sm: 4 }, boxShadow: boxShadow }}>
					<CssBaseline />

					<Box sx={{ paddingTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
						<Avatar sx={{ m: 1, bgcolor: 'secondary' }}>
							<LockOutlinedIcon />
						</Avatar>
						<Typography component='h1' variant='h5'>
							Which account?
						</Typography>

						{/* Role Buttons */}
						<Box display='flex' flexDirection='column' gap={2} justifyContent='center' width='90%' noValidate sx={{ mt: 5 }}>
							<Button variant='outlined' onClick={() => handleRoleSelection(UserType.applicant)}>
								Applicant Dashboard
							</Button>
							<Button variant='outlined' onClick={() => handleRoleSelection(UserType.member)}>
								Member Dashboard
							</Button>
							<Button variant='outlined' color='error' onClick={handleLogout}>
								Logout
							</Button>
						</Box>

						{/* Explanation Text */}
						<Box sx={{ paddingTop: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '90%' }}>
							<Typography variant='body2' component='p' align='center' color='text.secondary'>
								You have both Applicant and Member privileges. While logged in, you can only use one type of account at a time.
								<br />
								<br />
								Please make a selection to continue.
							</Typography>
						</Box>
					</Box>

					<Copyright sx={{ mt: 6, mb: 0 }} />
				</Box>
			</Box>
		);
	}

	// 3. Fallback (Should be instant redirect for single roles)
	return <Loader />;
};

export default Redirect;