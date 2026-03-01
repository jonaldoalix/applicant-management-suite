import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Application from './Application';
import { useTheme } from '../../context/ThemeContext';
import { getApplication } from '../../config/data/firebase';
import { blankApp } from '../../config/data/Validation';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';

// Mock Dependencies
jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mockNavigate,
}));

jest.mock('../../config/data/firebase', () => ({
	getApplication: jest.fn(),
}));

jest.mock('../../config/data/Validation', () => ({
	blankApp: {
		type: 'Loading...',
		window: '2000-01-01T00:00:00Z',
		status: 'Loading',
		id: 'blank',
	},
}));

jest.mock('../../config/navigation/routeUtils', () => ({
	generatePath: jest.fn(),
}));

jest.mock('../../config/navigation/paths', () => ({
	paths: { viewApp: '/app/view/:id' },
}));

describe('Application Widget Component', () => {
	const mockAppData = {
		id: 'app123',
		type: 'Scholarship',
		window: '2024-05-15T23:59:59Z',
		status: 'Submitted',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		getApplication.mockResolvedValue(mockAppData); // Mock the Firebase fetch
		generatePath.mockImplementation((path, params) => path.replace(/:id/g, params.id));
	});

	it('calls getApplication on mount and renders fetched data', async () => {
		render(
			<MemoryRouter>
				<Application id='app123' />
			</MemoryRouter>
		);

		// Check that getApplication was called
		expect(getApplication).toHaveBeenCalledWith('app123', 'app123');

		// Wait for the component to update and check for the *new* data
		expect(await screen.findByText('Scholarship')).toBeInTheDocument();
		expect(screen.getByText('2024')).toBeInTheDocument();
		expect(screen.getByText('Submitted')).toBeInTheDocument();
	});

	it('navigates to the correct app path on button click', async () => {
		render(
			<MemoryRouter>
				<Application id='app123' />
			</MemoryRouter>
		);

		// --- THIS IS THE FIX ---
		// Wait for the component to re-render with the fetched data
		expect(await screen.findByText('Scholarship')).toBeInTheDocument();

		// Now that the data is loaded, find and click the button
		const button = screen.getByRole('button', { name: 'Review Application' });
		fireEvent.click(button);

		// Check that generatePath was called with the correct info (app123)
		expect(generatePath).toHaveBeenCalledWith(paths.viewApp, { id: 'app123' });

		// Check that navigate was called with the final path
		expect(mockNavigate).toHaveBeenCalledWith('/app/view/app123');
	});

	it('handles delete click', async () => {
		render(
			<MemoryRouter>
				<Application id='app123' />
			</MemoryRouter>
		);

		// Wait for component to load before looking for the delete icon
		await screen.findByText('Scholarship');

		// Find the delete icon
		const deleteBox = screen.getByTestId('DeleteIcon').closest('div');
		fireEvent.click(deleteBox);
	});
});
