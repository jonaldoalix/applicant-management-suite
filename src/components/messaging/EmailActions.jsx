/**
 * Email Actions Component
 * A panel of action buttons (Reply, Forward, Delete, etc.) for an individual email.
 * Features:
 * - Reply / Reply All split button.
 * - Attachment dropdown with download status.
 * - Mark Read/Unread toggle.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Button, ButtonGroup, Menu, MenuItem, ListItemIcon as MuiListItemIcon, CircularProgress } from '@mui/material';
import { Reply, Forward, MarkEmailReadOutlined, MarkEmailUnreadOutlined, ArrowDropDown as ArrowDropDownIcon, Delete, Group as ReplyAllIcon, AttachFile as AttachFileIcon, Download as DownloadIcon } from '@mui/icons-material';

const EmailActions = ({ email, darkMode, cardStyles, cardContentStyles, onReply, onReplyAll, onForward, onToggleRead, onDelete, onShowNotesToggle, onDownload, isDownloading = null, showNotes }) => {
	// Dropdown state for Reply options
	const [anchorEl, setAnchorEl] = useState(null);
	const open = Boolean(anchorEl);

	// Dropdown state for Attachments
	const [attachmentAnchorEl, setAttachmentAnchorEl] = useState(null);
	const attachmentMenuOpen = Boolean(attachmentAnchorEl);

	const hasAttachments = !!email?.attachments?.length;

	// --- Handlers ---

	const handleMenuToggle = (event) => setAnchorEl(event.currentTarget);
	const handleMenuClose = () => setAnchorEl(null);

	const handleAttachmentMenuToggle = (event) => setAttachmentAnchorEl(event.currentTarget);
	const handleAttachmentMenuClose = () => setAttachmentAnchorEl(null);

	const handleReplyClick = () => {
		onReply(email);
		handleMenuClose();
	};

	const handleReplyAllClick = () => {
		onReplyAll(email);
		handleMenuClose();
	};

	const handleAttachmentDownloadClick = (att) => {
		onDownload(att);
		handleAttachmentMenuClose();
	};

	return (
		<Box flex='0.5' {...cardStyles} {...cardContentStyles} display='flex' flexDirection='column' gap='10px'>
			<Typography variant='span' fontSize='16px' color={darkMode ? 'secondary.main' : 'text.highlight'}>
				Actions
			</Typography>

			{/* Reply / Reply All Split Button */}
			<ButtonGroup variant='contained' aria-label='reply split button' fullWidth>
				<Button onClick={handleReplyClick} startIcon={<Reply />} sx={{ flexGrow: 1 }}>
					Reply
				</Button>
				<Button size='small' onClick={handleMenuToggle} sx={{ flexGrow: 0 }} aria-label='Reply options'>
					<ArrowDropDownIcon />
				</Button>
			</ButtonGroup>

			<Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} transformOrigin={{ vertical: 'top', horizontal: 'center' }}>
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

			{/* Standard Actions */}
			<Button onClick={() => onForward(email)} startIcon={<Forward />} variant='outlined' fullWidth>
				Forward
			</Button>

			<Button onClick={onToggleRead} startIcon={email.isRead ? <MarkEmailUnreadOutlined /> : <MarkEmailReadOutlined />} variant='outlined' fullWidth>
				Mark as {email.isRead ? 'Unread' : 'Read'}
			</Button>

			<Button onClick={onDelete} startIcon={<Delete />} color='error' variant='outlined' fullWidth>
				Delete
			</Button>

			<Button onClick={onShowNotesToggle} variant='outlined' fullWidth>
				{showNotes ? 'Hide' : 'Show'} Notes
			</Button>

			{/* Attachments Dropdown */}
			<Button variant='outlined' startIcon={<AttachFileIcon />} endIcon={hasAttachments ? <ArrowDropDownIcon /> : null} onClick={hasAttachments ? handleAttachmentMenuToggle : undefined} disabled={!hasAttachments} fullWidth>
				{hasAttachments ? `Attachments (${email.attachments.length})` : 'No Attachments'}
			</Button>

			<Menu anchorEl={attachmentAnchorEl} open={attachmentMenuOpen} onClose={handleAttachmentMenuClose}>
				{hasAttachments &&
					email.attachments.map((att) => (
						<MenuItem key={att.attachmentId} onClick={() => handleAttachmentDownloadClick(att)} disabled={isDownloading === att.attachmentId}>
							<MuiListItemIcon>{isDownloading === att.attachmentId ? <CircularProgress size={20} /> : <DownloadIcon fontSize='small' />}</MuiListItemIcon>
							{att.attachmentName} {att.attachmentSize ? `(${(att.attachmentSize / 1024).toFixed(1)} KB)` : ''}
						</MenuItem>
					))}
			</Menu>
		</Box>
	);
};

EmailActions.propTypes = {
	email: PropTypes.shape({
		isRead: PropTypes.bool,
		attachments: PropTypes.arrayOf(
			PropTypes.shape({
				attachmentId: PropTypes.string.isRequired,
				attachmentName: PropTypes.string,
				attachmentSize: PropTypes.number,
			})
		),
	}).isRequired,
	darkMode: PropTypes.bool.isRequired,
	cardStyles: PropTypes.object.isRequired,
	cardContentStyles: PropTypes.object.isRequired,
	onReply: PropTypes.func.isRequired,
	onReplyAll: PropTypes.func.isRequired,
	onForward: PropTypes.func.isRequired,
	onToggleRead: PropTypes.func.isRequired,
	onDelete: PropTypes.func.isRequired,
	onShowNotesToggle: PropTypes.func.isRequired,
	onDownload: PropTypes.func.isRequired,
	isDownloading: PropTypes.string,
	showNotes: PropTypes.bool.isRequired,
};

export default EmailActions;