import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CallUI from './CallInterface'; // Import the default export
import { useDailyEvent, useParticipantProperty, useLocalSessionId, useDaily, useScreenShare, useParticipantIds } from '@daily-co/daily-react';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useMeeting } from '../../context/MeetingContext';

// Mock all hooks from @daily-co/daily-react
jest.mock('@daily-co/daily-react', () => ({
	useDailyEvent: jest.fn(),
	useParticipantProperty: jest.fn(),
	useLocalSessionId: jest.fn(),
	useDaily: jest.fn(),
	useScreenShare: jest.fn(),
	useParticipantIds: jest.fn(),
}));

// Mock Contexts
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
jest.mock('../../context/MeetingContext', () => ({ useMeeting: jest.fn() }));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mockNavigate,
}));

describe('CallUI (and sub-components)', () => {
	const mockCallObject = {
		leave: jest.fn(),
		setLocalAudio: jest.fn(),
		setLocalVideo: jest.fn(),
		startScreenShare: jest.fn(),
		stopScreenShare: jest.fn(),
		updateParticipant: jest.fn(),
		updateInputSettings: jest.fn(),
		on: jest.fn(),
		off: jest.fn(),
	};

	beforeEach(() => {
		jest.clearAllMocks();

		// Default Mocks
		useDaily.mockReturnValue(mockCallObject);
		useAuth.mockReturnValue({ member: true }); // Admin user
		useAlert.mockReturnValue({ showAlert: jest.fn() });
		useMeeting.mockReturnValue({ participantDetails: {} });
		useLocalSessionId.mockReturnValue('local-id');
		useScreenShare.mockReturnValue({ screens: [] });
		useParticipantIds.mockReturnValue(['local-id', 'remote-id-1']);

		// Default participant property mock
		useParticipantProperty.mockImplementation((id, prop) => {
			if (id === 'local-id' && prop === 'local') return true;
			if (id === 'local-id' && prop === 'user_name') return 'Local User';
			if (id === 'remote-id-1' && prop === 'user_name') return 'Remote User';
			if (prop === 'tracks.audio.state') return 'on';
			if (prop === 'tracks.video.state') return 'on';
			if (prop === 'audio') return true; // <-- ADD THIS
			if (prop === 'video') return true; // <-- ADD THIS
			return null;
		});
	});

	describe('ParticipantTile', () => {
		it('renders local user tile without admin menu', () => {
			useParticipantIds.mockReturnValue(['local-id']);
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });

			expect(screen.getByText('Local User')).toBeInTheDocument();
			expect(screen.queryByTestId('MoreVertIcon')).not.toBeInTheDocument();
		});

		it('renders remote user tile with admin menu for admin', () => {
			useParticipantIds.mockReturnValue(['remote-id-1']);
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });

			expect(screen.getByText('Remote User')).toBeInTheDocument();
			// Admin menu <MoreVert /> icon SHOULD be present
			expect(screen.getByTestId('MoreVertIcon')).toBeInTheDocument();
		});

		it('renders remote user tile without admin menu for non-admin', () => {
			useParticipantIds.mockReturnValue(['remote-id-1']);
			render(<CallUI isAdmin={false} />, { wrapper: MemoryRouter });

			expect(screen.getByText('Remote User')).toBeInTheDocument();
			expect(screen.queryByRole('button', { name: /morevert/i })).not.toBeInTheDocument();
		});

		it('shows avatar when video is off', () => {
			useParticipantProperty.mockImplementation((id, prop) => {
				if (id === 'remote-id-1' && prop === 'user_name') return 'Remote User';
				if (prop === 'tracks.video.state') return 'off'; // Video is OFF
				if (prop === 'tracks.audio.state') return 'off'; // <-- ADD THIS
				return null;
			});
			useParticipantIds.mockReturnValue(['remote-id-1']);

			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });

			expect(screen.getByText('R')).toBeInTheDocument(); // Avatar with first initial
			expect(screen.getByText('(Camera is off, mic is muted)')).toBeInTheDocument();
		});
	});

	describe('CallControls', () => {
		it('toggles microphone', () => {
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });
			fireEvent.click(screen.getByRole('button', { name: /mic/i }));
			expect(mockCallObject.setLocalAudio).toHaveBeenCalledWith(false); // Toggling from on (true) to false
		});

		it('toggles camera', () => {
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });
			fireEvent.click(screen.getByRole('button', { name: 'Stop camera' }));
			expect(mockCallObject.setLocalVideo).toHaveBeenCalledWith(false); // Toggling from on (true) to false
		});

		it('leaves call', () => {
			render(<CallUI isAdmin={true} />, { wrapper: MemoryRouter });
			fireEvent.click(screen.getByText('Exit'));
			expect(mockCallObject.leave).toHaveBeenCalled();
			expect(mockNavigate).toHaveBeenCalledWith('/members/dashboard');
		});
	});
});