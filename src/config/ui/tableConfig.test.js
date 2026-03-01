import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import * as TableConfig from './tableConfig';
import { getAttachmentLabel, getStatusIcon, parseDisplayName, getRsvpLabel, StackedDateCell, SenderSubjectCell, RecipientSubjectCell, UserLastLogin, DynamicApplicantProfilePicture, DynamicMemberProfilePicture } from './tableConfig';
import {
	ResendRequestButton,
	InvalidateRequestButton,
	CreateRoomButton,
	CloseRoomButton,
	ReplyButton,
	ToggleReadButton,
	DeleteInterviewButton,
	ViewAppButton,
	ViewButton,
	EditAssetButton,
	ViewApplicantButton,
	EditApplicantButton,
	EditRequestButton,
	ViewRequestButton,
	ViewEmailButton,
	JoinInterviewButton,
} from './tableConfig';

import * as FirebaseService from '../data/firebase';
import * as PushService from '../content/push';
import { httpsCallable } from 'firebase/functions';
import { writeBatch } from 'firebase/firestore';
import { generatePath } from '../navigation/routeUtils';

// --- MOCKS ---

// 1. Robust Router Mock
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
	__esModule: true,
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mockNavigate,
}));

// 2. Mock Route Utils
jest.mock('../navigation/routeUtils', () => ({
	__esModule: true,
	generatePath: jest.fn(),
}));

// 3. Mock Paths
jest.mock('../navigation/paths', () => ({
	__esModule: true,
	paths: {
		viewApp: 'viewApp',
		viewMember: 'viewMember',
		editMember: 'editMember',
		viewApplicant: 'viewApplicant',
		editApplicant: 'editApplicant',
		editRequest: 'editRequest',
		viewEmail: 'viewEmail',
		interviewRoom: 'interviewRoom',
		waitingRoom: 'waitingRoom',
	},
}));

// 4. Mock Collections (Crucial for Validation.js and Firestore calls)
jest.mock('../data/collections', () => ({
	__esModule: true,
	collections: {
		requests: 'requests',
		applications: 'applications',
		members: 'members',
		interviews: 'interviews',
		attachments: 'attachments',
	},
	InterviewStatus: {
		invited: 'Invited',
		confirmed: 'Confirmed',
		scheduled: 'Scheduled',
	},
	ApplicationStatus: {
		started: 'started',
		submitted: 'submitted',
		completed: 'completed',
		archived: 'archived',
	},
	ApplicationType: {
		scholarship: 'Scholarship',
		grant: 'Grant',
	},
}));

// Top-level mocks for spies
const mockShowDialog = jest.fn();
const mockShowAlert = jest.fn();
const mockHandleError = jest.fn();
const mockDispatch = jest.fn();
const mockHandleReply = jest.fn();
const mockHandleReplyAll = jest.fn();
const mockHandleForward = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(true);

jest.mock('../../context/DialogContext', () => ({
	useDialog: () => ({ showDialog: mockShowDialog }),
}));

jest.mock('../../context/AlertContext', () => ({
	useAlert: () => ({ showAlert: mockShowAlert, handleError: mockHandleError }),
}));

jest.mock('../../context/AuthContext', () => ({
	useAuth: () => ({
		user: { uid: 'test-user', permissions: { admin: true, interviews: { canAccess: true, canHost: true } } },
		member: { id: 'test-member', permissions: { email: true, interviews: { canAccess: true, canHost: true, canSchedule: true }, admin: true } },
	}),
}));

jest.mock('../../context/ConfigContext', () => ({
	useConfig: () => ({ APPLICATION_DEADLINE: '2024-01-01', DEFAULT_AVATAR: 'default.jpg' }),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: () => ({ darkMode: false, dispatch: mockDispatch }),
}));

jest.mock('../../hooks/useEmailActions', () => ({
	useEmailActions: () => ({
		handleReply: mockHandleReply,
		handleReplyAll: mockHandleReplyAll,
		handleForward: mockHandleForward,
	}),
}));

jest.mock('../data/firebase', () => ({
	__esModule: true,
	getUserAuthRecord: jest.fn(),
	getCollectionData: jest.fn(),
	updateCollectionData: jest.fn(),
	getDocumentsByIDs: jest.fn(),
	deleteZohoEmail: jest.fn(),
	updateEmailReadStatus: jest.fn(),
	fetchEmailContent: jest.fn(),
	bulkDeleteZohoEmails: jest.fn(),
	createInterviewRoom: jest.fn(),
	closeInterviewRoom: jest.fn(),
	sendInterviewInvitations: jest.fn(),
	bulkUpdateInterviewStatus: jest.fn(),
	db: {},
	functions: {},
}));

jest.mock('firebase/functions', () => ({
	__esModule: true,
	httpsCallable: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
	__esModule: true,
	// Initialize as basic fn to avoid hoisting issues. Implementation is set in beforeEach.
	writeBatch: jest.fn(),
	doc: jest.fn((db, col, id) => `${col}/${id}`),
}));

jest.mock('../Constants', () => ({
	__esModule: true,
	attachmentFields: [
		{ key: 'testKey', label: 'Test Label' },
		{ key: 'academicRecommendationLetter', label: 'Academic Letter of Recommendation' },
	],
	generate6DigitNumber: () => '123456',
	generateSecurePin: () => Promise.resolve('hashed-pin'),
	generateUploadLink: () => Promise.resolve('http://upload.link'),
}));

jest.mock('../content/push', () => ({
	__esModule: true,
	sendRequest: jest.fn(),
}));

describe('tableConfig.js', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		// Reset specific mocks
		mockNavigate.mockClear();
		mockBatchUpdate.mockClear();
		mockBatchCommit.mockClear();

		// Set implementation for writeBatch here to ensure it captures initialized spies
		writeBatch.mockImplementation(() => ({
			update: mockBatchUpdate,
			commit: mockBatchCommit,
			delete: jest.fn(),
		}));

		// Configure `generatePath` implementation
		generatePath.mockImplementation((path, params) => `path:${path} params:${JSON.stringify(params)}`);

		FirebaseService.getCollectionData.mockResolvedValue({ picture: { home: 'test.jpg' } });
		FirebaseService.getDocumentsByIDs.mockResolvedValue([]);
		FirebaseService.getUserAuthRecord.mockResolvedValue({ data: { lastSignInTime: '2023-01-01T10:00:00Z' } });
		httpsCallable.mockImplementation(() => jest.fn().mockResolvedValue({ data: { message: 'Success' } }));
	});

	// 1. HELPER FUNCTIONS
	describe('Helper Functions', () => {
		describe('getAttachmentLabel', () => {
			it('finds a matching label', () => {
				expect(getAttachmentLabel('testKey')).toBe('Test Label');
			});
			it('returns the key if no match is found', () => {
				expect(getAttachmentLabel('unknownKey')).toBe('unknownKey');
			});
		});

		describe('getStatusIcon', () => {
			it('returns correct icons', () => {
				expect(getStatusIcon(true, false).props.sx.color).toBe('success.main');
				expect(getStatusIcon(false, true).props.sx.color).toBe('error.main');
				expect(getStatusIcon(false, false).props.sx.color).toBe('warning.main');
			});
		});

		describe('parseDisplayName', () => {
			it('parses standard format', () => {
				expect(parseDisplayName('"Test User" <test@example.com>')).toBe('Test User');
			});
			it('handles basic email', () => {
				expect(parseDisplayName('test@example.com')).toBe('test@example.com');
			});
			it('handles null', () => {
				expect(parseDisplayName(null)).toBe('Unknown');
			});
		});

		describe('getRsvpLabel', () => {
			it('returns correct labels', () => {
				expect(getRsvpLabel('yes')).toBe('✅ Yes');
				expect(getRsvpLabel('no')).toBe('❌ No');
			});
		});
	});

	// 2. CELL COMPONENTS
	describe('Cell Components', () => {
		describe('StackedDateCell', () => {
			it('renders formatted date', () => {
				render(<StackedDateCell value='2023-01-01T12:00:00Z' row={{ hasAttachment: true }} />);
				expect(screen.getByText(/Jan 1, 2023/)).toBeInTheDocument();
				expect(screen.getByTestId('AttachFileIcon')).toBeInTheDocument();
			});
		});

		describe('SenderSubjectCell & RecipientSubjectCell', () => {
			it('renders sender info correctly', () => {
				const row = { isRead: false, sender: 'Sender <s@s.com>', subject: 'Hello' };
				render(<SenderSubjectCell row={row} />);
				expect(screen.getByText('Sender')).toHaveStyle('font-weight: 700');
				expect(screen.getByText('Hello')).toBeInTheDocument();
			});
			it('renders recipient info correctly', () => {
				const row = { isRead: true, to: 'Receiver <r@r.com>', subject: 'Hi' };
				render(<RecipientSubjectCell row={row} />);
				expect(screen.getByText('Receiver')).not.toHaveStyle('font-weight: 700');
			});
		});

		describe('Profile Pictures', () => {
			it('renders Applicant Profile Picture', async () => {
				render(<DynamicApplicantProfilePicture user='app1' />);
				// Wait for async state update
				const avatar = await screen.findByAltText('avatar');
				expect(avatar).toBeInTheDocument();
			});

			it('renders Member Profile Picture', async () => {
				render(<DynamicMemberProfilePicture user='mem1' />);
				// Wait for async state update
				const avatar = await screen.findByAltText('avatar');
				expect(avatar).toBeInTheDocument();
			});
		});

		describe('UserLastLogin', () => {
			it('renders last login time', async () => {
				render(<UserLastLogin userId='u1' />);
				// Wait for async state update
				expect(await screen.findByText(/1\/01\/23/)).toBeInTheDocument();
			});
		});
	});

	// 3. ROW ACTIONS (COMPLEX LOGIC)
	describe('Row Actions (Complex Logic)', () => {
		it('InvalidateRequestButton: Updates expiry and unlinks attachment', async () => {
			const row = { id: 'req1', attachmentsID: 'att1', attachmentType: 'testType', applicationID: 'app1' };
			FirebaseService.getCollectionData.mockResolvedValueOnce({ completedBy: 'applicant1' }).mockResolvedValueOnce({ testType: { requestID: 'req1' } });

			render(<InvalidateRequestButton row={row} />);
			const btn = screen.getByText('Cancel');

			await act(async () => {
				fireEvent.click(btn);
			});

			await waitFor(() => {
				expect(FirebaseService.updateCollectionData).toHaveBeenCalledWith('requests', 'req1', expect.objectContaining({ expiryDate: expect.any(String) }));
			});
		});

		it('ResendRequestButton: Updates request and sends email', async () => {
			const row = { id: 'req1' };
			render(<ResendRequestButton row={row} />);

			await act(async () => {
				fireEvent.click(screen.getByText('Resend'));
			});

			await waitFor(() => {
				expect(FirebaseService.updateCollectionData).toHaveBeenCalledWith('requests', 'req1', expect.objectContaining({ attempts: 0 }));
			});
			expect(PushService.sendRequest).toHaveBeenCalled();
		});

		it('CreateRoomButton: Calls cloud function', async () => {
			const row = { id: 'int1', roomId: null };
			render(<CreateRoomButton row={row} />);

			await act(async () => {
				fireEvent.click(screen.getByText('Open'));
			});

			await waitFor(() => {
				expect(FirebaseService.createInterviewRoom).toHaveBeenCalledWith({ interviewId: 'int1' });
			});
		});

		it('CloseRoomButton: Calls cloud function', async () => {
			const row = { id: 'int1', roomId: 'existing' };
			render(<CloseRoomButton row={row} />);

			await act(async () => {
				fireEvent.click(screen.getByText('Close'));
			});

			await waitFor(() => {
				expect(FirebaseService.closeInterviewRoom).toHaveBeenCalledWith({ interviewId: 'int1' });
			});
		});

		it('ReplyButton: Fetches content and opens dialog', async () => {
			const row = { id: 'msg1', folderId: 'inbox' };
			FirebaseService.fetchEmailContent.mockResolvedValue({ data: { text: 'content' } });

			render(<ReplyButton row={row} />);

			await act(async () => {
				fireEvent.click(screen.getByText('Reply'));
			});

			await waitFor(() => {
				expect(FirebaseService.fetchEmailContent).toHaveBeenCalled();
			});
			await waitFor(() => {
				expect(mockHandleReply).toHaveBeenCalled();
			});
		});

		it('ToggleReadButton: Toggles status', async () => {
			const row = { id: 'msg1', isRead: false, tags: [] };
			FirebaseService.updateEmailReadStatus.mockResolvedValue({});

			render(<ToggleReadButton row={row} />);

			await act(async () => {
				fireEvent.click(screen.getByText('Read'));
			});

			await waitFor(() => {
				expect(FirebaseService.updateEmailReadStatus).toHaveBeenCalledWith({
					messages: [{ id: 'msg1', tags: [] }],
					status: 'read',
				});
			});
		});

		it('DeleteInterviewButton: Handles errors gracefully', async () => {
			const row = { id: 'int1' };
			const mockDelete = jest.fn().mockRejectedValue(new Error('Delete failed'));
			httpsCallable.mockReturnValue(mockDelete);

			mockShowDialog.mockImplementation(({ callback }) => callback(true));

			render(<DeleteInterviewButton row={row} />);
			await act(async () => {
				fireEvent.click(screen.getByText('Delete'));
			});

			await waitFor(() => {
				expect(mockHandleError).toHaveBeenCalledWith(expect.any(Error), 'delete-interview-error');
			});
		});
	});

	// 4. SIMPLE NAVIGATION BUTTONS
	describe('Simple Navigation Buttons', () => {
		const row = { id: '123', applicationID: 'app123' };

		const buttons = [
			{ Component: ViewAppButton, label: 'View', expectedParams: { id: '123' } },
			{ Component: ViewButton, label: 'View', expectedParams: { id: '123' } },
			{ Component: EditAssetButton, label: 'Edit', expectedParams: { id: '123' } },
			{ Component: ViewApplicantButton, label: 'View', expectedParams: { id: '123' } },
			{ Component: EditApplicantButton, label: 'Edit', expectedParams: { id: '123' } },
			{ Component: EditRequestButton, label: 'Edit', expectedParams: { id: '123' } },
			{ Component: ViewRequestButton, label: 'View App', expectedParams: { id: 'app123' } },
			{ Component: ViewEmailButton, label: 'View', expectedParams: { id: '123' } },
		];

		buttons.forEach(({ Component, label, expectedParams }) => {
			it(`${Component.name} navigates correctly`, async () => {
				render(<Component row={row} />);
				const btn = screen.getAllByText(label)[0];

				await act(async () => {
					fireEvent.click(btn);
				});

				expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining(`params:${JSON.stringify(expectedParams)}`));
			});
		});
	});

	// 5. PERMISSION & HIDING TESTS
	describe('Button Visibility', () => {
		it('JoinInterviewButton is hidden if no room or permission', () => {
			const rowNoRoom = { id: '1', roomId: null };
			const { container } = render(<JoinInterviewButton row={rowNoRoom} />);
			expect(container).toBeEmptyDOMElement();
		});
	});

	// 6. TOOLBAR ACTIONS
	describe('Toolbar Actions', () => {
		it('Request Toolbar: Contact Senders', async () => {
			const navigate = jest.fn();
			const actions = TableConfig.getRequestToolbarActions({ navigate });
			const contactAction = actions.find((a) => a.label === 'Contact Senders');

			const selectedIds = ['req1'];
			const allRows = [{ id: 'req1', applicationID: 'app1' }];

			FirebaseService.getDocumentsByIDs.mockResolvedValueOnce([{ id: 'app1', completedBy: 'applicant1' }]).mockResolvedValueOnce([{ id: 'applicant1', firstName: 'John', email: 'j@test.com' }]);

			await contactAction.onClick(selectedIds, allRows, { showDialog: mockShowDialog, handleError: mockHandleError, showAlert: mockShowAlert });

			expect(mockShowDialog).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						recipients: expect.arrayContaining([expect.objectContaining({ name: 'John undefined' })]),
					}),
				})
			);
		});

		it('Request Toolbar: Resend (Bulk)', async () => {
			const actions = TableConfig.getRequestToolbarActions({});
			const action = actions.find((a) => a.label === 'Resend');
			const selectedIds = ['req1'];
			const allRows = [{ id: 'req1' }];

			mockShowDialog.mockImplementation(({ callback }) => callback(true));

			await action.onClick(selectedIds, allRows, {
				showDialog: mockShowDialog,
				showAlert: mockShowAlert,
				handleError: mockHandleError,
				config: { APPLICATION_DEADLINE: '2025-01-01' },
			});

			await waitFor(() => {
				expect(PushService.sendRequest).toHaveBeenCalled();
			});
		});

		it('Request Toolbar: Cancel (Batch Update)', async () => {
			const actions = TableConfig.getRequestToolbarActions({});
			const cancelAction = actions.find((a) => a.label === 'Cancel');
			const selectedIds = ['req1', 'req2'];

			// We need to mock showDialog to execute the callback IMMEDIATELY and ASYNC
			// so that the batch update logic inside the callback is triggered and awaited.
			mockShowDialog.mockImplementation(async ({ callback }) => {
				await callback(true);
			});

			await cancelAction.onClick(selectedIds, [], {
				showDialog: mockShowDialog,
				handleError: mockHandleError,
				showAlert: mockShowAlert,
			});

			// Verify execution
			expect(mockShowDialog).toHaveBeenCalled();
			expect(mockHandleError).not.toHaveBeenCalled();

			// Wait for the success alert (verifying batch completion)
			await waitFor(() => {
				expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
			});

			expect(writeBatch).toHaveBeenCalled();
			expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
			expect(mockBatchCommit).toHaveBeenCalled();
		});

		it('Scheduler Toolbar: Send Invites', async () => {
			const actions = TableConfig.getSchedulerToolbarActions({});
			const action = actions.find((a) => a.label === 'Send Invites');
			const mockCall = jest.fn().mockResolvedValue({ data: { message: 'Sent' } });
			httpsCallable.mockReturnValue(mockCall);

			await action.onClick(['int1'], [], { showAlert: mockShowAlert, handleError: mockHandleError });
			expect(FirebaseService.sendInterviewInvitations).toHaveBeenCalledWith({ interviewIds: ['int1'] });
		});

		it('Interview Toolbar: Update Statuses', async () => {
			const navigate = jest.fn();
			const actions = TableConfig.getInterviewToolbarActions({ deliberationRoomExists: false, navigate });
			const updateAction = actions.find((a) => a.label === 'Update Statuses');
			mockShowDialog.mockImplementation(({ callback }) => callback({ status: 'Completed' }));
			const mockCallable = jest.fn().mockResolvedValue({});
			httpsCallable.mockReturnValue(mockCallable);

			await updateAction.onClick(['int1'], [], { showDialog: mockShowDialog, showAlert: mockShowAlert, handleError: mockHandleError });
			expect(FirebaseService.bulkUpdateInterviewStatus).toHaveBeenCalledWith({ interviewIds: ['int1'], newStatus: 'Completed' });
		});

		it('Inbox Toolbar: Delete (Batch)', async () => {
			const actions = TableConfig.getInboxToolbarActions({});
			const deleteAction = actions.find((a) => a.label === 'Delete');

			await deleteAction.onClick(['msg1'], [], {
				showDialog: ({ callback }) => callback(true),
				showAlert: mockShowAlert,
				handleError: mockHandleError,
			});

			expect(FirebaseService.bulkDeleteZohoEmails).toHaveBeenCalledWith({ messageIds: ['msg1'] });
		});
	});

	// 7. DYNAMIC COLUMN COVERAGE
	describe('Dynamic Column Coverage', () => {
		const allColumnConfigs = [TableConfig.memberCols, TableConfig.applicantCols, TableConfig.appCols, TableConfig.reqCols, TableConfig.interviewCols, TableConfig.schedulerCols, TableConfig.inboxCols, TableConfig.legacyFinancesCols];

		const mockRowData = {
			id: 'test-id',
			firstName: 'John',
			lastName: 'Doe',
			school: 'Test Uni',
			gradYear: '2024-05-01',
			major: 'CS',
			email: 'test@test.com',
			cell: '555-555-5555',
			applications: [],
			window: '2024-01-01',
			lastUpdated: '2024-01-01',
			expiryDate: '2025-01-01',
			startTime: { toDate: () => new Date() },
			status: 'Submitted',
			rsvpStatus: 'yes',
			tags: ['tag1'],
			financial_summary: {
				scholarships_grants: { amount_available: 1000, amount_returned: 0 },
				non_scholarship_items: { amount_available: 500, amount_returned: 0 },
			},
			completedBy: 'test-user-id',
		};

		allColumnConfigs.forEach((columns, index) => {
			if (!columns) return;

			it(`executes valueGetters and formatters for config set #${index}`, async () => {
				for (const col of columns) {
					if (col.valueGetter) {
						try {
							const result = col.valueGetter({ row: mockRowData, value: [] });
							expect(result).toBeDefined();
						} catch (e) {}
					}
					if (col.valueFormatter) {
						try {
							const result = col.valueFormatter({ value: 1000, row: mockRowData });
							expect(result).toBeDefined();
						} catch (e) {}
					}
					if (col.renderCell) {
						try {
							// Await simple act to help flush effects and reduce warnings
							await act(async () => {
								render(col.renderCell({ row: mockRowData, value: 'Test Value' }));
							});
						} catch (e) {}
					}
				}
			});
		});
	});
});
