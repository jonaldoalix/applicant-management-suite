import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Unsubscribe from './Unsubscribe';
import { validateLink } from '../../config/Constants';
import { updateApplicantData } from '../../config/data/firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { generatePath } from '../../config/navigation/routeUtils';

// --- Mocks ---

// Mock Firebase/Config functions
jest.mock('../../config/data/firebase', () => ({
	updateApplicantData: jest.fn(),
}));

jest.mock('../../config/Constants', () => ({
	validateLink: jest.fn(),
}));

jest.mock('../../config/navigation/routeUtils', () => ({
	generatePath: jest.fn(),
}));

jest.mock('../../config/navigation/paths', () => ({
	paths: { root: '/home' },
}));

// Mock Router
jest.mock('react-router-dom', () => ({
	useNavigate: jest.fn(),
	useParams: jest.fn(),
}));

// Mock Contexts
jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

// Mock Child Components
jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loader Component</div>);
jest.mock('../../components/footer/CopyrightFooter', () => () => <div data-testid='footer'>Copyright Footer</div>);

describe('Unsubscribe Component', () => {
	const mockNavigate = jest.fn();
	const mockEncID = 'encrypted-id-123';

	beforeEach(() => {
		jest.clearAllMocks();

		// Default mock setups
		useNavigate.mockReturnValue(mockNavigate);
		useParams.mockReturnValue({ encID: mockEncID });
		useTheme.mockReturnValue({ boxShadow: 'none' });
		generatePath.mockReturnValue('/home');
	});

	test('renders Loader initially', async () => {
		// Create a promise that never resolves immediately to hold the "loading" state
		validateLink.mockReturnValue(new Promise(() => {}));

		render(<Unsubscribe />);

		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('handles successful unsubscribe', async () => {
		const mockId = 'user-123';

		// Mock successful validation
		validateLink.mockResolvedValue({ result: true, id: mockId });
		// Mock successful DB update
		updateApplicantData.mockResolvedValue(true);

		render(<Unsubscribe />);

		// Wait for loader to disappear
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		// Check for success UI
		expect(screen.getByText('Unsubscribe Successful')).toBeInTheDocument();
		expect(screen.getByText(/successfully unsubscribed/i)).toBeInTheDocument();

		// Verify API calls
		expect(validateLink).toHaveBeenCalledWith(mockEncID);
		expect(updateApplicantData).toHaveBeenCalledWith(mockId, { 'notifications.email': false });
	});

	test('handles invalid link error', async () => {
		const mockErrorMsg = 'Token expired';

		// Mock validation failure
		validateLink.mockResolvedValue({ result: false, error: mockErrorMsg });

		render(<Unsubscribe />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		// Check for error UI
		expect(screen.getByText('Unsubscribe Error')).toBeInTheDocument();
		// Check that the specific error message from the backend is displayed
		expect(screen.getByText(new RegExp(`Error: ${mockErrorMsg}`, 'i'))).toBeInTheDocument();

		// Ensure we did NOT try to update data
		expect(updateApplicantData).not.toHaveBeenCalled();
	});

	test('handles exception during validation/update process', async () => {
		const crashError = 'Network Error';

		// Mock validation to throw an exception
		validateLink.mockRejectedValue(new Error(crashError));

		render(<Unsubscribe />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		// Check for error UI
		expect(screen.getByText('Unsubscribe Error')).toBeInTheDocument();
		expect(screen.getByText(crashError)).toBeInTheDocument();
	});

	test('navigates to homepage when button is clicked', async () => {
		// Setup a success state so the button renders
		validateLink.mockResolvedValue({ result: true, id: '123' });
		updateApplicantData.mockResolvedValue(true);

		render(<Unsubscribe />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		const homeButton = screen.getByRole('button', { name: /go to homepage/i });
		fireEvent.click(homeButton);

		expect(mockNavigate).toHaveBeenCalledWith('/home');
	});
});
