/**
 * Email Body Component
 * Renders the actual content of an email message.
 * Features:
 * - Uses 'useProcessedEmailContent' to handle inline attachments/CIDs.
 * - Displays a loading state while parsing content.
 * - Sandboxes HTML styles to prevent email formatting from breaking the app layout.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, CircularProgress, Typography } from '@mui/material';

// Hooks
import { useProcessedEmailContent } from '../../hooks/useProcessedEmailContent';

const EmailBody = ({ email, darkMode, cardStyles, cardContentStyles }) => {
	// Custom hook to handle HTML sanitization and inline image processing
	const { processedContent, contentLoading } = useProcessedEmailContent(email);

	// Styles to ensure external HTML email content renders decently within the app
	const bodyStyles = {
		mt: 1,
		p: 2,
		fontFamily: 'sans-serif',
		fontSize: '14px',
		lineHeight: 1.6,
		borderRadius: '8px',
		// Ensure contrast matches the theme
		bgcolor: darkMode ? 'background.default' : 'background.paper',
		color: 'text.primary',
		wordBreak: 'break-word',
		overflowX: 'auto', // Handle wide tables/images
		'& img': { maxWidth: '100%', height: 'auto', display: 'block' },
		'& table': { borderCollapse: 'collapse', width: '100%', maxWidth: '100%' },
		'& th, & td': { border: '1px solid', borderColor: 'divider', p: 1 },
		'& a': { color: 'primary.main' },
	};

	return (
		<Box margin='0px 20px 20px' {...cardStyles}>
			<Box {...cardContentStyles}>
				{contentLoading ? (
					<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
						<CircularProgress size={24} />
						<Typography sx={{ ml: 2 }} color='text.secondary'>
							Loading email content...
						</Typography>
					</Box>
				) : (
					<Box dangerouslySetInnerHTML={{ __html: processedContent }} sx={bodyStyles} />
				)}
			</Box>
		</Box>
	);
};

EmailBody.propTypes = {
	email: PropTypes.shape({
		id: PropTypes.string.isRequired,
		folderId: PropTypes.string.isRequired,
		content: PropTypes.string,
		inlineAttachments: PropTypes.array,
	}).isRequired,
	darkMode: PropTypes.bool.isRequired,
	cardStyles: PropTypes.object.isRequired,
	cardContentStyles: PropTypes.object.isRequired,
};

export default EmailBody;