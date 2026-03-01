/**
 * Header Component
 * Displays a profile header with an avatar, title, status badge, and optional edit action.
 * Typically used at the top of Profile or Application detail views.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Avatar } from '@mui/material';
import PropTypes from 'prop-types';
import { useTheme } from '../../context/ThemeContext';

const Header = ({ image, title, status, editPath, config = {}, children }) => {
	const { darkMode } = useTheme();
	const navigate = useNavigate();

	return (
		<>
			{/* Edit Button (Top Right) */}
			{editPath && (
				<Box
					onClick={() => navigate(editPath)}
					sx={{
						position: 'absolute',
						top: 0,
						right: 0,
						padding: '5px',
						fontSize: '13px',
						color: 'text.main',
						bgcolor: 'text.secondary',
						borderRadius: '0px 12px 0px 12px',
						cursor: 'pointer',
						zIndex: 1,
					}}>
					Edit
				</Box>
			)}

			{/* Status & Label Line */}
			<Box display='flex' justifyContent='space-between' alignItems='center' mb={2.5} mt={1.5} gap={2}>
				<Typography color={darkMode ? 'secondary.main' : 'text.highlight'} component='span' ml={1}>
					Information
				</Typography>

				{status && (
					<Typography fontSize='14px' letterSpacing='1px' fontWeight='600' borderRadius='14px' bgcolor='text.highlight' color='custom.black' textAlign='center' padding='3px 10px'>
						{status}
					</Typography>
				)}
			</Box>

			{/* Profile Image & Content */}
			<Box display='flex' gap='20px' mt={3}>
				<Avatar
					src={image || config.DEFAULT_AVATAR}
					alt='Profile'
					sx={{
						width: 100,
						height: 100,
						objectFit: 'cover',
						borderRadius: '50%',
						mt: '-15px',
						border: '2px solid',
						borderColor: 'background.paper',
					}}
				/>
				<Box>
					<Typography variant='h3' mb='10px'>
						{title}
					</Typography>
					{children}
				</Box>
			</Box>
		</>
	);
};

Header.propTypes = {
	image: PropTypes.string,
	title: PropTypes.string,
	status: PropTypes.string,
	editPath: PropTypes.string,
	config: PropTypes.object,
	children: PropTypes.node,
};

export default Header;