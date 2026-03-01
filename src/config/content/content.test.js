import { paths } from '../navigation/paths.js';

jest.mock('../navigation/paths', () => ({
	paths: {
		registerApplicant: '/register',
		login: '/login',
		home: '/',
		createApplication: '/apply/create/:applicationType',
	},
}));

jest.mock('../Constants', () => ({
	Assets: {
		heroLM: 'light-hero.jpg',
		heroDM: 'dark-hero.jpg',
	},
	brand: {
		organizationName: 'AMS Demo',
		organizationShortName: 'AMS Demo',
		contactEmail: 'demo@fullstackboston.com',
	},
}));

// FIX: Statically import the content file now.
import * as content from './content.js';

// FIX: Define the mock config here for testing
const mockConfig = {
	NEW_APPLICANT_APPLICATIONS_DISABLED: false,
	RETURNING_APPLICANT_APPLICATIONS_DISABLED: true,
	SCHOLARSHIP_RECIPIENT_APPLICATIONS_DISABLED: false,
};

describe('content.js', () => {
	it('should export homePageContent with correct data', () => {
		const { homePageContent } = content;
		expect(homePageContent).toBeDefined();
		expect(homePageContent.intro.welcomeText.line1).toBe('Welcome to the');
		expect(homePageContent.appBar.navLinks).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Start Demo' })]));
	});

	it('should export applicantRegistrationContent with correct fields', () => {
		const { applicantRegistrationContent } = content;
		expect(applicantRegistrationContent).toBeDefined();
		expect(applicantRegistrationContent.title).toBe('Create Demo Account');
		expect(applicantRegistrationContent.fields[0].name).toBe('picture');
	});

	it('should export loginContent with correct fields', () => {
		const { loginContent } = content;
		expect(loginContent).toBeDefined();
		expect(loginContent.title).toContain('AMS Demo Portal Login');
		expect(loginContent.fields[0].name).toBe('email');
	});

	it('should export applyContent and respect config', () => {
		const applyContent = content.getApplyContent(mockConfig);

		expect(applyContent).toBeDefined();
		expect(applyContent.title).toBe('Application Dashboard');

		expect(applyContent.availableApps[0].disabled).toBe(false); // NEW_APPLICANT
		expect(applyContent.availableApps[1].disabled).toBe(true); // RETURNING_APPLICANT
		expect(applyContent.availableApps[2].disabled).toBe(false); // SCHOLARSHIP_RECIPIENT
	});
});
