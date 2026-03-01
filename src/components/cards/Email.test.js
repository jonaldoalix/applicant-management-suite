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
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: jest.fn(),
}));

jest.mock('../../context/MailboxContext', () => ({ useMailbox: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
jest.mock('../../context/DialogContext', () => ({ useDialog: jest.fn() }));
jest.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn(() => ({})) }));

jest.mock('../../hooks/useEmailActions', () => ({
	useEmailActions: jest.fn(),
}));

jest.mock('../../config/data/firebase', () => ({
	__esModule: true,
	updateEmailReadStatus: jest.fn(),
	deleteZohoEmail: jest.fn(),
	fetchAttachmentContent: jest.fn(),
}));

// Mock children
jest.mock('../layout/SingleAssetPage', () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
	AssetCard: ({ children }) => <div>{children}</div>,
}));
jest.mock('../assets/Header', () => ({ title }) => <h1>{title}</h1>);
jest.mock('../assets/InfoTable', () => () => <div>InfoTable</div>);
jest.mock('../messaging/EmailBody', () => () => <div data-testid='email-body'>Email Body</div>);
jest.mock('../messaging/EmailActions', () => (props) => (
	<div data-testid='email-actions'>
		<button onClick={props.onDelete}>Delete</button>
		<button onClick={props.onToggleRead}>Toggle Read</button>
	</div>
));

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
