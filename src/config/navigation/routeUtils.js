/**
 * ROUTING UTILITIES
 * ---------------------------------------------------------------------------
 * Helper functions for handling URL paths and navigation logic.
 */

import { paths } from './paths';

/**
 * List of top-level route prefixes that render the "Admin Dashboard" layout
 * (Sidebar + Toolbar) instead of the public/applicant layout.
 */
const adminPathPrefixes = [
	paths.members, // '/members'
	paths.applicants, // '/applicants'
	paths.applications, // '/applications'
];

/**
 * Determines if the current page is part of the Admin Console.
 * Used by the Layout component to toggle the Sidebar.
 * * Logic: Checks if the current pathname starts with the root segment
 * of any defined admin path (e.g. checks if '/members/view/123' starts with '/members').
 * * @param {string} pathname - The current browser URL path (from useLocation).
 * @returns {boolean} True if the path belongs to an admin section.
 */
export const isAdminPath = (pathname) => {
	return adminPathPrefixes.some((prefix) => {
		// Extract the root segment (e.g. '/members' -> 'members')
		// This ensures we match '/members' and '/members/...' but not '/membership-info'
		const rootSegment = prefix.split('/')[1];
		return pathname.startsWith('/' + rootSegment);
	});
};

/**
 * Constructs a URL by replacing dynamic parameters with actual values.
 * * Example:
 * generatePath('/users/:id', { id: '42' }) -> '/users/42'
 * * @param {string} path - The pattern path containing colon-prefixed params (e.g. :id).
 * @param {object} params - Key-value pairs to inject into the path.
 * @returns {string} The constructed URL.
 */
export const generatePath = (path, params = {}) => {
	let finalPath = path;
	for (const key in params) {
		if (Object.hasOwn(params, key)) {
			finalPath = finalPath.replace(`:${key}`, params[key]);
		}
	}
	return finalPath;
};
