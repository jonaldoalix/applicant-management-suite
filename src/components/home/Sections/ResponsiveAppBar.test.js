import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResponsiveAppBar from './ResponsiveAppBar';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { homePageContent } from '../../../config/content/content';

// Mock Dependencies
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mockNavigate,
}));

jest.mock('../../../config/content/content', () => ({
	homePageContent: {
		appBar: {
			organizationName: { long: 'Long Name', short: 'Short' },
			navLinks: [
				{ label: 'About', type: 'scroll', index: 0 },
				{ label: 'Apply', type: 'navigate', path: '/apply' },
			],
			themeToggle: { enabled: true },
			authLink: { enabled: true },
		},
	},
}));

// Mock config files needed for hrefs
jest.mock('../../../config/navigation/routeUtils', () => ({ generatePath: (path) => path }));
jest.mock('../../../config/navigation/paths', () => ({ paths: { home: '/', redirect: '/dash', login: '/login' } }));

describe('ResponsiveAppBar Component', () => {
	const mockAppBarRef = { current: null };
	const mockTabBarRef = { current: { scrollIntoView: jest.fn() } };
	const mockSetParentTab = jest.fn();
	const mockDispatch = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useAuth.mockReturnValue({ user: null }); // Logged out
		useTheme.mockReturnValue({ darkMode: false, dispatch: mockDispatch });
	});

	it('renders desktop nav links', () => {
		render(
			<MemoryRouter>
				<ResponsiveAppBar appBarRef={mockAppBarRef} tabBarRef={mockTabBarRef} setParentTab={mockSetParentTab} />
			</MemoryRouter>
		);
		// 'About' and 'Apply' should be visible in desktop view (which is the default)
		expect(screen.getByRole('button', { name: 'About' })).toBeVisible();
		expect(screen.getByRole('button', { name: 'Apply' })).toBeVisible();
	});

	it('handles scroll-to link click', () => {
		render(
			<MemoryRouter>
				<ResponsiveAppBar appBarRef={mockAppBarRef} tabBarRef={mockTabBarRef} setParentTab={mockSetParentTab} />
			</MemoryRouter>
		);

		fireEvent.click(screen.getByRole('button', { name: 'About' }));

		expect(mockSetParentTab).toHaveBeenCalledWith(0);
		expect(mockTabBarRef.current.scrollIntoView).toHaveBeenCalled();
	});

	it('handles navigation link click', () => {
		render(
			<MemoryRouter>
				<ResponsiveAppBar appBarRef={mockAppBarRef} tabBarRef={mockTabBarRef} setParentTab={mockSetParentTab} />
			</MemoryRouter>
		);

		fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
		expect(mockNavigate).toHaveBeenCalledWith('/apply');
	});

	it('handles theme toggle click', () => {
		render(
			<MemoryRouter>
				<ResponsiveAppBar appBarRef={mockAppBarRef} tabBarRef={mockTabBarRef} setParentTab={mockSetParentTab} />
			</MemoryRouter>
		);

		// --- THIS IS THE FIX ---
		// The test log shows the data-testid is "DarkModeOutlinedIcon"
		fireEvent.click(screen.getByTestId('DarkModeOutlinedIcon'));
		expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE' });
	});

	it('shows login icon when logged out and navigates on click', () => {
		render(
			<MemoryRouter>
				<ResponsiveAppBar appBarRef={mockAppBarRef} tabBarRef={mockTabBarRef} setParentTab={mockSetParentTab} />
			</MemoryRouter>
		);

		fireEvent.click(screen.getByTestId('LockIcon'));
		expect(mockNavigate).toHaveBeenCalledWith('/login');
	});

	it('shows log-out (redirect) icon when logged in and navigates on click', () => {
		useAuth.mockReturnValue({ user: { uid: '123' } }); // Logged in
		render(
			<MemoryRouter>
				<ResponsiveAppBar appBarRef={mockAppBarRef} tabBarRef={mockTabBarRef} setParentTab={mockSetParentTab} />
			</MemoryRouter>
		);

		fireEvent.click(screen.getByTestId('LockOpenIcon'));
		expect(mockNavigate).toHaveBeenCalledWith('/dash');
	});
});
