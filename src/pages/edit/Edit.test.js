import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { getCollectionData } from '../../config/data/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useAuth } from '../../context/AuthContext';
import Edit from './Edit';

// --- Setup Mocks ---

jest.mock('../../config/data/firebase', () => ({
	getCollectionData: jest.fn(),
}));

jest.mock('../../context/ThemeContext');
jest.mock('../../context/HelmetContext');
jest.mock('../../context/AuthContext');

// Mock React Router to allow controlling return values
jest.mock('react-router-dom', () => ({
	useParams: jest.fn(),
	useNavigate: jest.fn(),
}));

const mockUseParams = useParams;
const mockUseNavigate = useNavigate;

// Move config mock inside factory to prevent hoisting errors
jest.mock('../../config/admin', () => {
	const React = require('react');
	const MockForm = ({ permissions, data }) => (
		<div data-testid='mock-form'>
			Mock Form Loaded. Data: {data?.name || 'N/A'}. Permissions: {permissions?.join(', ') || 'None'}
		</div>
	);
	return {
		editableContent: {
			test: {
				collection: 'testCollection',
				formConfig: { title: 'Test Item' },
				renderForm: (data) => <MockForm data={data} permissions={[]} />,
			},
			invalid: undefined,
		},
	};
});

describe('Edit.jsx', () => {
	const mockSetTitle = jest.fn();
	const mockNavigate = jest.fn();
	const mockUser = {
		member: {
			permissions: ['read', 'write'],
		},
	};
	const mockTheme = {
		darkMode: false,
		boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockUseParams.mockReturnValue({ id: 'item123' });
		mockUseNavigate.mockReturnValue(mockNavigate);
		useTheme.mockReturnValue(mockTheme);
		useTitle.mockReturnValue({ setTitle: mockSetTitle });
		useAuth.mockReturnValue(mockUser);
		getCollectionData.mockResolvedValue({ id: 'item123', name: 'Fetched Item' });
	});

	it('displays error message for invalid type prop', () => {
		render(<Edit type='invalid' />);
		expect(screen.getByText("Error: Invalid edit type ('invalid') specified. Please check your route configuration.")).toBeInTheDocument();
		expect(getCollectionData).not.toHaveBeenCalled();
	});

	it('renders header, sets title, and calls data fetch on mount', async () => {
		render(<Edit type='test' />);

		// FIX: The component calls useTitle({ title: ... }), it does NOT call setTitle directly.
		// We check if the hook was initialized with the correct data.
		expect(useTitle).toHaveBeenCalledWith(expect.objectContaining({ title: 'Edit Test Item' }));

		expect(screen.getByText('Edit Test Item')).toBeInTheDocument();

		await waitFor(() => {
			expect(getCollectionData).toHaveBeenCalledWith('item123', 'testCollection', 'item123');
		});
	});

	it('renders the form with fetched data and user permissions', async () => {
		render(<Edit type='test' />);

		await waitFor(() => {
			expect(screen.getByText(/Mock Form Loaded. Data: Fetched Item/i)).toBeInTheDocument();
		});

		expect(screen.getByText(/Permissions: read, write/i)).toBeInTheDocument();
	});

	it('renders the form with empty data if data fetch returns null', async () => {
		getCollectionData.mockResolvedValue(null);
		render(<Edit type='test' />);

		await waitFor(() => {
			expect(screen.getByText(/Mock Form Loaded. Data: N\/A/i)).toBeInTheDocument();
		});
	});

	it('calls navigate(-1) when the back button is clicked', async () => {
		render(<Edit type='test' />);

		// FIX: The button has no text, so we find the icon and click its parent button
		const backIcon = screen.getByTestId('ArrowBackIcon');
		const backButton = backIcon.closest('button');
		fireEvent.click(backButton);

		expect(mockNavigate).toHaveBeenCalledWith(-1);
	});
});
