import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RSVPStatusCard from './RSVPStatusCard';
import { db, generateICSDownloadURL, getRealTimeMeetings } from '../../config/data/firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { InterviewStatus } from '../../config/data/collections';

// Mock dependencies
jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	updateDoc: jest.fn(),
}));
jest.mock('../../config/data/firebase', () => ({
	db: {},
	generateICSDownloadURL: jest.fn(),
	getRealTimeMeetings: jest.fn(),
}));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mockNavigate,
}));

// Helper to create mock date objects
const toDate = (dateStr) => ({ toDate: () => new Date(dateStr) });

describe('RSVPStatusCard', () => {
	
	const mockInterviewBase = {
		id: 'interview123',
		rsvpStatus: 'unknown',
		status: InterviewStatus.invited,
		startTime: toDate('2025-12-10T14:00:00'),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useAuth.mockReturnValue({ user: { uid: 'applicant123' } });
		useTheme.mockReturnValue({ boxShadow: 'none' });
		const { useAlert } = require('../../context/AlertContext');
		useAlert.mockReturnValue({ showAlert: jest.fn(), handleError: jest.fn() });
		updateDoc.mockResolvedValue(undefined);
		doc.mockReturnValue('mock-doc-ref');
	});

	it('renders nothing if loading or no interviews', () => {
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([]); // Empty array
			return () => {};
		});
		const { container } = render(<RSVPStatusCard />, { wrapper: MemoryRouter });
		expect(container).toBeEmptyDOMElement();
	});

	it('renders "unknown" state with Confirm/Unavailable buttons', async () => {
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([mockInterviewBase]);
			return () => {};
		});
		render(<RSVPStatusCard />, { wrapper: MemoryRouter });

		await waitFor(() => {
			expect(screen.getByText(/Your interview is scheduled. Please confirm/i)).toBeInTheDocument();
			expect(screen.getByText('Confirm')).toBeInTheDocument();
			expect(screen.getByText('Unavailable')).toBeInTheDocument();
		});
	});

	it('calls updateDoc with "yes" when "Confirm" is clicked', async () => {
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([mockInterviewBase]);
			return () => {};
		});
		render(<RSVPStatusCard />, { wrapper: MemoryRouter });

		const confirmButton = await screen.findByText('Confirm');
		fireEvent.click(confirmButton);

		await waitFor(() => {
			expect(updateDoc).toHaveBeenCalledWith(
				'mock-doc-ref',
				expect.objectContaining({
					rsvpStatus: 'yes',
					status: InterviewStatus.confirmed,
				})
			);
		});
	});

	it('renders "yes" state with confirmed chip and waiting room button', async () => {
		const confirmedInterview = {
			...mockInterviewBase,
			rsvpStatus: 'yes',
			status: InterviewStatus.confirmed,
		};
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([confirmedInterview]);
			return () => {};
		});
		render(<RSVPStatusCard />, { wrapper: MemoryRouter });

		await waitFor(() => {
			expect(screen.getByText(/Your interview is scheduled and confirmed./i)).toBeInTheDocument();
			expect(screen.getByText('RSVP: Confirmed')).toBeInTheDocument();
			expect(screen.getByText('Go to Waiting Room')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByText('Go to Waiting Room'));
		expect(mockNavigate).toHaveBeenCalledWith('/interviews/waiting-room/interview123');
	});

	it('renders "inProgress" state with "Join Interview Now" button', async () => {
		const inProgressInterview = {
			...mockInterviewBase,
			rsvpStatus: 'yes',
			status: InterviewStatus.inProgress,
		};
		getRealTimeMeetings.mockImplementation((uid, isMember, callback) => {
			callback([inProgressInterview]);
			return () => {};
		});
		render(<RSVPStatusCard />, { wrapper: MemoryRouter });

		const joinButton = await screen.findByText('Join Interview Now');
		fireEvent.click(joinButton);
		expect(mockNavigate).toHaveBeenCalledWith('/interviews/interview-room/interview123');
	});
});