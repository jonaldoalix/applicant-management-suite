/**
 * PUBLIC RSVP HANDLER
 * ---------------------------------------------------------------------------
 * This page handles responses to Interview Invites via email links.
 *
 * * URL STRUCTURE:
 * /rsvp?interviewId={ID}&response={yes|no}
 *
 * * AUTHENTICATION:
 * This page is PUBLIC. It does not require a login. This ensures high conversion
 * rates for RSVPs as users often click these links from mobile devices.
 *
 * * LOGIC:
 * 1. Validates the URL parameters.
 * 2. Updates the specific Interview document in Firestore.
 * 3. Displays a success/error message to the user.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// UI Components
import { Box, Typography, Button, CircularProgress } from '@mui/material';

// Contexts & Config
import { useTitle } from '../../context/HelmetContext';
import { db } from '../../config/data/firebase';
import { InterviewStatus } from '../../config/data/collections';

export default function RSVP() {
	useTitle({ title: 'Interview RSVP', appear: false }); // Don't index this page

	// --- State & Hooks ---
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'invalid' | 'error'

	useEffect(() => {
		const interviewId = searchParams.get('interviewId');
		const response = searchParams.get('response');

		// 1. Validation: Ensure we have the necessary data
		if (!interviewId || !['yes', 'no'].includes(response)) {
			setStatus('invalid');
			return;
		}

		const updateRSVP = async () => {
			try {
				const ref = doc(db, 'interviews', interviewId);

				const dataToUpdate = {
					rsvpStatus: response,
					rsvpTimestamp: serverTimestamp(),
				};

				// 2. Status Logic
				if (response === 'yes') {
					// Confirmed: Ready for the schedule
					dataToUpdate.status = InterviewStatus.confirmed;
				} else {
					// No/Declined: Revert to 'invited' (or 'declined' depending on your flow).
					// Keeping it 'invited' often allows the admin to see they need to reschedule.
					dataToUpdate.status = InterviewStatus.invited;
				}

				await updateDoc(ref, dataToUpdate);
				setStatus('success');
			} catch (err) {
				console.error('Failed to record RSVP:', err);
				setStatus('error');
			}
		};

		updateRSVP();
	}, [searchParams]);

	// --- Render States ---

	if (status === 'loading') {
		return (
			<Box color='text.active' textAlign='center' width='100%' height='100vh' display='flex' flexDirection='column' justifyContent='center' alignItems='center'>
				<CircularProgress />
				<Typography variant='body2' sx={{ mt: 2 }}>
					Processing response...
				</Typography>
			</Box>
		);
	}

	if (status === 'invalid') {
		return (
			<Box color='text.active' textAlign='center' width='100%' height='100vh' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
				<Typography variant='h5' color='error'>
					Invalid Link
				</Typography>
				<Typography variant='body1'>The RSVP link you used is incomplete or expired.</Typography>
			</Box>
		);
	}

	if (status === 'error') {
		return (
			<Box color='text.active' textAlign='center' width='100%' height='100vh' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
				<Typography variant='h5' color='error'>
					System Error
				</Typography>
				<Typography variant='body1'>Something went wrong recording your response. Please try again later.</Typography>
			</Box>
		);
	}

	// Success State
	return (
		<Box color='text.active' textAlign='center' width='100%' height='100vh' display='flex' flexDirection='column' alignItems='center' justifyContent='center'>
			<Typography variant='h4' gutterBottom sx={{ color: 'success.main' }}>
				✅ RSVP Received
			</Typography>
			<Typography variant='body1' gutterBottom>
				Thank you! Your response has been recorded in our system.
			</Typography>
			<Button onClick={() => navigate('/')} variant='contained' sx={{ mt: 4 }}>
				Return Home
			</Button>
		</Box>
	);
}