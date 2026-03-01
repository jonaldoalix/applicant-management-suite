/**
 * THEME CONTEXT & STATE MANAGER
 * ---------------------------------------------------------------------------
 * This context controls the visual theme (Light/Dark Mode & Primary Color).
 *
 * * PERSISTENCE STRATEGY (DUAL-SYNC):
 * 1. LocalStorage: Checked first for immediate rendering (prevents UI flicker).
 * 2. Firestore: Checked second. Persists user preferences across devices.
 * 3. System Prefs: Fallback if no user preference exists.
 *
 * * ARCHITECTURE:
 * - ThemeProvider: Wraps MUI's ThemeProvider.
 * - ThemeReducer: Handles state transitions and LocalStorage writes.
 * - dispatchWithSave: Middleware that also triggers Firestore updates.
 */

import React, { createContext, useReducer, useEffect, useMemo, useContext, useCallback } from 'react';
import PropTypes from 'prop-types';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

// Config & Backend
import muiTheme from '../config/ui/theme';
import { useAuth } from './AuthContext';
import { updateUserPreferences } from '../config/data/firebase';
import { collections } from '../config/data/collections';

// --- 1. Initialization Helper ---
// Reads from LocalStorage or falls back to OS System Preference
const getInitialState = () => {
	const savedPrefs = localStorage.getItem('pf_theme_prefs');
	if (savedPrefs) {
		return JSON.parse(savedPrefs);
	}
	// Fallback: Check if the user's OS is in Dark Mode
	return {
		darkMode: globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false,
		primaryColor: 'green',
	};
};

// --- 2. State Reducer ---
// Handles local state updates and LocalStorage synchronization
const ThemeReducer = (state, action) => {
	const newState = { ...state };
	let hasChanges = false;

	switch (action.type) {
		case 'LIGHT':
			newState.darkMode = false;
			hasChanges = true;
			break;
		case 'DARK':
			newState.darkMode = true;
			hasChanges = true;
			break;
		case 'TOGGLE':
			newState.darkMode = !state.darkMode;
			hasChanges = true;
			break;
		case 'SET_COLOR':
			newState.primaryColor = action.payload;
			hasChanges = true;
			break;
		case 'LOAD_PREFERENCES':
			// Overwrite local state with data fetched from Firestore
			newState.darkMode = action.payload.darkMode ?? state.darkMode;
			newState.primaryColor = action.payload.primaryColor ?? state.primaryColor;
			hasChanges = true;
			break;
		default:
			return state;
	}

	// Persist to LocalStorage immediately
	if (hasChanges) {
		localStorage.setItem('pf_theme_prefs', JSON.stringify(newState));
	}

	return newState;
};

export const ThemeContext = createContext(getInitialState());

export const ThemeProvider = ({ children }) => {
	const [state, dispatch] = useReducer(ThemeReducer, undefined, getInitialState);
	const { member, applicant, user } = useAuth();

	// Identify which collection to update (Member or Applicant)
	const currentUserProfile = member || applicant;
	let currentCollection = null;
	if (member) {
		currentCollection = collections.members;
	} else if (applicant) {
		currentCollection = collections.applicants;
	}

	// --- Effect 1: Sync FROM Database ---
	// If the user logs in and has cloud preferences, load them (overwriting local).
	useEffect(() => {
		if (currentUserProfile?.preferences) {
			dispatch({
				type: 'LOAD_PREFERENCES',
				payload: {
					darkMode: currentUserProfile.preferences.darkMode,
					primaryColor: currentUserProfile.preferences.primaryColor,
				},
			});
		}
	}, [currentUserProfile]);

	// --- Effect 2: Sync FROM System ---
	// If the user has NO preferences saved, follow their OS changes live.
	useEffect(() => {
		if (!globalThis.matchMedia) return;
		const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)');
		const hasLocalSave = localStorage.getItem('pf_theme_prefs');

		const handleChange = (e) => {
			// Only auto-switch if we don't have a saved preference/override
			if (!currentUserProfile?.preferences?.darkMode && !hasLocalSave) {
				dispatch({ type: e.matches ? 'DARK' : 'LIGHT' });
			}
		};

		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}, [currentUserProfile]);

	// --- Action Wrapper: Sync TO Database ---
	// Wraps the reducer dispatch to push changes to Firestore
	const dispatchWithSave = useCallback(
		(action) => {
			// 1. Update Local State (Immediate UI change)
			dispatch(action);

			// 2. Prepare Firestore Update (Background)
			let updates = {};

			// We calculate the *expected* next state here because 'state' inside
			// this callback is the *current* (pre-update) state.
			if (action.type === 'TOGGLE') updates.darkMode = !state.darkMode;
			if (action.type === 'LIGHT') updates.darkMode = false;
			if (action.type === 'DARK') updates.darkMode = true;
			if (action.type === 'SET_COLOR') updates.primaryColor = action.payload;

			if (Object.keys(updates).length > 0 && user && currentCollection) {
				updateUserPreferences(user.uid, currentCollection, updates);
			}
		},
		[currentCollection, state.darkMode, user]
	);

	// Re-generate the MUI Theme object whenever settings change
	const theme = useMemo(() => muiTheme(state.darkMode, state.primaryColor), [state.darkMode, state.primaryColor]);

	const value = useMemo(
		() => ({
			darkMode: state.darkMode,
			primaryColor: state.primaryColor,
			dispatch: dispatchWithSave,
			boxShadow: theme.palette.boxShadow,
		}),
		[state.darkMode, state.primaryColor, theme.palette.boxShadow, dispatchWithSave]
	);

	return (
		<ThemeContext.Provider value={value}>
			<MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
		</ThemeContext.Provider>
	);
};

ThemeProvider.propTypes = {
	children: PropTypes.node,
};

export const useTheme = () => {
	const context = useContext(ThemeContext);
	if (context === undefined) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}
	return context;
};