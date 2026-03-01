// src/pages/contactCenter/ContactCenter.test.js
import React from 'react';
import { act } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

// --- Mocks ---

// 1. Mock Collections (includes ApplicationStatus)
jest.mock('../../config/data/collections', () => ({
	ApplicationType: {
		newApplication: 'New Application',
		returningGrant: 'Returning Grant',
		scholarship: 'Scholarship',
	},
	ApplicationStatus: {
		started: 'Started',
		submitted: 'Submitted',
		completed: 'Completed',
		incomplete: 'Incomplete',
		eligible: 'Eligible',
		ineligible: 'Ineligible',
		invited: 'Invited',
		deferred: 'Deferred',
		awarded: 'Awarded',
		denied: 'Not Awarded',
		deleted: 'Deleted',
	},
	InterviewStatus: {
		scheduled: 'Scheduled',
		invited: 'Invited',
		confirmed: 'Confirmed',
		inProgress: 'In Progress',
		completed: 'Completed',
		cancelled: 'Cancelled',
		missed: 'Missed',
	},
	collections: {
		applicants: 'applicants',
		members: 'members',
		emails: 'emails',
		sms: 'sms',
		applications: 'applications',
	},
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn() }));
jest.mock('firebase/analytics', () => ({ getAnalytics: jest.fn() }));
jest.mock('firebase/auth', () => ({ getAuth: jest.fn(), createUserWithEmailAndPassword: jest.fn(), signInWithEmailAndPassword: jest.fn(), signOut: jest.fn() }));
jest.mock('firebase/storage', () => ({ getStorage: jest.fn(), ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn(), deleteObject: jest.fn() }));
jest.mock('firebase/functions', () => ({ __esModule: true, getFunctions: jest.fn(() => ({})), httpsCallable: jest.fn(() => jest.fn()) }));

// 2. FIX: Mock factory + Explicit import allows forcing return values in setup
jest.mock('firebase/firestore', () => ({
	__esModule: true,
	getFirestore: jest.fn(() => ({})),
	doc: jest.fn(),
	collection: jest.fn(),
	setDoc: jest.fn(() => Promise.resolve()),
	getDoc: jest.fn(),
	updateDoc: jest.fn(),
	getDocs: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));
jest.mock('../../context/ThemeContext');
jest.mock('../../context/HelmetContext');
jest.mock('../../config/content/push');

// Mock Firebase Config
jest.mock('../../config/data/firebase', () => ({
	getRealTimeApplicationsByWindow: jest.fn(),
	getRealTimeCollection: jest.fn(),
	getRealTimeApplicantsByApplicationID: jest.fn(),
	db: {},
}));

jest.mock('../../context/ConfigContext');
jest.mock('../../config/Constants');
jest.mock('../../context/AlertContext');
jest.mock('../../context/DialogContext');
jest.mock('../../context/AuthContext');
jest.mock('../../context/MailboxContext');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
	const React = require('react');
	return {
		...jest.requireActual('react-router-dom'),
		useNavigate: () => mockNavigate,
		useLocation: jest.fn(),
		Link: React.forwardRef(({ children, to, ...props }, ref) => (
			<a href={to} {...props} ref={ref}>
				{children}
			</a>
		)),
	};
});

import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { send, templates } from '../../config/content/push';
import { getRealTimeApplicationsByWindow, getRealTimeCollection, getRealTimeApplicantsByApplicationID } from '../../config/data/firebase';
import { useConfig } from '../../context/ConfigContext';
import { senders as staticSenders } from '../../config/Constants';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useLocation } from 'react-router-dom';
// FIX: Import doc and collection explicitly to set return values
import { setDoc, doc, collection } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useMailbox } from '../../context/MailboxContext';
import ContactCenter from './ContactCenter';

const mockShowAlert = jest.fn();
const mockShowDialog = jest.fn();
const mockHandleError = jest.fn();
const mockMember = { id: 'member-1', firstName: 'Test', lastName: 'Member', alias: 'member.alias@test.com' };
const mockPermittedAliases = ['group1', 'group2'];

const mockApplicants = [
	{ id: 'app-1', firstName: 'New', lastName: 'App', email: 'new@app.com', cell: '1111111111', notifications: { email: true, sms: true } },
	{ id: 'app-2', firstName: 'Returning', lastName: 'App', email: 'returning@app.com', cell: '2222222222', notifications: { email: true, sms: false } },
	{ id: 'app-3', firstName: 'Scholarship', lastName: 'App', email: 'scholarship@app.com', cell: '3333333333', notifications: { email: true, sms: true } },
];

const expectedRecipient = { id: 'app-1', name: 'New App', email: 'new@app.com', cell: '1111111111', alias: undefined };
const mockMembers = [
	{ id: 'mem-1', firstName: 'Admin', lastName: 'User', email: 'admin@user.com', cell: '4444444444', alias: 'admin.alias@test.com', notifications: { email: true, sms: true } },
	{ id: 'mem-2', firstName: 'No', lastName: 'Notify', email: 'no@notify.com', cell: '5555555555', notifications: { email: false, sms: false } },
];
const mockApplications = {
	new: [{ completedBy: 'app-1', type: 'New Application' }],
	returning: [{ completedBy: 'app-2', type: 'Returning Grant' }],
	scholarship: [{ completedBy: 'app-3', type: 'Scholarship' }],
};
const mockStaticSenders = [{ id: 'system', name: 'System', email: 'system@test.com', isSystem: true }];
const mockTemplates = [
	{ title: 'Test Templates', options: [{ name: 'testTemplate1', label: 'Send Test 1' }] },
	{ title: 'Templates w/ Data', options: [{ name: 'testTemplate2', label: 'Send Test 2', requiredFields: [{ id: 'field1', label: 'Field 1' }] }] },
];

const setupMocks = (locationState = {}) => {
	useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
	useTitle.mockReturnValue({ setTitle: jest.fn() });
	send.mockResolvedValue({ success: true });
	templates.length = 0;
	templates.push(...mockTemplates);

	getRealTimeCollection.mockImplementation((collectionName, callback) => {
		if (collectionName === 'applicants') callback(mockApplicants);
		if (collectionName === 'members') callback(mockMembers);
		return () => {};
	});

	getRealTimeApplicationsByWindow.mockImplementation((deadline, _, callback) => {
		const unsubApplicants = (ids, handler) => {
			let appsToReturn = [];
			if (ids.includes('app-1')) appsToReturn.push(mockApplicants[0]);
			if (ids.includes('app-2')) appsToReturn.push(mockApplicants[1]);
			if (ids.includes('app-3')) appsToReturn.push(mockApplicants[2]);
			handler(appsToReturn);
			return () => {};
		};
		getRealTimeApplicantsByApplicationID.mockImplementation(unsubApplicants);
		callback([...mockApplications.new, ...mockApplications.returning, ...mockApplications.scholarship]);
		return () => {};
	});

	setDoc.mockClear();

	// FIX: Explicitly define return values here to avoid "undefined" in test execution
	doc.mockReturnValue('mock_doc_ref');
	collection.mockReturnValue('mock_collection_ref');

	useConfig.mockReturnValue({ APPLICATION_DEADLINE: '2025-01-01', SYSTEM_REPLY_TO: 'reply@test.com' });
	staticSenders.length = 0;
	staticSenders.push(...mockStaticSenders);
	useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
	useDialog.mockReturnValue({ showDialog: mockShowDialog });
	useLocation.mockReturnValue({ pathname: '/contact', state: locationState, key: 'test-key' });
	useAuth.mockReturnValue({ member: mockMember });
	useMailbox.mockReturnValue({ permittedAliases: mockPermittedAliases });
	mockShowAlert.mockClear();
	mockShowDialog.mockClear();
	mockHandleError.mockClear();
	mockNavigate.mockClear();
};

const selectFromAutocomplete = async (label, optionText) => {
	const input = screen.getByLabelText(label);

	await act(async () => {
		fireEvent.focus(input);
		fireEvent.mouseDown(input);
		fireEvent.change(input, { target: { value: optionText } });
		fireEvent.keyDown(input, { key: 'ArrowDown' });
	});

	const option = await screen.findByText(new RegExp(optionText, 'i'), { timeout: 4000 });

	await act(async () => {
		fireEvent.click(option);
	});
};

describe('src/pages/contactCenter/ContactCenter.jsx', () => {
	beforeEach(async () => {
		setupMocks();
	});

	it('renders correctly and fetches initial data', async () => {
		render(<ContactCenter />);
		expect(screen.getByText('Contact Center')).toBeInTheDocument();
		expect(screen.getByLabelText('Recipients (email@example.com)')).toBeInTheDocument();
		expect(getRealTimeCollection).toHaveBeenCalledWith('applicants', expect.any(Function));
	});

	it('populates sender list from static, member, and alias contexts', async () => {
		render(<ContactCenter />);
		const select = screen.getByLabelText('Sender');
		await act(async () => {
			fireEvent.mouseDown(select);
		});
		expect(await screen.findByText('System <system@test.com>')).toBeInTheDocument();
		expect(await screen.findByText('Test | AMS <member.alias@test.com>')).toBeInTheDocument();
		expect(await screen.findByText('AMS <group1@fullstackboston.com>')).toBeInTheDocument();
	});

	it('pre-fills recipients and sms from location state', async () => {
		const prefilledState = {
			prefilledRecipients: [{ id: 'pre-1', name: 'Prefilled', email: 'prefilled@test.com' }],
			prefilledSms: [{ id: 'pre-2', name: 'Prefilled SMS', cell: '9998887777' }],
		};
		setupMocks(prefilledState);
		render(<ContactCenter />);
		expect(screen.getByText('Prefilled <prefilled@test.com>')).toBeInTheDocument();
		expect(screen.getByText('Prefilled SMS <+19998887777>')).toBeInTheDocument();
		expect(mockNavigate).toHaveBeenCalledWith('/contact', { replace: true, state: {} });
	});

	it('opens preset menu and adds members to recipients', async () => {
		render(<ContactCenter />);
		const recipientInput = screen.getByLabelText('Recipients (email@example.com)');
		const recipientBox = recipientInput.closest('.MuiBox-root');
		const presetButton = within(recipientBox).getByRole('button', { name: 'Add Preset' });
		await act(async () => {
			fireEvent.click(presetButton);
		});
		const membersEmailOption = await screen.findByRole('menuitem', { name: /Members \(Email\)/i });
		await act(async () => {
			fireEvent.click(membersEmailOption);
		});
		expect(await screen.findByText('Admin User <admin@user.com>')).toBeInTheDocument();
		expect(screen.queryByText('No Notify <no@notify.com>')).not.toBeInTheDocument();
	});

	it('adds free-solo email to recipients', async () => {
		render(<ContactCenter />);
		const input = screen.getByLabelText('Recipients (email@example.com)');
		await act(async () => {
			fireEvent.change(input, { target: { value: 'free@solo.com' } });
			fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
		});
		expect(await screen.findByText('<free@solo.com>')).toBeInTheDocument();
	});

	it('shows error if sending with no sender', async () => {
		render(<ContactCenter />);
		await selectFromAutocomplete('Recipients (email@example.com)', 'New App');
		const sendButton = screen.getByRole('button', { name: 'Send Test 1' });
		await act(async () => {
			fireEvent.click(sendButton);
		});
		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Please select a sender.', type: 'warning' });
		expect(send).not.toHaveBeenCalled();
	});

	it('shows error if sending with no recipients', async () => {
		render(<ContactCenter />);
		const select = screen.getByLabelText('Sender');
		await act(async () => {
			fireEvent.mouseDown(select);
		});
		const option = await screen.findByText('System <system@test.com>');
		await act(async () => {
			fireEvent.click(option);
		});
		const sendButton = screen.getByRole('button', { name: 'Send Test 1' });
		await act(async () => {
			fireEvent.click(sendButton);
		});
		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Please add at least one recipient.', type: 'warning' });
		expect(send).not.toHaveBeenCalled();
	});

	it('calls "send" with correct data for a simple template', async () => {
		render(<ContactCenter />);
		await selectFromAutocomplete('Recipients (email@example.com)', 'New App');
		const select = screen.getByLabelText('Sender');
		await act(async () => {
			fireEvent.mouseDown(select);
		});
		const option = await screen.findByText('System <system@test.com>');
		await act(async () => {
			fireEvent.click(option);
		});
		const sendButton = screen.getByRole('button', { name: 'Send Test 1' });
		await act(async () => {
			fireEvent.click(sendButton);
		});
		expect(send).toHaveBeenCalledWith('testTemplate1', [expectedRecipient], mockStaticSenders[0], [], [], {});
		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Message queued for sending!', type: 'success' });
	}, 15000);

	it('opens dialog for template with requiredFields', async () => {
		render(<ContactCenter />);
		const sendButton = screen.getByRole('button', { name: 'Send Test 2' });
		await act(async () => {
			fireEvent.click(sendButton);
		});
		expect(mockShowDialog).toHaveBeenCalledWith({
			id: 'templatedMessage',
			data: { title: 'Enter Required Data for Send Test 2', inputs: [{ id: 'field1', label: 'Field 1' }] },
			callback: expect.any(Function),
		});
	});

	// UPDATE: Added 15000ms timeout to prevent failing on slow UI interactions
	it('opens custom message dialog and queues messages on callback', async () => {
		render(<ContactCenter />);

		await selectFromAutocomplete('Recipients (email@example.com)', 'New App');
		// Wait for Chip to ensure state update
		expect(await screen.findByText('New App <new@app.com>')).toBeInTheDocument();

		await selectFromAutocomplete('Cell Numbers (9781230456)', 'Scholarship App');
		// Wait for Chip to ensure state update
		expect(await screen.findByText('Scholarship App <+13333333333>')).toBeInTheDocument();

		const select = screen.getByLabelText('Sender');
		await act(async () => {
			fireEvent.mouseDown(select);
		});
		const option = await screen.findByText('System <system@test.com>');
		await act(async () => {
			fireEvent.click(option);
		});

		const composeButton = screen.getByRole('button', { name: 'Compose Message' });
		await act(async () => {
			fireEvent.click(composeButton);
		});

		expect(mockShowDialog).toHaveBeenCalledWith({
			id: 'customMessage',
			callback: expect.any(Function),
		});

		const callback = mockShowDialog.mock.calls[0][0].callback;
		const formData = {
			subject: 'Custom Subject',
			emailBody: '<p>Custom Body</p>',
			smsBody: 'Custom SMS',
		};

		await act(async () => {
			await callback(formData);
		});

		// Ensure no error occurred
		expect(mockHandleError).not.toHaveBeenCalled();

		// Verify Email call
		expect(setDoc).toHaveBeenCalledWith(
			'mock_doc_ref',
			expect.objectContaining({
				to: 'New App <new@app.com>',
				message: expect.objectContaining({
					subject: 'Custom Subject',
				}),
			})
		);

		// Verify SMS call
		expect(setDoc).toHaveBeenCalledWith(
			'mock_doc_ref',
			expect.objectContaining({
				to: '+13333333333',
				body: 'Custom SMS',
			})
		);

		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Custom message queued for sending!', type: 'success' });
	}, 15000);
});
