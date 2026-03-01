import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailViewDialog from './EmailViewDialog';
import { useEmailActions } from '../../hooks/useEmailActions';
import { updateEmailReadStatus, deleteZohoEmail, fetchAttachmentContent } from '../../config/data/firebase';
import { useAlert } from '../../context/AlertContext';
import { useProcessedEmailContent } from '../../hooks/useProcessedEmailContent';

// Mock dependencies
jest.mock('../../hooks/useEmailActions');
jest.mock('../../config/data/firebase');
jest.mock('../../context/AlertContext');
jest.mock('../../hooks/useProcessedEmailContent');

describe('EmailViewDialog', () => {
	const mockHandleReply = jest.fn();
	const mockHandleReplyAll = jest.fn();
	const mockHandleForward = jest.fn();
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockOnClose = jest.fn();

	const mockEmail = {
		id: 'email123',
		isRead: true,
		tags: [],
		folderId: 'folder1',
		headerContent: {
			Subject: ['Test Subject'],
			From: ['"Sender" <sender@example.com>'],
			To: ['"Receiver" <receiver@example.com>'],
			Cc: [],
			Date: new Date().toISOString(),
		},
		attachments: [{ attachmentId: 'att1', attachmentName: 'document.pdf', attachmentSize: 50000 }],
		inlineAttachments: [],
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useEmailActions.mockReturnValue({
			handleReply: mockHandleReply,
			handleReplyAll: mockHandleReplyAll,
			handleForward: mockHandleForward,
		});
		useAlert.mockReturnValue({
			showAlert: mockShowAlert,
			handleError: mockHandleError,
		});
		useProcessedEmailContent.mockReturnValue({
			processedContent: '<div>Mock email body</div>',
			contentLoading: false,
		});
		updateEmailReadStatus.mockResolvedValue(undefined);
		deleteZohoEmail.mockResolvedValue(undefined);
		fetchAttachmentContent.mockResolvedValue({
			data: { contentType: 'application/pdf', content: 'base64content' },
		});
	});

	it('renders email content and headers when not loading', () => {
		render(<EmailViewDialog email={mockEmail} onClose={mockOnClose} />);
		expect(screen.getByText('Test Subject')).toBeInTheDocument();
		expect(screen.getByText(/From:/i).parentElement).toHaveTextContent('From: "Sender" <sender@example.com>');
		// FIX: Changed selector to .parentElement to match the "From:" test
		expect(screen.getByText(/To:/i).parentElement).toHaveTextContent('To: "Receiver" <receiver@example.com>');
		expect(screen.getByText('Mock email body')).toBeInTheDocument();
	});

	it('renders loading state for email body', () => {
		useProcessedEmailContent.mockReturnValue({
			processedContent: '',
			contentLoading: true,
		});
		render(<EmailViewDialog email={mockEmail} onClose={mockOnClose} />);
		expect(screen.getByText('Loading content...')).toBeInTheDocument();
	});

	it('calls handleReplyAll from the menu', async () => {
		render(<EmailViewDialog email={mockEmail} onClose={mockOnClose} />);
		fireEvent.click(screen.getByLabelText('select reply type'));
		await userEvent.click(screen.getByRole('menuitem', { name: 'Reply All' }));
		expect(mockHandleReplyAll).toHaveBeenCalledWith(mockEmail);
	});

	it('calls handleToggleRead with "unread" when email is read', async () => {
		render(<EmailViewDialog email={mockEmail} onClose={mockOnClose} />);
		fireEvent.click(screen.getByRole('button', { name: 'Mark as Unread' }));

		await waitFor(() => {
			expect(updateEmailReadStatus).toHaveBeenCalledWith({
				messages: [{ id: 'email123', tags: [] }],
				status: 'unread',
			});
		});
	});

	it('calls handleDelete when delete button is clicked', async () => {
		render(<EmailViewDialog email={mockEmail} onClose={mockOnClose} />);
		fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

		await waitFor(() => {
			expect(deleteZohoEmail).toHaveBeenCalledWith({ messageId: 'email123' });
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
			expect(mockOnClose).toHaveBeenCalled();
		});
	});

	it('downloads an attachment', async () => {
		// Mock link click
		global.URL.createObjectURL = jest.fn();
		global.URL.revokeObjectURL = jest.fn();
		HTMLAnchorElement.prototype.click = jest.fn();

		render(<EmailViewDialog email={mockEmail} onClose={mockOnClose} />);

		const attachmentsButton = screen.getByRole('button', { name: /Attachments \(1\)/i });
		fireEvent.click(attachmentsButton);

		const attachmentItem = await screen.findByText(/document.pdf/i);
		await userEvent.click(attachmentItem);

		await waitFor(() => {
			expect(fetchAttachmentContent).toHaveBeenCalledWith({
				messageId: 'email123',
				attachmentId: 'att1',
				folderId: 'folder1',
			});
		});
		expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
	});
});
