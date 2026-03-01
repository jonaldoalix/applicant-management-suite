import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchResultsDropdown from './SearchResultsDropdown';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}));

// FIXED: Mock config without using JSX syntax in the factory
jest.mock('../../config/admin', () => ({
	searchConfig: {
		members: {
			title: 'Members',
			icon: 'MemberIcon', // Changed from JSX <span> to string to avoid syntax error
			getPath: (item) => `/member/${item.id}`,
			getText: (item) => ({ primary: item.name, secondary: item.email }),
		},
	},
}));

describe('SearchResultsDropdown', () => {
	const mockClose = jest.fn();
	// Using a dummy element for anchor
	const anchor = document.createElement('div');

	test('renders loading state', () => {
		render(<SearchResultsDropdown loading={true} anchorEl={anchor} onClose={mockClose} />);
		expect(screen.getByRole('progressbar')).toBeInTheDocument();
	});

	test('renders no results message', () => {
		render(<SearchResultsDropdown loading={false} results={{ members: [] }} anchorEl={anchor} onClose={mockClose} />);
		expect(screen.getByText('No results found.')).toBeInTheDocument();
	});

	test('renders results and handles click', () => {
		const results = {
			members: [{ id: '1', name: 'John Doe', email: 'john@test.com' }],
		};

		render(<SearchResultsDropdown loading={false} results={results} anchorEl={anchor} onClose={mockClose} searchTerm='John' />);

		expect(screen.getByText('Members (1)')).toBeInTheDocument();
		expect(screen.getByText('John Doe')).toBeInTheDocument();
		expect(screen.getByText('john@test.com')).toBeInTheDocument();

		// Click item
		fireEvent.click(screen.getByText('John Doe'));
		expect(mockNavigate).toHaveBeenCalledWith('/member/1');
		expect(mockClose).toHaveBeenCalled();
	});
});
