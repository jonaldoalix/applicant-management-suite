/**
 * Global Navigation Bar
 * The top-level persistent navigation component.
 * Features:
 * - Global Search (Applicants, Members).
 * - Theme Toggle (Dark/Light).
 * - User Menu (Profile, Settings, Logout).
 * - Quick Links (Inbox, Interviews).
 * - Dynamic Notification Badges.
 */

import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Menu, MenuItem, Divider, ListItemIcon, Typography, Badge, InputBase } from '@mui/material';
import { VoiceChatOutlined as MeetingIcon, Email as EmailIcon, MarkEmailUnread as UnreadIcon, MarkEmailRead as ReadIcon, LightModeOutlined as LightModeIcon, DarkModeOutlined as DarkModeIcon, SearchOutlined as SearchIcon, NotificationsNoneOutlined as NotificationsIcon, SettingsOutlined, Logout, AccountCircle as ProfileIcon } from '@mui/icons-material';

// Context
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useDialog } from '../../context/DialogContext';
import { useMailbox } from '../../context/MailboxContext';

// Config & Backend
import { UserType } from '../../config/data/collections';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { saveCollectionData, globalSearch } from '../../config/data/firebase';

// Components
import SearchResultsDropdown from './SearchResultsDropdown';

// --- Sub-Components ---

const SettingsMenuItem = ({ member, onMenuClose }) => {
	const { showDialog } = useDialog();

	const handleSettingsClick = () => {
		onMenuClose();
		if (!member?.id) return;

		showDialog({
			id: 'notificationsUpdate',
			data: {
				userType: UserType.member,
				email: member.notifications?.email || false,
				sms: member.notifications?.sms || false,
				callMe: member.callMe || '',
				forwardingEnabled: member.notifications?.forwardingEnabled || false,
			},
			callback: async (formData) => {
				if (formData) {
					const { email, sms, callMe, forwardingEnabled } = formData;
					const updatedData = {
						...member,
						notifications: { email, sms, forwardingEnabled },
						callMe: callMe,
					};
					await saveCollectionData('members', member.id, updatedData);
				}
			},
		});
	};

	return (
		<MenuItem onClick={handleSettingsClick}>
			<ListItemIcon>
				<SettingsOutlined fontSize='small' />
			</ListItemIcon>
			<Typography>Preferences</Typography>
		</MenuItem>
	);
};

SettingsMenuItem.propTypes = {
	member: PropTypes.object,
	onMenuClose: PropTypes.func.isRequired,
};

// --- Main Component ---

const Navbar = () => {
	const navigate = useNavigate();
	const { darkMode, dispatch } = useTheme();
	const { user, role } = useAuth();
	const { member, unreadCount = 0 } = useMailbox();
	const config = useConfig();

	// State
	const [profileImage, setProfileImage] = useState(config.DEFAULT_AVATAR);
	const [anchorEl, setAnchorEl] = useState(null);
	const [searchTerms, setSearchTerms] = useState('');
	const [searchResults, setSearchResults] = useState(null);
	const [isSearching, setIsSearching] = useState(false);

	const open = Boolean(anchorEl);
	const searchBarRef = useRef(null);

	// Sync Profile Image
	useEffect(() => {
		if (user && role) {
			if ((role === UserType.member || role === UserType.both) && member) {
				setProfileImage(member.picture?.home || config.DEFAULT_AVATAR);
			} else {
				setProfileImage(config.DEFAULT_AVATAR);
			}
		} else {
			setProfileImage(config.DEFAULT_AVATAR);
		}
	}, [user, member, role, config.DEFAULT_AVATAR]);

	const handleSearch = async () => {
		if (searchTerms.trim().length < 3) {
			setSearchResults({ error: 'Search term must be at least 3 characters.' });
			return;
		}

		setIsSearching(true);
		setSearchResults(null);

		try {
			const result = await globalSearch({ searchTerm: searchTerms });
			setSearchResults(result.data);
			setSearchTerms('');
		} catch (error) {
			console.error('Search failed:', error);
			setSearchResults({ error: error.message || 'Search failed. Please try again.' });
		}
		setIsSearching(false);
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter') {
			handleSearch();
		}
	};

	// Close dropdown with delay to allow clicks to register
	const handleCloseDropdown = () => {
		setTimeout(() => {
			setSearchResults(null);
		}, 200);
	};

	const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
	const handleMenuClose = () => setAnchorEl(null);

	const handleLogout = () => {
		navigate(generatePath(paths.logout));
		handleMenuClose();
	};

	const goToProfile = () => {
		if (user?.uid && (role === UserType.member || role === UserType.both)) {
			navigate(generatePath(paths.viewMember, { id: user.uid }));
		}
		handleMenuClose();
	};

	const renderEmailIcon = () => {
		if (!member?.permissions?.email) {
			return <EmailIcon className='icon' />;
		}

		if (unreadCount > 0) {
			return (
				<Badge badgeContent={unreadCount} color='error' max={99}>
					<UnreadIcon className='icon' />
				</Badge>
			);
		}

		return <ReadIcon className='icon' />;
	};

	return (
		<Box zIndex={1} position='sticky' top='0' height='50px' display='flex' alignItems='center' fontSize='14px' color='text.primary'>
			<Box className='wrapper' display='flex' padding='20px' alignItems='center' justifyContent='space-between' width='100%' gap='15px'>
				{/* Search Bar */}
				<Box
					ref={searchBarRef}
					position='relative'
					display='flex'
					alignItems='center'
					borderRadius='14px'
					width='100%'
					justifyContent='space-between'
					sx={{
						border: '2px solid',
						borderColor: 'divider', // Softer border color
						padding: '2px 15px',
						bgcolor: 'background.paper',
					}}>
					<InputBase sx={{ ml: 1, flex: 1, color: 'text.primary' }} placeholder='Search...' value={searchTerms} onChange={(e) => setSearchTerms(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleCloseDropdown} inputProps={{ 'aria-label': 'search site' }} />
					<SearchIcon sx={{ cursor: 'pointer', color: 'text.secondary' }} onClick={handleSearch} />
				</Box>

				{/* Search Results Dropdown */}
				{(isSearching || searchResults) && <SearchResultsDropdown results={searchResults} loading={isSearching} anchorEl={searchBarRef.current} onClose={() => setSearchResults(null)} />}

				{/* Right Side Icons */}
				<Box className='items' display='flex' alignItems='center' gap='20px'>
					<Box className='item' sx={{ cursor: 'pointer' }} onClick={() => dispatch({ type: 'TOGGLE' })}>
						{darkMode ? <LightModeIcon className='icon' /> : <DarkModeIcon className='icon' />}
					</Box>

					{member?.permissions?.interviews?.canAccess && (
						<Box className='item' sx={{ cursor: 'pointer' }} onClick={() => navigate(generatePath(paths.interviewDash))}>
							<MeetingIcon className='icon' />
						</Box>
					)}

					<Box className='item' sx={{ cursor: 'pointer' }}>
						<NotificationsIcon className='icon' />
					</Box>

					<Box
						className='item'
						sx={{
							cursor: member?.permissions?.email ? 'pointer' : 'default',
							color: member?.permissions?.email ? 'text.primary' : 'action.disabled',
						}}
						onClick={() => member?.permissions?.email && navigate(generatePath(paths.inbox))}>
						{renderEmailIcon()}
					</Box>

					<Box className='item'>
						<Avatar src={profileImage} alt='Profile' className='avatar' sx={{ width: 32, height: 32, cursor: 'pointer' }} onClick={handleMenuOpen} />
					</Box>
				</Box>
			</Box>

			{/* Profile Menu */}
			<Menu
				anchorEl={anchorEl}
				open={open}
				onClose={handleMenuClose}
				slotProps={{
					paper: {
						elevation: 0,
						sx: {
							overflow: 'visible',
							filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
							mt: 1.5,
							'& .MuiAvatar-root': { width: 32, height: 32, ml: -0.5, mr: 1 },
							'&:before': {
								content: '""',
								display: 'block',
								position: 'absolute',
								top: 0,
								right: 14,
								width: 10,
								height: 10,
								bgcolor: 'background.paper',
								transform: 'translateY(-50%) rotate(45deg)',
								zIndex: 0,
							},
						},
					},
				}}
				transformOrigin={{ horizontal: 'right', vertical: 'top' }}
				anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
				<MenuItem onClick={goToProfile}>
					<ListItemIcon>
						<ProfileIcon fontSize='small' />
					</ListItemIcon>
					<Typography>Profile</Typography>
				</MenuItem>
				{member && <SettingsMenuItem member={member} onMenuClose={handleMenuClose} />}
				<Divider />
				<MenuItem onClick={handleLogout}>
					<ListItemIcon>
						<Logout fontSize='small' />
					</ListItemIcon>
					<Typography>Logout</Typography>
				</MenuItem>
			</Menu>
		</Box>
	);
};

export default Navbar;
