/**
 * Sidebar Navigation
 * The primary side navigation menu for the Admin Dashboard.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, Box, List, Typography, ListItemIcon, ListItemText, ListItemButton, Menu } from '@mui/material';
import { MenuOpen, Menu as MenuIcon, LightMode, DarkMode } from '@mui/icons-material';

// Context
import { useTheme } from '../../context/ThemeContext';
import { useSidebar } from '../../context/SidebarContext';

// Config
import { useSidebarMenu } from '../../config/navigation/sidebarConfig';
import { Assets } from '../../config/Constants';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { colors } from '../../config/ui/theme';

// --- Constants & Helpers ---

const availableColors = [
	{ id: 'green', label: 'Green', color: colors.green },
	{ id: 'blue', label: 'Blue', color: colors.blue },
	{ id: 'brown', label: 'Brown', color: colors.brown },
	{ id: 'red', label: 'Red', color: colors.red },
	{ id: 'yellow', label: 'Yellow', color: colors.yellow },
];

const getLogo = (collapsed, darkMode) => {
	if (collapsed) {
		return Assets.logo;
	}
	return darkMode ? Assets.logoDM : Assets.logoLM;
};

// --- Sub-Components ---

const SidebarItem = ({ page, collapsed, isActive }) => {
	const linkTo = page.disable ? '#' : page.link;

	return (
		<Link to={linkTo} style={{ textDecoration: 'none' }}>
			<Tooltip title={collapsed ? page.text : ''} placement='right' enterDelay={400} leaveDelay={100}>
				<ListItemButton
					disabled={page.disable}
					selected={isActive}
					sx={{
						bgcolor: isActive ? 'action.selected' : 'transparent',
						borderRadius: '4px',
						justifyContent: collapsed ? 'center' : 'flex-start',
						paddingX: collapsed ? 0 : '16px',
					}}>
					<ListItemIcon sx={{ minWidth: 'unset', mr: collapsed ? 0 : 1 }}>{page.icon}</ListItemIcon>
					{!collapsed && <ListItemText secondary={page.text} sx={{ transition: 'opacity 0.2s', opacity: 1 }} />}
				</ListItemButton>
			</Tooltip>
		</Link>
	);
};

SidebarItem.propTypes = {
	page: PropTypes.object.isRequired,
	collapsed: PropTypes.bool.isRequired,
	isActive: PropTypes.bool.isRequired,
};

// --- Main Component ---

const Sidebar = () => {
	const { darkMode, primaryColor, dispatch } = useTheme();
	const { collapsed, setCollapsed } = useSidebar();
	const sidebarMenu = useSidebarMenu();
	const location = useLocation();

	// Menu State for Color Picker
	const [colorMenuAnchor, setColorMenuAnchor] = useState(null);
	const isMenuOpen = Boolean(colorMenuAnchor);

	const handleColorClick = (event) => {
		setColorMenuAnchor(event.currentTarget);
	};

	const handleColorClose = () => {
		setColorMenuAnchor(null);
	};

	const handleColorSelect = (colorKey) => {
		dispatch({ type: 'SET_COLOR', payload: colorKey });
		handleColorClose();
	};

	// Bottom Action Buttons Configuration
	const mainControls = [
		{
			id: 'theme',
			tip: 'Change Theme Color',
			content: <Box width='20px' height='20px' borderRadius='5px' bgcolor={colors[primaryColor] || colors.green} sx={{ border: '1px solid', borderColor: 'text.primary' }} />,
			action: handleColorClick,
		},
		{
			id: 'mode',
			tip: darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
			content: darkMode ? <LightMode fontSize='small' /> : <DarkMode fontSize='small' />,
			action: () => dispatch({ type: 'TOGGLE' }),
		},
		{
			id: 'toggle',
			tip: collapsed ? 'Expand Sidebar' : 'Collapse Sidebar',
			content: collapsed ? <MenuIcon fontSize='small' /> : <MenuOpen fontSize='small' />,
			action: () => setCollapsed(!collapsed),
		},
	];

	return (
		<Box
			position='fixed'
			top={0}
			left={0}
			height='100vh'
			width={collapsed ? '45px' : '180px'}
			bgcolor='background.paper'
			sx={{
				transition: 'width 0.3s ease-in-out',
				display: 'flex',
				flexDirection: 'column',
				borderRight: '1px solid',
				borderColor: 'background.paper', // Maintained original invisible border
			}}>
			{/* Logo Area */}
			<Box height='50px' display='flex' alignItems='center' justifyContent='center'>
				<Link to={generatePath(paths.home)} style={{ textDecoration: 'none' }}>
					<img
						src={getLogo(collapsed, darkMode)}
						alt='headerLogo'
						style={{
							height: '45px',
							objectFit: 'contain',
							width: collapsed ? '100%' : '160px',
						}}
					/>
				</Link>
			</Box>

			{/* Navigation Items */}
			<Box flexGrow={1} overflow='auto' sx={{ paddingX: collapsed ? '4px' : 1 }}>
				<List disablePadding>
					{sidebarMenu?.map((section, sectionIndex) => (
						<Box key={`section-${section.title || sectionIndex}`} color='text.highlight' sx={{ my: 1 }}>
							{!collapsed && (
								<Typography fontSize='10px' fontWeight='bold'>
									{section.title}
								</Typography>
							)}
							{section.pages.map((page) => (
								<SidebarItem key={page.text} page={page} collapsed={collapsed} isActive={location.pathname === page.link} />
							))}
						</Box>
					))}
				</List>
			</Box>

			{/* Bottom Controls Area */}
			<Box display='flex' flexDirection={collapsed ? 'column' : 'row'} alignItems='center' justifyContent='space-around' p={1} gap={1}>
				{mainControls.map((ctrl) => (
					<Tooltip key={ctrl.id} title={ctrl.tip} placement='right'>
						<Box
							onClick={ctrl.action}
							sx={{
								cursor: 'pointer',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								width: '30px',
								height: '30px',
								borderRadius: '4px',
								'&:hover': { bgcolor: 'action.hover' },
								color: 'text.primary',
							}}>
							{ctrl.content}
						</Box>
					</Tooltip>
				))}
			</Box>

			{/* Color Selection Menu */}
			<Menu
				anchorEl={colorMenuAnchor}
				open={isMenuOpen}
				onClose={handleColorClose}
				anchorOrigin={{
					vertical: 'center',
					horizontal: 'right',
				}}
				transformOrigin={{
					vertical: 'center',
					horizontal: 'left',
				}}>
				<Box display='flex' p={1} gap={1}>
					{availableColors.map((c) => (
						<Tooltip key={c.id} title={c.label}>
							<Box
								onClick={() => handleColorSelect(c.id)}
								width='24px'
								height='24px'
								borderRadius='4px'
								bgcolor={c.color}
								sx={{
									cursor: 'pointer',
									border: primaryColor === c.id ? '2px solid black' : '1px solid transparent',
									boxShadow: primaryColor === c.id ? 3 : 1,
									'&:hover': { transform: 'scale(1.1)' },
									transition: 'transform 0.1s',
								}}
							/>
						</Tooltip>
					))}
				</Box>
			</Menu>
		</Box>
	);
};

export default Sidebar;
