/**
 * Access Denied Page (403)
 * Displays a friendly error message when a user tries to access a restricted route.
 * Features:
 * - Lottie animation for visual feedback.
 * - Context-aware height (full screen vs. embedded in admin layout).
 * - Dynamic redirection buttons based on auth status.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import Lottie from 'lottie-react';
import { Box, Typography, Button } from '@mui/material';

// Context & Config
import { useAuth } from '../../context/AuthContext';
import { generatePath, isAdminPath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { Assets } from '../../config/Constants';

const AccessDenied = ({ message, homePath = generatePath(paths.home), dashboardPath = generatePath(paths.redirect) }) => {
	const location = useLocation();
	const { user } = useAuth();

	// Check if we are inside the admin layout to adjust height
	const isAdminRoute = isAdminPath(location.pathname);

	return (
		<Box
			display='flex'
			flexDirection='column'
			alignItems='center'
			justifyContent='center'
			boxSizing='border-box'
			borderRadius='12px'
			height={isAdminRoute ? '100%' : '100vh'}
			textAlign='center'
			padding={4}
			sx={{
				backgroundColor: 'background.main',
			}}>
			<Box sx={{ width: '100%', maxWidth: '300px' }}>
				<Lottie animationData={Assets.accessDeniedLottie} loop autoplay />
			</Box>

			<Typography variant='h2' color='custom.red' gutterBottom sx={{ mt: 2 }}>
				Access Denied (403)
			</Typography>

			<Typography variant='h5' mb={3} color='custom.brown'>
				You do not have enough permissions to access the page: &apos;<strong>{location.state?.from?.pathname || location.pathname}</strong>&apos;
				<br />
				Contact your administrator for more details or to request access.
			</Typography>

			{message && (
				<Typography variant='body1' color='custom.brown' sx={{ mb: 3 }}>
					{`Message: ${message}`}
				</Typography>
			)}

			<Button variant='contained' component={Link} replace to={user ? dashboardPath : homePath}>
				{user ? 'Go to Dashboard' : 'Go Home'}
			</Button>
		</Box>
	);
};

AccessDenied.propTypes = {
	message: PropTypes.string,
	homePath: PropTypes.string,
	dashboardPath: PropTypes.string,
};

export default AccessDenied;
