import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DynamicButtons from './DynamicButtons';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { generatePath } from '../../config/navigation/routeUtils'; // This imports the mock

// Mock dependencies
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

// This mock factory now just creates the base jest.fn()
jest.mock('../../config/navigation/routeUtils', () => ({
	generatePath: jest.fn(),
}));

// --- TEST SETUP ---
const mockNavigate = jest.fn();
const mockOnClick = jest.fn();
const mockNavTo = jest.fn();
const mockOnAction = jest.fn();

const mockAsset = { id: 'asset123', name: 'Test Asset' };

const mockActions = [
	{ label: 'Click Me', onClick: mockOnClick },
	{ label: 'Navigate Me', navTo: mockNavTo },
	{ label: 'Hide Me', hide: true },
];
// --- END TEST SETUP ---

describe('DynamicButtons Component', () => {
	beforeEach(() => {
		// This clears all implementations
		jest.clearAllMocks();

		// Re-set implementations for *every test*
		useNavigate.mockReturnValue(mockNavigate);
		useTheme.mockReturnValue({ darkMode: false });

		mockNavTo.mockImplementation((asset) => ({
			path: '/test/:id',
			params: { id: asset.id },
		}));

		// ----- THIS IS THE FIX -----
		// We must also reset the implementation for generatePath
		generatePath.mockImplementation((path, params) => {
			// A slightly more robust mock than before
			if (params && params.id) {
				return path.replace(/:id/g, params.id);
			}
			return path;
		});
		// -------------------------
	});

	it('renders visible buttons and hides hidden buttons', () => {
		render(<DynamicButtons actions={mockActions} asset={mockAsset} />);

		expect(screen.getByText('Click Me')).toBeInTheDocument();
		expect(screen.getByText('Navigate Me')).toBeInTheDocument();
		expect(screen.queryByText('Hide Me')).not.toBeInTheDocument();
	});

	it('calls action.onClick when a button is clicked', () => {
		render(<DynamicButtons actions={mockActions} asset={mockAsset} />);

		fireEvent.click(screen.getByText('Click Me'));

		expect(mockOnClick).toHaveBeenCalledWith(mockAsset);
		expect(mockNavigate).not.toHaveBeenCalled();
		expect(mockOnAction).not.toHaveBeenCalled();
	});

	it('calls navigate when a navTo button is clicked', () => {
		render(<DynamicButtons actions={mockActions} asset={mockAsset} />);

		fireEvent.click(screen.getByText('Navigate Me'));

		// 1. It should call the navTo function to get the path
		expect(mockNavTo).toHaveBeenCalledWith(mockAsset);
		// 2. It should call generatePath with the result
		expect(generatePath).toHaveBeenCalledWith('/test/:id', { id: 'asset123' });
		// 3. It should call navigate with the final path
		expect(mockNavigate).toHaveBeenCalledWith('/test/asset123'); // This should now pass
		// 4. It should NOT call the onClick
		expect(mockOnClick).not.toHaveBeenCalled();
		expect(mockOnAction).not.toHaveBeenCalled();
	});

	it('calls onAction prop if provided and stops other logic', () => {
		render(<DynamicButtons actions={mockActions} asset={mockAsset} onAction={mockOnAction} />);

		// Click the 'Click Me' button
		fireEvent.click(screen.getByText('Click Me'));

		// 1. It should call the onAction override
		expect(mockOnAction).toHaveBeenCalledWith(mockActions[0], mockAsset);
		// 2. It should NOT call the button's internal onClick
		expect(mockOnClick).not.toHaveBeenCalled();
		// 3. It should NOT call navigate
		expect(mockNavigate).not.toHaveBeenCalled();
	});

	it('renders with "outlined" variant in light mode', () => {
		useTheme.mockReturnValue({ darkMode: false });
		render(<DynamicButtons actions={mockActions} asset={mockAsset} />);

		const button = screen.getByText('Click Me');
		expect(button).toHaveClass('MuiButton-outlined');
	});

	it('renders with "contained" variant in dark mode', () => {
		useTheme.mockReturnValue({ darkMode: true });
		render(<DynamicButtons actions={mockActions} asset={mockAsset} />);

		const button = screen.getByText('Click Me');
		expect(button).toHaveClass('MuiButton-contained');
	});
});
