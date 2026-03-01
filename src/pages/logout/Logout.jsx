/**
 * LOGOUT HANDLER
 * ---------------------------------------------------------------------------
 * This is a "Headless Component" (renders null).
 * It is responsible for terminating the user's session and redirecting them.
 *
 * * USAGE:
 * <Route path="/logout" element={<Logout />} />
 *
 * * LOGIC:
 * 1. Calls firebase.signOut() via the AuthContext.
 * 2. Redirects to the Login page.
 * 3. Replaces the history entry so the "Back" button doesn't work.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Context & Config
import { useAuth } from '../../context/AuthContext';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';

const Logout = () => {
	const { logout } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		// 1. Perform the logout action (clears Context state & Firebase Auth)
		logout();

		// 2. Redirect to Login
		// 'replace: true' prevents the user from hitting Back to access protected pages
		navigate(generatePath(paths.login), { replace: true });
	}, [logout, navigate]);

	// Render nothing (or a spinner if logout takes time, though usually instant)
	return null;
};

export default Logout;