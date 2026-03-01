/**
 * Application Timer
 * Displays a countdown to important dates (Application Deadline or Next Opening).
 * Features:
 * - Automatically switches modes:
 * - 'deadline': Counting down to current window close.
 * - 'nextOpen': Counting down to next window open.
 * - 'closed': Application period is over.
 * - Real-time updates (1s interval).
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Typography, Box } from '@mui/material';

// Context
import { useConfig } from '../../context/ConfigContext';

// --- Helpers ---

const pluralize = (count, singular, plural) => (count === 1 ? singular : plural);

const formatTime = (time) => {
	if (time === null || time < 0) return '';

	const days = Math.floor(time / (60 * 60 * 24));
	const hours = Math.floor((time % (60 * 60 * 24)) / 3600);
	const minutes = Math.floor((time % 3600) / 60);
	const seconds = time % 60;

	return `${days} ${pluralize(days, 'Day', 'Days')}, ${hours} ${pluralize(hours, 'Hour', 'Hours')}, ${minutes} ${pluralize(minutes, 'Minute', 'Minutes')}, ${seconds} ${pluralize(seconds, 'Second', 'Seconds')}`;
};

// --- Main Component ---

const Timer = ({ onModeChange }) => {
	const [displayMode, setDisplayMode] = useState('loading');
	const [timeRemaining, setTimeRemaining] = useState(null);
	const config = useConfig();

	useEffect(() => {
		const interval = setInterval(() => {
			const now = new Date();
			const deadline = new Date(config.APPLICATION_DEADLINE);
			const nextOpen = config.NEXT_APPLICATION_OPEN_DATE ? new Date(config.NEXT_APPLICATION_OPEN_DATE) : null;

			let mode = 'closed';
			let newTimeRemaining = null;

			if (deadline > now) {
				// If currently before the deadline
				if (nextOpen && nextOpen > now && nextOpen < deadline) {
					// Unusual case: Next open is sooner than the deadline?
					// (Implies "Opening Soon" state before current deadline logic applies)
					mode = 'nextOpen';
					newTimeRemaining = Math.floor((nextOpen - now) / 1000);
				} else {
					// Standard active window
					mode = 'deadline';
					newTimeRemaining = Math.floor((deadline - now) / 1000);
				}
			} else if (nextOpen && nextOpen > now) {
				// Deadline passed, check proximity to next open date
				const distToDeadline = Math.abs(now - deadline);
				const distToNextOpen = Math.abs(nextOpen - now);

				// Switch to "Next Open" mode if we are closer to opening than the previous close,
				// or simply if we want to show countdown when closed.
				if (distToNextOpen <= distToDeadline) {
					mode = 'nextOpen';
					newTimeRemaining = Math.floor((nextOpen - now) / 1000);
				}
			}

			setTimeRemaining(newTimeRemaining);

			if (mode !== displayMode) {
				setDisplayMode(mode);
				if (onModeChange) {
					onModeChange(mode);
				}
			}
		}, 1000);

		return () => clearInterval(interval);
	}, [config, displayMode, onModeChange]);

	return (
		<Box textAlign='center' color='text.primary'>
			{displayMode === 'deadline' && (
				<Typography variant='body1' fontWeight='bold' gutterBottom>
					Time Remaining: {formatTime(timeRemaining)}
				</Typography>
			)}

			{displayMode === 'closed' && (
				<Typography variant='body1' fontWeight='bold' gutterBottom>
					🚫 The application period is closed. 🚫
				</Typography>
			)}

			{displayMode === 'nextOpen' && (
				<Typography variant='body1' fontWeight='bold' gutterBottom>
					Next Window: {formatTime(timeRemaining)}
				</Typography>
			)}
		</Box>
	);
};

Timer.propTypes = {
	onModeChange: PropTypes.func,
};

export default Timer;