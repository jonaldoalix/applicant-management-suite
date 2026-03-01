/**
 * Message Options Components
 * Sub-components used within the ContactDialog to present messaging choices.
 * * 1. TemplatedOptions:
 * - Iterates through 'templates' config.
 * - triggers 'send' function for automated system emails.
 * * 2. CustomMessageTrigger:
 * - Opens a dialog for custom subject/body.
 * - Writes directly to Firestore 'mail'/'sms' collections to trigger backend sending.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Button, Typography, Grid } from '@mui/material';

// Firebase
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';

// Context
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';

// Config
import { templates, send } from '../../config/content/push';
import { emailHeader, staticEmailFooter, senders } from '../../config/Constants';

// --- Component 1: Templated Options ---

export const TemplatedOptions = ({ darkMode, recipients, onClose }) => {
	const { showDialog } = useDialog();
	const { boxShadow } = useTheme();
	const { showAlert, handleError } = useAlert();

	const handleSend = async (templateKey, data = {}) => {
		const sender = senders[0]; // Default sender
		const emailRecipients = recipients.filter((r) => r.email);
		const smsRecipients = recipients.filter((r) => r.cell);

		if (!emailRecipients.length && !smsRecipients.length) {
			showAlert({ message: 'No valid recipients were provided.', type: 'warning' });
			return;
		}

		try {
			const result = await send(templateKey, emailRecipients, sender, [], smsRecipients, data);

			if (result.success) {
				showAlert({ message: 'Message queued for sending!', type: 'success' });
				onClose();
			} else {
				throw result.error;
			}
		} catch (error) {
			handleError(error, 'templated-options-send');
		}
	};

	const handleOpenDialog = (template) => {
		// If template requires inputs (e.g. date/time), open dialog first
		if (template.requiredFields?.length > 0) {
			showDialog({
				id: 'templatedMessage',
				data: {
					title: `Enter Required Data for ${template.label}`,
					inputs: template.requiredFields,
				},
				callback: (formData) => {
					if (formData) {
						handleSend(template.name, formData);
					}
				},
			});
		} else {
			// Otherwise send immediately
			handleSend(template.name, {});
		}
	};

	return (
		<>
			{templates.map((template) => (
				<Grid item xs={12} sm={6} md={template.title === 'Application Status' ? 8 : 4} key={template.title}>
					<Box
						display='flex'
						flexDirection='column'
						gap='10px'
						bgcolor={darkMode ? 'background.main' : 'white'}
						color={darkMode ? 'white' : 'secondary.main'}
						sx={{
							padding: '20px',
							borderRadius: '12px',
							boxShadow: boxShadow,
							height: '100%',
						}}>
						<Typography component='h2' variant='span'>
							{template.title}
						</Typography>

						{template.options.map((option) => (
							<Button key={option.name} variant='contained' sx={{ backgroundColor: darkMode ? 'primary.main' : 'highlight.main' }} onClick={() => handleOpenDialog(option)}>
								{option.label}
							</Button>
						))}
					</Box>
				</Grid>
			))}
		</>
	);
};

TemplatedOptions.propTypes = {
	darkMode: PropTypes.bool.isRequired,
	recipients: PropTypes.array.isRequired,
	onClose: PropTypes.func.isRequired,
};

// --- Component 2: Custom Message Trigger ---

export const CustomMessageTrigger = ({ darkMode, recipients, onClose }) => {
	const { boxShadow } = useTheme();
	const { showDialog } = useDialog();
	const { showAlert, handleError } = useAlert();
	const config = useConfig();

	const handleCustomMessageSend = async (formData) => {
		if (!formData) return;

		const { subject = '', emailBody = '', smsBody = '' } = formData;
		const sender = senders[0]; // Default sender

		const emailRecipients = recipients.filter((r) => r.email);
		const smsRecipients = recipients.filter((r) => r.cell);

		if (!emailRecipients.length && !smsRecipients.length) {
			showAlert({ message: 'No valid recipients were provided.', type: 'warning' });
			return;
		}

		try {
			// Process Email Recipients
			if (emailRecipients.length > 0) {
				for (const recipient of emailRecipients) {
					// Parse HTML to get plain text preview
					const parser = new DOMParser();
					const parsedHtml = parser.parseFromString(emailBody, 'text/html');
					const text = parsedHtml.body.textContent || '';

					const email = {
						to: `${recipient.name} <${recipient.email}>`,
						from: `${sender.name} <${sender.email}>`,
						replyTo: config.SYSTEM_REPLY_TO,
						message: {
							subject,
							text,
							html: emailHeader + emailBody + staticEmailFooter,
						},
					};

					// Trigger backend email extension via Firestore
					await setDoc(doc(collection(db, collections.emails)), email);
				}
			}

			// Process SMS Recipients
			if (smsRecipients.length > 0) {
				for (const recipient of smsRecipients) {
					const sms = {
						to: `+1${recipient.cell}`,
						body: smsBody || subject,
					};
					// Trigger backend SMS extension via Firestore
					await setDoc(doc(collection(db, collections.sms)), sms);
				}
			}

			showAlert({ message: 'Custom message queued!', type: 'success' });
			onClose();
		} catch (error) {
			handleError(error, 'custom-message-trigger-send');
		}
	};

	return (
		<Grid item xs={12} sm={6} md={4}>
			<Box
				display='flex'
				flexDirection='column'
				gap='20px'
				bgcolor={darkMode ? 'background.main' : 'white'}
				color={darkMode ? 'white' : 'secondary.main'}
				sx={{
					padding: '20px',
					borderRadius: '12px',
					boxShadow: boxShadow,
					height: '100%',
				}}>
				<Typography component='h2' variant='span'>
					Send a Custom Message
				</Typography>

				<Button
					variant='contained'
					sx={{ backgroundColor: darkMode ? 'primary.main' : 'highlight.main' }}
					onClick={() =>
						showDialog({
							id: 'customMessage',
							callback: handleCustomMessageSend,
						})
					}>
					Compose Message
				</Button>
			</Box>
		</Grid>
	);
};

CustomMessageTrigger.propTypes = {
	darkMode: PropTypes.bool.isRequired,
	recipients: PropTypes.array.isRequired,
	onClose: PropTypes.func.isRequired,
};
