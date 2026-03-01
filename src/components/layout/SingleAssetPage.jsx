/**
 * Single Asset Page Layout
 * A generic wrapper for detailed view pages (e.g., Single Applicant, Single Member).
 * Features:
 * - Context-aware "Back" button (adjusts position based on Sidebar state).
 * - Standardized "AssetCard" component for consistent data presentation.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

// Context
import { useSidebar } from '../../context/SidebarContext';
import { useTheme } from '../../context/ThemeContext';

/**
 * A generic, templated page layout for viewing a single asset.
 * It provides the outer Box container and the "Back" button.
 */
const SingleAssetPage = ({ children }) => {
	const navigate = useNavigate();
	const { collapsed } = useSidebar();
	const { darkMode, boxShadow } = useTheme();

	return (
		<Box height='100%' width='100%'>
			<IconButton
				onClick={() => navigate(-1)}
				sx={{
					position: 'absolute',
					top: 75,
					left: collapsed ? 80 : 215,
					zIndex: 1100,
					color: 'text.active',
					bgcolor: 'background.main',
					border: '1px solid',
					borderColor: 'divider',
					boxShadow: boxShadow,
					'&:hover': {
						bgcolor: darkMode ? 'action.hover' : '#f5f5f5',
					},
				}}>
				<ArrowBackIcon />
			</IconButton>

			{children}
		</Box>
	);
};

SingleAssetPage.propTypes = {
	children: PropTypes.node.isRequired,
};

/**
 * A styled Box to be used as a "card" on the single asset page.
 * Ensures consistent padding, shadow, and background across detail views.
 */
export const AssetCard = ({ children, flex = 1, sx = {} }) => {
	const { boxShadow } = useTheme();

	const cardStyles = {
		bgcolor: 'background.main',
		borderRadius: '12px',
		boxShadow: boxShadow,
		position: 'relative',
	};

	const contentStyles = {
		padding: '20px',
	};

	return (
		<Box flex={flex} sx={{ ...cardStyles, ...sx }}>
			<Box sx={contentStyles}>{children}</Box>
		</Box>
	);
};

AssetCard.propTypes = {
	children: PropTypes.node.isRequired,
	flex: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	sx: PropTypes.object,
};

export default SingleAssetPage;