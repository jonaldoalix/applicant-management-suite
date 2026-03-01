import React from 'react';
import { render } from '@testing-library/react';
import Logout from './Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';

// --- Mocks ---

jest.mock('react-router-dom', () => ({
	useNavigate: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

jest.mock('../../config/navigation/routeUtils', () => ({
	generatePath: jest.fn(),
}));

jest.mock('../../config/navigation/paths', () => ({
	paths: { login: '/login-path' },
}));

describe('Logout Component', () => {
	const mockLogout = jest.fn();
	const mockNavigate = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		useAuth.mockReturnValue({ logout: mockLogout });
		useNavigate.mockReturnValue(mockNavigate);

		// Mock generatePath to return a specific string we can assert on
		generatePath.mockReturnValue('/login-path');
	});

	test('calls logout and navigates to login page on mount', () => {
		render(<Logout />);

		// 1. Verify logout was called
		expect(mockLogout).toHaveBeenCalledTimes(1);

		// 2. Verify path generation was called with the correct config
		expect(generatePath).toHaveBeenCalledWith(paths.login);

		// 3. Verify navigation happened with replace: true
		expect(mockNavigate).toHaveBeenCalledWith('/login-path', { replace: true });
	});

	test('renders nothing (null)', () => {
		const { container } = render(<Logout />);
		expect(container).toBeEmptyDOMElement();
	});
});
