import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ComposeEmailDialog from './ComposeEmailDialog';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useAlert } from '../../context/AlertContext';
import { useMailbox } from '../../context/MailboxContext';
import { sendZohoEmail } from '../../config/data/firebase';
import { useComposeEmailOptions } from '../../hooks/useComposeEmailOptions';

// Mock dependencies
jest.mock('../../context/AuthContext');
jest.mock('../../context/ConfigContext');
jest.mock('../../context/AlertContext');
jest.mock('../../context/MailboxContext');
jest.mock('../../config/data/firebase');
jest.mock('../../hooks/useComposeEmailOptions');

describe('ComposeEmailDialog', () => {
	const mockOnSuccess = jest.fn();
	const mockOnClose = jest.fn();
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockRefreshMailbox = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useAuth.mockReturnValue({ member: { email: 'member@test.com' } });
		useConfig.mockReturnValue({});
		useAlert.mockReturnValue({
			showAlert: mockShowAlert,
			handleError: mockHandleError,
		});
		useMailbox.mockReturnValue({ refreshMailbox: mockRefreshMailbox });

		// Mock the hook that provides the "From" options
		useComposeEmailOptions.mockReturnValue({
			fromOptions: [{ label: 'Member (member@test.com)', value: 'member@test.com' }],
			signatureOptions: [
				{ label: 'None', value: 'none' },
				{ label: 'My Sig', value: '<div>My Signature</div>' },
			],
			defaultFrom: 'member@test.com',
		});

		sendZohoEmail.mockResolvedValue({ data: { message: 'Email sent!' } });
	});

	it('renders with default title and values', () => {
		render(<ComposeEmailDialog onSuccess={mockOnSuccess} onClose={mockOnClose} />);

		// Verify Title
		expect(screen.getByText('Compose New Email')).toBeInTheDocument();

		// Verify "From" field is populated (MUI Select renders the value in a button/div)
		// We look for the text content of the selected option
		expect(screen.getByText('Member (member@test.com)')).toBeInTheDocument();
	});

	it('renders with pre-filled props for a reply', () => {
		render(<ComposeEmailDialog onSuccess={mockOnSuccess} onClose={mockOnClose} title='Re: Test' to='sender@example.com' subject='Re: Test' htmlPreview='<div>original</div>' />);

		expect(screen.getByText('Re: Test')).toBeInTheDocument();

		// MUI TextFields store value in the input element
		expect(screen.getByLabelText(/To/i)).toHaveValue('sender@example.com');
		expect(screen.getByLabelText(/Subject/i)).toHaveValue('Re: Test');

		// Verify the preview exists
		expect(screen.getByText('original')).toBeInTheDocument();
	});

	it('shows Cc and Bcc fields when buttons are clicked', async () => {
		render(<ComposeEmailDialog onSuccess={mockOnSuccess} onClose={mockOnClose} />);

		// Initially fields should not exist
		expect(screen.queryByLabelText(/^Cc /i)).not.toBeInTheDocument();
		expect(screen.queryByLabelText(/^Bcc /i)).not.toBeInTheDocument();

		// Click Cc button
		fireEvent.click(screen.getByRole('button', { name: /Add Cc/i }));
		// Wait for field to appear (handles async render state)
		expect(await screen.findByLabelText(/^Cc /i)).toBeInTheDocument();

		// Click Bcc button
		fireEvent.click(screen.getByRole('button', { name: /Add Bcc/i }));
		expect(await screen.findByLabelText(/^Bcc /i)).toBeInTheDocument();
	});

	it('sends email with correct parsed data and signature', async () => {
		render(<ComposeEmailDialog onSuccess={mockOnSuccess} onClose={mockOnClose} />);

		// 1. Fill Form Data using fireEvent.change
		fireEvent.change(screen.getByLabelText(/To/i), { target: { value: 'test1@example.com, test2@example.com' } });
		fireEvent.change(screen.getByLabelText(/Subject/i), { target: { value: 'My Subject' } });
		fireEvent.change(screen.getByLabelText(/Your Message/i), { target: { value: 'My Body' } });

		// 2. Handle MUI Select (Include Signature)
		// MUI Select is complex: You click the "button" (combobox) to open the menu
		const signatureSelect = screen.getByLabelText('Include Signature');
		fireEvent.mouseDown(signatureSelect); // mouseDown is often cleaner for MUI Select triggers

		// Find and click the option in the dropdown
		const signatureOption = await screen.findByRole('option', { name: 'My Sig' });
		fireEvent.click(signatureOption);

		// 3. Submit Form
		const sendBtn = screen.getByRole('button', { name: 'Send Email' });
		fireEvent.click(sendBtn);

		// 4. Assertions
		// Wait for the API call
		await waitFor(() => {
			expect(sendZohoEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					fromAddress: 'member@test.com',
					to: ['test1@example.com', 'test2@example.com'],
					subject: 'My Subject',
					// Verify signature was appended
					body: 'My Body<br><br><div>My Signature</div>',
				})
			);
		});

		// Wait for the Success Alert
		await waitFor(() => {
			expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Email sent!', type: 'success' });
		});

		expect(mockOnSuccess).toHaveBeenCalled();
		expect(mockRefreshMailbox).toHaveBeenCalled();

		// 5. CRITICAL FIX for "act" warnings:
		// The component has a `finally { setLoading(false) }` block.
		// We MUST wait for the loading state to finish (button re-enabled) before letting the test exit.
		await waitFor(() => {
			const btn = screen.getByRole('button', { name: 'Send Email' });
			expect(btn).not.toBeDisabled();
		});
	});
});
