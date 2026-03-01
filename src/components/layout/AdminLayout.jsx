/**
 * Admin Layout
 * The main wrapper for all administrative pages.
 * Features:
 * - Collapsible Sidebar (controlled via context).
 * - Fixed Top Navbar.
 * - Scrollable Content Area with visual depth (inset shadow).
 * - Responsive transitions.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';

// Context
import { useSidebar, SidebarProvider } from '../../context/SidebarContext';
import { useTheme } from '../../context/ThemeContext';

// Components
import Sidebar from '../sidebar/Sidebar';
import Navbar from '../navbar/Navbar';

// Sub-component to consume Context
const MainContent = ({ children }) => {
	const { collapsed } = useSidebar();
	const { boxShadow } = useTheme();

	// Sidebar dimensions matching the Sidebar component
	const sidebarWidth = collapsed ? 45 : 180;

	return (
		<Box
			sx={{
				marginLeft: `${sidebarWidth}px`,
				width: `calc(100% - ${sidebarWidth}px)`,
				height: '100%',
				transition: 'margin-left 0.3s, width 0.3s',
				display: 'flex',
				flexDirection: 'column',
				bgcolor: 'background.paper',
			}}>
			{/* Top Navigation Bar */}
			<Box
				sx={{
					height: `50px`,
					bgcolor: 'background.paper',
					width: '100%',
					flexShrink: 0,
					zIndex: 1000,
				}}>
				<Navbar />
			</Box>

			{/* Main Scrollable Content Area */}
			<Box
				sx={{
					paddingY: 2,
					paddingX: 4,
					overflowY: 'auto',
					overflowX: 'hidden',
					flexGrow: 1,
					bgcolor: 'highlight.main',
					borderTopLeftRadius: '12px',
					boxShadow: `inset ${boxShadow}`, // Inner shadow for depth
				}}>
				{children}
			</Box>
		</Box>
	);
};

MainContent.propTypes = {
	children: PropTypes.node.isRequired,
};

// Main Layout Wrapper
const AdminLayout = ({ children }) => {
	return (
		<SidebarProvider>
			<Box display='flex' sx={{ height: '100vh', bgcolor: 'background.paper' }}>
				<Sidebar />
				<Box
					sx={{
						flexGrow: 1,
						height: '100%',
						bgcolor: 'background.paper',
						display: 'flex',
						flexDirection: 'column',
					}}>
					<MainContent>{children}</MainContent>
				</Box>
			</Box>
		</SidebarProvider>
	);
};

AdminLayout.propTypes = {
	children: PropTypes.node.isRequired,
};

export default AdminLayout;