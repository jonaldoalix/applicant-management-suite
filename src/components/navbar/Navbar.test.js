import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Navbar from './Navbar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMailbox } from '../../context/MailboxContext';
import { useConfig } from '../../context/ConfigContext';
import { useDialog } from '../../context/DialogContext';
import { useNavigate } from 'react-router-dom';

// --- MOCKS ---
jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/MailboxContext', () => ({ useMailbox: jest.fn() }));
jest.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn() }));
jest.mock('../../context/DialogContext', () => ({ useDialog: jest.fn() }));
jest.mock('react-router-dom', () => ({
	useNavigate: jest.fn(),
}));
jest.mock('firebase/functions', () => ({ httpsCallable: jest.fn() }));
import * as firebase from '../../config/data/firebase';
jest.mock('../../config/data/firebase', () => ({
	functions: {},
	saveCollectionData: jest.fn(),
	globalSearch: jest.fn(),
}));

// Mock child component to verify search results rendering logic
jest.mock('./SearchResultsDropdown', () => ({ results, loading }) => (
	<div data-testid='search-dropdown'>
		{loading ? 'Loading...' : 'Results Loaded'}
		{results?.error && <span data-testid='search-error'>{results.error}</span>}
	</div>
));

describe('Navbar Component', () => {
	const mockDispatch = jest.fn();
	const mockGlobalSearch = jest.fn();
	const mockNavigate = jest.fn();
	const mockShowDialog = jest.fn();

	// Default values
	const defaultMember = {
		id: 'mem123',
		permissions: {
			email: true,
			interviews: { canAccess: true },
		},
		picture: { home: 'my-face.jpg' },
		notifications: { email: true },
		callMe: 'Buddy',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useNavigate.mockReturnValue(mockNavigate);
		useTheme.mockReturnValue({ darkMode: false, dispatch: mockDispatch });
		useAuth.mockReturnValue({ user: { uid: '123' }, role: 'Member' });
		useMailbox.mockReturnValue({ member: defaultMember, unreadCount: 5 });
		useConfig.mockReturnValue({ DEFAULT_AVATAR: 'default.jpg' });
		useDialog.mockReturnValue({ showDialog: mockShowDialog });
		firebase.globalSearch.mockImplementation(mockGlobalSearch);
		mockGlobalSearch.mockResolvedValue({ data: { members: [] } });
	});

	describe('Rendering & Visuals', () => {
		it('renders user avatar when role is Member', () => {
			useAuth.mockReturnValue({ user: { uid: '123' }, role: 'Member' });
			render(<Navbar />);
			const avatar = screen.getByAltText('Profile');
			expect(avatar).toHaveAttribute('src', 'my-face.jpg');
		});

		it('renders default avatar when role is not Member/Both', () => {
			useAuth.mockReturnValue({ user: { uid: '123' }, role: 'Applicant' });
			render(<Navbar />);
			const avatar = screen.getByAltText('Profile');
			expect(avatar).toHaveAttribute('src', 'default.jpg');
		});

		it('toggles theme on click', () => {
			render(<Navbar />);
			// Theme toggle is usually the first icon
			const themeBtn = screen.getByTestId('DarkModeOutlinedIcon').closest('.item');
			fireEvent.click(themeBtn);
			expect(mockDispatch).toHaveBeenCalledWith({ type: 'TOGGLE' });
		});
	});

	describe('Permissions & Icons', () => {
		it('shows Unread badge when unreadCount > 0 and permission exists', () => {
			useMailbox.mockReturnValue({ member: defaultMember, unreadCount: 5 });
			render(<Navbar />);
			expect(screen.getByText('5')).toBeInTheDocument();
			expect(screen.getByTestId('MarkEmailUnreadIcon')).toBeInTheDocument();
		});

		it('shows Read icon when unreadCount is 0', () => {
			useMailbox.mockReturnValue({ member: defaultMember, unreadCount: 0 });
			render(<Navbar />);
			expect(screen.queryByText('5')).not.toBeInTheDocument();
			expect(screen.getByTestId('MarkEmailReadIcon')).toBeInTheDocument();
		});

		it('shows plain Email icon when email permission is missing', () => {
			const noEmailMember = { ...defaultMember, permissions: { email: false } };
			useMailbox.mockReturnValue({ member: noEmailMember });
			render(<Navbar />);
			expect(screen.getByTestId('EmailIcon')).toBeInTheDocument();
		});

		it('hides Meeting icon if no interview permission', () => {
			const noMeetingMember = { ...defaultMember, permissions: { interviews: { canAccess: false } } };
			useMailbox.mockReturnValue({ member: noMeetingMember });
			render(<Navbar />);
			expect(screen.queryByTestId('VoiceChatOutlinedIcon')).not.toBeInTheDocument();
		});
	});

	describe('Search Functionality', () => {
		it('shows error if search term is too short', async () => {
			render(<Navbar />);
			const input = screen.getByPlaceholderText('Search...');

			fireEvent.change(input, { target: { value: 'ab' } });

			const searchIcon = screen.getByTestId('SearchOutlinedIcon');
			await act(async () => {
				fireEvent.click(searchIcon);
			});

			expect(mockGlobalSearch).not.toHaveBeenCalled();
			expect(screen.getByTestId('search-error')).toHaveTextContent('3 characters');
		});

		it('performs search on Enter key', async () => {
			render(<Navbar />);
			const input = screen.getByPlaceholderText('Search...');

			fireEvent.change(input, { target: { value: 'valid search' } });

			await act(async () => {
				fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
			});

			expect(mockGlobalSearch).toHaveBeenCalledWith({ searchTerm: 'valid search' });
			expect(screen.getByTestId('search-dropdown')).toBeInTheDocument();
		});

		it('handles search API failure', async () => {
			mockGlobalSearch.mockRejectedValue(new Error('API Down'));
			// Spy on console error to suppress it in the test output
			const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

			render(<Navbar />);
			const input = screen.getByPlaceholderText('Search...');

			fireEvent.change(input, { target: { value: 'crash test' } });

			await act(async () => {
				fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
			});

			expect(screen.getByTestId('search-error')).toHaveTextContent('API Down');

			consoleSpy.mockRestore();
		});
	});

	describe('Navigation & Menu', () => {
		it('opens menu and navigates to profile', () => {
			render(<Navbar />);
			const avatar = screen.getByAltText('Profile');

			fireEvent.click(avatar);
			const profileItem = screen.getByText('Profile');

			fireEvent.click(profileItem);

			// FIX: Changed to exact match based on your logs '/members/view/123'
			// OR match partial URL which is safer
			expect(mockNavigate).toHaveBeenCalledWith(expect.stringMatching(/\/members\/view\/123/));
		});

		it('navigates to logout', () => {
			render(<Navbar />);
			const avatar = screen.getByAltText('Profile');
			fireEvent.click(avatar);

			const logoutItem = screen.getByText('Logout');
			fireEvent.click(logoutItem);

			expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('logout'));
		});

		it('opens preferences dialog', () => {
			render(<Navbar />);
			const avatar = screen.getByAltText('Profile');
			fireEvent.click(avatar);

			const prefsItem = screen.getByText('Preferences');
			fireEvent.click(prefsItem);

			expect(mockShowDialog).toHaveBeenCalledWith(
				expect.objectContaining({
					id: 'notificationsUpdate',
				})
			);
		});
	});
});
