import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AdminDrawer from './AdminDrawer';
import { useParticipantIds, useDaily } from '@daily-co/daily-react';
import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { useAuth } from '../../context/AuthContext';
import * as firebase from '../../config/data/firebase';

// Mock Dependencies
jest.mock('@daily-co/daily-react', () => ({
	useParticipantIds: jest.fn(),
	useDaily: jest.fn(),
}));
jest.mock('firebase/functions', () => ({
	httpsCallable: jest.fn(),
}));
jest.mock('../../config/data/firebase', () => ({
	functions: { app: 'mock-functions' },
	db: { app: 'mock-db' },
	endInterview: jest.fn(),
	markInterviewAsMissed: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
	doc: jest.fn(),
	updateDoc: jest.fn(),
	onSnapshot: jest.fn(),
}));
jest.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
jest.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('./ParticipantRow', () => (props) => <div data-testid='participant-row'>{props.id}</div>);

// --- THIS IS THE FIX ---
// Mock the dayjs module to ensure the duration plugin is loaded
jest.mock('dayjs', () => {
	const actualDayjs = jest.requireActual('dayjs');
	const durationPlugin = jest.requireActual('dayjs/plugin/duration');
	actualDayjs.extend(durationPlugin); // Extend the real dayjs with the real plugin
	return actualDayjs; // Return the real, extended dayjs
});
// --------------------

describe('AdminDrawer Component', () => {
	const mockOnClose = jest.fn();
	const mockOnRelevantAppsChange = jest.fn();
	const mockOnStartNextInterview = jest.fn();
	const mockOnJoinInterview = jest.fn();
	const mockShowAlert = jest.fn();
	const mockHandleError = jest.fn();
	const mockSendAppMessage = jest.fn();
	const mockApiCall = jest.fn();

	const mockMember = { permissions: { site: true } };
	const mockConfig = { CONFIG_ID: 'config123' };

	const mockNextInterview = {
		id: 'next123',
		applicationId: 'app456',
		displayName: 'Jane Doe',
		startTime: { toDate: () => new Date('2025-01-01T10:00:00Z') },
		applicantPresent: true,
	};
	const mockPrevInterview = {
		applicationId: 'app123',
		displayName: 'John Smith',
		status: 'Completed',
		startTime: { toDate: () => new Date('2025-01-01T09:00:00Z') },
		endTime: { toDate: () => new Date('2025-01-01T09:30:00Z') },
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useParticipantIds.mockReturnValue(['participant-1', 'participant-2']);
		useDaily.mockReturnValue({ sendAppMessage: mockSendAppMessage });
		useAlert.mockReturnValue({ showAlert: mockShowAlert, handleError: mockHandleError });
		useConfig.mockReturnValue(mockConfig);
		useAuth.mockReturnValue({ member: mockMember });
		firebase.endInterview.mockResolvedValue(true);
		firebase.markInterviewAsMissed.mockResolvedValue(true);
		onSnapshot.mockImplementation((docRef, callback) => {
			callback({ exists: () => true, data: () => ({ AUTO_DELIBERATE: false }) });
			return () => {};
		});
	});

	describe('Interview Mode (isDeliberation=false)', () => {
		it('calls endInterview on "End and Complete" click', async () => {
			render(<AdminDrawer open={true} onClose={mockOnClose} interviewId='interview123' isAdmin={true} />);
			await act(async () => {
				fireEvent.click(screen.getByText('End and Complete'));
			});
			expect(firebase.endInterview).toHaveBeenCalledWith({ interviewId: 'interview123' });
		});
	});

	describe('Deliberation Mode (isDeliberation=true)', () => {
		it('renders deliberation UI with next and previous interviews', () => {
			render(<AdminDrawer open={true} onClose={mockOnClose} isDeliberation={true} nextInterview={mockNextInterview} previousInterview={mockPrevInterview} onStartNextInterview={mockOnStartNextInterview} />);

			// This should now pass because the real dayjs is being used
			expect(screen.getByText('Duration: 30m 0s')).toBeInTheDocument();
		});

		it('calls onRelevantAppsChange with app IDs from props', () => {
			render(<AdminDrawer open={true} onClose={mockOnClose} isDeliberation={true} nextInterview={mockNextInterview} previousInterview={mockPrevInterview} onRelevantAppsChange={mockOnRelevantAppsChange} />);
			expect(mockOnRelevantAppsChange).toHaveBeenCalledWith(['app123', 'app456']);
		});
	});
});
