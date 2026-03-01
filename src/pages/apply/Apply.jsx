/**
 * APPLICANT DASHBOARD (Landing Page)
 * ---------------------------------------------------------------------------
 * This is the main hub for authenticated applicants.
 *
 * * PRIMARY FUNCTIONS:
 * 1. View Status: Shows active applications and their current state (Started, Submitted).
 * 2. Create New: specific buttons to start a new application (if eligible).
 * 3. RSVP: Shows the RSVPStatusCard if an interview has been scheduled.
 *
 * * DYNAMIC CONTENT:
 * Text and button availability are derived from 'getApplyContent(config)',
 * ensuring the page adapts to the current year and deadline automatically.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Typography, CssBaseline, Box, Avatar, Button, Divider } from '@mui/material';
import { DeleteOutlineOutlined as Delete, HistoryEdu as HistoryEduIcon } from '@mui/icons-material';

// Contexts & Hooks
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useAlert } from '../../context/AlertContext';

// Backend & Config
import { deleteApplication, getRealTimeApplicationsByIDs, removeApplicationFromApplicant } from '../../config/data/firebase';
import { ApplicationStatus } from '../../config/data/collections';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { applicationConfigurations } from '../../config/ui/applicationConfig';
import { getApplyContent } from '../../config/content/content';

// Components
import CopyrightFooter from '../../components/footer/CopyrightFooter';
import Loader from '../../components/loader/Loader';
import Crumbs from '../../components/breadcrumbs/Breadcrumbs';
import RSVPStatusCard from '../../components/interviews/RSVPStatusCard';
import WindowInfo from '../../components/timer/WindowInfo';

export default function Apply() {
	const navigate = useNavigate();
	useTitle({ title: 'Apply', appear: true });

	// Global State
	const config = useConfig();
	const { user, applicant } = useAuth();
	const { darkMode, boxShadow } = useTheme();
	const { showAlert, showAnnouncement } = useAlert();

	// Local State
	const [applications, setApplications] = useState([]);
	const [loading, setLoading] = useState(true);
	const [announcement, setAnnouncement] = useState(null);

	// Fetch dynamic content based on current configuration (Deadlines, Year)
	const content = getApplyContent(config);

	// --- Effect: Global Announcements ---
	useEffect(() => {
		if (config.APPLICANT_MESSAGE && config.APPLICANT_MESSAGE !== '') {
			setAnnouncement(showAnnouncement({ message: config.APPLICANT_MESSAGE }));
		}
	}, [config.APPLICANT_MESSAGE, setAnnouncement, showAnnouncement]);

	// --- Effect: Fetch User Applications ---
	useEffect(() => {
		let unsubscribe;

		const fetchApplications = () => {
			if (user && applicant) {
				if (applicant.applications?.length > 0) {
					// Real-time listener for application status updates
					unsubscribe = getRealTimeApplicationsByIDs(applicant.applications, setApplications);
				}
				setLoading(false);
			}
		};

		fetchApplications();

		return () => {
			if (unsubscribe) {
				unsubscribe();
			}
		};
	}, [user, applicant]);

	// --- Actions ---

	const handleDelete = async (application) => {
		// 1. Delete the actual application document
		await deleteApplication(application);

		// 2. Remove the reference ID from the user's profile
		if (user?.uid && application.id) {
			await removeApplicationFromApplicant(user.uid, application.id);
		}

		showAlert('application', 'deleted');
	};

	/**
	 * Route Handler for clicking an existing application card.
	 * - If DRAFT: Go to the Edit Wizard.
	 * - If SUBMITTED: Go to the Read-Only Review page.
	 */
	const handleClick = (application) => {
		const getApplicationKeyByType = (appType) => {
			return Object.keys(applicationConfigurations).find((key) => applicationConfigurations[key].type === appType);
		};

		switch (application.status) {
			case ApplicationStatus.started:
			case ApplicationStatus.submitted: // Technically 'submitted' usually goes to review, but if editing is allowed:
				navigate(
					generatePath(paths.updateApplication, {
						applicationType: getApplicationKeyByType(application.type),
						applicationID: application.id,
					}),
					{ replace: true }
				);
				break;
			default:
				navigate(generatePath(paths.reviewApp, { id: application.id }), { replace: true });
				break;
		}
	};

	// --- Render Helpers ---

	const getYearFromTimestamp = (input) => new Date(input).getFullYear();
	const formatTimestamp = (input) => new Date(input).toLocaleString();

	if (loading) {
		return <Loader />;
	}

	return (
		<Box display='flex' flexDirection='column' justifyContent='center' alignItems='center' bgcolor='background.passive' color='secondary.main' sx={{ height: { xs: '100%', md: '100vh' } }}>
			<Box width={{ xs: '100%', md: '50%', lg: '80%' }} height={{ xs: '100%', md: '95vh' }} padding={3} bgcolor='background.main' color='secondary.main' sx={{ borderRadius: { xs: 0, md: 4 }, boxShadow: boxShadow }}>
				<CssBaseline />
				<Crumbs logout />

				{announcement || null}

				<Box sx={{ width: '100%', mt: 2 }}>
					<Box
						sx={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							height: 'calc(100vh - 210px)',
							overflowY: 'auto',
						}}>
						{/* Header Section */}
						<Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
							<HistoryEduIcon />
						</Avatar>
						<Box>
							<Typography component='h1' variant='h5' color='primary'>
								{content.title}
							</Typography>
						</Box>
						<Box pt={3}>
							{content.subtitle.map((paragraph) => (
								<Typography variant='body1' paragraph key={paragraph} dangerouslySetInnerHTML={{ __html: paragraph }} />
							))}
						</Box>

						<Divider sx={{ my: 3, width: '100%' }} />

						{/* Interview RSVP Status */}
						<Box mb={2} width='100%'>
							<RSVPStatusCard />
						</Box>

						{/* Existing Applications List */}
						{applications.length > 0 && (
							<>
								<Box mb={2} width='100%'>
									<Typography mb={2} variant='h6' fontWeight='bold' color='primary'>
										Your Applications
									</Typography>
									<Box display='flex' flexDirection={{ xs: 'column', lg: 'row' }} flexWrap='nowrap' alignItems='center' justifyContent='space-around' gap={3} width='100%'>
										{applications.map((application) => (
											<Box
												key={application.id}
												onClick={(event) => {
													event.preventDefault();
													handleClick(application);
												}}
												sx={{ cursor: 'pointer', textAlign: 'center' }}
												display='flex'
												flexDirection='column'
												justifyContent='space-around'
												minHeight='175px'
												mt={4}
												p={2}
												border={1}
												borderRadius={2}
												borderColor='grey.300'
												boxShadow={darkMode ? '2px 4px 10px 1px rgba(201, 201, 201, 0.47)' : '2px 4px 10px 1px rgba(0, 0, 0, 0.47)'}>
												<Typography>
													{application.type} ({getYearFromTimestamp(application.submittedOn)})
												</Typography>
												<Typography fontWeight='bold'>{application.status}</Typography>
												<Typography variant='caption'>Submitted: {formatTimestamp(application.submittedOn)}</Typography>

												<Box display='flex' flexDirection='row' justifyContent='space-between' alignItems='center'>
													<Button
														variant='contained'
														onClick={(event) => {
															event.preventDefault();
															handleClick(application);
														}}>
														View/Edit
													</Button>
													<Delete
														sx={{ alignSelf: 'center', cursor: 'pointer', fontSize: 32 }}
														onClick={(event) => {
															event.preventDefault();
															event.stopPropagation();
															handleDelete(application);
														}}
													/>
												</Box>
											</Box>
										))}
									</Box>
								</Box>
								<Divider sx={{ my: 3, width: '100%' }} />
							</>
						)}

						{/* Start New Application Section */}
						<Box display='flex' flexDirection='column' mb={2} width='100%'>
							<Typography mb={2} variant='h6' fontWeight='bold' color='primary'>
								Available Applications
							</Typography>
							<Box display='flex' flexDirection={{ xs: 'column', md: 'row' }} flexWrap='nowrap' alignItems='center' justifyContent='space-around' gap={3} width='100%'>
								{content.availableApps.map((app) => (
									<Button key={app.type} component={Link} to={generatePath(app.path, { applicationType: app.type })} size='large' disabled={app.disabled} fullWidth variant='outlined' style={{ textDecoration: 'none' }}>
										{app.label}
									</Button>
								))}
							</Box>
						</Box>

						{/* Deadline Timer */}
						<Box width='100%' alignSelf='center' display='flex' flexDirection='row' justifyContent='center' alignItems='center' my={2}>
							<WindowInfo />
						</Box>
						<Divider sx={{ my: 3, width: '100%' }} />
					</Box>
				</Box>
				<CopyrightFooter sx={{ mt: 4, mb: 4 }} />
			</Box>
		</Box>
	);
}