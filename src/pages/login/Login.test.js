import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Login from './Login';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { loginUser, getUserProfiles, logoutUser } from '../../config/data/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { generatePath } from '../../config/navigation/routeUtils';

// --- Mocks ---

jest.mock('react-router-dom', () => ({
	useNavigate: jest.fn(),
	useLocation: jest.fn(),
}));

jest.mock('../../config/data/firebase', () => ({
	auth: {},
	loginUser: jest.fn(),
	getUserProfiles: jest.fn(),
	logoutUser: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
	sendPasswordResetEmail: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

jest.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

jest.mock('../../config/navigation/routeUtils', () => ({
	generatePath: jest.fn((path) => path || '/default-path'),
}));

jest.mock('../../config/navigation/paths', () => ({
	paths: { redirect: '/redirect', home: '/home' },
}));

// Mock the content config to ensure stable DOM elements
jest.mock('../../config/content/content', () => ({
	loginContent: {
		title: 'Test Login',
		icon: 'T',
		fields: [
			{ component: 'TextField', name: 'email', label: 'Email Address', type: 'email' },
			{ component: 'TextField', name: 'password', label: 'Password', type: 'password' },
		],
		buttons: [{ id: 'btn-submit', label: 'Sign In', type: 'submit', variant: 'contained' }],
		links: [
			{ id: 'link-reset', label: 'Forgot Password?', action: 'handlePasswordReset' },
			{ id: 'link-register', label: 'Register', navigationPath: '/register' },
		],
	},
}));

jest.mock('../../components/footer/CopyrightFooter', () => () => <div data-testid='copyright'>Copyright</div>);
jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loading...</div>);

describe('Login Component', () => {
	const mockNavigate = jest.fn();
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useNavigate.mockReturnValue(mockNavigate);
		useLocation.mockReturnValue({ state: null });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useAuth.mockReturnValue({ loading: false });
		useTheme.mockReturnValue({ boxShadow: 'none' });
		useTitle.mockImplementation(() => {});

		// Default Config
		useConfig.mockReturnValue({
			DOWN_FOR_MAINTENANCE: false,
			MEMBER_ACCESS: true,
			APPLICANT_ACCESS: true,
		});

		// Default route generation
		generatePath.mockImplementation((path) => path);
	});

	test('renders login form correctly', () => {
		render(<Login />);

		expect(screen.getByText('Test Login')).toBeInTheDocument();
		expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
		expect(screen.getByText('Forgot Password?')).toBeInTheDocument();
	});

	test('blocks login if site is down for maintenance', async () => {
		useConfig.mockReturnValue({ DOWN_FOR_MAINTENANCE: true, MAINTENANCE_MESSAGE: 'Site Down' });
		render(<Login />);

		fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

		expect(loginUser).not.toHaveBeenCalled();
		expect(mockShowAlert).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Site Down',
				type: 'info',
			})
		);
	});

	test('handles successful applicant login', async () => {
		const mockUser = { uid: 'user-123' };
		loginUser.mockResolvedValue({ user: mockUser });
		getUserProfiles.mockResolvedValue({ applicant: true, member: false });

		render(<Login />);

		fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'test@test.com' } });
		fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
		fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
		// Should navigate to redirect path (from routeUtils mock or location)
		expect(mockNavigate).toHaveBeenCalled();
	});

	test('handles successful member login', async () => {
		const mockUser = { uid: 'mem-123' };
		loginUser.mockResolvedValue({ user: mockUser });
		getUserProfiles.mockResolvedValue({ applicant: false, member: true });

		render(<Login />);

		fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'mem@test.com' } });
		fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
		fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});

	test('denies access if MEMBER_ACCESS is disabled for a member', async () => {
		useConfig.mockReturnValue({ MEMBER_ACCESS: false, APPLICANT_ACCESS: true, DOWN_FOR_MAINTENANCE: false });

		loginUser.mockResolvedValue({ user: { uid: 'mem-1' } });
		getUserProfiles.mockResolvedValue({ member: true }); // Is Member

		render(<Login />);

		fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'mem@test.com' } });
		fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password' } });
		fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining('Access for members is currently disabled'),
					type: 'error',
				})
			);
		});
		expect(logoutUser).toHaveBeenCalled();
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	test('denies access if APPLICANT_ACCESS is disabled for an applicant', async () => {
		useConfig.mockReturnValue({ MEMBER_ACCESS: true, APPLICANT_ACCESS: false, DOWN_FOR_MAINTENANCE: false });

		loginUser.mockResolvedValue({ user: { uid: 'app-1' } });
		getUserProfiles.mockResolvedValue({ applicant: true, member: false });

		render(<Login />);

		fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'app@test.com' } });
		fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password' } });
		fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringContaining('Access for applicants is currently disabled'),
					type: 'error',
				})
			);
		});
		expect(logoutUser).toHaveBeenCalled();
	});

	test('handles login errors (invalid credentials)', async () => {
		const error = { code: 'auth/invalid-credential' };
		loginUser.mockRejectedValue(error);

		render(<Login />);

		fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'bad@test.com' } });
		fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrong' } });
		fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Invalid credentials. Please try again.',
					type: 'error',
				})
			);
		});
	});

	test('initiates password reset flow', async () => {
		// Mock window.prompt
		const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('reset@test.com');
		sendPasswordResetEmail.mockResolvedValue();

		render(<Login />);

		fireEvent.click(screen.getByText('Forgot Password?'));

		expect(promptSpy).toHaveBeenCalled();
		expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'reset@test.com');

		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Password reset email sent. Check your inbox.',
					type: 'success',
				})
			);
		});

		promptSpy.mockRestore();
	});

	test('handles password reset errors', async () => {
		const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('bad-email');
		sendPasswordResetEmail.mockRejectedValue({ code: 'auth/invalid-email' });

		render(<Login />);

		fireEvent.click(screen.getByText('Forgot Password?'));

		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Invalid email address format.',
					type: 'error',
				})
			);
		});

		promptSpy.mockRestore();
	});

	test('redirects to "from" location if present in state', async () => {
		useLocation.mockReturnValue({ state: { from: { pathname: '/protected' } } });
		loginUser.mockResolvedValue({ user: { uid: 'u1' } });
		getUserProfiles.mockResolvedValue({ applicant: true });

		render(<Login />);

		fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith('/protected', { replace: true });
		});
	});

	test('navigates to registration page when register link clicked', () => {
		render(<Login />);
		fireEvent.click(screen.getByText('Register'));
		expect(mockNavigate).toHaveBeenCalledWith('/register'); // From mocked generatePath
	});
});
