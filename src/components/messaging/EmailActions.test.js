import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmailActions from './EmailActions';

describe('EmailActions', () => {
	const mockOnReply = jest.fn();
	const mockOnReplyAll = jest.fn();
	const mockOnForward = jest.fn();
	const mockOnToggleRead = jest.fn();
	const mockOnDelete = jest.fn();
	const mockOnShowNotesToggle = jest.fn();
	const mockOnDownload = jest.fn();

	const baseEmail = {
		isRead: false,
		attachments: [],
	};

	const mockProps = {
		email: baseEmail,
		darkMode: false,
		cardStyles: {},
		cardContentStyles: {},
		onReply: mockOnReply,
		onReplyAll: mockOnReplyAll,
		onForward: mockOnForward,
		onToggleRead: mockOnToggleRead,
		onDelete: mockOnDelete,
		onShowNotesToggle: mockOnShowNotesToggle,
		onDownload: mockOnDownload,
		isDownloading: null,
		showNotes: false,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders all action buttons', () => {
		render(<EmailActions {...mockProps} />);
		expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Forward/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Show Notes/i })).toBeInTheDocument();
	});

	it('calls onReply when main reply button is clicked', () => {
		render(<EmailActions {...mockProps} />);
		fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
		expect(mockOnReply).toHaveBeenCalledWith(baseEmail);
	});

	it('calls onReplyAll when selected from the menu', async () => {
		render(<EmailActions {...mockProps} />);
		fireEvent.click(screen.getByRole('button', { name: 'Reply options' }));
		await userEvent.click(screen.getByRole('menuitem', { name: /Reply All/i }));
		expect(mockOnReplyAll).toHaveBeenCalledWith(baseEmail);
	});

	it('shows "Mark as Unread" when email is read', () => {
		render(<EmailActions {...mockProps} email={{ ...baseEmail, isRead: true }} />);
		expect(screen.getByRole('button', { name: /Mark as Unread/i })).toBeInTheDocument();
	});

	it('shows "Mark as Read" when email is unread', () => {
		render(<EmailActions {...mockProps} email={{ ...baseEmail, isRead: false }} />);
		expect(screen.getByRole('button', { name: /Mark as Read/i })).toBeInTheDocument();
	});

	it('calls onToggleRead when clicked', () => {
		render(<EmailActions {...mockProps} />);
		fireEvent.click(screen.getByRole('button', { name: /Mark as Read/i }));
		expect(mockOnToggleRead).toHaveBeenCalled();
	});

	it('shows "No Attachments" and is disabled when no attachments exist', () => {
		render(<EmailActions {...mockProps} />);
		expect(screen.getByRole('button', { name: /No Attachments/i })).toBeDisabled();
	});

	it('shows attachment count and calls onDownload when an attachment is clicked', async () => {
		const emailWithAttachments = {
			...baseEmail,
			attachments: [
				{ attachmentId: '1', attachmentName: 'file1.pdf', attachmentSize: 12345 },
				{ attachmentId: '2', attachmentName: 'file2.jpg', attachmentSize: 67890 },
			],
		};
		render(<EmailActions {...mockProps} email={emailWithAttachments} />);

		const attachmentsButton = screen.getByRole('button', { name: /Attachments \(2\)/i });
		expect(attachmentsButton).toBeEnabled();

		fireEvent.click(attachmentsButton);

		const firstAttachment = await screen.findByText(/file1.pdf/i);
		expect(firstAttachment).toBeInTheDocument();
		expect(screen.getByText(/file2.jpg/i)).toBeInTheDocument();

		await userEvent.click(firstAttachment);

		expect(mockOnDownload).toHaveBeenCalledWith(emailWithAttachments.attachments[0]);
	});
});
