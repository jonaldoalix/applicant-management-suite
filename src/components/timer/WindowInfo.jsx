/**
 * Window Info Component
 * Displays specific dates and labels for the current application cycle.
 * Features:
 * - Shows "Deadline", "Opens", or "Closed" dates based on the mode provided by the child <Timer>.
 * - Adapts text to show the relevant academic years (e.g., 2023 - 2024).
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';

// Context
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';

// Components
import Timer from './Timer';

export default function WindowInfo({ bg = 'transparent' }) {
	const config = useConfig();
	const { boxShadow } = useTheme();
	const [mode, setMode] = useState('loading');

	const deadline = new Date(config.APPLICATION_DEADLINE);
	const nextOpen = config.NEXT_APPLICATION_OPEN_DATE ? new Date(config.NEXT_APPLICATION_OPEN_DATE) : null;

	const windowYear = deadline.getFullYear();
	const nextOpenYear = nextOpen?.getFullYear?.() || windowYear;

	let labelText = '';
	let subLabelText = '';

	// Determine labels based on the Timer's current mode
	if (mode === 'deadline') {
		labelText = `Application Window: ${windowYear} - ${windowYear + 1}`;
		subLabelText = `Deadline: ${deadline.toLocaleString()}`;
	} else if (mode === 'nextOpen') {
		labelText = `Upcoming Window: ${nextOpenYear} - ${nextOpenYear + 1}`;
		subLabelText = `Opens: ${nextOpen ? nextOpen.toLocaleString() : 'TBD'}`;
	} else if (mode === 'closed') {
		labelText = `Most Recent Window: ${windowYear} - ${windowYear + 1}`;
		subLabelText = `Closed: ${deadline.toLocaleString()}`;
	}

	return (
		<Box
			width='100%'
			p={2}
			border={1}
			borderRadius={2}
			borderColor='divider'
			boxShadow={boxShadow}
			maxWidth='450px'
			display='flex'
			alignItems='center'
			flexDirection='column'
			sx={{
				color: 'text.primary',
				bgcolor: bg,
			}}>
			<Typography gutterBottom variant='body1' fontWeight='bold'>
				{labelText}
			</Typography>

			<Typography variant='body1' gutterBottom fontWeight='bold'>
				{subLabelText}
			</Typography>

			<Box>
				<Timer onModeChange={setMode} />
			</Box>
		</Box>
	);
}

WindowInfo.propTypes = {
	bg: PropTypes.string,
};