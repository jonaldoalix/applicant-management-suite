import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ManualScheduler from './ManualScheduler';
import { functions, getAllApplicantsSimple, getApplicationsForApplicant, scheduleSingleInterview } from '../../config/data/firebase';
import { httpsCallable } from 'firebase/functions';
import { useAlert } from '../../context/AlertContext';

// Mock dependencies
jest.mock('../../config/data/firebase', () => ({
	functions: {},
	getAllApplicantsSimple: jest.fn(),
	getApplicationsForApplicant: jest.fn(),
	scheduleSingleInterview: jest.fn(),
}));
jest.mock('firebase/functions', () => ({
	httpsCallable: jest.fn(),
}));
jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

describe('ManualScheduler', () => {
	const mockOnSuccess = jest.fn();
	const mockOnClose = jest.fn();
	const mockHandleError = jest.fn();
	const mockShowAlert = jest.fn();

	const mockApplicants = [
		{ id: 'app1', name: 'Alice Smith' },
		{ id: 'app2', name: 'Bob Johnson' },
	];
	const mockApplications = [
		{ id: 'window1', type: 'Fall 2025', window: 'Window 1' },
	];

	beforeEach(() => {
		jest.clearAllMocks();
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		getAllApplicantsSimple.mockResolvedValue(mockApplicants);
		getApplicationsForApplicant.mockResolvedValue(mockApplications);
		httpsCallable.mockReturnValue(jest.fn(() => Promise.resolve({ data: { message: 'Success' } })));
	});

	it('renders the form and fetches applicants', async () => {
		render(<ManualScheduler onSuccess={mockOnSuccess} onClose={mockOnClose} />);

		expect(screen.getByText('Manually Schedule an Interview')).toBeInTheDocument();
		expect(getAllApplicantsSimple).toHaveBeenCalledTimes(1);
		await waitFor(() => {
			expect(screen.getByLabelText('Select Applicant')).toBeInTheDocument();
		});
	});

	it('fetches applications when an applicant is selected', async () => {
		render(<ManualScheduler onSuccess={mockOnSuccess} onClose={mockOnClose} />);

		const applicantInput = await screen.findByLabelText('Select Applicant');
		fireEvent.change(applicantInput, { target: { value: 'Alice' } });
		fireEvent.click(await screen.findByText('Alice Smith'));

		await waitFor(() => {
			expect(getApplicationsForApplicant).toHaveBeenCalledWith('app1');
		});

		const appSelect = screen.getByRole('combobox', { name: 'Select Application' });
		fireEvent.mouseDown(appSelect);
		expect(await screen.findByText('Fall 2025 - Window 1')).toBeInTheDocument();
	});

	it('submits the form and calls the cloud function', async () => {
		scheduleSingleInterview.mockResolvedValue({ data: { message: 'Success' } });

		render(<ManualScheduler onSuccess={mockOnSuccess} onClose={mockOnClose} />);

		// Select Applicant
		const applicantInput = await screen.findByLabelText('Select Applicant');
		fireEvent.change(applicantInput, { target: { value: 'Alice' } });
		fireEvent.click(await screen.findByText('Alice Smith'));

		// Select Application
		await waitFor(() => expect(getApplicationsForApplicant).toHaveBeenCalled());
		const appSelect = screen.getByRole('combobox', { name: 'Select Application' });
		fireEvent.mouseDown(appSelect);
		fireEvent.click(await screen.findByText('Fall 2025 - Window 1'));

		// Set Time
		const timeInput = screen.getByLabelText('Interview Start Time');
		fireEvent.change(timeInput, { target: { value: '2025-12-01T10:00' } });

		// Submit
		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'Schedule Interview' }));
		});

		expect(scheduleSingleInterview).toHaveBeenCalledWith({
			applicationId: 'window1',
			startTime: expect.stringContaining('2025-12-01T'),
			endTime: expect.stringContaining('2025-12-01T'),
		});

		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Success', type: 'success' });
		expect(mockOnSuccess).toHaveBeenCalledTimes(1);
	});
});