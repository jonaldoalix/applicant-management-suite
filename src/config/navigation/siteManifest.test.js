import React from 'react';
import { siteManifest } from './siteManifest';
import { Pages } from '../Constants';
import { paths } from './paths';
import { UserType } from '../data/collections';

// FIX: Import the mocked components to check their types
import { RouteGuard } from './router';
import AdminLayout from '../../components/layout/AdminLayout';
import Apply from '../../pages/apply/Apply';
import Home from '../../pages/home/Home';
import Login from '../../pages/login/Login';
import NotFound from '../../components/layout/NotFound';

// Mock all page/layout components imported by siteManifest.js
vi.mock('../../pages/new/New', () => ({ default: () => <div data-testid='New' /> }));
vi.mock('../../pages/home/Home', () => ({ default: () => <div data-testid='Home' /> }));
vi.mock('../../pages/list/List', () => ({ default: () => <div data-testid='List' /> }));
vi.mock('../../pages/edit/Edit', () => ({ default: () => <div data-testid='Edit' /> }));
vi.mock('../../pages/login/Login', () => ({ default: () => <div data-testid='Login' /> }));
vi.mock('../../pages/apply/Apply', () => ({ default: () => <div data-testid='Apply' /> }));
vi.mock('../../pages/interviews/RSVP', () => ({ default: () => <div data-testid='Rsvp' /> }));
vi.mock('../../pages/logout/Logout', () => ({ default: () => <div data-testid='Logout' /> }));
vi.mock('../../pages/review/Review', () => ({ default: () => <div data-testid='Review' /> }));
vi.mock('../../pages/single/Single', () => ({ default: () => <div data-testid='Single' /> }));
vi.mock('../../pages/redirect/Redirect', () => ({ default: () => <div data-testid='Redirect' /> }));
vi.mock('../../pages/register/Register', () => ({ default: () => <div data-testid='Register' /> }));
vi.mock('../../pages/unsub/Unsubscribe', () => ({ default: () => <div data-testid='Unsubscribe' /> }));
vi.mock('../../pages/settings/Settings', () => ({ default: () => <div data-testid='SiteSettings' /> }));
vi.mock('../../pages/memberDash/MemberDash', () => ({ default: () => <div data-testid='MemberDash' /> }));
vi.mock('../../components/layout/AdminLayout', () => ({ default: ({ children }) => <div data-testid='AdminLayout'>{children}</div> }));
vi.mock('../../components/layout/AccessDenied', () => ({ default: () => <div data-testid='AccessDenied' /> }));
vi.mock('../../pages/contactCenter/ContactCenter', () => ({ default: () => <div data-testid='ContactCenter' /> }));
vi.mock('../../components/forms/members/ManualUploader', () => ({ default: () => <div data-testid='ManualUploader' /> }));
vi.mock('../../components/forms/applications/ApplicationController', () => ({ default: () => <div data-testid='ApplicationController' /> }));
vi.mock('../../context/ApplicationContext', () => ({ ApplicationContextProvider: ({ children }) => <div data-testid='ApplicationContextProvider'>{children}</div> }));
vi.mock('../../components/pdf/PDFApplication', () => ({ PDFApplication: () => <div data-testid='PDFApplication' /> }));
vi.mock('../../pages/uploadCenter/UploadCenter', () => ({ default: () => <div data-testid='UploadCenter' /> }));
vi.mock('../../pages/register/Onboard', () => ({ default: () => <div data-testid='Onboard' /> }));
vi.mock('../../components/layout/NotFound', () => ({ default: () => <div data-testid='NotFound' /> }));
vi.mock('../../pages/interviews/WaitingRoom', () => ({ default: () => <div data-testid='WaitingRoom' /> }));
vi.mock('../../components/layout/InterviewLayout', () => ({ default: ({ children }) => <div data-testid='InterviewLayout'>{children}</div> }));
vi.mock('../../pages/interviews/InterviewRoom', () => ({ default: () => <div data-testid='InterviewRoom' /> }));
vi.mock('../../pages/interviews/DeliberationRoom', () => ({ default: () => <div data-testid='DeliberationRoom' /> }));

// Mock config/context dependencies
vi.mock('../data/collections', () => ({
	UserType: {
		applicant: 'applicant',
		member: 'member',
		both: 'both',
	},
	ApplicationType: {
		newApplication: 'New Applicant',
		returningGrant: 'Returning Grant',
		scholarship: 'Scholarship Recipient',
	},
	ApplicationStatus: {
		completed: 'Completed',
		eligible: 'Eligible',
		invited: 'Invited',
		awarded: 'Awarded',
		deleted: 'Deleted',
		incomplete: 'Incomplete',
	},
}));

vi.mock('../Constants', () => ({
	Pages: {
		root: 'root',
		login: 'login',
		logout: 'logout',
		redirect: 'redirect',
		home: 'home',
		applyHome: 'applyHome',
		createApplication: 'createApplication',
		updateApplication: 'updateApplication',
		reviewApp: 'reviewApp',
		registerApplicant: 'registerApplicant',
		registerMember: 'registerMember',
		allApplicants: 'allApplicants',
		viewApplicant: 'viewApplicant',
		editApplicant: 'editApplicant',
		newApplicant: 'newApplicant',
		allMembers: 'allMembers',
		viewMember: 'viewMember',
		newMember: 'newMember',
		editMember: 'editMember',
		memberDash: 'memberDash',
		contactCenter: 'contactCenter',
		siteSettings: 'siteSettings',
		financeCenter: 'financeCenter',
		adminAccessDenied: 'adminAccessDenied',
		scheduling: 'scheduling',
		interviewDash: 'interviewDash',
		allRequests: 'allRequests',
		editRequest: 'editRequest',
		newRequest: 'newRequest',
		requests: 'requests',
		manualUpload: 'manualUpload',
		inbox: 'inbox',
		viewEmail: 'viewEmail',
		composeEmail: 'composeEmail',
		allAppsInYear: 'allAppsInYear',
		newAppsInYear: 'newAppsInYear',
		returningAppsInYear: 'returningAppsInYear',
		scholarshipAppsInYear: 'scholarshipAppsInYear',
		allApps: 'allApps',
		viewApp: 'viewApp',
		exportApp: 'exportApp',
		archives: 'archives',
		completedApps: 'completedApps',
		eligibleApps: 'eligibleApps',
		invitedApps: 'invitedApps',
		awardedApps: 'awardedApps',
		deletedApps: 'deletedApps',
		rejectedApps: 'rejectedApps',
		incompleteApps: 'incompleteApps',
		waitingRoom: 'waitingRoom',
		interviewRoom: 'interviewRoom',
		deliberationRoom: 'deliberationRoom',
		rsvp: 'rsvp',
		unsubscribe: 'unsubscribe',
		notFound: 'notFound',
		caAccessDenied: 'caAccessDenied',
		caRoot: 'caRoot',
	},
}));

vi.mock('./paths', () => ({
	paths: {
		root: '/',
		login: '/login',
		logout: '/logout',
		redirect: '/redirect',
		home: '/home',
		apply: '/apply',
		createApplication: '/apply/create/:applicationType',
		updateApplication: '/apply/update/:applicationType/:applicationID',
		reviewApp: '/apply/review/:id',
		registerApplicant: '/register',
		registerMember: '/register-member',
		allApplicants: '/applicants',
		viewApplicant: '/applicants/:id',
		editApplicant: '/applicants/:id/edit',
		newApplicant: '/applicants/new',
		allMembers: '/members',
		viewMember: '/members/:id',
		newMember: '/members/new',
		editMember: '/members/:id/edit',
		memberDash: '/members/dashboard',
		contactCenter: '/contact',
		siteSettings: '/settings',
		financeCenter: '/finances',
		adminAccessDenied: '/access-denied-admin',
		scheduling: '/interviews/scheduling',
		interviewDash: '/interviews/dashboard',
		allRequests: '/requests',
		editRequest: '/requests/:id/edit',
		newRequest: '/requests/new',
		requests: '/requests/:id',
		manualUpload: '/manual-upload',
		inbox: '/inbox',
		viewEmail: '/inbox/view/:id',
		composeEmail: '/inbox/compose',
		allAppsInYear: '/applications/:year/all',
		newAppsInYear: '/applications/:year/newApplicants',
		returningAppsInYear: '/applications/:year/returningGrants',
		scholarshipAppsInYear: '/applications/:year/scholarshipRecipients',
		allApps: '/applications/all',
		viewApp: '/applications/:id',
		exportApp: '/applications/:id/export',
		archives: '/archives',
		completedApps: '/applications/completed',
		eligibleApps: '/applications/eligible',
		invitedApps: '/applications/invited',
		awardedApps: '/applications/awarded',
		deletedApps: '/applications/deleted',
		rejectedApps: '/applications/rejected',
		incompleteApps: '/applications/incomplete',
		waitingRoom: '/interviews/waiting-room/:interviewId',
		interviewRoom: '/interviews/room/:interviewId',
		deliberationRoom: '/interviews/deliberation',
		rsvp: '/interviews/rsvp/:interviewId',
		unsubscribe: '/unsubscribe/:id',
		notFound: '/404',
		caAccessDenied: '/access-denied',
		caRoot: '*',
	},
}));

vi.mock('./router', () => ({
	RouteGuard: ({ children }) => <div data-testid='RouteGuard'>{children}</div>,
}));

describe('siteManifest.js', () => {
	it('should export a valid site manifest array', () => {
		expect(Array.isArray(siteManifest)).toBe(true);
		// Check that a few key routes are present
		expect(siteManifest.length).toBeGreaterThan(50); // Ensure all routes are defined
	});

	it('should contain all required keys for every route', () => {
		for (const route of siteManifest) {
			expect(route).toHaveProperty('urlKey');
			expect(route).toHaveProperty('path');
			expect(route).toHaveProperty('element');
			expect(React.isValidElement(route.element)).toBe(true);
		}
	});

	it('should correctly define the root, login, and 404 routes', () => {
		const rootRoute = siteManifest.find((r) => r.urlKey === Pages.root);
		const loginRoute = siteManifest.find((r) => r.urlKey === Pages.login);
		const notFoundRoute = siteManifest.find((r) => r.urlKey === Pages.notFound);

		expect(rootRoute.path).toBe(paths.root);
		expect(rootRoute.element.type).toBe(Home);

		expect(loginRoute.path).toBe(paths.login);
		// Check the child of the RouteGuard
		expect(loginRoute.element.props.children.type).toBe(Login);

		expect(notFoundRoute.path).toBe(paths.notFound);
		expect(notFoundRoute.element.type).toBe(NotFound);
	});

	it('should correctly define a protected member route (e.g., MemberDash)', () => {
		const dashRoute = siteManifest.find((r) => r.urlKey === Pages.memberDash);
		expect(dashRoute.path).toBe(paths.memberDash);

		// Check that the top-level element is the RouteGuard
		expect(dashRoute.element.type).toBe(RouteGuard);
		expect(dashRoute.element.props.allowedRoles).toEqual([UserType.member, UserType.both]);
		expect(dashRoute.element.props.permissions).toEqual(['login']);

		// FIX: Check that the *child* of the RouteGuard is the AdminLayout
		expect(dashRoute.element.props.children.type).toBe(AdminLayout);

		// Check that the child of AdminLayout is MemberDash
		expect(dashRoute.element.props.children.props.children.type().props['data-testid']).toBe('MemberDash');
	});

	it('should correctly define a protected applicant route (e.g., ApplyHome)', () => {
		const applyRoute = siteManifest.find((r) => r.urlKey === Pages.applyHome);
		expect(applyRoute.path).toBe(paths.apply);

		// Check that the top-level element is the RouteGuard
		expect(applyRoute.element.type).toBe(RouteGuard);
		expect(applyRoute.element.props.allowedRoles).toEqual([UserType.applicant, UserType.both]);

		// Check that the *child* of the RouteGuard is the Apply component
		expect(applyRoute.element.props.children.type).toBe(Apply);
	});
});
