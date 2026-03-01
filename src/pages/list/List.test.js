import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import List from './List';
import { useMediaQuery } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useMailbox } from '../../context/MailboxContext';
import { useAlert } from '../../context/AlertContext';
import { useRealTimeList } from '../../hooks/useRealTimeList';
import { getRoomDetails } from '../../config/data/firebase';

// --- Mocks ---

// 1. React Router
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}));

// 2. Material UI & Theme
jest.mock('@mui/material', () => {
	const actual = jest.requireActual('@mui/material');
	return {
		...actual,
		useMediaQuery: jest.fn(),
		useTheme: () => ({
			breakpoints: { down: jest.fn() },
		}),
	};
});

// 3. Config
jest.mock('../../config/admin/lists', () => ({
	adminLists: {
		users: {
			title: 'Users List',
			columns: [{ field: 'id', headerName: 'ID' }],
			actions: [],
		},
		interviews: {
			title: 'Interviews',
			columns: [{ field: 'id' }],
			getToolbarActions: jest.fn(() => [{ label: 'Action' }]),
		},
		inbox: {
			title: 'Inbox',
			columns: [
				{ field: 'senderSubject', headerName: 'Subject' },
				{ field: 'tags', headerName: 'Tags' },
			],
		},
		legacyFinances: {
			title: (year) => `Finances ${year}`,
			columns: [],
		},
	},
	mobileCardConfig: {
		users: {
			content: ({ item }) => <div>Mobile Content: {item.id}</div>,
			actions: [],
		},
	},
}));

// 4. Firebase
jest.mock('../../config/data/firebase', () => ({
	getRoomDetails: jest.fn(),
}));

// 5. Contexts & Hooks
jest.mock('../../context/HelmetContext', () => ({
	useTitle: jest.fn(),
}));

jest.mock('../../context/AuthContext', () => ({
	useAuth: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

jest.mock('../../context/MailboxContext', () => ({
	useMailbox: jest.fn(),
}));

jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

jest.mock('../../hooks/useRealTimeList', () => ({
	useRealTimeList: jest.fn(),
}));

// 6. Child Components
jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loading...</div>);
jest.mock('../../components/datatable/Datatable', () => (props) => (
	<div data-testid='datatable'>
		<h1>{props.titleIn}</h1>
		<div>Rows: {props.rows?.length}</div>
	</div>
));
jest.mock('../../components/list/MobileListCard', () => ({ children }) => <div data-testid='mobile-card'>{children}</div>);
jest.mock('../../components/list/LegacyFinancesTable', () => (props) => <div data-testid='legacy-table'>{props.titleIn}</div>);

describe('List Page Component', () => {
	const mockHandleError = jest.fn();
	const mockSetSelectedFolderId = jest.fn();
	const mockSetSelectedAliasFilter = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();

		// Default Context Values
		useAuth.mockReturnValue({ member: { role: 'admin' } });
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		useAlert.mockReturnValue({ handleError: mockHandleError });

		// Default Hook Values
		useRealTimeList.mockReturnValue({
			data: [{ id: '1' }, { id: '2' }],
			loading: false,
			year: 2025,
		});

		useMailbox.mockReturnValue({
			emails: [],
			loading: false,
			permittedFolders: [],
			permittedAliases: [],
			selectedFolderId: 'inbox',
			setSelectedFolderId: mockSetSelectedFolderId,
			selectedAliasFilter: 'all',
			setSelectedAliasFilter: mockSetSelectedAliasFilter,
		});

		// Default: Desktop view
		useMediaQuery.mockReturnValue(false);
	});

	test('renders loader when loading', () => {
		useRealTimeList.mockReturnValue({ data: [], loading: true });
		render(<List type='users' />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('renders Datatable on desktop', () => {
		render(<List type='users' />);

		expect(screen.getByTestId('datatable')).toBeInTheDocument();
		expect(screen.getByText('Users List')).toBeInTheDocument();
		expect(screen.getByText('Rows: 2')).toBeInTheDocument();
		expect(screen.queryByTestId('mobile-card')).not.toBeInTheDocument();
	});

	test('renders MobileListCards on small screens', () => {
		useMediaQuery.mockReturnValue(true); // Simulate Mobile

		render(<List type='users' />);

		expect(screen.queryByTestId('datatable')).not.toBeInTheDocument();
		const cards = screen.getAllByTestId('mobile-card');
		expect(cards).toHaveLength(2);
		expect(screen.getByText('Mobile Content: 1')).toBeInTheDocument();
	});

	test('renders LegacyFinancesTable when type is legacyFinances', () => {
		render(<List type='legacyFinances' />);

		expect(screen.getByTestId('legacy-table')).toBeInTheDocument();
		expect(screen.getByText('Finances 2025')).toBeInTheDocument();
	});

	test('handles Inbox logic: uses useMailbox data', () => {
		useMailbox.mockReturnValue({
			emails: [{ id: 'e1', subject: 'Hello' }],
			loading: false,
			selectedFolderId: 'inbox',
		});

		render(<List type='inbox' />);

		expect(screen.getByTestId('datatable')).toBeInTheDocument();
		expect(screen.getByText('Rows: 1')).toBeInTheDocument();

		expect(useRealTimeList).toHaveBeenCalledWith('inbox', false);
	});

	test('handles Inbox logic: filters by alias', () => {
		const emails = [
			{ id: 'e1', tags: ['alias1'] },
			{ id: 'e2', tags: ['alias2'] },
		];

		useMailbox.mockReturnValue({
			emails,
			loading: false,
			selectedAliasFilter: 'alias1',
		});

		render(<List type='inbox' />);

		expect(screen.getByText('Rows: 1')).toBeInTheDocument();
	});

	test('checks for deliberation room existence when type is interviews', async () => {
		getRoomDetails.mockResolvedValue({ data: { success: true } });

		render(<List type='interviews' />);

		await waitFor(() => {
			expect(getRoomDetails).toHaveBeenCalledWith({ roomName: 'deliberation-room' });
		});
	});

	test('handles deliberation room check failure gracefully', async () => {
		const error = new Error('Network error');
		getRoomDetails.mockRejectedValue(error);

		render(<List type='interviews' />);

		await waitFor(() => {
			expect(mockHandleError).toHaveBeenCalledWith(error, 'list-checkDelibRoomUE');
		});
	});

	test('displays error for invalid list type', () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

		render(<List type='invalidType' />);

		expect(screen.getByText(/Error: Invalid list type specified/i)).toBeInTheDocument();

		consoleSpy.mockRestore();
	});
});
