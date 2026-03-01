/**
 * Email View Dialog
 * A modal to view the full details and content of a specific email.
 * Features:
 * - Full header details (From, To, Cc, Date).
 * - HTML body rendering with inline attachment processing.
 * - Complete action set: Reply, Forward, Delete, Mark Read, Download Attachments.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Box, DialogTitle, DialogContent, DialogActions, Button, Typography, Divider, ButtonGroup, Menu, MenuItem, ListItemIcon as MuiListItemIcon, CircularProgress } from '@mui/material';
import { Reply, Forward, MarkEmailReadOutlined, MarkEmailUnreadOutlined, ArrowDropDown as ArrowDropDownIcon, Delete, Group as ReplyAllIcon, AttachFile as AttachFileIcon, Download as DownloadIcon } from '@mui/icons-material';

// Hooks & Context
import { useEmailActions } from '../../hooks/useEmailActions';
import { useAlert } from '../../context/AlertContext';
import { useProcessedEmailContent } from '../../hooks/useProcessedEmailContent';

// Backend
import { updateEmailReadStatus, deleteZohoEmail, fetchAttachmentContent } from '../../config/data/firebase';

const EmailViewDialog = ({ email, onClose, permittedAliases, member }) => {
	const { handleReply, handleReplyAll, handleForward } = useEmailActions({ permittedAliases, member });
	const { showAlert, handleError } = useAlert();

	// Process inline images/CIDs
	const { processedContent, contentLoading } = useProcessedEmailContent(email);

	// State for Reply/ReplyAll Menu
	const [anchorEl, setAnchorEl] = useState(null);
	const open = Boolean(anchorEl);

	// State for Attachment Menu
	const [attachmentAnchorEl, setAttachmentAnchorEl] = useState(null);
	const attachmentMenuOpen = Boolean(attachmentAnchorEl);

	const [isDownloading, setIsDownloading] = useState(null);

	if (!email) return null;

	// --- Handlers ---

	const handleMenuToggle = (event) => setAnchorEl(event.currentTarget);
	const handleMenuClose = () => setAnchorEl(null);

	const handleAttachmentMenuToggle = (event) => setAttachmentAnchorEl(event.currentTarget);
	const handleAttachmentMenuClose = () => setAttachmentAnchorEl(null);

	const handleReplyClick = () => {
		handleReply(email);
		handleMenuClose();
	};

	const handleReplyAllClick = () => {
		handleReplyAll(email);
		handleMenuClose();
	};

	const handleToggleRead = async () => {
		const newStatus = email.isRead ? 'unread' : 'read';
		try {
			const messagePayload = [{ id: email.id, tags: email.tags || [] }];
			await updateEmailReadStatus({ messages: messagePayload, status: newStatus });
			// Close dialog after action? Usually keeping it open is fine,
			// but if marking unread, maybe close. Leaving open for now.
		} catch (error) {
			handleError(error, 'toggle-read-status-dialog');
		}
	};

	const handleDelete = async () => {
		try {
			showAlert({ message: 'Moving email to trash...', type: 'info' });
			await deleteZohoEmail({ messageId: email.id });
			showAlert({ message: 'Email moved to trash.', type: 'success' });
			onClose();
		} catch (error) {
			handleError(error, 'delete-email-dialog');
		}
	};

	const handleDownload = async (attachment) => {
		if (isDownloading === attachment.attachmentId) return;
		setIsDownloading(attachment.attachmentId);
		try {
			const result = await fetchAttachmentContent({
				messageId: email.id,
				attachmentId: attachment.attachmentId,
				folderId: email.folderId,
			});

			const { contentType, content } = result.data;

			// Create invisible link to trigger download
			const link = document.createElement('a');
			link.href = `data:${contentType};base64,${content}`;
			link.download = attachment.attachmentName;
			document.body.appendChild(link);
			link.click();
			link.remove();
		} catch (error) {
			handleError(error, 'download-attachment');
		} finally {
			setIsDownloading(null);
		}
	};

	const handleAttachmentDownloadClick = (att) => {
		handleDownload(att);
		handleAttachmentMenuClose();
	};

	// --- Helpers ---

	const getHeader = (key) => {
		const header = email.headerContent?.[key];
		return Array.isArray(header) && header.length > 0 ? header[0] : 'N/A';
	};

	const formatAddressList = (key) => {
		const header = email.headerContent?.[key];
		return Array.isArray(header) && header.length > 0 ? header.join(', ') : 'N/A';
	};

	const hasAttachments = !!email?.attachments?.length;

	return (
		<>
			<DialogTitle sx={{ pb: 1, pr: 8 }}>{getHeader('Subject')}</DialogTitle>

			<DialogContent dividers>
				{/* Headers */}
				<Box sx={{ mb: 2, color: 'text.secondary' }}>
					<Typography variant='body2'>
						<strong>From:</strong> {getHeader('From')}
					</Typography>
					<Typography variant='body2'>
						<strong>To:</strong> {formatAddressList('To')}
					</Typography>
					<Typography variant='body2'>
						<strong>Cc:</strong> {formatAddressList('Cc')}
					</Typography>
					<Typography variant='body2'>
						<strong>Date:</strong> {new Date(getHeader('Date')).toLocaleString()}
					</Typography>
				</Box>

				<Divider />

				{/* Email Content */}
				{contentLoading ? (
					<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
						<CircularProgress size={24} />
						<Typography sx={{ ml: 2 }} color='text.secondary'>
							Loading content...
						</Typography>
					</Box>
				) : (
					<Box
						dangerouslySetInnerHTML={{ __html: processedContent }}
						sx={{
							mt: 2,
							fontFamily: 'sans-serif',
							fontSize: '14px',
							lineHeight: 1.6,
							color: 'text.primary',
							wordBreak: 'break-word',
							'& img': { maxWidth: '100%', height: 'auto', display: 'block' },
							'& table': { borderCollapse: 'collapse', width: '100%' },
							'& th, & td': { border: '1px solid', borderColor: 'divider', p: 1 },
							'& a': { color: 'primary.main' },
						}}
					/>
				)}
			</DialogContent>

			<DialogActions sx={{ justifyContent: 'flex-start', px: 2, pb: 2 }}>
				{/* Reply Split Button */}
				<ButtonGroup variant='contained' aria-label='split button' sx={{ mr: 1 }}>
					<Button onClick={handleReplyClick} startIcon={<Reply />}>
						Reply
					</Button>
					<Button size='small' aria-controls={open ? 'split-button-menu' : undefined} aria-expanded={open ? 'true' : undefined} aria-label='select reply type' aria-haspopup='menu' onClick={handleMenuToggle}>
						<ArrowDropDownIcon />
					</Button>
				</ButtonGroup>

				<Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
					<MenuItem onClick={handleReplyClick}>
						<MuiListItemIcon>
							<Reply fontSize='small' />
						</MuiListItemIcon>
						Reply
					</MenuItem>
					<MenuItem onClick={handleReplyAllClick}>
						<MuiListItemIcon>
							<ReplyAllIcon fontSize='small' />
						</MuiListItemIcon>
						Reply All
					</MenuItem>
				</Menu>

				<Button onClick={() => handleForward(email)} startIcon={<Forward />}>
					Forward
				</Button>

				<Button onClick={handleToggleRead} startIcon={email.isRead ? <MarkEmailUnreadOutlined /> : <MarkEmailReadOutlined />}>
					Mark as {email.isRead ? 'Unread' : 'Read'}
				</Button>

				<Button onClick={handleDelete} startIcon={<Delete />} color='error'>
					Delete
				</Button>

				{/* Attachments Button */}
				<Button variant='outlined' startIcon={<AttachFileIcon />} endIcon={hasAttachments ? <ArrowDropDownIcon /> : null} onClick={hasAttachments ? handleAttachmentMenuToggle : undefined} disabled={!hasAttachments}>
					{hasAttachments ? `Attachments (${email.attachments.length})` : 'No Attachments'}
				</Button>

				<Menu anchorEl={attachmentAnchorEl} open={attachmentMenuOpen} onClose={handleAttachmentMenuClose}>
					{hasAttachments &&
						email.attachments.map((att) => (
							<MenuItem key={att.attachmentId} onClick={() => handleAttachmentDownloadClick(att)} disabled={isDownloading === att.attachmentId}>
								<MuiListItemIcon>{isDownloading === att.attachmentId ? <CircularProgress size={24} /> : <DownloadIcon fontSize='small' />}</MuiListItemIcon>
								{att.attachmentName} {att.attachmentSize ? `(${(att.attachmentSize / 1024).toFixed(1)} KB)` : ''}
							</MenuItem>
						))}
				</Menu>

				<Box sx={{ flex: '1 1 auto' }} />

				<Button onClick={onClose} variant='outlined'>
					Close
				</Button>
			</DialogActions>
		</>
	);
};

EmailViewDialog.propTypes = {
	email: PropTypes.shape({
		id: PropTypes.string,
		isRead: PropTypes.bool,
		content: PropTypes.string,
		tags: PropTypes.array,
		headerContent: PropTypes.object,
		folderId: PropTypes.string,
		attachments: PropTypes.array,
		inlineAttachments: PropTypes.array,
	}),
	onClose: PropTypes.func.isRequired,
	permittedAliases: PropTypes.array,
	member: PropTypes.object,
};

export default EmailViewDialog;
