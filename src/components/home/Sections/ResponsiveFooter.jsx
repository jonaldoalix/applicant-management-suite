/**
 * Responsive Footer (Home)
 * The bottom navigation/info bar for the landing page.
 * Features:
 * - "Scroll to Top" Floating Action Button (FAB).
 * - Organization Branding (Responsive).
 * - Global Actions (Theme Toggle, Login/Logout).
 * - Copyright Information.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Container, Fab, Box } from '@mui/material';
import { Church as ChurchIcon, Lock as LockIcon, LockOpen, ArrowUpward as ArrowUpwardIcon, LightModeOutlined as LightModeIcon, DarkModeOutlined as DarkModeIcon } from '@mui/icons-material';

// Context & Config
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { generatePath } from '../../../config/navigation/routeUtils';
import { paths } from '../../../config/navigation/paths';
import { homePageContent } from '../../../config/content/content';

function ResponsiveFooter({ topRef, setParentTab, setChildTab }) {
	const { user } = useAuth();
	const navigate = useNavigate();
	const { darkMode, dispatch } = useTheme();

	const currYear = new Date().getFullYear();
	const { footer: content } = homePageContent;

	const scrollToTop = () => {
		if (topRef?.current) {
			topRef.current.scrollIntoView({ behavior: 'smooth' });
		}
		setParentTab(0);
		setChildTab(0);
	};

	if (!content) return null;

	return (
		<AppBar position='sticky' color='primary' sx={{ display: 'flex', alignContent: 'space-between', p: 3 }}>
			<Container maxWidth='xl'>
				{/* Main Toolbar: Branding & Actions */}
				<Toolbar disableGutters sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
					{/* Desktop Branding */}
					<Box display={{ xs: 'none', md: 'flex' }} alignItems='center'>
						<ChurchIcon sx={{ mr: 1 }} />
						<Typography
							variant='h6'
							noWrap
							component='a'
							href={generatePath(paths.home)}
							color='text.light'
							sx={{
								mr: 2,
								fontWeight: 700,
								letterSpacing: '.15rem',
								textDecoration: 'none',
							}}>
							{content.organizationName?.long}
						</Typography>
					</Box>

					{/* Mobile Branding */}
					<Box display={{ xs: 'flex', md: 'none' }} alignItems='center'>
						<ChurchIcon sx={{ display: { xs: 'flex', sm: 'none' }, mr: 1 }} />
						<Typography
							variant='h5'
							noWrap
							component='a'
							href={generatePath(paths.home)}
							color='text.light'
							sx={{
								mr: 2,
								fontWeight: 700,
								letterSpacing: '.3rem',
								textDecoration: 'none',
							}}>
							{content.organizationName?.short}
						</Typography>
					</Box>

					{/* Right Side Actions */}
					<div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
						{content.scrollToTopButton?.enabled && (
							<Fab variant='extended' size='large' color='text.light' aria-label='Scroll Back Up' sx={{ opacity: '0.4', mr: 1 }} onClick={scrollToTop}>
								<Typography variant='button' sx={{ display: { xs: 'none', sm: 'block' }, mr: 1 }}>
									{content.scrollToTopButton.labels.long}
								</Typography>
								<Typography variant='button' sx={{ display: { xs: 'block', sm: 'none' }, mr: 1 }}>
									{content.scrollToTopButton.labels.short}
								</Typography>
								<ArrowUpwardIcon />
							</Fab>
						)}

						{content.themeToggle?.enabled && (darkMode ? <LightModeIcon sx={{ cursor: 'pointer', px: 1 }} onClick={() => dispatch({ type: 'TOGGLE' })} /> : <DarkModeIcon sx={{ cursor: 'pointer', px: 1 }} onClick={() => dispatch({ type: 'TOGGLE' })} />)}

						{content.authLink?.enabled && (user ? <LockOpen sx={{ cursor: 'pointer', px: 1 }} onClick={() => navigate(generatePath(paths.redirect))} /> : <LockIcon sx={{ cursor: 'pointer', px: 1 }} onClick={() => navigate(generatePath(paths.login))} />)}
					</div>
				</Toolbar>

				{/* Copyright Section */}
				{content.copyright?.enabled && (
					<Toolbar disableGutters>
						<Typography color='text.light' textAlign='center' width='100%' variant='caption'>
							&copy; {content.copyright.line1} | {content.copyright.startYear} - {currYear}
						</Typography>
					</Toolbar>
				)}
			</Container>
		</AppBar>
	);
}

ResponsiveFooter.propTypes = {
	topRef: PropTypes.object.isRequired,
	setParentTab: PropTypes.func.isRequired,
	setChildTab: PropTypes.func.isRequired,
};

export default ResponsiveFooter;
