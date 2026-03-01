/**
 * Breadcrumbs Navigation Component
 * Displays the current page hierarchy and provides global actions (Theme toggle, Settings, Logout).
 * Integrates with the Dialog context to handle user preference updates.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Typography, Breadcrumbs, Box, Button, IconButton, Menu, MenuItem } from '@mui/material';
import { LightModeOutlined as LightModeIcon, DarkModeOutlined as DarkModeIcon, NavigateNextOutlined as NavigateNext, SettingsOutlined as SettingsIcon, PaletteOutlined as ColorIcon } from '@mui/icons-material';

import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { UserType } from '../../config/data/collections';
import { logoutUser, saveApplicantData } from '../../config/data/firebase';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import { useAuth } from '../../context/AuthContext';

// --- Sub-components ---

const SettingsIconButton = ({ onClick }) => (
	<IconButton sx={{ width: '40px', height: '40px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'secondary.main' }} onClick={onClick}>
		<SettingsIcon color='secondary' />
	</IconButton>
);

SettingsIconButton.propTypes = { onClick: PropTypes.func.isRequired };

export const SettingsButton = ({ applicant }) => {
	const { showDialog } = useDialog();
	const navigate = useNavigate();

	const handleUpdatePreferences = () => {
		if (!applicant?.id) return;

		showDialog({
			id: 'notificationsUpdate',
			data: {
				userType: UserType.applicant,
				email: applicant.notifications?.email || false,
				sms: applicant.notifications?.sms || false,
				nickname: applicant.callMe || '',
			},
			callback: async (formData) => {
				if (formData) {
					const updatedData = {
						...applicant,
						notifications: { email: formData.email, sms: formData.sms },
						callMe: formData.nickname,
					};
					await saveApplicantData(applicant.id, updatedData);
					navigate(generatePath(paths.apply));
				}
			},
		});
	};

	if (!applicant) return null;
	return <SettingsIconButton onClick={handleUpdatePreferences} />;
};

SettingsButton.propTypes = { applicant: PropTypes.object };

// --- Main Component ---

export default function Crumbs({ title, logout: showLogout = false }) {
	const navigate = useNavigate();
	const { darkMode, dispatch, primaryColor } = useTheme();
	const { applicant } = useAuth();

	const [anchorEl, setAnchorEl] = useState(null);
	const colorMenuOpen = Boolean(anchorEl);

	const themeColors = [
		{ key: 'green', label: 'Green Theme' },
		{ key: 'blue', label: 'Blue Theme' },
		{ key: 'brown', label: 'Brown Theme' },
		{ key: 'red', label: 'Red Theme' },
		{ key: 'yellow', label: 'Yellow Theme' },
	];

	const handleColorSelect = (color) => {
		dispatch({ type: 'SET_COLOR', payload: color });
		setAnchorEl(null);
	};

	const logout = () => {
		logoutUser();
		navigate(generatePath(paths.home));
	};

	return (
		<Box px={2} display='flex' flexDirection='row' justifyContent='space-between' alignItems='center' bgcolor='background' color='secondary'>
			{/* Breadcrumb Links */}
			<Breadcrumbs aria-label='breadcrumb' separator={<NavigateNext fontSize='small' />}>
				<Button variant='text' onClick={() => navigate(generatePath(paths.root))}>
					Home
				</Button>
				{title ? (
					<Button variant='text' onClick={() => navigate(generatePath(paths.apply))}>
						Applications
					</Button>
				) : (
					<Typography>APPLICATIONS</Typography>
				)}
				{title && <Typography color='primary'>{title.toUpperCase()}</Typography>}
			</Breadcrumbs>

			{/* Action Buttons */}
			<Box display='flex' flexDirection='row' gap={2} py={1}>
				<SettingsButton applicant={applicant} />

				<IconButton
					sx={{
						width: '40px',
						height: '40px',
						borderWidth: '1px',
						borderStyle: 'solid',
						borderColor: 'secondary.main',
						bgcolor: darkMode ? 'primary.main' : 'background.main',
						'&:hover': { bgcolor: `${primaryColor}.dark` },
					}}
					onClick={(e) => setAnchorEl(e.currentTarget)}>
					<ColorIcon sx={{ color: darkMode ? 'custom.black' : 'primary.main' }} />
				</IconButton>

				<IconButton sx={{ width: '40px', height: '40px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'secondary.main' }} onClick={() => dispatch({ type: 'TOGGLE' })}>
					{darkMode ? <LightModeIcon color='secondary' /> : <DarkModeIcon color='secondary' />}
				</IconButton>

				{showLogout && (
					<Button variant='outlined' onClick={logout}>
						Logout
					</Button>
				)}
			</Box>

			{/* Theme Color Menu */}
			<Menu sx={{ mt: 1 }} anchorEl={anchorEl} open={colorMenuOpen} onClose={() => setAnchorEl(null)}>
				{themeColors.map((color) => (
					<MenuItem sx={{ bgcolor: darkMode ? 'custom.black' : 'background.paper' }} key={color.key} onClick={() => handleColorSelect(color.key)} selected={color.key === primaryColor}>
						{color.label}
					</MenuItem>
				))}
			</Menu>
		</Box>
	);
}

Crumbs.propTypes = {
	title: PropTypes.string,
	logout: PropTypes.bool,
};
