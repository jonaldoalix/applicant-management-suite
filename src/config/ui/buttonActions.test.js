import { getMemberActions, getApplicantActions, getApplicationActions, getRequestActions } from './buttonActions';
import { paths } from '../navigation/paths';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../data/firebase';

// Mock dependencies
jest.mock('../navigation/paths', () => ({
	paths: {
		contactCenter: 'mock/contact',
		exportApp: 'mock/export/:id',
	},
}));

jest.mock('../data/firebase', () => ({
	auth: { app: 'mock-auth' }, // Mock auth object
}));

jest.mock('firebase/auth', () => ({
	sendPasswordResetEmail: jest.fn(),
}));

// Create mock functions for the handlers passed into the factories
const mockShowAlert = jest.fn();
const mockHandleError = jest.fn();
const mockSetShowNotes = jest.fn();
const mockSetShowSignature = jest.fn();

describe('buttonActions', () => {
	// Reset mocks before each test
	beforeEach(() => {
		jest.clearAllMocks();
		// Reset mock implementation to a successful promise
		sendPasswordResetEmail.mockResolvedValue(true);
	});

	describe('getMemberActions', () => {
		const mockMember = { email: 'member@test.com' };

		it('should return 5 actions', () => {
			// FIXED: Corrected argument order
			const actions = getMemberActions(mockShowAlert, mockHandleError, false, mockSetShowNotes, false, mockSetShowSignature);
			expect(actions).toHaveLength(5);
		});

		it('should handle successful password reset', async () => {
			// FIXED: Corrected argument order
			const actions = getMemberActions(mockShowAlert, mockHandleError, false, mockSetShowNotes, false, mockSetShowSignature);
			const resetAction = actions.find((a) => a.label === 'Send Password Reset Email');

			await resetAction.onClick(mockMember);

			expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'member@test.com');
			expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Reset email sent successfully.', type: 'success' });
			expect(mockHandleError).not.toHaveBeenCalled();
		});

		it('should handle failed password reset', async () => {
			const mockError = new Error('Firebase error');
			sendPasswordResetEmail.mockRejectedValue(mockError); // Simulate a failure

			// FIXED: Corrected argument order
			const actions = getMemberActions(mockShowAlert, mockHandleError, false, mockSetShowNotes, false, mockSetShowSignature);
			const resetAction = actions.find((a) => a.label === 'Send Password Reset Email');

			await resetAction.onClick(mockMember);

			expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'member@test.com');
			expect(mockHandleError).toHaveBeenCalledWith(mockError, 'resetPasswordEmail');
			expect(mockShowAlert).not.toHaveBeenCalled();
		});

		it('should toggle notes from false to true', () => {
			// FIXED: Pass `false` for showNotes (arg 3)
			const actions = getMemberActions(mockShowAlert, mockHandleError, false, mockSetShowNotes, false, mockSetShowSignature);
			const notesAction = actions.find((a) => a.label.includes('Notes'));

			expect(notesAction.label).toBe('Show Notes'); // This should now pass
			notesAction.onClick();
			expect(mockSetShowNotes).toHaveBeenCalledWith(true);
		});

		it('should toggle notes from true to false', () => {
			// FIXED: Pass `true` for showNotes (arg 3)
			const actions = getMemberActions(mockShowAlert, mockHandleError, true, mockSetShowNotes, false, mockSetShowSignature);
			const notesAction = actions.find((a) => a.label.includes('Notes'));

			expect(notesAction.label).toBe('Hide Notes'); // This should now pass
			notesAction.onClick();
			expect(mockSetShowNotes).toHaveBeenCalledWith(false);
		});

		it('should toggle signature', () => {
			// FIXED: Pass `false` for showSignature (arg 5)
			const actions = getMemberActions(mockShowAlert, mockHandleError, false, mockSetShowNotes, false, mockSetShowSignature);
			const sigAction = actions.find((a) => a.label.includes('Signature'));

			expect(sigAction.label).toBe('Show Signature'); // This should now pass
			sigAction.onClick();
			expect(mockSetShowSignature).toHaveBeenCalledWith(true);
		});

		it('should return correct navTo for Contact Member', () => {
			// FIXED: Corrected argument order
			const actions = getMemberActions(mockShowAlert, mockHandleError, false, mockSetShowNotes, false, mockSetShowSignature);
			const contactAction = actions.find((a) => a.label === 'Contact Member');

			expect(contactAction.navTo()).toEqual({ path: paths.contactCenter });
		});
	});

	describe('getApplicantActions', () => {
		// Note: This function has a different signature (4 args)
		it('should return 4 actions', () => {
			const actions = getApplicantActions(mockShowAlert, mockHandleError, false, mockSetShowNotes);
			expect(actions).toHaveLength(4);
		});
	});

	describe('getApplicationActions', () => {
		// Note: This function has a different signature (3 args)
		it('should hide "Add Award" if no member is provided', () => {
			const actions = getApplicationActions(false, mockSetShowNotes, null);
			const addAwardAction = actions.find((a) => a.label === 'Add Award');
			expect(addAwardAction.hide).toBe(true);
		});

		it('should show "Add Award" if a member is provided', () => {
			const actions = getApplicationActions(false, mockSetShowNotes, { id: 'member123' });
			const addAwardAction = actions.find((a) => a.label === 'Add Award');
			expect(addAwardAction.hide).toBe(false);
		});

		it('should return correct navTo for Export', () => {
			const actions = getApplicationActions(false, mockSetShowNotes, null);
			const exportAction = actions.find((a) => a.label.includes('Export'));
			const mockApplication = { id: 'app123' };

			expect(exportAction.navTo(mockApplication)).toEqual({
				path: paths.exportApp,
				params: { id: 'app123' },
			});
		});
	});

	describe('getRequestActions', () => {
		// Note: This function has a different signature (2 args)
		it('should toggle notes', () => {
			const actions = getRequestActions(false, mockSetShowNotes);
			const notesAction = actions.find((a) => a.label.includes('Notes'));

			expect(notesAction.label).toBe('Show Notes');
			notesAction.onClick();
			expect(mockSetShowNotes).toHaveBeenCalledWith(true);
		});
	});
});
