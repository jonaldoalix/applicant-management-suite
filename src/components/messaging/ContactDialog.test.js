import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactDialog from './ContactDialog';
import { useTheme } from '../../context/ThemeContext';
import { TemplatedOptions, CustomMessageTrigger } from './MessageOptions';

// Mock dependencies
jest.mock('../../context/ThemeContext');
// FIX: Auto-mock the module. This turns TemplatedOptions and CustomMessageTrigger
// into jest.fn() spies.
jest.mock('./MessageOptions');

describe('ContactDialog', () => {
	const mockOnClose = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false });

		// FIX: Explicitly set the implementation for the mocked components.
		// We cast them as jest.Mock to access .mockImplementation
		TemplatedOptions.mockImplementation(() => <div>Mock TemplatedOptions</div>);
		CustomMessageTrigger.mockImplementation(() => <div>Mock CustomMessageTrigger</div>);
	});

	it('renders with a custom title', () => {
		render(<ContactDialog recipients={[]} onClose={mockOnClose} title='My Custom Title' />);
		expect(screen.getByText('My Custom Title')).toBeInTheDocument();
	});

	it('generates title for one recipient', () => {
		const recipients = [{ name: 'Test User' }];
		render(<ContactDialog recipients={recipients} onClose={mockOnClose} />);
		expect(screen.getByText('Contacting: Test User')).toBeInTheDocument();
	});

	it('generates title for multiple recipients', () => {
		const recipients = [{ name: 'User 1' }, { name: 'User 2' }];
		render(<ContactDialog recipients={recipients} onClose={mockOnClose} />);
		expect(screen.getByText('Contacting 2 Recipients')).toBeInTheDocument();
	});

	it('renders the child components with correct props', () => {
		const recipients = [{ name: 'User 1' }];
		render(<ContactDialog recipients={recipients} onClose={mockOnClose} />);

		// This should now find the text
		expect(screen.getByText('Mock TemplatedOptions')).toBeInTheDocument();
		expect(TemplatedOptions).toHaveBeenCalledWith(
			expect.objectContaining({
				darkMode: false,
				recipients: recipients,
				onClose: mockOnClose,
			}),
			{}
		);

		expect(screen.getByText('Mock CustomMessageTrigger')).toBeInTheDocument();
		expect(CustomMessageTrigger).toHaveBeenCalledWith(
			expect.objectContaining({
				darkMode: false,
				recipients: recipients,
				onClose: mockOnClose,
			}),
			{}
		);
	});

	it('calls onClose when close button is clicked', () => {
		render(<ContactDialog recipients={[]} onClose={mockOnClose} />);
		fireEvent.click(screen.getByRole('button', { name: 'Close' }));
		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});
});
