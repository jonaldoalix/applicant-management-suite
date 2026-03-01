/**
 * Copyright Footer Component
 * Displays the standardized copyright notice with a link to the organization's home page.
 * Automatically updates the year.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Link, Typography } from '@mui/material';

// Config
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { brand } from '../../config/Constants';

const CopyrightFooter = ({ homeLink = generatePath(paths.home), ...props }) => {
	return (
		<Typography variant='body2' color='text.secondary' align='center' {...props}>
			{'Copyright © '}
			<Link color='inherit' href={homeLink}>
				{`${brand.theOrganizationName} / ${brand.broughtToYouBy}`},
			</Link>{' '}
			{new Date().getFullYear()}
			{'.'}
		</Typography>
	);
};

CopyrightFooter.propTypes = {
	homeLink: PropTypes.string,
};

export default CopyrightFooter;
