import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import InterviewRoom from './InterviewRoom';
import { useParams, useNavigate } from 'react-router-dom';
import { useMeeting } from '../../context/MeetingContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { useTitle } from '../../context/HelmetContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

// NEW: Import generateJoinToken for mocking
import { generateJoinToken } from '../../config/data/firebase';

// --- Mocks ---

jest.mock('react-router-dom', () => ({
	useParams: jest.fn(),
	useNavigate: jest.fn(),
}));

jest.mock('@daily-co/daily-react', () => ({
	DailyProvider: ({ children }) => <div data-testid='daily-provider'>{children}</div>,
}));

jest.mock('firebase/functions', () => ({
	httpsCallable: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	getDoc: jest.fn(),
	onSnapshot: jest.fn(),
}));

// UPDATED: Include generateJoinToken in mock
jest.mock('../../config/data/firebase', () => ({
	db: {},
	functions: {},
	generateJoinToken: jest.fn(),
}));

jest.mock('../../config/data/collections', () => ({
	collections: {
		interviews: 'interviews',
		applicants: 'applicants',
		members: 'members',
		applications: 'applications',
	},
	InterviewStatus: {
		inProgress: 'in-progress',
		completed: 'completed',
		cancelled: 'cancelled',
		missed: 'missed',
		confirmed: 'confirmed',
	},
}));

// Context Mocks
jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

jest.mock('../../context/MeetingContext', () => ({
	useMeeting: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

jest.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));

jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

// Child Component Mocks
jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loading...</div>);
jest.mock('../../components/interviews/AdminDrawer', () => () => <div data-testid='admin-drawer'>Admin Drawer</div>);
jest.mock('../../components/interviews/ApplicationViewer', () => () => <div data-testid='app-viewer'>App Viewer</div>);
jest.mock('../../components/interviews/CallInterface', () => () => <div data-testid='call-ui'>Call UI</div>);

describe('InterviewRoom Component', () => {
	const mockNavigate = jest.fn();
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockSetParticipantDetails = jest.fn();

	let mockCallObject;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		useParams.mockReturnValue({ interviewId: 'test-interview-123' });
		useNavigate.mockReturnValue(mockNavigate);
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useTitle.mockImplementation(() => {});
		useConfig.mockReturnValue({ AUTO_DELIBERATE: false });

		useAuth.mockReturnValue({
			user: { uid: 'user-123' },
			member: null,
			applicant: { id: 'app-1' },
		});

		mockCallObject = {
			on: jest.fn(),
			off: jest.fn(),
			join: jest.fn(),
			leave: jest.fn(),
			meetingState: jest.fn().mockReturnValue('left-meeting'),
			participants: jest.fn().mockReturnValue({
				local: { session_id: 'local', user_id: 'user-123', owner: false },
			}),
		};

		useMeeting.mockReturnValue({
			callObject: mockCallObject,
			videoDeviceId: 'cam-1',
			audioDeviceId: 'mic-1',
			setParticipantDetails: mockSetParticipantDetails,
		});

		// UPDATED: Use generateJoinToken directly
		generateJoinToken.mockResolvedValue({
			data: { token: 'mock-token', roomUrl: 'mock-url' },
		});

		// Default Snapshot: In Progress
		onSnapshot.mockImplementation((ref, onNext) => {
			onNext({
				exists: () => true,
				data: () => ({ status: 'in-progress', applicantId: 'app-1' }),
			});
			return jest.fn();
		});

		getDoc.mockResolvedValue({
			exists: () => true,
			data: () => ({ picture: { home: 'http://pic.url' } }),
		});
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test('renders loader initially', async () => {
		render(<InterviewRoom />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();

		await waitFor(() => expect(mockCallObject.on).toHaveBeenCalled());
	});

	test('displays error if missing interview ID', async () => {
		useParams.mockReturnValue({});
		render(<InterviewRoom />);

		await waitFor(() => {
			expect(screen.getByText(/Please supply an Interview ID/i)).toBeInTheDocument();
		});
	});

	test('displays error if interview not found', async () => {
		onSnapshot.mockImplementation((ref, onNext) => {
			onNext({ exists: () => false });
			return jest.fn();
		});

		render(<InterviewRoom />);

		await waitFor(() => {
			expect(screen.getByText(/Interview was not found/i)).toBeInTheDocument();
		});
	});

	test('joins meeting when status is in-progress', async () => {
		render(<InterviewRoom />);

		await waitFor(() => {
			expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function));
		});

		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => {
			joinedCallback();
		});

		await waitFor(() => {
			expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
		});

		expect(screen.getByTestId('daily-provider')).toBeInTheDocument();
		expect(screen.getByTestId('call-ui')).toBeInTheDocument();
	});

	test('renders InterviewEnded component when status is completed', async () => {
		// Override default mock to return 'completed' immediately
		onSnapshot.mockImplementation((ref, onNext) => {
			onNext({
				exists: () => true,
				data: () => ({ status: 'completed' }),
			});
			return jest.fn();
		});

		render(<InterviewRoom />);

		// With the fix, the loader should clear and show concluded message
		await waitFor(() => {
			expect(screen.getByText(/Interview Concluded/i)).toBeInTheDocument();
		});
		expect(screen.getByText(/Return to Dashboard/i)).toBeInTheDocument();
	});

	test('redirects members to deliberation room automatically if config enabled', async () => {
		useAuth.mockReturnValue({
			user: { uid: 'mem-1' },
			member: { id: 'mem-1' },
			applicant: null,
		});
		useConfig.mockReturnValue({ AUTO_DELIBERATE: true });

		let snapshotCallback;
		onSnapshot.mockImplementation((ref, onNext) => {
			snapshotCallback = onNext;
			onNext({ exists: () => true, data: () => ({ status: 'in-progress' }) });
			return jest.fn();
		});

		render(<InterviewRoom />);

		await waitFor(() => expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function)));
		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => joinedCallback());

		// Update to completed
		await act(async () => {
			snapshotCallback({ exists: () => true, data: () => ({ status: 'completed' }) });
		});

		expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'info' }));

		for (let i = 0; i < 6; i++) {
			act(() => {
				jest.advanceTimersByTime(1000);
			});
		}

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith('/interviews/deliberation-room');
		});
	});

	test('does not redirect applicants automatically', async () => {
		useConfig.mockReturnValue({ AUTO_DELIBERATE: true });

		let snapshotCallback;
		onSnapshot.mockImplementation((ref, onNext) => {
			snapshotCallback = onNext;
			onNext({ exists: () => true, data: () => ({ status: 'in-progress' }) });
			return jest.fn();
		});

		render(<InterviewRoom />);

		await waitFor(() => expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function)));
		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => joinedCallback());

		await act(async () => {
			snapshotCallback({ exists: () => true, data: () => ({ status: 'completed' }) });
		});

		expect(screen.getByText(/Interview Concluded/i)).toBeInTheDocument();

		for (let i = 0; i < 6; i++) {
			act(() => {
				jest.advanceTimersByTime(1000);
			});
		}

		expect(mockNavigate).not.toHaveBeenCalledWith('/interviews/deliberation-room');
	});

	test('displays error if joining fails', async () => {
		// UPDATED: Use generateJoinToken directly
		generateJoinToken.mockRejectedValue(new Error('Token Gen Failed'));

		render(<InterviewRoom />);

		await waitFor(() => {
			expect(screen.getByText(/Could not join meeting/i)).toBeInTheDocument();
		});
		expect(screen.getByText(/Token Gen Failed/i)).toBeInTheDocument();
	});
});
