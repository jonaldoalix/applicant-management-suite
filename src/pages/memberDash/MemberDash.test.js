import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';

// 1. MOCK ADMIN CONFIG WITH EXPOSED SPIES
jest.mock('../../config/admin/dashboard', () => {
	// Create distinct spies for each widget to prevent callback overwrites
	const statusFetcher = jest.fn();
	const eligibleFetcher = jest.fn();
	const comparisonFetcher = jest.fn();
	const customFetcher = jest.fn();

	const MockCustomComponent = ({ data }) => <div data-testid='custom-component'>{data || 'initial'}</div>;

	return {
		__esModule: true,
		memberDashContent: {
			widgets: [
				{
					id: 'New Application',
					title: 'Status Widget',
					category: 'status',
					fetcher: statusFetcher, // Distinct fetcher
					comparisonFetcher: null,
				},
				{
					id: 'eligible-widget',
					title: 'Eligible Widget',
					category: 'potentiallyEligible',
					fetcher: eligibleFetcher, // Distinct fetcher
					comparisonFetcher: comparisonFetcher,
					isGainPositive: (curr, prev) => curr > prev,
				},
			],
			layout: [
				{ type: 'widgets', id: 'widgets' },
				{
					type: 'customRow',
					id: 'custom',
					components: [
						{
							id: 'custom-comp-1',
							component: MockCustomComponent,
							fetcher: customFetcher,
							initialState: 'initial',
							props: {},
						},
					],
				},
			],
			// Expose the specific jest functions to the test
			_testMocks: {
				statusFetcher,
				eligibleFetcher,
				comparisonFetcher,
				customFetcher,
			},
		},
	};
});

// 2. MOCK CONTEXTS
jest.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));

jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

// 3. MOCK CHILD COMPONENTS
jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loading...</div>);

jest.mock('../../components/widget/Widget', () => (props) => (
	<div data-testid='widget'>
		<span>{props.title}</span>
		<span data-testid={`amount-${props.title}`}>{props.info?.amount ?? '0'}</span>
		<span data-testid={`percent-${props.title}`}>{props.info?.percent ?? '0'}%</span>
	</div>
));

// 4. IMPORTS
import MemberDash from './MemberDash';
import { memberDashContent } from '../../config/admin/dashboard';
import { useConfig } from '../../context/ConfigContext';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';

// Extract the mocks we exposed in step 1
const { statusFetcher, eligibleFetcher, comparisonFetcher, customFetcher } = memberDashContent._testMocks;

describe('MemberDash Component', () => {
	// Variables to capture the callbacks passed to our mocks
	let statusCallback;
	let eligibleCallback;
	let comparisonCallback;
	let customCallback;

	// Spies for unsubs
	let statusUnsubSpy;
	let eligibleUnsubSpy;
	let comparisonUnsubSpy;
	let customUnsubSpy;

	beforeEach(() => {
		jest.clearAllMocks();

		// Reset captured callbacks
		statusCallback = null;
		eligibleCallback = null;
		comparisonCallback = null;
		customCallback = null;

		// Create fresh spies for unsubscription
		statusUnsubSpy = jest.fn();
		eligibleUnsubSpy = jest.fn();
		comparisonUnsubSpy = jest.fn();
		customUnsubSpy = jest.fn();

		// Define the behavior of the mocks for THIS test run
		statusFetcher.mockImplementation((cb) => {
			statusCallback = cb;
			return statusUnsubSpy;
		});

		eligibleFetcher.mockImplementation((cb) => {
			eligibleCallback = cb;
			return eligibleUnsubSpy;
		});

		comparisonFetcher.mockImplementation((date, cb) => {
			comparisonCallback = cb;
			return comparisonUnsubSpy;
		});

		customFetcher.mockImplementation((cb) => {
			customCallback = cb;
			return customUnsubSpy;
		});

		// Setup Default Context Return Values
		useTheme.mockReturnValue({
			boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
		});

		useConfig.mockReturnValue({
			APPLICATION_DEADLINE: '2025-12-31T23:59:59.000Z',
			MEMBER_MESSAGE: null,
		});

		useAlert.mockReturnValue({
			showAnnouncement: jest.fn(),
			handleError: jest.fn(),
		});
	});

	test('renders loader initially', () => {
		useConfig.mockReturnValueOnce({
			APPLICATION_DEADLINE: null,
		});

		render(<MemberDash />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('fetches data and renders widgets and custom rows', async () => {
		render(<MemberDash />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		// Verify fetchers were called
		expect(statusFetcher).toHaveBeenCalled();
		expect(customFetcher).toHaveBeenCalled();

		// Verify we captured the callbacks
		expect(statusCallback).toBeInstanceOf(Function);
		expect(customCallback).toBeInstanceOf(Function);

		// Trigger updates
		act(() => {
			customCallback('test data');
			statusCallback(42);
		});

		await waitFor(() => {
			expect(screen.getByTestId('custom-component')).toHaveTextContent('test data');
			expect(screen.getByText('Status Widget')).toBeInTheDocument();
		});
	});

	test('calculates widget percentages correctly', async () => {
		render(<MemberDash />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(statusCallback).toBeInstanceOf(Function);

		// Update the 'New Application' (Status) widget
		act(() => statusCallback(50));

		await waitFor(() => {
			// Logic Check:
			// 'New Application' ID triggers totals.status logic.
			// Total Status = 50.
			// 'Status Widget' amount = 50.
			// Percent = 50/50 = 100%.
			expect(screen.getByTestId('percent-Status Widget')).toHaveTextContent('100%');
		});
	});

	test('displays announcement if configured', () => {
		useConfig.mockReturnValue({
			APPLICATION_DEADLINE: '2025-12-31',
			MEMBER_MESSAGE: 'Test Message',
		});

		render(<MemberDash />);
		expect(useAlert().showAnnouncement).toHaveBeenCalledWith({
			message: 'Test Message',
		});
	});

	test('calculates comparison logic', async () => {
		render(<MemberDash />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(comparisonFetcher).toHaveBeenCalled();
		expect(comparisonCallback).toBeInstanceOf(Function);
	});

	test('cleans up subscriptions on unmount', async () => {
		const { unmount } = render(<MemberDash />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());
		unmount();

		expect(statusUnsubSpy).toHaveBeenCalled();
		expect(customUnsubSpy).toHaveBeenCalled();
	});
});
