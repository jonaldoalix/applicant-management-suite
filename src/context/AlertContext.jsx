/**
 * ALERT & NOTIFICATION CONTEXT
 * ---------------------------------------------------------------------------
 * This context manages the global "Toast" notification system (Snackbars).
 *
 * * FEATURES:
 * 1. Queue System: Ensures alerts don't overlap; they show one by one.
 * 2. Error Parsing: Translates raw Firebase error codes into user-friendly text.
 * 3. Centralized Logging: Automatically logs errors to Firestore when displayed.
 *
 * * USAGE:
 * const { showAlert, handleError } = useAlert();
 * showAlert({ message: 'Success!', type: 'success' });
 * handleError(errorObj, 'contextName');
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Snackbar, Alert, Slide } from '@mui/material';

// Config & Logging
import { AlertMessages } from '../config/Constants';
import { logEvent } from '../config/data/firebase';

// Map raw Firebase auth codes to human-readable messages
const firebaseErrorMessages = {
	'auth/email-already-in-use': 'This email is already registered. Please log in.',
	'auth/weak-password': 'Your password is too weak. Please use a stronger password.',
	'auth/invalid-email': 'Invalid email address format.',
	'auth/user-disabled': 'This account has been disabled by an administrator.',
	'auth/user-not-found': 'No account found with this email.',
	'auth/wrong-password': 'Incorrect password. Please try again.',
	'auth/network-request-failed': 'Network error. Check your connection and try again.',
	'auth/password-does-not-meet-requirements': 'Your password must contain at least 8 characters, a lower case character, an upper case character, and a non-alphanumeric character.',
	'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
};

const AlertContext = createContext();

export const AlertProvider = ({ children }) => {
	// FIFO Queue for alerts to prevent stacking
	const [alertQueue, setAlertQueue] = useState([]);
	const [currentAlert, setCurrentAlert] = useState(null);

	/**
	 * Helper component to render a static banner (not a toast).
	 * Used inside forms or pages for persistent messages.
	 */
	const showAnnouncement = useCallback(({ message }) => {
		if (!message) return null;
		return (
			<Alert severity='info' sx={{ width: '100%', mt: 1, boxSizing: 'border-box' }}>
				{message}
			</Alert>
		);
	}, []);

	/**
	 * Adds a new alert to the display queue.
	 * @param {object|string} categoryOrCustom - Either a config key (from Constants.js) OR a custom object { message, type }.
	 * @param {string} [type] - If using a config key, this specifies the sub-type (e.g., 'success', 'failed').
	 */
	const showAlert = useCallback(
		(categoryOrCustom, type = null) => {
			let newAlert;

			// Scenario A: Using a pre-defined message from Constants.js
			// usage: showAlert('login', 'success')
			if (typeof categoryOrCustom === 'string' && type) {
				newAlert = AlertMessages[categoryOrCustom]?.[type] || { message: 'Unknown alert', type: 'info' };
			}
			// Scenario B: Passing a custom message object
			// usage: showAlert({ message: 'Hello World', type: 'success' })
			else if (typeof categoryOrCustom === 'object' && categoryOrCustom.message) {
				newAlert = { message: categoryOrCustom.message, type: categoryOrCustom.type || 'info' };
			} else {
				console.error('❌ Invalid alert parameters passed to showAlert.');
				return;
			}

			setAlertQueue((prevQueue) => {
				// Deduplicate: Don't stack the exact same message twice in a row
				const lastAlert = prevQueue.at(-1) || currentAlert;
				if (lastAlert && lastAlert.message === newAlert.message && lastAlert.type === newAlert.type) {
					return prevQueue;
				}
				return [...prevQueue, newAlert];
			});
		},
		[currentAlert]
	);

	// --- Queue Processor ---
	// Watches the queue and moves the next item to 'currentAlert' when ready
	useEffect(() => {
		if (!currentAlert && alertQueue.length > 0) {
			setCurrentAlert(alertQueue[0]);
			setAlertQueue((prevQueue) => prevQueue.slice(1));
		}
	}, [alertQueue, currentAlert]);

	const closeAlert = useCallback(() => {
		setCurrentAlert(null);
	}, []);

	/**
	 * Standardized Error Handler.
	 * Parses the error, displays a user-friendly message, and logs it to Firestore.
	 * @param {Error} error - The caught error object.
	 * @param {string} context - Where this error occurred (e.g. 'login-form').
	 * @param {boolean} [show] - Force show the alert (defaults to true in prod, false in dev to reduce noise).
	 */
	const handleError = useCallback(
		(error, context = 'general', show = null) => {
			// Default: Show alerts in production, but let devs see console in dev
			const shouldShow = show === null ? true : show; // Force true for better UX in both envs usually

			const errorCode = error?.code || '';
			const userFriendlyMessage = firebaseErrorMessages[errorCode] || error?.message || 'An unexpected error occurred.';

			if (shouldShow) {
				showAlert({ message: userFriendlyMessage, type: 'error' });
			}

			// Log the raw error to the backend for debugging
			logEvent(`Error: ${context}`, error);
			if (process.env.NODE_ENV === 'development') {
				console.error(`[${context}]`, error);
			}
		},
		[showAlert]
	);

	const contextValue = useMemo(() => ({ showAnnouncement, showAlert, handleError }), [showAnnouncement, showAlert, handleError]);

	return (
		<AlertContext.Provider value={contextValue}>
			{children}

			{/* Global Snackbar Component */}
			{currentAlert && (
				<Snackbar open={Boolean(currentAlert)} autoHideDuration={5000} onClose={closeAlert} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} TransitionComponent={Slide}>
					<Alert
						onClose={closeAlert}
						severity={currentAlert.type}
						variant='filled'
						sx={{
							fontSize: '1.2rem',
							fontWeight: 'bold',
							padding: '1rem',
							borderRadius: '10px',
							textAlign: 'center',
							boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.3)',
						}}>
						{currentAlert.message}
					</Alert>
				</Snackbar>
			)}
		</AlertContext.Provider>
	);
};

AlertProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

/**
 * Hook to access the Alert Context.
 * Usage: const { showAlert } = useAlert();
 */
export const useAlert = () => useContext(AlertContext);