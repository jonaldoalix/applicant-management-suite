import React from 'react';
import { render, screen } from '@testing-library/react';
import { Member } from './Member';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { getMemberActions } from '../../config/ui/buttonActions';
import { useAssetActionHandler } from '../../hooks/useAssetActionHandler';

// --- Mocks ---
vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: jest.fn(),
}));

vi.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
vi.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
vi.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn() }));

vi.mock('../../config/ui/buttonActions', () => ({
	__esModule: true,
	getMemberActions: jest.fn(() => []),
}));

vi.mock('../../hooks/useAssetActionHandler', () => ({
	__esModule: true,
	useAssetActionHandler: jest.fn(),
}));

vi.mock('../../config/navigation/routeUtils', () => ({
	__esModule: true,
	generatePath: jest.fn(),
}));

vi.mock('../../config/navigation/paths', () => ({
	__esModule: true,
	paths: { editMember: 'edit' },
}));

vi.mock('../../config/ui/tableConfig', () => ({
	__esModule: true,
	UserLastLogin: () => <span>2 days ago</span>,
}));

vi.mock('../../config/ui/formConfig', () => ({
	__esModule: true,
	memberFormConfig: { fields: [] },
}));

// Mock Children
vi.mock('../layout/SingleAssetPage', () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
	AssetCard: ({ children }) => <div>{children}</div>,
}));

// FIXED: Header mock now accepts and renders 'children'
vi.mock('../assets/Header', () => ({ default: ({ title, children }) => (
	<div>
		<h1>{title}</h1>
		{children}
	</div>
) }));

vi.mock('../assets/InfoTable', () => ({ default: () => <div>InfoTable</div> }));
vi.mock('../dynamicButtons/DynamicButtons', () => ({ default: () => <div>DynamicButtons</div> }));
vi.mock('../forms/PermissionGroup', () => ({ default: () => <div>PermissionGroup</div> }));
vi.mock('../notes/MyNotes', () => ({ default: () => <div>MyNotes</div> }));

describe('Member Card', () => {
	const mockMember = {
		id: 'mem123',
		firstName: 'Alice',
		lastName: 'Admin',
		email: 'alice@example.com',
		permissions: {},
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false });
		useAlert.mockReturnValue({ showAlert: jest.fn(), handleError: jest.fn() });
		useConfig.mockReturnValue({});
	});

	test('renders member name and info', () => {
		render(<Member member={mockMember} />);
		expect(screen.getByText('Alice')).toBeInTheDocument();
		// Now accessible because Header renders children
		expect(screen.getByText('InfoTable')).toBeInTheDocument();
		expect(screen.getByText('2 days ago')).toBeInTheDocument(); // Last login
	});

	test('renders permissions group', () => {
		render(<Member member={mockMember} />);
		expect(screen.getByText('PermissionGroup')).toBeInTheDocument();
	});

	test('renders function buttons', () => {
		render(<Member member={mockMember} />);
		expect(screen.getByText('Functions')).toBeInTheDocument();
		expect(screen.getByText('DynamicButtons')).toBeInTheDocument();
	});
});
