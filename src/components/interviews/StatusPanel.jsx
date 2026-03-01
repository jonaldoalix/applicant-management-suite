/**
 * Interview Status Panel
 * Admin-facing dashboard widget.
 * Features:
 * - Real-time summary of the day's interview stats (Scheduled, Completed, Missed).
 * - "Live" cards for In-Progress, Just Finished, and Up Next interviews.
 * - Quick access to Join Interview or Deliberation Room.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Box, Typography, Button, Card, CardContent, Divider, CircularProgress, Chip, keyframes } from '@mui/material';

// Firebase & Config
import { getRealTimeMeetings } from '../../config/data/firebase';
import { InterviewStatus } from '../../config/data/collections';

// Context
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const InterviewSummary = ({ summary }) => {
	if (!summary) return null;

	return (
		<Box sx={{ mb: 2 }}>
			<Box display='flex' flexWrap='wrap' gap={1} fontWeight={900} letterSpacing={1}>
				<Chip label={`Scheduled: ${summary.scheduled}`} color='primary' variant='outlined' />
				<Chip label={`Remaining: ${summary.remaining}`} color='info' variant='outlined' />
				<Chip label={`Completed: ${summary.completed}`} color='success' variant='outlined' />
				<Chip label={`Missed: ${summary.missed}`} color='error' variant='outlined' />
			</Box>
			{summary.scheduleDays.length > 0 && (
				<Typography variant='caption' color='text.active' display='block' sx={{ mt: 1 }}>
					Schedule covers: {summary.scheduleDays.join(', ')}
				</Typography>
			)}
		</Box>
	);
};

InterviewSummary.propTypes = {
	summary: PropTypes.shape({
		scheduled: PropTypes.number,
		remaining: PropTypes.number,
		completed: PropTypes.number,
		missed: PropTypes.number,
		scheduleDays: PropTypes.arrayOf(PropTypes.string),
	}),
};

export default function InterviewStatusPanel() {
	const { boxShadow } = useTheme();
	const { user } = useAuth();
	const navigate = useNavigate();

	const [inProgressInterview, setInProgressInterview] = useState(null);
	const [previousInterview, setPreviousInterview] = useState(null);
	const [nextInterview, setNextInterview] = useState(null);
	const [loading, setLoading] = useState(true);
	const [summaryData, setSummaryData] = useState(null);

	useEffect(() => {
		if (!user) return;
		setLoading(true);

		const unsubscribe = getRealTimeMeetings(user.uid, true, (updatedMeetings) => {
			const interviews = updatedMeetings.filter((m) => m.deliberation !== true);

			// Calculate Stats
			const scheduled = interviews.filter((m) => m.status === InterviewStatus.scheduled || m.status === InterviewStatus.confirmed).length;
			const completed = interviews.filter((m) => m.status === InterviewStatus.completed).length;
			const missed = interviews.filter((m) => m.status === InterviewStatus.missed).length;

			const scheduleDays = [
				...new Set(
					interviews
						.filter((m) => m.status === InterviewStatus.scheduled || m.status === InterviewStatus.confirmed)
						.map((m) => (m.startTime?.toDate ? dayjs(m.startTime.toDate()).format('ddd, MMM D') : ''))
						.filter(Boolean)
				),
			];

			setSummaryData({
				scheduled,
				completed,
				missed,
				remaining: scheduled,
				scheduleDays,
			});

			// Identify Key Interviews
			const inProgress = interviews.find((m) => m.status === InterviewStatus.inProgress);

			const mostRecentCompleted = interviews.filter((m) => m.status === InterviewStatus.completed).sort((a, b) => (b.startTime?.toDate?.() || 0) - (a.startTime?.toDate?.() || 0));

			const nextUpcoming = interviews.filter((m) => m.status === InterviewStatus.confirmed).sort((a, b) => (a.startTime?.toDate?.() || 0) - (b.startTime?.toDate?.() || 0));

			setInProgressInterview(inProgress || null);
			setPreviousInterview(mostRecentCompleted.length > 0 ? mostRecentCompleted[0] : null);
			setNextInterview(nextUpcoming.length > 0 ? nextUpcoming[0] : null);
			setLoading(false);
		});

		return () => unsubscribe();
	}, [user]);

	const handleJoinInterview = (interviewId) => {
		if (!interviewId) return;
		navigate(`/interviews/interview-room/${interviewId}`);
	};

	const handleJoinDeliberation = () => {
		navigate('/interviews/deliberation-room');
	};

	if (loading) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '200px' }}>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box
			sx={{
				px: 3,
				py: 2,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'start',
				alignItems: 'center',
				width: '100%',
				bgcolor: 'background.paper',
				boxShadow: boxShadow,
				borderRadius: '12px',
			}}>
			<Typography fontWeight='bold' fontSize='15px' color='text.secondary' mb={2} alignSelf='start'>
				LIVE INTERVIEW STATUS
			</Typography>

			<InterviewSummary summary={summaryData} />

			<Divider sx={{ mb: 2, width: '100%' }} />

			{/* In Progress Card */}
			{inProgressInterview ? (
				<Card sx={{ mb: 2, border: '1px solid', borderColor: 'success.main', width: '100%', boxShadow: boxShadow, borderRadius: '12px', bgcolor: 'background.paper', color: 'text.primary' }}>
					<CardContent>
						<Typography variant='overline' color='success.main' fontWeight='bold'>
							Interview In Progress
						</Typography>
						<Typography variant='body1' fontWeight='bold'>
							{inProgressInterview.displayName}
						</Typography>
						<Button fullWidth variant='contained' color='success' sx={{ mt: 1 }} onClick={() => handleJoinInterview(inProgressInterview.id)}>
							Join Now
						</Button>
					</CardContent>
				</Card>
			) : (
				/* Just Finished Card */
				<Card sx={{ mb: 2, width: '100%', boxShadow: boxShadow, borderRadius: '12px', bgcolor: 'background.paper', color: 'text.primary' }}>
					<CardContent>
						<Typography variant='overline' color='text.secondary'>
							Just Finished
						</Typography>
						{previousInterview ? (
							<>
								<Typography variant='h6'>{previousInterview.displayName}</Typography>
								<Typography variant='body2' color='text.secondary'>
									Status: {previousInterview.status}
								</Typography>
							</>
						) : (
							<Typography variant='body2' sx={{ fontStyle: 'italic', mt: 1 }}>
								No recent interviews.
							</Typography>
						)}
					</CardContent>
				</Card>
			)}

			{/* Up Next Card */}
			<Card sx={{ mb: 2, width: '100%', boxShadow: boxShadow, borderRadius: '12px', bgcolor: 'background.paper', color: 'text.primary' }}>
				<CardContent>
					<Typography variant='overline' color='text.secondary'>
						Up Next
					</Typography>
					{nextInterview ? (
						<>
							<Typography variant='h6'>{nextInterview.displayName}</Typography>
							<Typography variant='body2' color='text.secondary'>
								Scheduled: {nextInterview.startTime?.toDate ? dayjs(nextInterview.startTime.toDate()).format('ddd, MM/DD @ h:mm A') : 'TBD'}
							</Typography>
						</>
					) : (
						<Typography variant='body2' sx={{ fontStyle: 'italic', mt: 1 }}>
							No upcoming interviews.
						</Typography>
					)}
				</CardContent>
			</Card>

			{/* Deliberation Button */}
			<Button
				fullWidth
				variant='contained'
				onClick={handleJoinDeliberation}
				sx={{
					animation: `${pulse} 2s ease-in-out infinite`,
					mt: 1,
				}}>
				{inProgressInterview ? 'Wait in Deliberation Room' : 'Join Deliberation Room'}
			</Button>
		</Box>
	);
}
