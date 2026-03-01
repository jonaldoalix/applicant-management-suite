import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Chart from './Chart';
import * as firebase from '../../config/data/firebase';

// Mock firebase
jest.mock('../../config/data/firebase', () => ({
	getApplicationsByYear: jest.fn(),
}));

// Mock recharts
jest.mock('recharts', () => ({
	AreaChart: ({ children }) => <div data-testid='area-chart'>{children}</div>,
	Area: () => <div data-testid='area' />,
	XAxis: () => <div data-testid='x-axis' />,
	YAxis: () => <div data-testid='y-axis' />,
	CartesianGrid: () => <div data-testid='cartesian-grid' />,
	Tooltip: () => <div data-testid='tooltip' />,
	ResponsiveContainer: ({ children }) => <div data-testid='responsive-container'>{children}</div>,
}));

const mockData = [
	{ year: '2022', count: 10 },
	{ year: '2023', count: 20 },
];

describe('Chart', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		firebase.getApplicationsByYear.mockResolvedValue(mockData);
	});

	test('renders loading state initially', () => {
		firebase.getApplicationsByYear.mockImplementation(() => new Promise(() => { })); // Never resolves
		render(<Chart title='Test Chart' />);
		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	test('fetches data and renders chart on mount', async () => {
		await act(async () => {
			render(<Chart title='Test Chart' />);
		});

		await waitFor(() => {
			expect(firebase.getApplicationsByYear).toHaveBeenCalledTimes(1);
			expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
			expect(screen.getByTestId('area-chart')).toBeInTheDocument();
			expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
		});
	});

	test('renders the correct title', async () => {
		await act(async () => {
			render(<Chart title='Applications Over Time' />);
		});

		await waitFor(() => {
			expect(screen.getByText('Applications Over Time')).toBeInTheDocument();
		});
	});

	test('handles data fetch error', async () => {
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
		firebase.getApplicationsByYear.mockRejectedValue(new Error('Failed to fetch'));

		await act(async () => {
			render(<Chart title='Test Chart' />);
		});

		await waitFor(() => {
			expect(screen.queryByText('Loading...')).not.toBeInTheDocument(); // Loading stops on error
			expect(consoleError).toHaveBeenCalledWith('Error fetching application data:', expect.any(Error));
		});
		consoleError.mockRestore();
	});

	// Note: Testing the different 'counter' cases (0, 1, 2) is difficult
	// because 'counter' is component-internal state that is not exposed
	// and is reset on every data fetch. We can confirm the default case (0) renders.
	test('renders default chart (case 0)', async () => {
		await act(async () => {
			render(<Chart title='Test Chart' />);
		});

		await waitFor(() => {
			expect(screen.getByTestId('area-chart')).toBeInTheDocument();
			// Check for elements specific to case 0
			expect(screen.getByTestId('area')).toBeInTheDocument();
			expect(screen.getByTestId('x-axis')).toBeInTheDocument();
		});
	});
});
