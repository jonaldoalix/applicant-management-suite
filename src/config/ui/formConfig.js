/**
 * FORM CONFIGURATION & SCHEMA
 * ---------------------------------------------------------------------------
 * This file defines the structure, fields, and validation rules for all
 * dynamic forms in the application.
 * * * HOW IT WORKS:
 * The 'GenericFormPage' and other form components read these objects to render
 * UI inputs automatically. This allows you to add/remove fields without writing JSX.
 * * * CONFIGURATION SCHEMA:
 * - intro: { title, description } - displayed at the top of the form page.
 * - layout: Defines the grid structure (e.g., { fields: 'left', arrayForm: 'right' }).
 * - fields: Array of input definitions.
 * - name: The key in the data object (e.g., 'firstName').
 * - label: The visible label text.
 * - type: 'text' | 'number' | 'date' | 'dropdown' | 'file' | 'calculatedLabel'.
 * - validator: String ID of a validation function (defined in Validation.js).
 * - required: Boolean.
 * - arrayField: Configuration for list-based data (e.g., siblings, expenses).
 * - cardDisplay: Which fields to show on the summary card items.
 */

import { attachmentFields } from '../Constants';

// --- Helpers ---

/**
 * Dynamically generates file upload fields based on the Application Type.
 * e.g., Only requires 'Service Letter' if the type is 'New Applicant'.
 */
const getAttachmentFieldsForForm = (appType) => {
	return attachmentFields
		.filter((field) => field.requiredBy.includes(appType))
		.map((field) => ({
			name: `attachments.${field.key}`,
			label: field.label,
			type: 'file',
			required: true,
			requestable: ['academicRecommendationLetter', 'religiousRecommendationLetter', 'serviceRecommendationLetter'].includes(field.key),
		}));
};

/**
 * Generates read-only labels for the "Confirmation/Review" step.
 */
const getAttachmentFieldsForConfirmation = (appType) => {
	return attachmentFields
		.filter((field) => field.requiredBy.includes(appType))
		.map((field) => ({
			name: `attachments.${field.key}`,
			label: field.label,
			type: 'label',
			valueFormatter: 'attachmentChip',
		}));
};

// --- 1. Main Application Wizard ---

export const appFormConfig = {
	// -- Section 1: Personal Info --
	profile: {
		intro: { title: 'Profile', description: 'Enter your personal details.' },
		fields: [
			{ name: 'applicantFirstName', label: 'First Name', type: 'text', required: true, validator: 'lettersOnly' },
			{ name: 'applicantMiddleInitial', label: 'Middle Initial', type: 'text', validator: 'lettersOnly' },
			{ name: 'applicantLastName', label: 'Last Name', type: 'text', required: true, validator: 'lettersOnly' },
			{ name: 'applicantDOB', label: 'Date of Birth', type: 'date', required: true, dateFormat: 'MM/DD/YYYY' },
			{ name: 'applicantMailingAddress', label: 'Mailing Address', type: 'address', required: true },
			{ name: 'applicantHomePhone', label: 'Home Phone', type: 'text', validator: 'numbersOnly' },
			{ name: 'applicantCellPhone', label: 'Cell Phone', type: 'text', required: true, validator: 'numbersOnly' },
			{ name: 'applicantEmailAddress', label: 'Email Address', type: 'text', required: true, validator: 'emailsOnly' },
		],
	},

	// -- Section 2: Family --
	// Layout: List of family members on the left, Add/Edit form on the right.
	family: {
		intro: { title: 'Family', description: 'Provide your family details.' },
		layout: { arrayList: 'left', arrayForm: 'right' },
		arrayField: {
			name: 'familyMembers',
			label: 'Family Members',
			prompt: 'Add a relative and they will appear here.',
			required: true,
			cardDisplay: { title: 'fullName', subtitle: 'relation', details: ['age', 'occupation'] },
			fields: [
				{ name: 'fullName', label: 'Full Name', type: 'text', required: true, validator: 'lettersAndSpacesOnly' },
				{ name: 'relation', label: 'Relation to You', type: 'dropdown', required: true, options: ['Mother', 'Father', 'Guardian', 'Sibling', 'Other'] },
				{ name: 'age', label: 'Age', type: 'number', required: true, validator: 'numbersOnly' },
				{ name: 'occupation', label: 'Occupation', type: 'text', validator: 'lettersAndSpacesOnly' },
			],
		},
	},

	// -- Section 3: Education --
	education: {
		intro: { title: 'Education', description: 'Provide your education history.' },
		layout: { fields: 'left', arrayForm: 'right', arrayList: 'right' },
		fields: [
			{ name: 'schoolName', label: 'College/University Enrolled In', type: 'text', required: true, validator: 'lettersAndSpacesOnly' },
			{ name: 'major', label: 'Major', type: 'text', required: true, validator: 'lettersAndSpacesOnly' },
			{ name: 'expectedGraduationDate', label: 'Expected Graduation', type: 'date', required: true, dateFormat: 'MM/YYYY' },
			{ name: 'currentGPA', label: 'Current GPA', type: 'number', required: true, validator: 'decimalsOnly' },
		],
		arrayField: {
			name: 'previousSchools',
			label: 'Previous Schools (HS/College/University)',
			prompt: 'Add all previous schools starting with High School and they will appear here.',
			required: true,
			cardDisplay: { title: 'school' },
			fields: [{ name: 'school', label: 'School Name', type: 'text', required: true, validator: 'lettersAndSpacesOnly' }],
		},
	},

	// -- Section 4: Experience --
	experience: {
		intro: { title: 'Experience & Leadership', description: 'Please list your work, volunteer, or leadership experience.' },
		layout: { fields: 'right', arrayList: 'right', arrayForm: 'left' },
		fields: [{ name: 'currentOrganization', label: 'Select Current Organization', type: 'dropdown', required: true, validator: 'notUndefined', optionsSource: 'positions' }],
		arrayField: {
			name: 'positions',
			label: 'Experience History',
			required: true,
			prompt: 'Add your positions and they will appear here.',
			cardDisplay: { title: 'organization', subtitle: 'role', details: ['type', 'location'] },
			fields: [
				{ name: 'type', label: 'Organization Type', type: 'dropdown', required: true, options: ['Non-Profit', 'Corporate', 'Educational', 'Community', 'Athletic', 'Other'] },
				{ name: 'organization', label: 'Organization Name', type: 'text', required: true },
				{ name: 'location', label: 'City, State', type: 'text', required: true, validator: 'locationOnly' },
				{ name: 'role', label: 'Role / Title', type: 'text', required: true },
			],
		},
	},

	// -- Section 5: Expenses --
	expenses: {
		intro: { title: 'Your Projected Expenses', description: 'Please list the cost of tuition, room and board, books...' },
		layout: { fields: 'left', arrayForm: 'right', arrayList: 'right' },
		fields: [
			{ name: 'tuitionCost', label: 'Tuition Costs', type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'roomAndBoardCost', label: 'Room & Board Costs', type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'bookCost', label: 'Book Costs', type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'commutingCost', label: 'Commuting Costs', type: 'number', required: true, validator: 'decimalsOnly' },
		],
		arrayField: {
			name: 'otherExpenses',
			label: 'Other Related Expenses',
			cardDisplay: { title: 'title', subtitle: 'amount' },
			prompt: 'Add any additional expenses and they will appear here.',
			fields: [
				{ name: 'title', label: 'Expense Title', type: 'text', required: true, validator: 'lettersAndSpacesOnly' },
				{ name: 'amount', label: 'Amount', type: 'number', required: true, validator: 'decimalsOnly' },
			],
		},
	},

	// -- Section 6: Incomes --
	incomes: {
		intro: { title: 'Your Income', description: 'List any income you will earn...' },
		layout: { fields: 'left', arrayForm: 'right', arrayList: 'right' },
		fields: [
			{ name: 'summerEarnings', label: 'Summer Earnings', type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'fallEarnings', label: 'Fall Earnings', type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'winterEarnings', label: 'Winter Earnings', type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'springEarnings', label: 'Spring Earnings', type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'earningsAppliedToEducation', label: 'Total Earnings Applied', required: true, type: 'number', validator: 'decimalsOnly' },
			{ name: 'savingsAppliedToEducation', label: 'Total Savings Applied', type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'collegeAward', label: 'Total College Award', type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'loansAmount', label: 'Total Loans', type: 'number', required: true, validator: 'decimalsOnly' },
		],
		arrayField: {
			name: 'otherIncomeSources',
			label: 'Other Income Sources',
			prompt: 'Add any additional income sources and scholarships and they will appear here.',
			cardDisplay: { title: 'title', subtitle: 'amount' },
			fields: [
				{ name: 'title', label: 'Income Source Title', type: 'text', required: true, validator: 'lettersAndSpacesOnly' },
				{ name: 'amount', label: 'Amount', type: 'number', required: true, validator: 'decimalsOnly' },
			],
		},
	},

	// -- Section 7: Contributions --
	contributions: {
		intro: { title: 'Family Contributions', description: 'Provide details about your family’s financial contributions...' },
		layout: { fields: 'left', arrayForm: 'right', arrayList: 'right' },
		fields: [
			{ name: 'p1ExpectedAnnualIncome', label: 'Parent/Guardian 1 Expected Annual Income', type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'p2ExpectedAnnualIncome', label: 'Parent/Guardian 2 Expected Annual Income', type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'parentInvestmentIncome', label: 'Family Investment Income', type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'parentsOwnOrRentHome', label: 'Home Status', type: 'dropdown', required: true, options: ['Own', 'Rent'] },
			{ name: 'parentsMaritalStatus', label: 'Marital Status', type: 'dropdown', required: true, options: ['Married', 'Divorced', 'Single', 'Separated', 'Widowed'] },
			{ name: 'anyExtraordinaryExpenses', label: 'Extraordinary Circumstances', type: 'text', multiline: true, rows: 2 },
		],
		arrayField: {
			name: 'siblingSchools',
			label: 'Sibling Schools',
			prompt: 'Add any schools your siblings are attending and their yearly costs and they will appear here.',
			cardDisplay: { title: 'title', subtitle: 'cost' },
			fields: [
				{ name: 'title', label: 'School Name', type: 'text', required: true, validator: 'lettersAndSpacesOnly' },
				{ name: 'cost', label: 'Cost', type: 'number', required: true, validator: 'decimalsOnly' },
			],
		},
	},

	// -- Section 8: Projections (Calculations) --
	projections: {
		intro: { title: 'Your Projections', description: 'Verify your expenses and income streams to balance your budget.' },
		layout: { fields: 'left' },
		fields: [
			// Calculated Labels: These evaluate the string equation against the current form data.
			{ name: 'totalExpenses', label: 'Total Yearly Expenses', type: 'calculatedLabel', calculatedValue: "expenses.tuitionCost + expenses.roomAndBoardCost + expenses.bookCost + expenses.commutingCost + sumArray(expenses.otherExpenses, 'amount')" },
			{ name: 'applicantEarnings', label: 'Your Applied Earnings', type: 'calculatedLabel', calculatedValue: 'incomes.earningsAppliedToEducation' },
			{ name: 'applicantSavings', label: 'Your Applied Savings', type: 'calculatedLabel', calculatedValue: 'incomes.savingsAppliedToEducation' },
			{ name: 'applicantIncomes', label: 'Loans & Other Sources', type: 'calculatedLabel', calculatedValue: "incomes.collegeAward + incomes.loansAmount + sumArray(incomes.otherIncomeSources, 'amount')" },
			{ name: 'applicantFamily', label: "Your Family's Contribution", type: 'number', required: true, validator: 'decimalsOnly' },
			{ name: 'request', label: 'Request from Grant Fund', type: 'number', required: true, validator: 'decimalsOnly' },
			{
				name: 'totalProjections',
				label: 'Total Projected Contributions',
				type: 'calculatedLabel',
				calculatedValue: "incomes.earningsAppliedToEducation + incomes.savingsAppliedToEducation + incomes.collegeAward + incomes.loansAmount + sumArray(incomes.otherIncomeSources, 'amount') + projections.applicantFamily + projections.request",
			},
			{ name: 'projectionsMatchCheck', label: 'Projections Balanced?', type: 'calculatedLabel', calculatedValue: 'totalExpenses === totalProjections' },
		],
	},

	// -- Section 9: Attachments --
	attachments: {
		intro: { title: 'Attachments', description: 'Please attach or request your required documents.' },
		fields: (appType) => getAttachmentFieldsForForm(appType),
	},

	// -- Section 10: Confirmation --
	confirmation: {
		intro: { title: 'Review & Submit', description: 'Please review your information before submitting.' },
		fields: (appType, applicationData) => {
			const dynamicFields = [];

			// Profile
			dynamicFields.push({ type: 'header', label: 'Profile' }, { name: 'profile.applicantFirstName', label: 'First Name', type: 'label' }, { name: 'profile.applicantLastName', label: 'Last Name', type: 'label' }, { name: 'profile.applicantDOB', label: 'Date of Birth', type: 'label', dateFormat: 'MM/DD/YYYY' }, { name: 'profile.applicantEmailAddress', label: 'Email', type: 'label' }, { name: 'profile.applicantHomePhone', label: 'Home Phone', type: 'label' }, { name: 'profile.applicantCellPhone', label: 'Cell Phone', type: 'label' }, { name: 'profile.applicantMailingAddress', label: 'Mailing Address', type: 'label' });

			if (applicationData.family) {
				dynamicFields.push({ type: 'header', label: 'Family' }, { type: 'summaryList', name: 'family.familyMembers', label: 'Family Members', cardDisplay: { title: 'fullName', subtitle: 'relation', details: ['age', 'occupation'] } });
			}
			if (applicationData.education) {
				dynamicFields.push({ type: 'header', label: 'Education' }, { name: 'education.schoolName', label: 'School', type: 'label' }, { name: 'education.major', label: 'Major', type: 'label' }, { name: 'education.currentGPA', label: 'Current GPA', type: 'label' }, { name: 'education.expectedGraduationDate', label: 'Graduation Date', type: 'label', dateFormat: 'MM/YYYY' }, { type: 'summaryList', name: 'education.previousSchools', label: 'Previous Schools', cardDisplay: { title: 'school' } });
			}

			if (applicationData.experience) {
				dynamicFields.push({ type: 'header', label: 'Experience' }, { type: 'summaryList', name: 'experience.positions', label: 'Positions', cardDisplay: { title: 'organization', subtitle: 'role', details: ['type', 'location'] } });
			}
			if (applicationData.expenses) {
				dynamicFields.push({ type: 'header', label: 'Expenses' }, { name: 'expenses.tuitionCost', label: 'Tuition Cost', type: 'label', valueFormatter: 'currency' }, { name: 'expenses.roomAndBoardCost', label: 'Room & Board Cost', type: 'label', valueFormatter: 'currency' }, { name: 'expenses.bookCost', label: 'Book Cost', type: 'label', valueFormatter: 'currency' }, { name: 'expenses.commutingCost', label: 'Commuting Cost', type: 'label', valueFormatter: 'currency' }, { type: 'summaryList', name: 'expenses.otherExpenses', label: 'Other Expenses', cardDisplay: { title: 'title', subtitle: 'amount' }, subtitleFormatter: 'currency' }, { name: 'totalExpenses', label: 'Total Yearly Expenses', type: 'calculatedLabel', calculatedValue: "expenses.tuitionCost + expenses.roomAndBoardCost + expenses.bookCost + expenses.commutingCost + sumArray(expenses.otherExpenses, 'amount')" });
			}
			if (applicationData.incomes) {
				dynamicFields.push(
					{ type: 'header', label: 'Incomes' },
					{ name: 'incomes.earningsAppliedToEducation', label: 'Earnings Applied to Education', type: 'label', valueFormatter: 'currency' },
					{ name: 'incomes.savingsAppliedToEducation', label: 'Savings Applied to Education', type: 'label', valueFormatter: 'currency' },
					{ name: 'incomes.collegeAward', label: 'College Award', type: 'label', valueFormatter: 'currency' },
					{ name: 'incomes.loansAmount', label: 'Loans Amount', type: 'label', valueFormatter: 'currency' },
					{ type: 'summaryList', name: 'incomes.otherIncomeSources', label: 'Other Income Sources', cardDisplay: { title: 'title', subtitle: 'amount' }, subtitleFormatter: 'currency' },
					{ name: 'totalIncome', label: 'Total Yearly Income', type: 'calculatedLabel', calculatedValue: "incomes.earningsAppliedToEducation + incomes.savingsAppliedToEducation + incomes.collegeAward + incomes.loansAmount + sumArray(incomes.otherIncomeSources, 'amount')" }
				);
			}
			if (applicationData.contributions) {
				dynamicFields.push(
					{ type: 'header', label: 'Contributions' },
					{ name: 'contributions.p1ExpectedAnnualIncome', label: 'Parent/Guardian 1 Expected Annual Income', type: 'label', valueFormatter: 'currency' },
					{ name: 'contributions.p2ExpectedAnnualIncome', label: 'Parent/Guardian 2 Expected Annual Income', type: 'label', valueFormatter: 'currency' },
					{ name: 'contributions.parentInvestmentIncome', label: 'Family Investment Income', type: 'label', valueFormatter: 'currency' },
					{ name: 'contributions.parentsOwnOrRentHome', label: 'Home Status', type: 'label' },
					{ name: 'contributions.parentsMaritalStatus', label: 'Marital Status', type: 'label' },
					{ name: 'contributions.anyExtraordinaryExpenses', label: 'Extraordinary Circumstances', type: 'label' },
					{ type: 'summaryList', name: 'contributions.siblingSchools', label: 'Sibling Schools', cardDisplay: { title: 'title', subtitle: 'cost' }, subtitleFormatter: 'currency' }
				);
			}
			if (applicationData.projections) {
				dynamicFields.push(
					{ type: 'header', label: 'Projections' },
					{ name: 'totalExpenses', label: 'Total Yearly Expenses', type: 'calculatedLabel', calculatedValue: "expenses.tuitionCost + expenses.roomAndBoardCost + expenses.bookCost + expenses.commutingCost + sumArray(expenses.otherExpenses, 'amount')" },
					{ name: 'totalProjections', label: 'Total Projected Contributions', type: 'calculatedLabel', calculatedValue: 'projections.applicantEarnings + projections.applicantSavings + projections.applicantFamily + projections.request + totalIncome' },
					{ name: 'projections.applicantEarnings', label: 'Earnings Contribution', type: 'calculatedLabel', calculatedValue: 'incomes.earningsAppliedToEducation' },
					{ name: 'projections.applicantSavings', label: 'Savings Contribution', type: 'calculatedLabel', calculatedValue: 'incomes.savingsAppliedToEducation' },
					{ name: 'projections.allOtherIncome', label: 'All Other Income Sources', type: 'calculatedLabel', calculatedValue: "incomes.collegeAward + incomes.loansAmount + sumArray(incomes.otherIncomeSources, 'amount')" },
					{ name: 'projections.applicantFamily', label: 'Family Contribution', type: 'label', valueFormatter: 'currency' },
					{ name: 'projections.request', label: 'Amount Requested', type: 'label', valueFormatter: 'currency' },
					{ name: 'projectionsMatchCheck', label: 'Projections Balanced?', type: 'calculatedLabel', calculatedValue: 'totalExpenses === totalProjections' }
				);
			}

			dynamicFields.push({ type: 'header', label: 'Attachments' }, ...getAttachmentFieldsForConfirmation(appType));

			return dynamicFields;
		},
	},
};

// --- 2. Admin & Member Management ---

export const memberFormConfig = {
	title: 'Member Attributes & Permissions',
	fields: [
		{ name: 'picture', label: 'Profile Picture', type: 'pictureUpload' },
		{ name: 'firstName', label: 'First Name', type: 'text', required: true },
		{ name: 'lastName', label: 'Last Name', type: 'text', required: true },
		{ name: 'position', label: 'Position', type: 'text' },
		{ name: 'since', label: 'Year Joined', type: 'number' },
		{ name: 'cell', label: 'Cell Phone', type: 'text' },
		{ name: 'email', label: 'Email Address', type: 'email', required: true },
		{ name: 'alias', label: 'Alias', type: 'email', disableOn: (permissions) => !permissions?.admin },
		{
			name: 'personalSignature',
			label: 'Personal Email Signature',
			type: 'text',
			multiline: true,
			rows: 4,
			grid: { xs: 12 },
		},
		{
			name: 'permissions',
			label: 'Permissions',
			type: 'permissionGroup',
			groups: {
				'General Permissions': ['admin', 'email', 'push', 'message', 'site', 'finances', 'applications', 'members', 'audit', 'archives', 'login'],
				'Interview Permissions': ['interviews.canHost', 'interviews.canAccess', 'interviews.canSchedule', 'interviews.canDeliberate'],
				'Email Folder Access': ['emails.folders.inbox', 'emails.folders.sent', 'emails.folders.spam', 'emails.folders.trash', 'emails.folders.archive', 'emails.folders.outbox', 'emails.folders.applications'],
				'Email Alias Access': ['emails.aliases.admin', 'emails.aliases.webmaster', 'emails.aliases.applications', 'emails.aliases.committee', 'emails.aliases.inquiries', 'emails.aliases.chairman', 'emails.aliases.noreply', 'emails.aliases.test', 'emails.aliases.hello', 'emails.aliases.help'],
			},
		},
	],
};

// --- 3. Applicant Profile Editing (Admin View) ---

export const applicantFormConfig = {
	title: 'Applicant Attributes',
	fields: [
		{ name: 'picture', label: 'Profile Picture', type: 'pictureUpload' },
		{ name: 'firstName', label: 'First Name', type: 'text', required: true },
		{ name: 'lastName', label: 'Last Name', type: 'text', required: true },
		{ name: 'callMe', label: 'Display Name', type: 'text' },
		{ name: 'school', label: 'School', type: 'text' },
		{ name: 'gradYear', label: 'Class', type: 'number', placeholder: 'YYYY' },
		{ name: 'major', label: 'Major', type: 'text' },
		{ name: 'organization', label: 'Primary Organization', type: 'text' },
		{ name: 'cell', label: 'Cell Phone', type: 'text', required: true },
		{ name: 'email', label: 'Email Address', type: 'email', required: true },
	],
};

// --- 4. Request & Upload Forms ---

export const requestFormConfig = {
	title: 'Recommendation Request Details',
	fields: [
		{ name: 'name', label: 'Recommender Name', type: 'text', required: true },
		{ name: 'email', label: 'Recommender Email', type: 'email', required: true },
		{ name: 'relation', label: 'Relation to Applicant', type: 'text', required: true },
		{
			name: 'attachmentType',
			label: 'LOR Type',
			type: 'dropdown',
			required: true,
		},
		{
			name: 'applicationID',
			label: 'Link to Application',
			type: 'autocomplete',
			required: true,
		},
	],
};

export const manualUploadFormConfig = {
	title: 'Manual Attachment Uploader',
	name: 'manualUpload',
	fields: [
		{
			name: 'applicantId',
			label: 'Select Applicant',
			type: 'autocomplete',
			required: true,
		},
		{
			name: 'applicationId',
			label: 'Select Application',
			type: 'autocomplete',
			required: true,
		},
		{
			name: 'attachmentType',
			label: 'Attachment Type',
			type: 'dropdown',
			required: true,
		},
		{
			name: 'file',
			label: 'File to Upload',
			type: 'singleFile',
			required: true,
		},
	],
};
