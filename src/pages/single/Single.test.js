import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Single from './Single';
import { getCollectionData } from '../../config/data/firebase';
import { useParams } from 'react-router-dom';
import { useTitle } from '../../context/HelmetContext';
// Import the config object so we can manipulate the mock implementation in our tests
import { viewAsset } from '../../config/admin';

// --- Mocks ---

jest.mock('../../config/data/firebase', () => ({
	getCollectionData: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
	useParams: jest.fn(),
}));

jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

jest.mock('../../components/layout/NotFound', () => () => <div data-testid='not-found'>NotFound Component</div>);
jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loader Component</div>);

// Define the structure, but leave the function implementation empty for now
jest.mock('../../config/admin', () => ({
	viewAsset: {
		validType: {
			title: 'Test Item',
			collection: 'test-collection',
			renderComponent: jest.fn(),
		},
	},
}));

describe('Single Component', () => {
	const mockId = '12345';

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('renders Loader initially while fetching data', () => {
		useParams.mockReturnValue({ id: mockId });
		getCollectionData.mockReturnValue(new Promise(() => {})); // Pending promise

		render(<Single type='validType' />);

		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('renders the correct component when data fetches successfully', async () => {
		const mockData = { name: 'Success Item' };
		useParams.mockReturnValue({ id: mockId });
		getCollectionData.mockResolvedValue(mockData);

		// FIX: Define the JSX behavior HERE, inside the test, where React is fully available.
		viewAsset.validType.renderComponent.mockImplementation((data) => <div data-testid='dynamic-content'>Rendered Data: {data.name}</div>);

		render(<Single type='validType' />);

		// Wait for loader to be removed
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		// Check for the dynamic content
		expect(screen.getByTestId('dynamic-content')).toBeInTheDocument();
		expect(screen.getByText('Rendered Data: Success Item')).toBeInTheDocument();

		// Verify Firebase call arguments
		expect(getCollectionData).toHaveBeenCalledWith(mockId, 'test-collection', mockId);

		// Verify Title update
		expect(useTitle).toHaveBeenCalledWith({ title: 'View Test Item', appear: false });
	});

	test('renders NotFound when the "type" prop does not exist in config', async () => {
		useParams.mockReturnValue({ id: mockId });

		render(<Single type='invalidType' />);

		expect(screen.getByTestId('not-found')).toBeInTheDocument();
		expect(getCollectionData).not.toHaveBeenCalled();
	});

	test('renders NotFound when data fetching returns null', async () => {
		useParams.mockReturnValue({ id: mockId });
		getCollectionData.mockResolvedValue(null);

		render(<Single type='validType' />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(screen.getByTestId('not-found')).toBeInTheDocument();
	});

	test('renders NotFound when params ID is missing', async () => {
		useParams.mockReturnValue({}); // No ID

		render(<Single type='validType' />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(screen.getByTestId('not-found')).toBeInTheDocument();
	});
});
