import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotesSection from './NotesSection';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useTheme } from '../../context/ThemeContext';
import * as firebaseConfig from '../../config/data/firebase'; // Import namespace for spying

// --- Mocks ---
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));

jest.mock('../../config/data/firebase', () => ({
	__esModule: true,
	getRealTimeNotes: jest.fn(),
	addNote: jest.fn(),
	updateNote: jest.fn(),
	redactNote: jest.fn(),
}));

describe('NotesSection Component', () => {
	const mockMember = { id: 'mem1', firstName: 'Test', lastName: 'User' };
	const mockDate = { toDate: () => new Date() };
	const notesData = [
		{
			id: 'note1',
			text: 'Hello World',
			authorId: 'mem1', // Same as logged in user
			authorName: 'Test User',
			createdAt: mockDate,
			visibility: 'committee',
		},
		{
			id: 'note2',
			text: 'Other Note',
			authorId: 'mem2', // Different user
			authorName: 'Other User',
			createdAt: mockDate,
			visibility: 'private',
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();
		useAuth.mockReturnValue({ member: mockMember });
		useAlert.mockReturnValue({ showAlert: jest.fn(), handleError: jest.fn() });
		useTheme.mockReturnValue({ darkMode: false });

		// Mock subscription implementation
		firebaseConfig.getRealTimeNotes.mockImplementation((col, id, callback) => {
			callback(notesData);
			return jest.fn(); // Unsubscribe
		});
	});

	test('renders list of notes', () => {
		render(<NotesSection targetId='1' targetCollection='apps' />);
		expect(screen.getByText('Hello World')).toBeInTheDocument();
		expect(screen.getByText('Other Note')).toBeInTheDocument();
	});

	test('adds a new note', async () => {
		render(<NotesSection targetId='1' targetCollection='apps' />);

		const input = screen.getByLabelText('Add a new note...');
		const addBtn = screen.getByText('Add Note');

		fireEvent.change(input, { target: { value: 'My New Note' } });
		fireEvent.click(addBtn);

		await waitFor(() => {
			expect(firebaseConfig.addNote).toHaveBeenCalledWith(
				'apps',
				'1',
				expect.objectContaining({
					text: 'My New Note',
					authorId: 'mem1',
				})
			);
		});
	});

	test('does not add note if empty', async () => {
		render(<NotesSection targetId='1' targetCollection='apps' />);
		const addBtn = screen.getByText('Add Note');
		fireEvent.click(addBtn);
		expect(firebaseConfig.addNote).not.toHaveBeenCalled();
	});

	test('toggles note visibility switch', () => {
		render(<NotesSection targetId='1' targetCollection='apps' />);
		const switchControl = screen.getByRole('checkbox');

		expect(screen.getByText('Committee Wide')).toBeInTheDocument();
		fireEvent.click(switchControl);
		expect(screen.getByText('Private (Only Me)')).toBeInTheDocument();
	});

	test('enters edit mode and saves', async () => {
		render(<NotesSection targetId='1' targetCollection='apps' />);

		// Find edit button for the note owned by user (note1)
		// Since there are multiple icon buttons, we need to be specific.
		// note1 is the first one rendered usually.
		const editButtons = screen.getAllByTestId('EditIcon');
		fireEvent.click(editButtons[0].closest('button'));

		// Textarea should appear with existing text
		const editInput = screen.getByDisplayValue('Hello World');
		fireEvent.change(editInput, { target: { value: 'Updated Text' } });

		const saveBtn = screen.getByText('Save');
		fireEvent.click(saveBtn);

		await waitFor(() => {
			expect(firebaseConfig.updateNote).toHaveBeenCalledWith('apps', '1', 'note1', 'Updated Text');
		});
	});

	test('cancels edit mode', () => {
		render(<NotesSection targetId='1' targetCollection='apps' />);

		const editButtons = screen.getAllByTestId('EditIcon');
		fireEvent.click(editButtons[0].closest('button'));

		const cancelBtn = screen.getByText('Cancel');
		fireEvent.click(cancelBtn);

		expect(screen.queryByText('Save')).not.toBeInTheDocument();
	});

	test('redacts a note', async () => {
		window.confirm = jest.fn(() => true); // Mock confirm
		render(<NotesSection targetId='1' targetCollection='apps' />);

		const deleteButtons = screen.getAllByTestId('DeleteIcon');
		fireEvent.click(deleteButtons[0].closest('button'));

		await waitFor(() => {
			expect(firebaseConfig.redactNote).toHaveBeenCalledWith('apps', '1', 'note1');
		});
	});

	test('handles redacted notes display', () => {
		const redactedData = [
			{
				id: 'r1',
				text: 'Secret',
				redacted: true,
				redactedOn: mockDate,
				createdAt: mockDate,
			},
		];

		firebaseConfig.getRealTimeNotes.mockImplementation((col, id, callback) => {
			callback(redactedData);
			return jest.fn();
		});

		render(<NotesSection targetId='1' targetCollection='apps' />);
		expect(screen.getByText(/Note redacted on/)).toBeInTheDocument();
		expect(screen.queryByText('Secret')).not.toBeInTheDocument();
	});
});
