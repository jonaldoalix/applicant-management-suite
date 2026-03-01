import React from 'react';
import { render, screen } from '@testing-library/react';
import { Member } from './Member';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { getMemberActions } from '../../config/ui/buttonActions';
import { useAssetActionHandler } from '../../hooks/useAssetActionHandler';

// --- Mocks ---
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useNavigate: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
jest.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn() }));

jest.mock('../../config/ui/buttonActions', () => ({
	__esModule: true,
	getMemberActions: jest.fn(() => []),
}));

jest.mock('../../hooks/useAssetActionHandler', () => ({
	__esModule: true,
	useAssetActionHandler: jest.fn(),
}));

jest.mock('../../config/navigation/routeUtils', () => ({
	__esModule: true,
	generatePath: jest.fn(),
}));

jest.mock('../../config/navigation/paths', () => ({
	__esModule: true,
	paths: { editMember: 'edit' },
}));

jest.mock('../../config/ui/tableConfig', () => ({
	__esModule: true,
	UserLastLogin: () => <span>2 days ago</span>,
}));

jest.mock('../../config/ui/formConfig', () => ({
	__esModule: true,
	memberFormConfig: { fields: [] },
}));

// Mock Children
jest.mock('../layout/SingleAssetPage', () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
	AssetCard: ({ children }) => <div>{children}</div>,
}));

// FIXED: Header mock now accepts and renders 'children'
jest.mock('../assets/Header', () => ({ title, children }) => (
	<div>
		<h1>{title}</h1>
		{children}
	</div>
));

jest.mock('../assets/InfoTable', () => () => <div>InfoTable</div>);
jest.mock('../dynamicButtons/DynamicButtons', () => () => <div>DynamicButtons</div>);
jest.mock('../forms/PermissionGroup', () => () => <div>PermissionGroup</div>);
jest.mock('../notes/MyNotes', () => () => <div>MyNotes</div>);

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
