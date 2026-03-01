/**
 * Email Reader Card
 * Displays the full content of an email message, including attachments and headers.
 * Uses custom hooks to manage actions like Reply, Forward, and Download.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';

// Context & Hooks
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { useMailbox } from '../../context/MailboxContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useEmailActions } from '../../hooks/useEmailActions';

// Config
import { paths } from '../../config/navigation/paths';
import { collections } from '../../config/data/collections';
import { capitalize } from '../../config/Constants';
import { updateEmailReadStatus, deleteZohoEmail, fetchAttachmentContent } from '../../config/data/firebase';

// Components
import SingleAssetPage, { AssetCard } from '../layout/SingleAssetPage';
import NotesSection from '../notes/NotesSection';
import EmailBody from '../messaging/EmailBody';
import EmailActions from '../messaging/EmailActions';
import Header from '../assets/Header';
import InfoTable from '../assets/InfoTable';

const EmailCard = ({ email }) => {
	const config = useConfig();
	const navigate = useNavigate();
	const { darkMode, boxShadow } = useTheme();
	const { showDialog } = useDialog();
	const { member, permittedAliases } = useMailbox();
	const { showAlert, handleError } = useAlert();

	const { handleReply, handleReplyAll, handleForward } = useEmailActions({ navigate, permittedAliases, member });

	const [isDownloading, setIsDownloading] = useState(null);
	const [showNotes, setShowNotes] = useState(false);

	if (!email) return null;

	// Local handlers for specific card actions
	const handleToggleRead = async () => {
		const newStatus = email.isRead ? 'unread' : 'read';
		try {
			const messagePayload = [{ id: email.id, tags: email.tags || [] }];
			await updateEmailReadStatus({ messages: messagePayload, status: newStatus });
			showAlert({ message: `Email marked as ${newStatus}`, type: 'success' });
		} catch (error) {
			handleError(error, 'toggle-read-status-card');
		}
	};

	const handleDelete = async () => {
		showDialog({
			id: 'confirmAction',
			messageOverride: `Are you sure you want to move the email "${email.subject || 'this email'}" to the trash?`,
			callback: async (confirmed) => {
				if (confirmed) {
					try {
						showAlert({ message: 'Moving email to trash...', type: 'info' });
						await deleteZohoEmail({ messageId: email.id });
						showAlert({ message: 'Email moved to trash.', type: 'success' });
						navigate(paths.inbox);
					} catch (error) {
						handleError(error, 'delete-email-card');
					}
				}
			},
		});
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
			const link = document.createElement('a');
			link.href = `data:${contentType};base64,${content}`;
			link.download = attachment.attachmentName;
			document.body.appendChild(link);
			link.click();
			link.remove();
		} catch (error) {
			handleError(error, 'download-attachment-card');
		} finally {
			setIsDownloading(null);
		}
	};

	const getHeader = (key) => {
		const header = email.headerContent?.headerContent?.[key];
		return Array.isArray(header) && header.length > 0 ? header[0] : 'N/A';
	};

	const formatAddressList = (key) => {
		const header = email.headerContent?.headerContent?.[key];
		return Array.isArray(header) && header.length > 0 ? header.join(', ') : 'N/A';
	};

	const emailInfo = [
		{ label: 'From', value: getHeader('From') },
		{ label: 'To', value: formatAddressList('To') },
		{ label: 'CC', value: formatAddressList('Cc') },
		{ label: 'Dated', value: new Date(getHeader('Date')).toLocaleString() },
	];

	return (
		<SingleAssetPage>
			<Box display='flex' padding='20px' gap='20px'>
				<AssetCard flex='2'>
					<Header config={config} title={getHeader('Subject')} status={capitalize(email.folderName)}>
						<InfoTable data={emailInfo} />
					</Header>
				</AssetCard>

				<EmailActions
					email={email}
					darkMode={darkMode}
					cardStyles={{
						bgcolor: darkMode ? 'background.main' : 'white',
						borderRadius: '12px',
						boxShadow: boxShadow,
					}}
					cardContentStyles={{ padding: '20px' }}
					onReply={handleReply}
					onReplyAll={handleReplyAll}
					onForward={handleForward}
					onToggleRead={handleToggleRead}
					onDelete={handleDelete}
					onShowNotesToggle={() => setShowNotes(!showNotes)}
					onDownload={handleDownload}
					isDownloading={isDownloading}
					showNotes={showNotes}
				/>
			</Box>

			{showNotes && (
				<Box margin='0px 20px 20px'>
					<AssetCard>
						<NotesSection targetId={email?.id} targetCollection={collections.mailCache} />
					</AssetCard>
				</Box>
			)}

			<EmailBody
				email={email}
				darkMode={darkMode}
				cardStyles={{
					bgcolor: darkMode ? 'background.main' : 'white',
					borderRadius: '12px',
					boxShadow: darkMode ? '2px 4px 10px 1px rgba(156, 156, 156, 0.47)' : '2px 4px 10px 1px rgba(0, 0, 0, 0.47)',
					margin: '0px 20px 20px',
				}}
				cardContentStyles={{ padding: '20px' }}
			/>
		</SingleAssetPage>
	);
};

EmailCard.propTypes = {
	email: PropTypes.shape({
		id: PropTypes.string,
		isRead: PropTypes.bool,
		content: PropTypes.string,
		headerContent: PropTypes.object,
		folderId: PropTypes.string,
		folderName: PropTypes.string,
		attachments: PropTypes.array,
		inlineAttachments: PropTypes.array,
		tags: PropTypes.array,
		subject: PropTypes.string,
	}).isRequired,
};

export default EmailCard;