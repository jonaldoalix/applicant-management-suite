// src/context/AuthContext.test.js
import React from 'react';
// FIX: Import 'act' from 'react' to fix the ReactDOMTestUtils warning
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { onAuthStateChanged } from 'firebase/auth';
import { getRealTimeDocument, logoutUser } from '../config/data/firebase';
import { UserType } from '../config/data/collections';

// --- MOCKS ---
jest.mock('../config/data/firebase', () => ({
	auth: {},
	getRealTimeDocument: jest.fn(),
	logoutUser: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
	onAuthStateChanged: jest.fn(),
}));

jest.mock('../components/loader/Loader', () => () => <div data-testid='auth-loader'>Auth Loading...</div>);

// Constants needed for user role test
jest.mock('../config/data/collections', () => ({
	UserType: { applicant: 'applicant', member: 'member', both: 'both' },
	collections: { applicants: 'applicants', members: 'members' },
}));

const TestConsumer = () => {
	const { user, role, logout } = useAuth();
	return (
		<div>
			<span data-testid='user-email'>{user ? user.email : 'No User'}</span>
			<span data-testid='user-role'>{role || 'No Role'}</span>
			<button onClick={logout}>Logout</button>
		</div>
	);
};

// FIX: This variable will hold the callback from onAuthStateChanged
let mockAuthStateCallback;

describe('AuthContext', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		// FIX: Make the mock save the callback instead of firing it immediately.
		// This simulates the async nature of auth.
		onAuthStateChanged.mockImplementation((auth, callback) => {
			mockAuthStateCallback = callback; // Save the callback
			return jest.fn(); // Return an unsubscribe function
		});

		// FIX: Set a default "happy path" implementation for getRealTimeDocument
		getRealTimeDocument.mockImplementation((collection, uid, callback) => {
			if (collection === 'applicants') callback(null);
			if (collection === 'members') callback(null);
			return jest.fn(); // unsubscribe
		});
	});

	test('displays loader initially', () => {
		// onAuthStateChanged mock doesn't fire immediately, so loading stays true
		render(
			<AuthProvider>
				<div>Content</div>
			</AuthProvider>
		);
		expect(screen.getByTestId('auth-loader')).toBeInTheDocument();
	});

	test('handles unauthenticated state', async () => {
		render(
			<AuthProvider>
				<TestConsumer />
			</AuthProvider>
		);

		// FIX: Manually trigger the auth state change inside act()
		await act(async () => {
			mockAuthStateCallback(null); // No user
		});

		// No need to waitFor the loader, act() already did.
		expect(screen.getByTestId('user-email')).toHaveTextContent('No User');
		expect(screen.queryByTestId('auth-loader')).not.toBeInTheDocument();
	});

	test('handles authenticated user with Applicant role', async () => {
		const mockUser = { uid: '123', email: 'test@test.com' };

		// Mock getRealTimeDocument for this specific test
		getRealTimeDocument.mockImplementation((collection, uid, callback) => {
			if (collection === 'applicants') callback({ someData: true }); // Found applicant doc
			if (collection === 'members') callback(null); // Not a member
			return jest.fn(); // unsubscribe
		});

		render(
			<AuthProvider>
				<TestConsumer />
			</AuthProvider>
		);

		// FIX: Manually trigger the auth state change inside act()
		await act(async () => {
			mockAuthStateCallback(mockUser);
		});

		expect(screen.getByTestId('user-email')).toHaveTextContent('test@test.com');
		expect(screen.getByTestId('user-role')).toHaveTextContent(UserType.applicant);
	});

	test('handles authenticated user with Member role', async () => {
		const mockUser = { uid: '456', email: 'member@test.com' };

		getRealTimeDocument.mockImplementation((collection, uid, callback) => {
			if (collection === 'applicants') callback(null);
			if (collection === 'members') callback({ someData: true });
			return jest.fn();
		});

		render(
			<AuthProvider>
				<TestConsumer />
			</AuthProvider>
		);

		// FIX: Manually trigger the auth state change inside act()
		await act(async () => {
			mockAuthStateCallback(mockUser);
		});

		expect(screen.getByTestId('user-role')).toHaveTextContent(UserType.member);
	});

	test('logout calls firebase logout and clears state', async () => {
		render(
			<AuthProvider>
				<TestConsumer />
			</AuthProvider>
		);

		// FIX: 1. Wait for the initial login to finish
		await act(async () => {
			mockAuthStateCallback({ uid: '123' }); // logged in initially
		});

		// Ensure we are logged in
		expect(screen.getByTestId('user-email')).not.toHaveTextContent('No User');

		const logoutBtn = screen.getByText('Logout');

		// FIX: 2. Wrap the click event (which causes state updates) in act()
		await act(async () => {
			logoutBtn.click();
		});

		expect(logoutUser).toHaveBeenCalled();
		// The component re-renders with "No User" after logout
		expect(screen.getByTestId('user-email')).toHaveTextContent('No User');
	});
});
