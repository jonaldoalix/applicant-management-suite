import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MeetingProvider, useMeeting } from './MeetingContext';
// We import the module we are mocking. Jest will give us the mocked version.
import DailyIframe from '@daily-co/daily-js';

// 1. Define the mock behavior completely inside the factory
jest.mock('@daily-co/daily-js', () => ({
	__esModule: true,
	default: {
		// Initialize as a Jest function so we can track calls
		createCallObject: jest.fn(),
	},
}));

// 2. Define the object that createCallObject should return
const mockDailyInstance = {
	destroy: jest.fn(),
	on: jest.fn(),
	off: jest.fn(),
	join: jest.fn(),
	leave: jest.fn(),
	participants: jest.fn(() => ({})),
	localAudio: jest.fn(),
	localVideo: jest.fn(),
	setLocalAudio: jest.fn(),
	setLocalVideo: jest.fn(),
};

const TestConsumer = () => {
	const { callObject } = useMeeting();
	return <div>{callObject ? 'Call Object Exists' : 'No Call Object'}</div>;
};

describe('MeetingContext', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// 3. Configure the mock return value here, where hoisting isn't an issue
		DailyIframe.createCallObject.mockReturnValue(mockDailyInstance);
	});

	test('initializes daily call object on mount', async () => {
		render(
			<MeetingProvider>
				<TestConsumer />
			</MeetingProvider>
		);

		// Use findByText to wait for the state update
		const successElement = await screen.findByText('Call Object Exists');

		expect(successElement).toBeInTheDocument();
		expect(DailyIframe.createCallObject).toHaveBeenCalled();
	});
});
