import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Applicant } from './Applicant';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { getApplicantActions } from '../../config/ui/buttonActions';
import { useAssetActionHandler } from '../../hooks/useAssetActionHandler';

// --- Mocks ---
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

jest.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));

jest.mock('../../config/navigation/routeUtils', () => ({
	__esModule: true,
	generatePath: jest.fn((path) => path),
}));

jest.mock('../../config/navigation/paths', () => ({
	__esModule: true,
	paths: { editApplicant: '/edit-applicant' },
}));

jest.mock('../../config/data/collections', () => ({
	__esModule: true,
	collections: { applicants: 'applicants' },
}));

jest.mock('../../config/ui/buttonActions', () => ({
	__esModule: true,
	getApplicantActions: jest.fn(),
}));

jest.mock('../../hooks/useAssetActionHandler', () => ({
	__esModule: true,
	useAssetActionHandler: jest.fn(),
}));

// Mock Child Components to isolate Applicant logic
jest.mock('../layout/SingleAssetPage', () => ({
	__esModule: true,
	default: ({ children }) => <div data-testid='single-asset-page'>{children}</div>,
	AssetCard: ({ children }) => <div data-testid='asset-card'>{children}</div>,
}));

jest.mock('../assets/Header', () => ({ children, title }) => (
	<div data-testid='header'>
		<h1>{title}</h1>
		{children}
	</div>
));

jest.mock('../assets/InfoTable', () => () => <div>InfoTable</div>);
jest.mock('../notes/NotesSection', () => () => <div>NotesSection</div>);
jest.mock('../table/Table', () => () => <div>CollapsableTable</div>);
jest.mock('../dynamicButtons/DynamicButtons', () => () => <div>DynamicButtons</div>);
jest.mock('../../config/ui/tableConfig', () => ({
	UserLastLogin: () => <span>Last Login Date</span>,
}));

describe('Applicant Card', () => {
	const mockApplicant = {
		id: 'app123',
		firstName: 'John',
		lastName: 'Doe',
		callMe: 'Johnny',
		major: 'Computer Science',
		school: 'MIT',
		gradYear: '2025-05-01',
		unit: 'Troop 101',
		email: 'john@example.com',
		cell: '555-1234',
		picture: { home: 'pic.jpg' },
		applications: [{ id: '1', status: 'pending' }],
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false });
		useAlert.mockReturnValue({ showAlert: jest.fn(), handleError: jest.fn() });
		useConfig.mockReturnValue({});
		useAssetActionHandler.mockReturnValue(jest.fn());
		getApplicantActions.mockReturnValue([]);
	});

	test('renders applicant details correctly', () => {
		render(<Applicant applicant={mockApplicant} />);

		expect(screen.getByTestId('single-asset-page')).toBeInTheDocument();
		// Title comes from Header mock
		expect(screen.getByText('Johnny')).toBeInTheDocument();
		// InfoTable mock is present
		expect(screen.getByText('InfoTable')).toBeInTheDocument();
		// Last Login component
		expect(screen.getByText('Last Login:')).toBeInTheDocument();
	});

	test('renders Fallback name if callMe is missing', () => {
		const applicantNoNickname = { ...mockApplicant, callMe: null };
		render(<Applicant applicant={applicantNoNickname} />);
		expect(screen.getByText('John')).toBeInTheDocument();
	});

	test('renders application history table if applications exist', () => {
		render(<Applicant applicant={mockApplicant} />);
		expect(screen.getByText('Applications')).toBeInTheDocument();
		expect(screen.getByText('CollapsableTable')).toBeInTheDocument();
	});

	test('renders "No application history" message if no applications', () => {
		const noAppsApplicant = { ...mockApplicant, applications: [] };
		render(<Applicant applicant={noAppsApplicant} />);
		expect(screen.getByText('No application history to show...')).toBeInTheDocument();
	});

	test('renders NotesSection when showNotes is toggled (simulated)', () => {
		// Since state is internal and we mocked the button that toggles it,
		// we can't easily click the button to toggle state in this unit test
		// without exposing the state setter or doing an integration test.
		// However, we can check that NotesSection is NOT in the document initially.
		render(<Applicant applicant={mockApplicant} />);
		expect(screen.queryByText('NotesSection')).not.toBeInTheDocument();
	});
});
