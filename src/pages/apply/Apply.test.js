import React from 'react';
// Import 'act' from 'react'
import { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
// FIX 1: Updated import path for ConfigContext
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useTitle } from '../../context/HelmetContext';
import { deleteApplication, getRealTimeApplicationsByIDs, removeApplicationFromApplicant } from '../../config/data/firebase';
import { ApplicationStatus } from '../../config/data/collections';
import { applicationConfigurations } from '../../config/ui/applicationConfig';
import { getApplyContent } from '../../config/content/content';
import Apply from './Apply';

// --- Mocks ---

// Mock child components
jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader' />);
jest.mock('../../components/breadcrumbs/Breadcrumbs', () => () => <div data-testid='crumbs' />);
jest.mock('../../components/interviews/RSVPStatusCard', () => () => <div data-testid='rsvp-card' />);
jest.mock('../../components/timer/WindowInfo', () => () => <div data-testid='window-info' />);
jest.mock('../../components/footer/CopyrightFooter', () => () => <div data-testid='footer' />);

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
	// Lazily require React *inside* the mock factory
	const React = require('react');
	return {
		...jest.requireActual('react-router-dom'),
		useNavigate: () => mockNavigate,
		Link: React.forwardRef(({ children, to, ...props }, ref) => (
			<a href={to} {...props} ref={ref}>
				{children}
			</a>
		)),
	};
});

// Mock contexts
jest.mock('../../context/AuthContext');
jest.mock('../../context/ConfigContext'); // This path is now correct
jest.mock('../../context/ThemeContext');
jest.mock('../../context/AlertContext');
jest.mock('../../context/HelmetContext');

// Mock firebase
jest.mock('../../config/data/firebase', () => ({
	getRealTimeApplicationsByIDs: jest.fn(() => () => {}), // Returns an empty unsubscribe function
	deleteApplication: jest.fn(() => Promise.resolve()),
	removeApplicationFromApplicant: jest.fn(() => Promise.resolve()),
}));

// Mock config files
jest.mock('../../config/content/content', () => ({
	getApplyContent: jest.fn(),
}));
jest.mock('../../config/ui/applicationConfig', () => ({
	applicationConfigurations: {
		scholarship: { type: 'Scholarship' },
		grant: { type: 'Grant' },
	},
}));

jest.mock('../../config/navigation/paths', () => ({
	__esModule: true,
	paths: {
		applyScholarship: '/apply/scholarship',
		applyGrant: '/apply/grant',
		updateApplication: '/apply/:applicationType/:applicationID',
		reviewApp: '/review/:id',
	},
}));

// --- Test Data ---

const mockUser = { uid: 'test-user-id' };
const mockApplicant = {
	applications: ['app-1-id', 'app-2-id', 'app-3-id'],
};
const mockApplicantNoApps = { applications: [] };

const mockApplications = [
	{ id: 'app-1-id', type: 'Scholarship', status: ApplicationStatus.started, submittedOn: '2023-01-15T12:00:00Z' },
	{ id: 'app-2-id', type: 'Grant', status: ApplicationStatus.submitted, submittedOn: '2023-01-20T12:00:00Z' },
	{ id: 'app-3-id', type: 'Scholarship', status: ApplicationStatus.awarded, submittedOn: '2022-02-10T12:00:00Z' },
];

const mockConfig = {
	APPLICANT_MESSAGE: 'Test Announcement',
};
const mockConfigNoMessage = {
	APPLICANT_MESSAGE: '',
};

const mockContent = {
	title: 'Apply Title',
	subtitle: ['Subtitle paragraph 1.'],
	availableApps: [
		{ type: 'scholarship', path: '/apply/scholarship', label: 'Scholarship Application', disabled: false },
		{ type: 'grant', path: '/apply/grant', label: 'Grant Application', disabled: true },
	],
};

// --- Context Mocks Implementation ---

const setupMocks = ({ user, applicant, config, applications = [] }) => {
	mockNavigate.mockClear();
	getRealTimeApplicationsByIDs.mockClear().mockImplementation((ids, setApplications) => {
		setApplications(applications);
		return () => {}; // Return unsubscribe
	});
	deleteApplication.mockClear();
	removeApplicationFromApplicant.mockClear();

	useAuth.mockReturnValue({ user, applicant });
	useConfig.mockReturnValue(config);
	useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
	useAlert.mockReturnValue({
		showAlert: jest.fn(),
		showAnnouncement: jest.fn((props) => (props.message ? <div>{props.message}</div> : null)),
	});
	useTitle.mockReturnValue({ setTitle: jest.fn() });
	getApplyContent.mockReturnValue(mockContent);
};

// --- Tests ---

describe('src/pages/apply/Apply.jsx', () => {
	it('renders loader when no user is present', async () => {
		setupMocks({ user: null, applicant: null, config: mockConfigNoMessage });
		await act(async () => {
			render(<Apply />);
		});
		expect(screen.getByTestId('loader')).toBeInTheDocument();
		expect(screen.queryByText('Apply Title')).not.toBeInTheDocument();
	});

	it('renders page content, available apps, and no "Your Applications" when user has no applications', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicantNoApps, config: mockConfigNoMessage });
		await act(async () => {
			render(<Apply />);
		});

		expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
		expect(screen.getByTestId('crumbs')).toBeInTheDocument();
		expect(screen.getByText('Apply Title')).toBeInTheDocument();
		expect(screen.getByText('Subtitle paragraph 1.')).toBeInTheDocument();
		expect(screen.getByTestId('rsvp-card')).toBeInTheDocument();
		expect(screen.queryByText('Your Applications')).not.toBeInTheDocument();
		expect(screen.getByText('Available Applications')).toBeInTheDocument();
		expect(screen.getByText('Scholarship Application')).toBeInTheDocument();
		expect(screen.getByText('Grant Application')).toBeInTheDocument();
		expect(screen.getByText('Scholarship Application').closest('a')).not.toHaveAttribute('aria-disabled');
		// FIX 2: Check for 'aria-disabled' instead of 'disabled'
		expect(screen.getByText('Grant Application').closest('a')).toHaveAttribute('aria-disabled', 'true');
	});

	it('renders an announcement if configured', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicantNoApps, config: mockConfig });
		const { showAnnouncement } = useAlert();
		await act(async () => {
			render(<Apply />);
		});

		expect(showAnnouncement).toHaveBeenCalledWith({ message: mockConfig.APPLICANT_MESSAGE });
		expect(screen.getByText(mockConfig.APPLICANT_MESSAGE)).toBeInTheDocument();
	});

	it('fetches and renders existing applications', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicant, config: mockConfig, applications: mockApplications });
		await act(async () => {
			render(<Apply />);
		});

		expect(getRealTimeApplicationsByIDs).toHaveBeenCalledWith(mockApplicant.applications, expect.any(Function));
		expect(screen.getByText('Your Applications')).toBeInTheDocument();
		expect(screen.getByText('Scholarship (2023)')).toBeInTheDocument();
		expect(screen.getByText(ApplicationStatus.started)).toBeInTheDocument();
		expect(screen.getByText('Grant (2023)')).toBeInTheDocument();
		expect(screen.getByText(ApplicationStatus.submitted)).toBeInTheDocument();
		expect(screen.getByText('Scholarship (2022)')).toBeInTheDocument();
		expect(screen.getByText(ApplicationStatus.awarded)).toBeInTheDocument();
	});

	it('navigates to "updateApplication" when clicking a "Started" application', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicant, config: mockConfig, applications: mockApplications });
		await act(async () => {
			render(<Apply />);
		});

		const startedAppCard = screen.getByText(ApplicationStatus.started).closest('div');
		await act(async () => {
			fireEvent.click(startedAppCard);
		});

		const expectedPath = `/apply/scholarship/${mockApplications[0].id}`;
		expect(mockNavigate).toHaveBeenCalledWith(expectedPath, { replace: true });
	});

	it('navigates to "updateApplication" when clicking a "Submitted" application', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicant, config: mockConfig, applications: mockApplications });
		await act(async () => {
			render(<Apply />);
		});

		const submittedAppCard = screen.getByText(ApplicationStatus.submitted).closest('div');
		await act(async () => {
			fireEvent.click(submittedAppCard);
		});

		const expectedPath = `/apply/grant/${mockApplications[1].id}`;
		expect(mockNavigate).toHaveBeenCalledWith(expectedPath, { replace: true });
	});

	it('navigates to "reviewApp" when clicking a non-started/submitted application', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicant, config: mockConfig, applications: mockApplications });
		await act(async () => {
			render(<Apply />);
		});

		const awardedAppCard = screen.getByText(ApplicationStatus.awarded).closest('div');
		await act(async () => {
			fireEvent.click(awardedAppCard);
		});

		const expectedPath = `/review/${mockApplications[2].id}`;
		expect(mockNavigate).toHaveBeenCalledWith(expectedPath, { replace: true });
	});

	it('deletes an application when delete icon is clicked', async () => {
		setupMocks({ user: mockUser, applicant: mockApplicant, config: mockConfig, applications: mockApplications });
		const { showAlert } = useAlert();

		await act(async () => {
			render(<Apply />);
		});

		const deleteIcons = screen.getAllByTestId('DeleteOutlineOutlinedIcon');
		const deleteIcon = deleteIcons[0];

		await act(async () => {
			fireEvent.click(deleteIcon);
		});

		expect(mockNavigate).not.toHaveBeenCalled();
		expect(deleteApplication).toHaveBeenCalledWith(mockApplications[0]);
		expect(removeApplicationFromApplicant).toHaveBeenCalledWith(mockUser.uid, mockApplications[0].id);
		expect(showAlert).toHaveBeenCalledWith('application', 'deleted');
	});
});
