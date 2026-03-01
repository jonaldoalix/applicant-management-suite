/**
 * SIDEBAR NAVIGATION CONFIGURATION
 * ---------------------------------------------------------------------------
 * This file defines the structure, links, and access controls for the
 * Admin Dashboard Sidebar.
 *
 * * HOW IT WORKS:
 * The 'useSidebarMenu' hook processes the 'sidebarTemplate' array.
 * It checks the current user's permissions against the 'requiredPermissions'
 * array for each page. If the user lacks permission, the link is disabled or hidden.
 *
 * * CONFIGURATION SCHEMA:
 * - title: Section Header (e.g. "MAIN", "ADMIN").
 * - pages: Array of navigation items.
 * - text: Visible label.
 * - link: URL path (using 'paths' and 'generatePath').
 * - icon: MUI Icon component.
 * - requiredPermissions: Array of permission keys strings (e.g. ['admin', 'finances']).
 */

import React, { useMemo } from 'react';
import { Inbox as InboxIcon, DashboardOutlined as DashboardIcon, ListAltOutlined as ApplicationIcon, VideoCameraFrontOutlined as InterviewIcon, Groups2Outlined as MembersIcon, StackedBarChartOutlined as FinancesIcon, FiberNewOutlined as NewIcon, KeyboardReturnOutlined as ReturningIcon, SchoolOutlined as SchoolIcon, Inventory2Outlined as InventoryIcon, ArchiveOutlined as ArchiveIcon, SettingsOutlined as SettingsIcon, AssignmentLateOutlined as IncompleteStatusIcon, AssignmentTurnedInOutlined as GoodStatusIcon, AssignmentReturnOutlined as RejectedStatusIcon, AssignmentOutlined as NeutralStatusIcon, ForwardToInboxOutlined as ContactCenterIcon, MailOutline as RequestIcon, EventAvailable as EventIcon } from '@mui/icons-material';

// Context & Config
import { useAuth } from '../../context/AuthContext';
import { generatePath } from './routeUtils';
import { paths } from './paths';

// Dynamic year for generating history links (e.g. "2023 Applications")
const currYear = new Date().getFullYear();

// --- Sidebar Structure ---

const sidebarTemplate = [
	{
		title: 'MAIN',
		pages: [
			{
				icon: <DashboardIcon className='icon' />,
				link: generatePath(paths.memberDash),
				text: 'Dashboard',
				requiredPermissions: ['login'], // Basic access check
			},
		],
	},
	{
		title: 'ADMIN',
		pages: [
			{
				icon: <InboxIcon className='icon' />,
				link: generatePath(paths.inbox),
				text: 'Inbox',
				requiredPermissions: ['email'],
			},
			{
				icon: <ApplicationIcon className='icon' />,
				link: generatePath(paths.allApps),
				text: 'Applications',
				requiredPermissions: ['admin', 'applications'],
			},
			{
				icon: <RequestIcon className='icon' />,
				link: generatePath(paths.allRequests),
				text: 'Requests',
				requiredPermissions: ['admin', 'applications'],
			},
			{
				icon: <InterviewIcon className='icon' />,
				link: generatePath(paths.interviewDash),
				text: 'Interviews',
				requiredPermissions: ['admin', 'interviews.canAccess'],
			},
			{
				icon: <EventIcon className='icon' />,
				link: generatePath(paths.scheduling),
				text: 'Scheduling',
				requiredPermissions: ['admin', 'interviews.canSchedule'],
			},
			{
				icon: <MembersIcon className='icon' />,
				link: generatePath(paths.allMembers),
				text: 'Administrators',
				requiredPermissions: ['admin', 'members'],
			},
			{
				icon: <MembersIcon className='icon' />,
				link: generatePath(paths.allApplicants),
				text: 'Applicants',
				requiredPermissions: ['admin', 'applications'],
			},
			{
				icon: <SettingsIcon className='icon' />,
				link: generatePath(paths.siteSettings),
				text: 'Settings',
				requiredPermissions: ['admin', 'site'],
			},
			{
				icon: <FinancesIcon className='icon' />,
				link: generatePath(paths.financeCenter),
				text: 'Finances',
				requiredPermissions: ['finances'],
			},
			{
				icon: <ContactCenterIcon className='icon' />,
				link: generatePath(paths.contactCenter),
				text: 'Sender',
				requiredPermissions: ['push'],
			},
		],
	},
	{
		title: 'CURRENT',
		pages: [
			{
				icon: <NewIcon className='icon' />,
				link: generatePath(paths.newAppsInYear, { year: currYear }),
				text: 'New Apps',
				requiredPermissions: ['admin', 'applications'],
			},
			{
				icon: <ReturningIcon className='icon' />,
				link: generatePath(paths.returningAppsInYear, { year: currYear }),
				text: 'Grants',
				requiredPermissions: ['admin', 'applications'],
			},
			{
				icon: <SchoolIcon className='icon' />,
				link: generatePath(paths.scholarshipAppsInYear, { year: currYear }),
				text: 'Scholarships',
				requiredPermissions: ['admin', 'applications'],
			},
		],
	},
	{
		title: 'STATUS',
		pages: [
			{ icon: <IncompleteStatusIcon className='icon' />, link: generatePath(paths.incompleteApps), text: 'Incomplete', requiredPermissions: ['admin', 'applications'] },
			{ icon: <GoodStatusIcon className='icon' />, link: generatePath(paths.completedApps), text: 'Completed', requiredPermissions: ['admin', 'applications'] },
			{ icon: <GoodStatusIcon className='icon' />, link: generatePath(paths.eligibleApps), text: 'Eligible', requiredPermissions: ['admin', 'applications'] },
			{ icon: <GoodStatusIcon className='icon' />, link: generatePath(paths.invitedApps), text: 'Invited', requiredPermissions: ['admin', 'applications'] },
			{ icon: <GoodStatusIcon className='icon' />, link: generatePath(paths.awardedApps), text: 'Awarded', requiredPermissions: ['admin', 'applications'] },
			{ icon: <RejectedStatusIcon className='icon' />, link: generatePath(paths.rejectedApps), text: 'Rejected', requiredPermissions: ['admin', 'applications'] },
			{ icon: <NeutralStatusIcon className='icon' />, link: generatePath(paths.deletedApps), text: 'Deleted', requiredPermissions: ['admin', 'applications'] },
		],
	},
	{
		title: 'PAST',
		pages: [
			{ icon: <ArchiveIcon className='icon' />, link: generatePath(paths.allAppsInYear, { year: currYear - 1 }), text: `${currYear - 1}`, requiredPermissions: ['admin', 'applications'] },
			{ icon: <ArchiveIcon className='icon' />, link: generatePath(paths.allAppsInYear, { year: currYear - 2 }), text: `${currYear - 2}`, requiredPermissions: ['admin', 'applications'] },
			{ icon: <ArchiveIcon className='icon' />, link: generatePath(paths.allAppsInYear, { year: currYear - 3 }), text: `${currYear - 3}`, requiredPermissions: ['admin', 'applications'] },
			{ icon: <InventoryIcon className='icon' />, link: generatePath(paths.archives), text: 'Archives', requiredPermissions: ['admin', 'archives'] },
		],
	},
];

// --- Helpers ---

/**
 * Checks if a user object has a specific permission.
 * Supports nested keys (e.g. 'interviews.canAccess').
 */
const hasPermission = (permissions, permPath) => {
	if (!permissions) return false;
	return permPath.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), permissions);
};

/**
 * Determines if a specific page should be enabled/visible for the current user.
 * * LOGIC:
 * 1. If user has global 'admin' permission -> Enabled.
 * 2. If not admin, check if user has ANY of the required permissions.
 */
const processPagePermissions = (page, permissions) => {
	const { requiredPermissions, ...restOfPage } = page;
	let isDisabled;

	if (requiredPermissions) {
		const hasAdminPerm = hasPermission(permissions, 'admin');

		if (hasAdminPerm) {
			// Super Admin sees everything
			isDisabled = false;
		} else {
			// Check for specific granular permissions
			const hasRequiredPerms = requiredPermissions.some((p) => hasPermission(permissions, p));
			isDisabled = !hasRequiredPerms;
		}
	}

	// Return the page config with the calculated 'disable' flag
	return { ...restOfPage, disable: isDisabled };
};

// --- Hook ---

/**
 * Custom Hook that returns the computed Sidebar menu.
 * Re-calculates whenever the logged-in 'member' object changes.
 */
export const useSidebarMenu = () => {
	const { member } = useAuth();

	return useMemo(() => {
		const permissions = member?.permissions || {};
		return sidebarTemplate.map((section) => ({
			...section,
			pages: section.pages.map((page) => processPagePermissions(page, permissions)),
		}));
	}, [member]);
};
