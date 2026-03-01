import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RSVP from './RSVP';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { updateDoc, serverTimestamp } from 'firebase/firestore';
import { useTitle } from '../../context/HelmetContext';
import { InterviewStatus } from '../../config/data/collections';

// --- Mocks ---

jest.mock('react-router-dom', () => ({
	useSearchParams: jest.fn(),
	useNavigate: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	updateDoc: jest.fn(),
	serverTimestamp: jest.fn(),
}));

jest.mock('../../config/data/firebase', () => ({
	db: {},
}));

jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

jest.mock('../../config/data/collections', () => ({
	InterviewStatus: {
		confirmed: 'confirmed',
		invited: 'invited',
	},
}));

describe('RSVP Component', () => {
	const mockNavigate = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useNavigate.mockReturnValue(mockNavigate);
		// Mock serverTimestamp to return a stable value for assertion
		serverTimestamp.mockReturnValue('mock-timestamp');
		// Mock updateDoc to resolve successfully by default
		updateDoc.mockResolvedValue({});
	});

	test('renders loading state initially', () => {
		// Mock params to prevent immediate invalid state (though effect runs after render anyway)
		useSearchParams.mockReturnValue([new URLSearchParams('interviewId=123&response=yes')]);

		render(<RSVP />);
		// Check for CircularProgress (MUI renders it with role 'progressbar')
		expect(screen.getByRole('progressbar')).toBeInTheDocument();
	});

	test('displays "Invalid RSVP link" if parameters are missing', async () => {
		// Empty params
		useSearchParams.mockReturnValue([new URLSearchParams('')]);

		render(<RSVP />);

		await waitFor(() => {
			expect(screen.getByText(/Invalid Link/i)).toBeInTheDocument();
		});

		expect(updateDoc).not.toHaveBeenCalled();
	});

	test('displays "Invalid RSVP link" if response value is not "yes" or "no"', async () => {
		// Invalid response string
		useSearchParams.mockReturnValue([new URLSearchParams('interviewId=123&response=maybe')]);

		render(<RSVP />);

		await waitFor(() => {
			expect(screen.getByText(/Invalid Link/i)).toBeInTheDocument();
		});

		expect(updateDoc).not.toHaveBeenCalled();
	});

	test('successfully updates RSVP to "yes" (confirmed)', async () => {
		useSearchParams.mockReturnValue([new URLSearchParams('interviewId=test-id&response=yes')]);

		render(<RSVP />);

		// Wait for success message
		await waitFor(() => {
			expect(screen.getByText(/RSVP Received/i)).toBeInTheDocument();
		});

		// Verify Firestore update
		expect(updateDoc).toHaveBeenCalledWith(
			undefined, // The ref (mocked result of doc())
			expect.objectContaining({
				rsvpStatus: 'yes',
				rsvpTimestamp: 'mock-timestamp',
				status: InterviewStatus.confirmed,
			})
		);
	});

	test('successfully updates RSVP to "no" (invited)', async () => {
		useSearchParams.mockReturnValue([new URLSearchParams('interviewId=test-id&response=no')]);

		render(<RSVP />);

		await waitFor(() => {
			expect(screen.getByText(/RSVP Received/i)).toBeInTheDocument();
		});

		// Verify Firestore update logic for 'no'
		expect(updateDoc).toHaveBeenCalledWith(
			undefined,
			expect.objectContaining({
				rsvpStatus: 'no',
				rsvpTimestamp: 'mock-timestamp',
				status: InterviewStatus.invited,
			})
		);
	});

	test('handles Firestore errors gracefully', async () => {
		useSearchParams.mockReturnValue([new URLSearchParams('interviewId=test-id&response=yes')]);
		updateDoc.mockRejectedValue(new Error('Firestore failed'));

		// Mock console.error to keep test output clean
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

		render(<RSVP />);

		await waitFor(() => {
			expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
		});

		expect(consoleSpy).toHaveBeenCalledWith('Failed to record RSVP:', expect.any(Error));
		consoleSpy.mockRestore();
	});

	test('navigates home when return button is clicked', async () => {
		useSearchParams.mockReturnValue([new URLSearchParams('interviewId=test-id&response=yes')]);

		render(<RSVP />);

		await waitFor(() => {
			expect(screen.getByText(/RSVP Received/i)).toBeInTheDocument();
		});

		const homeBtn = screen.getByText(/Return Home/i);
		fireEvent.click(homeBtn);

		expect(mockNavigate).toHaveBeenCalledWith('/');
	});
});
