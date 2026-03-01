/**
 * STATIC CONTENT CONFIGURATION (CMS)
 * ---------------------------------------------------------------------------
 * This file serves as the "Copy Deck" for the application.
 * It contains all the static text, labels, instructions, and marketing copy
 * displayed on the public-facing pages (Home, Login, Register, Dashboard).
 *
 * * WHY EDIT THIS FILE?
 * - To change the "Welcome" text on the landing page.
 * - To update the instructions for the Application Wizard.
 * - To modify the Login/Register form labels.
 * - To change the "Contact Sales" information.
 */

import { paths } from '../navigation/paths';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { Assets, brand } from '../Constants';

// --- 1. Landing Page (Public Home) ---

/**
 * Configuration for the main Landing Page.
 * Controls the Hero section, Navigation Bar, Info Tabs, and Footer.
 */
export const homePageContent = {
	// Top Hero Section (Image & Welcome Text)
	intro: {
		enabled: true,
		backgroundImages: {
			light: Assets.heroLM,
			dark: Assets.heroDM,
		},
		externalLink: {
			enabled: true,
			label: 'Full Stack Boston', // Text for the external link (top right)
			url: 'https://fullstackboston.com',
		},
		welcomeText: {
			enabled: true,
			line1: 'Welcome to the',
			line2: brand.organizationName, // e.g. "Application Management Suite"
		},
		windowInfo: {
			enabled: true, // Shows the "Application Window: Open/Closed" widget
		},
		scrollFab: {
			enabled: true,
			label: 'Discover the Platform', // Text for the "Scroll Down" button
		},
	},

	// Top Navigation Bar
	appBar: {
		enabled: true,
		organizationName: {
			long: brand.organizationName.toUpperCase(),
			short: `${brand.organizationShortName} DEMO`,
		},
		// Links displayed in the Navbar
		navLinks: [
			{ type: 'scroll', label: 'Platform Overview', index: 0 },
			{ type: 'scroll', label: 'Workflow Types', index: 1 },
			{ type: 'scroll', label: 'Contact Sales', index: 2 },
			{ type: 'navigate', label: 'Start Demo', path: paths.registerApplicant },
			{ type: 'navigate', label: 'Login', path: paths.login },
		],
		themeToggle: { enabled: true }, // Show Light/Dark mode switch
		authLink: { enabled: true }, // Show Login/Logout button
	},

	// Main Content Area (Tabs & Information)
	information: {
		enabled: true,
		mainTitle: 'Streamline Your Grant & Scholarship Administration',
		tabs: [
			// Tab 1: General Platform Info
			{
				label: 'Platform Overview',
				content: {
					title: 'About the Suite',
					paragraphs: [
						'The Application Management Suite (AMS) by Full Stack Boston is a robust, secure, and scalable platform designed to modernize how organizations collect, review, and administer applications. Whether you are managing scholarships, community grants, or fellowship programs, AMS reduces administrative overhead while providing a seamless experience for your applicants.',
						'Our suite replaces disjointed paper trails and email chains with a centralized dashboard. Administrators can define custom requirements, automate communication, and coordinate review committees—all from one intuitive interface.',
						"Security and privacy are at the core of AMS. Built on Google Cloud's Firebase infrastructure, the platform ensures that sensitive applicant data—from financial aid reports to personal transcripts—is encrypted and accessible only to authorized personnel.",
						'Key capabilities include:',
						'"Dynamic Workflow Engine: Tailor the application process for different cohorts. Create distinct paths for new applicants, returning grantees, or multi-year scholarship recipients without managing separate systems."',
						'"Integrated Review Tools: Empower your committee members with dedicated review portals. Assign applications, score candidates based on custom rubrics, and deliberate in real-time with integrated video conferencing."',
						'This demo environment showcases the full lifecycle of an application. Feel free to register a test account, submit a mock application, and experience the efficiency of modern grant management firsthand.',
					],
				},
			},
			// Tab 2: Workflow Demonstrations (Nested Tabs)
			{
				label: 'Workflow Types',
				content: {
					childTabs: [
						{
							label: 'Standard Grant',
							content: {
								title: 'Standard Intake Workflow',
								introParagraphs: ['This workflow demonstrates a typical intake process for <strong>new applicants</strong>. It requires comprehensive data collection, including demographics, file attachments, and external recommendations. In a live environment, this workflow acts as the primary funnel for your program.'],
								deadlineMessage: 'Applications for this cycle must be finalized by',
								requirements: [
									{ title: 'Personal Statement', description: 'Demonstrate the rich text editor capabilities for applicant essays and personal narratives.' },
									{ title: 'External Recommendations', description: 'Automate the collection of letters from teachers, mentors, or community leaders via secure upload links.' },
									{ title: 'Academic Transcripts', description: 'Securely upload and store PDF transcripts with preview capabilities for reviewers.' },
									{ title: 'Financial Aid Reporting', description: 'Collect sensitive financial data (like FAFSA/SAR) with enterprise-grade encryption.' },
									{ title: 'Proof of Eligibility', description: 'Configure custom validation rules to ensure applicants meet your specific criteria before applying.' },
								],
								applyNowSection: {
									enabled: true,
									title: 'Try the Demo',
									paragraphs: ['Experience the applicant journey yourself. Create a test account to start a new application.<br /><br /><strong>Feature Highlight: Autosave & Progress Tracking are enabled.</strong>'],
									buttons: [
										{ label: 'Create Test Account', path: paths.registerApplicant },
										{ label: 'Login to Dashboard', path: paths.login },
									],
								},
							},
						},
						{
							label: 'Renewal Request',
							content: {
								title: 'Renewal Workflow',
								introParagraphs: ['The Renewal workflow is optimized for <strong>returning users</strong>. It pre-fills data from previous years, reducing friction for applicants and ensuring data consistency for your records. Ideal for multi-year grants or annual funding cycles.'],
								deadlineMessage: 'Renewal requests must be submitted by',
								requirements: [
									{ title: 'Impact Statement', description: 'Ask returning grantees to update you on their progress and how previous funding was utilized.' },
									{ title: 'Updated Transcripts', description: 'Collect only the new necessary documentation, skipping previously submitted baseline data.' },
									{ title: 'Streamlined Review', description: 'Renewals can be routed to a simplified review queue for faster processing.' },
								],
								applyNowSection: {
									enabled: true,
									title: 'Test the Workflow',
									paragraphs: ['Log in to see how the system handles returning user data.<br /><br /><strong>Feature Highlight: Pre-filled forms reduce abandonment rates.</strong>'],
									buttons: [{ label: 'Go To Applicant Dashboard', path: paths.login }],
								},
							},
						},
						{
							label: 'Compliance Check-In',
							content: {
								title: 'Compliance Workflow',
								introParagraphs: ['This workflow demonstrates a <strong>lightweight check-in</strong> for multi-year scholarship recipients. It ensures compliance with program terms (e.g., maintaining GPA) without requiring a full application re-submission.'],
								deadlineMessage: 'Check-ins must be completed by',
								requirements: [
									{ title: 'Status Update', description: 'A brief form to confirm enrollment status, contact details, and program compliance.' },
									{ title: 'Verification Documents', description: 'Upload current semester grades or proof of enrollment.' },
								],
								applyNowSection: {
									enabled: true,
									title: 'View Check-In Process',
									paragraphs: ['See how easy it is for long-term recipients to maintain their status.<br /><br /><strong>Feature Highlight: Automated reminders ensure timely compliance.</strong>'],
									buttons: [{ label: 'Go To Applicant Dashboard', path: paths.login }],
								},
							},
						},
					],
				},
			},
			// Tab 3: Contact Info
			{
				label: 'Contact Sales',
				content: {
					title: 'Get in Touch',
					subtitle: 'Interested in deploying AMS for your organization? Contact Full Stack Boston today.',
					address: {
						enabled: true,
						title: 'Headquarters',
						lines: ['Full Stack Boston', '100 High Street', 'Boston, MA 02110', 'United States'],
					},
					emails: {
						enabled: true,
						title: 'Department Emails',
						items: [
							{ label: 'Sales & Inquiries', configKey: 'MAIL_TO_GENERAL_EMAIL' },
							{ label: 'Technical Support', configKey: 'MAIL_TO_WEBMASTER' },
							{ label: 'Partnerships', configKey: 'MAIL_TO_CHAIRMAN' },
						],
					},
					phones: {
						enabled: true,
						title: 'Phone Support',
						items: [
							{ label: 'Sales Team', configKey: 'TEL_GENERAL' },
							{ label: '24/7 Support Line', configKey: 'TEL_WEBMASTER' },
						],
					},
				},
			},
		],
		// Bottom "Call to Action" sections
		bottomSections: {
			enabled: true,
			supportUs: {
				enabled: true,
				title: 'Custom Solutions',
				paragraphs: ['Every organization has a unique process. AMS is built to be flexible. We offer custom implementation services to tailor the workflow, data collection, and branding to your specific needs.', 'Whether you are a small non-profit or a large university department, we can scale the infrastructure to match your volume.'],
				mailTo: {
					title: 'Contact us for a consultation at',
					lines: ['Full Stack Boston', 'Attn: Enterprise Sales', '100 High Street', 'Boston, MA 02110'],
				},
			},
			applyNow: {
				enabled: true,
				title: 'Start Your Trial',
				paragraph: 'Ready to see the platform in action? Create a demo applicant account to walk through the intake process, or contact us to schedule a full administrative walkthrough.',
				button: {
					label: 'Access Demo Portal',
					path: paths.login,
				},
			},
		},
	},

	// Footer Content
	footer: {
		enabled: true,
		organizationName: {
			long: brand.organizationName.toUpperCase(),
			short: brand.organizationShortName,
		},
		scrollToTopButton: {
			enabled: true,
			labels: { long: 'Back to Top', short: 'Up' },
		},
		themeToggle: { enabled: true },
		authLink: { enabled: true },
		copyright: {
			enabled: true,
			line1: `${brand.organizationName} | Powered by ${brand.broughtToYouBy}`,
			startYear: 2023,
		},
	},
};

// --- 2. Applicant Registration Page ---

/**
 * Text and Labels for the Applicant Sign-Up Form.
 */
export const applicantRegistrationContent = {
	title: 'Create Demo Account',
	icon: <PersonOutlinedIcon />,
	fields: [
		{ component: 'ProfilePictureUpload', name: 'picture' },
		{ component: 'TextField', name: 'firstName', label: 'First Name', required: true, autoComplete: 'given-name', autoFocus: true, margin: 'dense' },
		{ component: 'TextField', name: 'lastName', label: 'Last Name', required: true, autoComplete: 'family-name', margin: 'dense' },
		{ component: 'TextField', name: 'callMe', label: 'Preferred Name', required: true, autoComplete: 'nickname', margin: 'dense' },
		{ component: 'TextField', name: 'email', label: 'Email Address', type: 'email', required: true, autoComplete: 'email', margin: 'dense' },
		{ component: 'TextField', name: 'password', label: 'Password', type: 'password', required: true, autoComplete: 'new-password', margin: 'dense' },
		{ component: 'TextField', name: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true, autoComplete: 'new-password', margin: 'dense' },
	],
	buttons: [
		{ id: 'submit', label: 'Register Account', type: 'submit', variant: 'outlined', fullWidth: true },
		{ id: 'home', label: 'Cancel', variant: 'outlined', fullWidth: true, navigationPath: paths.home },
	],
	links: [{ id: 'signIn', label: 'Already have an account? Sign In', navigationPath: paths.login }],
};

// --- 3. Login Page ---

/**
 * Text and Labels for the Login Form.
 */
export const loginContent = {
	title: `${brand.organizationShortName} Portal Login`,
	icon: <LockOutlinedIcon />,
	fields: [
		{ component: 'TextField', name: 'email', label: 'Email Address', required: true, fullWidth: true, id: 'email', autoComplete: 'email', autoFocus: true, margin: 'normal' },
		{ component: 'TextField', name: 'password', label: 'Password', type: 'password', required: true, fullWidth: true, id: 'password', autoComplete: 'current-password', margin: 'normal' },
		{ component: 'Checkbox', name: 'remember', label: 'Remember me' },
	],
	buttons: [
		{ id: 'submit', label: 'Sign In', type: 'submit', variant: 'outlined', fullWidth: true },
		{ id: 'home', label: 'Back to Home', variant: 'outlined', fullWidth: true, navigationPath: paths.home },
	],
	links: [
		{ id: 'forgotPassword', label: 'Forgot password?', action: 'handlePasswordReset' },
		{ id: 'signUp', label: 'New to the demo? Create an account', navigationPath: paths.registerApplicant },
	],
};

// --- 4. Applicant Dashboard (Apply Home) ---

/**
 * Configuration for the Applicant's "Dashboard" where they select a workflow.
 * @param {Object} config - The global system configuration (used to disable apps).
 */
export const getApplyContent = (config) => ({
	title: 'Application Dashboard',
	subtitle: [`Welcome to the ${brand.organizationShortName} Demo Portal. In a live production environment, this text would guide your applicants through your specific process.`, '<br />For this demo, you can choose from three distinct workflow types designed to showcase different system capabilities:<br />', '1. <strong>New Applicant (Standard Grant)</strong>: Full data collection including files and references.', '2. <strong>Returning Grant (Renewal)</strong>: Optimized flow for users with existing data.', '3. <strong>Scholarship Check-In (Compliance)</strong>: Lightweight status update form.', '<br />Please select a workflow below to proceed.<br />', `<br />Need help navigating the demo? Contact ${brand.contactEmail}.`],
	availableApps: [
		{
			type: 'newApplicants',
			path: paths.createApplication,
			disabled: config.NEW_APPLICANT_APPLICATIONS_DISABLED !== false,
			label: 'Start Standard Grant Application',
		},
		{
			type: 'returningGrants',
			path: paths.createApplication,
			disabled: config.RETURNING_APPLICANT_APPLICATIONS_DISABLED !== false,
			label: 'Start Renewal Application',
		},
		{
			type: 'scholarshipRecipients',
			path: paths.createApplication,
			disabled: config.SCHOLARSHIP_RECIPIENT_APPLICATIONS_DISABLED !== false,
			label: 'Start Compliance Check-In',
		},
	],
});
