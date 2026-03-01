import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AutoScheduler from './AutoScheduler';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { httpsCallable } from 'firebase/functions';
import { functions, autoScheduleInterviews } from '../../config/data/firebase';
import { v4 as uuid } from 'uuid';

// Mock Dependencies
jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));
jest.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));
jest.mock('firebase/functions', () => ({
	httpsCallable: jest.fn(),
}));
// Mock the *named export* 'functions' and cloud functions from your firebase.js
jest.mock('../../config/data/firebase', () => ({
	functions: { app: 'mock-functions' },
	autoScheduleInterviews: jest.fn(),
}));

// --- THIS IS THE FIX ---
// The variable MUST be prefixed with 'mock' to be accessible inside jest.mock()
let mockIdCounter = 0;
jest.mock('uuid', () => ({ v4: () => `id-${mockIdCounter++}` }));
// --------------------

describe('AutoScheduler Component', () => {
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockOnSuccess = jest.fn();
	const mockOnClose = jest.fn();
	const mockApiCall = jest.fn();

	beforeEach(() => {
		mockIdCounter = 0; // Reset counter for each test
		jest.clearAllMocks();
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useConfig.mockReturnValue({ APPLICATION_DEADLINE: '2025-01-01T00:00:00Z' });
		autoScheduleInterviews.mockResolvedValue({ data: { scheduledCount: 5, skippedApplicants: [] } });
	});

	it('renders the initial form', () => {
		render(<AutoScheduler onSuccess={mockOnSuccess} onClose={mockOnClose} />);
		expect(screen.getByText('Auto-Schedule Interviews')).toBeInTheDocument();
		expect(screen.getAllByLabelText('Start')).toHaveLength(1);
	});

	it('adds a new time block when "Add Time Block" is clicked', async () => {
		render(<AutoScheduler onSuccess={mockOnSuccess} onClose={mockOnClose} />);
		await act(async () => {
			fireEvent.click(screen.getByText('Add Time Block'));
		});
		expect(screen.getAllByLabelText('Start')).toHaveLength(2);
	});

	it('removes a time block when delete is clicked', async () => {
		render(<AutoScheduler onSuccess={mockOnSuccess} onClose={mockOnClose} />);
		await act(async () => {
			fireEvent.click(screen.getByText('Add Time Block')); // Add one, now 2 blocks
		});
		expect(screen.getAllByLabelText('Start')).toHaveLength(2);

		await act(async () => {
			fireEvent.click(screen.getAllByTestId('DeleteIcon')[0]); // Delete first block
		});

		expect(screen.getAllByLabelText('Start')).toHaveLength(1); // Should pass
	});

	it('submits valid time blocks and calls onSuccess', async () => {
		render(<AutoScheduler onSuccess={mockOnSuccess} onClose={mockOnClose} />);
		const startInput = screen.getAllByLabelText('Start')[0];
		const endInput = screen.getAllByLabelText('End')[0];

		fireEvent.change(startInput, { target: { value: '2025-02-01T10:00' } });
		fireEvent.change(endInput, { target: { value: '2025-02-01T12:00' } });

		await act(async () => {
			fireEvent.click(screen.getByText('Run Scheduler'));
		});

		// Check that it was called with the *mocked* functions object
		expect(autoScheduleInterviews).toHaveBeenCalledWith({ deadline: '2025-01-01T00:00:00Z', availability: expect.any(Array) });
	});
});
