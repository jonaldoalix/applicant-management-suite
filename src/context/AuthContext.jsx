/**
 * AUTHENTICATION CONTEXT & STATE MANAGER
 * ---------------------------------------------------------------------------
 * This file acts as the "Identity Hub" for the application.
 *
 * * RESPONSIBILITIES:
 * 1. Wraps the Firebase Auth SDK to track the current logged-in user.
 * 2. Fetches "Profile" data (Member vs. Applicant) from Firestore in real-time.
 * 3. Determines the user's "Role" (Admin/Member or Applicant) based on which profiles exist.
 *
 * * ARCHITECTURE:
 * - AuthProvider: The global wrapper. Listens to 'onAuthStateChanged'.
 * - useAuth: The hook exposed to components to access { user, role, member, applicant }.
 */

import React, { createContext, useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import PropTypes from 'prop-types';
import { onAuthStateChanged } from 'firebase/auth';

// Backend & Config
import { auth, getRealTimeDocument, logoutUser } from '../config/data/firebase';
import { UserType, collections } from '../config/data/collections';

// Components
import Loader from '../components/loader/Loader';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
	// --- State ---
	const [user, setUser] = useState(null); // The raw Firebase Auth User object
	const [member, setMember] = useState(null); // Admin profile data (if applicable)
	const [applicant, setApplicant] = useState(null); // Applicant profile data (if applicable)
	const [loading, setLoading] = useState(true); // Global auth loading flag

	// --- References (Listeners) ---
	// We store unsubscribe functions in refs so we can detach them on logout
	const applicantUnsubscribeRef = useRef(null);
	const memberUnsubscribeRef = useRef(null);

	// --- Actions ---

	/**
	 * Resets all user state and detaches active Firestore listeners.
	 * Called on logout or when the auth token refreshes.
	 */
	const clearUserData = useCallback(() => {
		if (applicantUnsubscribeRef.current) {
			applicantUnsubscribeRef.current();
			applicantUnsubscribeRef.current = null;
		}
		if (memberUnsubscribeRef.current) {
			memberUnsubscribeRef.current();
			memberUnsubscribeRef.current = null;
		}
		setUser(null);
		setMember(null);
		setApplicant(null);
	}, []);

	/**
	 * Signs the user out of Firebase and clears local state.
	 */
	const logout = useCallback(() => {
		logoutUser();
		clearUserData();
	}, [clearUserData]);

	// --- Effects ---

	/**
	 * Main Auth Listener.
	 * Fires whenever Firebase detects a login/logout event.
	 */
	useEffect(() => {
		const authStateSubscription = onAuthStateChanged(auth, (currentUser) => {
			setLoading(true);

			// Always clear old listeners before setting up new ones
			clearUserData();

			if (currentUser) {
				setUser(currentUser);

				// Fetch Profiles in Real-Time
				// This allows the UI to update instantly if an admin changes permissions
				applicantUnsubscribeRef.current = getRealTimeDocument(collections.applicants, currentUser.uid, setApplicant);
				memberUnsubscribeRef.current = getRealTimeDocument(collections.members, currentUser.uid, setMember);
			}

			setLoading(false);
		});

		return () => {
			if (authStateSubscription) authStateSubscription();
			clearUserData();
		};
	}, [clearUserData]);

	// --- Derived State ---

	/**
	 * Determines the user's role based on which profile documents exist.
	 * - 'Member': Has a document in 'members' collection.
	 * - 'Applicant': Has a document in 'applicants' collection.
	 * - 'Both': Has both (rare, useful for admins testing the applicant view).
	 */
	const role = useMemo(() => {
		if (applicant && member) return UserType.both;
		if (applicant) return UserType.applicant;
		if (member) return UserType.member;
		return null; // Authenticated but no profile yet (e.g. registration incomplete)
	}, [applicant, member]);

	const values = useMemo(
		() => ({
			user,
			member,
			applicant,
			role,
			loading,
			logout,
		}),
		[user, member, applicant, role, loading, logout]
	);

	// Block rendering until initial auth check is complete
	if (loading) {
		return <Loader />;
	}

	return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

/**
 * Hook to access Auth Context.
 * Usage: const { user, role, logout } = useAuth();
 */
export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};