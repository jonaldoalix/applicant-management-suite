/**
 * DATA TABLE CONFIGURATION & COMPONENTS
 * ---------------------------------------------------------------------------
 * This file defines the columns, actions, and custom cell renderers for the
 * application's Data Grids (Tables).
 *
 * * ARCHITECTURE:
 * 1. ActionFactory: 'ActionCellButton' renders buttons based on a config key.
 * 2. RowActions: Defines the behavior (onClick), icon, and color for every action.
 * 3. CustomCells: React components for rendering complex data (Avatars, Dates).
 * 4. TableConfig: Exports the column definitions used by the 'DynamicTable' component.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import he from 'he';
import { format } from 'date-fns';

// UI Components & Icons
import { Avatar, Box, Typography } from '@mui/material';
import { FileUploadOutlined as UploadIcon, MailOutline, Rsvp, Visibility, PublishedWithChangesOutlined, MeetingRoomOutlined, ChairOutlined, EventOutlined, DeleteOutline, AddBoxOutlined, NoMeetingRoomOutlined, InfoOutlined, EditOutlined, DoneAllOutlined, ContactPageOutlined, Check, HourglassBottom, Close, CloseOutlined, SendOutlined, Add, Send, Delete, PersonOutline, Reply, ReplyAll, Forward, MarkEmailReadOutlined, MarkEmailUnreadOutlined, AttachFile as AttachFileIcon, PeopleOutlined } from '@mui/icons-material';

// Contexts & Hooks
import { useConfig } from '../../context/ConfigContext';
import { useDialog } from '../../context/DialogContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useEmailActions } from '../../hooks/useEmailActions';

// Config & Utils
import { generatePath } from '../navigation/routeUtils';
import { paths } from '../navigation/paths';
import { collections, InterviewStatus } from '../data/collections';
import { attachmentFields, generateUploadLink, generateSecurePin, generate6DigitNumber } from '../Constants';
import { blankApplicant } from '../data/Validation';
import { sendRequest } from '../content/push';

// Backend / Firebase
import { getCollectionData, updateCollectionData, db, getDocumentsByIDs, getUserAuthRecord, updateEmailReadStatus, fetchEmailContent, deleteZohoEmail, bulkDeleteZohoEmails, deleteSingleInterview, createInterviewRoom, closeInterviewRoom, updateInterviewStatus, sendInterviewInvitations, bulkDeleteInterviews, deleteDeliberationRoom, createDeliberationRoom, bulkUpdateInterviewStatus } from '../data/firebase';
import { writeBatch, doc } from 'firebase/firestore';

// Components
import Loader from '../../components/loader/Loader';
import ContactDialog from '../../components/messaging/ContactDialog';
import RescheduleDialog from '../../components/interviews/RescheduleDialog';
import AutoScheduler from '../../components/interviews/AutoScheduler';
import ManualScheduler from '../../components/interviews/ManualScheduler';

// --- Styles ---

const buttonContainerSX = {
	display: 'flex',
	flexDirection: 'column',
	gap: '3px',
	fontWeight: '400',
	fontSize: '9px',
	textAlign: 'center',
	justifyContent: 'space-between',
	alignContent: 'center',
	paddingTop: '5px',
	alignItems: 'center',
	cursor: 'pointer',
};

const iconButtonSX = {
	padding: '2px 5px',
	borderRadius: '5px',
};

// --- Helper Functions ---

export const getAttachmentLabel = (key) => {
	const match = attachmentFields.find((f) => f.key === key);
	let label = match ? match?.label : key;
	if (label?.endsWith('Letter of Recommendation')) {
		label = label?.replace('Letter of Recommendation', '');
	}
	return label;
};

export const getStatusIcon = (completed, invalid) => {
	if (completed) return <Check sx={{ color: 'success.main' }} />;
	if (invalid) return <Close sx={{ color: 'error.main' }} />;
	return <HourglassBottom sx={{ color: 'warning.main' }} />;
};

export const parseDisplayName = (addressString) => {
	if (!addressString) return 'Unknown';
	const decodedString = he.decode(addressString);
	const nameMatch = decodedString.match(/([^<]*)\s*</);
	if (nameMatch?.[1]) {
		const name = nameMatch[1].replaceAll('"', '').trim();
		if (name) return name;
	}
	return decodedString.replaceAll(/[<>"]/g, '');
};

export const getRsvpLabel = (status) => {
	if (status === 'yes') return '✅ Yes';
	if (status === 'no') return '❌ No';
	return '❓ Unknown';
};

export const extractPipeData = (text) => {
	if (!text || typeof text !== 'string') {
		return { left: '', right: '' };
	}
	const parts = text.split('|');
	return {
		left: parts[0]?.trim() || '',
		right: parts[1]?.trim() || '',
	};
};

// =============================================================================
//  1. THE ACTION FACTORY
// =============================================================================

/**
 * A "Smart Button" that renders based on a configuration key.
 * Used inside table cells to render Edit, View, Delete buttons dynamically.
 */
const ActionCellButton = ({ actionKey, row, ...props }) => {
	const navigate = useNavigate();
	const { showDialog } = useDialog();
	const { showAlert, handleError } = useAlert();
	const { member } = useAuth();
	const configContext = useConfig();
	const [loading, setLoading] = useState(false);

	const emailActions = useEmailActions({
		permittedAliases: props.permittedAliases,
		member,
		navigate,
	});

	const config = ROW_ACTIONS[actionKey];

	if (!config) return null;

	// Check visibility conditions
	if (config?.hide?.({ row, member })) {
		return null;
	}

	const handleClick = async (e) => {
		e.stopPropagation();
		if (loading) return;

		if (config.async) setLoading(true);

		try {
			await config.onClick({
				row,
				navigate,
				showDialog,
				showAlert,
				handleError,
				member,
				config: configContext,
				emailActions,
				props,
			});
		} catch (error) {
			console.error(error);
			if (config.async) handleError(error, `action-${actionKey}`);
		} finally {
			if (config.async) setLoading(false);
		}
	};

	// --- Resolve Visuals ---
	const IconFromConfig = config.icon;
	const IconComponent = typeof IconFromConfig === 'function' && !IconFromConfig.muiName ? IconFromConfig(row) : IconFromConfig;
	const resolvedLabel = typeof config.getLabel === 'function' ? config.getLabel(row) : config.label;
	const color = typeof config.getColor === 'function' ? config.getColor(row) : config.color;
	const borderColor = config.borderColor || color;

	return (
		<Box sx={{ ...buttonContainerSX, opacity: loading ? 0.5 : 1 }} onClick={handleClick}>
			<IconComponent
				sx={{
					...iconButtonSX,
					color: color,
					border: '1px dotted',
					borderColor: borderColor,
				}}
			/>
			{loading ? (
				'...'
			) : (
				<Typography variant='subtitle2' fontSize='9.5px'>
					{resolvedLabel}
				</Typography>
			)}
		</Box>
	);
};

ActionCellButton.propTypes = {
	actionKey: PropTypes.string.isRequired,
	row: PropTypes.object.isRequired,
	permittedAliases: PropTypes.array,
};

// =============================================================================
//  2. ACTION DEFINITIONS (Logic Mapping)
// =============================================================================

const ROW_ACTIONS = {
	// -- General --
	viewApp: {
		label: 'View',
		icon: InfoOutlined,
		color: 'info.light',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.viewApp, { id: row.id })),
	},
	markEligible: {
		label: 'Evaluate',
		icon: DoneAllOutlined,
		color: 'success.light',
		onClick: ({ row, showDialog, showAlert, handleError }) => {
			showDialog({
				id: 'markEligibility',
				data: { app: row },
				callback: async (newStatus) => {
					if (newStatus) {
						await updateCollectionData(collections.applications, row.id, { status: newStatus });
						showAlert({ message: `Application marked as ${newStatus}.`, type: 'success' });
					}
				},
			});
		},
	},

	// -- Members/Applicants --
	viewMember: {
		label: 'View',
		icon: InfoOutlined,
		color: 'info.light',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.viewMember, { id: row.id })),
	},
	viewApplicant: {
		label: 'View',
		icon: InfoOutlined,
		color: 'info.light',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.viewApplicant, { id: row.id })),
	},
	editMember: {
		label: 'Edit',
		icon: EditOutlined,
		color: 'warning.dark',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.editMember, { id: row.id })),
	},
	editApplicant: {
		label: 'Edit',
		icon: EditOutlined,
		color: 'warning.dark',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.editApplicant, { id: row.id })),
	},
	contact: {
		label: 'Contact',
		icon: ContactPageOutlined,
		color: 'custom.brown',
		onClick: ({ row, showDialog }) => {
			const recipient = {
				id: row.id,
				name: row.attachmentType ? row.name : row.applicantName || `${row.firstName} ${row.lastName}`,
				email: row.email,
				cell: row.cell,
			};
			showDialog({
				id: 'contactDialog',
				data: { title: `Contacting: ${recipient.name}`, component: ContactDialog, recipients: [recipient], maxWidth: 'sm' },
			});
		},
	},

	// -- Requests --
	viewRequestApp: {
		label: 'View App',
		icon: InfoOutlined,
		color: 'info.light',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.viewApp, { id: row.applicationID })),
	},
	editRequest: {
		label: 'Edit',
		icon: EditOutlined,
		color: 'warning.dark',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.editRequest, { id: row.id })),
	},
	resendRequest: {
		label: 'Resend',
		icon: SendOutlined,
		color: 'success.dark',
		async: true,
		onClick: async ({ row, showAlert, config }) => {
			const newExpiry = config.APPLICATION_DEADLINE;
			const sixDigits = generate6DigitNumber();
			await updateCollectionData(collections.requests, row.id, { attempts: 0, expiryDate: newExpiry, pinCode: await generateSecurePin(sixDigits) });
			const uploadLink = await generateUploadLink(row.id);
			await sendRequest(row, uploadLink, sixDigits);
			showAlert({ message: 'Request resent successfully!', type: 'success' });
		},
	},
	invalidateRequest: {
		label: 'Cancel',
		icon: CloseOutlined,
		color: 'error.dark',
		async: true,
		onClick: async ({ row, showAlert }) => {
			await updateCollectionData(collections.requests, row.id, { expiryDate: new Date().toISOString() });
			if (row.attachmentsID && row.attachmentType && row.applicationID) {
				const application = await getCollectionData(row.applicationID, collections.applications, row.applicationID);
				if (application?.completedBy) {
					const attachmentsDoc = await getCollectionData(application.completedBy, collections.attachments, row.attachmentsID);
					if (attachmentsDoc?.[row.attachmentType]?.requestID === row.id) {
						delete attachmentsDoc[row.attachmentType].requestID;
						await updateCollectionData(collections.attachments, row.attachmentsID, attachmentsDoc);
					}
				}
			}
			showAlert({ message: 'Request invalidated and unlinked!', type: 'success' });
		},
	},

	// -- Interviews --
	joinInterview: {
		label: 'Enter',
		icon: MeetingRoomOutlined,
		color: 'success.dark',
		hide: ({ row, member }) => !row.roomId || !member?.permissions?.interviews?.canAccess,
		onClick: ({ row, navigate }) => navigate(generatePath(paths.interviewRoom, { interviewId: row.id })),
	},
	waitInterview: {
		label: 'Wait',
		icon: ChairOutlined,
		color: 'info.light',
		hide: ({ row, member }) => ![InterviewStatus.invited, InterviewStatus.confirmed].includes(row.status) || !member?.permissions?.interviews?.canAccess,
		onClick: ({ row, navigate }) => navigate(generatePath(paths.waitingRoom, { interviewId: row.id })),
	},
	rescheduleInterview: {
		label: 'Reschedule',
		icon: EventOutlined,
		color: 'warning.dark',
		hide: ({ member }) => !member?.permissions?.interviews?.canSchedule,
		onClick: ({ row, showDialog }) => showDialog({ id: 'rescheduleInterview', data: { component: RescheduleDialog, interview: row } }),
	},
	deleteInterview: {
		label: 'Delete',
		icon: DeleteOutline,
		color: 'error.dark',
		hide: ({ member }) => !member?.permissions?.interviews?.canSchedule,
		onClick: ({ row, showDialog, showAlert, handleError }) => {
			showDialog({
				id: 'confirmAction',
				messageOverride: 'Are you sure you want to delete this interview? This action cannot be undone.',
				callback: async (confirmed) => {
					if (confirmed) {
						try {
							await deleteSingleInterview({ interviewId: row.id });
							showAlert({ message: 'Interview deleted.', type: 'success' });
						} catch (error) {
							handleError(error, 'delete-interview-error');
						}
					}
				},
			});
		},
	},
	createRoom: {
		label: 'Open',
		icon: AddBoxOutlined,
		color: 'success.dark',
		async: true,
		hide: ({ row, member }) => row.roomId || !member?.permissions?.interviews?.canHost,
		onClick: async ({ row, showAlert }) => {
			await createInterviewRoom({ interviewId: row.id });
			showAlert({ message: 'Room created successfully!', type: 'success' });
		},
	},
	closeRoom: {
		label: 'Close',
		icon: NoMeetingRoomOutlined,
		color: 'error.dark',
		hide: ({ row, member }) => !row.roomId || !member?.permissions?.interviews?.canHost,
		onClick: async ({ row, showAlert }) => {
			await closeInterviewRoom({ interviewId: row.id });
			showAlert({ message: 'Interview room closed.', type: 'success' });
		},
	},
	changeStatus: {
		label: 'Status',
		icon: PublishedWithChangesOutlined,
		color: 'warning.dark',
		hide: ({ member }) => !member?.permissions?.interviews?.canHost,
		onClick: ({ row, showDialog, showAlert }) => {
			showDialog({
				id: 'changeInterviewStatus',
				data: { status: row.status },
				callback: async (formData) => {
					if (formData?.status) {
						await updateInterviewStatus({ interviewId: row.id, newStatus: formData.status });
						showAlert({ message: 'Interview status updated!', type: 'success' });
					}
				},
			});
		},
	},
	sendInvite: {
		label: 'Invite',
		icon: MailOutline,
		color: 'success.dark',
		hide: ({ row }) => row.status !== 'Scheduled',
		onClick: ({ row, showDialog, showAlert }) => {
			showDialog({
				id: 'adminActionConfirmation',
				messageOverride: `Are you sure you want to send an invitation for the interview with ${row.applicantName}?`,
				callback: async (confirmed) => {
					if (confirmed) {
						await sendInterviewInvitations({ interviewIds: [row.id] });
						showAlert({ message: 'Invitation queued successfully!', type: 'success' });
					}
				},
			});
		},
	},
	updateRsvp: {
		label: 'RSVP',
		icon: Rsvp,
		color: 'warning.dark',
		onClick: ({ row, showDialog, showAlert }) => {
			showDialog({
				id: 'updateRsvpStatus',
				data: { rsvpStatus: row.rsvpStatus },
				callback: async (formData) => {
					if (formData?.rsvpStatus) {
						await updateCollectionData(collections.interviews, row.id, { rsvpStatus: formData.rsvpStatus });
						showAlert({ message: 'RSVP status updated!', type: 'success' });
					}
				},
			});
		},
	},
	viewApplicantFromInterview: {
		label: 'Applicant',
		icon: Visibility,
		color: 'info.light',
		hide: ({ row }) => !row.applicantId,
		onClick: ({ row, navigate }) => navigate(generatePath(paths.viewApplicant, { id: row.applicantId })),
	},
	contactApplicantFromInterview: {
		label: 'Contact',
		icon: ContactPageOutlined,
		color: 'custom.brown',
		hide: ({ row }) => !row.applicantId,
		onClick: async ({ row, showDialog }) => {
			const applicants = await getDocumentsByIDs(collections.applicants, [row.applicantId]);
			if (applicants.length > 0) {
				const app = applicants[0];
				const recipient = { id: app.id, name: `${app.firstName} ${app.lastName}`, email: app.email, cell: app.cell };
				showDialog({
					id: 'contactDialog',
					data: { title: `Contacting: ${recipient.name}`, component: ContactDialog, recipients: [recipient], maxWidth: 'sm' },
				});
			}
		},
	},

	// -- Email --
	viewEmail: {
		label: 'View',
		icon: Visibility,
		color: 'info.light',
		onClick: ({ row, navigate }) => navigate(generatePath(paths.viewEmail, { id: row.id })),
	},
	replyEmail: {
		label: 'Reply',
		icon: Reply,
		color: 'success.dark',
		async: true,
		onClick: async ({ row, emailActions }) => {
			const result = await fetchEmailContent({ messageId: row.id, folderId: row.folderId });
			emailActions.handleReply({ ...result.data, id: row.id, isRead: row.isRead, folderId: row.folderId, tags: row.tags });
		},
	},
	replyAllEmail: {
		label: 'Reply All',
		icon: ReplyAll,
		color: 'success.light',
		async: true,
		onClick: async ({ row, emailActions }) => {
			const result = await fetchEmailContent({ messageId: row.id, folderId: row.folderId });
			emailActions.handleReplyAll({ ...result.data, id: row.id, isRead: row.isRead, folderId: row.folderId, tags: row.tags });
		},
	},
	forwardEmail: {
		label: 'Forward',
		icon: Forward,
		color: 'custom.brown',
		async: true,
		onClick: async ({ row, emailActions }) => {
			const result = await fetchEmailContent({ messageId: row.id, folderId: row.folderId });
			emailActions.handleForward({ ...result.data, id: row.id, isRead: row.isRead, folderId: row.folderId, tags: row.tags });
		},
	},
	deleteEmail: {
		label: 'Delete',
		icon: Delete,
		color: 'error.dark',
		onClick: ({ row, showDialog, showAlert }) => {
			showDialog({
				id: 'confirmAction',
				messageOverride: `Are you sure you want to move the email "${row.subject || 'this email'}" to the trash?`,
				callback: async (confirmed) => {
					if (confirmed) {
						showAlert({ message: 'Deleting email...', type: 'info' });
						await deleteZohoEmail({ messageId: row.id });
						showAlert({ message: 'Email moved to trash.', type: 'success' });
					}
				},
			});
		},
	},
	toggleRead: {
		getLabel: (row) => (row.isRead ? 'Unread' : 'Read'),
		icon: (row) => (row.isRead ? MarkEmailUnreadOutlined : MarkEmailReadOutlined),
		getColor: (row) => (row.isRead ? 'warning.dark' : 'custom.white'),
		onClick: async ({ row }) => {
			const newStatus = row.isRead ? 'unread' : 'read';
			const messagePayload = [{ id: row.id, tags: row.tags || [] }];
			await updateEmailReadStatus({ messages: messagePayload, status: newStatus });
		},
	},
};

// =============================================================================
//  3. EXPORTED BUTTON WRAPPERS
// =============================================================================

export const ViewAppButton = (props) => <ActionCellButton actionKey='viewApp' {...props} />;
export const MarkEligibleButton = (props) => <ActionCellButton actionKey='markEligible' {...props} />;
export const ViewButton = (props) => <ActionCellButton actionKey='viewMember' {...props} />;
export const EditAssetButton = (props) => <ActionCellButton actionKey='editMember' {...props} />;
export const ContactButton = (props) => <ActionCellButton actionKey='contact' {...props} />;
export const ViewApplicantButton = (props) => <ActionCellButton actionKey='viewApplicant' {...props} />;
export const EditApplicantButton = (props) => <ActionCellButton actionKey='editApplicant' {...props} />;
export const ViewRequestButton = (props) => <ActionCellButton actionKey='viewRequestApp' {...props} />;
export const EditRequestButton = (props) => <ActionCellButton actionKey='editRequest' {...props} />;
export const ResendRequestButton = (props) => <ActionCellButton actionKey='resendRequest' {...props} />;
export const InvalidateRequestButton = (props) => <ActionCellButton actionKey='invalidateRequest' {...props} />;
export const JoinInterviewButton = (props) => <ActionCellButton actionKey='joinInterview' {...props} />;
export const WaitingRoomButton = (props) => <ActionCellButton actionKey='waitInterview' {...props} />;
export const RescheduleInterviewButton = (props) => <ActionCellButton actionKey='rescheduleInterview' {...props} />;
export const DeleteInterviewButton = (props) => <ActionCellButton actionKey='deleteInterview' {...props} />;
export const CreateRoomButton = (props) => <ActionCellButton actionKey='createRoom' {...props} />;
export const CloseRoomButton = (props) => <ActionCellButton actionKey='closeRoom' {...props} />;
export const ChangeStatusButton = (props) => <ActionCellButton actionKey='changeStatus' {...props} />;
export const SendInvitationButton = (props) => <ActionCellButton actionKey='sendInvite' {...props} />;
export const UpdateRsvpButton = (props) => <ActionCellButton actionKey='updateRsvp' {...props} />;
export const ViewApplicantFromInterviewButton = (props) => <ActionCellButton actionKey='viewApplicantFromInterview' {...props} />;
export const ContactApplicantFromInterviewButton = (props) => <ActionCellButton actionKey='contactApplicantFromInterview' {...props} />;
export const ViewEmailButton = (props) => <ActionCellButton actionKey='viewEmail' {...props} />;
export const ReplyButton = (props) => <ActionCellButton actionKey='replyEmail' {...props} />;
export const ReplyAllButton = (props) => <ActionCellButton actionKey='replyAllEmail' {...props} />;
export const ForwardButton = (props) => <ActionCellButton actionKey='forwardEmail' {...props} />;
export const DeleteEmailButton = (props) => <ActionCellButton actionKey='deleteEmail' {...props} />;
export const ToggleReadButton = (props) => <ActionCellButton actionKey='toggleRead' {...props} />;

// =============================================================================
//  4. CUSTOM CELL COMPONENTS
// =============================================================================

export const DynamicApplicantProfilePicture = ({ user }) => {
	const config = useConfig();
	const [picture, setPicture] = useState(config.DEFAULT_AVATAR);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const fetch = async () => {
			try {
				setLoading(true);
				const fetched = await getCollectionData(user, collections.applicants, user);
				fetched?.picture && setPicture(fetched.picture?.home);
			} catch (error) {
				console.error(error.message);
				setPicture(blankApplicant.picture);
			} finally {
				setLoading(false);
			}
		};
		fetch();
	}, [user]);

	if (loading) return <Loader />;
	return (
		<Box>
			<Avatar src={picture} alt='avatar' />
		</Box>
	);
};
DynamicApplicantProfilePicture.propTypes = { user: PropTypes.string.isRequired };

export const DynamicMemberProfilePicture = ({ user }) => {
	const config = useConfig();
	const [picture, setPicture] = useState(config.DEFAULT_AVATAR);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		const fetch = async () => {
			try {
				setLoading(true);
				const fetched = await getCollectionData(user, collections.members, user);
				fetched && setPicture(fetched.picture.home);
			} catch (error) {
				console.error(error.message);
				setPicture(blankApplicant.picture);
			} finally {
				setLoading(false);
			}
		};
		fetch();
	}, [user]);

	if (loading) return <Loader />;
	return (
		<Box className='cellWithImg'>
			<Avatar className='cellImg' src={picture} alt='avatar' />
		</Box>
	);
};
DynamicMemberProfilePicture.propTypes = { user: PropTypes.string.isRequired };

export const SenderSubjectCell = React.memo(({ row }) => {
	const isUnread = row.isRead === false;
	const displayName = parseDisplayName(row.sender);
	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden' }}>
			<Typography variant='body2' fontWeight={isUnread ? 'bold' : 'normal'} noWrap sx={{ width: '100%' }}>
				{displayName}
			</Typography>
			<Typography variant='body2' color='text.secondary' noWrap fontWeight={isUnread ? 'bold' : 'normal'} sx={{ width: '100%' }}>
				{row.subject}
			</Typography>
		</Box>
	);
});
SenderSubjectCell.displayName = 'SenderSubjectCell';
SenderSubjectCell.propTypes = { row: PropTypes.object.isRequired };

export const RecipientSubjectCell = React.memo(({ row }) => {
	const isUnread = row.isRead === false;
	const displayName = parseDisplayName(row.to);
	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'hidden' }}>
			<Typography variant='body2' fontWeight={isUnread ? 'bold' : 'normal'} noWrap sx={{ width: '100%' }}>
				{displayName}
			</Typography>
			<Typography variant='body2' color='text.secondary' noWrap fontWeight={isUnread ? 'bold' : 'normal'} sx={{ width: '100%' }}>
				{row.subject}
			</Typography>
		</Box>
	);
});
RecipientSubjectCell.displayName = 'RecipientSubjectCell';
RecipientSubjectCell.propTypes = { row: PropTypes.object.isRequired };

export const StackedDateCell = React.memo(({ value, row }) => {
	if (!value) return <Typography variant='body2'>N/A</Typography>;
	const date = dayjs(value);
	if (!date.isValid()) return <Typography variant='body2'>Invalid Date</Typography>;

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
			<Typography variant='body2'>{date.format('MMM D, YYYY')}</Typography>
			<Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
				<Typography variant='body2' color='text.active'>
					{date.format('h:mm A')}
				</Typography>
				{row?.hasAttachment && <AttachFileIcon sx={{ fontSize: '1.1rem', color: 'text.active' }} />}
			</Box>
		</Box>
	);
});
StackedDateCell.displayName = 'StackedDateCell';
StackedDateCell.propTypes = { value: PropTypes.any, row: PropTypes.object };

export const UserLastLogin = ({ userId }) => {
	const [lastLogin, setLastLogin] = useState('Loading...');
	useEffect(() => {
		if (!userId) {
			setLastLogin('N/A');
			return;
		}
		getUserAuthRecord({ uid: userId })
			.then((result) => {
				const { lastSignInTime } = result.data;
				setLastLogin(format(new Date(lastSignInTime), 'M/dd/yy h:mm a'));
			})
			.catch(() => {
				setLastLogin('Never');
			});
	}, [userId]);
	return lastLogin;
};
UserLastLogin.propTypes = { userId: PropTypes.string.isRequired };

// =============================================================================
//  5. TOOLBAR ACTIONS
// =============================================================================

export const getApplicationToolbarActions = ({ navigate }) => [
	{
		label: 'Manual Upload',
		icon: UploadIcon,
		onClick: () => navigate(generatePath(paths.manualUpload)),
		variant: 'contained',
		color: 'primary',
		requiresSelection: false,
	},
	{
		label: 'Contact Selected',
		icon: ContactPageOutlined,
		onClick: (selectionModel, allRows, helpers) => {
			const { showDialog } = helpers;
			const selectedRows = allRows.filter((row) => selectionModel.includes(row.id));
			const recipients = selectedRows.map((row) => ({ id: row.id, name: row.applicantName || `${row.firstName} ${row.lastName}`, email: row.email, cell: row.cell }));
			showDialog({ id: 'contactDialog', data: { title: `Contacting ${recipients.length} Recipient(s)`, component: ContactDialog, recipients, maxWidth: 'sm' } });
		},
		variant: 'outlined',
		color: 'primary',
		requiresSelection: true,
	},
	{
		label: 'Bulk Evaluate',
		icon: DoneAllOutlined,
		onClick: (selectionModel, allRows, helpers) => {
			const { showDialog, showAlert, handleError } = helpers;
			showDialog({
				id: 'markEligibility',
				messageOverride: `You are about to change the eligibility status for ${selectionModel.length} selected applications. Please choose a new status below.`,
				callback: async (newStatus) => {
					if (newStatus) {
						try {
							const batch = writeBatch(db);
							for (const appId of selectionModel) {
								const appRef = doc(db, collections.applications, appId);
								batch.update(appRef, { status: newStatus });
							}
							await batch.commit();
							showAlert({ message: `${selectionModel.length} applications have been marked as ${newStatus}.`, type: 'success' });
						} catch (error) {
							handleError(error, 'bulk-mark-eligibility');
						}
					}
				},
			});
		},
		variant: 'outlined',
		color: 'secondary',
		requiresSelection: true,
	},
];

export const getRequestToolbarActions = ({ navigate }) => [
	{
		label: 'Contact Senders',
		icon: PersonOutline,
		requiresSelection: true,
		onClick: async (selectionModel, allRows, { showDialog, handleError, showAlert }) => {
			try {
				const selectedRequests = allRows.filter((row) => selectionModel.includes(row.id));
				const applicationIds = [...new Set(selectedRequests.map((req) => req.applicationID).filter(Boolean))];
				if (applicationIds.length === 0) {
					showAlert({ message: 'Selected requests are not linked to any applications.', type: 'warning' });
					return;
				}
				const applications = await getDocumentsByIDs(collections.applications, applicationIds);
				const applicantIds = [...new Set(applications.map((app) => app.completedBy).filter(Boolean))];
				if (applicantIds.length > 0) {
					const applicants = await getDocumentsByIDs(collections.applicants, applicantIds);
					const recipients = applicants.map((app) => ({ id: app.id, name: `${app.firstName} ${app.lastName}`, email: app.email, cell: app.cell }));
					showDialog({ id: 'contactDialog', data: { title: `Contacting ${recipients.length} Applicant(s)`, component: ContactDialog, recipients, maxWidth: 'sm' } });
				} else {
					showAlert({ message: 'Could not find applicants for the selected requests.', type: 'warning' });
				}
			} catch (error) {
				handleError(error, 'contact-applicant-bulk');
			}
		},
	},
	{
		label: 'Contact Recipents',
		icon: ContactPageOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog }) => {
			const selectedRequests = allRows.filter((row) => selectionModel.includes(row.id));
			const recipients = selectedRequests.map((req) => ({ id: req.id, name: req.name, email: req.email, cell: null }));
			showDialog({ id: 'contactDialog', data: { title: `Contacting ${recipients.length} Recommender(s)`, component: ContactDialog, recipients, maxWidth: 'sm' } });
		},
	},
	{
		label: 'Resend',
		icon: SendOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog, showAlert, handleError, config }) => {
			showDialog({
				id: 'adminActionConfirmation',
				messageOverride: `Are you sure you want to resend ${selectionModel.length} request(s)? This will generate new PINs and expiry dates.`,
				callback: async (confirmed) => {
					if (confirmed) {
						try {
							const selectedRequests = allRows.filter((row) => selectionModel.includes(row.id));
							const resendPromises = selectedRequests.map(async (request) => {
								const sixDigits = generate6DigitNumber();
								const updatedFields = { attempts: 0, expiryDate: config.APPLICATION_DEADLINE, pinCode: await generateSecurePin(sixDigits) };
								await updateCollectionData(collections.requests, request.id, updatedFields);
								const uploadLink = await generateUploadLink(request.id);
								await sendRequest(request, uploadLink, sixDigits);
							});
							await Promise.all(resendPromises);
							showAlert({ message: `Successfully resent ${selectionModel.length} requests.`, type: 'success' });
						} catch (error) {
							handleError(error, 'bulk-resend-requests');
						}
					}
				},
			});
		},
	},
	{
		label: 'Cancel',
		icon: CloseOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog, showAlert, handleError }) => {
			showDialog({
				id: 'adminActionConfirmation',
				messageOverride: `Are you sure you want to cancel ${selectionModel.length} request(s)? This action is irreversible.`,
				callback: async (confirmed) => {
					if (confirmed) {
						try {
							const batch = writeBatch(db);
							const newExpiry = new Date().toISOString();
							for (const reqId of selectionModel) {
								const reqRef = doc(db, collections.requests, reqId);
								batch.update(reqRef, { expiryDate: newExpiry });
							}
							await batch.commit();
							showAlert({ message: `${selectionModel.length} requests have been cancelled.`, type: 'success' });
						} catch (error) {
							handleError(error, 'bulk-cancel-requests');
						}
					}
				},
			});
		},
	},
];

export const getSchedulerToolbarActions = ({ navigate }) => [
	{
		label: 'Auto-Schedule',
		icon: Add,
		onClick: (selectionModel, allRows, { showDialog }) => {
			showDialog({ id: 'autoScheduleInterviews', data: { component: AutoScheduler, maxWidth: 'md' } });
		},
		variant: 'contained',
		color: 'primary',
	},
	{
		label: 'Schedule Single',
		icon: Add,
		onClick: (selectionModel, allRows, { showDialog }) => {
			showDialog({ id: 'manualScheduleInterview', data: { component: ManualScheduler, maxWidth: 'sm' } });
		},
		variant: 'contained',
		color: 'info',
	},
	{
		label: 'Send Invites',
		icon: Send,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showAlert, handleError }) => {
			if (selectionModel.length === 0) return;
			try {
				sendInterviewInvitations({ interviewIds: selectionModel }).then((result) => {
					showAlert({ message: result.data.message, type: 'success' });
				});
			} catch (error) {
				handleError(error, 'Failed to send invitations.');
			}
		},
		variant: 'outlined',
		color: 'secondary',
	},
	{
		label: 'Delete Selected',
		icon: Delete,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog, showAlert, handleError }) => {
			if (selectionModel.length === 0) return;
			showDialog({
				id: 'deleteInterviewSlot',
				messageOverride: `Are you sure you want to delete ${selectionModel.length} selected interview slots? This action cannot be undone.`,
				callback: async (confirmed) => {
					if (confirmed) {
						try {
							await bulkDeleteInterviews({ interviewIds: selectionModel });
							showAlert({ message: `${selectionModel.length} interview(s) deleted.`, type: 'success' });
						} catch (error) {
							handleError(error, 'Failed to delete interviews.');
						}
					}
				},
			});
		},
		variant: 'outlined',
		color: 'error',
	},
];

export const getInterviewToolbarActions = ({ navigate, deliberationRoomExists }) => {
	return [
		{
			label: 'Join Deliberation Room',
			onClick: () => navigate(paths.deliberationRoom),
			variant: 'contained',
			color: 'secondary',
			hide: !deliberationRoomExists,
		},
		{
			label: 'Close Deliberation Room',
			onClick: (selectionModel, allRows, { showDialog, showAlert, handleError }) => {
				showDialog({
					id: 'confirmAction',
					messageOverride: 'Are you sure you want to close the deliberation room? All participants will be ejected.',
					callback: async (confirmed) => {
						if (confirmed) {
							try {
								const result = await deleteDeliberationRoom();
								showAlert({ message: result.data.message, type: 'success' });
							} catch (error) {
								handleError(error, 'Error deleting Deliberation Room.');
							}
						}
					},
				});
			},
			variant: 'outlined',
			color: 'error',
			hide: !deliberationRoomExists,
		},
		{
			label: 'Open Deliberation Room',
			onClick: (selectionModel, allRows, { showAlert, handleError }) => {
				const createRoom = async () => {
					try {
						const result = await createDeliberationRoom();
						showAlert({ message: result.data.message, type: 'success' });
					} catch (error) {
						handleError(error, 'Error creating Deliberation Room.');
					}
				};
				createRoom();
			},
			variant: 'outlined',
			hide: deliberationRoomExists,
		},
		{
			label: 'Update Statuses',
			requiresSelection: true,
			onClick: (selectionModel, allRows, { showDialog, showAlert, handleError }) => {
				showDialog({
					id: 'changeInterviewStatus',
					data: {
						title: `Update the Status for ${selectionModel.length} Interview(s)`,
					},
					messageOverride: `Select a new status to apply to all ${selectionModel.length} selected interviews.`,
					callback: async (formData) => {
						if (formData?.status) {
							try {
								await bulkUpdateInterviewStatus({ interviewIds: selectionModel, newStatus: formData.status });
								showAlert({ message: `${selectionModel.length} interview(s) updated to ${formData.status}.`, type: 'success' });
							} catch (error) {
								handleError(error, 'bulk-update-interview-status');
							}
						}
					},
				});
			},
			variant: 'contained',
			color: 'info',
		},
	];
};

export const getMemberToolbarActions = ({ navigate, member }) => [
	{
		label: 'New Member',
		icon: Add,
		onClick: () => navigate(generatePath(paths.newMember)),
		variant: 'contained',
		color: 'primary',
		disabled: !member?.permissions?.admin,
	},
	{
		label: 'Contact Selected',
		icon: ContactPageOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog }) => {
			const selectedMembers = allRows.filter((row) => selectionModel.includes(row.id));
			const recipients = selectedMembers.map((member) => ({
				id: member.id,
				name: `${member.firstName} ${member.lastName}`,
				email: member.email,
				cell: member.cell,
			}));
			showDialog({
				id: 'contactDialog',
				data: { title: `Contacting ${recipients.length} Member(s)`, component: ContactDialog, recipients: recipients, maxWidth: 'sm' },
			});
		},
	},
];

export const getApplicantToolbarActions = ({ navigate }) => [
	{
		label: 'Contact Selected',
		icon: ContactPageOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog }) => {
			const selectedApplicants = allRows.filter((row) => selectionModel.includes(row.id));
			const recipients = selectedApplicants.map((applicant) => ({
				id: applicant.id,
				name: `${applicant.firstName} ${applicant.lastName}`,
				email: applicant.email,
				cell: applicant.cell,
			}));
			showDialog({
				id: 'contactDialog',
				data: { title: `Contacting ${recipients.length} Applicant(s)`, component: ContactDialog, recipients: recipients, maxWidth: 'sm' },
			});
		},
	},
];

export const getInboxToolbarActions = ({ navigate, permittedAliases, member }) => [
	{
		label: 'New Email',
		icon: Add,
		onClick: () => navigate(paths.composeEmail),
	},
	{
		id: 'toggleRead',
		label: 'Mark Read',
		labelAlt: 'Mark Unread',
		icon: MarkEmailReadOutlined,
		iconAlt: MarkEmailUnreadOutlined,
		requiresSelection: true,
		onClick: (selectionModel, allRows, helpers, dynamicProps) => {
			const { newStatus } = dynamicProps;
			const { handleError } = helpers;
			const messagesPayload = selectionModel
				.map((id) => {
					const row = allRows.find((r) => r.id === id);
					return row ? { id: row.id, tags: row.tags || [] } : null;
				})
				.filter(Boolean);
			if (messagesPayload.length === 0) return;
			updateEmailReadStatus({ messages: messagesPayload, status: newStatus })
				.then(() => {})
				.catch((error) => handleError(error, `bulk-mark-${newStatus}`));
		},
	},
	{
		label: 'Delete',
		icon: Delete,
		color: 'error',
		requiresSelection: true,
		onClick: (selectionModel, allRows, { showDialog, showAlert, handleError }) => {
			showDialog({
				id: 'confirmAction',
				messageOverride: `Are you sure you want to move ${selectionModel.length} email(s) to the trash?`,
				callback: async (confirmed) => {
					if (confirmed) {
						try {
							showAlert({ message: 'Deleting emails...', type: 'info' });
							await bulkDeleteZohoEmails({ messageIds: selectionModel });
							showAlert({ message: `${selectionModel.length} email(s) moved to trash.`, type: 'success' });
						} catch (error) {
							handleError(error, 'bulk-delete-zoho');
						}
					}
				},
			});
		},
	},
];

// =============================================================================
//  6. COLUMN DEFINITIONS
// =============================================================================

export const memberCols = [
	{ field: 'picture', headerName: '', flex: 0.2, renderCell: (params) => <DynamicMemberProfilePicture user={params.row.id} />, sortable: false, filterable: false },
	{
		field: 'name',
		headerName: 'Name',
		flex: 0.75,
		valueGetter: (params) => `${params.row.firstName} ${params.row.lastName}`,
		renderCell: (params) => (
			<Typography>
				{params.row.firstName} {params.row.lastName}
			</Typography>
		),
	},
	{
		field: 'membership',
		headerName: 'Membership',
		flex: 0.85,
		valueGetter: (params) => `${params.row.position} (${params.row.since})`,
		renderCell: (params) => (
			<Box>
				<Typography>{params.row.position}</Typography>
				<Typography>Joined {params.row.since}</Typography>
			</Box>
		),
	},
	{
		field: 'lastLogin',
		headerName: 'Last Login',
		flex: 0.75,
		sortable: false,
		renderCell: (params) => (
			<Typography>
				<UserLastLogin userId={params.row.id} />
			</Typography>
		),
	},
	{
		field: 'contacts',
		headerName: 'Contacts',
		flex: 1.2,
		renderCell: (params) => (
			<Box>
				<Typography>{params.row.email}</Typography>
				<Typography>{params.row.cell}</Typography>
			</Box>
		),
	},
];

export const applicantCols = [
	{ field: 'picture', headerName: '', flex: 0.2, renderCell: (params) => <DynamicApplicantProfilePicture user={params.row.id} />, sortable: false, filterable: false },
	{
		field: 'name',
		headerName: 'Name',
		flex: 1,
		valueGetter: (params) => `${params.row.firstName} ${params.row.lastName}`,
		renderCell: (params) => (
			<Typography>
				{params.row.firstName} {params.row.lastName}
			</Typography>
		),
	},
	{
		field: 'education',
		headerName: 'Enrollment',
		flex: 1.75,
		valueGetter: (params) => `${params.row.school} (${params.row.gradYear}) ${params.row.major}`,
		renderCell: (params) => (
			<Box>
				<Typography>{params.row.school}</Typography>
				<Typography>{`${params.row.major} (${params.row.gradYear})`}</Typography>
			</Box>
		),
	},
	{
		field: 'organization',
		headerName: 'Organization',
		flex: 1.25,
		valueGetter: (params) => params.row.organization || 'N/A',
		renderCell: (params) => {
			const extract = extractPipeData(params.row.organization);
			return (
				<Box>
					<Typography>{extract.left}</Typography>
					<Typography>{extract.right}</Typography>
				</Box>
			);
		},
	},
	{ field: 'applications', headerName: 'Apps', flex: 0.2, valueGetter: (params) => params.row.applications?.length || 0, renderCell: (params) => <Typography>{params.row.applications?.length || 0}</Typography> },
	{
		field: 'contact',
		headerName: 'Contact',
		flex: 1.75,
		valueGetter: (params) => `${params.row.email} ${params.row.cell}`,
		renderCell: (params) => (
			<Box>
				<Typography>{params.row.email}</Typography>
				<Typography>{params.row.cell}</Typography>
			</Box>
		),
	},
];

export const appCols = [
	{ field: 'picture', headerName: '', flex: 0.2, renderCell: (params) => <DynamicApplicantProfilePicture user={params.row.completedBy} />, sortable: false, filterable: false },
	{ field: 'applicantName', headerName: 'Applicant Name', flex: 1.25, valueGetter: (params) => params.row.applicantName || '', renderCell: (params) => <Typography>{params.row.applicantName}</Typography> },
	{ field: 'type', headerName: 'App Type', flex: 1.25, renderCell: (params) => <Typography>{params.row.type}</Typography> },
	{ field: 'status', headerName: 'App Status', flex: 0.75, renderCell: (params) => <Typography>{params.row.status}</Typography> },
	{ field: 'lastUpdated', headerName: 'Last Touched', flex: 0.75, valueGetter: (params) => new Date(params.row.lastUpdated), renderCell: (params) => <Typography>{new Date(params.row.lastUpdated).toLocaleDateString()}</Typography> },
	{
		field: 'window',
		headerName: 'Academic Year',
		width: 150,
		valueGetter: (params) => new Date(params.row.window).getFullYear(),
		renderCell: (params) => (
			<Typography>
				{new Date(params.row.window).getFullYear()} - {new Date(params.row.window).getFullYear() + 1}
			</Typography>
		),
	},
];

export const reqCols = [
	{
		field: 'done',
		headerName: '',
		flex: 0.1,
		sortable: false,
		filterable: false,
		renderCell: (params) => {
			const { completed, expiryDate, attempts } = params.row;
			const now = dayjs();
			const expired = dayjs(expiryDate).isBefore(now);
			const invalid = !completed && (expired || attempts > 0);
			return (
				<Box display='flex' justifyContent='center' alignItems='center' width='100%'>
					{getStatusIcon(completed, invalid)}
				</Box>
			);
		},
	},
	{ field: 'name', headerName: 'Recommender', flex: 1.5, renderCell: (params) => <Typography>{params.row.name}</Typography> },
	{ field: 'email', headerName: 'Email', flex: 2, renderCell: (params) => <Typography>{params.row.email}</Typography> },
	{ field: 'relation', headerName: 'Relation', flex: 2, renderCell: (params) => <Typography>{params.row.relation}</Typography> },
	{ field: 'attachmentType', headerName: 'LOR', flex: 0.8, valueGetter: (params) => getAttachmentLabel(params.row.attachmentType), renderCell: (params) => <Typography>{getAttachmentLabel(params.row.attachmentType)}</Typography> },
	{ field: 'attempts', headerName: 'Tries', flex: 0.5, type: 'number', renderCell: (params) => <Typography>{params.row.attempts}</Typography> },
	{ field: 'expiryDate', headerName: 'Expires', flex: 1, valueGetter: (params) => new Date(params.row.expiryDate), renderCell: (params) => <Typography>{new Date(params.row.expiryDate).toLocaleDateString()}</Typography> },
];

export const interviewCols = [
	{ field: 'displayName', headerName: 'Applicant', flex: 1, renderCell: (params) => <Typography>{params.row.displayName}</Typography> },
	{
		field: 'startTime',
		headerName: 'Date & Time',
		flex: 1,
		valueGetter: (params) => (params.value?.toDate ? dayjs(params.value.toDate()).format('MM/DD/YYYY h:mm A') : 'Invalid Date'),
		renderCell: (params) => <Typography>{params.row.startTime?.toDate ? dayjs(params.row.startTime.toDate()).format('MM/DD/YYYY h:mm A') : 'Invalid Date'}</Typography>,
	},
	{ field: 'status', headerName: 'Status', flex: 0.5, renderCell: (params) => <Typography>{params.row.status}</Typography> },
	{
		field: 'rsvpStatus',
		headerName: 'RSVP',
		flex: 0.5,
		renderCell: (params) => <Typography>{getRsvpLabel(params.value)}</Typography>,
	},
];

export const schedulerCols = [
	{ field: 'applicantName', headerName: 'Applicant', flex: 1, renderCell: (params) => <Typography>{params.row.applicantName}</Typography> },
	{
		field: 'startTime',
		headerName: 'Date & Time',
		flex: 1,
		valueGetter: (params) => (params.value?.toDate ? dayjs(params.value.toDate()).format('MM/DD/YYYY h:mm A') : 'Invalid Date'),
		renderCell: (params) => <Typography>{params.row.startTime?.toDate ? dayjs(params.row.startTime.toDate()).format('MM/DD/YYYY h:mm A') : 'Invalid Date'}</Typography>,
	},
	{ field: 'status', headerName: 'Status', flex: 0.5, renderCell: (params) => <Typography>{params.row.status}</Typography> },
	{
		field: 'rsvpStatus',
		headerName: 'RSVP',
		flex: 0.5,
		renderCell: (params) => <Typography>{getRsvpLabel(params.value)}</Typography>,
	},
];

export const inboxCols = [
	{ field: 'senderSubject', headerName: 'Sender / Subject', flex: 2, sortable: false, valueGetter: (params) => `${params.row.sender} ${params.row.subject}`, renderCell: (params) => <SenderSubjectCell {...params} /> },
	{
		field: 'timestamp',
		headerName: 'Received',
		flex: 0.75,
		valueGetter: (params) => {
			const ts = Number(params.value);
			return ts > 0 ? new Date(ts) : null;
		},
		renderCell: (params) => <StackedDateCell value={params.value} row={params.row} />,
	},
	{
		field: 'tags',
		headerName: 'Sent To',
		flex: 0.75,
		sortable: false,
		renderCell: (params) => (
			<Box>
				{params.row.tags && params.row.tags.length > 0 && (
					<Box sx={{ display: 'flex', gap: '4px', mb: '4px', flexWrap: 'wrap' }}>
						{params.row.tags.map((tag) => (
							<Typography key={tag} variant='caption' sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', px: 1, py: 0.2, borderRadius: '10px', textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: 'bold', lineHeight: 1.5 }}>
								{tag}
							</Typography>
						))}
					</Box>
				)}
			</Box>
		),
	},
	{
		field: 'description',
		headerName: 'Preview',
		flex: 3,
		sortable: false,
		cellClassName: 'multiline-cell',
		renderCell: (params) => (
			<Typography variant='body2' color='text.secondary' fontWeight={params.row.isRead === false ? 'bold' : 'normal'} sx={{ whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
				{params.value}
			</Typography>
		),
	},
];

export const legacyFinancesCols = [
	{ field: 'year', headerName: 'Year', width: 80, type: 'number', headerAlign: 'center', align: 'center', valueFormatter: ({ value }) => (value ? String(value) : 'N/A') },
	{ field: 'total_allotted_disbursement', headerName: 'Total Allotted', width: 130, headerAlign: 'center', align: 'center', valueFormatter: ({ value }) => (value ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A') },
	{ field: 'prior_year_clawback', headerName: 'Clawback', width: 130, headerAlign: 'center', align: 'center', valueFormatter: ({ value }) => (value ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A') },
	{
		field: 'renewable_scholarships',
		headerName: 'Scholarships',
		width: 170,
		headerAlign: 'center',
		align: 'center',
		valueGetter: (params) => params.value?.length || 0,
		renderCell: (params) => (
			<Box display='flex' alignItems='center' gap={1}>
				<PeopleOutlined fontSize='small' />
				<Typography variant='body2'>{params.value} Recipients</Typography>
			</Box>
		),
	},
	{
		field: 'non_renewable_grants',
		headerName: 'Grants',
		width: 170,
		headerAlign: 'center',
		align: 'center',
		valueGetter: (params) => params.value?.length || 0,
		renderCell: (params) => (
			<Box display='flex' alignItems='center' gap={1}>
				<PeopleOutlined fontSize='small' />
				<Typography variant='body2'>{params.value} Recipients</Typography>
			</Box>
		),
	},
	{
		field: 'sg_available',
		headerName: 'S&G Funds (80%)',
		width: 170,
		headerAlign: 'center',
		align: 'center',
		valueGetter: (params) => params.row.financial_summary?.scholarships_grants?.amount_available,
		valueFormatter: ({ value }) => (value ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A'),
	},
	{
		field: 'nsi_available',
		headerName: 'Non-S&G Funds (20%)',
		width: 190,
		headerAlign: 'center',
		align: 'center',
		valueGetter: (params) => params.row.financial_summary?.non_scholarship_items?.amount_available,
		valueFormatter: ({ value }) => (value ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A'),
	},
	{
		field: 'returns',
		headerName: 'Returned',
		width: 100,
		headerAlign: 'center',
		align: 'center',
		type: 'number',
		valueGetter: (params) => (params.row.financial_summary?.scholarships_grants?.amount_returned ?? 0) + (params.row.financial_summary?.non_scholarship_items?.amount_returned ?? 0),
		valueFormatter: ({ value }) => (value ? value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : 'N/A'),
	},
];

// =============================================================================
//  7. ACTION ARRAYS
// =============================================================================

export const memberActions = [
	{
		field: 'action',
		headerName: 'Actions',
		width: 200,
		sortable: false,
		filterable: false,
		renderCell: (params) => (
			<Box className='cellAction'>
				<ViewButton {...params} />
				<EditAssetButton {...params} />
				<ContactButton {...params} />
			</Box>
		),
	},
];

export const applicantActions = [
	{
		field: 'action',
		headerName: 'Actions',
		width: 140,
		sortable: false,
		filterable: false,
		renderCell: (params) => (
			<Box className='cellAction'>
				<ViewApplicantButton {...params} />
				<EditApplicantButton {...params} />
				<ContactButton {...params} />
			</Box>
		),
	},
];

export const appActions = [
	{
		field: 'action',
		headerName: 'Actions',
		width: 350,
		sortable: false,
		filterable: false,
		renderCell: (params) => (
			<Box className='cellAction'>
				<ViewAppButton {...params} />
				<MarkEligibleButton {...params} />
				<ContactButton {...params} />
			</Box>
		),
	},
];

export const reqActions = [
	{
		field: 'action',
		headerName: 'Actions',
		width: 250,
		sortable: false,
		filterable: false,
		renderCell: (params) => (
			<Box className='cellAction' display='flex' alignItems='center' justifyContent='center' gap={1}>
				<ViewRequestButton {...params} />
				<EditRequestButton {...params} />
				<ResendRequestButton {...params} />
				<InvalidateRequestButton {...params} />
				<ContactButton {...params} />
			</Box>
		),
	},
];

export const interviewActions = [
	{
		field: 'action',
		headerName: 'Actions',
		width: 320,
		sortable: false,
		filterable: false,
		renderCell: (params) => (
			<Box className='cellAction' display='flex' alignItems='center' justifyContent='center' gap={1}>
				<CreateRoomButton {...params} />
				<JoinInterviewButton {...params} />
				<CloseRoomButton {...params} />
				<WaitingRoomButton {...params} />
				<RescheduleInterviewButton {...params} />
				<DeleteInterviewButton {...params} />
				<ChangeStatusButton {...params} />
			</Box>
		),
	},
];

export const schedulerActions = [
	{
		field: 'action',
		headerName: 'Actions',
		width: 250,
		sortable: false,
		filterable: false,
		renderCell: (params) => (
			<Box className='cellAction' display='flex' alignItems='center' justifyContent='center' gap={1}>
				<ViewApplicantFromInterviewButton {...params} />
				<ContactApplicantFromInterviewButton {...params} />
				<SendInvitationButton {...params} />
				<UpdateRsvpButton {...params} />
				<DeleteInterviewButton {...params} />
			</Box>
		),
	},
];

export const getInboxActions = ({ navigate, permittedAliases, member }) => [
	{
		field: 'action',
		headerName: 'Actions',
		width: 265,
		sortable: false,
		filterable: false,
		renderCell: (params) => (
			<Box className='cellAction' sx={{ gap: 0.5 }}>
				<ViewEmailButton {...params} />
				<ReplyButton {...params} permittedAliases={permittedAliases} member={member} navigate={navigate} />
				<ReplyAllButton {...params} permittedAliases={permittedAliases} member={member} navigate={navigate} />
				<ForwardButton {...params} permittedAliases={permittedAliases} member={member} navigate={navigate} />
				<ToggleReadButton {...params} />
				<DeleteEmailButton {...params} />
			</Box>
		),
	},
];
