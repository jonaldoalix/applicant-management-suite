/**
 * Manual Scheduler Component
 * Allows administrators to manually book a single interview slot.
 * Flow: Select Applicant -> Select Application -> Pick Time -> Schedule.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Button, DialogContent, DialogActions, DialogTitle, Autocomplete, TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress } from '@mui/material';

// Context
import { useAlert } from '../../context/AlertContext';

// Backend
import { getAllApplicantsSimple, getApplicationsForApplicant, scheduleSingleInterview } from '../../config/data/firebase';

const ManualScheduler = ({ onSuccess, onClose }) => {
	const { showAlert, handleError } = useAlert();
	const [loading, setLoading] = useState(false);

	// Data states
	const [allApplicants, setAllApplicants] = useState([]);
	const [applicantApps, setApplicantApps] = useState([]);

	// Form states
	const [selectedApplicant, setSelectedApplicant] = useState(null);
	const [selectedAppId, setSelectedAppId] = useState('');
	const [startTime, setStartTime] = useState('');

	// Fetch all applicants on component mount
	useEffect(() => {
		let isMounted = true;
		getAllApplicantsSimple()
			.then((data) => {
				if (isMounted) setAllApplicants(data);
			})
			.catch((e) => handleError(e));

		return () => {
			isMounted = false;
		};
	}, [handleError]);

	// Fetch applications when an applicant is selected
	useEffect(() => {
		let isMounted = true;

		if (selectedApplicant?.id) {
			getApplicationsForApplicant(selectedApplicant.id)
				.then((data) => {
					if (isMounted) setApplicantApps(data);
				})
				.catch((e) => handleError(e));
		} else {
			setApplicantApps([]);
		}

		setSelectedAppId('');
		return () => {
			isMounted = false;
		};
	}, [selectedApplicant, handleError]);

	const handleSubmit = async () => {
		if (!selectedAppId || !startTime) {
			showAlert({ message: 'Please select an applicant, application, and start time.', type: 'warning' });
			return;
		}

		setLoading(true);
		try {
			const interviewStart = new Date(startTime);

			// Defaulting to 15-minute slots
			const interviewEnd = dayjs(interviewStart).add(15, 'minute').toDate();

			const result = await scheduleSingleInterview({
				applicationId: selectedAppId,
				startTime: interviewStart.toISOString(),
				endTime: interviewEnd.toISOString(),
			});

			showAlert({ message: result.data.message, type: 'success' });
			onSuccess();
		} catch (error) {
			handleError(error, 'Manual schedule submission failed.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<DialogTitle>Manually Schedule an Interview</DialogTitle>
			<DialogContent sx={{ minWidth: '500px' }}>
				<Autocomplete options={allApplicants} getOptionLabel={(option) => option.name} isOptionEqualToValue={(option, value) => option.id === value.id} onChange={(event, newValue) => setSelectedApplicant(newValue)} renderInput={(params) => <TextField {...params} label='Select Applicant' margin='normal' />} />

				<FormControl fullWidth margin='normal' disabled={!selectedApplicant}>
					<InputLabel id='select-app-label'>Select Application</InputLabel>
					<Select labelId='select-app-label' value={selectedAppId} label='Select Application' onChange={(e) => setSelectedAppId(e.target.value)}>
						{applicantApps.map((app) => (
							<MenuItem key={app.id} value={app.id}>
								{app.type} - {app.window}
							</MenuItem>
						))}
					</Select>
				</FormControl>

				<TextField label='Interview Start Time' type='datetime-local' fullWidth margin='normal' value={startTime} onChange={(e) => setStartTime(e.target.value)} InputLabelProps={{ shrink: true }} disabled={!selectedAppId} />
			</DialogContent>

			<DialogActions sx={{ p: '0 24px 24px' }}>
				<Button onClick={onClose} disabled={loading}>
					Close
				</Button>
				<Button variant='contained' onClick={handleSubmit} disabled={loading}>
					{loading ? <CircularProgress size={24} /> : 'Schedule Interview'}
				</Button>
			</DialogActions>
		</>
	);
};

ManualScheduler.propTypes = {
	onSuccess: PropTypes.func.isRequired,
	onClose: PropTypes.func.isRequired,
};

export default ManualScheduler;
