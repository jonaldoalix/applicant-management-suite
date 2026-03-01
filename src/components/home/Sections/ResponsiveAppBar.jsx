/**
 * Responsive App Bar (Home)
 * Navigation bar specifically designed for the Landing Page.
 * Features:
 * - Logo/Brand display (Long vs Short based on screen size).
 * - Navigation Links (Scroll to section vs Navigate to page).
 * - Theme Toggle & Auth Status Indicator.
 * - Mobile Menu (Hamburger).
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { AppBar, Box, Toolbar, IconButton, Typography, Menu, Container, Button, MenuItem } from '@mui/material';
import { Menu as MenuIcon, Church as ChurchIcon, Lock as LockIcon, LightModeOutlined as LightModeIcon, DarkModeOutlined as DarkModeIcon, LockOpen as LockOpenIcon } from '@mui/icons-material';

// Context & Config
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { generatePath } from '../../../config/navigation/routeUtils';
import { paths } from '../../../config/navigation/paths';
import { homePageContent } from '../../../config/content/content';

function ResponsiveAppBar({ appBarRef, tabBarRef, setParentTab }) {
	const [anchorElNav, setAnchorElNav] = useState(null);
	const { user } = useAuth();
	const navigate = useNavigate();
	const { darkMode, dispatch } = useTheme();

	// Content config
	const { appBar: content } = homePageContent;

	const scrollToTabBar = (ref, index) => {
		if (ref?.current) {
			setParentTab(index);
			ref.current.scrollIntoView({ behavior: 'smooth' });
		}
	};

	const handleOpenNavMenu = (event) => {
		setAnchorElNav(event.currentTarget);
	};

	const handleCloseNavMenu = (page) => {
		setAnchorElNav(null);
		if (!page) return; // Handle clicking outside or just closing

		if (page.type === 'scroll') {
			scrollToTabBar(tabBarRef, page.index);
		} else if (page.type === 'navigate') {
			navigate(page.path);
		}
	};

	return (
		<AppBar ref={appBarRef} position='sticky' color='primary'>
			<Container maxWidth='xl'>
				<Toolbar disableGutters>
					{/* Desktop Logo (Icon + Long Name) */}
					<ChurchIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }} />
					<Typography
						variant='h6'
						noWrap
						component='a'
						href={generatePath(paths.home)}
						sx={{
							display: { xs: 'none', md: 'flex' },
							fontWeight: 700,
							letterSpacing: '.15rem',
							color: 'inherit',
							textDecoration: 'none',
						}}>
						{content.organizationName.long}
					</Typography>

					{/* Mobile Menu (Hamburger) */}
					<Box sx={{ display: { xs: 'flex', md: 'none' } }}>
						<IconButton size='large' aria-label='navigation menu' aria-controls='menu-appbar' aria-haspopup='true' onClick={handleOpenNavMenu} color='inherit'>
							<MenuIcon />
						</IconButton>
						<Menu id='menu-appbar' anchorEl={anchorElNav} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} keepMounted transformOrigin={{ vertical: 'top', horizontal: 'left' }} open={Boolean(anchorElNav)} onClose={() => handleCloseNavMenu(null)} sx={{ display: { xs: 'block', md: 'none' } }}>
							{content.navLinks.map((page) => (
								<MenuItem key={page.label} onClick={() => handleCloseNavMenu(page)}>
									<Typography textAlign='center'>{page.label}</Typography>
								</MenuItem>
							))}
						</Menu>
					</Box>

					{/* Mobile Logo (Short Name) */}
					<Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' }, justifyContent: 'center', alignItems: 'center' }}>
						<Typography
							variant='h6'
							noWrap
							component='a'
							href={generatePath(paths.home)}
							sx={{
								fontWeight: 700,
								letterSpacing: '.15rem',
								color: 'inherit',
								textDecoration: 'none',
							}}>
							{content.organizationName.short}
						</Typography>
					</Box>

					{/* Desktop Navigation Links */}
					<Box sx={{ gap: 1, flexGrow: 1, justifyContent: 'center', display: { xs: 'none', md: 'flex' } }}>
						{content.navLinks.map((page) => (
							<Button key={page.label} onClick={() => handleCloseNavMenu(page)} variant='text' sx={{ my: 2, color: 'white', display: 'block' }}>
								{page.label}
							</Button>
						))}
					</Box>

					{/* Actions: Theme Toggle & Login/Logout */}
					{content.themeToggle.enabled && (darkMode ? <LightModeIcon sx={{ cursor: 'pointer', px: 1 }} onClick={() => dispatch({ type: 'TOGGLE' })} /> : <DarkModeIcon sx={{ cursor: 'pointer', px: 1 }} onClick={() => dispatch({ type: 'TOGGLE' })} />)}

					{content.authLink.enabled && (user ? <LockOpenIcon sx={{ cursor: 'pointer', px: 1 }} onClick={() => navigate(generatePath(paths.redirect))} /> : <LockIcon sx={{ cursor: 'pointer', px: 1 }} onClick={() => navigate(generatePath(paths.login))} />)}
				</Toolbar>
			</Container>
		</AppBar>
	);
}

ResponsiveAppBar.propTypes = {
	appBarRef: PropTypes.object.isRequired,
	tabBarRef: PropTypes.object.isRequired,
	setParentTab: PropTypes.func.isRequired,
};

export default ResponsiveAppBar;
