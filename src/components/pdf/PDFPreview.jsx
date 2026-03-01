/**
 * PDF Preview Component
 * Renders converted PDF pages (as images) for the print view.
 * Features:
 * - Handles Blob URL cleanup to prevent memory leaks.
 * - Adds print-specific CSS (page breaks).
 * - Displays a loading indicator while processing pages.
 */

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, CircularProgress } from '@mui/material';

const PDFPreview = ({ displayName, pages }) => {
	// If pages are already present on mount, don't show loading
	const [loading, setLoading] = useState(!pages || pages.length === 0);

	// Cleanup Blob URLs on unmount or when pages change to prevent memory leaks
	useEffect(() => {
		return () => {
			if (pages && Array.isArray(pages)) {
				pages.forEach((url) => {
					if (url?.startsWith('blob:')) {
						URL.revokeObjectURL(url);
					}
				});
			}
		};
	}, [pages]);

	// Update loading state when pages arrive
	useEffect(() => {
		if (pages?.length > 0) {
			setLoading(false);
		}
	}, [pages]);

	if (loading) {
		return (
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					minHeight: '200px',
					pageBreakInside: 'avoid',
				}}>
				<CircularProgress size={30} />
				<Typography variant='body2' mt={2} color='text.secondary'>
					Loading {displayName}...
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ pageBreakBefore: 'always', mb: 4 }}>
			<Box
				sx={{
					pageBreakInside: 'avoid',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
				}}>
				<Typography variant='h6' sx={{ mb: 2, textAlign: 'center', fontWeight: 'bold' }}>
					{displayName}
				</Typography>

				{pages.map((src, idx) => (
					<Box
						key={src}
						component='img'
						src={src}
						alt={`${displayName} - Page ${idx + 1}`}
						sx={{
							width: '90%',
							maxWidth: '800px',
							height: 'auto',
							mb: 2, // Space between pages
							pageBreakInside: 'avoid',
							border: '1px solid',
							borderColor: 'divider',
							boxShadow: 1,
						}}
					/>
				))}
			</Box>
		</Box>
	);
};

PDFPreview.propTypes = {
	displayName: PropTypes.string.isRequired,
	pages: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default PDFPreview;