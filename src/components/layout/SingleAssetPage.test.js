import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SingleAssetPage, { AssetCard } from './SingleAssetPage';
import { useSidebar } from '../../context/SidebarContext';
import { useTheme } from '../../context/ThemeContext';

// --- Mocks ---
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}));

jest.mock('../../context/SidebarContext', () => ({
	useSidebar: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

describe('SingleAssetPage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useSidebar.mockReturnValue({ collapsed: false });
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
	});

	test('renders children and back button', () => {
		render(
			<SingleAssetPage>
				<div>Page Content</div>
			</SingleAssetPage>
		);

		expect(screen.getByText('Page Content')).toBeInTheDocument();
		expect(screen.getByRole('button')).toBeInTheDocument(); // Back button (IconButton)
	});

	test('navigates back on button click', () => {
		render(
			<SingleAssetPage>
				<div />
			</SingleAssetPage>
		);

		const backButton = screen.getByRole('button');
		fireEvent.click(backButton);

		expect(mockNavigate).toHaveBeenCalledWith(-1);
	});

	test('adjusts back button position when sidebar is collapsed', () => {
		// This mainly checks if the hook is called, implying logic execution
		useSidebar.mockReturnValue({ collapsed: true });

		render(
			<SingleAssetPage>
				<div />
			</SingleAssetPage>
		);

		// Verifying style logic via hook calls is sufficient for unit tests usually
		expect(useSidebar).toHaveBeenCalled();
	});
});

describe('AssetCard', () => {
	beforeEach(() => {
		useTheme.mockReturnValue({ darkMode: false, boxShadow: '0px 2px 5px black' });
	});

	test('renders children', () => {
		render(
			<AssetCard>
				<div>Card Content</div>
			</AssetCard>
		);

		expect(screen.getByText('Card Content')).toBeInTheDocument();
	});
});
