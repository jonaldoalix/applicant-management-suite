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
import PropTypes from 'prop-types';

// UI Components
import { DataGrid, GridToolbarQuickFilter, GridToolbarExport, GridToolbarFilterButton, GridToolbarContainer } from '@mui/x-data-grid';
import { Box, Typography, Select, MenuItem, Button, FormControl, InputLabel } from '@mui/material';
import { MarkEmailReadOutlined, MarkEmailUnreadOutlined } from '@mui/icons-material';

// Contexts
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';

// =============================================================================
//  CUSTOM TOOLBAR
// =============================================================================

const MemoizedCustomToolbar = React.memo(({ toolbarActions, selectionModel, allRows, permittedFolders, selectedFolderId, onFolderChange, permittedAliases, selectedAliasFilter, onAliasFilterChange }) => {
	// --- Contexts ---
	const { showDialog } = useDialog();
	const { showAlert, handleError } = useAlert();
	const config = useConfig();

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
		let newStatus, label, Icon;
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

	return (
		<GridToolbarContainer sx={{ margin: 1, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
			{/* Left Side: Search Bar */}
			<Box display='flex' flexDirection='row' gap={2} alignItems='center'>
				<GridToolbarQuickFilter sx={{ width: '200px' }} />
			</Box>

			{/* Right Side: Actions & Filters */}
			<Box display='flex' flexDirection='row' gap={1} flexWrap='wrap'>
				{/* Inbox Filter: Folders */}
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

				{/* Inbox Filter: Aliases */}
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

				{/* Dynamic Actions */}
				{toolbarActions.map((action) => {
					// Special Case: Toggle Read/Unread Smart Button
					if (action.id === 'toggleRead') {
						if (!smartButtonProps || selectionModel.length === 0) {
							// Disabled State (Nothing Selected)
							const DefaultIcon = action.icon || MarkEmailReadOutlined;
							return (
								<Button key={action.id} variant={action.variant || 'contained'} color={action.color || 'primary'} startIcon={<DefaultIcon />} disabled={true} size='small'>
									{action.label || 'Mark Read'}
								</Button>
							);
						}

						// Active State
						const { action: toggleAction, newStatus, label, Icon } = smartButtonProps;
						return (
							<Button key={toggleAction.id} variant={toggleAction.variant || 'contained'} color={toggleAction.color || 'primary'} startIcon={<Icon />} onClick={() => toggleAction.onClick(selectionModel, allRows, helpers, { newStatus })} disabled={toggleAction.disabled} size='small'>
								{label}
							</Button>
						);
					}

					// Standard Actions (Create, Delete, etc.)
					return action.hide ? null : (
						<Button key={action.label} variant={action.variant || 'contained'} color={action.color || 'primary'} startIcon={action.icon ? <action.icon /> : null} onClick={() => action.onClick(selectionModel, allRows, helpers)} disabled={action.disabled || (action.requiresSelection && selectionModel.length === 0)} size='small'>
							{action.label}
						</Button>
					);
				})}

				{/* Standard DataGrid Tools */}
				<GridToolbarFilterButton />
				<GridToolbarExport />
			</Box>
		</GridToolbarContainer>
	);
});

MemoizedCustomToolbar.displayName = 'CustomToolbar';

MemoizedCustomToolbar.propTypes = {
	toolbarActions: PropTypes.arrayOf(PropTypes.object).isRequired,
	selectionModel: PropTypes.arrayOf(PropTypes.any).isRequired,
	allRows: PropTypes.arrayOf(PropTypes.object).isRequired,
	permittedFolders: PropTypes.array,
	selectedFolderId: PropTypes.string,
	onFolderChange: PropTypes.func,
	permittedAliases: PropTypes.array,
	selectedAliasFilter: PropTypes.string,
	onAliasFilterChange: PropTypes.func,
};

// =============================================================================
//  MAIN COMPONENT
// =============================================================================

const Datatable = ({ titleIn, rows, columns, actions, toolbarActions = [], permittedFolders, selectedFolderId, onFolderChange, permittedAliases, selectedAliasFilter, onAliasFilterChange, loading = false }) => {
	// --- State & Context ---
	const title = titleIn || 'No Title';
	const data = rows || [];
	const [selectedData, setSelectedData] = useState([]);
	const actionColumn = actions || []; // Row-level actions (Edit/Delete buttons)
	const { darkMode, boxShadow } = useTheme();

	return (
		<Box className='datatable' width='100%' display='flex' flexDirection='column' alignItems='stretch' sx={{ height: `calc(100vh - 100px)` }}>
			{/* Title Header */}
			<Box borderRadius='12px' boxShadow={boxShadow} bgcolor={darkMode ? 'background.main' : 'white'} display='flex' alignItems='center' justifyContent='left' padding={1} paddingX={2} marginBottom={2}>
				<Typography fontSize='24px' color={darkMode ? 'primary.main' : 'highlight.main'}>
					{title}
				</Typography>
			</Box>

			{/* The Grid */}
			<DataGrid
				rows={data}
				columns={columns.concat(actionColumn)} // Append Edit/Delete buttons
				slots={{
					toolbar: MemoizedCustomToolbar,
				}}
				slotProps={{
					toolbar: {
						toolbarActions: toolbarActions,
						selectionModel: selectedData,
						allRows: rows,
						// Pass Inbox Props down to toolbar
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
							pageSize: 15,
						},
					},
				}}
				pageSizeOptions={[15, 50, 100]}
				checkboxSelection
				disableRowSelectionOnClick
				onRowSelectionModelChange={(newRowSelectionModel) => {
					setSelectedData(newRowSelectionModel);
				}}
				loading={loading}
				rowSelectionModel={selectedData}
				// Dynamic Row Styling (for Read/Unread emails)
				getRowClassName={(params) => {
					const prefix = params.row.isRead === false ? 'unread-row' : 'read-row';
					const suffix = darkMode ? 'dark' : 'light';
					return `${prefix}-${suffix}`;
				}}
				rowHeight={75}
				getRowId={(row) => row.id}
				sx={{
					padding: 1,
					borderColor: 'background.main',
					boxShadow: boxShadow,
					backgroundColor: darkMode ? 'background.main' : 'white',
					borderRadius: '12px',
					'& .MuiDataGrid-cell': {
						py: '5px',
					},
				}}
			/>
		</Box>
	);
};

Datatable.propTypes = {
	rows: PropTypes.array,
	columns: PropTypes.array.isRequired,
	titleIn: PropTypes.string,
	actions: PropTypes.array,
	toolbarActions: PropTypes.array,
	// Inbox Specific Props
	permittedFolders: PropTypes.array,
	selectedFolderId: PropTypes.string,
	onFolderChange: PropTypes.func,
	permittedAliases: PropTypes.array,
	selectedAliasFilter: PropTypes.string,
	onAliasFilterChange: PropTypes.func,
	loading: PropTypes.bool,
};

export default Datatable;