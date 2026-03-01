import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import SiteSettings from './Settings';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { saveCollectionData, getCollection } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';

// --- 1. MOCK DEPENDENCIES ---

jest.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

jest.mock('../../context/DialogContext', () => ({
	useDialog: jest.fn(),
}));

jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

jest.mock('../../config/data/firebase', () => ({
	saveCollectionData: jest.fn(),
	getCollection: jest.fn(),
}));

// **FIX**: Added ApplicationType and other exports that Constants.js depends on
jest.mock('../../config/data/collections', () => ({
	collections: {
		siteConfig: 'site_config',
		applicants: 'applicants',
	},
	ApplicationType: {
		newApplication: 'newApplication',
		returningGrant: 'returningGrant',
		scholarship: 'scholarship',
	},
	UserType: {
		applicant: 'applicant',
		member: 'member',
	},
	ApplicationStatus: {
		started: 'Started',
	},
}));

jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loading...</div>);

// --- 2. MOCK ADMIN FUNCTIONS ---
jest.mock('../../config/admin/maintenance', () => {
	const mockNoParamsAction = jest.fn();
	const mockWithParamsAction = jest.fn();

	return {
		adminFunctions: [
			{
				id: 'test-no-params',
				label: 'Test Action (No Params)',
				description: 'Simple action description',
				action: mockNoParamsAction,
				parameters: [],
			},
			{
				id: 'test-with-params',
				label: 'Test Action (With Params)',
				description: 'Complex action description',
				action: mockWithParamsAction,
				parameters: [
					{ name: 'userId', label: 'Select User', type: 'select', required: true },
					{ name: 'force', label: 'Force', type: 'switch', defaultValue: false },
				],
			},
		],
		_testMocks: {
			mockNoParamsAction,
			mockWithParamsAction,
		},
	};
});

// --- 3. MOCK DATE PICKERS ---
jest.mock('@mui/x-date-pickers', () => {
	const React = require('react');
	const dayjs = require('dayjs');

	return {
		LocalizationProvider: ({ children }) => React.createElement('div', null, children),
		DateTimeField: ({ label, value, onChange }) =>
			React.createElement(
				'div',
				null,
				React.createElement('label', { htmlFor: label }, label),
				React.createElement('input', {
					id: label,
					'data-testid': `date-picker-${label}`,
					value: value ? new Date(value).toISOString().split('T')[0] : '',
					onChange: (e) => onChange(dayjs(e.target.value)),
				})
			),
	};
});

jest.mock('@mui/x-date-pickers/AdapterDayjs', () => ({
	AdapterDayjs: {},
}));

describe('SiteSettings Component', () => {
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockShowDialog = jest.fn();

	const mockConfigData = {
		CONFIG_ID: 'test-config-123',
		ENABLE_REGISTRATION: true,
		MAINTENANCE_MODE: false,
		APPLICATION_DEADLINE: new Date('2025-12-31'),
		SIGNATURE_CHAIRMAN: 'John Doe',
		SYSTEM_EMAIL: 'system@test.com',
		API_KEY: '12345',
		WELCOME_MESSAGE: 'Hello World',
		automations: {
			memberActivitySummary: {
				enabled: true,
				schedule: 'weekly',
				recipients: ['admin@test.com'],
			},
			incompleteCountAlert: {
				enabled: false,
				schedule: 'daily',
				threshold: 10,
				recipients: [],
			},
		},
	};

	const mockApplicants = [
		{ id: 'app1', firstName: 'Alice', lastName: 'Applicant', email: 'alice@test.com' },
		{ id: 'app2', firstName: 'Bob', lastName: 'Builder', email: 'bob@test.com' },
	];

	beforeEach(() => {
		jest.clearAllMocks();
		useConfig.mockReturnValue(mockConfigData);
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useDialog.mockReturnValue({ showDialog: mockShowDialog });
		useTitle.mockImplementation(() => { });

		getCollection.mockResolvedValue(mockApplicants);
		saveCollectionData.mockResolvedValue(true);

		const { mockNoParamsAction, mockWithParamsAction } = require('../../config/admin/maintenance')._testMocks;
		mockNoParamsAction.mockClear();
		mockWithParamsAction.mockClear();
	});

	test('renders loader initially if config is null', () => {
		useConfig.mockReturnValue(null);
		render(<SiteSettings />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('renders grouped settings correctly', async () => {
		render(<SiteSettings />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(screen.getByText('Site Settings')).toBeInTheDocument();
		expect(screen.getByText('Automated Tasks')).toBeInTheDocument();
		expect(screen.getByText('Shared Signatures')).toBeInTheDocument();

		expect(screen.getByLabelText(/Enable Registration/i)).toBeChecked();
		expect(screen.getByLabelText(/Signature Chairman/i)).toHaveValue('John Doe');
		expect(screen.getByLabelText(/Api Key/i)).toHaveValue('12345');
		expect(screen.getByLabelText(/Application Deadline/i)).toBeInTheDocument();
	});

	test('handles modifying a setting value', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const signatureInput = screen.getByLabelText(/Signature Chairman/i);
		fireEvent.change(signatureInput, { target: { value: 'Jane Doe' } });

		expect(signatureInput).toHaveValue('Jane Doe');
	});

	test('handles saving settings to firebase', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const signatureInput = screen.getByLabelText(/Signature Chairman/i);
		fireEvent.change(signatureInput, { target: { value: 'Jane Doe' } });

		const saveButton = screen.getByRole('button', { name: /Save Settings/i });
		fireEvent.click(saveButton);

		await waitFor(() => {
			expect(saveCollectionData).toHaveBeenCalledWith(
				collections.siteConfig,
				'test-config-123',
				expect.objectContaining({
					SIGNATURE_CHAIRMAN: 'Jane Doe',
					ENABLE_REGISTRATION: true,
				})
			);
			expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});

	test('handles saving automation settings', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const recipientsInput = screen.getByDisplayValue('admin@test.com');
		fireEvent.change(recipientsInput, { target: { value: 'new@test.com, other@test.com' } });

		fireEvent.click(screen.getByRole('button', { name: /Save Settings/i }));

		await waitFor(() => {
			expect(saveCollectionData).toHaveBeenCalledWith(
				collections.siteConfig,
				'test-config-123',
				expect.objectContaining({
					automations: expect.objectContaining({
						memberActivitySummary: expect.objectContaining({
							recipients: ['new@test.com', 'other@test.com'],
						}),
					}),
				})
			);
		});
	});

	test('executes admin action with NO parameters', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const actionCard = screen.getByText('Test Action (No Params)').closest('div');
		const executeBtn = within(actionCard).getByRole('button', { name: /Execute/i });

		fireEvent.click(executeBtn);

		expect(mockShowDialog).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'adminActionConfirmation',
				callback: expect.any(Function),
			})
		);

		const dialogCall = mockShowDialog.mock.calls[0][0];
		await dialogCall.callback(true);

		const { mockNoParamsAction } = require('../../config/admin/maintenance')._testMocks;
		expect(mockNoParamsAction).toHaveBeenCalled();
		expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('executed successfully') }));
	});

	test('executes admin action WITH parameters', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const actionCard = screen.getByText('Test Action (With Params)').closest('div');
		const executeBtn = within(actionCard).getByRole('button', { name: /Execute/i });

		fireEvent.click(executeBtn);

		expect(mockShowDialog).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'test-with-params',
				data: expect.objectContaining({
					inputs: expect.arrayContaining([expect.objectContaining({ name: 'userId', type: 'select' }), expect.objectContaining({ name: 'force', type: 'switch' })]),
				}),
				callback: expect.any(Function),
			})
		);

		const dialogCall = mockShowDialog.mock.calls[0][0];
		const mockResult = { userId: 'app1', force: true };
		await dialogCall.callback(mockResult);

		const { mockWithParamsAction } = require('../../config/admin/maintenance')._testMocks;
		expect(mockWithParamsAction).toHaveBeenCalledWith(mockResult);
		expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('executed successfully') }));
	});

	test('handles admin action failure', async () => {
		render(<SiteSettings />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const { mockNoParamsAction } = require('../../config/admin/maintenance')._testMocks;
		const testError = new Error('Execution Boom');
		mockNoParamsAction.mockRejectedValue(testError);

		const actionCard = screen.getByText('Test Action (No Params)').closest('div');
		const executeBtn = within(actionCard).getByRole('button', { name: /Execute/i });
		fireEvent.click(executeBtn);

		const dialogCall = mockShowDialog.mock.calls[0][0];
		await dialogCall.callback(true);

		expect(mockHandleError).toHaveBeenCalledWith(testError, expect.stringContaining('adminAction'));
	});
});
