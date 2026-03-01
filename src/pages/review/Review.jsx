/**
 * APPLICATION REVIEW PAGE
 * ---------------------------------------------------------------------------
 * This page renders the full details of a specific application.
 *
 * * AUDIENCE:
 * 1. Applicants: View status, upload missing files, request recommendations.
 * 2. Admins: Read-only view of the applicant's data.
 *
 * * DATA ARCHITECTURE (The Aggregator):
 * Applications in Firestore are normalized. A single 'application' document
 * contains IDs pointing to documents in 'education', 'family', 'incomes', etc.
 * This component fetches all those linked documents in parallel and re-assembles
 * them into a single view.
 *
 * * AUTOMATION:
 * - Monitors attachment uploads.
 * - If all required files are present, it auto-updates status to 'completed'.
 */

import React, { useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import dayjs from 'dayjs';

// UI Components
import { Typography, CssBaseline, Box, Avatar, Button, Table, TableBody, TableCell, TableHead, TableRow, Chip, Divider, TableContainer, Paper } from '@mui/material';
import { HistoryEdu as HistoryEduIcon } from '@mui/icons-material';

// Custom Components
import CopyrightFooter from '../../components/footer/CopyrightFooter';
import Loader from '../../components/loader/Loader';
import NotFound from '../../components/layout/NotFound';
import Crumbs from '../../components/breadcrumbs/Breadcrumbs';
import { VisuallyHiddenInput } from '../../components/visuallyHiddenInput/VisuallyHiddenInput';
import { FamilyDetails, EducationDetails, ExperienceDetails, ExpensesDetails, IncomesDetails, ContributionsDetails, ProjectionsDetails } from '../../components/table/Table';

// Contexts
import { useAuth } from '../../context/AuthContext';
import { useTitle } from '../../context/HelmetContext';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';

// Backend & Config
import { getApplication, getCollectionData, saveFile, getDownloadLinkForFile, deleteFile, invalidateRequest, saveCollectionData, updateApplicationStatus } from '../../config/data/firebase';
import { sendRequest } from '../../config/content/push';
import { attachmentFields, LettersOfRecommendation, generateSecurePin, generate6DigitNumber, generateUploadLink } from '../../config/Constants';
import { UploadType, ApplicationStatus, collections } from '../../config/data/collections';
import { templateApp, blankAttachment } from '../../config/data/Validation';

// =============================================================================
//  HELPER FUNCTIONS
// =============================================================================

const calculateAge = (dob) => {
	if (!dob) return '';
	const birthDate = new Date(dob);
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	const monthDifference = today.getMonth() - birthDate.getMonth();
	if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
		age--;
	}
	return String(age);
};

/**
 * Checks if all attachments required by this specific application type are present.
 */
const isApplicationComplete = (updatedAttachments, appType) => {
	const requiredAttachments = attachmentFields.filter((field) => field.requiredBy.includes(appType)).map((field) => field.key);

	return requiredAttachments.every((key) => updatedAttachments[key]?.home || updatedAttachments[key]?.requestID);
};

// =============================================================================
//  SUB-COMPONENTS
// =============================================================================

const AttachmentStatusCell = ({ attachment, field, application, isEditable, handleUpload, handleDelete, handleRequestRecommendation }) => {
	const attachmentData = application.attachments[field.key];

	// Case 1: File Uploaded
	if (attachmentData?.displayName) {
		return <Chip clickable={!!attachmentData.home} component='a' href={attachmentData.home} target='_blank' rel='noopener noreferrer' label={attachmentData.displayName} onDelete={isEditable ? () => handleDelete(field.key, attachmentData) : undefined} />;
	}

	// Case 2: Recommendation Requested
	if (attachmentData?.requestID) {
		return <Chip label='Request Sent' onDelete={isEditable ? () => handleDelete(field.key, attachmentData) : undefined} />;
	}

	// Case 3: Missing
	return (
		<Box display='flex' flexDirection='column' justifyContent='center' alignItems='center'>
			<Typography variant='body2' color='custom.red' mb={1}>
				Missing
			</Typography>

			{isEditable && (
				<Box display='flex' flexDirection='column' justifyContent='center' alignItems='center'>
					{/* Upload Button */}
					<Button size='small' component='label' variant='contained' startIcon={attachment.icon}>
						Upload
						<VisuallyHiddenInput name={field.key} onChange={handleUpload} type='file' />
					</Button>

					{/* Recommendation Request Option (if applicable) */}
					{LettersOfRecommendation.hasOwnProperty(field.key) && (
						<>
							<Box display='flex' alignItems='center' justifyContent='center' width='100%' sx={{ my: 1 }}>
								<Divider sx={{ flexGrow: 1, borderColor: 'grey.500', borderBottomWidth: 2 }} />
								<Typography variant='body2' sx={{ mx: 2 }}>
									OR
								</Typography>
								<Divider sx={{ flexGrow: 1, borderColor: 'grey.500', borderBottomWidth: 2 }} />
							</Box>
							<Button size='small' variant='contained' onClick={() => handleRequestRecommendation(field.key)}>
								Request Letter
							</Button>
						</>
					)}
				</Box>
			)}
		</Box>
	);
};

AttachmentStatusCell.propTypes = {
	attachment: PropTypes.object.isRequired,
	field: PropTypes.object.isRequired,
	application: PropTypes.object.isRequired,
	isEditable: PropTypes.bool.isRequired,
	handleUpload: PropTypes.func.isRequired,
	handleDelete: PropTypes.func.isRequired,
	handleRequestRecommendation: PropTypes.func.isRequired,
};

const MobileAttachmentStatus = ({ attachment, application }) => {
	const attachmentData = application.attachments[attachment.key];

	if (attachmentData?.displayName) {
		return <Chip clickable component='a' href={attachmentData.home} target='_blank' rel='noopener noreferrer' label={attachmentData.displayName} />;
	}
	if (attachmentData?.requestID) {
		return <Typography variant='body2'>Request Sent.</Typography>;
	}
	return (
		<Typography variant='body2' color='custom.red'>
			None Uploaded.
		</Typography>
	);
};

MobileAttachmentStatus.propTypes = {
	attachment: PropTypes.object.isRequired,
	application: PropTypes.object.isRequired,
};

// =============================================================================
//  MAIN COMPONENT
// =============================================================================

export default function Review() {
	// --- Hooks & Contexts ---
	const { id: appID } = useParams();
	const { user } = useAuth();
	const { showAlert, handleError } = useAlert();
	const { showDialog } = useDialog();
	const config = useConfig();
	const { darkMode } = useTheme();

	useTitle({ title: 'Review Application', appear: false });

	// --- State ---
	const [application, setApplication] = useState(templateApp);
	const [wasNotFound, setWasNotFound] = useState(false);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);

	const detailTableHeadStyles = {
		fontWeight: 'bold',
		color: 'text.primary',
		bgcolor: 'action.hover',
	};

	// --- Effect: Aggregated Data Fetching ---
	useEffect(() => {
		const fetch = async () => {
			try {
				// 1. Fetch Main Application Document
				const appData = await getApplication(user.uid, appID);

				if (appData) {
					// 2. Parallel Fetch of All Linked Sub-Documents
					const dataPromises = [getCollectionData(appData.completedBy, collections.profiles, appData.profile), getCollectionData(appData.completedBy, collections.families, appData.family), getCollectionData(appData.completedBy, collections.education, appData.education), getCollectionData(appData.completedBy, collections.experience, appData.experience), getCollectionData(appData.completedBy, collections.expenses, appData.expenses), getCollectionData(appData.completedBy, collections.incomes, appData.incomes), getCollectionData(appData.completedBy, collections.contributions, appData.contributions), getCollectionData(appData.completedBy, collections.projections, appData.projections), getCollectionData(appData.completedBy, collections.attachments, appData.attachments)];

					const [profile, family, education, experience, expenses, incomes, contributions, projections, attachments] = await Promise.all(dataPromises);

					// 3. Assemble Full State
					setApplication({
						...appData,
						profile,
						family,
						education,
						experience,
						expenses,
						incomes,
						contributions,
						projections,
						attachments,
					});
				} else {
					setWasNotFound(true);
				}
			} catch (error) {
				handleError(error, 'reviewFetch');
				setWasNotFound(true);
			} finally {
				setLoading(false);
			}
		};
		if (user?.uid && appID) fetch();
	}, [appID, user, handleError]);

	// --- Action: Request Letter of Recommendation ---
	const handleRequestRecommendation = useCallback(
		(attachmentType) => {
			showDialog({
				id: 'requestRecommendation',
				data: {
					fromName: `${application.profile?.applicantFirstName} ${application.profile?.applicantLastName}`,
				},
				callback: async (formData) => {
					if (!formData) return;

					try {
						// Generate Codes & Links
						const insecurePin = generate6DigitNumber();
						const securePin = await generateSecurePin(insecurePin);

						const request = {
							...formData,
							id: uuid(),
							pinCode: securePin,
							attachmentType,
							attachmentsID: application.attachments.attachmentsID,
							applicationID: appID,
							expiryDate: config.APPLICATION_DEADLINE,
							completed: false,
							attempts: 0,
						};

						// Save Request & Email Recommender
						await saveCollectionData(collections.requests, request.id, request);
						const uploadLink = await generateUploadLink(request.id);
						await sendRequest(request, uploadLink, insecurePin);

						// Update Application State
						const updatedAttachments = { ...application.attachments, [attachmentType]: { requestID: request.id } };
						await saveCollectionData(collections.attachments, application.attachments.attachmentsID, updatedAttachments);
						setApplication((prev) => ({ ...prev, attachments: updatedAttachments }));

						showAlert('request', 'sent');
					} catch (error) {
						handleError(error, 'reviewSendRequest');
					}
				},
			});
		},
		[application, appID, config, showDialog, showAlert, handleError]
	);

	// --- Action: Delete Attachment or Cancel Request ---
	const handleDelete = useCallback(
		async (key, attachment) => {
			try {
				if (attachment.refLoc) {
					// Physical File Delete
					await deleteFile(attachment.refLoc);
					showAlert('upload', 'deleted');
				} else if (attachment.requestID) {
					// Logic Delete (Invalidate Request)
					await invalidateRequest(attachment.requestID);
				}

				// Reset Field to Blank
				const updatedAttachments = { ...application.attachments, [key]: blankAttachment };
				await saveCollectionData(collections.attachments, application.attachments.attachmentsID, updatedAttachments);
				setApplication((prev) => ({ ...prev, attachments: updatedAttachments }));
			} catch (error) {
				handleError(error, 'reviewHandleDelete');
			}
		},
		[application, showAlert, handleError]
	);

	// --- Action: Upload File ---
	const handleUpload = useCallback(
		async (event) => {
			event.preventDefault();
			const { name, files } = event.target;
			const file = files[0];

			if (!file?.type.match('application/pdf')) return showAlert('upload', 'type');
			if (file.size > 25 * 1024 * 1024) return showAlert('upload', 'size');

			setUploading(true);
			try {
				// 1. Upload to Storage
				const savedFileRef = await saveFile(UploadType.applicationAttachment, appID, name, file);
				const downloadLink = await getDownloadLinkForFile(savedFileRef);

				if (downloadLink) {
					const newAttachmentData = {
						displayName: file.name,
						home: downloadLink,
						refLoc: savedFileRef,
						uploadedBy: 'applicant',
					};

					// 2. Update Firestore
					const updatedAttachments = { ...application.attachments, [name]: newAttachmentData };
					await saveCollectionData(collections.attachments, application.attachments.attachmentsID, updatedAttachments);
					setApplication((prev) => ({ ...prev, attachments: updatedAttachments }));

					// 3. Check for Completion (Auto-Submit)
					if (isApplicationComplete(updatedAttachments, application.type)) {
						await updateApplicationStatus(user?.uid, appID, ApplicationStatus.completed);
						setApplication((prev) => ({ ...prev, status: ApplicationStatus.completed }));
						showAlert('application', 'completed');
					} else {
						showAlert('application', 'incomplete');
					}
				} else {
					showAlert('upload', 'missing');
				}
			} catch (error) {
				handleError(error, 'reviewHandleUpload');
			} finally {
				setUploading(false);
			}
		},
		[appID, application, user?.uid, showAlert, handleError]
	);

	if (loading || uploading) return <Loader />;
	if (wasNotFound) return <NotFound />;

	// Determine if inputs should be enabled
	const isEditable = [ApplicationStatus.started, ApplicationStatus.submitted, ApplicationStatus.incomplete].includes(application.status);

	return (
		<Box display='flex' flexDirection='column' justifyContent='center' alignItems='center' bgcolor='background.passive' color='secondary.main' width={'100%'} height={{ xs: '100%', md: '100vh' }}>
			<Box width={{ xs: '100%', md: '80%', lg: '90%' }} height={{ xs: '100%', md: '95vh' }} padding={2} bgcolor='background.main' color='secondary.main' sx={{ borderRadius: { xs: 0, md: 4 }, boxShadow: '10px 9px 102px 20px rgba(0,0,0,0.75)' }}>
				<CssBaseline />
				<Crumbs title={application.type} logout />

				<Box sx={{ width: '100%' }}>
					<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 'calc(100vh - 210px)', overflowY: 'auto', width: '100%' }}>
						{/* Header */}
						<Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
							<HistoryEduIcon />
						</Avatar>
						<Typography component='h1' variant='h5' color='primary'>
							Your {application.type} Application for {dayjs(application.window).year()}
						</Typography>
						<Typography>{`${application.status} (${application.submittedOn})`}</Typography>

						{/* Data Sections */}
						<Box bgcolor='background' color='secondary' width={{ xs: '100vw', md: '100%' }} p={2}>
							{/* 1. Profile Section */}
							{application.profile && (
								<Box sx={{ marginY: '15px' }}>
									<Typography color='primary' gutterBottom>
										Profile
									</Typography>

									{/* Desktop View */}
									<TableContainer component={Paper} sx={{ display: { xs: 'none', lg: 'block' }, width: '100%', boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
										<Table size='small' aria-label='Profile' sx={{ tableLayout: 'fixed' }}>
											<TableHead>
												<TableRow>
													<TableCell sx={{ ...detailTableHeadStyles, width: '20%' }}>Name</TableCell>
													<TableCell sx={{ ...detailTableHeadStyles, width: '20%' }}>DOB & Age</TableCell>
													<TableCell sx={{ ...detailTableHeadStyles, width: '20%' }}>Address</TableCell>
													<TableCell sx={{ ...detailTableHeadStyles, width: '20%' }}>Cell Number</TableCell>
													<TableCell sx={{ ...detailTableHeadStyles, width: '20%' }}>Email Address</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												<TableRow>
													<TableCell component='th' scope='row'>
														{`${application.profile?.applicantFirstName} ${application.profile?.applicantMiddleInitial} ${application.profile?.applicantLastName}`}
													</TableCell>
													<TableCell>{`${dayjs(application.profile?.applicantDOB).add(12, 'hour').format('M/D/YYYY')} (${calculateAge(application.profile?.applicantDOB)})`}</TableCell>
													<TableCell>{application.profile?.applicantMailingAddress?.description}</TableCell>
													<TableCell>{application.profile?.applicantCellPhone}</TableCell>
													<TableCell>{application.profile?.applicantEmailAddress}</TableCell>
												</TableRow>
											</TableBody>
										</Table>
									</TableContainer>

									{/* Mobile View */}
									<Box display={{ xs: 'flex', lg: 'none' }} flexDirection='column' gap={3} paddingY={1} marginLeft={2}>
										{/* (Simplified for brevity - keeps existing structure) */}
										<Box display='flex' flexDirection='row' gap={1}>
											<Typography fontWeight='bold'>Name:</Typography>{' '}
											<Typography>
												{application.profile.applicantFirstName} {application.profile.applicantLastName}
											</Typography>
										</Box>
										<Box display='flex' flexDirection='row' gap={1}>
											<Typography fontWeight='bold'>Email:</Typography> <Typography sx={{ wordBreak: 'break-all' }}>{application.profile.applicantEmailAddress}</Typography>
										</Box>
									</Box>
								</Box>
							)}

							{/* 2. Detailed Tables (Using Components) */}
							{application.family && (
								<Box sx={{ marginY: '15px' }}>
									<Typography color='primary' gutterBottom>
										Family
									</Typography>
									<FamilyDetails data={application.family} />
								</Box>
							)}
							{application.education && (
								<Box sx={{ marginY: '15px' }}>
									<Typography color='primary' gutterBottom>
										Education
									</Typography>
									<EducationDetails data={application.education} />
								</Box>
							)}
							{application.experience && (
								<Box sx={{ marginY: '15px' }}>
									<Typography color='primary' gutterBottom>
										Experience
									</Typography>
									<ExperienceDetails data={application.experience} />
								</Box>
							)}
							{application.expenses && (
								<Box sx={{ marginY: '15px' }}>
									<Typography color='primary' gutterBottom>
										Expenses
									</Typography>
									<ExpensesDetails data={application.expenses} />
								</Box>
							)}
							{application.incomes && (
								<Box sx={{ marginY: '15px' }}>
									<Typography color='primary' gutterBottom>
										Incomes
									</Typography>
									<IncomesDetails data={application.incomes} />
								</Box>
							)}
							{application.contributions && (
								<Box sx={{ marginY: '15px' }}>
									<Typography color='primary' gutterBottom>
										Contributions
									</Typography>
									<ContributionsDetails data={application.contributions} />
								</Box>
							)}
							{application.projections && (
								<Box sx={{ marginY: '15px' }}>
									<Typography color='primary' gutterBottom>
										Projections
									</Typography>
									<ProjectionsDetails data={application.projections} />
								</Box>
							)}

							{/* 3. Attachments Section */}
							{application.attachments && (
								<Box sx={{ marginY: '15px' }}>
									<Typography color='primary' gutterBottom>
										Attachments
									</Typography>
									<TableContainer component={Paper} sx={{ display: { xs: 'none', lg: 'block' }, width: '100%', boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
										<Table size='small' aria-label='attachments' sx={{ tableLayout: 'fixed' }}>
											<TableHead>
												<TableRow sx={{ display: 'flex', flexDirection: 'row', gap: 1, width: '100%' }}>
													{attachmentFields
														.filter((attachment) => attachment.requiredBy.includes(application.type))
														.map((attachment) => (
															<TableCell key={attachment.key} sx={{ ...detailTableHeadStyles, flex: 1, textAlign: 'center' }}>
																{attachment.label}
															</TableCell>
														))}
												</TableRow>
											</TableHead>
											<TableBody>
												<TableRow sx={{ display: 'flex', flexDirection: 'row', gap: 1, width: '100%', alignItems: 'center' }}>
													{attachmentFields
														.filter((attachment) => attachment.requiredBy.includes(application.type))
														.map((field) => (
															<TableCell key={field.key} sx={{ flex: 1, textAlign: 'center', paddingY: 2 }}>
																<AttachmentStatusCell attachment={attachmentFields.find((a) => a.key === field.key)} field={field} application={application} isEditable={isEditable} handleUpload={handleUpload} handleDelete={handleDelete} handleRequestRecommendation={handleRequestRecommendation} />
															</TableCell>
														))}
												</TableRow>
											</TableBody>
										</Table>
									</TableContainer>

									{/* Mobile Attachments */}
									<Box display='flex' flexDirection='row' justifyContent='space-between' gap={2} p={1} flexWrap='wrap' sx={{ display: { xs: 'flex', lg: 'none' } }}>
										{attachmentFields
											.filter((attachment) => attachment.requiredBy.includes(application.type))
											.map((attachment) => (
												<Box display='flex' flexDirection='row' width='100%' justifyContent='space-between' alignItems='center' gap={2} p={1} key={attachment.key}>
													<Typography variant='body2' fontWeight='bold' color={darkMode ? 'primary.main' : 'highlight.main'}>
														{attachment.label}:
													</Typography>
													<MobileAttachmentStatus attachment={attachment} application={application} />
												</Box>
											))}
									</Box>
								</Box>
							)}
						</Box>
					</Box>
				</Box>
				<CopyrightFooter sx={{ mt: 4, mb: 4 }} />
			</Box>
		</Box>
	);
}