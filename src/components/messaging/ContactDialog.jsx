/**
 * Contact Dialog
 * A modal hub that presents different messaging options to the user.
 * Options:
 * - Templated Options (Pre-written system emails like 'Interview Invite').
 * - Custom Message Trigger (Opens the 'ComposeEmailDialog').
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, DialogTitle, DialogContent, DialogActions, Button, Grid } from '@mui/material';

// Context
import { useTheme } from '../../context/ThemeContext';

// Components
import { TemplatedOptions, CustomMessageTrigger } from './MessageOptions';

const ContactDialog = ({ recipients, onClose, title }) => {
	const { darkMode } = useTheme();

	const getDialogTitle = () => {
		if (title) return title;
		if (!recipients || recipients.length === 0) return 'Send a Message';
		if (recipients.length > 1) return `Contacting ${recipients.length} Recipients`;
		return `Contacting: ${recipients[0]?.name || 'Recipient'}`;
	};

	return (
		<>
			<DialogTitle>{getDialogTitle()}</DialogTitle>

			<DialogContent>
				<Box p={1}>
					<Grid container spacing={2}>
						{/* Option 1: System Templates */}
						<TemplatedOptions darkMode={darkMode} recipients={recipients} onClose={onClose} />

						{/* Option 2: Custom Email */}
						<CustomMessageTrigger darkMode={darkMode} recipients={recipients} onClose={onClose} />
					</Grid>
				</Box>
			</DialogContent>

			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</>
	);
};

ContactDialog.propTypes = {
	recipients: PropTypes.array.isRequired,
	onClose: PropTypes.func.isRequired,
	title: PropTypes.string,
};

export default ContactDialog;