import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PermissionGroup from './PermissionGroup';
import { useTheme } from '../../context/ThemeContext';

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

describe('PermissionGroup Component', () => {
	const mockOnUpdate = jest.fn();
	const mockData = {
		permissions: {
			admin: true,
			editor: false,
		},
	};

	const mockGroups = {
		'Role Access': ['admin', 'editor'],
		Other: ['viewer'],
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false });
	});

	test('renders groups and checkboxes', () => {
		render(<PermissionGroup formData={mockData} groups={mockGroups} onUpdate={mockOnUpdate} />);

		expect(screen.getByText('Role Access')).toBeInTheDocument();
		expect(screen.getByText('Other')).toBeInTheDocument();

		// Labels are formatted by the component (capitalized)
		expect(screen.getByText('Admin')).toBeInTheDocument();
		expect(screen.getByText('Editor')).toBeInTheDocument();
		expect(screen.getByText('Viewer')).toBeInTheDocument();
	});

	test('checkboxes reflect current state', () => {
		render(<PermissionGroup formData={mockData} groups={mockGroups} onUpdate={mockOnUpdate} />);

		// Use getByRole with the visual label name which acts as the accessible name here
		const adminCheck = screen.getByRole('checkbox', { name: /Admin/i });
		const editorCheck = screen.getByRole('checkbox', { name: /Editor/i });

		expect(adminCheck).toBeChecked();
		expect(editorCheck).not.toBeChecked();
	});

	test('calls onUpdate when checkbox toggled', () => {
		render(<PermissionGroup formData={mockData} groups={mockGroups} onUpdate={mockOnUpdate} />);

		const editorCheck = screen.getByRole('checkbox', { name: /Editor/i });
		fireEvent.click(editorCheck);

		expect(mockOnUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				permissions: expect.objectContaining({
					editor: true,
				}),
			})
		);
	});

	test('respects disabled prop', () => {
		render(<PermissionGroup formData={mockData} groups={mockGroups} onUpdate={mockOnUpdate} disabled={true} />);

		const adminCheck = screen.getByRole('checkbox', { name: /Admin/i });
		expect(adminCheck).toBeDisabled();
	});
});
