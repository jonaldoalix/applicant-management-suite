import React, { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CollapsableTable from './Table';
import { useTheme } from '../../context/ThemeContext';
import * as firebase from '../../config/data/firebase';

// --- Mocks ---
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../config/data/firebase', () => ({
	getCollectionData: jest.fn(),
	getApplication: jest.fn(),
	getAwardsData: jest.fn(),
}));
jest.mock('../interviews/AttachmentViewer', () => () => <div data-testid='attachment-viewer' />);
jest.mock('../notes/NotesSection', () => () => <div data-testid='notes-section' />);

const mockUseTheme = useTheme;
const mockGetApplication = firebase.getApplication;
const mockGetCollectionData = firebase.getCollectionData;
const mockGetAwardsData = firebase.getAwardsData;

// --- Comprehensive Mock Data ---
const mockAppData = {
	app: {
		id: 'app1',
		type: 'Scholarship',
		window: '2024-12-31T23:59:59Z',
		status: 'Submitted',
		submittedOn: '2024-10-01T10:00:00Z',
		completedBy: 'user1',
		profile: 'prof1',
		family: 'fam1',
		education: 'edu1',
		experience: 'scout1',
		expenses: 'exp1',
		incomes: 'inc1',
		contributions: 'contrib1',
		projections: 'proj1',
		attachments: 'attach1',
		awards: ['award1'],
	},
	profile: {
		applicantFirstName: 'John',
		applicantMiddleInitial: 'M',
		applicantLastName: 'Doe',
		applicantDOB: '2000-01-01T05:00:00Z',
		applicantMailingAddress: { description: '123 Main St' },
		applicantCellPhone: '555-1234',
		applicantEmailAddress: 'john@test.com',
	},
	family: { familyMembers: [{ fullName: 'Jane Doe', occupation: 'Lawyer', age: '45', relation: 'Mother' }] },
	// --- THIS IS THE FIX ---
	// Using '2025-06-01' ensures new Date() parses it as local time in 2025,
	// preventing the timezone bug where new Date('2025') becomes 2024.
	education: { schoolName: 'Test University', major: 'CS', expectedGraduationDate: '2025-06-01', currentGPA: '4.0', previousSchools: ['Test High'] },
	experience: { currentUnit: 0, collegeReservesFlag: false, experiences: [{ type: 'Troop', number: '123', location: 'Anytown, USA', highestRank: 'Eagle' }] },
	expenses: { tuitionCost: '1000', roomAndBoardCost: '500', bookCost: '100', commutingCost: '50', otherExpenses: [] },
	incomes: { summerEarnings: '100', fallEarnings: '100', winterEarnings: '100', springEarnings: '100', earningsAppliedToEducation: '10', savingsAppliedToEducation: '10', collegeAward: '10', loansAmount: '10', otherIncomeSources: [] },
	contributions: { p1ExpectedAnnualIncome: '1000', p2ExpectedAnnualIncome: '1000', parentInvestmentIncome: '10', parentsOwnOrRentHome: 'Own', parentsMaritalStatus: 'Married', anyExtraordinaryExpenses: 'None', siblingSchools: [] },
	projections: { applicantEarnings: '10', applicantSavings: '10', applicantFamily: '10', requestForPF: '10' },
	attachments: { applicantPersonalLetter: { home: 'http://test.com/letter' } },
	awards: [{ awardID: '1', awardAmount: '1000', createdOn: '2024-11-01T10:00:00Z', type: 'Grant', message: 'Congrats' }],
};

describe('CollapsableTable', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockUseTheme.mockReturnValue({ darkMode: false });

		// Mock main application fetch
		mockGetApplication.mockResolvedValue(mockAppData.app);

		// Mock awards fetch
		mockGetAwardsData.mockResolvedValue(mockAppData.awards);

		// Mock getCollectionData to return the correct object based on docId
		mockGetCollectionData.mockImplementation((userId, collectionName, docId) => {
			// Switch on the document ID, which is unique and provided in the mock app object
			switch (docId) {
				case 'prof1':
					return Promise.resolve(mockAppData.profile);
				case 'fam1':
					return Promise.resolve(mockAppData.family);
				case 'edu1':
					return Promise.resolve(mockAppData.education);
				case 'scout1':
					return Promise.resolve(mockAppData.experience);
				case 'exp1':
					return Promise.resolve(mockAppData.expenses);
				case 'inc1':
					return Promise.resolve(mockAppData.incomes);
				case 'contrib1':
					return Promise.resolve(mockAppData.contributions);
				case 'proj1':
					return Promise.resolve(mockAppData.projections);
				case 'attach1':
					return Promise.resolve(mockAppData.attachments);
				default:
					return Promise.resolve(null); // Default case
			}
		});
	});

	test('renders table and expands row', async () => {
		await act(async () => {
			render(<CollapsableTable data={['app1']} attachments={true} />);
		});

		// Check header
		expect(screen.getByText('Application Type')).toBeInTheDocument();

		// Check Row Content (async load)
		await waitFor(() => {
			expect(screen.getByText('Scholarship')).toBeInTheDocument();
			expect(screen.getByText('Submitted')).toBeInTheDocument();
			// Check calculated school/year
			expect(screen.getByText('Test University | 2025')).toBeInTheDocument();
		});

		// Expand Row
		const expandBtn = screen.getByRole('button', { name: 'expand row' });
		await act(async () => {
			fireEvent.click(expandBtn);
		});

		// Check Detail Content
		await waitFor(() => {
			expect(screen.getByText('Profile')).toBeInTheDocument();
			expect(screen.getByText('John M Doe')).toBeInTheDocument();
			// Check that family data also rendered
			expect(screen.getByText('Family')).toBeInTheDocument();
			expect(screen.getByText('Jane Doe')).toBeInTheDocument();
			// Check that extra details (attachments/notes) rendered
			expect(screen.getByTestId('notes-section')).toBeInTheDocument();
			expect(screen.getByTestId('attachment-viewer')).toBeInTheDocument();
		});
	});

	test('renders loading state in row', async () => {
		mockGetApplication.mockImplementation(() => new Promise(() => {})); // Pending
		await act(async () => {
			render(<CollapsableTable data={['app1']} />);
		});
		expect(screen.getByRole('progressbar')).toBeInTheDocument();
	});
});
