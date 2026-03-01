import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import App from './App';
import { logEvent } from './config/data/firebase';

// --- MOCKS ---

// 1. Mock Firebase
jest.mock('./config/data/firebase', () => {
	const mockLogEventFn = jest.fn();
	// Ensure it always returns a Promise to prevent .catch errors
	mockLogEventFn.mockReturnValue(Promise.resolve());

	return {
		__esModule: true,
		logEvent: mockLogEventFn,
		db: {},
	};
});

// 2. Mock Providers
jest.mock('./context/Providers', () => ({
	Providers: ({ children }) => <div>{children}</div>,
}));

// 3. Mock Config Context
let mockConfigValues = {
	ROUTE_LOGGING_ENABLED: true,
	MEMBER_ONBOARDING_PAGE_ENABLED: true,
};

jest.mock('./context/ConfigContext', () => ({
	useConfig: () => mockConfigValues,
}));

// 4. Mock Site Manifest
jest.mock('./config/navigation/siteManifest', () => {
	const React = require('react');
	// We need Outlet so the Child route actually renders inside the Parent
	const { Outlet } = require('react-router-dom');

	return {
		siteManifest: [
			{
				path: '/home',
				element: React.createElement('div', null, 'Home Page'),
			},
			{
				path: '/parent',
				// CRITICAL FIX: We append <Outlet /> to the parent's children.
				// This allows the nested 'Child Page' to appear.
				element: React.createElement('div', null, 'Parent Page', React.createElement(Outlet)),
				children: [
					{
						path: 'child',
						element: React.createElement('div', null, 'Child Page'),
					},
				],
			},
			{
				urlKey: 'REGISTER_MEMBER',
				path: '/register',
				element: React.createElement('div', null, 'Registration Page'),
			},
		],
	};
});

// 5. Mock Constants
jest.mock('./config/Constants', () => ({
	Pages: {
		registerMember: 'REGISTER_MEMBER',
	},
}));

// 6. Mock Content
jest.mock('./config/content/content.js', () => ({
	homePageContent: { intro: { backgroundImages: { light: '', dark: '' } } },
	applicantRegistrationContent: { icon: null, fields: [], buttons: [], links: [] },
	loginContent: { icon: null, fields: [], buttons: [], links: [] },
	applyContent: { subtitle: [], availableApps: [] },
}));

describe('App Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		logEvent.mockReturnValue(Promise.resolve());
		mockConfigValues = {
			ROUTE_LOGGING_ENABLED: true,
			MEMBER_ONBOARDING_PAGE_ENABLED: true,
		};
	});

	test('renders standard routes correctly', () => {
		render(
			<MemoryRouter initialEntries={['/home']}>
				<App />
			</MemoryRouter>
		);
		expect(screen.getByText('Home Page')).toBeInTheDocument();
	});

	test('renders nested child routes (recursive logic)', () => {
		render(
			<MemoryRouter initialEntries={['/parent/child']}>
				<App />
			</MemoryRouter>
		);
		// Now that Parent includes <Outlet />, this should be visible
		expect(screen.getByText('Child Page')).toBeInTheDocument();
	});

	test('logs route changes when ROUTE_LOGGING_ENABLED is true', async () => {
		mockConfigValues.ROUTE_LOGGING_ENABLED = true;

		render(
			<MemoryRouter initialEntries={['/home', '/parent']}>
				<App />
			</MemoryRouter>
		);

		await waitFor(() => {
			expect(logEvent).toHaveBeenCalled();
		});
	});

	test('does NOT log route changes when ROUTE_LOGGING_ENABLED is false', async () => {
		mockConfigValues.ROUTE_LOGGING_ENABLED = false;

		render(
			<MemoryRouter initialEntries={['/home']}>
				<App />
			</MemoryRouter>
		);

		await new Promise((r) => setTimeout(r, 100));
		expect(logEvent).not.toHaveBeenCalled();
	});

	test('shows onboarding route when MEMBER_ONBOARDING_PAGE_ENABLED is true', () => {
		mockConfigValues.MEMBER_ONBOARDING_PAGE_ENABLED = true;

		render(
			<MemoryRouter initialEntries={['/register']}>
				<App />
			</MemoryRouter>
		);
		expect(screen.getByText('Registration Page')).toBeInTheDocument();
	});

	test('hides onboarding route when MEMBER_ONBOARDING_PAGE_ENABLED is false', () => {
		mockConfigValues.MEMBER_ONBOARDING_PAGE_ENABLED = false;

		render(
			<MemoryRouter initialEntries={['/register']}>
				<App />
			</MemoryRouter>
		);

		expect(screen.queryByText('Registration Page')).not.toBeInTheDocument();
	});
});
