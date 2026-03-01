/**
 * GENERIC CREATE PAGE WRAPPER
 * ---------------------------------------------------------------------------
 * This component acts as a "Shell" for all Admin Creation screens.
 *
 * * ARCHITECTURE:
 * 1. Configuration: Looks up the form config in 'src/config/admin/index.js'
 * using the 'type' prop.
 * 2. Injection: Clones the target Form Component and injects the current
 * user's permissions.
 * 3. Consistency: Enforces the same visual wrapper (Header + Box) as the
 * Edit page.
 *
 * * USAGE ROUTE:
 * <Route path="/admin/members/new" element={<New type="members" />} />
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Contexts & Config
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useAuth } from '../../context/AuthContext';
import { creatableContent as newConfig } from '../../config/admin';

// Styles
import './new.scss';

const New = ({ type }) => {
	// --- Hooks & State ---
	const { boxShadow } = useTheme();
	const navigate = useNavigate();
	const { member: currentUser } = useAuth();

	// --- Configuration Lookup ---
	const currentConfig = newConfig[type]; // e.g. newConfig['members']

	// --- SEO ---
	useTitle({
		title: `New ${currentConfig?.formConfig?.title || type}`,
		appear: false, // Don't index admin pages
	});

	// --- Error Boundary ---
	if (!currentConfig) {
		return (
			<Typography padding='20px' color='error'>
				Error: Invalid new type ('{type}') specified. Please check your route configuration.
			</Typography>
		);
	}

	// --- The Injection Pattern ---
	// We take the Form Component defined in config (e.g. <MemberForm />)
	// and clone it, injecting the user's 'permissions' as props.
	const formWithProps = React.cloneElement(currentConfig.renderForm, {
		permissions: currentUser?.permissions,
	});

	return (
		<Box display='flex' flexDirection='column' height='100%' width='100%'>
			{/* Header Section */}
			<Box display='flex' padding='10px' margin='20px' bgcolor='background.paper' borderRadius='12px' sx={{ boxShadow: boxShadow }} alignItems='center'>
				<IconButton onClick={() => navigate(-1)} sx={{ mr: 1, color: 'secondary.main' }}>
					<ArrowBackIcon />
				</IconButton>
				<Typography fontSize='20px' variant='span' color='secondary.main'>
					New {currentConfig.formConfig.title}
				</Typography>
			</Box>

			{/* Form Container */}
			<Box display='flex' padding='10px' margin='20px' bgcolor='background.paper' borderRadius='12px' sx={{ boxShadow: boxShadow }}>
				<Box flex='1' margin='0px 20px' padding='20px 0px' color='text.primary'>
					{formWithProps}
				</Box>
			</Box>
		</Box>
	);
};

New.propTypes = {
	type: PropTypes.string.isRequired, // matches a key in 'creatableContent'
};

export default New;