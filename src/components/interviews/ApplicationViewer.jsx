/**
 * Application Viewer Drawer
 * A sliding side panel that displays a tabular view of applications.
 * Used within interviews or admin screens to reference application history
 * without navigating away from the current task.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Drawer, Box, Typography, IconButton, Divider, useTheme } from '@mui/material';
import { Close } from '@mui/icons-material';

// Components
import CollapsableTable from '../table/Table';

const drawerWidth = 1100;

export default function ApplicationViewer({ open, onClose, applications = [] }) {
	const theme = useTheme();

	// Semi-transparent background for focus
	const drawerBgColor = theme.palette.mode === 'dark' ? 'rgba(20, 20, 20, 0.9)' : 'rgba(250, 250, 250, 0.9)';

	return (
		<Drawer
			variant='persistent'
			anchor='right'
			open={open}
			sx={{
				width: drawerWidth,
				flexShrink: 0,
				'& .MuiDrawer-paper': {
					width: drawerWidth,
					boxSizing: 'border-box',
					backgroundColor: drawerBgColor,
					backdropFilter: 'blur(8px)',
				},
			}}>
			<Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
				{/* Header */}
				<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<Typography variant='h5'>Application File</Typography>
					<IconButton onClick={onClose}>
						<Close />
					</IconButton>
				</Box>
				<Divider sx={{ my: 2 }} />

				{/* Content Area */}
				<Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
					{applications.length > 0 ? (
						<CollapsableTable data={applications} attachments={true} />
					) : (
						<Typography align='center' color='text.secondary' sx={{ mt: 4 }}>
							No Applications on File...
						</Typography>
					)}
				</Box>
			</Box>
		</Drawer>
	);
}

ApplicationViewer.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	applications: PropTypes.array,
};