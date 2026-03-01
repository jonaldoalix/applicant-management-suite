import { isAdminPath, generatePath } from './routeUtils';
import { paths } from './paths';

// Mock the paths module
// The logic `prefix.split('/')[1]` suggests paths are like 'admin/members'
// and it's checking against the second part.
jest.mock('./paths', () => ({
	paths: {
		members: 'admin/members',
		applicants: 'admin/applicants',
		applications: 'admin/applications',
		// Add any other paths used in the app
		contactCenter: 'admin/contact',
		exportApp: 'admin/export/:id',
	},
}));

describe('routeUtils', () => {
	describe('isAdminPath', () => {
		it('should return true for admin paths', () => {
			expect(isAdminPath('/members/123')).toBe(true);
			expect(isAdminPath('/applicants/all')).toBe(true);
			expect(isAdminPath('/applications')).toBe(true);
		});

		it('should return false for non-admin paths', () => {
			expect(isAdminPath('/home')).toBe(false);
			expect(isAdminPath('/')).toBe(false);
			expect(isAdminPath('/login')).toBe(false);
			expect(isAdminPath('/admin/dashboard')).toBe(false); // 'dashboard' is not in the prefix list
		});

		it('should return false for partial matches', () => {
			expect(isAdminPath('/my-members')).toBe(false);
		});

		it('should be case sensitive', () => {
			expect(isAdminPath('/Members/123')).toBe(false);
		});
	});

	describe('generatePath', () => {
		it('should replace a single parameter', () => {
			const path = '/app/user/:id';
			const params = { id: '123' };
			expect(generatePath(path, params)).toBe('/app/user/123');
		});

		it('should replace multiple parameters', () => {
			const path = '/app/:section/user/:id';
			const params = { section: 'profile', id: '123' };
			expect(generatePath(path, params)).toBe('/app/profile/user/123');
		});

		it('should return the original path if no params object is provided', () => {
			const path = '/app/user/:id';
			expect(generatePath(path)).toBe('/app/user/:id');
		});

		it('should return the original path if params object is empty', () => {
			const path = '/app/user/:id';
			expect(generatePath(path, {})).toBe('/app/user/:id');
		});

		it('should ignore extra parameters in the object', () => {
			const path = '/app/user/:id';
			const params = { id: '123', other: 'foo' };
			expect(generatePath(path, params)).toBe('/app/user/123');
		});

		it('should not replace anything if the param key is missing', () => {
			const path = '/app/user/:id';
			const params = { userId: '123' };
			expect(generatePath(path, params)).toBe('/app/user/:id');
		});
	});
});
