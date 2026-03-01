import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { senders } from '../../config/Constants';
import { send } from '../../config/content/push';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';

// Mock dependencies

// 1. Mock the deepest dependencies
jest.mock('../../config/data/firebase', () => ({
	db: { id: 'mockDb' },
	getConfigFromDb: jest.fn(),
}));
jest.mock('../../config/data/collections', () => ({
	collections: {
		emails: 'emails',
		sms: 'sms',
	},
	ApplicationType: {},
}));

// 2. Mock Constants.js
jest.mock('../../config/Constants', () => ({
	senders: [{ name: 'Admin', email: 'admin@test.com' }],
	emailHeader: '<div>HEADER</div>',
	staticEmailFooter: '<div>FOOTER</div>',
	ApplicationStatus: {
		ineligible: 'test-ineligible-status',
		eligible: 'test-eligible-status',
	},
}));

// 3. Mock dialogConfig.js
jest.mock('../../config/ui/dialogConfig', () => ({
	dialogs: {},
}));

// 4. Mock Contexts
jest.mock('../../context/DialogContext');
jest.mock('../../context/AlertContext');
jest.mock('../../context/ConfigContext');
jest.mock('../../context/ThemeContext');

// 5. Mock remaining dependencies
jest.mock('../../config/content/push', () => ({
	send: jest.fn(),
	templates: [
		{
			title: 'Test Templates',
			options: [
				{ name: 'simple', label: 'Simple Message', requiredFields: [] },
				{ name: 'withData', label: 'Message With Data', requiredFields: ['customField'] },
			],
		},
	],
}));

// Mock firestore and define mocks INLINE to avoid hoisting ReferenceError
jest.mock('firebase/firestore', () => ({
	...jest.requireActual('firebase/firestore'),
	setDoc: jest.fn(() => Promise.resolve()),
	collection: jest.fn(() => ({ id: 'mockCollection' })),
	doc: jest.fn(() => ({ id: 'mockDoc' })),
	getFirestore: jest.fn(),
}));

// --- IMPORTS MUST COME AFTER MOCKS ---

// Import the component-under-test *after* all mocks are defined
import { TemplatedOptions, CustomMessageTrigger } from './MessageOptions';
// Import the *mocked* functions so we can track their calls
import { setDoc, collection, doc } from 'firebase/firestore';

// Mock DOMParser
const mockParseFromString = jest.fn(() => ({
	body: {
		textContent: 'Custom Body',
	},
}));

beforeAll(() => {
	global.DOMParser = class {
		constructor() {}
		parseFromString() {
			// This calls the global mockParseFromString
			return mockParseFromString();
		}
	};
});

describe('MessageOptions', () => {
	const mockShowDialog = jest.fn();
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockOnClose = jest.fn();

	// Define mock refs here to scope them to the test suite
	const mockCollectionRef = { id: 'mockCollection' };
	const mockDocRef = { id: 'mockDoc' };

	beforeEach(() => {
		jest.clearAllMocks();
		// FIX: We must re-establish the implementation for mockParseFromString
		// because jest.clearAllMocks() wipes it out.
		mockParseFromString.mockImplementation(() => ({
			body: {
				textContent: 'Custom Body',
			},
		}));

		// Clear the imported mocks
		setDoc.mockClear();
		collection.mockClear();
		doc.mockClear();

		// Re-implement the mocks for each test
		setDoc.mockResolvedValue(undefined);
		collection.mockReturnValue(mockCollectionRef);
		doc.mockReturnValue(mockDocRef);

		useDialog.mockReturnValue({ showDialog: mockShowDialog });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useConfig.mockReturnValue({ SYSTEM_REPLY_TO: 'reply@test.com' });
		useTheme.mockReturnValue({ darkMode: false, boxShadow: '' });
		send.mockResolvedValue({ success: true });
	});

	describe('TemplatedOptions', () => {
		const recipients = [{ name: 'Test User', email: 'test@example.com' }];

		it('renders template buttons', () => {
			render(<TemplatedOptions darkMode={false} recipients={recipients} onClose={mockOnClose} />);
			expect(screen.getByText('Test Templates')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Simple Message' })).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Message With Data' })).toBeInTheDocument();
		});

		it('calls "send" directly for templates without required fields', async () => {
			render(<TemplatedOptions darkMode={false} recipients={recipients} onClose={mockOnClose} />);
			fireEvent.click(screen.getByRole('button', { name: 'Simple Message' }));

			await waitFor(() => {
				expect(send).toHaveBeenCalledWith('simple', recipients, senders[0], [], [], {});
				expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Message queued for sending!', type: 'success' });
			});

			expect(mockOnClose).toHaveBeenCalled();
		});

		it('opens dialog for templates with required fields', () => {
			render(<TemplatedOptions darkMode={false} recipients={recipients} onClose={mockOnClose} />);
			fireEvent.click(screen.getByRole('button', { name: 'Message With Data' }));

			expect(mockShowDialog).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'templatedMessage',
					data: expect.objectContaining({
						inputs: ['customField'],
					}),
				})
			);
			expect(send).not.toHaveBeenCalled();
		});
	});

	describe('CustomMessageTrigger', () => {
		const recipients = [
			{ name: 'Email User', email: 'email@example.com' },
			{ name: 'SMS User', cell: '1234567890' },
		];

		it('opens custom message dialog on click', () => {
			render(<CustomMessageTrigger darkMode={false} recipients={recipients} onClose={mockOnClose} />);
			fireEvent.click(screen.getByRole('button', { name: 'Compose Message' }));

			expect(mockShowDialog).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'customMessage',
				})
			);
		});

		it('sends email and SMS when dialog callback is invoked', async () => {
			render(<CustomMessageTrigger darkMode={false} recipients={recipients} onClose={mockOnClose} />);
			fireEvent.click(screen.getByRole('button', { name: 'Compose Message' }));

			const callback = mockShowDialog.mock.calls[0][0].callback;

			const formData = { subject: 'Custom Subject', emailBody: '<p>Custom Body</p>', smsBody: 'Custom SMS' };

			await callback(formData); // Trigger the async function

			// Check that no error was thrown
			expect(mockHandleError).not.toHaveBeenCalled();

			// Check email call
			expect(collection).toHaveBeenCalledWith(expect.any(Object), 'emails');
			expect(doc).toHaveBeenCalledWith(mockCollectionRef);
			expect(setDoc).toHaveBeenCalledWith(
				mockDocRef,
				expect.objectContaining({
					to: 'Email User <email@example.com>',
					from: 'Admin <admin@test.com>',
					message: expect.objectContaining({
						subject: 'Custom Subject',
						html: '<div>HEADER</div><p>Custom Body</p><div>FOOTER</div>',
						text: 'Custom Body',
					}),
				})
			);

			// Check SMS call
			expect(collection).toHaveBeenCalledWith(expect.any(Object), 'sms');
			expect(doc).toHaveBeenCalledWith(mockCollectionRef);
			expect(setDoc).toHaveBeenCalledWith(
				mockDocRef,
				expect.objectContaining({
					to: '+11234567890',
					body: 'Custom SMS',
				})
			);

			// Wait for the success alert, which happens last
			await waitFor(() => {
				expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Custom message queued!', type: 'success' });
			});

			expect(mockOnClose).toHaveBeenCalled();
		});
	});
});
