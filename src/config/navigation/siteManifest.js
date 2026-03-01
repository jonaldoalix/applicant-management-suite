/**
 * SITE MANIFEST & ROUTE DEFINITIONS
 * ---------------------------------------------------------------------------
 * This file defines the mapping between URL Paths and React Page Components.
 *
 * * HOW IT WORKS:
 * The main 'App.js' component iterates over this array to render <Route> elements.
 * Each entry defines the path, the component to render, and the security wrapper.
 *
 * * ROUTE OBJECT SCHEMA:
 * - urlKey: Unique string ID (from Constants.js) used for referencing the page.
 * - path: The URL path (from paths.js).
 * - element: The React Component to render (usually wrapped in a Layout or Guard).
 * - index: (Optional) Boolean. If true, matches the parent route's root.
 */

import React from 'react';

// Pages
import New from '../../pages/new/New';
import Home from '../../pages/home/Home';
import List from '../../pages/list/List';
import Edit from '../../pages/edit/Edit';
import Login from '../../pages/login/Login';
import Apply from '../../pages/apply/Apply';
import Rsvp from '../../pages/interviews/RSVP';
import Logout from '../../pages/logout/Logout';
import Review from '../../pages/review/Review';
import Single from '../../pages/single/Single';
import Redirect from '../../pages/redirect/Redirect';
import Register from '../../pages/register/Register';
import Unsubscribe from '../../pages/unsub/Unsubscribe';
import SiteSettings from '../../pages/settings/Settings';
import MemberDash from '../../pages/memberDash/MemberDash';
import ContactCenter from '../../pages/contactCenter/ContactCenter';
import ManualUploader from '../../components/forms/members/ManualUploader';
import ApplicationController from '../../components/forms/applications/ApplicationController';
import UploadCenter from '../../pages/uploadCenter/UploadCenter';
import Onboard from '../../pages/register/Onboard';
import WaitingRoom from '../../pages/interviews/WaitingRoom';
import InterviewRoom from '../../pages/interviews/InterviewRoom';
import DeliberationRoom from '../../pages/interviews/DeliberationRoom';

// Layouts & Wrappers
import AdminLayout from '../../components/layout/AdminLayout';
import InterviewLayout from '../../components/layout/InterviewLayout';
import AccessDenied from '../../components/layout/AccessDenied';
import NotFound from '../../components/layout/NotFound';
import { ApplicationContextProvider } from '../../context/ApplicationContext';
import { PDFApplication } from '../../components/pdf/PDFApplication';

// Config & Guards
import { UserType, ApplicationType, ApplicationStatus } from '../data/collections';
import { Pages } from '../Constants';
import { paths } from './paths';
import { RouteGuard } from './router';

export const siteManifest = [
	// -------------------------
	// 1. Public & Authentication
	// -------------------------
	{ urlKey: Pages.root, path: paths.root, element: <Home />, index: true },
	{ urlKey: Pages.home, path: paths.home, element: <Home /> },
	{
		urlKey: Pages.login,
		path: paths.login,
		element: (
			<RouteGuard allowUnauthed={true}>
				<Login />
			</RouteGuard>
		),
	},
	{ urlKey: Pages.logout, path: paths.logout, element: <Logout /> },
	{
		urlKey: Pages.redirect,
		path: paths.redirect,
		element: (
			<RouteGuard>
				<Redirect />
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.registerApplicant,
		path: paths.registerApplicant,
		element: (
			// Allow unauthed users to register, but also allow admins to access (to help users)
			<RouteGuard allowedRoles={[UserType.member, UserType.both]} permissions={['admin']} allowUnauthed={true}>
				<Register />
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.registerMember,
		path: paths.registerMember,
		element: (
			<RouteGuard allowedRoles={[UserType.member, UserType.both]} permissions={['admin']} allowUnauthed={true}>
				<Onboard />
			</RouteGuard>
		),
	},

	// -------------------------
	// 2. Applicant Workflow
	// -------------------------
	{
		urlKey: Pages.applyHome,
		path: paths.apply,
		element: (
			<RouteGuard allowedRoles={[UserType.applicant, UserType.both]}>
				<Apply />
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.createApplication,
		path: paths.createApplication,
		element: (
			<RouteGuard allowedRoles={[UserType.applicant, UserType.both]}>
				<ApplicationContextProvider>
					<ApplicationController />
				</ApplicationContextProvider>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.updateApplication,
		path: paths.updateApplication,
		element: (
			<RouteGuard allowedRoles={[UserType.applicant, UserType.both]}>
				<ApplicationContextProvider>
					<ApplicationController />
				</ApplicationContextProvider>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.reviewApp,
		path: paths.reviewApp,
		element: (
			<RouteGuard allowedRoles={[UserType.applicant, UserType.both]}>
				<Review />
			</RouteGuard>
		),
	},

	// -------------------------
	// 3. Admin Dashboard (General)
	// -------------------------
	{
		urlKey: Pages.memberDash,
		path: paths.memberDash,
		element: (
			<RouteGuard permissions={['login']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<MemberDash />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.siteSettings,
		path: paths.siteSettings,
		element: (
			<RouteGuard permissions={['login', 'site']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<SiteSettings />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.financeCenter,
		path: paths.financeCenter,
		element: (
			<RouteGuard permissions={['login', 'finances']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type='legacyFinances' />
				</AdminLayout>
			</RouteGuard>
		),
	},

	// -------------------------
	// 4. Admin - User Management
	// -------------------------
	// -- Applicants --
	{
		urlKey: Pages.allApplicants,
		path: paths.allApplicants,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type={UserType.applicant} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.viewApplicant,
		path: paths.viewApplicant,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<Single type={UserType.applicant} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.editApplicant,
		path: paths.editApplicant,
		element: (
			<RouteGuard permissions={['login', 'admin']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<Edit type={UserType.applicant} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.newApplicant,
		path: paths.newApplicant,
		element: (
			<RouteGuard permissions={['login', 'admin']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<New type={UserType.applicant} />
				</AdminLayout>
			</RouteGuard>
		),
	},

	// -- Members (Admins) --
	{
		urlKey: Pages.allMembers,
		path: paths.allMembers,
		element: (
			<RouteGuard permissions={['login', 'members']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type={UserType.member} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.viewMember,
		path: paths.viewMember,
		element: (
			<RouteGuard permissions={['login', 'members']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<Single type={UserType.member} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.newMember,
		path: paths.newMember,
		element: (
			<RouteGuard permissions={['login', 'admin', 'members']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<New type={UserType.member} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.editMember,
		path: paths.editMember,
		element: (
			<RouteGuard permissions={['login', 'admin', 'members']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<Edit type={UserType.member} />
				</AdminLayout>
			</RouteGuard>
		),
	},

	// -------------------------
	// 5. Admin - Applications & Requests
	// -------------------------
	{
		urlKey: Pages.allApps,
		path: paths.allApps,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type='applications' />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.viewApp,
		path: paths.viewApp,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<Single type='application' />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.exportApp,
		path: paths.exportApp,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<PDFApplication />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.allRequests,
		path: paths.allRequests,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type='requests' />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.editRequest,
		path: paths.editRequest,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<Edit type='Request' />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.newRequest,
		path: paths.newRequest,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<New type='Request' />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.manualUpload,
		path: paths.manualUpload,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<ManualUploader />
				</AdminLayout>
			</RouteGuard>
		),
	},

	// -------------------------
	// 6. Admin - Queues & Archives
	// -------------------------
	{
		urlKey: Pages.archives,
		path: paths.archives,
		element: (
			<RouteGuard permissions={['login', 'applications', 'archives']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type='applications' />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.completedApps,
		path: paths.completedApps,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type={ApplicationStatus.completed} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.eligibleApps,
		path: paths.eligibleApps,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type={ApplicationStatus.eligible} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	// ... Additional status queues (Invited, Awarded, Rejected, Deleted, Incomplete) ...
	{
		urlKey: Pages.invitedApps,
		path: paths.invitedApps,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type={ApplicationStatus.invited} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.awardedApps,
		path: paths.awardedApps,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type={ApplicationStatus.awarded} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.deletedApps,
		path: paths.deletedApps,
		element: (
			<RouteGuard permissions={['login', 'admin', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type={ApplicationStatus.deleted} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.rejectedApps,
		path: paths.rejectedApps,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type='rejected' />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.incompleteApps,
		path: paths.incompleteApps,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type={ApplicationStatus.incomplete} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	// Year-based queues
	{
		urlKey: Pages.allAppsInYear,
		path: paths.allAppsInYear,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type='year' />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.newAppsInYear,
		path: paths.newAppsInYear,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type={ApplicationType.newApplication} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.returningAppsInYear,
		path: paths.returningAppsInYear,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type={ApplicationType.returningGrant} />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.scholarshipAppsInYear,
		path: paths.scholarshipAppsInYear,
		element: (
			<RouteGuard permissions={['login', 'applications']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type={ApplicationType.scholarship} />
				</AdminLayout>
			</RouteGuard>
		),
	},

	// -------------------------
	// 7. Communications (Email)
	// -------------------------
	{
		urlKey: Pages.contactCenter,
		path: paths.contactCenter,
		element: (
			<RouteGuard permissions={['login', 'push']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<ContactCenter />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.inbox,
		path: paths.inbox,
		element: (
			<RouteGuard permissions={['login', 'email']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type='inbox' />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.viewEmail,
		path: paths.viewEmail,
		element: (
			<RouteGuard permissions={['login', 'email']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<Single type='email' />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.composeEmail,
		path: paths.composeEmail,
		element: (
			<RouteGuard permissions={['login', 'email']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<New type='email' />
				</AdminLayout>
			</RouteGuard>
		),
	},

	// -------------------------
	// 8. Interviews & Scheduling
	// -------------------------
	{
		urlKey: Pages.interviewDash,
		path: paths.interviewDash,
		element: (
			<RouteGuard permissions={['login', 'interviews.canAccess']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type='interviews' />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.scheduling,
		path: paths.scheduling,
		element: (
			<RouteGuard permissions={['login', 'interviews.canSchedule']} allowedRoles={[UserType.member, UserType.both]}>
				<AdminLayout>
					<List type='scheduler' />
				</AdminLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.waitingRoom,
		path: paths.waitingRoom,
		element: (
			<RouteGuard permissions={['interviews.canAccess']} allowedRoles={[UserType.applicant, UserType.member, UserType.both]}>
				<InterviewLayout>
					<WaitingRoom />
				</InterviewLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.interviewRoom,
		path: paths.interviewRoom,
		element: (
			<RouteGuard allowedRoles={[UserType.applicant, UserType.member, UserType.both]} permissions={['interviews.canAccess']}>
				<InterviewLayout>
					<InterviewRoom />
				</InterviewLayout>
			</RouteGuard>
		),
	},
	{
		urlKey: Pages.deliberationRoom,
		path: paths.deliberationRoom,
		element: (
			<RouteGuard permissions={['interviews.canAccess']} allowedRoles={[UserType.member, UserType.both]}>
				<InterviewLayout>
					<DeliberationRoom />
				</InterviewLayout>
			</RouteGuard>
		),
	},
	{ urlKey: Pages.rsvp, path: paths.rsvp, element: <Rsvp /> },

	// -------------------------
	// 9. Utilities & System
	// -------------------------
	{ urlKey: Pages.requests, path: paths.requests, element: <UploadCenter /> },
	{
		urlKey: Pages.unsubscribe,
		path: paths.unsubscribe,
		element: <Unsubscribe />,
	},
	{ urlKey: Pages.notFound, path: paths.notFound, element: <NotFound /> },
	{
		urlKey: Pages.caAccessDenied,
		path: paths.caAccessDenied,
		element: <AccessDenied />,
	},
	{
		urlKey: Pages.adminAccessDenied,
		path: paths.adminAccessDenied,
		element: (
			<AdminLayout>
				<AccessDenied />
			</AdminLayout>
		),
	},
	{ urlKey: Pages.caRoot, path: paths.caRoot, element: <NotFound /> },
];
