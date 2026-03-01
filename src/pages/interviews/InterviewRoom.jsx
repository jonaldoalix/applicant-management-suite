/**
 * INTERVIEW ROOM (Active Stage)
 * ---------------------------------------------------------------------------
 * This is the main video conferencing interface for conducting interviews.
 *
 * * ARCHITECTURE:
 * 1. Security: Uses 'generateJoinToken' to get a signed JWT from the backend.
 * This ensures only authorized users (Owner vs. Guest) enter with correct permissions.
 * 2. Real-Time Status: Watches Firestore. If the interview status changes to
 * 'completed', it triggers the post-interview workflow.
 * 3. Integrated Workspace: Renders the video call in the center, with collapsible
 * drawers for Admin Controls (left) and Applicant Documents (right).
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DailyProvider } from '@daily-co/daily-react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

// UI Components
import { Box, Typography, Card, CardContent, Button, useTheme } from '@mui/material';
import { CheckCircleOutline } from '@mui/icons-material';
import Loader from '../../components/loader/Loader';
import AdminDrawer from '../../components/interviews/AdminDrawer';
import ApplicationViewer from '../../components/interviews/ApplicationViewer';
import CallUI from '../../components/interviews/CallInterface';

// Contexts
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import { useMeeting } from '../../context/MeetingContext';
import { useTitle } from '../../context/HelmetContext';
import { useConfig } from '../../context/ConfigContext';

// Backend & Config
import { db, generateJoinToken } from '../../config/data/firebase';
import { InterviewStatus, collections } from '../../config/data/collections';

// Layout Constants
const adminDrawerWidth = 320;
const appViewerDrawerWidth = 1100;

// Error Messages
const Errors = {
	invalidID: 'Please supply an Interview ID.',
	notFound: 'Interview was not found.',
	loadFail: 'Failed to load interview data.',
};

// --- Helper: Exit Routing ---
const getReturnDestination = (member, applicant) => {
	if (member) return '/members/interviews/dashboard';
	if (applicant) return '/apply';
	return '/home';
};

/**
 * Sub-Component: Displayed when the interview is over.
 */
const InterviewEnded = () => {
	const navigate = useNavigate();
	const { member, applicant } = useAuth();
	const destination = getReturnDestination(member, applicant);

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', p: 3 }}>
			<Card sx={{ maxWidth: 500, p: 4 }}>
				<CardContent>
					<CheckCircleOutline color='success' sx={{ fontSize: 60, mb: 2 }} />
					<Typography variant='h4' gutterBottom>
						Interview Concluded
					</Typography>
					<Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
						This interview session has ended. Thank you for your participation.
					</Typography>
					<Button variant='contained' onClick={() => navigate(destination)}>
						Return to Dashboard
					</Button>
				</CardContent>
			</Card>
		</Box>
	);
};

// =============================================================================
//  MAIN COMPONENT
// =============================================================================

export default function InterviewRoom() {
	useTitle({ title: 'Interview Room', appear: false });

	// --- Hooks & Contexts ---
	const { interviewId } = useParams();
	const navigate = useNavigate();
	const theme = useTheme();
	const config = useConfig();

	// Global State
	const { callObject, videoDeviceId, audioDeviceId, setParticipantDetails } = useMeeting();
	const { user, member } = useAuth();
	const { showAlert, handleError } = useAlert();

	// Local State
	const [error, setError] = useState(null);
	const [loading, setLoading] = useState(true);
	const [interviewStatus, setInterviewStatus] = useState(null);
	const [applicationData, setApplicationData] = useState([]); // Documents to show in Right Drawer

	// UI State
	const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);
	const [isAppDrawerOpen, setIsAppDrawerOpen] = useState(false);
	const [isOwner, setIsOwner] = useState(false); // Does user have Host permissions?

	// --- Helper 1: Fetch Applicant Documents ---
	// Loads the application PDFs so admins can reference them during the call.
	const fetchFullApplicantDetails = useCallback(async (applicant) => {
		if (!applicant?.applications) return;

		// Fetch all application documents linked to this applicant
		const fullApplications = await Promise.all(applicant.applications.map((id) => getDoc(doc(db, collections.applications, id)).then((snap) => ({ id, ...snap.data() }))));
		setApplicationData(fullApplications.map((app) => app.id));
	}, []);

	// --- Helper 2: Fetch Participant Profile Picture ---
	const fetchAndSetMemberPicture = useCallback(
		async (participant) => {
			if (!participant?.user_id) return;

			try {
				const memberRef = doc(db, collections.members, participant.user_id);
				const memberSnap = await getDoc(memberRef);

				if (memberSnap.exists()) {
					const pictureUrl = memberSnap.data().picture?.home || null;
					if (pictureUrl) {
						setParticipantDetails((prev) => ({
							...prev,
							[participant.session_id]: {
								...prev[participant.session_id],
								pictureUrl: pictureUrl,
							},
						}));
					}
				}
			} catch (err) {
				console.error(`Failed to fetch member data for participant ${participant.user_id}:`, err);
			}
		},
		[setParticipantDetails]
	);

	const handleToggleAppDrawer = () => {
		setIsAppDrawerOpen((prev) => !prev);
	};

	// --- Effect 1: Interview Data Sync ---
	// Subscribes to the specific interview document in Firestore.
	useEffect(() => {
		if (!interviewId) {
			setError(Errors.invalidID);
			setLoading(false);
			return;
		}

		const interviewRef = doc(db, 'interviews', interviewId);
		const unsubscribe = onSnapshot(
			interviewRef,
			(interviewSnap) => {
				if (interviewSnap.exists()) {
					const interviewData = interviewSnap.data();
					setInterviewStatus(interviewData.status);

					// Logic Gate: Only load the video call if status is 'In Progress'
					if (interviewData.status !== InterviewStatus.inProgress) {
						setLoading(false);
					}

					// If user is an Admin, fetch the Applicant's details for the side drawer
					if (member && interviewData.applicantId && applicationData.length === 0) {
						const appRef = doc(db, collections.applicants, interviewData.applicantId);
						getDoc(appRef)
							.then((appSnap) => {
								if (appSnap.exists()) {
									fetchFullApplicantDetails(appSnap.data());
								}
							})
							.catch((err) => {
								handleError(err, 'fetch-applicant-details');
							});
					}
				} else {
					setError(Errors.notFound);
					setLoading(false);
				}
			},
			(err) => {
				setError(Errors.loadFail);
				setLoading(false);
			}
		);

		return () => unsubscribe();
	}, [interviewId, member, applicationData.length, fetchFullApplicantDetails, handleError]);

	// --- Effect 2: Join Video Call ---
	// Generates token and joins Daily.co room when status becomes 'In Progress'.
	useEffect(() => {
		if (!callObject || !user || !interviewId || interviewStatus !== InterviewStatus.inProgress) {
			return;
		}

		const setupAndJoin = async () => {
			setLoading(true);
			try {
				// Request signed JWT from backend
				const result = await generateJoinToken({ interviewId });
				const { token, roomUrl } = result.data;

				if (!token || !roomUrl) throw new Error('Invalid token or roomUrl received.');

				callObject.on('joined-meeting', () => {
					const localParticipant = callObject.participants().local;
					fetchAndSetMemberPicture(localParticipant);

					if (localParticipant?.owner) {
						setIsOwner(true);
					}
					setLoading(false);
				});

				// Cleanup any stale state before joining
				if (callObject.meetingState() !== 'left-meeting') {
					await callObject.leave();
				}

				await callObject.join({
					url: roomUrl,
					token: token,
					videoSource: videoDeviceId || true,
					audioSource: audioDeviceId || true,
				});
			} catch (err) {
				console.error('Setup and join failed:', err);
				setError(err.message);
				setLoading(false);
			}
		};

		setupAndJoin();
	}, [callObject, user, interviewId, interviewStatus, videoDeviceId, audioDeviceId, setParticipantDetails, fetchAndSetMemberPicture]);

	// --- Effect 3: Participant Event Listeners ---
	useEffect(() => {
		if (!callObject) return;

		const handleParticipantJoined = (event) => {
			if (event.participant.local) return;
			fetchAndSetMemberPicture(event.participant);
		};

		const handleAppMessage = (event) => {
			const { data, fromId } = event;
			if (data.type === 'USER_DETAILS') {
				setParticipantDetails((prev) => ({
					...prev,
					[fromId]: data.payload,
				}));
			}
		};

		const handleParticipantUpdated = (event) => {
			const participant = event.participant;
			if (participant.user_name) {
				setParticipantDetails((prev) => ({
					...prev,
					[participant.session_id]: {
						...prev[participant.session_id],
						role: participant.user_data?.role || prev[participant.session_id]?.role,
						pictureUrl: participant.user_data?.picture_url || prev[participant.session_id]?.pictureUrl,
					},
				}));
			}
		};

		const handleParticipantLeft = (event) => {
			setParticipantDetails((prev) => {
				const newDetails = { ...prev };
				delete newDetails[event.participant.session_id];
				return newDetails;
			});
		};

		callObject.on('participant-joined', handleParticipantJoined);
		callObject.on('app-message', handleAppMessage);
		callObject.on('participant-updated', handleParticipantUpdated);
		callObject.on('participant-left', handleParticipantLeft);

		return () => {
			callObject.off('participant-joined', handleParticipantJoined);
			callObject.off('app-message', handleAppMessage);
			callObject.off('participant-updated', handleParticipantUpdated);
			callObject.off('participant-left', handleParticipantLeft);
		};
	}, [callObject, setParticipantDetails, fetchAndSetMemberPicture]);

	// --- Effect 4: End of Interview Handler ---
	useEffect(() => {
		let navigationTimer;

		const handleInterviewEnd = async () => {
			if (callObject && callObject.meetingState() !== 'left-meeting') {
				await callObject.leave();
			}

			if (!member) {
				return;
			}

			// Auto-Redirect Logic:
			// If configured, automatically move admins to the Deliberation Room
			try {
				if (config.AUTO_DELIBERATE === true) {
					showAlert({ message: 'Proceeding to deliberation room in 5 seconds...', type: 'info' });
					navigationTimer = setTimeout(() => {
						navigate('/interviews/deliberation-room');
					}, 5000);
				}
			} catch (err) {
				console.error('Could not get post-interview action:', err);
			}
		};

		const terminalStates = [InterviewStatus.completed, InterviewStatus.cancelled, InterviewStatus.missed];
		if (terminalStates.includes(interviewStatus)) {
			handleInterviewEnd();
		}

		return () => {
			clearTimeout(navigationTimer);
		};
	}, [interviewStatus, callObject, member, navigate, showAlert, config.AUTO_DELIBERATE]);

	// --- Render States ---

	if (loading) {
		return <Loader label='Joining interview room...' />;
	}

	if ([InterviewStatus.completed, InterviewStatus.cancelled, InterviewStatus.missed].includes(interviewStatus)) {
		return <InterviewEnded />;
	}

	if (error) {
		return (
			<Box width='100%' height='100vh' boxSizing='border-box' display='flex' flexDirection='column' justifyContent='center' alignItems='center' p={3} textAlign='center'>
				<Typography variant='h6' color='error'>
					Could not join meeting
				</Typography>
				<Typography color='text.active'>{error}</Typography>
			</Box>
		);
	}

	return (
		<DailyProvider callObject={callObject}>
			<Box sx={{ display: 'flex' }}>
				{/* LEFT: Admin Controls */}
				<AdminDrawer open={isAdminDrawerOpen} onClose={() => setIsAdminDrawerOpen(false)} interviewId={interviewId} isAdmin={isOwner} onViewApplication={() => {}} onStartNextInterview={() => {}} isDeliberation={false} />

				{/* CENTER: Video Call */}
				<Box
					component='main'
					sx={{
						flexGrow: 1,
						transition: theme.transitions.create('margin', {
							easing: theme.transitions.easing.sharp,
							duration: theme.transitions.duration.leavingScreen,
						}),
						marginLeft: `-${adminDrawerWidth}px`,
						...(isAdminDrawerOpen && {
							transition: theme.transitions.create('margin', {
								easing: theme.transitions.easing.easeOut,
								duration: theme.transitions.duration.enteringScreen,
							}),
							marginLeft: 0,
						}),
						marginRight: `-${appViewerDrawerWidth}px`,
						...(isAppDrawerOpen && {
							transition: theme.transitions.create('margin', {
								easing: theme.transitions.easing.easeOut,
								duration: theme.transitions.duration.enteringScreen,
							}),
							marginRight: 0,
						}),
					}}>
					<CallUI isAdmin={isOwner} onOpenDrawer={handleToggleAppDrawer} onOpenAdminDrawer={() => setIsAdminDrawerOpen((prev) => !prev)} isInterview={true} />
				</Box>

				{/* RIGHT: Application Documents */}
				<ApplicationViewer open={isAppDrawerOpen} onClose={() => setIsAppDrawerOpen(false)} applications={applicationData} />
			</Box>
		</DailyProvider>
	);
}