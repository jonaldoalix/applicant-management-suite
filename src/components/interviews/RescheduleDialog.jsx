/**
 * Reschedule Dialog
 * A modal to move an existing interview to a new time slot.
 * Features:
 * - Pre-fills current interview time.
 * - Auto-calculates end time (Start + 15 mins).
 * - Option to send updated calendar invites to the applicant.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Typography, Button, CircularProgress, TextField, DialogTitle, DialogContent, DialogActions } from '@mui/material';

// Context
import { useAlert } from '../../context/AlertContext';

// Backend
import { rescheduleInterview } from '../../config/data/firebase';

const RescheduleDialog = ({ interview, onSuccess, onCancel }) => {
	const { handleError, showAlert } = useAlert();
	const [newTime, setNewTime] = useState('');
	const [loading, setLoading] = useState(false);

	// Initialize with current interview time
	useEffect(() => {
		if (interview?.startTime) {
			// Format for datetime-local input: "YYYY-MM-DDTHH:mm"
			const formattedTime = dayjs(interview.startTime.toDate()).format('YYYY-MM-DDTHH:mm');
			setNewTime(formattedTime);
		}
	}, [interview]);

	const handleReschedule = async (sendInvite = false) => {
		if (!newTime) {
			showAlert({ message: 'Please select a new time.', type: 'warning' });
			return;
		}

		setLoading(true);
		try {
			const newStartTime = new Date(newTime);
			// Maintain 15-minute slot duration
			const newEndTime = dayjs(newStartTime).add(15, 'minute').toDate();

			const result = await rescheduleInterview({
				interviewId: interview.id,
				newStartTime: newStartTime.toISOString(),
				newEndTime: newEndTime.toISOString(),
				sendInvite: sendInvite,
			});

			showAlert({ message: result.data.message, type: 'success' });
			onSuccess();
		} catch (error) {
			handleError(error, 'Failed to reschedule interview.');
		} finally {
			setLoading(false);
		}
	};

	const currentTime = interview?.startTime?.toDate();

	return (
		<>
			<DialogTitle>Reschedule Interview</DialogTitle>
			<DialogContent>
				<Typography sx={{ mb: 2 }}>Current time: {currentTime ? dayjs(currentTime).format('MMMM D, YYYY h:mm A') : 'Not scheduled'}</Typography>

				<TextField autoFocus margin='dense' id='newTime' label='New Interview Time' type='datetime-local' fullWidth value={newTime} onChange={(e) => setNewTime(e.target.value)} InputLabelProps={{ shrink: true }} />
			</DialogContent>

			<DialogActions sx={{ p: '0 24px 24px' }}>
				<Button onClick={onCancel} disabled={loading}>
					Cancel
				</Button>

				<Button onClick={() => handleReschedule(false)} variant='outlined' disabled={loading}>
					{loading ? <CircularProgress size={24} /> : 'Schedule Only'}
				</Button>

				<Button onClick={() => handleReschedule(true)} variant='contained' disabled={loading}>
					{loading ? <CircularProgress size={24} /> : 'Schedule & Invite'}
				</Button>
			</DialogActions>
		</>
	);
};

RescheduleDialog.propTypes = {
	interview: PropTypes.object,
	onSuccess: PropTypes.func.isRequired,
	onCancel: PropTypes.func.isRequired,
};

export default RescheduleDialog;
