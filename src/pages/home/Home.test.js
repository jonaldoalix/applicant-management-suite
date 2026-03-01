import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './Home'; // Adjust path if the test file is not in src/pages
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';

// Mock the child components to isolate Home component testing
jest.mock('../../components/home/Sections/Intro', () => {
	return function MockIntro() {
		return <div data-testid='intro-section'>Intro Component</div>;
	};
});
jest.mock('../../components/home/Sections/ResponsiveAppBar', () => {
	return function MockAppBar() {
		return <div data-testid='appbar-section'>AppBar Component</div>;
	};
});
jest.mock('../../components/home/Sections/ResponsiveFooter', () => {
	return function MockFooter() {
		return <div data-testid='footer-section'>Footer Component</div>;
	};
});
jest.mock('../../components/home/Sections/Information', () => {
	return function MockInformation() {
		return <div data-testid='information-section'>Information Component</div>;
	};
});

// Mock the custom hooks
jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

// Mock the config content
jest.mock('../../config/content/content', () => ({
	homePageContent: {
		intro: { enabled: true },
		appBar: { enabled: true },
		information: { enabled: true },
		footer: { enabled: true },
	},
}));

describe('Home Component', () => {
	const mockUseTheme = useTheme;
	const mockUseTitle = useTitle;

	beforeEach(() => {
		jest.clearAllMocks();
		// Default mock implementations
		mockUseTheme.mockReturnValue({ darkMode: false });
		mockUseTitle.mockImplementation(() => {});
	});

	test('renders all enabled sections correctly', () => {
		render(<Home />);

		expect(screen.getByTestId('intro-section')).toBeInTheDocument();
		expect(screen.getByTestId('appbar-section')).toBeInTheDocument();
		expect(screen.getByTestId('information-section')).toBeInTheDocument();
		expect(screen.getByTestId('footer-section')).toBeInTheDocument();
	});

	test('calls useTitle with correct arguments', () => {
		render(<Home />);
		expect(mockUseTitle).toHaveBeenCalledWith({ title: 'Home', appear: true });
	});

	test('applies light mode styles to Container when darkMode is false', () => {
		mockUseTheme.mockReturnValue({ darkMode: false });
		const { container } = render(<Home />);

		// The Container component from MUI renders a div with MuiContainer-root class
		// We check the computed style or the sx prop application logic indirectly via inline styles/classes
		// Since we can't easily check sx computation without a real theme provider, we check if it rendered
		// and in a real integration test we'd check computed styles.
		// For unit testing MUI sx, we often trust MUI works and just ensure the component renders without crashing.
		// However, we can check if the specific props were likely applied if we were doing shallow rendering,
		// but with RTL we check the DOM.

		const layoutContainer = container.querySelector('.MuiContainer-root');
		expect(layoutContainer).toBeInTheDocument();
		// Verify custom styles are applied (approximate check based on JSDOM behavior)
		expect(layoutContainer).toHaveStyle('width: 100%');
	});

	test('applies dark mode styles logic (simulated)', () => {
		// Since actual HEX codes from 'custom.black' require the full ThemeProvider context,
		// this test primarily ensures the component handles the darkMode flag without crashing
		// and re-renders the structure.
		mockUseTheme.mockReturnValue({ darkMode: true });
		render(<Home />);

		expect(screen.getByTestId('information-section')).toBeInTheDocument();
	});
});
