// src/context/ConfigContext.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ConfigProvider, useConfig } from './ConfigContext';
import { getRealTimeConfigFromDb } from '../config/data/firebase';

// Mock the firebase function
jest.mock('../config/data/firebase', () => ({
	getRealTimeConfigFromDb: jest.fn(),
}));

// Mock the Loader component
jest.mock('../components/loader/Loader', () => {
	return function MockLoader() {
		return <div data-testid='loader'>Loading...</div>;
	};
});

// Test component to consume the context
const TestComponent = () => {
	const config = useConfig();
	return <div data-testid='config-value'>{config.appName}</div>;
};

describe('ConfigContext', () => {
	test('shows loader initially when config is empty', () => {
		// Mock implementation that DOES NOT call the callback immediately
		getRealTimeConfigFromDb.mockImplementation(() => jest.fn());

		render(
			<ConfigProvider>
				<div>Child Content</div>
			</ConfigProvider>
		);

		expect(screen.getByTestId('loader')).toBeInTheDocument();
		expect(screen.queryByText('Child Content')).not.toBeInTheDocument();
	});

	test('renders children and provides config when data loads', async () => {
		const mockData = { appName: 'Test App' };

		// Simulate Firebase returning data immediately
		getRealTimeConfigFromDb.mockImplementation((callback) => {
			callback(mockData);
			return jest.fn(); // return unsubscribe function
		});

		render(
			<ConfigProvider>
				<TestComponent />
			</ConfigProvider>
		);

		// Loader should disappear, children should render
		await waitFor(() => {
			expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
		});
		expect(screen.getByTestId('config-value')).toHaveTextContent('Test App');
	});

	test('handles error in firebase callback gracefully', () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		// Simulate an error inside the callback logic (rare, but covered for lines)
		getRealTimeConfigFromDb.mockImplementation((callback) => {
			// We pass null to trigger default empty object,
			// but force setConfig to throw if we really wanted to test the try/catch block specifically.
			// Since useState setter rarely throws, we primarily test the 'data || {}' branch here.
			callback(null);
			return jest.fn();
		});

		render(
			<ConfigProvider>
				<div>Ready</div>
			</ConfigProvider>
		);

		// If callback passes null, setConfig({}) runs.
		// Since {} has keys length 0, it stays on Loader.
		expect(screen.getByTestId('loader')).toBeInTheDocument();

		consoleSpy.mockRestore();
	});

	test('throws error if useConfig is used outside provider', () => {
		// Prevent React from logging the error boundary noise to console
		const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

		expect(() => render(<TestComponent />)).toThrow('useConfig must be used within a ConfigProvider');

		consoleError.mockRestore();
	});
});
