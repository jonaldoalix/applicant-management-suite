import { send, sendRequest, pushNotice, templates, ContactTemplate } from './push';
import { db, getConfigFromDb } from '../data/firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import { brand, emailHeader, emailFooter, unsubscribeLink, staticEmailFooter, LettersOfRecommendation } from '../Constants';
import { collections } from '../data/collections';
import { emailTemplates } from './emailTemplates';

// Mock all dependencies
jest.mock('../data/firebase', () => ({
	db: 'mockDb', // Provide a simple mock value
	getConfigFromDb: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	setDoc: jest.fn(),
	collection: jest.fn(),
}));

jest.mock('../Constants', () => ({
	brand: {
		boardName: 'Test Board',
		theOrganizationName: 'Test Org',
		contactEmail: 'contact@test.com',
	},
	emailHeader: '<div>HEADER</div>',
	emailFooter: jest.fn(() => '<div>FOOTER</div>'),
	unsubscribeLink: jest.fn(() => Promise.resolve('http://unsubscribe.com')),
	staticEmailFooter: '<div>STATIC FOOTER</div>',
	LettersOfRecommendation: {
		academicRecommendationLetter: {
			name: 'Academic LOR',
			purpose: 'to attest to academics',
		},
	},
}));

jest.mock('../data/collections', () => ({
	collections: {
		emails: 'emails',
		sms: 'sms',
	},
}));

// FIX: Use hardcoded strings instead of the ContactTemplate variable
jest.mock('./emailTemplates', () => ({
	emailTemplates: {
		welcome: {
			subject: 'Welcome {{name}}',
			html: '<p>Hello, {{name}}. Your ID is {{id}}.</p>',
		},
		appApproved: {
			subject: 'Application Approved: {{award.type}}',
			html: '<p>Congrats! You got {{award.amount}}.</p>',
		},
	},
}));

// Mock return values
const mockConfig = {
	SYSTEM_REPLY_TO: 'reply@test.com',
	SYSTEM_CC_EMAILS: ['cc@test.com'],
	SYSTEM_EMAIL: 'system@test.com',
};

describe('push.js', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		getConfigFromDb.mockResolvedValue(mockConfig);
		collection.mockReturnValue('mockCollectionRef');
		doc.mockReturnValue('mockDocRef');
		setDoc.mockResolvedValue(true);
		unsubscribeLink.mockResolvedValue('http://unsub.link');
		emailFooter.mockReturnValue('<div>FOOTER</div>');
	});

	describe('send', () => {
		const to = [{ id: '1', name: 'Test User', email: 'test@example.com' }];
		const smsTo = [{ id: '2', name: 'SMS User', cell: '1234567890' }];
		const from = { name: 'Sender', email: 'sender@test.com' };
		const cc = [{ name: 'CC User', email: 'cc_user@example.com' }];
		const data = { id: 'global-id' }; // Global data

		it('sends an email with correct data', async () => {
			await send(ContactTemplate.welcome, to, from, cc, [], data);

			expect(getConfigFromDb).toHaveBeenCalled();
			expect(unsubscribeLink).toHaveBeenCalledWith('1');
			expect(emailFooter).toHaveBeenCalledWith('http://unsub.link');
			expect(setDoc).toHaveBeenCalledWith(
				'mockDocRef',
				expect.objectContaining({
					to: 'Test User <test@example.com>',
					from: 'Sender <sender@test.com>',
					replyTo: 'reply@test.com',
					cc: ['CC User <cc_user@example.com>', 'cc@test.com'],
					message: expect.objectContaining({
						subject: 'Welcome Test User',
						text: 'Hello, Test User. Your ID is 1. Best regards, Test Board',
						html: '<div>HEADER</div><main style="font-family: Arial, Helvetica, sans-serif; color: #333; padding: 5px; margin: 5px;"><p>Hello, Test User. Your ID is 1.</p><p>Best regards,<br>Test Board</p></main><div>FOOTER</div>',
					}),
				})
			);
		});

		it('sends an SMS with correct data', async () => {
			await send(ContactTemplate.welcome, [], from, [], smsTo, data);

			expect(setDoc).toHaveBeenCalledWith(
				'mockDocRef',
				expect.objectContaining({
					to: '+11234567890',
					body: 'Hello, SMS User. Your ID is 2. Best regards, Test Board',
				})
			);
		});

		it('merges dynamic data with template', async () => {
			const awardData = { award: { type: 'Test Grant', amount: '$500' } };
			await send(ContactTemplate.appApproved, to, from, [], [], awardData);

			expect(setDoc).toHaveBeenCalledWith(
				'mockDocRef',
				expect.objectContaining({
					message: expect.objectContaining({
						subject: 'Application Approved: Test Grant',
						text: 'Congrats! You got $500. Best regards, Test Board',
					}),
				})
			);
		});

		it('handles send failure', async () => {
			const error = new Error('Template not found for key: nonExistentTemplate');
			const result = await send('nonExistentTemplate', to, from, [], [], data);

			expect(result.success).toBe(false);
			expect(result.error).toEqual(error);
		});
	});

	describe('sendRequest', () => {
		it('sends a recommendation request email', async () => {
			const request = {
				name: 'Dr. Recommender',
				email: 'rec@example.com',
				fromName: 'Test Applicant',
				attachmentType: 'academicRecommendationLetter',
				expiryDate: '2025-12-31',
			};
			const link = 'http://upload.link';
			const pin = '123456';

			await sendRequest(request, link, pin);

			expect(getConfigFromDb).toHaveBeenCalled();
			expect(setDoc).toHaveBeenCalledWith(
				'mockDocRef',
				expect.objectContaining({
					to: 'Dr. Recommender <rec@example.com>',
					from: 'system@test.com',
					cc: ['cc@test.com'],
					message: expect.objectContaining({
						subject: 'Letter of Recommendation Request',
						text: expect.stringContaining('Pin: 123456'),
						html: expect.stringContaining('<strong>Link:</strong> <a href="http://upload.link">Ready to Submit?</a>'),
					}),
				})
			);
		});
	});

	describe('pushNotice', () => {
		it('sends a notification email', async () => {
			const user = { id: 'user-1', firstName: 'Test', lastName: 'User', email: 'test@example.com' };
			const data = { award: { type: 'Test Grant', amount: '$500' } };

			await pushNotice(ContactTemplate.appApproved, user, data);

			expect(getConfigFromDb).toHaveBeenCalled();
			expect(unsubscribeLink).toHaveBeenCalledWith('user-1');
			expect(setDoc).toHaveBeenCalledWith(
				'mockDocRef',
				expect.objectContaining({
					to: 'Test User <test@example.com>',
					from: 'system@test.com',
					message: expect.objectContaining({
						subject: 'Application Approved: Test Grant',
						text: 'Congrats! You got $500. Best regards, Test Board',
					}),
				})
			);
		});
	});

	describe('templates', () => {
		it('should export the templates array correctly', () => {
			expect(Array.isArray(templates)).toBe(true);
			expect(templates.length).toBeGreaterThan(0);
			const firstTemplate = templates[0];
			expect(firstTemplate.title).toBe('Canned Notifications');
			expect(firstTemplate.options[0].name).toBe(ContactTemplate.welcome);
		});
	});
});
