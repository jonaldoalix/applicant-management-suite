import { appFormConfig, memberFormConfig, applicantFormConfig, requestFormConfig, manualUploadFormConfig } from './formConfig';
import { attachmentFields } from '../Constants';
import { ApplicationType } from '../data/collections';

// Mock dependencies
jest.mock('../Constants', () => ({
	attachmentFields: [
		{ key: 'field1', label: 'Field 1', requiredBy: ['New Applicant', 'Returning Grant'] },
		{ key: 'field2', label: 'Field 2', requiredBy: ['New Applicant'] },
		{ key: 'field3', label: 'Field 3', requiredBy: ['Scholarship Recipient'] },
		{ key: 'academicRecommendationLetter', label: 'Academic LOR', requiredBy: ['New Applicant'], requestable: true },
	],
}));

jest.mock('../data/collections', () => ({
	ApplicationType: {
		newApplication: 'New Applicant',
		returningGrant: 'Returning Grant',
		scholarship: 'Scholarship Recipient',
	},
}));

describe('formConfig.js', () => {
	describe('appFormConfig', () => {
		it('should define all app sections', () => {
			expect(appFormConfig.profile).toBeDefined();
			expect(appFormConfig.family).toBeDefined();
			expect(appFormConfig.education).toBeDefined();
			expect(appFormConfig.experience).toBeDefined();
			expect(appFormConfig.expenses).toBeDefined();
			expect(appFormConfig.incomes).toBeDefined();
			expect(appFormConfig.contributions).toBeDefined();
			expect(appFormConfig.projections).toBeDefined();
			expect(appFormConfig.attachments).toBeDefined();
			expect(appFormConfig.confirmation).toBeDefined();
		});

		it('should return correct attachment fields from function', () => {
			const fields = appFormConfig.attachments.fields(ApplicationType.newApplication);
			expect(fields).toHaveLength(3);
			expect(fields[0].name).toBe('attachments.field1');
			expect(fields[1].label).toBe('Field 2');
			expect(fields[2].label).toBe('Academic LOR');
			expect(fields[2].requestable).toBe(true);
		});

		it('should return correct confirmation fields from function', () => {
			const mockData = {
				profile: {},
				family: {},
				education: {},
				experience: {},
				expenses: {},
				incomes: {},
				contributions: {},
				projections: {},
			};
			const fields = appFormConfig.confirmation.fields(ApplicationType.newApplication, mockData);

			// Check for headers
			expect(fields.some((f) => f.type === 'header' && f.label === 'Profile')).toBe(true);
			expect(fields.some((f) => f.type === 'header' && f.label === 'Family')).toBe(true);
			expect(fields.some((f) => f.type === 'header' && f.label === 'Education')).toBe(true);
			expect(fields.some((f) => f.type === 'header' && f.label === 'Experience')).toBe(true); // Updated
			expect(fields.some((f) => f.type === 'header' && f.label === 'Attachments')).toBe(true);

			// Check for a profile field
			expect(fields.some((f) => f.name === 'profile.applicantFirstName')).toBe(true);
		});

		it('should conditionally hide sections in confirmation', () => {
			const mockData = {
				profile: {}, // Only profile
			};
			const fields = appFormConfig.confirmation.fields(ApplicationType.scholarship, mockData);

			// Should HAVE profile
			expect(fields.some((f) => f.type === 'header' && f.label === 'Profile')).toBe(true);
			// Should NOT have family
			expect(fields.some((f) => f.type === 'header' && f.label === 'Family')).toBe(false);
			// Should HAVE attachments (always shown)
			expect(fields.some((f) => f.type === 'header' && f.label === 'Attachments')).toBe(true);
		});
	});

	describe('memberFormConfig', () => {
		it('should have correct title and fields', () => {
			expect(memberFormConfig.title).toBe('Member Attributes & Permissions');
			expect(memberFormConfig.fields[0].name).toBe('picture');
			expect(memberFormConfig.fields.some((f) => f.name === 'permissions')).toBe(true);
		});
	});

	describe('applicantFormConfig', () => {
		it('should have correct title and fields', () => {
			expect(applicantFormConfig.title).toBe('Applicant Attributes');
			expect(applicantFormConfig.fields[0].name).toBe('picture');
			expect(applicantFormConfig.fields.some((f) => f.name === 'email')).toBe(true);
			// Verify 'organization' exists instead of 'unit'
			expect(applicantFormConfig.fields.some((f) => f.name === 'organization')).toBe(true);
		});
	});

	describe('requestFormConfig', () => {
		it('should have correct title and fields', () => {
			expect(requestFormConfig.title).toBe('Recommendation Request Details');
			expect(requestFormConfig.fields[0].name).toBe('name');
			expect(requestFormConfig.fields.some((f) => f.name === 'applicationID')).toBe(true);
		});
	});

	describe('manualUploadFormConfig', () => {
		it('should have correct title and fields', () => {
			expect(manualUploadFormConfig.title).toBe('Manual Attachment Uploader');
			expect(manualUploadFormConfig.fields[0].name).toBe('applicantId');
			expect(manualUploadFormConfig.fields.some((f) => f.name === 'file')).toBe(true);
		});
	});
});
