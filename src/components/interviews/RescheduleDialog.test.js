import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RescheduleDialog from './RescheduleDialog';
import { httpsCallable } from 'firebase/functions';
import { useAlert } from '../../context/AlertContext';
import dayjs from 'dayjs';

// Mock dependencies
jest.mock('firebase/functions', () => ({
	httpsCallable: jest.fn(),
}));

jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));
import * as firebase from '../../config/data/firebase';
jest.mock('../../config/data/firebase', () => ({
	rescheduleInterview: jest.fn(),
}));

const mockHandleError = jest.fn();
const mockShowAlert = jest.fn();

describe('RescheduleDialog', () => {
	const mockOnSuccess = jest.fn();
	const mockOnCancel = jest.fn();
	const mockInterview = {
		id: 'interview123',
		startTime: {
			toDate: () => dayjs('2025-12-01T10:00:00').toDate(),
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useAlert.mockReturnValue({
			handleError: mockHandleError,
			showAlert: mockShowAlert,
		});
		firebase.rescheduleInterview.mockResolvedValue({ data: { message: 'Success' } });
	});

	it('renders the dialog with the current time and new time pre-filled', () => {
		render(<RescheduleDialog interview={mockInterview} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

		expect(screen.getByText('Reschedule Interview')).toBeInTheDocument();
		expect(screen.getByText(/Current time: December 1, 2025 10:00 AM/i)).toBeInTheDocument();
		expect(screen.getByLabelText('New Interview Time')).toHaveValue('2025-12-01T10:00');
	});

	it('calls onCancel when the cancel button is clicked', () => {
		render(<RescheduleDialog interview={mockInterview} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);
		fireEvent.click(screen.getByText('Cancel'));
		expect(mockOnCancel).toHaveBeenCalledTimes(1);
	});

	it('shows a warning if no new time is selected', () => {
		render(<RescheduleDialog interview={mockInterview} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

		const timeInput = screen.getByLabelText('New Interview Time');
		fireEvent.change(timeInput, { target: { value: '' } });

		fireEvent.click(screen.getByText('Schedule Only'));

		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Please select a new time.', type: 'warning' });
		expect(firebase.rescheduleInterview).not.toHaveBeenCalled();
	});

	it('calls the reschedule function with sendInvite=true when "Schedule & Invite" is clicked', async () => {
		const mockCall = jest.fn(() => Promise.resolve({ data: { message: 'Success' } }));
		httpsCallable.mockReturnValue(mockCall);

		render(<RescheduleDialog interview={mockInterview} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

		const newTime = '2025-12-02T11:00';
		fireEvent.change(screen.getByLabelText('New Interview Time'), { target: { value: newTime } });
		fireEvent.click(screen.getByText('Schedule & Invite'));

		await waitFor(() => {
			expect(firebase.rescheduleInterview).toHaveBeenCalledWith({
				interviewId: 'interview123',
				newStartTime: expect.any(String),
				newEndTime: expect.any(String),
				sendInvite: true,
			});
			expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Success', type: 'success' });
			expect(mockOnSuccess).toHaveBeenCalledTimes(1);
		});
	});
});