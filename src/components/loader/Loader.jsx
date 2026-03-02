/**
 * Global Loader
 * A full-screen spinner used during data fetching or authentication checks.
 * Centers a CircularProgress indicator in the viewport.
 */

import React from 'react';

import { Box, CircularProgress, Typography } from '@mui/material';

const Loader = () => (
	<Box
		bgcolor='transparent'
		sx={{
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			height: '100vh',
			width: '100%',
		}}>
		<CircularProgress color='primary' />
		<Typography sx={{ ml: 2 }}>Loading...</Typography>
	</Box>
);



export default Loader;