import React from 'react';
// FIX: Import 'act' from 'react' to address the deprecation warning
import { act } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// DELETED: Removed the duplicate import from here.
import { ApplicationContext } from '../../../context/ApplicationContext';
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';
import { useConfig } from '../../../context/ConfigContext';
import { useTheme } from '../../../context/ThemeContext';
import * as firebaseConfig from '../../../config/data/firebase';
import { paths } from '../../../config/navigation/paths';
import { generatePath } from '../../../config/navigation/routeUtils';

// --- Critical Fix: Define matchMedia immediately ---
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});

// --- Mocks ---
const mockNavigate = jest.fn();
// FIX: We will control this variable in each test
let mockParams = {};

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mockNavigate,
	// FIX: The mock now reads from the variable
	useParams: () => mockParams,
}));

jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../context/AlertContext', () => ({ useAlert: jest.fn() }));
jest.mock('../../../context/ConfigContext', () => ({ useConfig: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/HelmetContext', () => ({ useTitle: jest.fn() }));

// Mock Collections
jest.mock('../../../config/data/collections', () => ({
	__esModule: true,
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
		applications: 'applications',
		applicants: 'applicants',
	},
	ApplicationStatus: {
		started: 'started',
		submitted: 'submitted',
		completed: 'completed',
		incomplete: 'incomplete',
	},
	ApplicationType: { scholarship: 'Scholarship' },
	UploadType: { applicationAttachment: 'applicationAttachment' },
}));

// Mock pushNotice
jest.mock('../../../config/content/push', () => ({
	__esModule: true,
	ContactTemplate: {
		appCompleted: 'completed',
		appIncomplete: 'incomplete',
	},
	pushNotice: jest.fn(),
}));
import { pushNotice } from '../../../config/content/push';
const mockPushNotice = pushNotice;

// Mock Constants
jest.mock('../../../config/Constants', () => ({
	__esModule: true,
	attachmentFields: [{ key: 'testDoc', label: 'Test Doc', requiredBy: ['Scholarship'] }],
}));

// Mock Paths for navigation
jest.mock('../../../config/navigation/paths', () => ({
	paths: {
		apply: 'mock-apply-path',
	},
}));
jest.mock('../../../config/navigation/routeUtils', () => ({
	generatePath: jest.fn((path) => path),
}));

// Critical Fix: Mock useMediaQuery directly
jest.mock('@mui/material', () => {
	const original = jest.requireActual('@mui/material');
	return {
		...original,
		useMediaQuery: jest.fn(() => false),
	};
});

// Mock MUI Styles hooks
jest.mock('@mui/material/styles', () => {
	const original = jest.requireActual('@mui/material/styles');
	return {
		...original,
		useTheme: () => ({
			breakpoints: {
				down: () => 'down-query',
				up: () => 'up-query',
				values: { md: 900 },
			},
			palette: { mode: 'light', text: { primary: 'black' } },
			transitions: { create: () => 'none' },
			shadows: Array(25).fill('none'),
			typography: { pxToRem: (px) => `${px}rem` },
			zIndex: { modal: 1000 },
			shape: { borderRadius: 4 },
		}),
	};
});

// Firebase Mocks
jest.mock('../../../config/data/firebase', () => ({
	__esModule: true,
	getApplication: jest.fn(),
	getCollectionData: jest.fn(),
	getApplicant: jest.fn(),
	saveCollectionData: jest.fn(),
	addApplicationToApplicant: jest.fn(),
	updateApplicantData: jest.fn(),
}));

// Config Mocks
// FIX: Define the 3-step config *inline*
jest.mock('../../../config/ui/applicationConfig', () => ({
	applicationConfigurations: {
		scholarship: {
			type: 'Scholarship',
			title: 'Scholarship App',
			template: {
				profile: {},
				confirmation: {},
				attachments: {},
			},
			steps: ['Step 1', 'Step 2', 'Step 3'], // 3 steps
			pages: [
				{ section: 'profile', component: 'GenericFormPage' },
				{ section: 'attachments', component: 'GenericFormPage' }, // Middle step
				{ section: 'confirmation', component: 'GenericFormPage' }, // Last step
			],
			dataCollections: [],
		},
	},
}));

// Mock Child Components
jest.mock('../../loader/Loader', () => () => <div>Loading...</div>);
jest.mock('../../layout/NotFound', () => () => <div>Not Found</div>);
jest.mock('../../footer/CopyrightFooter', () => () => <div>Footer</div>);
jest.mock('../../breadcrumbs/Breadcrumbs', () => () => <div>Crumbs</div>);

// Mock Form Page
let onValidationSuccessCallback;
let onValidationFailureCallback;

jest.mock('../../forms/GenericFormPage', () => {
	return (props) => {
		const { onValidationSuccess, onValidationFailure, setApplication } = props;
		onValidationSuccessCallback = onValidationSuccess;
		onValidationFailureCallback = onValidationFailure;

		return (
			<div data-testid='generic-form-page'>
				<button onClick={onValidationSuccess}>Simulate Next</button>
				<button onClick={onValidationFailure}>Simulate Fail</button>
				<button
					onClick={() =>
						setApplication((prev) => ({
							...prev,
							profile: { applicantFirstName: 'FormFilled' },
							attachments: { testDoc: { displayName: 'doc.pdf' } },
						}))
					}>
					Simulate Fill Form
				</button>
			</div>
		);
	};
});

// FIX: Import the component *after* all mocks are defined
import ApplicationController from './ApplicationController';

describe('ApplicationController', () => {
	const mockSetAllowEditing = jest.fn();
	const mockSetLoading = jest.fn();
	const mockAlert = { showAlert: jest.fn(), handleError: jest.fn() };
	const mockUser = { uid: 'user1' };

	beforeEach(() => {
		// Clear all mock function *call counts*
		jest.clearAllMocks();

		// FIX: Set the default params for most tests
		mockParams = { applicationType: 'scholarship', applicationID: 'app123' };

		// FIX: *Reset the implementation* of all mocks to the "happy path"
		mockPushNotice.mockResolvedValue(true);

		// Use the imported mock module
		firebaseConfig.getApplication.mockResolvedValue({
			id: 'app123',
			status: 'started',
			type: 'Scholarship',
		});
		firebaseConfig.getApplicant.mockResolvedValue({
			firstName: 'Test',
			lastName: 'Applicant',
			email: 'test@example.com',
		});
		firebaseConfig.saveCollectionData.mockResolvedValue(true);
		firebaseConfig.addApplicationToApplicant.mockResolvedValue(true);
		firebaseConfig.updateApplicantData.mockResolvedValue(true);

		generatePath.mockImplementation((path) => path);

		// Set up default context mocks
		useAuth.mockReturnValue({ user: mockUser });
		useAlert.mockReturnValue(mockAlert);
		useConfig.mockReturnValue({ APPLICATION_DEADLINE: '2025-01-01', VALIDATION_OVERRIDE: false });
		useTheme.mockReturnValue({ boxShadow: 'none' });
	});

	const renderController = () => {
		return render(
			<ApplicationContext.Provider value={{ setAllowEditing: mockSetAllowEditing, loading: false, setLoading: mockSetLoading }}>
				<ApplicationController />
			</ApplicationContext.Provider>
		);
	};

	test('renders active step form', async () => {
		await act(async () => {
			renderController();
		});
		await waitFor(() => {
			expect(screen.getByTestId('generic-form-page')).toBeInTheDocument();
		});
		expect(screen.getByText('Step 1')).toBeInTheDocument();
		expect(firebaseConfig.getApplicant).toHaveBeenCalledWith(mockUser.uid);
	});

	test('advances step on success', async () => {
		await act(async () => {
			renderController();
		});
		await waitFor(() => screen.getByTestId('generic-form-page'));

		const nextBtn = screen.getByText('Simulate Next');
		await act(async () => {
			fireEvent.click(nextBtn);
		});

		await waitFor(() => {
			expect(mockAlert.showAlert).toHaveBeenCalledWith('application', 'updated');
			expect(screen.getByText('Step 2')).toBeInTheDocument();
		});
	});

	test('submits application on last step (Completed)', async () => {
		await act(async () => {
			renderController();
		});
		await waitFor(() => screen.getByTestId('generic-form-page'));

		await act(async () => {
			fireEvent.click(screen.getByText('Simulate Fill Form'));
		});

		// Advance to step 2
		await act(async () => {
			fireEvent.click(screen.getByText('Simulate Next'));
		});
		await waitFor(() => screen.getByText('Step 2'));

		// FIX: Advance to step 3 (last step)
		await act(async () => {
			fireEvent.click(screen.getByText('Simulate Next'));
		});
		await waitFor(() => screen.getByText('Step 3'));

		const submitBtn = await screen.findByText('Confirm & Submit');
		await act(async () => {
			fireEvent.click(submitBtn);
		});

		await waitFor(() => {
			expect(mockAlert.showAlert).toHaveBeenCalledWith('application', 'submitted');
			expect(mockPushNotice).toHaveBeenCalledWith(
				'completed',
				expect.objectContaining({
					firstName: 'FormFilled',
					lastName: 'Applicant',
				}),
				{}
			);
			expect(mockNavigate).toHaveBeenCalledWith(paths.apply);
		});
	});

	test('submits application on last step (Incomplete)', async () => {
		await act(async () => {
			renderController();
		});
		await waitFor(() => screen.getByTestId('generic-form-page'));

		// Advance to step 2
		await act(async () => {
			fireEvent.click(screen.getByText('Simulate Next'));
		});
		await waitFor(() => screen.getByText('Step 2'));

		// FIX: Advance to step 3 (last step)
		await act(async () => {
			fireEvent.click(screen.getByText('Simulate Next'));
		});
		await waitFor(() => screen.getByText('Step 3'));

		const submitBtn = await screen.findByText('Confirm & Submit');
		await act(async () => {
			fireEvent.click(submitBtn);
		});

		await waitFor(() => {
			expect(mockAlert.showAlert).toHaveBeenCalledWith('application', 'submitted');
			expect(mockPushNotice).toHaveBeenCalledWith(
				'incomplete',
				expect.objectContaining({
					firstName: 'Test',
					lastName: 'Applicant',
				}),
				{}
			);
			expect(mockNavigate).toHaveBeenCalledWith(paths.apply);
		});
	});

	test('handles submission error', async () => {
		await act(async () => {
			renderController();
		});
		await waitFor(() => screen.getByTestId('generic-form-page'));

		// Advance to step 2
		await act(async () => {
			fireEvent.click(screen.getByText('Simulate Next'));
		});
		await waitFor(() => screen.getByText('Step 2'));

		// FIX: Advance to step 3 (last step)
		await act(async () => {
			fireEvent.click(screen.getByText('Simulate Next'));
		});
		await waitFor(() => screen.getByText('Step 3'));

		const submitError = new Error('Submit Failed');
		// Mock the *next* call to saveCollectionData (which is the submit button)
		firebaseConfig.saveCollectionData.mockRejectedValueOnce(submitError);

		const submitBtn = await screen.findByText('Confirm & Submit');
		await act(async () => {
			fireEvent.click(submitBtn);
		});

		await waitFor(() => {
			expect(mockAlert.handleError).toHaveBeenCalledWith(submitError, 'handleSubmit_scholarship');
			expect(mockNavigate).not.toHaveBeenCalled();
		});
	});

	test('handles validation failure', async () => {
		await act(async () => {
			renderController();
		});
		await waitFor(() => screen.getByTestId('generic-form-page'));

		const continueBtn = screen.getByText('Save & Continue');
		await act(async () => {
			fireEvent.click(continueBtn);
		});

		// Simulate the form calling onValidationFailure
		await act(async () => {
			onValidationFailureCallback();
		});

		await waitFor(() => {
			expect(mockAlert.showAlert).toHaveBeenCalledWith('validation', 'fields');
		});
	});

	// FIX: This test will now pass because of the 3-step config
	test('handles "Back" button', async () => {
		await act(async () => {
			renderController();
		});
		await waitFor(() => screen.getByText('Step 1'));

		// Go next to Step 2
		await act(async () => {
			fireEvent.click(screen.getByText('Simulate Next'));
		});
		await waitFor(() => screen.getByText('Step 2'));

		// "Back" button should now be present and enabled
		const backBtn = screen.getByText('Back');
		expect(backBtn).not.toBeDisabled();
		await act(async () => {
			fireEvent.click(backBtn);
		});

		await waitFor(() => {
			expect(screen.getByText('Step 1')).toBeInTheDocument();
		});
		expect(screen.getByText('Back')).toBeDisabled();
	});

	test('handles "Save & Exit" button', async () => {
		await act(async () => {
			renderController();
		});
		await waitFor(() => screen.getByTestId('generic-form-page'));

		const exitBtn = screen.getByText('Save & Exit');
		await act(async () => {
			fireEvent.click(exitBtn);
		});

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith(paths.apply);
		});
	});

	test('handles "Return to Applicant Portal" and "Reset" buttons on last step', async () => {
		await act(async () => {
			renderController();
		});
		await waitFor(() => screen.getByText('Step 1'));

		// Go to step 2
		await act(async () => {
			fireEvent.click(screen.getByText('Simulate Next'));
		});
		await waitFor(() => screen.getByText('Step 2'));

		// Go to step 3 (last step)
		await act(async () => {
			fireEvent.click(screen.getByText('Simulate Next'));
		});
		await waitFor(() => screen.getByText('Step 3'));

		// Test Reset
		const resetBtn = screen.getByText('Clear & Start Over');
		await act(async () => {
			fireEvent.click(resetBtn);
		});
		await waitFor(() => {
			expect(screen.getByText('Step 1')).toBeInTheDocument();
		});

		// Go to last step again
		await act(async () => {
			fireEvent.click(screen.getByText('Simulate Next'));
		});
		await waitFor(() => screen.getByText('Step 2'));
		await act(async () => {
			fireEvent.click(screen.getByText('Simulate Next'));
		});
		await waitFor(() => screen.getByText('Step 3'));

		// Test Logout
		const logoutBtn = screen.getByText('Return to Applicant Portal');
		await act(async () => {
			fireEvent.click(logoutBtn);
		});
		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith(paths.apply);
		});
	});

	test('renders NotFound when application fetch fails', async () => {
		firebaseConfig.getApplication.mockResolvedValue(null);
		await act(async () => {
			renderController();
		});
		await waitFor(() => {
			expect(screen.getByText('Not Found')).toBeInTheDocument();
		});
	});

	// FIX: This test now correctly uses the `mockParams` variable
	test('initializes a new application if no ID is provided', async () => {
		// Set params *for this test only*
		mockParams = { applicationType: 'scholarship', applicationID: null };

		await act(async () => {
			renderController();
		});

		await waitFor(() => {
			// This test will now pass because the component bug is fixed
			expect(firebaseConfig.getApplication).not.toHaveBeenCalled();
			expect(firebaseConfig.getApplicant).toHaveBeenCalledWith(mockUser.uid);
			expect(screen.getByTestId('generic-form-page')).toBeInTheDocument();
		});
	});
});
