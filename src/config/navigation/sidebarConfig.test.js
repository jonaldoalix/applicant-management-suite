import { renderHook } from '@testing-library/react';
import { useAuth } from '../../context/AuthContext';
import { useSidebarMenu } from './sidebarConfig';

// Mock useAuth
jest.mock('../../context/AuthContext');

// Mock route utils
jest.mock('./routeUtils', () => ({
	generatePath: (path, params) => {
		// FIX: Add a check to ensure path is not undefined
		if (!path) {
			return '';
		}
		if (params) {
			let newPath = path;
			for (const key in params) {
				newPath = newPath.replace(`:${key}`, params[key]);
			}
			return newPath;
		}
		return path;
	},
}));

// Mock paths (simplified)
jest.mock('./paths', () => ({
	paths: {
		memberDash: '/members/dashboard',
		inbox: '/inbox',
		allApps: '/applications/all',
		allRequests: '/requests/all',
		interviewDash: '/interviews/dashboard',
		scheduling: '/interviews/scheduling',
		allMembers: '/members/all',
		allApplicants: '/applicants/all',
		siteSettings: '/settings',
		financeCenter: '/finances',
		contactCenter: '/contact',
		newAppsInYear: '/applications/:year/newApplicants',
		// Add any other paths used in sidebarConfig.js to be safe
		incompleteApps: '/applications/incomplete',
		completedApps: '/applications/completed',
		eligibleApps: '/applications/eligible',
		invitedApps: '/applications/invited',
		awardedApps: '/applications/awarded',
		rejectedApps: '/applications/rejected',
		deletedApps: '/applications/deleted',
		allAppsInYear: '/applications/:year/all',
		archives: '/archives',
	},
}));

// ... (all mocks are unchanged)

const mockUseAuth = useAuth;

describe('useSidebarMenu', () => {
	it('disables all admin/protected links when user has no permissions', () => {
		// FIX: Provide the 'login' permission. A user with {} shouldn't see the dashboard.
		mockUseAuth.mockReturnValue({ member: { permissions: { login: true } } });
		const { result } = renderHook(() => useSidebarMenu());
		const adminPages = result.current.find((section) => section.title === 'ADMIN').pages;
		const inboxLink = adminPages.find((page) => page.text === 'Inbox');
		const appsLink = adminPages.find((page) => page.text === 'Applications');

		// Dashboard should now be enabled
		expect(result.current[0].pages[0].disable).toBe(false); // Dashboard
		// Other links should still be disabled
		expect(inboxLink.disable).toBe(true);
		expect(appsLink.disable).toBe(true);
	});

	it('enables all links when user has admin permissions', () => {
		mockUseAuth.mockReturnValue({ member: { permissions: { admin: true } } });
		const { result } = renderHook(() => useSidebarMenu());
		const adminPages = result.current.find((section) => section.title === 'ADMIN').pages;
		const inboxLink = adminPages.find((page) => page.text === 'Inbox');
		const appsLink = adminPages.find((page) => page.text === 'Applications');

		// These will now pass because of the source code fix
		expect(inboxLink.disable).toBe(false);
		expect(appsLink.disable).toBe(false);
	});

	it('enables specific links based on fine-grained permissions', () => {
		mockUseAuth.mockReturnValue({
			member: {
				permissions: {
					login: true,
					email: true, // Should enable Inbox
					applications: false, // Should disable Applications
					interviews: { canAccess: true, canSchedule: false }, // Should enable Interviews, disable Scheduling
				},
			},
		});

		const { result } = renderHook(() => useSidebarMenu());
		const adminPages = result.current.find((section) => section.title === 'ADMIN').pages;
		const inboxLink = adminPages.find((page) => page.text === 'Inbox');
		const appsLink = adminPages.find((page) => page.text === 'Applications');
		const interviewLink = adminPages.find((page) => page.text === 'Interviews');
		const schedulingLink = adminPages.find((page) => page.text === 'Scheduling');

		expect(inboxLink.disable).toBe(false);
		expect(appsLink.disable).toBe(true);
		expect(interviewLink.disable).toBe(false);
		expect(schedulingLink.disable).toBe(true);
	});
});
