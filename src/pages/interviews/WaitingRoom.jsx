/**
 * INTERVIEW WAITING ROOM (Pre-Flight Lobby)
 * ---------------------------------------------------------------------------
 * This page is the "Green Room" where applicants wait before their interview.
 *
 * * OBJECTIVES:
 * 1. Tech Check: Force the user to grant Camera/Mic permissions and verify devices work.
 * 2. Identity Verification: Displays who the interview is for and when it is scheduled.
 * 3. Auto-Admission: Listens to Firestore. When status -> 'inProgress', redirects to the call.
 *
 * * CRITICAL LOGIC:
 * - 'requestMediaAccess': Tries to get Video+Audio. If that fails, tries them individually
 * to provide better error messages (e.g., "Your Mic works, but Camera is blocked").
 */

import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

// Firebase & Data
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, getRealTimeDocument } from '../../config/data/firebase';
import { collections, InterviewStatus } from '../../config/data/collections';

// UI Components
import { Box, Typography, Card, CardContent, CircularProgress, Grid, Button, ButtonGroup, Alert, AlertTitle, Divider, keyframes, Select, MenuItem, FormControl, InputLabel, IconButton, Menu } from '@mui/material';
import { HelpOutline, Videocam, VideocamOff, Mic, MicOff, CheckCircleOutline, LightModeOutlined as LightModeIcon, DarkModeOutlined as DarkModeIcon, PaletteOutlined as ColorIcon } from '@mui/icons-material';

// Contexts & Assets
import { SettingsButton } from '../../components/breadcrumbs/Breadcrumbs';
import { useTheme } from '../../context/ThemeContext';
import { Assets, brand } from '../../config/Constants';
import { useMeeting } from '../../context/MeetingContext';
import { useTitle } from '../../context/HelmetContext';
import { useAuth } from '../../context/AuthContext';

dayjs.extend(duration);

// --- Animation ---
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

// =============================================================================
//  HELPER: Media Request Logic
// =============================================================================

/**
 * Robustly requests media permissions.
 * Tries getting both streams. If that fails, tries them individually to diagnose the issue.
 */
const requestMediaAccess = async () => {
	let mainStream = null,
		videoStream = null,
		audioStream = null;

	try {
		// Try to get BOTH devices at once (Best Case)
		mainStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
	} catch (err) {
		console.warn('Initial video/audio request failed:', err.name);

		// Fallback: Try Video Only
		if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
			try {
				videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
			} catch (e) {
				console.warn('Video-only fallback failed:', e.name);
			}

			// Fallback: Try Audio Only
			try {
				audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			} catch (e) {
				console.warn('Audio-only fallback failed:', e.name);
			}
		} else if (err.name === 'NotAllowedError') {
			throw new Error('You blocked camera and/or microphone access. Please allow it in your browser settings.');
		} else {
			throw err;
		}
	}
	return { mainStream, videoStream, audioStream };
};

const getDeviceErrorMessage = (err) => {
	if (err.message === 'No camera found.') return 'No camera found. Please connect your camera and try again.';
	if (err.message === 'No microphone found.') return 'No microphone found. Please connect your microphone and try again.';
	if (err.message.includes('blocked')) return err.message;
	if (err.name === 'NotAllowedError') return 'Could not get permissions. Please allow camera and microphone access in your browser settings.';
	if (err.name === 'NotReadableError') return 'Your camera or mic is already in use by another application. Please close it and try again.';
	return err.message || 'An unknown error occurred while trying to access your devices.';
};

// =============================================================================
//  SUB-COMPONENT: Device Preview
// =============================================================================

const DevicePreview = ({ setDeviceStatus }) => {
	const videoRef = useRef(null);
	const streamRef = useRef(null);
	const { videoDeviceId, setVideoDeviceId, audioDeviceId, setAudioDeviceId } = useMeeting();

	const [error, setError] = useState(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [permissionsGranted, setPermissionsGranted] = useState(false);
	const [videoDevices, setVideoDevices] = useState([]);
	const [audioInDevices, setAudioInDevices] = useState([]);
	const [isCamOn, setIsCamOn] = useState(true);
	const [isMicOn, setIsMicOn] = useState(true);

	const getPermissionsAndDevices = async () => {
		setIsProcessing(true);
		setDeviceStatus('requesting');
		setError(null);
		let granted = false;
		let streams = {};

		try {
			if (!navigator.mediaDevices?.getUserMedia) {
				throw new Error('Your browser does not support media device access.');
			}

			// 1. Request Permissions
			streams = await requestMediaAccess();

			// 2. Enumerate Devices
			const devices = await navigator.mediaDevices.enumerateDevices();
			const videoInputs = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
			const audioInputs = devices.filter((d) => d.kind === 'audioinput' && d.deviceId);

			if (videoInputs.length === 0) throw new Error('No camera found.');
			if (audioInputs.length === 0) throw new Error('No microphone found.');

			setVideoDevices(videoInputs);
			setAudioInDevices(audioInputs);

			// 3. Set Defaults
			if (videoInputs.length > 0 && !videoDeviceId) setVideoDeviceId(videoInputs[0].deviceId);
			if (audioInputs.length > 0 && !audioDeviceId) setAudioDeviceId(audioInputs[0].deviceId);

			setPermissionsGranted(true);
			granted = true;
		} catch (err) {
			console.error('Error getting device permissions:', err.name, err.message);
			setError(getDeviceErrorMessage(err));
			setDeviceStatus('error');
		} finally {
			setIsProcessing(false);
			if (granted) setDeviceStatus('granted');

			// Stop streams after enumeration to release the device lock
			const { mainStream, videoStream, audioStream } = streams;
			[mainStream, videoStream, audioStream].forEach((stream) => {
				stream?.getTracks().forEach((track) => track.stop());
			});
		}
	};

	// Start the actual preview stream once permissions are granted and devices selected
	useEffect(() => {
		const startPreview = async () => {
			setIsProcessing(true);
			setError(null);

			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
			}

			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { deviceId: videoDeviceId ? { exact: videoDeviceId } : undefined },
					audio: { deviceId: audioDeviceId ? { exact: audioDeviceId } : undefined },
				});

				if (videoRef.current) {
					videoRef.current.srcObject = stream;
				}
				streamRef.current = stream;
				setDeviceStatus('granted');
			} catch (err) {
				console.error('Device preview error:', err);
				setError('Could not start devices. Please check that they are not in use by another application.');
				setDeviceStatus('error');
			} finally {
				setIsProcessing(false);
			}
		};

		if (permissionsGranted && videoDeviceId && audioDeviceId) {
			startPreview();
		}
	}, [permissionsGranted, videoDeviceId, audioDeviceId, setDeviceStatus]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop());
			}
		};
	}, []);

	const toggleVideo = () => {
		if (streamRef.current) {
			streamRef.current.getVideoTracks()[0].enabled = !isCamOn;
			setIsCamOn(!isCamOn);
		}
	};

	const toggleAudio = () => {
		if (streamRef.current) {
			streamRef.current.getAudioTracks()[0].enabled = !isMicOn;
			setIsMicOn(!isMicOn);
		}
	};

	if (!permissionsGranted) {
		return (
			<Box>
				<Typography variant='body1' sx={{ mb: 2 }}>
					Let's make sure your gear is working perfectly. We'll test your camera and microphone.
				</Typography>
				{error && (
					<Alert severity='error' sx={{ mb: 2 }}>
						<AlertTitle>Device Error</AlertTitle>
						{error}
					</Alert>
				)}
				<Button fullWidth variant='contained' size='large' disabled={isProcessing} onClick={getPermissionsAndDevices} sx={{ py: 1.5, color: 'custom.brightWhite' }}>
					{isProcessing ? 'Requesting...' : 'Setup Camera & Mic'}
				</Button>
			</Box>
		);
	}

	return (
		<Box>
			<Alert icon={false} variant='standard' severity={error ? 'error' : 'success'} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: 3, mb: 2 }}>
				{error ?? (
					<>
						<CheckCircleOutline sx={{ color: 'text.active' }} />
						<Typography variant='h6' sx={{ fontWeight: 'bold' }}>
							Devices Connected!
						</Typography>
						<Typography variant='body1'>You look great! We'll use these settings for the interview.</Typography>
					</>
				)}
			</Alert>
			<Box component='video' ref={videoRef} autoPlay muted playsInline sx={{ width: '100%', borderRadius: 2, backgroundColor: 'black', transform: 'scaleX(-1)', minHeight: '200px' }} />

			<Box display='flex' flexDirection='column' gap={2} mt={2}>
				<FormControl fullWidth>
					<InputLabel>Camera</InputLabel>
					<Select value={videoDeviceId || ''} label='Camera' onChange={(e) => setVideoDeviceId(e.target.value)}>
						{videoDevices.map((d) => (
							<MenuItem key={d.deviceId} value={d.deviceId}>
								{d.label}
							</MenuItem>
						))}
					</Select>
				</FormControl>
				<FormControl fullWidth>
					<InputLabel>Microphone</InputLabel>
					<Select value={audioDeviceId || ''} label='Microphone' onChange={(e) => setAudioDeviceId(e.target.value)}>
						{audioInDevices.map((d) => (
							<MenuItem key={d.deviceId} value={d.deviceId}>
								{d.label}
							</MenuItem>
						))}
					</Select>
				</FormControl>
				<ButtonGroup variant='contained' fullWidth>
					<Button onClick={toggleAudio} color={isMicOn ? 'primary' : 'error'}>
						{isMicOn ? <Mic /> : <MicOff />}
					</Button>
					<Button onClick={toggleVideo} color={isCamOn ? 'primary' : 'error'}>
						{isCamOn ? <Videocam /> : <VideocamOff />}
					</Button>
				</ButtonGroup>
			</Box>
		</Box>
	);
};

DevicePreview.propTypes = {
	setDeviceStatus: PropTypes.func.isRequired,
};

// =============================================================================
//  MAIN COMPONENT: WaitingRoom
// =============================================================================

export default function WaitingRoom() {
	useTitle({ title: 'Waiting Room', appear: false });
	const { interviewId } = useParams();
	const navigate = useNavigate();
	const { darkMode, primaryColor, dispatch } = useTheme();
	const { applicant } = useAuth();

	const [interviewInfo, setInterviewInfo] = useState(null);
	const [isConnecting, setIsConnecting] = useState(false);
	const [redirectCountdown, setRedirectCountdown] = useState(10);
	const [countdown, setCountdown] = useState('');
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [deviceStatus, setDeviceStatus] = useState('idle');
	const [anchorEl, setAnchorEl] = useState(null);
	const colorMenuOpen = Boolean(anchorEl);

	const themeColors = [
		{ key: 'green', label: 'Green Theme' },
		{ key: 'blue', label: 'Blue Theme' },
		{ key: 'brown', label: 'Brown Theme' },
		{ key: 'red', label: 'Red Theme' },
		{ key: 'yellow2', label: 'Yellow Theme' },
	];

	const handleColorMenuOpen = (event) => setAnchorEl(event.currentTarget);
	const handleColorMenuClose = () => setAnchorEl(null);
	const handleColorSelect = (color) => {
		dispatch({ type: 'SET_COLOR', payload: color });
		handleColorMenuClose();
	};

	// --- Effect 1: Load Initial Data ---
	useEffect(() => {
		const controller = new AbortController();
		const signal = controller.signal;

		const fetchInitialInfo = async () => {
			if (!interviewId) {
				if (!signal.aborted) {
					setError('No interview ID was provided in the URL.');
					setIsLoading(false);
				}
				return;
			}

			setIsLoading(true);

			try {
				const interviewRef = doc(db, collections.interviews, interviewId);
				const interviewSnap = await getDoc(interviewRef);

				if (signal.aborted) return;

				if (!interviewSnap.exists()) {
					setError('This interview could not be found. It may have been canceled or the link is incorrect.');
					return;
				}

				const interviewData = interviewSnap.data();
				const applicantRef = doc(db, collections.applicants, interviewData.applicantId);
				const applicantSnap = await getDoc(applicantRef);

				if (signal.aborted) return;

				const applicantData = applicantSnap.exists() ? applicantSnap.data() : {};

				setInterviewInfo({
					fullName: `${applicantData.firstName || ''} ${applicantData.lastName || ''}`.trim(),
					scheduledTime: interviewData.startTime?.toDate?.() || null,
					...interviewData,
				});
			} catch (err) {
				if (!signal.aborted) {
					console.error('Error loading interview info:', err);
					setError('An error occurred while fetching interview details.');
				}
			} finally {
				if (!signal.aborted) {
					setIsLoading(false);
				}
			}
		};
		fetchInitialInfo();

		return () => controller.abort();
	}, [interviewId]);

	// --- Effect 2: Mark Applicant as Present ---
	// Sets 'applicantPresent: true' in Firestore so Admins know they are in the Waiting Room
	useEffect(() => {
		if (!interviewId) return;
		const interviewRef = doc(db, collections.interviews, interviewId);
		updateDoc(interviewRef, { applicantPresent: true }).catch((err) => console.error('Failed to mark applicant as present:', err));
		return () => {
			updateDoc(interviewRef, { applicantPresent: false }).catch((err) => console.error('Failed to unmark applicant as present:', err));
		};
	}, [interviewId]);

	// --- Effect 3: Listen for "Start Interview" ---
	// Watches for status -> 'inProgress'
	useEffect(() => {
		if (!interviewId || error) return;
		const unsubscribe = getRealTimeDocument(collections.interviews, interviewId, (interviewData) => {
			if (interviewData) {
				setInterviewInfo((prevInfo) => ({ ...prevInfo, ...interviewData }));
				if (interviewData.status === InterviewStatus.inProgress && !isConnecting) {
					setIsConnecting(true);
				}
			}
		});
		return () => unsubscribe?.();
	}, [interviewId, error, isConnecting]);

	// --- Effect 4: Auto-Redirect Timer ---
	useEffect(() => {
		if (isConnecting) {
			if (redirectCountdown > 0) {
				const timer = setTimeout(() => setRedirectCountdown((prev) => prev - 1), 1000);
				return () => clearTimeout(timer);
			} else {
				navigate(`/interviews/interview-room/${interviewId}`);
			}
		}
	}, [isConnecting, redirectCountdown, navigate, interviewId]);

	// --- Effect 5: Countdown to Scheduled Time ---
	useEffect(() => {
		if (!interviewInfo?.scheduledTime) return;
		const countdownInterval = setInterval(() => {
			const now = dayjs();
			const scheduled = dayjs(interviewInfo.scheduledTime);
			if (now.isAfter(scheduled)) {
				setCountdown('Your interview should begin shortly.');
			} else {
				const diff = dayjs.duration(scheduled.diff(now));
				setCountdown(`Interview begins in: ${diff.hours()}h ${diff.minutes()}m ${diff.seconds()}s`);
			}
		}, 1000);
		return () => clearInterval(countdownInterval);
	}, [interviewInfo]);

	// --- Render States ---

	const getStatusMessage = () => {
		if (interviewInfo?.status === InterviewStatus.inProgress) {
			return 'Connecting...';
		}
		if (deviceStatus === 'idle') return 'Please use the panel above to check your devices.';
		if (deviceStatus === 'requesting') return 'Please grant permission to access your camera and mic.';
		if (deviceStatus === 'granted') return 'All set! The committee will start the interview soon. Please standby.';
		if (deviceStatus === 'error') return 'There seems to be an issue with your devices. Please check the panel above.';
		return 'The committee will start the interview soon. Please standby.';
	};

	if (isLoading) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
				<CircularProgress />
			</Box>
		);
	}

	if (error) {
		return (
			<Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
				<Alert severity='error' variant='filled'>
					<AlertTitle>Interview Not Found</AlertTitle>
					{error} You will be redirected shortly.
				</Alert>
			</Box>
		);
	}

	return (
		<Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, bgcolor: 'background.passive', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
			{/* Theme & Settings Header */}
			<Box
				sx={{
					position: 'fixed',
					top: { xs: 16, md: 32 },
					right: { xs: 16, md: 32 },
					zIndex: 1100,
					display: 'flex',
					gap: 2,
				}}>
				<SettingsButton applicant={applicant} />
				<IconButton sx={{ width: '40px', height: '40px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'secondary.main', bgcolor: darkMode ? 'primary.main' : 'background.passive', '&:hover': { bgcolor: `${primaryColor}.dark` } }} onClick={handleColorMenuOpen}>
					<ColorIcon sx={{ color: darkMode ? 'text.active' : 'primary.main' }} />
				</IconButton>
				<IconButton sx={{ width: '40px', height: '40px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'secondary.main' }} onClick={() => dispatch({ type: 'TOGGLE' })}>
					{darkMode ? <LightModeIcon color='secondary' /> : <DarkModeIcon color='secondary' />}
				</IconButton>
			</Box>
			<Menu sx={{ mt: 1 }} anchorEl={anchorEl} open={colorMenuOpen} onClose={handleColorMenuClose}>
				{themeColors.map((color) => (
					<MenuItem sx={{ bgcolor: darkMode ? 'custom.black' : 'background.paper' }} selected={color.key === primaryColor} key={color.key} onClick={() => handleColorSelect(color.key)}>
						{color.label}
					</MenuItem>
				))}
			</Menu>

			<Typography variant='h3' color='text.active' gutterBottom align='center' sx={{ mb: 4, fontWeight: 'bold' }}>
				Interview Waiting Room
			</Typography>

			{/* Main Content Grid */}
			<Grid container spacing={4} justifyContent='center' sx={{ maxWidth: '900px' }}>
				{/* 1. Interview Details */}
				<Grid item xs={12}>
					<Card>
						<CardContent sx={{ p: 4 }}>
							<Typography variant='h5' gutterBottom sx={{ fontWeight: '600' }}>
								Interview Details
							</Typography>
							<Typography variant='body1'>
								<b>Applicant:</b> {interviewInfo?.fullName || 'Loading...'}
							</Typography>
							<Typography variant='body1' sx={{ mb: 1 }}>
								<b>Scheduled:</b> {interviewInfo?.scheduledTime?.toLocaleString() || 'N/A'}
							</Typography>
						</CardContent>
					</Card>
				</Grid>

				{/* 2. Device Check & Instructions */}
				<Grid item xs={12}>
					<Card>
						<CardContent sx={{ p: { xs: 2, md: 4 } }}>
							<Box textAlign='center' mb={2}>
								<img src={Assets.header} alt='Header' style={{ maxWidth: '400px', width: '80%', filter: darkMode ? 'invert(0.88)' : 'none' }} />
							</Box>
							<Divider sx={{ mb: 3 }} />
							<Box sx={{ width: '100%', mb: 3 }}>
								<Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									<img src={Assets.logo} alt='Icon' style={{ width: 40, height: 25 }} /> Step 1: Device & Permission Check
								</Typography>
								<DevicePreview setDeviceStatus={setDeviceStatus} />
							</Box>

							<Divider sx={{ my: 3 }} />

							<Box sx={{ mb: 3 }}>
								<Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									<img src={Assets.logo} alt='Icon' style={{ width: 40, height: 25 }} /> Step 2: How to Prepare
								</Typography>
								<ul style={{ marginLeft: '18px' }}>
									<li>Be ready to discuss your goals, aspirations, and experiences.</li>
									<li>Reflect on the values our fund promotes: leadership, patriotism, and self-reliance.</li>
									<li>We recommend wearing your Scout uniform, if possible.</li>
								</ul>
							</Box>

							<Divider sx={{ my: 3 }} />

							<Box>
								<Typography variant='h6' gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
									<img src={Assets.logo} alt='Icon' style={{ width: 40, height: 25 }} /> Step 3: What to Expect
								</Typography>
								<ul style={{ marginLeft: '18px' }}>
									<li>A 15-minute conversation with our scholarship committee.</li>
									<li>The interview takes place here; no other software is needed.</li>
									<li>Find a quiet, well-lit space for the best experience.</li>
								</ul>
							</Box>
						</CardContent>
					</Card>
				</Grid>

				{/* 3. Real-Time Status Card */}
				<Grid item xs={12}>
					<Card sx={{ borderRadius: '12px' }}>
						<CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
							{isConnecting ? (
								<Alert icon={false} variant='standard' severity='success' sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: 3 }}>
									<Typography variant='h6' sx={{ fontWeight: 'bold' }}>
										Interview Starting!
									</Typography>
									<Typography variant='h1' sx={{ fontWeight: 'bold', my: 2, color: 'custom.brightWhite', animation: `${pulse} 1s ease-in-out infinite` }}>
										{redirectCountdown}
									</Typography>
									<Typography>Get ready, you will be redirected automatically.</Typography>
								</Alert>
							) : (
								<Alert icon={false} variant='standard' severity={deviceStatus === 'granted' ? 'success' : 'info'} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', p: 3 }}>
									{deviceStatus === 'granted' ? <CheckCircleOutline color='text.active' sx={{ fontSize: 40, mb: 2 }} /> : <CircularProgress size={40} thickness={4} sx={{ mb: 2, color: 'text.active' }} />}
									<Typography variant='h6' sx={{ fontWeight: 'bold' }}>
										{getStatusMessage()}
									</Typography>
									{countdown && <Typography variant='body1'>{countdown}</Typography>}
								</Alert>
							)}
						</CardContent>
					</Card>
				</Grid>
			</Grid>

			<Box textAlign='center' mt={4}>
				<Button startIcon={<HelpOutline />} href={`mailto:${brand.helpEmail}`}>
					Having Trouble? Contact Support
				</Button>
			</Box>
		</Box>
	);
}