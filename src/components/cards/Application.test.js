import React from 'react';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import { Application } from './Application';
import { PDFApplication } from '../pdf/PDFApplication';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate, useParams } from 'react-router-dom';
import * as firebaseConfig from '../../config/data/firebase';
import * as buttonActions from '../../config/ui/buttonActions';
import * as pushConfig from '../../config/content/push';
import { getBlob } from 'firebase/storage';
import { convertPDFBlobToImages } from '../../config/Constants';

// --- Mocks ---
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: jest.fn(),
	useParams: jest.fn(),
}));

jest.mock('../../context/AuthContext');
jest.mock('../../context/DialogContext');
jest.mock('../../context/AlertContext');
jest.mock('../../context/ConfigContext');
jest.mock('../../context/ThemeContext');

// Comprehensive Collections Mock
jest.mock('../../config/data/collections', () => ({
	collections: {
		applicants: 'applicants',
		families: 'families',
		education: 'education',
		experience: 'experience',
		incomes: 'incomes',
		expenses: 'expenses',
		projections: 'projections',
		contributions: 'contributions',
		attachments: 'attachments',
		profiles: 'profiles',
		awards: 'awards',
		applications: 'applications',
		interviews: 'interviews',
	},
	applicationSpecificCollections: ['applications', 'profiles'],
	ApplicationStatus: {
		started: 'Started',
		submitted: 'Submitted',
		reviewing: 'Reviewing',
		approved: 'Approved',
		awarded: 'Awarded',
		rejected: 'Rejected',
	},
	ApplicationType: {
		newApplication: 'New Applicant',
		returningGrant: 'Returning Grant',
		scholarship: 'Scholarship Check In',
	},
	InterviewStatus: {
		scheduled: 'Scheduled',
		invited: 'Invited',
		confirmed: 'Confirmed',
		inProgress: 'In Progress',
		completed: 'Completed',
		cancelled: 'Cancelled',
		missed: 'Missed',
	},
	UserType: { applicant: 'Applicant', member: 'Member', both: 'both' },
	OrganizationTypes: { nonprofit: 'Non-Profit', educational: 'Educational', community: 'Community', athletic: 'Athletic', other: 'Other', none: 'None' },
	SearchableCollections: {},
	UploadType: {},
}));

jest.mock('../../config/data/firebase', () => ({
	getCollectionData: jest.fn(),
	getApplication: jest.fn(),
	getAwardsData: jest.fn(),
	getRealTimeAwardsByIDs: jest.fn(() => () => {}),
	saveCollectionData: jest.fn(),
	storage: {},
}));

jest.mock('../../config/content/push', () => ({
	pushNotice: jest.fn(),
	ContactTemplate: { appApproved: 'appApproved' },
}));

jest.mock('firebase/firestore', () => ({
	serverTimestamp: () => 'mock-timestamp',
}));

jest.mock('firebase/storage', () => ({
	ref: jest.fn(),
	getBlob: jest.fn(),
}));

jest.mock('../../config/Constants', () => ({
	...jest.requireActual('../../config/Constants'),
	convertPDFBlobToImages: jest.fn(),
	attachmentFields: [
		{ key: 'transcript', label: 'Transcript', requiredBy: ['Scholarship Check In'] },
		{ key: 'essay', label: 'Essay', requiredBy: ['Scholarship Check In'] },
		{ key: 'optional', label: 'Optional', requiredBy: [] },
	],
}));

// Mock Child Components
jest.mock('../layout/SingleAssetPage', () => ({
	__esModule: true,
	default: ({ children }) => <div data-testid='single-asset-page'>{children}</div>,
	AssetCard: ({ children }) => <div data-testid='asset-card'>{children}</div>,
}));

jest.mock('../assets/Header', () => ({ title, children }) => (
	<div data-testid='header'>
		<h1>{title}</h1>
		{children}
	</div>
));

jest.mock('../assets/InfoTable', () => ({ data }) => (
	<div data-testid='info-table'>
		{data &&
			data.map((row, i) => (
				<div key={i} data-testid='info-row'>
					<span className='label'>{row.label}</span>: <span className='value'>{row.value}</span>
				</div>
			))}
	</div>
));

jest.mock('../assets/Section', () => ({ title, children }) => (
	<div data-testid={`section-${title}`}>
		<h2>{title}</h2>
		{children}
	</div>
));

jest.mock('../dynamicButtons/DynamicButtons', () => ({ actions, onAction, asset }) => (
	<div data-testid='dynamic-actions'>
		{actions.map((action, index) => (
			<button key={index} onClick={() => onAction(action, asset)}>
				{action.label}
			</button>
		))}
	</div>
));

jest.mock('../loader/Loader', () => () => <div role='progressbar'>Loading...</div>);
jest.mock('../layout/NotFound', () => () => <div>Not Found Page</div>);
jest.mock('../notes/NotesSection', () => () => <div>NotesSection</div>);
jest.mock('../pdf/PDFPreview', () => ({ displayName }) => <div>PDF: {displayName}</div>);

describe('Application Card Component', () => {
	const mockNavigate = jest.fn();
	const mockShowDialog = jest.fn();
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();

	const mockApplication = {
		id: 'app1',
		type: 'Scholarship Check In',
		status: 'Submitted',
		completedBy: 'applicant1',
		family: 'fam1',
		education: 'edu1',
		experience: 'scout1',
		incomes: 'inc1',
		expenses: 'exp1',
		projections: 'proj1',
		contributions: 'contrib1',
		attachments: 'att1',
		awards: ['award1'],
		lastUpdated: '2025-01-01',
	};

	const mockApplicant = { firstName: 'Test', lastName: 'User', callMe: 'T-Bone', school: 'HS', gradYear: '2025-05-01' };
	const mockFamily = { familyMembers: [{ fullName: 'Mom', relation: 'Mother', age: 50, occupation: 'Engineer' }] };
	const mockEducation = { schoolName: 'Test High', currentGPA: 4.0 };
	const mockExperience = {
		experienceRecordID: 'scout1',
		currentOrganization: '0',
		positions: [
			{ type: 'Non-Profit', organization: 'Example Org', location: 'City', role: 'Volunteer' },
			{ type: 'Educational', organization: 'Test School', location: 'City', role: 'Student Leader' },
		],
	};
	const mockIncomes = { summerEarnings: 1000, otherIncomeSources: [{ title: 'Gift', amount: 50 }] };
	const mockExpenses = { tuitionCost: 20000 };
	const mockAttachments = {
		transcript: { home: 'http://link.com', displayName: 'Transcript.pdf' },
		essay: { requestID: 'req123' },
	};
	const mockAwards = [{ id: 'award1', type: 'Scholarship', awardAmount: 1000, createdOn: '2025-01-01' }];

	beforeEach(() => {
		jest.clearAllMocks();
		useNavigate.mockReturnValue(mockNavigate);
		useAuth.mockReturnValue({ member: { id: 'mem1' } });
		useDialog.mockReturnValue({ showDialog: mockShowDialog });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useConfig.mockReturnValue({});
		useTheme.mockReturnValue({ darkMode: false });

		// Robust Firebase Mock
		firebaseConfig.getCollectionData.mockImplementation((uid, collection) => {
			const colKey = collection;
			if (colKey === 'applicants') return Promise.resolve(mockApplicant);
			if (colKey === 'families') return Promise.resolve(mockFamily);
			if (colKey === 'education') return Promise.resolve(mockEducation);
			if (colKey === 'experience') return Promise.resolve(mockExperience);
			if (colKey === 'incomes') return Promise.resolve(mockIncomes);
			if (colKey === 'expenses') return Promise.resolve(mockExpenses);
			if (colKey === 'attachments') return Promise.resolve(mockAttachments);
			return Promise.resolve({});
		});

		firebaseConfig.getRealTimeAwardsByIDs.mockImplementation((ids, setAwards) => {
			setAwards(mockAwards);
			return jest.fn(); // Unsubscribe
		});

		jest.spyOn(buttonActions, 'getApplicationActions').mockReturnValue([
			{ label: 'Change Status', dialogId: 'changeAppStatus' },
			{ label: 'Mark Eligible', dialogId: 'markEligibility' },
			{ label: 'Add Award', dialogId: 'addAward' },
			{ label: 'Nav Action', navTo: () => ({ path: '/test', params: {} }) },
			{ label: 'Click Action', onClick: jest.fn() },
		]);
	});

	// --- Rendering Tests ---
	it('renders all sections correctly after loading', async () => {
		await act(async () => {
			render(<Application application={mockApplication} />);
		});
		await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

		// Basic Info
		expect(screen.getByText('T-Bone')).toBeInTheDocument();
		expect(screen.getByTestId('section-Family')).toBeInTheDocument();
		expect(screen.getByTestId('section-Education')).toBeInTheDocument();
		expect(screen.getByTestId('section-Experience')).toBeInTheDocument();
		expect(screen.getByTestId('section-Financials')).toBeInTheDocument();
		expect(screen.getByTestId('section-Awards')).toBeInTheDocument();
	});

	it('renders attachment chips with correct status colors', async () => {
		await act(async () => {
			render(<Application application={mockApplication} />);
		});
		await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

		const attSection = screen.getByTestId('section-Required Attachments');

		// 1. Uploaded (Transcript) -> Link
		const transcriptChip = within(attSection).getByText('Transcript');
		expect(transcriptChip.closest('a')).toHaveAttribute('href', 'http://link.com');

		// 2. Requested (Essay) -> Warning Label
		expect(within(attSection).getByText('Essay (Requested)')).toBeInTheDocument();
	});

	// --- User Action Tests ---
	describe('User Actions (Dialogs)', () => {
		it('handles Change Status dialog flow', async () => {
			await act(async () => {
				render(<Application application={mockApplication} />);
			});
			await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

			fireEvent.click(screen.getByText('Change Status'));

			expect(mockShowDialog).toHaveBeenCalledWith(expect.objectContaining({ id: 'changeAppStatus' }));

			// Simulate Callback
			const dialogCall = mockShowDialog.mock.calls[0][0];
			await act(async () => {
				await dialogCall.callback({ status: 'Reviewing' });
			});

			expect(firebaseConfig.saveCollectionData).toHaveBeenCalledWith(expect.anything(), 'app1', { status: 'Reviewing' });
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});

		it('handles Mark Eligibility dialog flow', async () => {
			await act(async () => {
				render(<Application application={mockApplication} />);
			});
			await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

			fireEvent.click(screen.getByText('Mark Eligible'));

			const dialogCall = mockShowDialog.mock.calls[mockShowDialog.mock.calls.length - 1][0];
			await act(async () => {
				await dialogCall.callback('Approved');
			});

			expect(firebaseConfig.saveCollectionData).toHaveBeenCalledWith(expect.anything(), 'app1', { status: 'Approved' });

			// FIX: Match against the object structure, not just a string
			expect(mockShowAlert).toHaveBeenCalledWith(
				expect.objectContaining({
					message: expect.stringMatching(/marked as Approved/),
					type: 'success',
				})
			);
		});

		it('handles Add Award dialog flow', async () => {
			await act(async () => {
				render(<Application application={mockApplication} />);
			});
			await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

			fireEvent.click(screen.getByText('Add Award'));

			const dialogCall = mockShowDialog.mock.calls[mockShowDialog.mock.calls.length - 1][0];
			await act(async () => {
				await dialogCall.callback({ awardName: 'Grant', awardAmount: 500 });
			});

			// Should save Award, update App status, and send Push
			expect(firebaseConfig.saveCollectionData).toHaveBeenCalledTimes(2); // Award + App Update
			expect(pushConfig.pushNotice).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: 'Award added successfully!' }));
		});

		it('handles Navigation actions', async () => {
			await act(async () => {
				render(<Application application={mockApplication} />);
			});
			await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

			fireEvent.click(screen.getByText('Nav Action'));
			expect(mockNavigate).toHaveBeenCalled();
		});

		it('handles simple Click actions', async () => {
			await act(async () => {
				render(<Application application={mockApplication} />);
			});
			await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

			fireEvent.click(screen.getByText('Click Action'));
		});
	});

	// --- Error Handling ---
	it('handles data fetch errors gracefully', async () => {
		// Mock a failure for one call
		firebaseConfig.getCollectionData.mockRejectedValueOnce(new Error('Fetch failed'));
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		await act(async () => {
			render(<Application application={mockApplication} />);
		});
		await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

		expect(consoleSpy).toHaveBeenCalledWith('Error fetching application details:', expect.any(Error));
		consoleSpy.mockRestore();
	});
});

describe('PDFApplication (Print View)', () => {
	const mockNavigate = jest.fn();
	const mockUseParams = { id: 'app123' };

	beforeEach(() => {
		jest.clearAllMocks();
		useNavigate.mockReturnValue(mockNavigate);
		useParams.mockReturnValue(mockUseParams);
		useAuth.mockReturnValue({ user: { uid: 'admin' } });
		useTheme.mockReturnValue({ darkMode: false });

		firebaseConfig.getApplication.mockResolvedValue({
			id: 'app123',
			completedBy: 'user1',
			profile: 'prof1',
			attachments: 'att1',
			status: 'Submitted',
			awards: ['award1'],
		});

		firebaseConfig.getCollectionData.mockImplementation((uid, col, id) => {
			if (col === 'attachments') {
				return Promise.resolve({
					doc1: { refLoc: 'path/to/doc.pdf', displayName: 'MyDoc.pdf' },
				});
			}
			return Promise.resolve({}); // Return empty objects for others to prevent crashes
		});

		firebaseConfig.getAwardsData.mockResolvedValue([{ awardID: '1', type: 'Grant', awardAmount: 500, deadline: '2024-01-01' }]);

		getBlob.mockResolvedValue(new Blob(['fake content'], { type: 'application/pdf' }));
		convertPDFBlobToImages.mockResolvedValue(['blob:url/page1']);
		global.URL.createObjectURL = jest.fn(() => 'blob:url/img');

		// Mock window.print
		global.print = jest.fn();
	});

	it('fetches data and renders print view with award history', async () => {
		// Wrapping render in act ensures useEffect calls (data fetching) are initiated properly
		await act(async () => {
			render(<PDFApplication />);
		});
		await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

		expect(screen.getByText('AMS Application')).toBeInTheDocument();
		expect(screen.getByText('Award History')).toBeInTheDocument();
		expect(screen.getByText('$500')).toBeInTheDocument();
	});

	it('handles print button click', async () => {
		await act(async () => {
			render(<PDFApplication />);
		});
		await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument());

		const printBtn = screen.getByText(/Print/i);
		fireEvent.click(printBtn);
		expect(global.print).toHaveBeenCalled();
	});

	it('redirects if user not logged in', async () => {
		useAuth.mockReturnValue({ user: null });
		await act(async () => {
			render(<PDFApplication />);
		});
		expect(mockNavigate).toHaveBeenCalled();
	});

	it('shows Not Found if ID is missing or invalid', async () => {
		useParams.mockReturnValue({}); // No ID
		await act(async () => {
			render(<PDFApplication />);
		});
		await waitFor(() => expect(screen.getByText('Not Found Page')).toBeInTheDocument());
	});
});
