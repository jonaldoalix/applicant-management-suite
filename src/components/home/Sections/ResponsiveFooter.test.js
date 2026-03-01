import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResponsiveFooter from './ResponsiveFooter';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { homePageContent } from '../../../config/content/content';

// Mock Dependencies
jest.mock('../../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mockNavigate,
}));

jest.mock('../../../config/content/content', () => ({
	homePageContent: {
		footer: {
			organizationName: { long: 'Long Org Name', short: 'Short' },
			scrollToTopButton: { enabled: true, labels: { long: 'To Top', short: 'Top' } },
			themeToggle: { enabled: true },
			authLink: { enabled: true },
			copyright: { enabled: true, line1: 'Line 1', startYear: 2020 },
		},
	},
}));

// Mock config files needed for hrefs
jest.mock('../../../config/navigation/routeUtils', () => ({ generatePath: (path) => path }));
jest.mock('../../../config/navigation/paths', () => ({ paths: { home: '/', redirect: '/dash', login: '/login' } }));

describe('ResponsiveFooter Component', () => {
	const mockTopRef = { current: { scrollIntoView: jest.fn() } };
	const mockSetParentTab = jest.fn();
	const mockSetChildTab = jest.fn();
	const mockDispatch = jest.fn();
	const currYear = new Date().getFullYear();

	beforeEach(() => {
		jest.clearAllMocks();
		useAuth.mockReturnValue({ user: null }); // Logged out
		useTheme.mockReturnValue({ darkMode: false, dispatch: mockDispatch });
	});

	it('renders content and copyright', () => {
		render(
			<MemoryRouter>
				<ResponsiveFooter topRef={mockTopRef} setParentTab={mockSetParentTab} setChildTab={mockSetChildTab} />
			</MemoryRouter>
		);

		expect(screen.getByText('Long Org Name')).toBeInTheDocument();
		expect(screen.getByText(`© Line 1 | 2020 - ${currYear}`)).toBeInTheDocument();
	});

	it('calls scrollToTop and resets tabs on Fab click', () => {
		render(
			<MemoryRouter>
				<ResponsiveFooter topRef={mockTopRef} setParentTab={mockSetParentTab} setChildTab={mockSetChildTab} />
			</MemoryRouter>
		);

		fireEvent.click(screen.getByRole('button', { name: /Scroll Back Up/i }));

		expect(mockTopRef.current.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
		expect(mockSetParentTab).toHaveBeenCalledWith(0);
		expect(mockSetChildTab).toHaveBeenCalledWith(0);
	});

	it('handles theme toggle click', () => {
		render(
			<MemoryRouter>
				<ResponsiveFooter topRef={mockTopRef} setParentTab={mockSetParentTab} setChildTab={mockSetChildTab} />
			</MemoryRouter>
		);

		// --- THIS IS THE FIX ---
		fireEvent.click(screen.getByTestId('DarkModeOutlinedIcon'));
		expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE' });
	});

	it('handles auth link click (logged out)', () => {
		render(
			<MemoryRouter>
				<ResponsiveFooter topRef={mockTopRef} setParentTab={mockSetParentTab} setChildTab={mockSetChildTab} />
			</MemoryRouter>
		);

		fireEvent.click(screen.getByTestId('LockIcon'));
		expect(mockNavigate).toHaveBeenCalledWith('/login');
	});
});
