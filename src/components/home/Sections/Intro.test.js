import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Intro from './Intro';
import { useTheme } from '../../../context/ThemeContext';
import { homePageContent } from '../../../config/content/content';

// Mock Dependencies
jest.mock('../../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

jest.mock('../../../config/content/content', () => ({
	homePageContent: {
		intro: {
			backgroundImages: { light: 'light.jpg', dark: 'dark.jpg' },
			externalLink: { enabled: true, url: 'http://test.com', label: 'External Link' },
			windowInfo: { enabled: true },
			welcomeText: { enabled: true, line1: 'Welcome', line2: 'To The Fund' },
			scrollFab: { enabled: true, label: 'Scroll' },
		},
	},
}));

// Mock Child Components
jest.mock('../../timer/WindowInfo', () => () => <div data-testid='mock-window-info' />);

describe('Intro Component', () => {
	const mockAppBarRef = { current: { scrollIntoView: jest.fn() } };
	const mockTopRef = { current: null }; // This ref is just passed, not used

	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false });
	});

	it('renders content from homePageContent config', () => {
		render(<Intro appBarRef={mockAppBarRef} topRef={mockTopRef} />);

		expect(screen.getByText('External Link')).toBeInTheDocument();
		expect(screen.getByTestId('mock-window-info')).toBeInTheDocument();
		expect(screen.getByText('Welcome')).toBeInTheDocument();
		expect(screen.getByText('To The Fund')).toBeInTheDocument();
		expect(screen.getByText('Scroll')).toBeInTheDocument();
	});

	it('calls scrollIntoView on app bar ref when Fab is clicked', () => {
		render(<Intro appBarRef={mockAppBarRef} topRef={mockTopRef} />);

		const fab = screen.getByRole('button', { name: /Scroll Down to Content/i });
		fireEvent.click(fab);

		expect(mockAppBarRef.current.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
	});

	it('uses dark mode background when dark mode is active', () => {
		useTheme.mockReturnValue({ darkMode: true });
		const { container } = render(<Intro appBarRef={mockAppBarRef} topRef={mockTopRef} />);

		// Check that the container's style contains the dark mode image
		expect(container.firstChild).toHaveStyle('background: url(dark.jpg)');
	});
});
