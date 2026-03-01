/**
 * Construction Component
 * A placeholder for pages or sections currently in development.
 * Features:
 * - Displays a "Under Construction" Lottie animation.
 * - Accepts an optional message prop.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';
import Lottie from 'lottie-react';

// Config
import { Assets } from '../../config/Constants';

const Construction = ({ message = 'Under Construction' }) => {
	return (
		<Box
			width='100%'
			height='100%'
			bgcolor='background.main'
			sx={{
				minHeight: 280,
				padding: 4,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				textAlign: 'center',
			}}>
			<Box
				sx={{
					width: '100%',
					maxWidth: '350px',
					height: 'auto',
					mb: 2,
				}}>
				{/* Note: Preserving original key spelling 'underContructionLottie' */}
				<Lottie animationData={Assets.underContructionLottie} loop autoplay style={{ width: '100%', height: '100%' }} />
			</Box>

			<Typography variant='h5' color='text.secondary'>
				{message}
			</Typography>
		</Box>
	);
};

Construction.propTypes = {
	message: PropTypes.string,
};

export default Construction;