/**
 * Permission Group Component
 * Renders a grouped set of checkboxes for managing user permissions.
 * Groups are defined by the `groups` prop (e.g., { "Interviews": ["interviews.canHost", ...] }).
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get, set } from 'lodash';
import { Box, Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel, Typography } from '@mui/material';

// Helper: Formats permission keys into readable labels
// e.g. "interviews.canHost" -> "Can Host"
const createLabel = (path) => {
	const parts = path.split('.');

	if (parts.length === 1) {
		const word = parts[0];
		return word.charAt(0).toUpperCase() + word.slice(1);
	}

	// Special case for alias permissions
	if (parts[0] === 'aliases' && parts.length === 3) {
		const aliasName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
		const action = parts[2].replace('can', '').trim();
		return `${aliasName} ${action}`;
	}

	const lastPart = parts[parts.length - 1];
	// Add space before capital letters
	const spacedLabel = lastPart.replaceAll(/([A-Z])/g, ' $1').trim();
	return spacedLabel.charAt(0).toUpperCase() + spacedLabel.slice(1);
};

const PermissionGroup = ({ formData, onUpdate, groups, disabled }) => {
	const handlePermissionChange = (event) => {
		const { name, checked } = event.target;
		// Deep clone to avoid mutating props directly
		const newFormData = structuredClone(formData);
		set(newFormData, name, checked);
		onUpdate(newFormData);
	};

	return (
		<Box>
			{Object.entries(groups).map(([groupName, permissions]) => (
				<FormControl key={groupName} component='fieldset' sx={{ mt: 2, width: '100%' }}>
					<FormLabel component='legend' sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
						{groupName}
					</FormLabel>
					<FormGroup row>
						{permissions.map((permPath) => {
							const fullPath = `permissions.${permPath}`;
							const isChecked = !!get(formData, fullPath);

							return <FormControlLabel key={permPath} control={<Checkbox checked={isChecked} onChange={handlePermissionChange} name={fullPath} disabled={disabled} />} label={<Typography variant='body2'>{createLabel(permPath)}</Typography>} />;
						})}
					</FormGroup>
				</FormControl>
			))}
		</Box>
	);
};

PermissionGroup.propTypes = {
	formData: PropTypes.object.isRequired,
	onUpdate: PropTypes.func.isRequired,
	groups: PropTypes.object.isRequired,
	disabled: PropTypes.bool,
};

export default PermissionGroup;
