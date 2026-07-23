/**
 * UNIVERSAL DATATABLE COMPONENT
 * ---------------------------------------------------------------------------
 * A wrapper around MUI DataGrid that provides standard styling, custom toolbars,
 * and specific logic for the Admin Dashboard (e.g., Inbox filtering).
 *
 * * FEATURES:
 * 1. Smart Toolbar: Dynamically updates buttons based on selection state
 * (e.g., toggles "Mark Read" to "Mark Unread").
 * 2. Inbox Integration: Renders Folder and Alias dropdowns if props are provided.
 * 3. Row Styling: Applies specific classes for 'read/unread' status in dark/light modes.
 */

import './datatable.scss';
import React, { useState, useMemo } from 'react';

// UI Components
import { DataGrid, GridToolbarExport, GridToolbarFilterButton, GridToolbarContainer, type GridColDef, type GridRowSelectionModel, type GridRowId, useGridApiContext, useGridSelector, gridRowSelectionIdsSelector } from '@mui/x-data-grid';
import { Box, Typography, Select, MenuItem, Button, FormControl, InputLabel, type SelectChangeEvent, type ButtonProps } from '@mui/material';
import { MarkEmailReadOutlined, MarkEmailUnreadOutlined } from '@mui/icons-material';
import DatatableQuickFilter from './DatatableQuickFilter';
import DatatableEmptyOverlay from './DatatableEmptyOverlay';

// Contexts
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { createEmptyRowSelectionModel } from '../../utils/gridRowSelectionModel';
import { adminPageHeaderSx, adminPageTitleSx, datatableContainerSx, datatableGridShellSx, datatableGridSx, getAdminPageTitleColor } from '../../config/ui/adminPageStyles';

// =============================================================================
//  TYPES
// =============================================================================

export interface ToolbarAction {
	id?: string;
	label?: string;
	labelAlt?: string;
	icon?: React.ElementType;
	iconAlt?: React.ElementType;
	variant?: 'contained' | 'outlined' | 'text';
	/** MUI Button color; kept as string so config-driven actions (tableConfig) stay compatible. */
	color?: string;
	onClick: (selectedRowIds: GridRowId[], allRows: DataRow[], helpers: Record<string, unknown>, extra?: Record<string, unknown>) => void;
	disabled?: boolean;
	requiresSelection?: boolean;
	hide?: boolean;
}

/** Narrows a config-provided color string to the MUI Button palette union. */
const toButtonColor = (color?: string): ButtonProps['color'] => (color as ButtonProps['color']) || 'primary';

export interface DataRow {
	id: string;
	isRead?: boolean;
	[key: string]: unknown;
}

interface CustomToolbarProps {
	toolbarActions: ToolbarAction[];
	allRows: DataRow[];
	permittedFolders?: string[];
	selectedFolderId?: string;
	onFolderChange?: (event: SelectChangeEvent) => void;
	permittedAliases?: string[];
	selectedAliasFilter?: string;
	onAliasFilterChange?: (event: SelectChangeEvent) => void;
}

declare module '@mui/x-data-grid' {
	interface ToolbarPropsOverrides extends CustomToolbarProps {}
}

// =============================================================================
//  CUSTOM TOOLBAR
// =============================================================================

const CustomToolbar = ({ toolbarActions, allRows, permittedFolders, selectedFolderId, onFolderChange, permittedAliases, selectedAliasFilter, onAliasFilterChange }: CustomToolbarProps) => {
	// --- Contexts ---
	const { showDialog } = useDialog();
	const { showAlert, handleError } = useAlert();
	const config = useConfig();
	// Read selection from the grid store so toolbar enables immediately (include + exclude).
	const apiRef = useGridApiContext();
	const selectedRowsMap = useGridSelector(apiRef, gridRowSelectionIdsSelector);
	const selectionModel = useMemo(() => Array.from(selectedRowsMap.keys()) as GridRowId[], [selectedRowsMap]);

	// Helper bundle passed to action handlers
	const helpers = { showDialog, showAlert, handleError, config };

	// --- Smart Button Logic ---
	// Calculates whether the "Toggle Read" button should show "Mark Read" or "Mark Unread"
	// based on the current selection state.
	const smartButtonProps = useMemo(() => {
		const toggleReadAction = toolbarActions.find((action) => action.id === 'toggleRead');

		// If no toggle action exists or nothing selected, return null
		if (!toggleReadAction || selectionModel.length === 0) return null;

		// Find the actual row objects for the selected IDs
		const selectedRows = allRows.filter((row) => selectionModel.includes(row.id));

		// Count how many are already read
		const readCount = selectedRows.filter((row) => row.isRead === true).length;
		const unreadCount = selectedRows.length - readCount;

		// Decision Logic: If mostly read, offer to mark unread. Otherwise, mark read.
		let newStatus: string, label: string, Icon: React.ElementType;
		if (readCount > unreadCount) {
			newStatus = 'unread';
			label = toggleReadAction.labelAlt || 'Mark Unread';
			Icon = toggleReadAction.iconAlt ? toggleReadAction.iconAlt : MarkEmailUnreadOutlined;
		} else {
			newStatus = 'read';
			label = toggleReadAction.label || 'Mark Read';
			Icon = toggleReadAction.icon ? toggleReadAction.icon : MarkEmailReadOutlined;
		}

		return { action: toggleReadAction, newStatus, label, Icon };
	}, [toolbarActions, selectionModel, allRows]);

	const hasInboxFilters = (permittedFolders && permittedFolders.length > 1) || (permittedAliases && permittedAliases.length > 0);
	const hasVisibleActions = toolbarActions.some((action) => !action.hide);
	const showActionRow = hasInboxFilters || hasVisibleActions;

	return (
		<GridToolbarContainer
			sx={{
				justifyContent: 'flex-start',
				alignItems: 'stretch',
				flexDirection: 'column',
				width: '100%',
				flexWrap: 'nowrap',
				rowGap: 1,
				columnGap: 0,
			}}>
			{/* Top row: Search + Filters/Export (keeps search from fighting primary actions) */}
			<Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
				<Box sx={{ minWidth: 220, flex: '1 1 320px', maxWidth: { xs: '100%', md: 460 } }}>
					<DatatableQuickFilter />
				</Box>
				<Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, flexWrap: 'nowrap', justifyContent: 'flex-end', alignItems: 'center', flex: '0 0 auto' }}>
					<GridToolbarFilterButton />
					<GridToolbarExport />
				</Box>
			</Box>

			{/* Bottom row: Inbox filters + primary actions (all controls stay available) */}
			{showActionRow && (
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'row',
						gap: 1,
						flexWrap: 'wrap',
						alignItems: 'center',
						justifyContent: 'flex-start',
						width: '100%',
						minWidth: 0,
						'& .MuiButton-root': { whiteSpace: 'nowrap', flexShrink: 0 },
					}}>
					{permittedFolders && permittedFolders.length > 1 && (
						<FormControl size='small' sx={{ minWidth: 125 }}>
							<InputLabel>Folder</InputLabel>
							<Select value={selectedFolderId} label='Folder' onChange={onFolderChange}>
								{permittedFolders.map((folder) => (
									<MenuItem key={folder} value={folder}>
										{folder.charAt(0).toUpperCase() + folder.slice(1)}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}

					{permittedAliases && permittedAliases.length > 0 && (
						<FormControl size='small' sx={{ minWidth: 125 }}>
							<InputLabel>Filter by Alias</InputLabel>
							<Select value={selectedAliasFilter} label='Filter by Alias' onChange={onAliasFilterChange}>
								<MenuItem value='all'>All Aliases</MenuItem>
								{permittedAliases.map((alias) => (
									<MenuItem key={alias} value={alias}>
										{alias.charAt(0).toUpperCase() + alias.slice(1)}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					)}

					{toolbarActions.map((action) => {
						if (action.id === 'toggleRead') {
							if (!smartButtonProps || selectionModel.length === 0) {
								const DefaultIcon = action.icon || MarkEmailReadOutlined;
								return (
									<Button key={action.id} variant={action.variant || 'contained'} color={toButtonColor(action.color)} startIcon={<DefaultIcon />} disabled={true} size='small'>
										{action.label || 'Mark Read'}
									</Button>
								);
							}

							const { action: toggleAction, newStatus, label, Icon } = smartButtonProps;
							return (
								<Button key={toggleAction.id} variant={toggleAction.variant || 'contained'} color={toButtonColor(toggleAction.color)} startIcon={<Icon />} onClick={() => toggleAction.onClick(selectionModel, allRows, helpers, { newStatus })} disabled={toggleAction.disabled} size='small'>
									{label}
								</Button>
							);
						}

						return action.hide ? null : (
							<Button key={action.label} variant={action.variant || 'contained'} color={toButtonColor(action.color)} startIcon={action.icon ? <action.icon /> : null} onClick={() => action.onClick(selectionModel, allRows, helpers)} disabled={action.disabled || (action.requiresSelection && selectionModel.length === 0)} size='small'>
								{action.label}
							</Button>
						);
					})}
				</Box>
			)}
		</GridToolbarContainer>
	);
};

CustomToolbar.displayName = 'CustomToolbar';

// =============================================================================
//  MAIN COMPONENT
// =============================================================================

interface DatatableProps {
	titleIn?: string;
	rows?: DataRow[];
	columns: GridColDef[];
	actions?: GridColDef[];
	toolbarActions?: ToolbarAction[];
	// Inbox Specific Props
	permittedFolders?: string[];
	selectedFolderId?: string;
	onFolderChange?: (event: SelectChangeEvent) => void;
	permittedAliases?: string[];
	selectedAliasFilter?: string;
	onAliasFilterChange?: (event: SelectChangeEvent) => void;
	loading?: boolean;
}

const Datatable = ({ titleIn, rows, columns, actions, toolbarActions = [], permittedFolders, selectedFolderId, onFolderChange, permittedAliases, selectedAliasFilter, onAliasFilterChange, loading = false }: DatatableProps) => {
	// --- State & Context ---
	const title = titleIn || 'No Title';
	const data = rows || [];
	const [selectedData, setSelectedData] = useState<GridRowSelectionModel>(() => createEmptyRowSelectionModel() as GridRowSelectionModel);
	const actionColumn = actions || []; // Row-level actions (Edit/Delete buttons)
	const { darkMode, boxShadow } = useTheme();

	const handleRowSelectionModelChange = React.useCallback((model: GridRowSelectionModel) => {
		// Clone so controlled state always gets a new reference (Set mutations must not be missed).
		setSelectedData({
			type: model.type,
			ids: new Set(model.ids),
		} as GridRowSelectionModel);
	}, []);

	return (
		<Box className='datatable' sx={datatableContainerSx}>
			<Box sx={{ ...adminPageHeaderSx(boxShadow), mb: { xs: 2, md: 1.5 }, flexShrink: 0 }}>
				<Typography color={getAdminPageTitleColor(darkMode)} sx={adminPageTitleSx}>
					{title}
				</Typography>
			</Box>

			<Box sx={datatableGridShellSx(boxShadow)}>
				<DataGrid
					rows={data}
					columns={columns.concat(actionColumn)}
					slots={{
						toolbar: CustomToolbar,
						noRowsOverlay: DatatableEmptyOverlay,
					}}
					slotProps={{
						toolbar: {
							toolbarActions: toolbarActions,
							allRows: data,
							permittedFolders,
							selectedFolderId,
							onFolderChange,
							permittedAliases,
							selectedAliasFilter,
							onAliasFilterChange,
						},
					}}
					initialState={{
						pagination: {
							paginationModel: {
								pageSize: 25,
							},
						},
						sorting: {
							sortModel: columns.some((col) => col.field === 'lastUpdated')
								? [{ field: 'lastUpdated', sort: 'desc' }]
								: [],
						},
					}}
					showToolbar
					pagination
					pageSizeOptions={[15, 25, 50, 100]}
					checkboxSelection
					disableRowSelectionOnClick
					onRowSelectionModelChange={handleRowSelectionModelChange}
					loading={loading}
					rowSelectionModel={selectedData}
					getRowClassName={(params) => {
						const prefix = params.row.isRead === false ? 'unread-row' : 'read-row';
						const suffix = darkMode ? 'dark' : 'light';
						return `${prefix}-${suffix}`;
					}}
					rowHeight={56}
					getRowHeight={() => 56}
					columnHeaderHeight={48}
					getRowId={(row) => row.id}
					sx={datatableGridSx}
				/>
			</Box>
		</Box>
	);
};

export default Datatable;