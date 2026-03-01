import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from './Register';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useNavigate } from 'react-router-dom';
import { registerUser, saveApplicantData } from '../../config/data/firebase';
import { pushNotice } from '../../config/content/push';

// 1. MOCK DEPENDENCIES
jest.mock('react-router-dom', () => ({
	useNavigate: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ boxShadow: 'mock-shadow' }),
}));

jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

jest.mock('../../config/data/firebase', () => ({
	registerUser: jest.fn(),
	saveApplicantData: jest.fn(),
}));

jest.mock('../../config/content/push', () => ({
	pushNotice: jest.fn(),
	ContactTemplate: { welcome: 'welcome-template' },
}));

jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loading...</div>);
jest.mock('../../components/footer/CopyrightFooter', () => () => <div>Copyright</div>);

// 2. MOCK CONTENT CONFIG
jest.mock('../../config/content/content', () => ({
	applicantRegistrationContent: {
		title: 'Mock Sign Up',
		icon: 'Icon',
		fields: [
			{ name: 'firstName', label: 'First Name', component: 'TextField', required: true },
			{ name: 'lastName', label: 'Last Name', component: 'TextField', required: true },
			{ name: 'callMe', label: 'Nickname', component: 'TextField', required: true },
			{ name: 'email', label: 'Email', component: 'TextField', required: true },
			{ name: 'password', label: 'Password', component: 'TextField', type: 'password' },
			{ name: 'confirmPassword', label: 'Confirm Password', component: 'TextField', type: 'password' },
		],
		buttons: [{ id: 'submit', label: 'Sign Up', type: 'submit', variant: 'contained' }],
		links: [{ id: 'login', label: 'Login', navigationPath: '/login' }],
	},
}));

describe('Register Component', () => {
	const mockNavigate = jest.fn();
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useNavigate.mockReturnValue(mockNavigate);
		useAuth.mockReturnValue({ loading: false });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
	});

	test('renders loader when auth is loading', () => {
		useAuth.mockReturnValue({ loading: true });
		render(<Register />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('renders form fields based on config', () => {
		render(<Register />);
		expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument();
	});

	test('shows alert if passwords do not match', async () => {
		render(<Register />);

		fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: '123456' } });
		fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: '654321' } });
		fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

		expect(mockShowAlert).toHaveBeenCalledWith('register', 'notmatching');
		expect(registerUser).not.toHaveBeenCalled();
	});

	test('shows warning if required fields are missing', async () => {
		render(<Register />);

		// Passwords match, but names missing
		fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: '123456' } });
		fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: '123456' } });
		fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

		expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
	});

	test('successfully registers user', async () => {
		registerUser.mockResolvedValue({ user: { uid: 'test-uid' } });
		saveApplicantData.mockResolvedValue(true);

		render(<Register />);

		fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
		fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
		fireEvent.change(screen.getByLabelText(/Nickname/i), { target: { value: 'Johnny' } });
		fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
		fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password123' } });
		fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password123' } });

		fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

		await waitFor(() => {
			expect(registerUser).toHaveBeenCalledWith('john@example.com', 'password123');
		});

		await waitFor(() => {
			expect(saveApplicantData).toHaveBeenCalledWith(
				'test-uid',
				expect.objectContaining({
					firstName: 'John',
					lastName: 'Doe',
					email: 'john@example.com',
				})
			);
		});

		await waitFor(() => {
			expect(pushNotice).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith('register', 'success');
		});
	});

	test('handles registration errors via handleError', async () => {
		const error = new Error('Firebase Error');
		registerUser.mockRejectedValue(error);

		render(<Register />);

		fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
		fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
		fireEvent.change(screen.getByLabelText(/Nickname/i), { target: { value: 'Johnny' } });
		fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: '123' } });
		fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: '123' } });

		fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(error, 'register-handleSubmit', true);
		});
	});
});
