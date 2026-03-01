import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import DynamicField from './DynamicField';
import { ApplicationContext } from '../../context/ApplicationContext';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import * as Validators from '../../config/data/Validation';

// --- MOCKS ---

jest.mock('../../context/ConfigContext', () => ({
	useConfig: () => ({ DEFAULT_AVATAR: 'default.jpg' }),
}));

const mockReadAsDataURL = jest.fn();
global.FileReader = jest.fn(() => ({
	readAsDataURL: mockReadAsDataURL,
	onloadend: null,
	result: 'data:image/png;base64,fake-content',
}));

const mockShowDialog = jest.fn();
jest.mock('../../context/DialogContext', () => ({
	useDialog: () => ({ showDialog: mockShowDialog }),
}));

const mockShowAlert = jest.fn();
jest.mock('../../context/AlertContext', () => ({
	useAlert: () => ({ showAlert: mockShowAlert, handleError: jest.fn() }),
}));

const mockSaveCollectionData = jest.fn();
jest.mock('../../config/data/firebase', () => ({
	saveCollectionData: (...args) => mockSaveCollectionData(...args),
}));

const mockSendRequest = jest.fn();
jest.mock('../../config/content/push', () => ({
	sendRequest: (...args) => mockSendRequest(...args),
}));

jest.mock('../../config/Constants', () => ({
	generate6DigitNumber: () => '123456',
	generateSecurePin: () => Promise.resolve('pin'),
	generateUploadLink: () => Promise.resolve('http://upload.link'),
}));

// Mock Validators to control validation logic in tests
jest.mock('../../config/data/Validation', () => ({
	__esModule: true,
	default: {}, // Fallback
	isEmail: jest.fn((val) => val && val.includes('@')),
	isNotEmpty: jest.fn((val) => !!val),
}));

// Helper to mock Google Maps autocomplete
jest.mock('../autocomplete/GoogleAutoComplete', () => {
	return function DummyMap(props) {
		return (
			<div data-testid='google-map' onClick={() => props.changeLocation({ description: 'New York, NY' })}>
				{props.label}
			</div>
		);
	};
});

// Helper to mock DatePicker
// This bypasses MUI internal complexity (read-only inputs, portals) and tests logic directly.
jest.mock('@mui/x-date-pickers/DatePicker', () => {
	const mockDayjs = require('dayjs');
	return {
		DatePicker: (props) => (
			<input
				data-testid='mock-date-picker'
				aria-label={props.label}
				// Simulate the DatePicker passing a dayjs object to the parent's handler
				onChange={(e) => props.onChange(mockDayjs(e.target.value))}
			/>
		),
	};
});

describe('DynamicField Component', () => {
	const mockOnChange = jest.fn();
	const mockOnError = jest.fn();
	const mockOnFile = jest.fn();

	const baseProps = {
		formData: {},
		onFieldUpdate: mockOnChange,
		onErrorUpdate: mockOnError,
		onFileAction: mockOnFile,
		sectionName: 'testSection',
		forceValidate: false,
		permissions: { canEdit: true },
	};

	const mockApplication = {
		id: 'app123',
		profile: { firstName: 'John', lastName: 'Doe', applicantID: 'user123', applicantFirstName: 'John', applicantLastName: 'Doe' },
		expenses: {
			tuitionCost: 1000,
			roomAndBoardCost: 500,
			bookCost: 100,
			commutingCost: 50,
			otherExpenses: [
				{ amount: 10, title: 'Misc' },
				{ amount: 20, title: 'Other' },
			],
		},
		incomes: {
			earningsAppliedToEducation: 200,
			savingsAppliedToEducation: 100,
			collegeAward: 500,
			loansAmount: 1000,
			otherIncomeSources: [{ amount: 50, title: 'Gift' }],
		},
		projections: {
			applicantFamily: 100,
			request: 300,
		},
		// For Summary List Tests
		experience: {
			currentOrganization: '0',
			positions: [
				{ id: '1', organization: 'Org 1', role: 'Role 1' },
				{ id: '2', organization: 'Org 2', role: 'Role 2' },
			],
		},
		// For Label Field Tests
		personal: {
			// Uppercase DOB to match component logic "name.includes('DOB')"
			DOB: '2000-01-01',
			isCitizen: true,
			// Nested structure for MailingAddress test
			address: {
				description: '123 Main St',
				MailingAddress: { description: '123 Main St' },
			},
			attachment: { displayName: 'My Resume.pdf', home: 'http://link.com' },
			attachmentSent: { requestID: 'req123' },
		},
	};

	const renderField = (fieldConfig, contextValue = { allowEditing: true }, appData = mockApplication, extraProps = {}) => {
		return render(
			<ApplicationContext.Provider value={contextValue}>
				<LocalizationProvider dateAdapter={AdapterDayjs}>
					<DynamicField {...baseProps} {...extraProps} fieldConfig={fieldConfig} application={appData} />
				</LocalizationProvider>
			</ApplicationContext.Provider>
		);
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	// --- 1. CALCULATION ENGINE TESTS ---
	describe('Calculation Logic', () => {
		it('interpolates strings in labels', () => {
			renderField({ name: 'l1', type: 'label', label: 'Hello ${profile.firstName}' });
			expect(screen.getByText('Hello John:')).toBeInTheDocument();
		});

		it('formats numbers in interpolated strings', () => {
			renderField({ name: 'l2', type: 'label', label: 'Cost: ${expenses.tuitionCost}' });
			expect(screen.getByText('Cost: $1,000.00:')).toBeInTheDocument();
		});

		it('calculates basic addition and subtraction', () => {
			renderField({ name: 'c1', type: 'calculatedLabel', label: 'Total', calculatedValue: 'expenses.tuitionCost + 100 - 50' });
			// 1000 + 100 - 50 = 1050
			expect(screen.getByText('$1,050.00')).toBeInTheDocument();
		});

		it('calculates multiplication and division', () => {
			renderField({ name: 'c2', type: 'calculatedLabel', label: 'Math', calculatedValue: '100 * 2 / 4' });
			expect(screen.getByText('$50.00')).toBeInTheDocument();
		});

		it('calculates special variable: totalExpenses', () => {
			renderField({ name: 'c3', type: 'calculatedLabel', label: 'Total Exp', calculatedValue: 'totalExpenses' });
			// 1000 + 500 + 100 + 50 + 30 (sumArray) = 1680
			expect(screen.getByText('$1,680.00')).toBeInTheDocument();
		});

		it('calculates special variable: totalProjections', () => {
			// totalProjections = applicantFamily(100) + requestForPF(300) + totalIncome(1850) = 2250
			renderField({ name: 'c4', type: 'calculatedLabel', label: 'Proj', calculatedValue: 'totalProjections' });
			expect(screen.getByText('$2,250.00')).toBeInTheDocument();
		});

		it('handles boolean logic (===)', () => {
			renderField({ name: 'logic1', type: 'calculatedLabel', label: 'Check', calculatedValue: 'expenses.tuitionCost === 1000' });
			expect(screen.getByText('Yes')).toBeInTheDocument();
		});

		it('handles invalid formulas gracefully', () => {
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
			renderField({ name: 'err', type: 'calculatedLabel', label: 'Err', calculatedValue: 'expenses.nonExistent + text' });
			expect(screen.getByText('$0.00')).toBeInTheDocument();
			consoleSpy.mockRestore();
		});
	});

	// --- 2. VALIDATION LOGIC ---
	describe('Validation Logic', () => {
		it('shows error when required field is empty and touched', async () => {
			const fieldConfig = { name: 'reqField', label: 'Required', type: 'text', required: true };
			const appData = { ...mockApplication, testSection: { reqField: '' } };

			renderField(fieldConfig, { allowEditing: true }, appData);

			// Regex used because MUI adds an asterisk (*) to the label text for required fields
			const input = screen.getByLabelText(/Required/i);
			fireEvent.focus(input);
			fireEvent.blur(input);

			await waitFor(() => {
				expect(screen.getByText('This field is required.')).toBeInTheDocument();
			});
			expect(mockOnError).toHaveBeenCalledWith('reqField', true);
		});

		it('shows error when forceValidate is true', () => {
			const fieldConfig = { name: 'forceField', label: 'Force', type: 'text', required: true };
			const appData = { ...mockApplication, testSection: { forceField: '' } };

			renderField(fieldConfig, { allowEditing: true }, appData, { forceValidate: true });

			expect(screen.getByText('This field is required.')).toBeInTheDocument();
		});

		it('uses custom validator function', async () => {
			const fieldConfig = { name: 'emailField', label: 'Email', type: 'text', validator: 'isEmail', helperText: 'Bad Email' };
			const appData = { ...mockApplication, testSection: { emailField: 'not-an-email' } };

			renderField(fieldConfig, { allowEditing: true }, appData, { forceValidate: true });

			await waitFor(() => {
				expect(screen.getByText('Bad Email')).toBeInTheDocument();
			});
		});

		it('clears error when value becomes valid', async () => {
			const fieldConfig = { name: 'reqField', label: 'Required', type: 'text', required: true };
			const appData = { ...mockApplication, testSection: { reqField: 'Valid' } };

			renderField(fieldConfig, { allowEditing: true }, appData, { forceValidate: true });

			expect(screen.queryByText('This field is required.')).not.toBeInTheDocument();
			expect(mockOnError).toHaveBeenCalledWith('reqField', false);
		});
	});

	// --- 3. LABEL FIELD VARIATIONS ---
	describe('LabelField Variations', () => {
		it('renders currency format', () => {
			renderField({ name: 'expenses.tuitionCost', type: 'label', label: 'Tuition', valueFormatter: 'currency' });
			expect(screen.getByText('$1,000.00')).toBeInTheDocument();
		});

		it('renders boolean format', () => {
			renderField({ name: 'personal.isCitizen', type: 'label', label: 'Citizen' });
			expect(screen.getByText('Yes')).toBeInTheDocument();
		});

		it('renders date format', () => {
			// Uses 'DOB' (uppercase) in appData to match 'name.includes' logic
			renderField({ name: 'personal.DOB', type: 'label', label: 'DOB', dateFormat: 'MM/DD/YYYY' });
			expect(screen.getByText('01/01/2000')).toBeInTheDocument();
		});

		it('renders mailing address object', () => {
			renderField({ name: 'personal.address.MailingAddress', type: 'label', label: 'Addr' });
			expect(screen.getByText('123 Main St')).toBeInTheDocument();
		});

		it('renders Attachment Chip (Standard)', () => {
			renderField({ name: 'personal.attachment', type: 'label', label: 'Resume', valueFormatter: 'attachmentChip' });
			expect(screen.getByText('My Resume.pdf')).toBeInTheDocument();
		});

		it('renders Attachment Chip (Request Sent)', () => {
			renderField({ name: 'personal.attachmentSent', type: 'label', label: 'Rec', valueFormatter: 'attachmentChip' });
			expect(screen.getByText('Request Sent')).toBeInTheDocument();
		});

		it('handles attachment chip click', () => {
			const openSpy = jest.spyOn(window, 'open').mockImplementation(() => {});
			renderField({ name: 'personal.attachment', type: 'label', label: 'Resume', valueFormatter: 'attachmentChip' });

			fireEvent.click(screen.getByText('My Resume.pdf'));
			expect(openSpy).toHaveBeenCalled();
			openSpy.mockRestore();
		});
	});

	// --- 4. SUMMARY LIST FIELD ---
	describe('SummaryListField', () => {
		it('renders list items with string elements', () => {
			const appData = { ...mockApplication, myList: ['School A', 'School B'] };
			renderField({ name: 'myList', type: 'summaryList', label: 'Schools' }, { allowEditing: true }, appData);
			expect(screen.getByText('School A')).toBeInTheDocument();
			expect(screen.getByText('School B')).toBeInTheDocument();
		});

		it('renders card display with currency subtitle', () => {
			const fieldConfig = {
				name: 'expenses.otherExpenses',
				type: 'summaryList',
				label: 'Others',
				cardDisplay: { title: 'title', subtitle: 'amount' },
				subtitleFormatter: 'currency',
			};
			renderField(fieldConfig);
			expect(screen.getByText('Misc')).toBeInTheDocument();
			expect(screen.getByText('$10.00')).toBeInTheDocument();
		});

		it('highlights current unit for experience experiences', () => {
			const fieldConfig = {
				name: 'experience.positions',
				type: 'summaryList',
				label: 'Experience',
				cardDisplay: { title: 'organization' },
			};
			renderField(fieldConfig);

			const troop1Title = screen.getByText('Org 1');
			const card = troop1Title.closest('.MuiPaper-root');
			expect(card).toHaveStyle('border: 3px solid black');
		});

		it('shows empty state message', () => {
			const appData = { ...mockApplication, emptyList: [] };
			renderField({ name: 'emptyList', type: 'summaryList', label: 'Empty' }, { allowEditing: true }, appData);
			expect(screen.getByText('No items listed.')).toBeInTheDocument();
		});
	});

	// --- 5. FILE FIELD & RECOMMENDATIONS ---
	describe('FileField & Requests', () => {
		it('handles Request Recommendation flow', async () => {
			const fieldConfig = { name: 'lor', label: 'LOR', type: 'file', allowRequest: true };

			mockShowDialog.mockImplementation(({ callback }) => {
				callback({ name: 'Teacher', email: 't@test.com' });
			});

			renderField(fieldConfig);

			const reqButton = screen.getByText('Request Recommendation');
			fireEvent.click(reqButton);

			expect(mockShowDialog).toHaveBeenCalled();

			await waitFor(() => {
				expect(mockSaveCollectionData).toHaveBeenCalled();
				expect(mockSendRequest).toHaveBeenCalled();
				expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
			});

			expect(mockOnChange).toHaveBeenCalledWith('testSection.lor', expect.objectContaining({ requestID: expect.any(String) }));
		});

		it('renders uploaded file name and delete chip', () => {
			const appData = { ...mockApplication, testSection: { lor: { displayName: 'LOR.pdf', home: 'url' } } };
			renderField({ name: 'lor', label: 'LOR', type: 'file' }, { allowEditing: true }, appData);

			expect(screen.getByText('LOR.pdf')).toBeInTheDocument();
			const deleteIcon = screen.getByTestId('CancelIcon');
			fireEvent.click(deleteIcon);
			expect(mockOnFile).toHaveBeenCalledWith('delete', 'testSection.lor', { displayName: 'LOR.pdf', home: 'url' });
		});
	});

	// --- 6. PERMISSION GROUP FIELD ---
	describe('PermissionGroupField', () => {
		it('renders checkboxes and handles changes', () => {
			const fieldConfig = {
				name: 'permissions',
				type: 'permissionGroup',
				label: 'Perms',
				groups: {
					'User Mgmt': ['canEdit', 'canDelete'],
				},
			};
			const appData = { ...mockApplication, testSection: { permissions: { canEdit: true, canDelete: false } } };

			renderField(fieldConfig, { allowEditing: true }, appData);

			const editCheckbox = screen.getByLabelText('Edit');
			const deleteCheckbox = screen.getByLabelText('Delete');

			expect(editCheckbox).toBeChecked();
			expect(deleteCheckbox).not.toBeChecked();

			fireEvent.click(deleteCheckbox);
			expect(mockOnChange).toHaveBeenCalledWith('permissions.canDelete', true);
		});
	});

	// --- 7. OTHER INPUT TYPES ---
	describe('Other Input Types', () => {
		it('renders DatePicker and changes value via mock', async () => {
			renderField({ name: 'dateField', label: 'Date', type: 'date', dateFormat: 'MM/DD/YYYY' });

			// Target our mock instead of fighting MUI internals
			const input = screen.getByTestId('mock-date-picker');

			fireEvent.change(input, { target: { value: '01/01/2025' } });

			await waitFor(() => {
				expect(mockOnChange).toHaveBeenCalledWith('testSection.dateField', '2025-01-01');
			});
		});

		it('renders GoogleMaps address field', () => {
			renderField({ name: 'addr', label: 'Map', type: 'address' });
			const mapComponent = screen.getByTestId('google-map');
			expect(mapComponent).toBeInTheDocument();
			fireEvent.click(mapComponent);
			expect(mockOnChange).toHaveBeenCalledWith('testSection.addr', { description: 'New York, NY' });
		});

		it('renders number field', () => {
			renderField({ name: 'num', label: 'Number', type: 'number' });
			const input = screen.getByLabelText('Number');
			fireEvent.change(input, { target: { value: '123' } });
			expect(mockOnChange).toHaveBeenCalledWith('testSection.num', '123');
		});

		it('renders unsupported field type safely', () => {
			renderField({ name: 'what', label: 'Unknown', type: 'alien_technology' });
			expect(screen.getByText('Unsupported field type: alien_technology')).toBeInTheDocument();
		});
	});
});
