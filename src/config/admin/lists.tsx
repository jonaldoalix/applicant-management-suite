import React from 'react';
import dayjs from 'dayjs';
import type { DocumentData } from 'firebase/firestore';
import type { GridColDef } from '@mui/x-data-grid';
import { Box, Typography, Divider } from '@mui/material';
import { AttachMoneyOutlined, PeopleOutlined, ListAltOutlined } from '@mui/icons-material';
import { formatApplicantEnrollmentLines } from '../ui/formatUtils';
import { StatusCapsule, RsvpCapsule } from '../../components/list/StatusCapsule';

import { UserType, ApplicationType, ApplicationStatus, collections } from '../data/collections';
import {
	memberCols,
	applicantCols,
	appCols,
	reqCols,
	interviewCols,
	schedulerCols,
	inboxCols,
	legacyFinancesCols,
	getMemberToolbarActions,
	getApplicantToolbarActions,
	getApplicationToolbarActions,
	getRequestToolbarActions,
	getInterviewToolbarActions,
	getSchedulerToolbarActions,
	getInboxToolbarActions,
	DynamicApplicantProfilePicture,
	DynamicMemberProfilePicture,
	resolvePictureSrc,
	UserActivityStack,
	getStatusIcon,
	getAttachmentLabel,
	SenderSubjectCell,
	StackedDateCell,
} from '../ui/tableConfig';

import {
	memberActions,
	applicantActions,
	appActions,
	reqActions,
	interviewActions,
	schedulerActions,
	getInboxActions,
} from '../ui/tableActionColumns';

import { getRealTimeCollection, getRealTimeApplications, getRealTimeApplicationsByWindow, getRealTimeApplicationsByType, getRealTimeApplicationsByStatus, getRealTimeRejectedApplications, getRealTimeMeetings, getRealTimeInterviewsByWindow, getRealTimeLegacyFinances, getRealTimeRequestsForCycleYear } from '../data/firebase';
import type { ApplicationStatusValue, ApplicationTypeValue } from '../data/collections';
import type { ToolbarAction, ToolbarContext } from '../ui/tableConfig';

/**
 * Fetcher invoked by useRealTimeList. The extra positional args vary by list:
 * standard lists get (handler, cycleYear, type); the interview dashboard gets
 * (handler, userId, isCommittee). Entries narrow the extras they actually use.
 */
type ListFetcher = (handler: (data: DocumentData[]) => void, scope?: unknown, extra?: unknown) => unknown;

interface AdminListEntry {
	title: string | ((year: number) => string);
	columns: GridColDef[];
	actions?: GridColDef[];
	getActions?: (options: { permittedAliases: string[] }) => GridColDef[];
	fetcher?: ListFetcher;
	enrich?: boolean;
	getToolbarActions?: (helpers: ToolbarContext) => ToolbarAction[];
	// Consumers (useRealTimeList) index entries dynamically.
	[key: string]: unknown;
}

export const adminLists: Record<string, AdminListEntry> = {
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
		title: 'Current Applications',
		columns: appCols,
		actions: appActions,
		fetcher: (handler, cycleYear) => getRealTimeApplicationsByWindow(cycleYear as number, false, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	archives: {
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
		fetcher: (handler, cycleYear) => getRealTimeRequestsForCycleYear(cycleYear as number, handler),
		getToolbarActions: getRequestToolbarActions,
	},
	year: {
		title: (year: number) => `Applications (${year})`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, cycleYear) => getRealTimeApplicationsByWindow(cycleYear as number, false, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationType.newApplication]: {
		title: `Standard Grant Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, cycleYear, type) => getRealTimeApplicationsByType(type as ApplicationTypeValue, cycleYear as number, false, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationType.returningGrant]: {
		title: `Renewal Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, cycleYear, type) => getRealTimeApplicationsByType(type as ApplicationTypeValue, cycleYear as number, false, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationType.scholarship]: {
		title: `Compliance Check-ins`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, cycleYear, type) => getRealTimeApplicationsByType(type as ApplicationTypeValue, cycleYear as number, false, handler),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationStatus.deleted]: {
		title: `Deleted Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, cycleYear, type) => getRealTimeApplicationsByStatus(type as ApplicationStatusValue, handler, cycleYear as number),
		enrich: true,
	},
	[ApplicationStatus.incomplete]: {
		title: `Incomplete Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, cycleYear, type) => getRealTimeApplicationsByStatus(type as ApplicationStatusValue, handler, cycleYear as number),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationStatus.awarded]: {
		title: `Awarded Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, cycleYear, type) => getRealTimeApplicationsByStatus(type as ApplicationStatusValue, handler, cycleYear as number),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationStatus.completed]: {
		title: `Completed Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, cycleYear, type) => getRealTimeApplicationsByStatus(type as ApplicationStatusValue, handler, cycleYear as number),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationStatus.eligible]: {
		title: `Eligible Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, cycleYear, type) => getRealTimeApplicationsByStatus(type as ApplicationStatusValue, handler, cycleYear as number),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	[ApplicationStatus.invited]: {
		title: `Invited Applications`,
		columns: appCols,
		actions: appActions,
		fetcher: (handler, cycleYear, type) => getRealTimeApplicationsByStatus(type as ApplicationStatusValue, handler, cycleYear as number),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	rejected: {
		title: 'Rejected Applications',
		columns: appCols,
		actions: appActions,
		fetcher: (handler, cycleYear) => getRealTimeRejectedApplications(handler, cycleYear as number),
		enrich: true,
		getToolbarActions: getApplicationToolbarActions,
	},
	interviews: {
		title: 'Interview Dashboard',
		columns: interviewCols,
		actions: interviewActions,
		fetcher: (handler, userId, isCommittee) => getRealTimeMeetings(userId as string, isCommittee as boolean, handler, true),
		getToolbarActions: getInterviewToolbarActions,
	},
	scheduler: {
		title: 'Interview Scheduler',
		columns: schedulerCols,
		actions: schedulerActions,
		fetcher: (handler, cycleYear) => getRealTimeInterviewsByWindow(cycleYear as number, handler),
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

interface MobileCardEntry {
	actionKeys: string[];
	primaryCount?: number;
	getProps?: (item: DocumentData) => Record<string, unknown>;
	content: (props: { item: DocumentData }) => React.ReactElement;
}

export const mobileCardConfig: Record<string, MobileCardEntry> = {
	[UserType.member]: {
		actionKeys: ['viewMember', 'editMember', 'contact'],
		content: ({ item }) => (
			<>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
					<Box>
						<DynamicMemberProfilePicture user={item.id} src={resolvePictureSrc(item.picture)} />
					</Box>
					<Box sx={{ flex: 1, minWidth: 0 }}>
						<Typography variant='h6' noWrap color='textPrimary'>
							{item.firstName} {item.lastName}
						</Typography>
						<Typography variant='body2' noWrap sx={{ color: 'text.secondary' }}>
							{item.position} (Start: {item.since})
						</Typography>
					</Box>
				</Box>
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: 1 }}>
					<Box sx={{ flex: 1, minWidth: 0 }}>
						<Typography variant='body2' noWrap sx={{ color: 'text.primary' }}>
							{item.email}
						</Typography>
						<Typography variant='caption' noWrap sx={{ color: 'text.secondary' }}>
							{item.cell || 'No cell provided'}
						</Typography>
					</Box>
					<Box sx={{ textAlign: 'right', flexShrink: 0, ml: 1 }}>
						<UserActivityStack userId={item.id} />
					</Box>
				</Box>
			</>
		),
	},
	[UserType.applicant]: {
		actionKeys: ['viewApplicant', 'editApplicant', 'contact'],
		content: ({ item }) => {
			const { schoolLine, detailLine } = formatApplicantEnrollmentLines(item.school, item.major, item.gradYear);
			return (
				<>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
						<Box>
							<DynamicApplicantProfilePicture user={item.id} src={resolvePictureSrc(item.picture)} />
						</Box>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography variant='h6' noWrap color='textPrimary'>
								{item.firstName} {item.lastName}
							</Typography>
							<Typography variant='body2' noWrap sx={{ color: 'text.secondary' }}>
								{schoolLine}
							</Typography>
							{detailLine && (
								<Typography variant='caption' noWrap sx={{ color: 'text.secondary' }}>
									{detailLine}
								</Typography>
							)}
						</Box>
					</Box>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, px: 1 }}>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography variant='body2' noWrap sx={{ color: 'text.primary' }}>
								{item.email}
							</Typography>
							<Typography variant='caption' noWrap sx={{ color: 'text.secondary' }}>
								{item.cell || 'No cell provided'}
							</Typography>
							{item.homePhone && (
								<Typography variant='caption' noWrap sx={{ color: 'text.secondary' }}>
									Home: {item.homePhone}
								</Typography>
							)}
						</Box>
						<Box sx={{ textAlign: 'right', flexShrink: 0, ml: 1 }}>
							<UserActivityStack userId={item.id} />
						</Box>
					</Box>
				</>
			);
		},
	},
	applications: {
		actionKeys: ['viewApp', 'markEligible', 'contact'],
		content: ({ item }) => {
			const academicYear = item.window ? new Date(item.window).getFullYear() : 'N/A';
			const lastUpdated = item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'N/A';
			return (
				<>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
						<Box>
							<DynamicApplicantProfilePicture user={item.completedBy} src={resolvePictureSrc(item.picture)} />
						</Box>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography variant='h6' noWrap color='textPrimary'>
								{item.applicantName || 'Loading...'}
							</Typography>
							<Typography variant='body2' noWrap sx={{ color: 'text.secondary' }}>
								{item.type} - {academicYear}
							</Typography>
						</Box>
					</Box>
					<Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mt: 1 }}>
						<StatusCapsule status={item.status}>Status: {item.status}</StatusCapsule>
						<Typography variant='caption' sx={{ color: 'text.secondary' }}>
							Updated: {lastUpdated}
						</Typography>
					</Box>
				</>
			);
		},
	},
	requests: {
		actionKeys: ['viewRequestApp', 'editRequest', 'contact', 'resendRequest', 'invalidateRequest'],
		primaryCount: 3,
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
					<Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5, minWidth: 0 }}>
						<Box sx={{ flexShrink: 0, mt: 0.25 }}>{statusIcon}</Box>
						<Box sx={{ flex: 1, minWidth: 0 }}>
							<Typography variant='h6' noWrap color='textPrimary'>
								{item.name}
							</Typography>
							<Typography variant='body2' noWrap sx={{ color: 'text.secondary' }}>
								Relation: {item.relation}
							</Typography>
						</Box>
					</Box>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, minWidth: 0 }}>
						<Typography variant='body2' noWrap sx={{ color: 'text.primary' }}>
							{attachmentLabel}
						</Typography>
						<Typography variant='body2' noWrap sx={{ color: 'text.primary', flexShrink: 0, ml: 1 }}>
							Expires: {expires}
						</Typography>
					</Box>
					<Box sx={{ mt: 0.5, minWidth: 0 }}>
						<Typography variant='caption' noWrap sx={{ color: 'text.secondary', display: 'block' }}>
							{item.email}
						</Typography>
						<Typography variant='caption' noWrap sx={{ color: 'text.secondary', display: 'block' }}>
							For: {fromName}
						</Typography>
					</Box>
				</>
			);
		},
	},
	inbox: {
		actionKeys: ['viewEmail', 'replyEmail', 'forwardEmail', 'replyAllEmail', 'toggleRead', 'deleteEmail'],
		primaryCount: 3,
		getProps: (item: DocumentData) => ({ isUnread: item.isRead === false }),
		content: ({ item }) => {
			const isUnread = item.isRead === false;
			const emailDate = item.timestamp && Number(item.timestamp) > 0 ? new Date(Number(item.timestamp)) : null;
			return (
				<>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, minWidth: 0, width: '100%' }}>
						<Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
							<SenderSubjectCell row={item} />
						</Box>
						<Box sx={{ ml: 1, flexShrink: 0, maxWidth: '40%' }}>
							<StackedDateCell value={emailDate} row={item} />
						</Box>
					</Box>
					<Typography
						variant='body2'
						sx={{
							color: 'text.secondary',
							fontWeight: isUnread ? 'bold' : 'normal',
							whiteSpace: 'normal',
							display: '-webkit-box',
							WebkitLineClamp: 3,
							WebkitBoxOrient: 'vertical',
							overflow: 'hidden',
							my: 1,
						}}>
						{item.description}
					</Typography>
				</>
			);
		},
	},
	interviews: {
		actionKeys: ['joinInterview', 'waitInterview', 'changeStatus', 'createRoom', 'closeRoom', 'updateRsvp', 'rescheduleInterview', 'deleteInterview'],
		primaryCount: 3,
		content: ({ item }) => {
			const interviewTime = item.startTime?.toDate ? dayjs(item.startTime.toDate()).format('MM/DD/YYYY h:mm A') : 'Invalid Date';
			return (
				<>
					<Box sx={{ mb: 2, px: 1 }}>
						<Typography variant='h6' noWrap color='textPrimary'>
							{item.displayName}
						</Typography>
						<Typography variant='body2' noWrap sx={{ color: 'text.secondary' }}>
							{interviewTime}
						</Typography>
					</Box>
					<Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mt: 1 }}>
						<StatusCapsule status={item.status}>Status: {item.status}</StatusCapsule>
						<RsvpCapsule rsvpStatus={item.rsvpStatus} />
					</Box>
				</>
			);
		},
	},
	scheduler: {
		actionKeys: ['viewApplicantFromInterview', 'contactApplicantFromInterview', 'sendInvite', 'updateRsvp', 'deleteInterview'],
		primaryCount: 3,
		content: ({ item }) => {
			const interviewTime = item.startTime?.toDate ? dayjs(item.startTime.toDate()).format('MM/DD/YYYY h:mm A') : 'Invalid Date';
			return (
				<>
					<Box sx={{ mb: 2, px: 1 }}>
						<Typography variant='h6' noWrap color='textPrimary'>
							{item.applicantName}
						</Typography>
						<Typography variant='body2' noWrap sx={{ color: 'text.secondary' }}>
							{interviewTime}
						</Typography>
					</Box>
					<Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', mt: 1 }}>
						<StatusCapsule status={item.status}>Status: {item.status}</StatusCapsule>
						<RsvpCapsule rsvpStatus={item.rsvpStatus} />
					</Box>
				</>
			);
		},
	},
	legacyFinances: {
		actionKeys: [],
		content: ({ item }) => {
			const formatCurrency = (value: unknown) => {
				const num = Number.parseFloat(value as string);
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
							<Typography variant='h6' noWrap color='textPrimary'>
								Fiscal Year: {item.year}
							</Typography>
							<Typography variant='body2' noWrap sx={{ color: 'text.secondary' }}>
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
								<Typography variant='body1' sx={{ fontWeight: 500 }}>
									{displayClawback}
								</Typography>
							</Box>
							<Box sx={summaryItemStyles}>
								<Typography variant='body2' color='text.secondary'>
									Returns
								</Typography>
								<Typography variant='body1' sx={{ fontWeight: 500 }}>
									{displayReturns}
								</Typography>
							</Box>
							<Box sx={summaryItemStyles}>
								<Typography variant='body2' color='text.secondary'>
									Grant Pool
								</Typography>
								<Typography variant='body1' sx={{ fontWeight: 500 }}>
									{displaySgAvailable}
								</Typography>
							</Box>
							<Box sx={summaryItemStyles}>
								<Typography variant='body2' color='text.secondary'>
									Operational Funds
								</Typography>
								<Typography variant='body1' sx={{ fontWeight: 500 }}>
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
