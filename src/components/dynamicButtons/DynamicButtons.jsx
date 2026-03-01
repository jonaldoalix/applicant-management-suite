/**
 * Dynamic Action Group
 * Renders a list of action buttons based on a configuration array.
 * Handles navigation (`navTo`), direct execution (`onClick`), or delegating to a parent handler (`onAction`).
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Button, Box } from '@mui/material';

// Context & Utils
import { useTheme } from '../../context/ThemeContext';
import { generatePath } from '../../config/navigation/routeUtils';

const DynamicActionGroup = ({ actions, asset, onAction }) => {
	const navigate = useNavigate();
	const { darkMode } = useTheme();

	const handleActionClick = (action) => {
		// If a parent handler is provided, delegate control
		if (onAction) {
			onAction(action, asset);
			return;
		}

		// Default internal handling
		if (action.navTo) {
			const { path, params } = action.navTo(asset);
			navigate(generatePath(path, params));
		} else if (action.onClick) {
			action.onClick(asset);
		}
	};

	return (
		<Box display='flex' flexDirection='column' flexWrap='wrap' gap={1} mt={2}>
			{actions.map((action) => {
				if (action.hide) return null;

				return (
					<Button key={action.label} variant={darkMode ? 'contained' : 'outlined'} size='large' onClick={() => handleActionClick(action)}>
						{action.label}
					</Button>
				);
			})}
		</Box>
	);
};

DynamicActionGroup.propTypes = {
	actions: PropTypes.arrayOf(
		PropTypes.shape({
			label: PropTypes.string.isRequired,
			hide: PropTypes.bool,
			navTo: PropTypes.func,
			onClick: PropTypes.func,
		})
	).isRequired,
	asset: PropTypes.object,
	onAction: PropTypes.func,
};

export default DynamicActionGroup;
