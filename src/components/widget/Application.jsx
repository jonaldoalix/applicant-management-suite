/**
 * Application Widget
 * A dashboard summary card representing a single application.
 * Features:
 * - Fetches application data by ID.
 * - Displays Type, Year, and Status.
 * - Quick link to "Review Application".
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import { Delete } from '@mui/icons-material';

// Context
import { useTheme } from '../../context/ThemeContext';

// Config & Backend
import { blankApp } from '../../config/data/Validation';
import { getApplication } from '../../config/data/firebase';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';

const Application = ({ id }) => {
	const [data, setData] = useState(blankApp);
	const navigate = useNavigate();
	const { darkMode, boxShadow } = useTheme();

	useEffect(() => {
		const fetch = async () => {
			try {
				const applicationIn = await getApplication(id, id);
				if (applicationIn) {
					setData(applicationIn);
				}
			} catch (error) {
				console.error(error.message);
			}
		};
		fetch();
	}, [id]);

	const handleReviewClick = () => {
		navigate(generatePath(paths.viewApp, { id: data.id }));
	};

	const handleDeleteClick = () => {
		// Placeholder for future delete logic
	};

	return (
		<Box display='flex' flex='1' padding='15px' justifyContent='space-between' borderRadius='12px' boxShadow={boxShadow} bgcolor='background.paper'>
			<Box display='flex' flexDirection='column' justifyContent='space-between' gap={1}>
				<Typography variant='subtitle2' fontWeight='bold' color='text.primary'>
					{data.type}
				</Typography>

				<Typography variant='h4' fontWeight='300' color='text.primary'>
					{data.window ? new Date(data.window).getFullYear() : '----'}
				</Typography>

				<Button
					onClick={handleReviewClick}
					variant='text'
					sx={{
						fontSize: '12px',
						width: 'fit-content',
						textDecoration: 'none',
						p: 0,
						justifyContent: 'flex-start',
						'&:hover': { background: 'transparent', textDecoration: 'underline' },
					}}>
					Review Application
				</Button>
			</Box>

			<Box display='flex' flexDirection='column' justifyContent='space-between' alignItems='flex-end'>
				<Box display='flex' fontSize='12px' fontWeight='bold' alignItems='center' borderRadius='12px' padding='4px 12px' bgcolor={darkMode ? 'highlight.main' : 'background.passive'} color='text.active'>
					{data.status || 'Unknown'}
				</Box>

				<Box
					onClick={handleDeleteClick}
					sx={{
						padding: '8px',
						borderRadius: '50%',
						color: 'text.secondary',
						transition: '0.2s',
						display: 'flex',
						'&:hover': {
							cursor: 'pointer',
							backgroundColor: 'error.lighter',
							color: 'error.main',
						},
					}}>
					<Delete fontSize='small' />
				</Box>
			</Box>
		</Box>
	);
};

Application.propTypes = {
	id: PropTypes.string.isRequired,
};

export default Application;
