import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';
import { useAuth } from '../../context/AuthContext';
import { isAdminPath } from '../../config/navigation/routeUtils';

// --- Mocks ---
jest.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

jest.mock('../../config/navigation/routeUtils', () => ({
	isAdminPath: jest.fn(),
	generatePath: (path) => path,
}));

jest.mock('lottie-react', () => {
	return function MockLottie() {
		return <div data-testid='lottie-404'>404 Animation</div>;
	};
});

jest.mock('../../config/Constants', () => ({
	Assets: { notFoundLottie: 'mock-data' },
}));

describe('NotFound Component', () => {
	test('renders 404 text and current pathname', () => {
		useAuth.mockReturnValue({ user: null });
		isAdminPath.mockReturnValue(false);

		render(
			<MemoryRouter initialEntries={['/bad-route']}>
				<NotFound />
			</MemoryRouter>
		);

		expect(screen.getByText('404')).toBeInTheDocument();
		expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
		// Check if the path is displayed
		expect(screen.getByText('/bad-route')).toBeInTheDocument();
	});

	test('redirects to Home if user is logged out', () => {
		useAuth.mockReturnValue({ user: null });

		render(
			<MemoryRouter>
				<NotFound />
			</MemoryRouter>
		);

		const link = screen.getByRole('link', { name: /Go Home/i });
		expect(link).toHaveAttribute('href', '/home');
	});

	test('redirects to Dashboard if user is logged in', () => {
		useAuth.mockReturnValue({ user: { uid: '123' } });

		render(
			<MemoryRouter>
				<NotFound />
			</MemoryRouter>
		);

		const link = screen.getByRole('link', { name: /Go to Dashboard/i });
		expect(link).toHaveAttribute('href', '/redirect');
	});
});
