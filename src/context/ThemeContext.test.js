import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import { useAuth } from './AuthContext';
import { updateUserPreferences } from '../config/data/firebase';

// Mock Auth and Firebase
jest.mock('./AuthContext', () => ({
	useAuth: jest.fn(),
}));

jest.mock('../config/data/firebase', () => ({
	updateUserPreferences: jest.fn(),
}));

jest.mock('../config/data/collections', () => ({
	collections: { members: 'members', applicants: 'applicants' },
}));

// Mock MUI Theme Provider to avoid huge style calculation overhead in tests
jest.mock('@mui/material/styles', () => ({
	ThemeProvider: ({ children }) => <div>{children}</div>,
	createTheme: () => ({ palette: { boxShadow: 'mock-shadow' } }),
}));

jest.mock('../config/ui/theme', () => () => ({
	palette: { boxShadow: 'mock-shadow' },
}));

const TestConsumer = () => {
	const { darkMode, dispatch } = useTheme();
	return (
		<div>
			<div data-testid='theme-mode'>{darkMode ? 'DARK' : 'LIGHT'}</div>
			<button onClick={() => dispatch({ type: 'TOGGLE' })}>Toggle</button>
		</div>
	);
};

describe('ThemeContext', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
		// Mock matchMedia
		window.matchMedia = jest.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: jest.fn(), // Deprecated
			removeListener: jest.fn(), // Deprecated
			addEventListener: jest.fn(),
			removeEventListener: jest.fn(),
			dispatchEvent: jest.fn(),
		}));
	});

	test('loads state from localStorage if available', () => {
		localStorage.setItem('pf_theme_prefs', JSON.stringify({ darkMode: true, primaryColor: 'blue' }));
		useAuth.mockReturnValue({ member: null });

		render(
			<ThemeProvider>
				<TestConsumer />
			</ThemeProvider>
		);

		expect(screen.getByTestId('theme-mode')).toHaveTextContent('DARK');
	});

	test('toggles theme and updates database for logged in member', () => {
		useAuth.mockReturnValue({
			user: { uid: '123' },
			member: { preferences: {} },
		});

		render(
			<ThemeProvider>
				<TestConsumer />
			</ThemeProvider>
		);

		// Initial default is light (false)
		expect(screen.getByTestId('theme-mode')).toHaveTextContent('LIGHT');

		// Toggle
		fireEvent.click(screen.getByText('Toggle'));

		expect(screen.getByTestId('theme-mode')).toHaveTextContent('DARK');

		// Verify DB update
		expect(updateUserPreferences).toHaveBeenCalledWith('123', 'members', expect.objectContaining({ darkMode: true }));
	});
});
