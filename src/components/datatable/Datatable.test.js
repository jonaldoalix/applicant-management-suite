import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import Datatable from './Datatable';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';

vi.mock('../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
vi.mock('../../context/DialogContext', () => ({ useDialog: jest.fn() }));
vi.mock('../../context/AlertContext', () => ({ useAlert: jest.fn() }));
vi.mock('../../context/ConfigContext', () => ({ useConfig: jest.fn() }));

const { calls } = vi.hoisted(() => ({ calls: [] }));

const selectionIdsFromModel = (model, rows = []) => {
	const map = new Map();
	if (!model) return map;
	if (Array.isArray(model)) {
		model.forEach((id) => map.set(id, {}));
		return map;
	}
	if (model.type === 'exclude') {
		rows.forEach((row) => {
			if (!model.ids?.has(row.id)) map.set(row.id, row);
		});
		return map;
	}
	model.ids?.forEach((id) => map.set(id, {}));
	return map;
};

vi.mock('@mui/x-data-grid', () => ({
	DataGrid: (props) => {
		if (props) calls.push(props);
		const Toolbar = props?.slots?.toolbar;
		return (
			<div role='grid' data-testid='mock-grid'>
				{Toolbar && <Toolbar {...(props.slotProps?.toolbar || {})} />}
			</div>
		);
	},
	GridToolbarQuickFilter: () => <div>Filter</div>,
	GridToolbarExport: () => <div>Export</div>,
	GridToolbarFilterButton: () => <div>FilterBtn</div>,
	GridToolbarContainer: ({ children }) => <div>{children}</div>,
	useGridApiContext: () => ({
		current: {
			getLocaleText: (key) => key,
		},
	}),
	useGridSelector: () => {
		const props = [...calls].reverse().find(Boolean) || {};
		return selectionIdsFromModel(props.rowSelectionModel, props.rows || []);
	},
	gridRowSelectionIdsSelector: (apiRef) => apiRef,
	useGridRootProps: () => ({
		slots: {
			baseIconButton: (props) => <button type='button' {...props} />,
			quickFilterIcon: () => null,
			quickFilterClearIcon: () => null,
		},
	}),
	QuickFilter: ({ children }) => <div data-testid='quick-filter'>{children}</div>,
	QuickFilterClear: ({ render }) => render || null,
	QuickFilterControl: (props) => <input aria-label={props['aria-label']} placeholder={props.placeholder} />,
}));

const mockUseTheme = useTheme;
const mockUseDialog = useDialog;
const mockUseAlert = useAlert;
const mockUseConfig = useConfig;

const mockRows = [
	{ id: '1', name: 'Jon', isRead: true },
	{ id: '2', name: 'Ada', isRead: false },
];
const mockColumns = [{ field: 'name', headerName: 'Name', width: 150 }];
const mockToggleAction = {
	id: 'toggleRead',
	label: 'Mark Read',
	labelAlt: 'Mark Unread',
	onClick: jest.fn(),
};
const mockBulkAction = {
	label: 'Bulk Evaluate',
	requiresSelection: true,
	onClick: jest.fn(),
};

const latestGridProps = () => [...calls].reverse().find(Boolean);

describe('Datatable', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		calls.length = 0;
		mockUseTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		mockUseDialog.mockReturnValue({ showDialog: jest.fn() });
		mockUseAlert.mockReturnValue({ showAlert: jest.fn(), handleError: jest.fn() });
		mockUseConfig.mockReturnValue({});
	});

	test('renders DataGrid with correct props', () => {
		render(<Datatable titleIn='Test' rows={mockRows} columns={mockColumns} loading={true} />);
		expect(screen.getByText('Test')).toBeInTheDocument();
		expect(screen.getByTestId('mock-grid')).toBeInTheDocument();
		expect(latestGridProps()).toEqual(
			expect.objectContaining({
				rows: mockRows,
				loading: true,
			})
		);
	});

	test('toolbar actions trigger correctly', async () => {
		render(<Datatable titleIn='Test' rows={mockRows} columns={mockColumns} toolbarActions={[mockToggleAction]} />);
		await act(async () => {
			latestGridProps().onRowSelectionModelChange({ type: 'include', ids: new Set(['1']) });
		});
		expect(screen.getByText('Mark Unread')).toBeInTheDocument();
		expect(screen.queryByText('Mark Read')).not.toBeInTheDocument();
	});

	test('enables requiresSelection toolbar actions after include selection', async () => {
		render(<Datatable titleIn='Test' rows={mockRows} columns={mockColumns} toolbarActions={[mockBulkAction]} />);
		expect(screen.getByRole('button', { name: 'Bulk Evaluate' })).toBeDisabled();
		await act(async () => {
			latestGridProps().onRowSelectionModelChange({ type: 'include', ids: new Set(['1']) });
		});
		expect(screen.getByRole('button', { name: 'Bulk Evaluate' })).not.toBeDisabled();
	});

	test('enables requiresSelection toolbar actions after exclude (select-all) selection', async () => {
		render(<Datatable titleIn='Test' rows={mockRows} columns={mockColumns} toolbarActions={[mockBulkAction]} />);
		await act(async () => {
			latestGridProps().onRowSelectionModelChange({ type: 'exclude', ids: new Set() });
		});
		expect(screen.getByRole('button', { name: 'Bulk Evaluate' })).not.toBeDisabled();
	});
});
