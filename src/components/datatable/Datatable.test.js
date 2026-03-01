import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Datatable from './Datatable';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';

jest.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../context/DialogContext', () => ({ useDialog: jest.fn() }));
jest.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
jest.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn() }));

// Simple mock to capture props and provide a trigger
let lastGridProps = {};
jest.mock('@mui/x-data-grid', () => ({
	...jest.requireActual('@mui/x-data-grid'),
	DataGrid: (props) => {
		lastGridProps = props;
		// Render toolbar manually if provided to test it
		const Toolbar = props.slots?.toolbar;
		return (
			<div role='grid' data-testid='mock-grid'>
				{Toolbar && <Toolbar {...props.slotProps?.toolbar} />}
			</div>
		);
	},
	GridToolbarQuickFilter: () => <div>Filter</div>,
	GridToolbarExport: () => <div>Export</div>,
	GridToolbarFilterButton: () => <div>FilterBtn</div>,
	GridToolbarContainer: ({ children }) => <div>{children}</div>,
}));

const mockUseTheme = useTheme;
const mockUseDialog = useDialog;
const mockUseAlert = useAlert;
const mockUseConfig = useConfig;

const mockRows = [{ id: '1', name: 'Jon', isRead: true }];
const mockColumns = [{ field: 'name', headerName: 'Name', width: 150 }];
const mockToggleAction = {
	id: 'toggleRead',
	label: 'Mark Read',
	labelAlt: 'Mark Unread', // Added this for clarity, though the component defaults
	onClick: jest.fn(),
};

describe('Datatable', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		lastGridProps = {};
		mockUseTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		mockUseDialog.mockReturnValue({ showDialog: jest.fn() });
		mockUseAlert.mockReturnValue({ showAlert: jest.fn(), handleError: jest.fn() });
		mockUseConfig.mockReturnValue({});
	});

	test('renders DataGrid with correct props', () => {
		render(<Datatable titleIn='Test' rows={mockRows} columns={mockColumns} loading={true} />);
		expect(screen.getByText('Test')).toBeInTheDocument();
		expect(screen.getByRole('grid')).toBeInTheDocument();
		expect(lastGridProps.rows).toEqual(mockRows);
		expect(lastGridProps.loading).toBe(true);
	});

	test('toolbar actions trigger correctly', async () => {
		render(<Datatable titleIn='Test' rows={mockRows} columns={mockColumns} toolbarActions={[mockToggleAction]} />);

		// Simulate selection via the captured prop
		await act(async () => {
			lastGridProps.onRowSelectionModelChange(['1']);
		});

		// --- THIS IS THE FIX ---
		// The component logic correctly changes the label to "Mark Unread"
		// because the selected row has isRead: true.
		const btn = screen.getByText('Mark Unread');

		expect(btn).toBeInTheDocument();

		// We can also check that the "Mark Read" label is gone
		expect(screen.queryByText('Mark Read')).not.toBeInTheDocument();
	});
});
