import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import New from './New';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useTitle } from '../../context/HelmetContext';
import { useNavigate } from 'react-router-dom';

// 1. MOCK DEPENDENCIES
jest.mock('react-router-dom', () => ({
	useNavigate: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

// 2. MOCK ADMIN CONFIG
jest.mock('../../config/admin', () => {
	const React = require('react');

	// We use React.createElement to avoid JSX syntax issues in the hoisted mock
	const MockForm = ({ permissions }) => {
		return React.createElement('div', { 'data-testid': 'mock-form' }, `I am the mock form. Permissions: ${JSON.stringify(permissions)}`);
	};

	return {
		creatableContent: {
			testType: {
				formConfig: { title: 'Test Entity' },
				// Manually create the element so 'New.jsx' can clone it
				renderForm: React.createElement(MockForm, null),
			},
		},
	};
});

describe('New Page Component', () => {
	const mockNavigate = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup Default Mocks
		useNavigate.mockReturnValue(mockNavigate);

		useTheme.mockReturnValue({
			darkMode: false,
			boxShadow: '0px 4px 10px rgba(0,0,0,0.1)',
		});

		useAuth.mockReturnValue({
			member: { permissions: { role: 'admin' } },
		});
	});

	test('renders error message if invalid type provided', () => {
		render(<New type='nonExistentType' />);

		expect(screen.getByText(/Error: Invalid new type/i)).toBeInTheDocument();
		expect(screen.getByText(/'nonExistentType'/i)).toBeInTheDocument();
	});

	test('renders correctly with valid type', () => {
		render(<New type='testType' />);

		// 1. Check Header Title (From config)
		expect(screen.getByText('New Test Entity')).toBeInTheDocument();

		// 2. Check Form Render
		expect(screen.getByTestId('mock-form')).toBeInTheDocument();

		// 3. Check Title Helmet update
		expect(useTitle).toHaveBeenCalledWith({ title: 'New Test Entity', appear: false });
	});

	test('navigates back when back button is clicked', () => {
		render(<New type='testType' />);

		const backButton = screen.getByRole('button');
		fireEvent.click(backButton);

		expect(mockNavigate).toHaveBeenCalledWith(-1);
	});

	test('injects current user permissions into the form', () => {
		// Setup specific permissions for this test
		const specificPermissions = { canEdit: true, canDelete: false };
		useAuth.mockReturnValue({
			member: { permissions: specificPermissions },
		});

		render(<New type='testType' />);

		const form = screen.getByTestId('mock-form');
		// The mock form defined at the top prints permissions as a string
		expect(form).toHaveTextContent(JSON.stringify(specificPermissions));
	});

	test('applies dark mode styling correctly', () => {
		useTheme.mockReturnValue({
			darkMode: true,
			boxShadow: 'none',
		});

		render(<New type='testType' />);

		// Verify it renders successfully in dark mode
		expect(screen.getByText('New Test Entity')).toBeInTheDocument();
	});
});
