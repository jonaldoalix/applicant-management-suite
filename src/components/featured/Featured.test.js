import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Featured from './Featured';
import { useConfig } from '../../context/ConfigContext';
import * as firebase from '../../config/data/firebase';
import { ApplicationType } from '../../config/data/collections';

// Mock Context
jest.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));

// Mock Firebase
jest.mock('../../config/data/firebase', () => ({
	getCurrentlyEligibleApplicationsCountByType: jest.fn(),
	getBenchmarkedAwardCounts: jest.fn(),
}));

// Mock Timer component
jest.mock('../timer/Timer', () => () => <div data-testid='timer'>Timer</div>);

// Mock ApplicationType
jest.mock('../../config/data/collections', () => ({
	ApplicationType: {
		newApplication: 'New',
		returningGrant: 'Returning',
		scholarship: 'Scholarship',
	},
}));

const mockUseConfig = useConfig;
const mockGetCounts = firebase.getCurrentlyEligibleApplicationsCountByType;
const mockGetBenchmarks = firebase.getBenchmarkedAwardCounts;

describe('Featured', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		mockUseConfig.mockReturnValue({
			APPLICATION_DEADLINE: '2025-12-31T23:59:59Z',
		});

		// Use setSystemTime for modern Jest
		jest.useFakeTimers().setSystemTime(new Date('2025-12-21T12:00:00Z'));

		mockGetCounts.mockImplementation((type) => {
			if (type === ApplicationType.newApplication) return Promise.resolve(10);
			if (type === ApplicationType.returningGrant) return Promise.resolve(20);
			if (type === ApplicationType.scholarship) return Promise.resolve(5);
			return Promise.resolve(0);
		});

		mockGetBenchmarks.mockResolvedValue({
			[ApplicationType.newApplication]: 20, // 50%
			[ApplicationType.returningGrant]: 20, // 100%
			[ApplicationType.scholarship]: 50, // 10%
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test('renders benchmark progress and 3-year trends', async () => {
		await act(async () => {
			render(<Featured />);
		});

		await waitFor(() => {
			expect(screen.getByText(/Benchmark Progress/i)).toBeInTheDocument();
			expect(screen.getByText(/3-Year Award Trends/i)).toBeInTheDocument();
		});
	});

	test('renders Timer component', async () => {
		await act(async () => {
			render(<Featured />);
		});
		await waitFor(() => {
			expect(screen.getByTestId('timer')).toBeInTheDocument();
		});
	});

	test('calculates and displays deadline and days left', async () => {
		await act(async () => {
			render(<Featured />);
		});

		await waitFor(() => {
			expect(screen.getByText(/Deadline: 12\/31\/2025/i)).toBeInTheDocument();
			// Math.ceil diff between Dec 21 and Dec 31 is 11 days (including partials)
			expect(screen.getByText(/11 days left/i)).toBeInTheDocument();
		});
	});

	test('fetches data and renders progress bars correctly', async () => {
		await act(async () => {
			render(<Featured />);
		});

		await waitFor(() => {
			expect(mockGetCounts).toHaveBeenCalledTimes(3);
			expect(mockGetBenchmarks).toHaveBeenCalledTimes(3);

			expect(screen.getByText('New Applicants: 10 / 20 (50%)')).toBeInTheDocument();
			expect(screen.getByText('Returning Grants: 20 / 20 (100%)')).toBeInTheDocument();
			expect(screen.getByText('Scholarships: 5 / 50 (10%)')).toBeInTheDocument();

			const progressBars = screen.getAllByRole('progressbar');
			expect(progressBars[0]).toHaveAttribute('aria-valuenow', '50');
			expect(progressBars[1]).toHaveAttribute('aria-valuenow', '100');
			expect(progressBars[2]).toHaveAttribute('aria-valuenow', '10');
		});
	});

	test('renders 3-year history correctly', async () => {
		await act(async () => {
			render(<Featured />);
		});

		await waitFor(() => {
			expect(screen.getByText('2022')).toBeInTheDocument();
			expect(screen.getByText('2023')).toBeInTheDocument();
			expect(screen.getByText('2024')).toBeInTheDocument();
			expect(screen.getByText('⬤ New')).toBeInTheDocument();
			expect(screen.getByText('⬤ Returning')).toBeInTheDocument();
			expect(screen.getByText('⬤ Scholarship')).toBeInTheDocument();
		});
	});
});
