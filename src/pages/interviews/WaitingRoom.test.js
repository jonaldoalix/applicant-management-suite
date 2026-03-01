import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import WaitingRoom from './WaitingRoom';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useMeeting } from '../../context/MeetingContext';
import { useAuth } from '../../context/AuthContext';
import { useTitle } from '../../context/HelmetContext';
import { useConfig } from '../../context/ConfigContext';
import { getRealTimeDocument } from '../../config/data/firebase';
import { getDoc, updateDoc } from 'firebase/firestore';

// --- Mocks ---

jest.mock('react-router-dom', () => ({
	useParams: jest.fn(),
	useNavigate: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

jest.mock('../../context/MeetingContext', () => ({
	useMeeting: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

jest.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));

jest.mock('../../config/data/firebase', () => ({
	db: {},
	getRealTimeDocument: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	getDoc: jest.fn(),
	updateDoc: jest.fn(),
}));

jest.mock('../../config/data/collections', () => ({
	collections: {
		interviews: 'interviews',
		applicants: 'applicants',
	},
	InterviewStatus: {
		inProgress: 'in-progress',
	},
}));

jest.mock('../../config/Constants', () => ({
	Assets: {
		header: 'mock-header.png',
		logo: 'mock-logo.png',
	},
	brand: {
		helpEmail: 'test@example.com',
	},
}));

// Mock child component Breadcrumbs/SettingsButton
jest.mock('../../components/breadcrumbs/Breadcrumbs', () => ({
	SettingsButton: () => <button data-testid='settings-btn'>Settings</button>,
}));

describe('WaitingRoom Component', () => {
	const mockNavigate = jest.fn();
	const mockDispatch = jest.fn();
	const mockSetVideoDeviceId = jest.fn();
	const mockSetAudioDeviceId = jest.fn();

	// Media Device Mocks
	const mockGetUserMedia = jest.fn();
	const mockEnumerateDevices = jest.fn();
	const mockStopTrack = jest.fn();

	beforeAll(() => {
		// Setup global navigator mocks
		Object.defineProperty(global.navigator, 'mediaDevices', {
			value: {
				getUserMedia: mockGetUserMedia,
				enumerateDevices: mockEnumerateDevices,
			},
			writable: true,
		});
	});

	beforeEach(() => {
		jest.clearAllMocks();

		// Router
		useParams.mockReturnValue({ interviewId: 'test-interview-123' });
		useNavigate.mockReturnValue(mockNavigate);

		// Contexts
		useTheme.mockReturnValue({
			darkMode: false,
			primaryColor: 'blue',
			dispatch: mockDispatch,
		});

		useMeeting.mockReturnValue({
			videoDeviceId: null,
			audioDeviceId: null,
			setVideoDeviceId: mockSetVideoDeviceId,
			setAudioDeviceId: mockSetAudioDeviceId,
		});

		useAuth.mockReturnValue({
			applicant: { firstName: 'John', lastName: 'Doe' },
		});

		useTitle.mockImplementation(() => { });
		useConfig.mockReturnValue({ helpEmail: 'test@example.com' });

		// Firebase Default Mocks
		getDoc.mockResolvedValue({
			exists: () => true,
			data: () => ({
				applicantId: 'app-123',
				startTime: { toDate: () => new Date(Date.now() + 100000) }, // Future date
				status: 'confirmed',
				firstName: 'Applicant',
				lastName: 'Test',
			}),
		});

		updateDoc.mockResolvedValue({});

		// Mock Realtime Listener
		getRealTimeDocument.mockImplementation((collection, id, callback) => {
			// Trigger initial callback with current status
			callback({ status: 'confirmed' });
			return jest.fn(); // unsubscribe
		});

		// Media Mocks
		mockGetUserMedia.mockResolvedValue({
			getTracks: () => [{ stop: mockStopTrack }],
			getVideoTracks: () => [{ enabled: true, stop: mockStopTrack }],
			getAudioTracks: () => [{ enabled: true, stop: mockStopTrack }],
		});

		mockEnumerateDevices.mockResolvedValue([
			{ kind: 'videoinput', deviceId: 'cam-1', label: 'Camera 1' },
			{ kind: 'audioinput', deviceId: 'mic-1', label: 'Mic 1' },
		]);
	});

	test('renders loading state initially', async () => {
		render(<WaitingRoom />);
		// The first render will definitely have the spinner
		expect(screen.getByRole('progressbar')).toBeInTheDocument();

		// Wait for content to load to prevent act updates after test finishes
		await screen.findByText(/Interview Waiting Room/i);
	});

	test('renders waiting room content after data loads', async () => {
		render(<WaitingRoom />);

		// Wait for the main header to appear (implies loading is false)
		const header = await screen.findByText(/Interview Waiting Room/i);
		expect(header).toBeInTheDocument();

		expect(screen.getByText(/Step 1: Device & Permission Check/i)).toBeInTheDocument();
	});

	test('displays error if interview ID is missing', async () => {
		useParams.mockReturnValue({}); // No ID
		render(<WaitingRoom />);

		// Wait for the error message
		expect(await screen.findByText(/No interview ID was provided/i)).toBeInTheDocument();
	});

	test('displays error if interview not found', async () => {
		getDoc.mockResolvedValue({ exists: () => false }); // Document doesn't exist

		render(<WaitingRoom />);

		// Wait for the error message
		expect(await screen.findByText(/Interview Not Found/i)).toBeInTheDocument();
	});

	test('handles device permissions flow', async () => {
		render(<WaitingRoom />);

		// Wait for initial load
		await screen.findByText(/Interview Waiting Room/i);

		// Initial state: 'Setup Camera & Mic' button
		const setupBtn = screen.getByText(/Setup Camera & Mic/i);
		expect(setupBtn).toBeInTheDocument();

		// Click setup
		await act(async () => {
			fireEvent.click(setupBtn);
		});

		// Should call getUserMedia
		expect(mockGetUserMedia).toHaveBeenCalled();
		expect(mockEnumerateDevices).toHaveBeenCalled();

		// Should eventually show "Devices Connected!"
		await waitFor(() => {
			expect(screen.getByText(/Devices Connected!/i)).toBeInTheDocument();
		});

		// Verify Selects exist using combobox role
		const comboboxes = screen.getAllByRole('combobox');
		expect(comboboxes.length).toBeGreaterThanOrEqual(2); // Camera and Mic

		// Use getAllByText because MUI renders the Label and potentially span duplicates
		expect(screen.getAllByText('Camera').length).toBeGreaterThan(0);
		expect(screen.getAllByText('Microphone').length).toBeGreaterThan(0);
	});

	test('updates status when interview becomes in-progress', async () => {
		let statusCallback;
		getRealTimeDocument.mockImplementation((col, id, cb) => {
			statusCallback = cb;
			return jest.fn();
		});

		render(<WaitingRoom />);

		await screen.findByText(/Interview Waiting Room/i);

		// Initially 'confirmed'
		act(() => {
			if (statusCallback) statusCallback({ status: 'confirmed' });
		});

		expect(screen.queryByText(/Interview Starting!/i)).not.toBeInTheDocument();

		// Update to in-progress
		act(() => {
			if (statusCallback) statusCallback({ status: 'in-progress' });
		});

		// Should show countdown
		const startingText = await screen.findByText(/Interview Starting!/i);
		expect(startingText).toBeInTheDocument();

		// FIX: Target the specific H1 that contains the countdown number
		// This avoids ambiguity with other text that might contain "10" (like a date)
		const countdownHeading = screen.getByRole('heading', { level: 1 });
		expect(countdownHeading).toHaveTextContent('10');
	});

	test('marks applicant as present on mount and unmarks on unmount', async () => {
		const { unmount } = render(<WaitingRoom />);

		await waitFor(() => {
			expect(updateDoc).toHaveBeenCalledWith(undefined, { applicantPresent: true });
		});

		unmount();

		// Check for unmount cleanup
		expect(updateDoc).toHaveBeenCalledWith(undefined, { applicantPresent: false });
	});

	test('toggles color theme settings', async () => {
		render(<WaitingRoom />);

		await screen.findByText(/Interview Waiting Room/i);

		const buttons = screen.getAllByRole('button');
		const colorBtn = buttons.find((b) => b.querySelector('svg[data-testid="PaletteOutlinedIcon"]'));

		expect(colorBtn).toBeDefined();

		await act(async () => {
			fireEvent.click(colorBtn);
		});

		expect(screen.getByText('Green Theme')).toBeInTheDocument();

		fireEvent.click(screen.getByText('Green Theme'));

		expect(mockDispatch).toHaveBeenCalledWith({ type: 'SET_COLOR', payload: 'green' });
	});
});
