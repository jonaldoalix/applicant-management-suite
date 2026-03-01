/**
 * Search Results Dropdown
 * Displays global search results anchored to the Navbar search input.
 * Features:
 * - Uses MUI 'Popper' for robust positioning.
 * - Renders grouped results based on 'searchConfig'.
 * - visual loading state.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Divider, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Popper, Grow } from '@mui/material';

// Config
import { searchConfig } from '../../config/admin';

const SearchResultsDropdown = ({ results, loading, anchorEl, onClose, searchTerm }) => {
	const navigate = useNavigate();

	const handleItemClick = (path) => {
		if (path) {
			navigate(path);
			onClose();
		}
	};

	const renderResultGroup = (items, type) => {
		const config = searchConfig[type];
		if (!config || !items || items.length === 0) return null;

		const { icon, title, getPath, getText } = config;

		return (
			<Box key={type}>
				<Typography variant='caption' sx={{ px: 2, pt: 1, display: 'block', fontWeight: 'bold' }} color='text.secondary'>
					{title} ({items.length})
				</Typography>
				<List dense>
					{items.map((item) => {
						const { primary, secondary } = getText(item, searchTerm);
						const path = getPath(item);
						return (
							<ListItem key={item.id} disablePadding>
								<ListItemButton onClick={() => handleItemClick(path)} disabled={!path}>
									{icon && <ListItemIcon sx={{ minWidth: '32px' }}>{icon}</ListItemIcon>}
									<ListItemText primary={primary} secondary={secondary} />
								</ListItemButton>
							</ListItem>
						);
					})}
				</List>
				<Divider />
			</Box>
		);
	};

	const hasResults = results && !results.error && Object.keys(searchConfig).some((key) => results[key] && results[key].length > 0);
	const isOpen = Boolean(loading || results);

	return (
		<Popper
			open={isOpen}
			anchorEl={anchorEl}
			placement='bottom-start'
			transition
			style={{
				zIndex: 1200,
				width: anchorEl ? anchorEl.clientWidth : '300px', // Match width of search bar
			}}>
			{({ TransitionProps }) => (
				<Grow {...TransitionProps} style={{ transformOrigin: 'top center' }}>
					<Paper
						elevation={8}
						sx={{
							maxHeight: '400px',
							overflowY: 'auto',
							mt: 1, // Slight gap from the search bar
							borderRadius: '12px',
						}}
						// Prevent focus loss on input when clicking scrollbar/list
						onMouseDown={(e) => e.preventDefault()}>
						{loading && (
							<Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
								<CircularProgress size={24} />
							</Box>
						)}

						{!loading && results?.error && (
							<Typography sx={{ p: 2 }} color='error.main'>
								{results.error}
							</Typography>
						)}

						{!loading && !results?.error && !hasResults && (
							<Typography sx={{ p: 2 }} color='text.secondary'>
								No results found.
							</Typography>
						)}

						{!loading && hasResults && Object.keys(searchConfig).map((key) => renderResultGroup(results[key], key))}
					</Paper>
				</Grow>
			)}
		</Popper>
	);
};

SearchResultsDropdown.propTypes = {
	results: PropTypes.object,
	loading: PropTypes.bool.isRequired,
	anchorEl: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
	onClose: PropTypes.func.isRequired,
	searchTerm: PropTypes.string,
};

export default SearchResultsDropdown;
