import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import DeliberationRoom from './DeliberationRoom';
import { useNavigate } from 'react-router-dom';
import { useMeeting } from '../../context/MeetingContext';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useTitle } from '../../context/HelmetContext';
import { getRealTimeMeetings, updateCollectionData, generateJoinToken } from '../../config/data/firebase';
import { httpsCallable } from 'firebase/functions';
import { getDoc } from 'firebase/firestore';

// --- Mocks ---

jest.mock('react-router-dom', () => ({
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
}));

jest.mock('../../config/data/firebase', () => ({
	functions: {},
	db: {},
	getRealTimeMeetings: jest.fn(),
	updateCollectionData: jest.fn(),
	generateJoinToken: jest.fn(),
}));

jest.mock('../../config/data/collections', () => ({
	collections: {
		interviews: 'interviews',
		members: 'members',
	},
	InterviewStatus: {
		inProgress: 'in-progress',
		completed: 'completed',
		confirmed: 'confirmed',
	},
}));

// Context Mocks
jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
	handleError: jest.fn(),
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

// Child Component Mocks
jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loading...</div>);
jest.mock('../../components/interviews/AdminDrawer', () => (props) => (
	<div data-testid='admin-drawer'>
		<button onClick={() => props.onStartNextInterview('next-id')} data-testid='start-next-btn'>
			Start Next
		</button>
	</div>
));

jest.mock('../../components/interviews/ApplicationViewer', () => () => <div data-testid='app-viewer'>App Viewer</div>);
jest.mock('../../components/interviews/CallInterface', () => () => <div data-testid='call-ui'>Call UI</div>);

describe('DeliberationRoom Component', () => {
	const mockNavigate = jest.fn();
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockSetParticipantDetails = jest.fn();

	let mockCallObject;

	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();

		useNavigate.mockReturnValue(mockNavigate);
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useTitle.mockImplementation(() => { });

		useAuth.mockReturnValue({ user: { uid: 'user-1' } });

		mockCallObject = {
			on: jest.fn(),
			off: jest.fn(),
			join: jest.fn(),
			leave: jest.fn(),
			meetingState: jest.fn().mockReturnValue('left-meeting'),
			participants: jest.fn().mockReturnValue({
				local: { session_id: 'local', user_id: 'user-1', owner: true },
			}),
		};

		useMeeting.mockReturnValue({
			callObject: mockCallObject,
			videoDeviceId: 'cam-1',
			audioDeviceId: 'mic-1',
			setParticipantDetails: mockSetParticipantDetails,
		});

		generateJoinToken.mockResolvedValue({
			data: { token: 'mock-token', roomUrl: 'mock-url' },
		});

		getRealTimeMeetings.mockImplementation((uid, bool, callback) => {
			callback([]);
			return jest.fn();
		});

		// Mock getDoc to ensure picture fetches don't fail
		getDoc.mockImplementation(() =>
			Promise.resolve({
				exists: () => true,
				data: () => ({ picture: { home: 'http://pic.url' } }),
			})
		);
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test('renders loader initially', async () => {
		render(<DeliberationRoom />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();

		await waitFor(() => expect(mockCallObject.on).toHaveBeenCalled());
	});

	test('joins the call and renders main UI', async () => {
		render(<DeliberationRoom />);

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
		expect(screen.getByTestId('admin-drawer')).toBeInTheDocument();
		expect(screen.getByTestId('call-ui')).toBeInTheDocument();
	});

	test('handles interview navigation logic (auto-redirect)', async () => {
		let meetingsCallback;
		getRealTimeMeetings.mockImplementation((uid, bool, cb) => {
			meetingsCallback = cb;
			return jest.fn();
		});

		render(<DeliberationRoom />);

		await waitFor(() => {
			expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function));
		});
		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => {
			joinedCallback();
		});
		await screen.findByTestId('call-ui');

		// 1. Initial state: confirmed interview
		act(() => {
			meetingsCallback([{ id: 'int-1', status: 'confirmed', displayName: 'Applicant A', startTime: { toDate: () => new Date() } }]);
		});

		// 2. Status change to in-progress
		await act(async () => {
			meetingsCallback([{ id: 'int-1', status: 'in-progress', displayName: 'Applicant A', startTime: { toDate: () => new Date() } }]);
		});

		// Wait for dialog to appear
		await waitFor(() => {
			expect(screen.getAllByText(/Interview in Progress!/i)[0]).toBeInTheDocument();
		});

		// 3. Advance timers in a loop to flush the recursive useEffect state updates (5 -> 4 -> ... -> 0)
		// We loop 6 times to cover the 5 second count down plus the trigger for 0
		for (let i = 0; i < 6; i++) {
			act(() => {
				jest.advanceTimersByTime(1000);
			});
		}

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith('/interviews/interview-room/int-1');
		});
	});

	test('allows aborting navigation', async () => {
		let meetingsCallback;
		getRealTimeMeetings.mockImplementation((uid, bool, cb) => {
			meetingsCallback = cb;
			return jest.fn();
		});

		render(<DeliberationRoom />);

		await waitFor(() => {
			expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function));
		});
		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => {
			joinedCallback();
		});

		await act(async () => {
			meetingsCallback([{ id: 'int-1', status: 'in-progress', displayName: 'Applicant A', startTime: { toDate: () => new Date() } }]);
		});

		await waitFor(() => {
			expect(screen.getAllByText(/Interview in Progress!/i)[0]).toBeInTheDocument();
		});

		const stayBtn = screen.getByText('Stay in Deliberation Room');
		fireEvent.click(stayBtn);

		// Dialog should close
		await waitFor(() => {
			expect(screen.queryByText(/Interview in Progress!/i)).not.toBeVisible();
		});

		// Advance time to prove navigation was CANCELLED
		// If we didn't cancel, this loop would trigger navigation
		for (let i = 0; i < 6; i++) {
			act(() => {
				jest.advanceTimersByTime(1000);
			});
		}

		expect(mockNavigate).not.toHaveBeenCalled();
	});

	test('starts next interview via admin drawer', async () => {
		render(<DeliberationRoom />);

		await waitFor(() => {
			expect(mockCallObject.on).toHaveBeenCalledWith('joined-meeting', expect.any(Function));
		});
		const joinedCallback = mockCallObject.on.mock.calls.find((call) => call[0] === 'joined-meeting')[1];
		await act(async () => {
			joinedCallback();
		});
		await screen.findByTestId('call-ui');

		const startBtn = screen.getByTestId('start-next-btn');

		await act(async () => {
			fireEvent.click(startBtn);
		});

		expect(updateCollectionData).toHaveBeenCalledWith('interviews', 'next-id', { status: 'in-progress' });
		expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
	});
});
