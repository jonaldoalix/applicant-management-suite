import React from 'react';
import { act } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Review from './Review';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useParams } from 'react-router-dom';

import { getApplication, getCollectionData, saveFile, getDownloadLinkForFile, deleteFile, invalidateRequest, saveCollectionData, updateApplicationStatus } from '../../config/data/firebase';
import { sendRequest } from '../../config/content/push';

jest.mock('react-router-dom', () => ({
	useParams: jest.fn(),
	useNavigate: jest.fn(),
	Link: ({ children }) => <div>{children}</div>,
}));

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
jest.mock('../../context/DialogContext', () => ({ useDialog: jest.fn() }));
jest.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/HelmetContext', () => ({ useTitle: jest.fn() }));

jest.mock('../../config/data/firebase', () => ({
	getApplication: jest.fn(),
	getCollectionData: jest.fn(),
	saveFile: jest.fn(),
	getDownloadLinkForFile: jest.fn(),
	deleteFile: jest.fn(),
	invalidateRequest: jest.fn(),
	saveCollectionData: jest.fn(),
	updateApplicationStatus: jest.fn(),
}));

jest.mock('../../config/content/push', () => ({
	sendRequest: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

jest.mock('../../config/data/collections', () => ({
	UploadType: { applicationAttachment: 'app-attachments' },
	ApplicationStatus: { started: 'Started', completed: 'Completed', submitted: 'Submitted', incomplete: 'Incomplete' },
	ApplicationType: { scholarship: 'Scholarship', newApplication: 'New Application', returningGrant: 'Returning Grant' },
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
		requests: 'requests',
	},
}));

jest.mock('../../config/Constants', () => ({
	attachmentFields: [
		{ key: 'testDoc', label: 'Test Document', requiredBy: ['Test App'] },
		{ key: 'recLetter', label: 'Recommendation Letter', requiredBy: ['Test App'] },
	],
	LettersOfRecommendation: {
		recLetter: { name: 'Rec Letter', icon: 'Icon' },
	},
	generateSecurePin: jest.fn(() => 'secure-pin'),
	generate6DigitNumber: jest.fn(() => '123456'),
	generateUploadLink: jest.fn(() => 'http://upload.link'),
}));

jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loading...</div>);
jest.mock('../../components/layout/NotFound', () => () => <div data-testid='not-found'>Not Found</div>);
jest.mock('../../components/footer/CopyrightFooter', () => () => <div>Copyright</div>);
jest.mock('../../components/breadcrumbs/Breadcrumbs', () => () => <div>Breadcrumbs</div>);

jest.mock('../../components/table/Table', () => ({
	FamilyDetails: () => <div data-testid='section-family'>Family Details</div>,
	EducationDetails: () => <div data-testid='section-education'>Education Details</div>,
	ExperienceDetails: () => <div data-testid='section-experience'>Experience Details</div>,
	ExpensesDetails: () => <div data-testid='section-expenses'>Expenses Details</div>,
	IncomesDetails: () => <div data-testid='section-incomes'>Incomes Details</div>,
	ContributionsDetails: () => <div data-testid='section-contributions'>Contributions Details</div>,
	ProjectionsDetails: () => <div data-testid='section-projections'>Projections Details</div>,
}));

jest.mock('../../components/visuallyHiddenInput/VisuallyHiddenInput', () => ({
	__esModule: true,
	VisuallyHiddenInput: (props) => {
		const React = require('react');
		return React.createElement('input', {
			type: 'file',
			'data-testid': `file-input-${props.name}`,
			name: props.name,
			onChange: props.onChange,
		});
	},
}));

describe('Review Component', () => {
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockShowDialog = jest.fn();

	const mockUser = { uid: 'user-123' };
	const appID = 'app-123';

	const mockApplication = {
		id: appID,
		type: 'Test App',
		status: 'Started',
		window: '2025-12-31',
		submittedOn: '2025-01-01',
		completedBy: 'user-123',
		profile: 'prof-1',
		family: 'fam-1',
		education: 'edu-1',
		experience: 'xpr-1',
		expenses: 'exp-1',
		incomes: 'inc-1',
		contributions: 'cont-1',
		projections: 'proj-1',
		attachments: 'att-1',
	};

	const mockProfile = {
		applicantFirstName: 'John',
		applicantLastName: 'Doe',
		applicantDOB: '2000-01-01',
		applicantEmailAddress: 'john@example.com',
		applicantMailingAddress: { description: '123 Main St' },
	};

	const mockAttachments = {
		attachmentsID: 'att-1',
		testDoc: null,
		recLetter: null,
	};

	beforeEach(() => {
		jest.clearAllMocks();

		useParams.mockReturnValue({ id: appID });
		useAuth.mockReturnValue({ user: mockUser });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useDialog.mockReturnValue({ showDialog: mockShowDialog });
		useConfig.mockReturnValue({ APPLICATION_DEADLINE: '2025-12-31' });
		useTheme.mockReturnValue({ darkMode: false });

		getApplication.mockResolvedValue(mockApplication);

		getCollectionData.mockImplementation((uid, collection, docId) => {
			if (collection === 'profiles') return Promise.resolve(mockProfile);
			if (collection === 'attachments') return Promise.resolve(mockAttachments);
			return Promise.resolve({});
		});

		saveFile.mockResolvedValue('file/path.pdf');
		getDownloadLinkForFile.mockResolvedValue('http://file.link');
		saveCollectionData.mockResolvedValue(true);
		updateApplicationStatus.mockResolvedValue(true);
	});

	test('renders loader initially', () => {
		getApplication.mockReturnValue(new Promise(() => {}));
		render(<Review />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('renders Not Found if application does not exist', async () => {
		getApplication.mockResolvedValue(null);
		render(<Review />);
		await waitFor(() => expect(screen.getByTestId('not-found')).toBeInTheDocument());
	});

	test('renders application details successfully', async () => {
		render(<Review />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(screen.getByText(/Your Test App Application/i)).toBeInTheDocument();
		expect(screen.getAllByText(/John/i)[0]).toBeInTheDocument();
		expect(screen.getAllByText(/123 Main St/i)[0]).toBeInTheDocument();
		expect(screen.getByTestId('section-family')).toBeInTheDocument();
		expect(screen.getByTestId('section-education')).toBeInTheDocument();
		expect(screen.getAllByText('Test Document')[0]).toBeInTheDocument();
		expect(screen.getAllByText('Missing')[0]).toBeInTheDocument();
	});

	test('handles file upload successfully', async () => {
		render(<Review />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
		const input = screen.getByTestId('file-input-testDoc');

		fireEvent.change(input, { target: { files: [file] } });

		await waitFor(() => {
			expect(saveFile).toHaveBeenCalledWith('app-attachments', appID, 'testDoc', file);
			expect(saveCollectionData).toHaveBeenCalled();
			expect(updateApplicationStatus).not.toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalled();
		});
	});

	test('handles requesting a recommendation letter', async () => {
		render(<Review />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const requestBtns = screen.getAllByText('Request Letter');
		fireEvent.click(requestBtns[0]);

		expect(mockShowDialog).toHaveBeenCalled();

		const dialogCall = mockShowDialog.mock.calls[0][0];
		const mockRequestData = { name: 'Teacher', email: 'teach@school.com' };

		// FIX: Wrap state-updating callback in act()
		await act(async () => {
			await dialogCall.callback(mockRequestData);
		});

		await waitFor(() => {
			expect(saveCollectionData).toHaveBeenCalled();
			expect(sendRequest).toHaveBeenCalled();
			expect(mockShowAlert).toHaveBeenCalledWith('request', 'sent');
		});
	});

	test('handles deleting an attachment', async () => {
		const attachmentWithFile = {
			...mockAttachments,
			testDoc: { displayName: 'my-file.pdf', home: 'http://link', refLoc: 'path/to/file' },
		};
		getCollectionData.mockImplementation((uid, coll) => {
			if (coll === 'attachments') return Promise.resolve(attachmentWithFile);
			if (coll === 'profiles') return Promise.resolve(mockProfile);
			return Promise.resolve({});
		});

		render(<Review />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const chips = screen.getAllByText('my-file.pdf');
		expect(chips.length).toBeGreaterThan(0);

		// Now that we fixed the component, this chip should have a delete icon.
		// We use 'within' to find the SVG icon inside the chip.
		// MUI Chips often use 'CancelIcon' which might not have a role of button, but we can find it by its default testId or tag
		const chip = chips[0].closest('.MuiChip-root');

		// In MUI, the delete icon usually has the class 'MuiChip-deleteIcon'
		const deleteIcon = chip.querySelector('.MuiChip-deleteIcon');

		fireEvent.click(deleteIcon);

		await waitFor(() => {
			expect(deleteFile).toHaveBeenCalledWith('path/to/file');
			expect(mockShowAlert).toHaveBeenCalledWith('upload', 'deleted');
		});
	});
});
