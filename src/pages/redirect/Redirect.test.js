import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Redirect from './Redirect';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useNavigate } from 'react-router-dom';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { UserType } from '../../config/data/collections';

// 1. MOCK DEPENDENCIES
jest.mock('react-router-dom', () => ({
	useNavigate: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

// 2. MOCK CONFIGURATION FILES
// We mock these to ensure our tests don't break if the actual path strings change
jest.mock('../../config/data/collections', () => ({
	UserType: {
		applicant: 'applicant',
		member: 'member',
		both: 'both',
	},
}));

jest.mock('../../config/navigation/paths', () => ({
	paths: {
		apply: '/apply-path',
		memberDash: '/dashboard-path',
		logout: '/logout-path',
	},
}));

jest.mock('../../config/navigation/routeUtils', () => ({
	generatePath: jest.fn((path) => path), // Simple pass-through mock
}));

// 3. MOCK CHILD COMPONENTS
jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loading...</div>);
jest.mock('../../components/footer/CopyrightFooter', () => () => <div data-testid='copyright'>Copyright</div>);

describe('Redirect Component', () => {
	const mockNavigate = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup default mock implementations
		useNavigate.mockReturnValue(mockNavigate);

		useTheme.mockReturnValue({
			boxShadow: 'mock-shadow',
		});

		// Default generatePath just returns the path string passed to it
		generatePath.mockImplementation((path) => path);
	});

	test('renders loader when loading is true', () => {
		useAuth.mockReturnValue({
			loading: true,
			role: null,
		});

		render(<Redirect />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	test('redirects "applicant" role automatically', () => {
		useAuth.mockReturnValue({
			loading: false,
			role: UserType.applicant,
		});

		render(<Redirect />);

		// Should call navigate with the apply path and replace: true
		expect(mockNavigate).toHaveBeenCalledWith(paths.apply, { replace: true });
	});

	test('redirects "member" role automatically', () => {
		useAuth.mockReturnValue({
			loading: false,
			role: UserType.member,
		});

		render(<Redirect />);

		expect(mockNavigate).toHaveBeenCalledWith(paths.memberDash, { replace: true });
	});

	test('renders selection UI for "both" role', () => {
		useAuth.mockReturnValue({
			loading: false,
			role: UserType.both,
		});

		render(<Redirect />);

		// Should NOT navigate immediately
		expect(mockNavigate).not.toHaveBeenCalled();

		// Should render the selection interface
		expect(screen.getByText('Which account?')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Applicant/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Member/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
	});

	test('redirects to applicant path when Applicant button is clicked (Role: both)', async () => {
		useAuth.mockReturnValue({
			loading: false,
			role: UserType.both,
		});

		render(<Redirect />);

		// Click Applicant
		fireEvent.click(screen.getByRole('button', { name: /Applicant/i }));

		// State update triggers the useEffect, which triggers navigate
		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith(paths.apply, { replace: true });
		});
	});

	test('redirects to member path when Member button is clicked (Role: both)', async () => {
		useAuth.mockReturnValue({
			loading: false,
			role: UserType.both,
		});

		render(<Redirect />);

		// Click Member
		fireEvent.click(screen.getByRole('button', { name: /Member/i }));

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith(paths.memberDash, { replace: true });
		});
	});

	test('navigates to logout when Logout button is clicked (Role: both)', () => {
		useAuth.mockReturnValue({
			loading: false,
			role: UserType.both,
		});

		render(<Redirect />);

		// Click Logout
		fireEvent.click(screen.getByRole('button', { name: /Logout/i }));

		// Logout navigation does not typically use { replace: true } in this component
		expect(mockNavigate).toHaveBeenCalledWith(paths.logout);
	});

	test('updates document title on mount', () => {
		useAuth.mockReturnValue({ loading: true, role: null });
		render(<Redirect />);
		expect(useTitle).toHaveBeenCalledWith({ title: 'Redirecting...', appear: false });
	});
});
