/**
 * Not Found Page (404)
 * Displays a friendly error message when a user navigates to a non-existent route.
 * Features:
 * - Lottie animation for visual feedback.
 * - Context-aware height (full screen vs. embedded in admin layout).
 * - Dynamic redirection button (Dashboard vs Home) based on auth status.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Lottie from 'lottie-react';
import { Box, Typography, Button } from '@mui/material';

// Context & Config
import { useAuth } from '../../context/AuthContext';
import { generatePath, isAdminPath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { Assets } from '../../config/Constants';

const NotFound = () => {
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
			<Box width={300} height={300} mb={2}>
				<Lottie animationData={Assets.notFoundLottie} loop autoplay />
			</Box>

			<Typography variant='h2' color='custom.red'>
				404
			</Typography>

			<Typography variant='h5' gutterBottom color='custom.brown'>
				Oops! Page Not Found
			</Typography>

			<Typography variant='body1' mb={3} color='custom.brown'>
				The page &apos;<strong>{location.pathname}</strong>&apos; does not exist or was moved.
			</Typography>

			<Button variant='contained' component={Link} replace to={user ? generatePath(paths.redirect) : generatePath(paths.home)}>
				{user ? 'Go to Dashboard' : 'Go Home'}
			</Button>
		</Box>
	);
};

export default NotFound;
