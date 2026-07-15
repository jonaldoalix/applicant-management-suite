import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmailCard from './Email.jsx'; // Ensure correct extension if needed
import { useMailbox } from '../../context/MailboxContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useEmailActions } from '../../hooks/useEmailActions';
import { updateEmailReadStatus, deleteZohoEmail } from '../../config/data/firebase';

// --- Mocks ---
vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: jest.fn(),
}));

vi.mock('../../context/MailboxContext', () => ({ useMailbox: jest.fn() }));
vi.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
vi.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
vi.mock('../../context/DialogContext', () => ({ useDialog: jest.fn() }));
vi.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn(() => ({}))  }));

vi.mock('../../hooks/useEmailActions', () => ({
	useEmailActions: jest.fn(),
}));

vi.mock('../../config/data/firebase', () => ({
	__esModule: true,
	updateEmailReadStatus: jest.fn(),
	deleteZohoEmail: jest.fn(),
	fetchAttachmentContent: jest.fn(),
}));

// Mock children
vi.mock('../layout/SingleAssetPage', () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
	AssetCard: ({ children }) => <div>{children}</div>,
}));
vi.mock('../assets/Header', () => ({ default: ({ title }) => <h1>{title}</h1> }));
vi.mock('../assets/InfoTable', () => ({ default: () => <div>InfoTable</div> }));
vi.mock('../messaging/EmailBody', () => ({ default: () => <div data-testid='email-body'>Email Body</div> }));
vi.mock('../messaging/EmailActions', () => ({ default: (props) => (
	<div data-testid='email-actions'>
		<button onClick={props.onDelete}>Delete</button>
		<button onClick={props.onToggleRead}>Toggle Read</button>
	</div>
) }));

describe('EmailCard', () => {
	const mockEmail = {
		id: 'msg123',
		isRead: false,
		content: 'Hello World',
		headerContent: {
			headerContent: {
				Subject: ['Test Subject'],
				From: ['sender@test.com'],
				To: ['me@test.com'],
				Date: [new Date().toISOString()],
			},
		},
		folderName: 'inbox',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useMailbox.mockReturnValue({ member: {}, permittedAliases: [] });
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		useAlert.mockReturnValue({ showAlert: jest.fn(), handleError: jest.fn() });
		useDialog.mockReturnValue({ showDialog: jest.fn() });
		useEmailActions.mockReturnValue({
			handleReply: jest.fn(),
			handleReplyAll: jest.fn(),
			handleForward: jest.fn(),
		});
	});

	test('renders email subject and content', () => {
		render(<EmailCard email={mockEmail} />);
		expect(screen.getByText('Test Subject')).toBeInTheDocument();
		expect(screen.getByTestId('email-body')).toBeInTheDocument();
	});

	test('calls updateEmailReadStatus when toggled', async () => {
		render(<EmailCard email={mockEmail} />);

		const toggleBtn = screen.getByText('Toggle Read');
		fireEvent.click(toggleBtn);

		expect(updateEmailReadStatus).toHaveBeenCalledWith(expect.objectContaining({ status: 'read' }));
	});

	test('opens confirmation dialog on delete', () => {
		const { showDialog } = useDialog();
		render(<EmailCard email={mockEmail} />);

		const deleteBtn = screen.getByText('Delete');
		fireEvent.click(deleteBtn);

		expect(showDialog).toHaveBeenCalledWith(expect.objectContaining({ id: 'confirmAction' }));
	});
});
