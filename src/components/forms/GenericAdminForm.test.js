import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import GenericAdminForm from './GenericAdminForm';

// --- MOCKS ---
const mockNavigate = jest.fn();
const mockShowAlert = jest.fn();

jest.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}));

jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

// Mock Child Components
jest.mock('./DynamicField', () => ({
	__esModule: true,
	default: ({ fieldConfig, onFieldUpdate, onErrorUpdate, application, sectionName }) => {
		// Ensure value extraction handles potential undefineds gracefully during render
		const sectionData = application[sectionName] || {};
		const value = sectionData[fieldConfig.name] || '';

		return (
			<div data-testid={`field-${fieldConfig.name}`}>
				<label>{fieldConfig.label}</label>
				<input data-testid={`input-${fieldConfig.name}`} value={value} onChange={(e) => onFieldUpdate(fieldConfig.name, e.target.value)} />
				{/* FIX: Added type="button" to all helper buttons.
                    Without this, they default to type="submit" inside a form,
                    causing premature submissions during test interactions.
                */}
				<button type='button' data-testid={`trigger-perm-2-${fieldConfig.name}`} onClick={() => onFieldUpdate('permissions.admin', true)}>
					Update Perm L2
				</button>
				<button type='button' data-testid={`trigger-perm-3-${fieldConfig.name}`} onClick={() => onFieldUpdate('permissions.interviews.canEdit', true)}>
					Update Perm L3
				</button>
				<button type='button' data-testid={`trigger-error-${fieldConfig.name}`} onClick={() => onErrorUpdate(fieldConfig.name, true)}>
					Trigger Error
				</button>
				<button type='button' data-testid={`clear-error-${fieldConfig.name}`} onClick={() => onErrorUpdate(fieldConfig.name, false)}>
					Clear Error
				</button>
			</div>
		);
	},
}));

jest.mock('./PermissionGroup', () => ({
	__esModule: true,
	default: () => <div data-testid='permission-group'>Permissions</div>,
}));

describe('GenericAdminForm Component', () => {
	const mockConfig = {
		name: 'adminForm',
		fields: [
			{ name: 'title', type: 'text', label: 'Title' },
			{ name: 'description', type: 'text', label: 'Description' },
			{ name: 'avatar', type: 'pictureUpload', label: 'Avatar' },
			{ name: 'perms', type: 'permissionGroup', label: 'Permissions' },
		],
	};

	const mockInitialData = {
		title: 'Initial Title',
		description: 'Desc',
		permissions: {
			interviews: { canEdit: false },
		},
	};

	const mockOnSubmit = jest.fn();
	const mockOnFieldChange = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		const { useAlert } = require('../../context/AlertContext');
		useAlert.mockReturnValue({ showAlert: mockShowAlert });
	});

	test('renders form fields from config', () => {
		render(<GenericAdminForm formConfig={mockConfig} initialData={mockInitialData} onSubmit={mockOnSubmit} />);

		expect(screen.getByTestId('field-title')).toBeInTheDocument();
		expect(screen.getByTestId('field-avatar')).toBeInTheDocument();
		expect(screen.getByTestId('permission-group')).toBeInTheDocument();
	});

	test('updates standard field values', async () => {
		const { container } = render(<GenericAdminForm formConfig={mockConfig} initialData={mockInitialData} onSubmit={mockOnSubmit} onFieldChange={mockOnFieldChange} />);

		const titleInput = screen.getByTestId('input-title');

		await act(async () => {
			fireEvent.change(titleInput, { target: { value: 'New Title' } });
		});

		await act(async () => {
			fireEvent.submit(container.querySelector('form'));
		});

		expect(mockOnSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				title: 'New Title',
			})
		);

		expect(mockOnFieldChange).toHaveBeenCalledWith('title', 'New Title');
	});

	test('handles nested permission updates (Length 2)', async () => {
		const { container } = render(<GenericAdminForm formConfig={mockConfig} initialData={mockInitialData} onSubmit={mockOnSubmit} />);

		await act(async () => {
			fireEvent.click(screen.getByTestId('trigger-perm-2-title'));
		});

		await act(async () => {
			fireEvent.submit(container.querySelector('form'));
		});

		expect(mockOnSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				permissions: expect.objectContaining({
					admin: true,
				}),
			})
		);
	});

	test('handles nested permission updates (Length 3)', async () => {
		const { container } = render(<GenericAdminForm formConfig={mockConfig} initialData={mockInitialData} onSubmit={mockOnSubmit} />);

		await act(async () => {
			fireEvent.click(screen.getByTestId('trigger-perm-3-title'));
		});

		await act(async () => {
			fireEvent.submit(container.querySelector('form'));
		});

		expect(mockOnSubmit).toHaveBeenCalledWith(
			expect.objectContaining({
				permissions: expect.objectContaining({
					interviews: expect.objectContaining({
						canEdit: true,
					}),
				}),
			})
		);
	});

	test('blocks submission when validation errors exist', async () => {
		const { container } = render(<GenericAdminForm formConfig={mockConfig} initialData={mockInitialData} onSubmit={mockOnSubmit} />);

		// 1. Trigger Error
		// This click used to submit the form accidentally! Now it won't.
		await act(async () => {
			fireEvent.click(screen.getByTestId('trigger-error-title'));
		});

		// 2. Attempt Submit
		await act(async () => {
			fireEvent.submit(container.querySelector('form'));
		});

		// 3. Verify Blocked
		expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Please fix the errors before submitting.', type: 'error' });
		expect(mockOnSubmit).not.toHaveBeenCalled();

		// 4. Clear Error and Retry
		await act(async () => {
			fireEvent.click(screen.getByTestId('clear-error-title'));
		});

		await act(async () => {
			fireEvent.submit(container.querySelector('form'));
		});

		// 5. Verify Success
		expect(mockOnSubmit).toHaveBeenCalled();
	});

	test('updates form data when initialData prop changes', () => {
		const { rerender } = render(<GenericAdminForm formConfig={mockConfig} initialData={mockInitialData} onSubmit={mockOnSubmit} />);

		expect(screen.getByTestId('input-title')).toHaveValue('Initial Title');

		const newData = { ...mockInitialData, title: 'Updated External' };

		rerender(<GenericAdminForm formConfig={mockConfig} initialData={newData} onSubmit={mockOnSubmit} />);

		expect(screen.getByTestId('input-title')).toHaveValue('Updated External');
	});

	test('navigates back on cancel', () => {
		render(<GenericAdminForm formConfig={mockConfig} initialData={mockInitialData} onSubmit={mockOnSubmit} />);

		const cancelBtn = screen.getByText('Cancel');
		fireEvent.click(cancelBtn);
		expect(mockNavigate).toHaveBeenCalledWith(-1);
	});
});
