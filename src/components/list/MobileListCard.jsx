/**
 * Mobile List Card
 * A generic container for list items when displayed on mobile devices.
 * Features:
 * - Consistent styling (shadows, rounding, colors).
 * - "Unread" indicator support (borderLeft).
 * - Flexible "Actions" area that accepts an array of components.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Card, CardContent, CardActions } from '@mui/material';

// Context
import { useTheme } from '../../context/ThemeContext';

const MobileListCard = ({ children, actions = [], isUnread = false, item, navigate, permittedAliases, member }) => {
	const { boxShadow } = useTheme();

	// Props to be passed down to every Action Component
	const actionProps = {
		row: item,
		navigate,
		permittedAliases,
		member,
	};

	return (
		<Card
			sx={{
				mb: 1.5,
				borderRadius: '12px',
				boxShadow: boxShadow,
				bgcolor: 'background.active',
				width: '80vw',
				borderLeft: isUnread ? '5px solid' : 'none',
				borderColor: 'primary.main',
			}}>
			<CardContent sx={{ pb: 0, flex: 1, '&:last-child': { pb: 0 } }}>{children}</CardContent>

			{actions.length > 0 && (
				<CardActions
					sx={{
						display: 'flex',
						flexWrap: 'wrap',
						justifyContent: 'center',
						pt: 1.5,
						px: { xs: 1, sm: 2 },
						pb: { xs: 1, sm: 1 },
						gap: 0.5,
					}}>
					{actions.map((ActionComponent, index) => (
						<ActionComponent key={ActionComponent.name || index} {...actionProps} />
					))}
				</CardActions>
			)}
		</Card>
	);
};

MobileListCard.propTypes = {
	children: PropTypes.node.isRequired,
	actions: PropTypes.arrayOf(PropTypes.elementType),
	isUnread: PropTypes.bool,
	item: PropTypes.object.isRequired,
	navigate: PropTypes.func,
	permittedAliases: PropTypes.array,
	member: PropTypes.object,
};

export default MobileListCard;
