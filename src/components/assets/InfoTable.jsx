/**
 * InfoTable Component
 * Renders a simple key-value list for displaying read-only data.
 * Skips rows with empty values to keep the UI clean.
 */

import React from 'react';
import { Box, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const InfoTable = ({ data }) => {
	if (!data || data.length === 0) return null;

	return (
		<Box>
			{data.map(
				(row) =>
					// Only render rows that have a value
					row.value && (
						<Box key={row.label} mb='10px' fontSize='14px'>
							<Typography component='span' fontWeight='bold' color='text.secondary' mr='5px'>
								{row.label}:
							</Typography>
							<Typography component='span' fontWeight='300'>
								{row.value}
							</Typography>
						</Box>
					)
			)}
		</Box>
	);
};

InfoTable.propTypes = {
	data: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string.isRequired,
			value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		})
	).isRequired,
};

export default InfoTable;