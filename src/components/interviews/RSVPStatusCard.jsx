/**
 * RSVP Status Card
 * Applicant-facing component to manage interview invitations.
 * Features:
 * - Displays upcoming interviews.
 * - Handles RSVP actions (Confirm/Unavailable).
 * - "Add to Calendar" functionality (ICS generation).
 * - Gateway buttons to Waiting Room and Interview Room.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Chip, Menu, MenuItem } from '@mui/material';
import dayjs from 'dayjs';

// Firebase & Config
import { doc, updateDoc } from 'firebase/firestore';
import { db, generateICSDownloadURL, getRealTimeMeetings } from '../../config/data/firebase';
import { InterviewStatus } from '../../config/data/collections';

// Context
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';

const headerMessages = {
	unknown: 'Your interview is scheduled. Please confirm your attendance.',
	yes: 'Your interview is scheduled and confirmed.',
	no: 'Interviews are required. Accept the time if you can; contact us only if rescheduling is essential and we will do our best.',
};

const RSVPStatusCard = () => {
	const navigate = useNavigate();
	const { user } = useAuth();
	const { boxShadow } = useTheme();
	const { showAlert, handleError } = useAlert();

	const [interviews, setInterviews] = useState([]);
	const [loading, setLoading] = useState(true);
	const [anchorEls, setAnchorEls] = useState({});

	// Fetch interviews for the current user
	useEffect(() => {
		if (!user) return;
		setLoading(true);

		const unsubscribe = getRealTimeMeetings(user.uid, false, (updatedInterviews) => {
			setInterviews(updatedInterviews);
			setLoading(false);
		});

		return () => unsubscribe();
	}, [user]);

	const handleRSVP = async (interviewId, response) => {
		try {
			const interviewRef = doc(db, 'interviews', interviewId);
			const dataToUpdate = {
				rsvpStatus: response,
				rsvpTimestamp: new Date(),
				status: response === 'yes' ? InterviewStatus.confirmed : InterviewStatus.invited,
			};

			await updateDoc(interviewRef, dataToUpdate);

			// Optimistic update for UI responsiveness
			setInterviews((prev) => prev.map((iv) => (iv.id === interviewId ? { ...iv, ...dataToUpdate } : iv)));

			handleMenuClose(interviewId);
			showAlert({ message: 'RSVP updated successfully.', type: 'success' });
		} catch (error) {
			handleError(error, 'RSVP update failed');
		}
	};

	const handleMenuOpen = (event, id) => {
		setAnchorEls((prev) => ({ ...prev, [id]: event.currentTarget }));
	};

	const handleMenuClose = (id) => {
		setAnchorEls((prev) => ({ ...prev, [id]: null }));
	};

	if (loading || interviews.length === 0) return null;

	return (
		<Box display='flex' flexDirection='column' gap={3} width='90%' mb={2}>
			<Typography mb={1} variant='h6' fontWeight='bold' color='primary'>
				Interview Invites
			</Typography>

			{interviews.map((interview) => {
				const { rsvpStatus, status, startTime } = interview;
				const headerText = headerMessages[rsvpStatus] || 'Your interview is scheduled.';
				const anchorEl = anchorEls[interview.id] || null;

				return (
					<Box key={interview.id} alignSelf='center' p={2} border={1} borderRadius={2} borderColor='grey.300' boxShadow={boxShadow} maxWidth='450px' width='100%'>
						<Typography variant='h6' gutterBottom>
							{headerText}
						</Typography>

						<Box mt={1}>
							<Typography variant='body2'>
								<strong>Status:</strong> {status}
							</Typography>
							{startTime?.toDate && (
								<Typography variant='body2'>
									<strong>Date:</strong> {dayjs(startTime.toDate()).format('dddd, MMMM D, YYYY')}
								</Typography>
							)}
							{startTime?.toDate && (
								<Typography variant='body2'>
									<strong>Time:</strong> {dayjs(startTime.toDate()).format('h:mm A')}
								</Typography>
							)}
						</Box>

						{/* RSVP Controls */}
						<Box display='flex' gap={1} alignItems='center' justifyContent='center' mt={2}>
							{rsvpStatus === 'yes' && <Chip label='RSVP: Confirmed' color='success' onClick={(e) => handleMenuOpen(e, interview.id)} sx={{ cursor: 'pointer' }} />}
							{rsvpStatus === 'no' && <Chip label='RSVP: Unavailable' color='warning' onClick={(e) => handleMenuOpen(e, interview.id)} sx={{ cursor: 'pointer' }} />}
							{rsvpStatus === 'unknown' && (
								<>
									<Button variant='contained' onClick={() => handleRSVP(interview.id, 'yes')}>
										Confirm
									</Button>
									<Button variant='outlined' onClick={() => handleRSVP(interview.id, 'no')}>
										Unavailable
									</Button>
								</>
							)}

							<Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => handleMenuClose(interview.id)}>
								{rsvpStatus === 'yes' && <MenuItem onClick={() => handleRSVP(interview.id, 'no')}>Change to Unavailable</MenuItem>}
								{rsvpStatus === 'no' && <MenuItem onClick={() => handleRSVP(interview.id, 'yes')}>Change to Confirmed</MenuItem>}
							</Menu>
						</Box>

						{/* Action Buttons */}
						<Box display='flex' flexDirection='column' mt={2} gap={2}>
							{status === InterviewStatus.confirmed && (
								<Button fullWidth variant='outlined' onClick={() => navigate(`/interviews/waiting-room/${interview.id}`)}>
									Go to Waiting Room
								</Button>
							)}

							{status === InterviewStatus.inProgress && (
								<Button fullWidth variant='contained' color='success' onClick={() => navigate(`/interviews/interview-room/${interview.id}`)}>
									Join Interview Now
								</Button>
							)}

							{[InterviewStatus.scheduled, InterviewStatus.invited, InterviewStatus.confirmed].includes(status) && (
								<Button
									fullWidth
									variant='outlined'
									onClick={async () => {
										try {
											const url = await generateICSDownloadURL(interview);
											window.open(url, '_blank');
										} catch (error) {
											showAlert({ message: 'Could not fetch calendar invite. Try again later.', type: 'error' });
											console.error('ICS fetch error', error);
										}
									}}>
									Add to Calendar (Apple, Google, Outlook)
								</Button>
							)}
						</Box>
					</Box>
				);
			})}
		</Box>
	);
};

export default RSVPStatusCard;
