import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Onboard from './Onboard';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useNavigate } from 'react-router-dom';
import { registerUser, loginUser, saveCollectionData, saveFile, getDownloadLinkForFile, getAuthUserByEmail } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';

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

// Mock uuid to prevent random ID generation issues
jest.mock('uuid', () => ({
	v4: () => 'mock-uuid',
}));

// Mock Firebase functions
jest.mock('../../config/data/firebase', () => ({
	registerUser: jest.fn(),
	loginUser: jest.fn(),
	saveCollectionData: jest.fn(),
	saveFile: jest.fn(),
	getDownloadLinkForFile: jest.fn(),
	getAuthUserByEmail: jest.fn(),
}));

// NOTE: We are NOT mocking '../../config/navigation/paths' or '../../config/navigation/routeUtils'.
// Using the real versions ensures paths.redirect is defined and generatePath works correctly.

jest.mock('../../config/data/collections', () => ({
	...jest.requireActual('../../config/data/collections'),
	UploadType: { memberAvatar: 'avatars' },
	collections: { members: 'members' },
}));

// Mock VisuallyHiddenInput
jest.mock('../../components/visuallyHiddenInput/VisuallyHiddenInput', () => ({
	__esModule: true,
	VisuallyHiddenInput: (props) => {
		const React = require('react');
		return React.createElement('input', {
			type: 'file',
			'data-testid': 'file-input',
			name: props.name,
			onChange: props.onChange,
		});
	},
}));

jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loading...</div>);
jest.mock('../../components/footer/CopyrightFooter', () => () => <div>Copyright</div>);

// Mock Admin Config
jest.mock('../../config/admin/forms', () => ({
	memberRegistrationContent: {
		title: 'Mock Onboard',
		icon: 'Icon',
		fields: [
			{ name: 'firstName', label: 'First Name', component: 'TextField' },
			{ name: 'lastName', label: 'Last Name', component: 'TextField' },
			{ name: 'position', label: 'Position', component: 'TextField' },
			{ name: 'since', label: 'Since', component: 'TextField' },
			{ name: 'email', label: 'Email', component: 'TextField' },
			{ name: 'cell', label: 'Cell', component: 'TextField' },
			{ name: 'password', label: 'Password', component: 'TextField', type: 'password' },
			{ name: 'confirmPassword', label: 'Confirm Password', component: 'TextField', type: 'password' },
			{ name: 'picture', component: 'ProfilePictureUpload' },
		],
		buttons: [{ id: 'submit', label: 'Submit', type: 'submit', variant: 'contained' }],
		links: [],
	},
}));

describe('Onboard Component', () => {
	const mockNavigate = jest.fn();
	const mockShowAlert = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useNavigate.mockReturnValue(mockNavigate);
		useAuth.mockReturnValue({ loading: false });
		useAlert.mockReturnValue({ showAlert: mockShowAlert });

		// Default Async Success
		saveFile.mockResolvedValue('file-ref');
		getDownloadLinkForFile.mockResolvedValue('http://download.link');
		saveCollectionData.mockResolvedValue(true);
	});

	test('renders loader when auth loading', () => {
		useAuth.mockReturnValue({ loading: true });
		render(<Onboard />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('renders form fields including upload button', () => {
		render(<Onboard />);
		expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Position/i)).toBeInTheDocument();
		expect(screen.getByText(/Upload Profile Picture/i)).toBeInTheDocument();
	});

	test('alerts if passwords do not match', async () => {
		render(<Onboard />);

		fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: '123' } });
		fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: '456' } });

		fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: 'Passwords do not match!' }));
		});
	});

	test('alerts if required fields are empty', async () => {
		render(<Onboard />);

		fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: '123' } });
		fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: '123' } });

		fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: 'Please fill out all required fields.' }));
		});
	});

	test('handles image upload', async () => {
		render(<Onboard />);

		const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });
		const input = screen.getByTestId('file-input');

		fireEvent.change(input, { target: { files: [file] } });

		await waitFor(() => {
			expect(saveFile).toHaveBeenCalled();
			expect(getDownloadLinkForFile).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: 'Profile picture uploaded!' }));
		});
	});

	test('creates new user if not exists and saves member data', async () => {
		// Setup specific mocks
		getAuthUserByEmail.mockResolvedValue(null); // User does NOT exist
		registerUser.mockResolvedValue({ user: { uid: 'new-uid' } });

		render(<Onboard />);

		// Fill ALL fields
		fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
		fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
		fireEvent.change(screen.getByLabelText(/Position/i), { target: { value: 'Chair' } });
		fireEvent.change(screen.getByLabelText(/Since/i), { target: { value: '2020' } });
		fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'jane@example.com' } });
		fireEvent.change(screen.getByLabelText(/Cell/i), { target: { value: '555-0123' } });
		fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password' } });
		fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password' } });

		fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

		await waitFor(() => {
			// Verify Success Alert
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));

			// Verify Firebase Calls
			expect(registerUser).toHaveBeenCalledWith('jane@example.com', 'password');
			expect(saveCollectionData).toHaveBeenCalledWith(collections.members, 'new-uid', expect.anything());

			// Verify Navigation
			expect(mockNavigate).toHaveBeenCalledWith('/redirect');
		});
	});

	test('logs in existing user and saves member data', async () => {
		// Setup specific mocks
		getAuthUserByEmail.mockResolvedValue({ uid: 'existing-uid' }); // User DOES exist
		loginUser.mockResolvedValue({ user: { uid: 'existing-uid' } });

		render(<Onboard />);

		fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Jane' } });
		fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
		fireEvent.change(screen.getByLabelText(/Position/i), { target: { value: 'Chair' } });
		fireEvent.change(screen.getByLabelText(/Since/i), { target: { value: '2020' } });
		fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'jane@example.com' } });
		fireEvent.change(screen.getByLabelText(/Cell/i), { target: { value: '555-0123' } });
		fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password' } });
		fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password' } });

		fireEvent.click(screen.getByRole('button', { name: /Submit/i }));

		await waitFor(() => {
			expect(loginUser).toHaveBeenCalledWith('jane@example.com', 'password');
			expect(saveCollectionData).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
			expect(mockNavigate).toHaveBeenCalledWith('/redirect');
		});
	});
});
