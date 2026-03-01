import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccessDenied from './AccessDenied';
import { useAuth } from '../../context/AuthContext';
import { isAdminPath } from '../../config/navigation/routeUtils';

// --- Mocks ---

// 1. Mock Auth Context
jest.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

// 2. Minimal mocks for config files
jest.mock('../../config/navigation/routeUtils', () => ({
	isAdminPath: jest.fn(),
	generatePath: () => '/',
}));
jest.mock('../../config/navigation/paths', () => ({
	paths: { home: 'default', redirect: 'default' },
}));

// 3. Mock Lottie
jest.mock('lottie-react', () => {
	return function MockLottie() {
		return <div data-testid='lottie-animation'>Lottie Animation</div>;
	};
});

// 4. Mock Constants
jest.mock('../../config/Constants', () => ({
	Assets: { accessDeniedLottie: 'mock-animation-data' },
}));

describe('AccessDenied Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		isAdminPath.mockReturnValue(false);
	});

	test('renders 403 text and animation', () => {
		useAuth.mockReturnValue({ user: null });

		render(
			<MemoryRouter>
				<AccessDenied />
			</MemoryRouter>
		);

		expect(screen.getByText(/Access Denied \(403\)/i)).toBeInTheDocument();
		expect(screen.getByTestId('lottie-animation')).toBeInTheDocument();
	});

	test('displays custom message if provided', () => {
		useAuth.mockReturnValue({ user: null });
		const customMsg = 'You need a premium account.';

		render(
			<MemoryRouter>
				<AccessDenied message={customMsg} />
			</MemoryRouter>
		);

		expect(screen.getByText(`Message: ${customMsg}`)).toBeInTheDocument();
	});

	test('shows "Go Home" button pointing to homePath when logged out', () => {
		useAuth.mockReturnValue({ user: null }); // Logged out

		const testHomePath = '/custom-home-link';

		render(
			<MemoryRouter>
				<AccessDenied homePath={testHomePath} />
			</MemoryRouter>
		);

		// CHANGED: searching for 'link' role instead of 'button'
		const button = screen.getByRole('link', { name: /Go Home/i });
		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute('href', testHomePath);
	});

	test('shows "Go to Dashboard" button pointing to dashboardPath when logged in', () => {
		useAuth.mockReturnValue({ user: { uid: '123' } }); // Logged in

		const testDashPath = '/custom-dashboard-link';

		render(
			<MemoryRouter>
				<AccessDenied dashboardPath={testDashPath} />
			</MemoryRouter>
		);

		// CHANGED: searching for 'link' role instead of 'button'
		const button = screen.getByRole('link', { name: /Go to Dashboard/i });
		expect(button).toBeInTheDocument();
		expect(button).toHaveAttribute('href', testDashPath);
	});
});
