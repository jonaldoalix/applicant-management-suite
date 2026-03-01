import { dialogConfig } from './dialogConfig';
import { ApplicationStatus, InterviewStatus, UserType } from '../data/collections';

// Mock collections
jest.mock('../data/collections', () => ({
	ApplicationStatus: {
		started: 'Started',
		submitted: 'Submitted',
		eligible: 'Eligible',
	},
	InterviewStatus: {
		scheduled: 'Scheduled',
		completed: 'Completed',
	},
	UserType: {
		applicant: 'applicant',
	},
}));

describe('dialogConfig.js', () => {
	it('should have correct static titles and messages', () => {
		expect(dialogConfig.confirmAction.title).toBe('Please Confirm Action');
		expect(dialogConfig.markEligibility.message).toContain('Did you want to make this applicant eligible');
	});

	it('should generate correct options for changeAppStatus', () => {
		const appStatusInput = dialogConfig.changeAppStatus.inputs.find((i) => i.name === 'status');
		expect(appStatusInput).toBeDefined();
		expect(appStatusInput.options).toEqual([
			{ value: 'Started', label: 'Started' },
			{ value: 'Submitted', label: 'Submitted' },
			{ value: 'Eligible', label: 'Eligible' },
		]);
	});

	it('should generate correct options for changeInterviewStatus', () => {
		const interviewStatusInput = dialogConfig.changeInterviewStatus.inputs.find((i) => i.name === 'status');
		expect(interviewStatusInput).toBeDefined();
		expect(interviewStatusInput.options).toEqual([
			{ value: 'Scheduled', label: 'Scheduled' },
			{ value: 'Completed', label: 'Completed' },
		]);
	});

	it('should correctly define conditional logic for notificationsUpdate', () => {
		const forwardEmailsInput = dialogConfig.notificationsUpdate.inputs.find((i) => i.name === 'forwardingEnabled');
		expect(forwardEmailsInput).toBeDefined();

		// Should be hidden for applicant
		expect(forwardEmailsInput.condition({ userType: UserType.applicant })).toBe(false);
		// Should be visible for non-applicant
		expect(forwardEmailsInput.condition({ userType: 'member' })).toBe(true);
	});

	it('should have correct inputs for purgeUserData', () => {
		const purgeInputs = dialogConfig.purgeUserData.inputs;
		expect(purgeInputs.find((i) => i.name === 'userId')).toBeDefined();
		expect(purgeInputs.find((i) => i.name === 'expel')).toBeDefined();
		expect(purgeInputs.find((i) => i.name === 'expel').defaultValue).toBe(false);
	});
});
