/**
 * Section Component
 * A layout wrapper that provides a Title, a Divider, and content spacing.
 * Used to segment detailed views (e.g., "Education History" section).
 */

import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import PropTypes from 'prop-types';

const Section = ({ title, children }) => {
	// Do not render empty sections
	if (!children) return null;

	return (
		<Box mt={1}>
			<Typography variant='h5' gutterBottom>
				{title}
			</Typography>
			<Divider />
			<Box mt={2}>{children}</Box>
		</Box>
	);
};

Section.propTypes = {
	title: PropTypes.string.isRequired,
	children: PropTypes.node.isRequired,
};

export default Section;