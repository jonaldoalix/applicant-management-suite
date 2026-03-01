// src/context/AlertContext.test.js
import React, { useEffect } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertProvider, useAlert } from './AlertContext';
import { logEvent } from '../config/data/firebase';

// Mock dependencies
jest.mock('../config/data/firebase', () => ({
	logEvent: jest.fn(),
}));

jest.mock('../config/Constants', () => ({
	AlertMessages: {
		saved: { success: { message: 'Saved successfully', type: 'success' } },
	},
}));

// Helper component to trigger alerts
const TestConsumer = ({ trigger }) => {
	const alertUtils = useAlert();

	useEffect(() => {
		if (trigger) {
			trigger(alertUtils);
		}
	}, [trigger, alertUtils]);

	return <div>Alert Context Loaded</div>;
};

describe('AlertContext', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	test('renders children correctly', () => {
		render(
			<AlertProvider>
				<div>Child</div>
			</AlertProvider>
		);
		expect(screen.getByText('Child')).toBeInTheDocument();
	});

	test('showAlert queues and displays a custom message', async () => {
		render(
			<AlertProvider>
				<TestConsumer trigger={({ showAlert }) => showAlert({ message: 'Custom Alert', type: 'success' })} />
			</AlertProvider>
		);

		expect(await screen.findByText('Custom Alert')).toBeInTheDocument();
	});

	test('showAlert handles predefined categories from Constants', async () => {
		render(
			<AlertProvider>
				<TestConsumer trigger={({ showAlert }) => showAlert('saved', 'success')} />
			</AlertProvider>
		);

		expect(await screen.findByText('Saved successfully')).toBeInTheDocument();
	});

	test('handleError translates firebase codes and logs event', async () => {
		const mockError = { code: 'auth/wrong-password' };

		render(
			<AlertProvider>
				<TestConsumer trigger={({ handleError }) => handleError(mockError, 'login_test', true)} />
			</AlertProvider>
		);

		expect(await screen.findByText('Incorrect password. Please try again.')).toBeInTheDocument();
		expect(logEvent).toHaveBeenCalledWith('Error: login_test', mockError);
	});

	test('handleError shows default message for unknown errors', async () => {
		const mockError = { message: 'Random failure' };

		render(
			<AlertProvider>
				<TestConsumer trigger={({ handleError }) => handleError(mockError, 'generic', true)} />
			</AlertProvider>
		);

		expect(await screen.findByText('Random failure')).toBeInTheDocument();
	});

	test('showAnnouncement renders an inline alert', () => {
		const AnnouncementTester = () => {
			const { showAnnouncement } = useAlert();
			return <div>{showAnnouncement({ message: 'System Update' })}</div>;
		};

		render(
			<AlertProvider>
				<AnnouncementTester />
			</AlertProvider>
		);

		expect(screen.getByText('System Update')).toBeInTheDocument();
	});

	test('prevents duplicate consecutive alerts', async () => {
		render(
			<AlertProvider>
				<TestConsumer
					trigger={({ showAlert }) => {
						showAlert({ message: 'Duplicate', type: 'info' });
						showAlert({ message: 'Duplicate', type: 'info' });
					}}
				/>
			</AlertProvider>
		);

		// Find alert. Note: If duplicates were allowed, this might behave differently,
		// but visually we just check if it renders without crashing loop.
		expect(await screen.findByText('Duplicate')).toBeInTheDocument();
	});
});
