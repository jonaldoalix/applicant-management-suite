import { applicationConfigurations } from './applicationConfig';
import { collections, ApplicationType } from '../data/collections';
import { templateApp, templateApp2 } from '../data/Validation';

// Mock the dependencies
jest.mock('../data/collections', () => ({
	ApplicationType: {
		newApplication: 'New Applicant',
		returningGrant: 'Returning Grant',
		scholarship: 'Scholarship Check In',
	},
	collections: {
		profiles: 'profiles',
		families: 'families',
		education: 'education',
		experience: 'experience',
		expenses: 'expenses',
		incomes: 'incomes',
		contributions: 'contributions',
		projections: 'projections',
		attachments: 'attachments',
	},
}));

jest.mock('../data/Validation', () => ({
	templateApp: { id: 'mockTemplateApp' },
	templateApp2: { id: 'mockTemplateApp2' },
}));

describe('applicationConfig.js', () => {
	it('should have a configuration for newApplicants', () => {
		const config = applicationConfigurations.newApplicants;
		expect(config).toBeDefined();
		expect(config.title).toBe('Standard Grant Application');
		expect(config.type).toBe(ApplicationType.newApplication);
		expect(config.steps).toEqual(['Profile', 'Family', 'Education', 'Experience', 'Expenses', 'Income', 'Contributions', 'Projections', 'Attachments', 'Confirm']);
		expect(config.dataCollections).toHaveLength(9);
		expect(config.dataCollections[3].collectionName).toBe(collections.experience);
		expect(config.pages).toHaveLength(10);
		expect(config.pages[3].section).toBe('experience');
		expect(config.template).toBe(templateApp);
	});

	it('should have a configuration for returningGrants', () => {
		const config = applicationConfigurations.returningGrants;
		expect(config).toBeDefined();
		expect(config.title).toBe('Grant Renewal Application'); // Updated Title
		expect(config.type).toBe(ApplicationType.returningGrant);
		expect(config.steps).toEqual(['Profile', 'Family', 'Education', 'Experience', 'Expenses', 'Income', 'Contributions', 'Projections', 'Attachments', 'Confirm']);
		expect(config.dataCollections).toHaveLength(9);
		expect(config.pages).toHaveLength(10);
		expect(config.template).toBe(templateApp);
	});

	it('should have a configuration for scholarshipRecipients', () => {
		const config = applicationConfigurations.scholarshipRecipients;
		expect(config).toBeDefined();
		expect(config.title).toBe('Compliance Check-In');
		expect(config.type).toBe(ApplicationType.scholarship);
		expect(config.steps).toEqual(['Profile', 'Education', 'Attachments', 'Confirm']);
		expect(config.dataCollections).toHaveLength(3);
		expect(config.dataCollections[0].collectionName).toBe(collections.profiles);
		expect(config.pages).toHaveLength(4);
		expect(config.pages[0].section).toBe('profile');
		expect(config.template).toBe(templateApp2);
	});
});
