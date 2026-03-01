import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MailboxProvider, useMailbox } from './MailboxContext';
import { useAuth } from './AuthContext';
import * as firestore from 'firebase/firestore';

// Mock Auth
jest.mock('./AuthContext', () => ({
	useAuth: jest.fn(),
}));

// Mock Firestore
jest.mock('firebase/firestore', () => ({
	collection: jest.fn(),
	query: jest.fn(),
	where: jest.fn(),
	orderBy: jest.fn(),
	onSnapshot: jest.fn(),
	getFirestore: jest.fn(),
}));

jest.mock('../config/data/firebase', () => ({
	db: {},
}));

const TestConsumer = () => {
	const { emails, permittedFolders, loading } = useMailbox();
	if (loading) return <div>Loading...</div>;
	return (
		<div>
			<div data-testid='folder-count'>{permittedFolders.length}</div>
			<div data-testid='email-count'>{emails.length}</div>
			{emails.map((e, i) => (
				<div key={i}>{e.subject}</div>
			))}
		</div>
	);
};

describe('MailboxContext', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('initializes empty if member has no email permissions', async () => {
		useAuth.mockReturnValue({
			member: { permissions: {} }, // No email permissions
		});

		render(
			<MailboxProvider>
				<TestConsumer />
			</MailboxProvider>
		);

		expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
		expect(screen.getByTestId('folder-count')).toHaveTextContent('0');
	});

	test('loads permitted folders and emails for authorized member', async () => {
		// 1. Setup Mock User with specific permissions structure required by your code
		useAuth.mockReturnValue({
			member: {
				alias: 'test@example.com',
				permissions: {
					email: true,
					emails: {
						folders: { inbox: true, sent: true, spam: false },
						aliases: { 'support@example.com': true },
					},
				},
			},
		});

		// 2. Setup Mock Email Data
		const mockEmails = [{ data: () => ({ subject: 'Test Email 1', isRead: false }) }, { data: () => ({ subject: 'Test Email 2', isRead: true }) }];

		// 3. Mock Firestore Snapshot
		firestore.onSnapshot.mockImplementation((q, callback) => {
			callback({ docs: mockEmails });
			return jest.fn(); // unsubscribe
		});

		// 4. Render
		await act(async () => {
			render(
				<MailboxProvider>
					<TestConsumer />
				</MailboxProvider>
			);
		});

		// 5. Assertions
		// Folders should be 'inbox' and 'sent' (spam is false)
		expect(screen.getByTestId('folder-count')).toHaveTextContent('2');
		// Emails should be loaded
		expect(screen.getByTestId('email-count')).toHaveTextContent('2');
		expect(screen.getByText('Test Email 1')).toBeInTheDocument();
	});
});
