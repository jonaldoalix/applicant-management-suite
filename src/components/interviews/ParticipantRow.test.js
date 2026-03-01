import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ParticipantRow from './ParticipantRow';
import { useParticipantProperty, useLocalSessionId, useDaily } from '@daily-co/daily-react';
import { useAlert } from '../../context/AlertContext';

// Mock dependencies
jest.mock('@daily-co/daily-react', () => ({
	useParticipantProperty: jest.fn(),
	useLocalSessionId: jest.fn(),
	useDaily: jest.fn(),
}));

jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

describe('ParticipantRow', () => {
	const mockShowAlert = jest.fn();
	const mockUpdateParticipant = jest.fn();
	
	beforeEach(() => {
		jest.clearAllMocks();
		useAlert.mockReturnValue({ showAlert: mockShowAlert });
		useDaily.mockReturnValue({ updateParticipant: mockUpdateParticipant });

		// Default mocks for a remote participant
		useLocalSessionId.mockReturnValue('local-id');
		useParticipantProperty.mockImplementation((id, prop) => {
			if (prop === 'user_name') return 'Test User';
			if (prop === 'tracks.audio.state') return 'on';
			if (prop === 'tracks.video.state') return 'on';
			return null;
		});
	});

	it('renders participant name and controls for an admin', () => {
		render(<ParticipantRow id="remote-id" isAdmin={true} />);

		expect(screen.getByText('Test User')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Mute Audio/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Stop Video/i })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /Eject from Call/i })).toBeInTheDocument();
	});

	it('shows "You" chip for the local participant', () => {
		useLocalSessionId.mockReturnValue('local-id');
		render(<ParticipantRow id="local-id" isAdmin={true} />);

		expect(screen.getByText('Test User')).toBeInTheDocument();
		expect(screen.getByText('You')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /Mute Audio/i })).not.toBeInTheDocument();
	});

	it('shows no controls for a non-admin viewing a remote participant', () => {
		render(<ParticipantRow id="remote-id" isAdmin={false} />);

		expect(screen.getByText('Test User')).toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('calls updateParticipant to eject a user', () => {
		render(<ParticipantRow id="remote-id" isAdmin={true} />);

		fireEvent.click(screen.getByRole('button', { name: /Eject from Call/i }));
		
		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Removing Test User from the call.', type: 'warning' });
		expect(mockUpdateParticipant).toHaveBeenCalledWith('remote-id', { eject: true });
	});

	it('shows correct icon and tooltip for muted audio', () => {
		useParticipantProperty.mockImplementation((id, prop) => {
			if (prop === 'user_name') return 'Muted User';
			if (prop === 'tracks.audio.state') return 'off'; // Muted
			return 'on';
		});

		render(<ParticipantRow id="remote-id" isAdmin={true} />);
		expect(screen.getByRole('button', { name: /Ask to Unmute/i })).toBeInTheDocument();
	});
});