/**
 * Auto Scheduler Component
 * A dialog interface for administrators to define interview availability blocks.
 * Triggers the 'autoScheduleInterviews' cloud function to match applicants to slots.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuid } from 'uuid';
import { Button, TextField, Typography, Grid, IconButton, DialogContent, DialogActions, DialogTitle } from '@mui/material';
import { Add, Delete } from '@mui/icons-material';

// Context
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';

// Backend
import { autoScheduleInterviews } from '../../config/data/firebase';

const AutoScheduler = ({ onSuccess, onClose }) => {
	const { showAlert, handleError } = useAlert();
	const config = useConfig();
	const deadline = config.APPLICATION_DEADLINE;

	const [loading, setLoading] = useState(false);
	// Initialize with one empty block
	const [availability, setAvailability] = useState([{ id: uuid(), start: '', end: '' }]);

	const handleChange = (index, field, value) => {
		const updated = [...availability];
		updated[index][field] = value;
		setAvailability(updated);
	};

	const addBlock = () => {
		setAvailability([...availability, { id: uuid(), start: '', end: '' }]);
	};

	const removeBlock = (id) => {
		setAvailability(availability.filter((block) => block.id !== id));
	};

	const handleSubmit = async () => {
		setLoading(true);
		try {
			// Filter complete blocks and format dates
			const timeBlocks = availability
				.filter((b) => b.start && b.end)
				.map((b) => {
					const startDate = new Date(b.start);
					const endDate = new Date(b.end);

					if (startDate >= endDate) {
						throw new Error('Start time must be before end time.');
					}

					return {
						start: startDate.toISOString(),
						end: endDate.toISOString(),
					};
				});

			if (timeBlocks.length === 0) {
				showAlert({ message: 'Please add at least one valid availability block.', type: 'warning' });
				setLoading(false);
				return;
			}

			const res = await autoScheduleInterviews({ deadline, availability: timeBlocks });

			// The cloud function returns an object with results
			const { scheduledCount, skippedApplicants } = res.data;

			showAlert({
				message: `Scheduled ${scheduledCount} interviews! Skipped ${skippedApplicants?.length || 0}.`,
				type: 'success',
			});

			onSuccess();
		} catch (error) {
			handleError(error, 'autoScheduler submit error');
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<DialogTitle>Auto-Schedule Interviews</DialogTitle>
			<DialogContent>
				<Typography variant='subtitle1' sx={{ mb: 2 }}>
					Define Committee Availability Blocks
				</Typography>

				{availability.map((block, i) => (
					<Grid container spacing={2} key={block.id} alignItems='center' sx={{ mb: 1 }}>
						<Grid item xs={5}>
							<TextField label='Start' type='datetime-local' fullWidth value={block.start} onChange={(e) => handleChange(i, 'start', e.target.value)} InputLabelProps={{ shrink: true }} />
						</Grid>
						<Grid item xs={5}>
							<TextField label='End' type='datetime-local' fullWidth value={block.end} onChange={(e) => handleChange(i, 'end', e.target.value)} InputLabelProps={{ shrink: true }} />
						</Grid>
						<Grid item xs={2}>
							<IconButton onClick={() => removeBlock(block.id)} color='error'>
								<Delete />
							</IconButton>
						</Grid>
					</Grid>
				))}

				<Button variant='text' startIcon={<Add />} onClick={addBlock} sx={{ mt: 1 }}>
					Add Time Block
				</Button>
			</DialogContent>

			<DialogActions sx={{ p: '0 24px 24px' }}>
				<Button onClick={onClose} disabled={loading}>
					Close
				</Button>
				<Button variant='contained' onClick={handleSubmit} disabled={loading}>
					{loading ? 'Scheduling...' : 'Run Scheduler'}
				</Button>
			</DialogActions>
		</>
	);
};

AutoScheduler.propTypes = {
	onSuccess: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired,
};

export default AutoScheduler;
