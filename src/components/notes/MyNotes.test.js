import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MyNotes from './MyNotes';
import { useAuth } from '../../context/AuthContext';
import { getNotesByAuthor } from '../../config/data/firebase';
import { useTitle } from '../../context/HelmetContext';
// Import the mocked function so we can set its implementation
import { generatePath } from '../../config/navigation/routeUtils';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: () => mockNavigate,
}));

jest.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

jest.mock('../../config/data/firebase', () => ({
	__esModule: true,
	getNotesByAuthor: jest.fn(),
}));

// Define the mock shell here
jest.mock('../../config/navigation/routeUtils', () => ({
	__esModule: true,
	generatePath: jest.fn(),
}));

jest.mock('../../config/navigation/paths', () => ({
	__esModule: true,
	paths: { viewApp: '/app', viewApplicant: '/applicant' },
}));

// Define strict collection strings to match test data
jest.mock('../../config/data/collections', () => ({
	__esModule: true,
	collections: {
		applications: 'applications_collection',
		applicants: 'applicants_collection',
	},
}));

jest.mock('../loader/Loader', () => () => <div>Loading...</div>);

describe('MyNotes Component', () => {
	const mockDate = { toDate: () => new Date('2023-01-01') };

	beforeEach(() => {
		jest.clearAllMocks();

		// VALIDATION: Implement the mock logic here to ensure it binds correctly
		generatePath.mockImplementation((path, params) => {
			if (!path) return '/error-no-path';
			return params && params.id ? `${path}/${params.id}` : path;
		});
	});

	test('renders loader initially', async () => {
		getNotesByAuthor.mockReturnValue(new Promise(() => {})); // Never resolves
		useAuth.mockReturnValue({ member: { id: '1' } });
		render(<MyNotes />);
		expect(screen.getByText('Loading...')).toBeInTheDocument();
	});

	test('fetches notes by ID prop if provided', async () => {
		useAuth.mockReturnValue({ member: { id: 'logged-in-user' } });
		getNotesByAuthor.mockResolvedValue([]);

		await act(async () => {
			render(<MyNotes id='provided-id' />);
		});

		expect(getNotesByAuthor).toHaveBeenCalledWith('provided-id');
	});

	test('fetches notes by logged in member ID if no prop provided', async () => {
		useAuth.mockReturnValue({ member: { id: 'logged-in-user' } });
		getNotesByAuthor.mockResolvedValue([]);

		await act(async () => {
			render(<MyNotes />);
		});

		expect(getNotesByAuthor).toHaveBeenCalledWith('logged-in-user');
	});

	test('renders empty state', async () => {
		useAuth.mockReturnValue({ member: { id: '1' } });
		getNotesByAuthor.mockResolvedValue([]);

		render(<MyNotes />);

		// Use findByText to automatically wait for the Loading state to finish
		// This resolves the "updates not wrapped in act" warning
		expect(await screen.findByText("You haven't written any notes yet.")).toBeInTheDocument();
	});

	test('renders list of notes and handles navigation', async () => {
		useAuth.mockReturnValue({ member: { id: '1' } });

		const mockNotes = [
			{
				id: 'n1',
				text: 'Note 1',
				visibility: 'private',
				createdAt: mockDate,
				parent: { collection: 'applications_collection', name: 'App 1', id: 'app1' },
			},
			{
				id: 'n2',
				text: 'Note 2',
				visibility: 'committee',
				createdAt: mockDate,
				redacted: true,
				redactedOn: mockDate,
				parent: { collection: 'applicants_collection', name: 'Applicant 1', id: 'applicant1' },
			},
		];
		getNotesByAuthor.mockResolvedValue(mockNotes);

		render(<MyNotes />);

		// Wait for data to load
		const noteElement = await screen.findByText('Note 1');
		expect(noteElement).toBeInTheDocument();
		expect(screen.getByText(/This note was redacted/)).toBeInTheDocument();

		// Test Navigation Click for Application
		const appBtn = screen.getByText('App 1');
		fireEvent.click(appBtn);

		expect(mockNavigate).toHaveBeenCalledWith('/app/app1');
	});

	test('handles unknown parent collection navigation', async () => {
		useAuth.mockReturnValue({ member: { id: '1' } });
		const mockNotes = [
			{
				id: 'n1',
				text: 'Note 1',
				createdAt: mockDate,
				parent: { collection: 'unknown_collection', name: 'Unknown', id: 'u1' },
			},
		];
		getNotesByAuthor.mockResolvedValue(mockNotes);

		render(<MyNotes />);

		// Wait for loading to finish
		await screen.findByText('Note 1');

		fireEvent.click(screen.getByText('Unknown'));
		// Falls back to '/' in getParentPage
		expect(mockNavigate).toHaveBeenCalledWith('/');
	});
});
