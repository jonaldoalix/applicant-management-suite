import React from 'react';
import dayjs from 'dayjs';
import { Box, Typography, Divider } from '@mui/material';
import { AttachMoneyOutlined, PeopleOutlined, ListAltOutlined } from '@mui/icons-material';

import { UserType, ApplicationType, ApplicationStatus, collections } from '../data/collections';
import {
	memberCols,
	memberActions,
	applicantCols,
	applicantActions,
	appCols,
	appActions,
	reqCols,
	reqActions,
	interviewCols,
	interviewActions,
	schedulerCols,
	schedulerActions,
	inboxCols,
	getInboxActions,
	legacyFinancesCols,
	getMemberToolbarActions,
	getApplicantToolbarActions,
	getApplicationToolbarActions,
	getRequestToolbarActions,
	getInterviewToolbarActions,
	getSchedulerToolbarActions,
	getInboxToolbarActions,
	// Buttons & Cells
	ViewAppButton,
	MarkEligibleButton,
	ContactButton,
	DynamicApplicantProfilePicture,
	DynamicMemberProfilePicture,
	ViewRequestButton,
	EditRequestButton,
	ResendRequestButton,
	InvalidateRequestButton,
	ViewEmailButton,
	ReplyButton,
	ReplyAllButton,
	ForwardButton,
	ToggleReadButton,
	DeleteEmailButton,
	CreateRoomButton,
	JoinInterviewButton,
	CloseRoomButton,
	WaitingRoomButton,
	RescheduleInterviewButton,
	DeleteInterviewButton,
	ChangeStatusButton,
	ViewApplicantFromInterviewButton,
	ContactApplicantFromInterviewButton,
	SendInvitationButton,
	UpdateRsvpButton,
	ViewButton,
	EditAssetButton,
	UserLastLogin,
	ViewApplicantButton,
	EditApplicantButton,
	getStatusIcon,
	getAttachmentLabel,
	SenderSubjectCell,
	StackedDateCell,
} from '../ui/tableConfig';

import { getRealTimeCollection, getRealTimeApplications, getRealTimeApplicationsByWindow, getRealTimeApplicationsByType, getRealTimeApplicationsByStatus, getRealTimeRejectedApplications, getRealTimeMeetings, getRealTimeInterviewsByWindow, getRealTimeLegacyFinances } from '../data/firebase';

export const adminLists = {
	[UserType.member]: {
		title: 'Administrators',
		columns: memberCols,
		actions: memberActions,
		fetcher: (handler) => getRealTimeCollection(collections.members, handler),
		getToolbarActions: getMemberToolbarActions,
	},
	[UserType.applicant]: {
		title: 'Applicants',
		columns: applicantCols,
		actions: applicantActions,
		fetcher: (handler) => getRealTimeCollection(collections.applicants, handler),
		getToolbarActions: getApplicantToolbarActions,
	},
	applications: {
		title: 'All Applications',
		columns: appCols,
		actions: appActions,
		fetcher: (handler) => getRealTimeApplications(false, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	requests: {
		title: 'Reference Requests',
		columns: reqCols,
		actions: reqActions,
		fetcher: (handler) => getRealTimeCollection(collections.requests, handler),
		getToolbarActions: getRequestToolbarActions,
	},
	year: {
		title: (year) => `Applications from ${year}`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, window) => getRealTimeApplicationsByWindow(window, false, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationType.newApplication]: {
		title: `Standard Grant Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, window, type) => getRealTimeApplicationsByType(type, window, false, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationType.returningGrant]: {
		title: `Renewal Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, window, type) => getRealTimeApplicationsByType(type, window, false, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationType.scholarship]: {
		title: `Compliance Check-ins`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, window, type) => getRealTimeApplicationsByType(type, window, false, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationStatus.deleted]: {
		title: `Deleted Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, window, type) => getRealTimeApplicationsByStatus(type, handler),
		enrich: true,
	},
	[ApplicationStatus.incomplete]: {
		title: `Incomplete Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, window, type) => getRealTimeApplicationsByStatus(type, handler),
		enrich: true,
	},
	[ApplicationStatus.awarded]: {
		title: `Awarded Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, window, type) => getRealTimeApplicationsByStatus(type, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationStatus.completed]: {
		title: `Completed Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, window, type) => getRealTimeApplicationsByStatus(type, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationStatus.eligible]: {
		title: `Eligible Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, window, type) => getRealTimeApplicationsByStatus(type, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationStatus.invited]: {
		title: `Invited Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, window, type) => getRealTimeApplicationsByStatus(type, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	rejected: {
		title: 'Rejected Applications',
		columns: appCols,
		actions: appActions,
		fetcher: (handler) => getRealTimeRejectedApplications(handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	interviews: {
		title: 'Interview Dashboard',
		columns: interviewCols,
		actions: interviewActions,
		fetcher: (handler, userId, isCommittee) => getRealTimeMeetings(userId, isCommittee, handler, true),
		getToolbarActions: getInterviewToolbarActions,
	},
	scheduler: {
		title: 'Interview Scheduler',
		columns: schedulerCols,
		actions: schedulerActions,
		fetcher: (handler, window) => getRealTimeInterviewsByWindow(window, handler),
		getToolbarActions: getSchedulerToolbarActions,
	},
	inbox: {
		title: 'System Inbox',
		columns: inboxCols,
		getActions: getInboxActions,
		getToolbarActions: getInboxToolbarActions,
	},
	legacyFinances: {
		title: 'Historical Financials',
		columns: legacyFinancesCols,
		actions: [],
		fetcher: (handler) =>
			getRealTimeLegacyFinances(handler, {
				collection: collections.legacyFinances,
				orderBy: [['year', 'desc']],
			}),
		getToolbarActions: () => [],
	},
};

export const mobileCardConfig = {
	[UserType.member]: {
		actions: [ViewButton, EditAssetButton, ContactButton],
		content: ({ item }) => (
			<>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
					<Box>
						<DynamicMemberProfilePicture user={item.id} />
					</Box>
					<Box sx={{ flex: 1, minWidth: 0 }}>
						<Typography variant='h6' noWrap>
							{item.firstName} {item.lastName}
						</Typography>
						<Typography variant='body2' color='text.secondary' noWrap>
							{item.position} (Start: {item.since})
						</Typography>
					</Box>
				</Box>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: 1 }}>
					<Box>
						<Typography variant='body2' color='text.primary' noWrap>
							{item.email}
						</Typography>
						<Typography variant='caption' color='text.secondary' noWrap>
							{item.cell || 'No cell provided'}
						</Typography>
					</Box>
					<Box sx={{ textAlign: 'right' }}>
						<Typography variant='body2' color='text.primary' noWrap>
							Last Login:
						</Typography>
						<Typography variant='caption' color='text.secondary' noWrap>
							<UserLastLogin userId={item.id} />
						</Typography>
					</Box>
				</Box>
			</>
		),
	},
	[UserType.applicant]: {
		actions: [ViewApplicantButton, EditApplicantButton, ContactButton],
		content: ({ item }) => {
			const gradYear = item.gradYear ? Number(item.gradYear) : 'N/A';
			return (
				<>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
						<Box>
							<DynamicApplicantProfilePicture user={item.id} />
						</Box>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography variant='h6' noWrap>
								{item.firstName} {item.lastName}
							</Typography>
							<Typography variant='body2' color='text.secondary' noWrap>
								{item.school} ({gradYear})
							</Typography>
							<Typography variant='caption' color='text.secondary' noWrap>
								{item.major || 'No major listed'}
							</Typography>
						</Box>
					</Box>
					<Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mt: 1, px: 1 }}>
						<Box>
							<Typography variant='body2' color='text.primary' noWrap>
								{item.email}
							</Typography>
							<Typography variant='caption' color='text.secondary' noWrap>
								{item.cell || 'No cell provided'}
							</Typography>
						</Box>
					</Box>
				</>
			);
		},
	},
	applications: {
		actions: [ViewAppButton, MarkEligibleButton, ContactButton],
		content: ({ item }) => {
			const academicYear = item.window ? new Date(item.window).getFullYear() : 'N/A';
			const lastUpdated = item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'N/A';
			return (
				<>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
						<Box>
							<DynamicApplicantProfilePicture user={item.completedBy} />
						</Box>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography variant='h6' noWrap>
								{item.applicantName || 'Loading...'}
							</Typography>
							<Typography variant='body2' color='text.secondary' noWrap>
								{item.type} - {academicYear}
							</Typography>
						</Box>
					</Box>
					<Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mt: 1 }}>
						<Typography variant='body2' sx={{ fontWeight: 'bold', color: 'text.primary', bgcolor: 'action.hover', px: 1.5, py: 0.5, borderRadius: '16px' }}>
							Status: {item.status}
						</Typography>
						<Typography variant='caption' color='text.secondary'>
							Updated: {lastUpdated}
						</Typography>
					</Box>
				</>
			);
		},
	},
	requests: {
		actions: [ViewRequestButton, EditRequestButton, ResendRequestButton, InvalidateRequestButton, ContactButton],
		content: ({ item }) => {
			const { completed, expiryDate, attempts, fromName } = item;
			const now = dayjs();
			const expired = dayjs(expiryDate).isBefore(now);
			const invalid = !completed && (expired || attempts > 0);
			const statusIcon = getStatusIcon(completed, invalid);
			const attachmentLabel = getAttachmentLabel(item.attachmentType);
			const expires = dayjs(expiryDate).toDate().toLocaleDateString();
			return (
				<>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
						<Box>{statusIcon}</Box>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography variant='h6' noWrap>
								{item.name}
							</Typography>
							<Typography variant='body2' color='text.secondary' noWrap>
								Relation: {item.relation}
							</Typography>
						</Box>
					</Box>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: 1 }}>
						<Box>
							<Typography variant='body2' color='text.primary' noWrap>
								{attachmentLabel}
							</Typography>
							<Typography variant='caption' color='text.secondary' noWrap>
								{item.email}
							</Typography>
						</Box>
						<Box sx={{ textAlign: 'right' }}>
							<Typography variant='body2' color='text.primary' noWrap>
								Expires: {expires}
							</Typography>
							<Typography variant='caption' color='text.secondary' noWrap>
								For: {fromName}
							</Typography>
						</Box>
					</Box>
				</>
			);
		},
	},
	inbox: {
		actions: [ViewEmailButton, ReplyButton, ReplyAllButton, ForwardButton, ToggleReadButton, DeleteEmailButton],
		getProps: (item) => ({ isUnread: item.isRead === false }),
		content: ({ item }) => {
			const isUnread = item.isRead === false;
			const emailDate = item.timestamp && Number(item.timestamp) > 0 ? new Date(Number(item.timestamp)) : null;
			return (
				<>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<SenderSubjectCell row={item} />
						</Box>
						<Box sx={{ ml: 1, flexShrink: 0 }}>
							<StackedDateCell value={emailDate} row={item} />
						</Box>
					</Box>
					<Typography variant='body2' color='text.secondary' fontWeight={isUnread ? 'bold' : 'normal'} sx={{ whiteSpace: 'normal', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', my: 1 }}>
						{item.description}
					</Typography>
				</>
			);
		},
	},
	interviews: {
		actions: [CreateRoomButton, JoinInterviewButton, CloseRoomButton, WaitingRoomButton, RescheduleInterviewButton, DeleteInterviewButton, ChangeStatusButton],
		content: ({ item }) => {
			const interviewTime = item.startTime?.toDate ? dayjs(item.startTime.toDate()).format('MM/DD/YYYY h:mm A') : 'Invalid Date';
			let rsvpText = '❓ Unknown';
			if (item.rsvpStatus === 'yes') rsvpText = '✅ Yes';
			else if (item.rsvpStatus === 'no') rsvpText = '❌ No';
			return (
				<>
					<Box sx={{ mb: 2, px: 1 }}>
						<Typography variant='h6' noWrap>
							{item.displayName}
						</Typography>
						<Typography variant='body2' color='text.secondary' noWrap>
							{interviewTime}
						</Typography>
					</Box>
					<Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mt: 1 }}>
						<Typography variant='body2' sx={{ fontWeight: 'bold', color: 'text.primary', bgcolor: 'action.hover', px: 1.5, py: 0.5, borderRadius: '16px' }}>
							Status: {item.status}
						</Typography>
						<Typography variant='body2' color='text.primary'>
							RSVP: {rsvpText}
						</Typography>
					</Box>
				</>
			);
		},
	},
	scheduler: {
		actions: [ViewApplicantFromInterviewButton, ContactApplicantFromInterviewButton, SendInvitationButton, UpdateRsvpButton, DeleteInterviewButton],
		content: ({ item }) => {
			const interviewTime = item.startTime?.toDate ? dayjs(item.startTime.toDate()).format('MM/DD/YYYY h:mm A') : 'Invalid Date';
			let rsvpText = '❓ Unknown';
			if (item.rsvpStatus === 'yes') rsvpText = '✅ Yes';
			else if (item.rsvpStatus === 'no') rsvpText = '❌ No';
			return (
				<>
					<Box sx={{ mb: 2, px: 1 }}>
						<Typography variant='h6' noWrap>
							{item.applicantName}
						</Typography>
						<Typography variant='body2' color='text.secondary' noWrap>
							{interviewTime}
						</Typography>
					</Box>
					<Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mt: 1 }}>
						<Typography variant='body2' sx={{ fontWeight: 'bold', color: 'text.primary', bgcolor: 'action.hover', px: 1.5, py: 0.5, borderRadius: '16px' }}>
							Status: {item.status}
						</Typography>
						<Typography variant='body2' color='text.primary'>
							RSVP: {rsvpText}
						</Typography>
					</Box>
				</>
			);
		},
	},
	legacyFinances: {
		actions: [],
		content: ({ item }) => {
			const formatCurrency = (value) => {
				const num = Number.parseFloat(value);
				if (Number.isNaN(num) || value === null) return 'N/A';
				return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
			};

			const tagStyles = { fontWeight: 'bold', color: 'text.primary', bgcolor: 'action.hover', px: 1.5, py: 0.5, borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 0.5 };
			const summaryItemStyles = { flex: '1 1 45%', minWidth: '130px', mt: 1.5 };

			const totalReturns = (item.financial_summary?.scholarships_grants?.amount_returned ?? 0) + (item.financial_summary?.non_scholarship_items?.amount_returned ?? 0);
			const totalAllotted = formatCurrency(item.total_allotted_disbursement);
			const displayClawback = formatCurrency(item.prior_year_clawback ?? 0);
			const displayReturns = formatCurrency(totalReturns);
			const displaySgAvailable = formatCurrency(item.financial_summary?.scholarships_grants?.amount_available ?? 0);
			const displayNonSgAvailable = formatCurrency(item.financial_summary?.non_scholarship_items?.amount_available ?? 0);

			const renewableCount = item.renewable_scholarships?.length || 0;
			const nonRenewableCount = item.non_renewable_grants?.length || 0;
			const nonSGCount = item.non_sg_items?.length || 0;

			return (
				<>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography variant='h6' noWrap>
								Fiscal Year: {item.year}
							</Typography>
							<Typography variant='body2' color='text.secondary' noWrap>
								<AttachMoneyOutlined sx={{ fontSize: '1rem', verticalAlign: 'middle', mr: 0.5 }} />
								Total Allotted: {totalAllotted}
							</Typography>
						</Box>
					</Box>
					<Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mt: 2, gap: 1, flexWrap: 'wrap' }}>
						<Typography variant='body2' sx={tagStyles}>
							<PeopleOutlined fontSize='small' /> {renewableCount} Renewable
						</Typography>
						<Typography variant='body2' sx={tagStyles}>
							<PeopleOutlined fontSize='small' /> {nonRenewableCount} One-Time
						</Typography>
						<Typography variant='body2' sx={tagStyles}>
							<ListAltOutlined fontSize='small' /> {nonSGCount} Operational
						</Typography>
					</Box>
					<Divider sx={{ my: 2 }} />
					<Box sx={{ px: 1, mb: 1.5 }}>
						<Typography variant='overline' color='text.secondary' sx={{ display: 'block', lineHeight: 1 }}>
							Financial Summary
						</Typography>
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
							<Box sx={summaryItemStyles}>
								<Typography variant='body2' color='text.secondary'>
									Unused Funds
								</Typography>
								<Typography variant='body1' fontWeight='500'>
									{displayClawback}
								</Typography>
							</Box>
							<Box sx={summaryItemStyles}>
								<Typography variant='body2' color='text.secondary'>
									Returns
								</Typography>
								<Typography variant='body1' fontWeight='500'>
									{displayReturns}
								</Typography>
							</Box>
							<Box sx={summaryItemStyles}>
								<Typography variant='body2' color='text.secondary'>
									Grant Pool
								</Typography>
								<Typography variant='body1' fontWeight='500'>
									{displaySgAvailable}
								</Typography>
							</Box>
							<Box sx={summaryItemStyles}>
								<Typography variant='body2' color='text.secondary'>
									Operational Funds
								</Typography>
								<Typography variant='body1' fontWeight='500'>
									{displayNonSgAvailable}
								</Typography>
							</Box>
						</Box>
					</Box>
				</>
			);
		},
	},
};

// Map subtypes to parent configs
mobileCardConfig.year = mobileCardConfig.applications;
mobileCardConfig[ApplicationType.newApplication] = mobileCardConfig.applications;
mobileCardConfig[ApplicationType.returningGrant] = mobileCardConfig.applications;
mobileCardConfig[ApplicationType.scholarship] = mobileCardConfig.applications;
mobileCardConfig[ApplicationStatus.deleted] = mobileCardConfig.applications;
mobileCardConfig[ApplicationStatus.incomplete] = mobileCardConfig.applications;
mobileCardConfig[ApplicationStatus.awarded] = mobileCardConfig.applications;
mobileCardConfig[ApplicationStatus.completed] = mobileCardConfig.applications;
mobileCardConfig[ApplicationStatus.eligible] = mobileCardConfig.applications;
mobileCardConfig[ApplicationStatus.invited] = mobileCardConfig.applications;
mobileCardConfig.rejected = mobileCardConfig.applications;
