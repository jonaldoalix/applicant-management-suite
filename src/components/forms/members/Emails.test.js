import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EmailForm } from './Emails';
import { useAuth } from '../../../context/AuthContext';
import { useMailbox } from '../../../context/MailboxContext';
import { useAlert } from '../../../context/AlertContext';
import { useConfig } from '../../../context/ConfigContext';
import { useComposeEmailOptions } from '../../../hooks/useComposeEmailOptions';
import { sendZohoEmail } from '../../../config/data/firebase';

// --- Mocks ---
const mockNavigate = jest.fn();
const mockLocation = { state: {} };

jest.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
	useLocation: () => mockLocation,
}));

jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../context/MailboxContext', () => ({ useMailbox: jest.fn() }));
jest.mock('../../../context/AlertContext', () => ({ useAlert: jest.fn() }));
jest.mock('../../../context/ConfigContext', () => ({ useConfig: jest.fn() }));
jest.mock('../../../hooks/useComposeEmailOptions', () => ({ useComposeEmailOptions: jest.fn() }));

jest.mock('../../../config/data/firebase', () => ({
	sendZohoEmail: jest.fn(),
}));

describe('EmailForm Component', () => {
	const mockAlert = { showAlert: jest.fn(), handleError: jest.fn() };
	const mockRefresh = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useAuth.mockReturnValue({ member: { id: 'mem1' } });
		useMailbox.mockReturnValue({ refreshMailbox: mockRefresh });
		useAlert.mockReturnValue(mockAlert);
		useConfig.mockReturnValue({});
		useComposeEmailOptions.mockReturnValue({
			fromOptions: [{ value: 'test@example.com', label: 'Test <test@example.com>' }],
			signatureOptions: [],
			defaultFrom: 'test@example.com',
			permittedAliases: ['test@example.com'], // Valid loaded state
		});
	});

	test('renders loading state if aliases not permitted', () => {
		useComposeEmailOptions.mockReturnValue({ permittedAliases: [] });
		render(<EmailForm />);
		expect(screen.getByText('Loading email configuration...')).toBeInTheDocument();
	});

	test('renders form fields', () => {
		render(<EmailForm />);
		// Check for input labels/placeholders
		expect(screen.getByLabelText(/From/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Subject/i)).toBeInTheDocument();
		expect(screen.getByPlaceholderText(/Compose your message/i)).toBeInTheDocument();
		expect(screen.getByText('Send')).toBeInTheDocument();
	});

	test('shows validation error if fields missing on send', async () => {
		render(<EmailForm />);

		// Clear subject (default empty) and try sending
		const sendBtn = screen.getByText('Send');
		fireEvent.click(sendBtn);

		expect(mockAlert.showAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
		expect(sendZohoEmail).not.toHaveBeenCalled();
	});

	test('sends email successfully', async () => {
		render(<EmailForm />);

		// Fill subject (To field is autocomplete, tricky to fill in basic unit test without complex interaction,
		// assuming state handling is internal. We can check validations or partials.
		// Actually, 'To' is required by logic: if (!fromAddress || to.length === 0 || !subject)
		// We need to simulate filling 'To'.

		const toInput = screen.getByLabelText('To'); // Autocomplete input
		fireEvent.change(toInput, { target: { value: 'recipient@test.com' } });
		fireEvent.keyDown(toInput, { key: 'Enter' }); // Simulate selecting option

		const subjectInput = screen.getByLabelText('Subject');
		fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });

		const sendBtn = screen.getByText('Send');
		fireEvent.click(sendBtn);

		await waitFor(() => {
			expect(sendZohoEmail).toHaveBeenCalled();
			expect(mockRefresh).toHaveBeenCalled();
			expect(mockNavigate).toHaveBeenCalledWith(-1);
		});
	});
});
