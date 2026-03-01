import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from './Header';
import { useTheme } from '../../context/ThemeContext';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

describe('Header Component', () => {
	const mockConfig = { DEFAULT_AVATAR: 'default.png' };

	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false });
	});

	test('renders title and children', () => {
		render(
			<Header title='Test User' config={mockConfig}>
				<div>Child Content</div>
			</Header>
		);

		expect(screen.getByText('Test User')).toBeInTheDocument();
		expect(screen.getByText('Child Content')).toBeInTheDocument();
	});

	test('renders edit button and navigates when editPath is provided', () => {
		render(<Header title='Test User' config={mockConfig} editPath='/edit/123' />);

		const editBtn = screen.getByText('Edit');
		expect(editBtn).toBeInTheDocument();

		fireEvent.click(editBtn);
		expect(mockNavigate).toHaveBeenCalledWith('/edit/123');
	});

	test('does not render edit button if editPath is missing', () => {
		render(<Header title='Test User' config={mockConfig} />);
		expect(screen.queryByText('Edit')).not.toBeInTheDocument();
	});

	test('renders status badge if provided', () => {
		render(<Header title='Test User' config={mockConfig} status='Active' />);
		expect(screen.getByText('Active')).toBeInTheDocument();
	});

	test('uses default avatar if image prop is missing', () => {
		render(<Header title='Test User' config={mockConfig} />);
		const avatar = screen.getByAltText('Profile');
		expect(avatar).toHaveAttribute('src', 'default.png');
	});

	test('uses provided image if available', () => {
		render(<Header title='Test User' config={mockConfig} image='user.jpg' />);
		const avatar = screen.getByAltText('Profile');
		expect(avatar).toHaveAttribute('src', 'user.jpg');
	});
});
