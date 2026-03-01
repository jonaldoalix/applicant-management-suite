import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StatusPanel from './StatusPanel';
import { getRealTimeMeetings } from '../../config/data/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { InterviewStatus } from '../../config/data/collections';

// Mock dependencies
jest.mock('../../config/data/firebase', () => ({
	getRealTimeMeetings: jest.fn(),
}));
jest.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));
jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mockNavigate,
}));

// Helper to create mock date objects
const toDate = (dateStr) => ({ toDate: () => new Date(dateStr) });

describe('InterviewStatusPanel', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useAuth.mockReturnValue({ user: { uid: 'admin123' } });
		useTheme.mockReturnValue({ boxShadow: 'none' });
	});

	it('renders a loading spinner initially', () => {
		getRealTimeMeetings.mockReturnValue(() => {}); // No-op unsubscribe
		render(<StatusPanel />, { wrapper: MemoryRouter });
		expect(screen.getByRole('progressbar')).toBeInTheDocument();
	});

	it('renders interview data when available', async () => {
		const mockMeetings = [
			{ id: 'in-progress-1', status: InterviewStatus.inProgress, displayName: 'Test User 1', startTime: toDate('2025-11-16T10:00:00') },
			{ id: 'completed-1', status: InterviewStatus.completed, displayName: 'Test User 2', startTime: toDate('2025-11-16T09:00:00') },
			{ id: 'confirmed-1', status: InterviewStatus.confirmed, displayName: 'Test User 3', startTime: toDate('2025-11-16T11:00:00') },
		];

		// Mock implementation of getRealTimeMeetings
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback(mockMeetings);
			return () => {}; // Return mock unsubscribe function
		});

		render(<StatusPanel />, { wrapper: MemoryRouter });

		await waitFor(() => {
			// Summary
			expect(screen.getByText('Scheduled: 1')).toBeInTheDocument();
			expect(screen.getByText('Completed: 1')).toBeInTheDocument();
			
			// In Progress Card
			expect(screen.getByText('Interview In Progress')).toBeInTheDocument();
			expect(screen.getByText('Test User 1')).toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Join Now' })).toBeInTheDocument();

			// Next Up Card
			expect(screen.getByText('Up Next')).toBeInTheDocument();
			expect(screen.getByText('Test User 3')).toBeInTheDocument();

			// Deliberation Button
			expect(screen.getByRole('button', { name: 'Wait in Deliberation Room' })).toBeInTheDocument();
		});
	});

	it('navigates when "Join Now" is clicked', async () => {
		const mockMeetings = [
			{ id: 'in-progress-1', status: InterviewStatus.inProgress, displayName: 'Test User 1', startTime: toDate('2025-11-16T10:00:00') },
		];
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback(mockMeetings);
			return () => {};
		});

		render(<StatusPanel />, { wrapper: MemoryRouter });

		const joinButton = await screen.findByRole('button', { name: 'Join Now' });
		fireEvent.click(joinButton);

		expect(mockNavigate).toHaveBeenCalledWith('/interviews/interview-room/in-progress-1');
	});
});