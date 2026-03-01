import React from 'react';
import { render, screen } from '@testing-library/react';
import CopyrightFooter from './CopyrightFooter';

// 1. Minimal Mock for MUI to catch the 'href' attribute
jest.mock('@mui/material', () => {
	return {
		Link: ({ children, href, ...props }) => (
			<a href={href} {...props} data-testid='copyright-link'>
				{children}
			</a>
		),
		Typography: ({ children, ...props }) => <div {...props}>{children}</div>,
	};
});

// 2. We don't even need to mock the config files anymore if we inject the prop!
// (However, keep simple mocks to prevent import crashes if those files are complex)
jest.mock('../../config/navigation/paths', () => ({ paths: { home: '/' } }));
jest.mock('../../config/navigation/routeUtils', () => ({ generatePath: () => '/' }));

describe('CopyrightFooter', () => {
	test('renders with the provided link prop', () => {
		const testUrl = '/test-home-url';

		// Pass the specific URL we want to test
		render(<CopyrightFooter homeLink={testUrl} />);

		const currentYear = new Date().getFullYear();

		// 1. Check text
		expect(screen.getByText(/Copyright ©/)).toBeInTheDocument();
		expect(screen.getByText(new RegExp(currentYear.toString()))).toBeInTheDocument();

		// 2. Check the Link
		const link = screen.getByTestId('copyright-link');

		// The test will now PASS because we manually injected the href
		expect(link).toHaveAttribute('href', testUrl);
		expect(link).toHaveTextContent(/The Application Management Suite/i);
	});
});
