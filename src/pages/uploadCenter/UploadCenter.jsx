/**
 * EXTERNAL UPLOAD PORTAL
 * ---------------------------------------------------------------------------
 * This page allows third parties (recommenders) to upload documents securely.
 *
 * * SECURITY MODEL:
 * 1. URL Token: A unique UUID generated when the request was created.
 * - Validates the session against the 'requests' collection.
 * 2. PIN Code: A 6-digit code sent to the uploader.
 * - Validated manually during the upload step to prevent unauthorized access.
 * 3. Rate Limiting: Max 5 upload attempts allowed per request ID.
 * 4. Expiry: Links become invalid after the global application deadline.
 *
 * * WORKFLOW:
 * 1. Validate Token & Expiry on mount.
 * 2. Prompt user for PIN (if valid).
 * 3. Upload file to Storage -> Update Firestore 'attachments' -> Mark Request 'completed'.
 */

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';

// UI Components
import { Box, Typography, Button, Avatar, Divider, TextField } from '@mui/material';
import { Upload as UploadIcon } from '@mui/icons-material';

// Custom Components
import Loader from '../../components/loader/Loader';
import CopyrightFooter from '../../components/footer/CopyrightFooter';
import { VisuallyHiddenInput } from '../../components/visuallyHiddenInput/VisuallyHiddenInput';

// Contexts & Config
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { validateRequest, validatePin, LettersOfRecommendation } from '../../config/Constants';
import { saveFile, getRequestData, saveCollectionData, getDownloadLinkForFile, getApplication } from '../../config/data/firebase';
import { UploadType, collections } from '../../config/data/collections';

// =============================================================================
//  SUB-COMPONENT: Content Switcher
// =============================================================================

const UploadCenterContent = ({ validToken, uploadComplete, request, attachmentInfo, givenPin, setGivenPin, uploading, handleUpload, handleNavigateHome, handleClosePage }) => {
	// State 1: Invalid or Expired Token
	if (!validToken) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', textAlign: 'center', mt: 2 }}>
				<Typography variant='h6' color='error'>
					You've either attempted to upload too many times or have an invalid or expired link. Please contact the applicant or the board for further action.
				</Typography>
			</Box>
		);
	}

	// State 2: Success
	if (uploadComplete || request?.completed) {
		return (
			<Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', width: '100%', height: '100%', textAlign: 'center', mt: 2 }}>
				<Typography variant='h5' textAlign='center' mt={2}>
					Thank you for uploading the {attachmentInfo?.name}.
				</Typography>
				<Typography variant='body1' textAlign='center' mt={2} mb={3}>
					Your upload has been successfully completed. You can now either close this page or navigate back to the home page.
				</Typography>
				<Box mt={3} display='flex' flexDirection='row' gap={2} width='100%'>
					<Button variant='contained' color='primary' onClick={handleNavigateHome} fullWidth>
						Home Page
					</Button>
					<Button variant='outlined' color='secondary' onClick={handleClosePage} fullWidth>
						Leave
					</Button>
				</Box>
			</Box>
		);
	}

	// State 3: Upload Form
	return (
		<>
			<Typography variant='h5' textAlign='center' mt={2}>
				Upload {attachmentInfo?.name} for {request.fromName}
			</Typography>

			<Box mt={2} display='flex' flexDirection='column' alignItems='center' width='85%' justifyContent='space-between' height='100%'>
				{/* PIN Input */}
				<TextField label='Enter Pin' type='text' placeholder='123456' required value={givenPin} onChange={(e) => setGivenPin(e.target.value)} sx={{ marginTop: 2, marginBottom: 1 }} helperText='This pin was given to you in the request.' fullWidth />

				{/* Instructions */}
				<Typography variant='body1' marginTop={2} marginBottom={1}>
					The purpose of this upload is to {attachmentInfo.purpose}.
				</Typography>
				<Typography variant='body2' marginY={1} color='text.secondary'>
					When ready to upload a recommendation letter, please ensure it is saved as a PDF (max 25MB). You have 5 attempts to enter the correct PIN.
				</Typography>
				<Typography variant='body1' marginTop={1} marginBottom={2}>
					Thank you for your time and support on behalf of the applicant and the board.
				</Typography>

				{/* Upload Button */}
				<Button variant='contained' color='primary' component='label' disabled={uploading} sx={{ width: '100%', marginTop: 2 }}>
					{uploading ? 'Uploading...' : 'Upload Recommendation Letter'}
					<VisuallyHiddenInput type='file' onChange={handleUpload} />
				</Button>
			</Box>
		</>
	);
};

UploadCenterContent.propTypes = {
	validToken: PropTypes.bool,
	uploadComplete: PropTypes.bool.isRequired,
	request: PropTypes.object,
	attachmentInfo: PropTypes.object,
	givenPin: PropTypes.string.isRequired,
	setGivenPin: PropTypes.func.isRequired,
	uploading: PropTypes.bool.isRequired,
	handleUpload: PropTypes.func.isRequired,
	handleNavigateHome: PropTypes.func.isRequired,
	handleClosePage: PropTypes.func.isRequired,
};

// =============================================================================
//  MAIN COMPONENT
// =============================================================================

const UploadCenter = () => {
	// --- Hooks & State ---
	const { token } = useParams();
	const navigate = useNavigate();
	const { boxShadow } = useTheme();
	const { showAlert } = useAlert();

	const [request, setRequest] = useState(null);
	const [givenPin, setGivenPin] = useState('');
	const [validToken, setValidToken] = useState(null);
	const [loading, setLoading] = useState(true);
	const [uploading, setUploading] = useState(false);
	const [uploadComplete, setUploadComplete] = useState(false);

	// --- Effect: Validate Token on Mount ---
	useEffect(() => {
		const validateToken = async () => {
			try {
				setLoading(true);

				// 1. Check if token exists in Firestore
				const isValid = await validateRequest(token);

				if (isValid.result) {
					const fetchedRequest = await getRequestData(isValid.id);

					// 2. Check Rate Limit & Expiry
					if (fetchedRequest && fetchedRequest.attempts < 5) {
						setRequest(fetchedRequest);

						if (new Date(fetchedRequest.expiryDate) > new Date()) {
							setValidToken(true);
							if (fetchedRequest.completed) {
								setUploadComplete(true);
							}
						} else {
							setValidToken(false); // Expired
						}
					} else {
						setValidToken(false); // Too many attempts
					}
				} else {
					setValidToken(false); // Invalid ID
				}
			} catch (error) {
				console.error(error.message);
			} finally {
				setLoading(false);
			}
		};

		validateToken();
	}, [token]);

	// --- Action: Handle File Upload ---
	const handleUpload = async (event) => {
		event.preventDefault();
		let file = event.target.files[0];

		// 1. PIN Validation
		if (!givenPin) {
			showAlert({ message: 'Please enter the 6-digit PIN.', type: 'warning' });
			return;
		}

		const isPin = await validatePin(givenPin);
		if (!isPin) {
			showAlert({ message: 'Invalid PIN. Please check your email/request for the correct code.', type: 'error' });
			return;
		}

		if (!file) return;

		// 2. File Validation
		if (!file.type.match('application/pdf')) {
			showAlert({ message: 'Please select a PDF file.', type: 'warning' });
			return;
		}

		const maxSizeInBytes = 25 * 1024 * 1024; // 25MB
		if (file.size > maxSizeInBytes) {
			showAlert({ message: 'File size exceeds the limit. Please select a file smaller than 25MB.', type: 'warning' });
			return;
		}

		// 3. Consistency Check
		try {
			const appData = await getApplication(null, request.applicationID);
			if (appData.attachments !== request.attachmentsID) {
				showAlert({ message: 'Attachment ID mismatch. Please contact support.', type: 'error' });
				return;
			}
		} catch (error) {
			console.error('Error fetching application data:', error);
			return;
		}

		setUploading(true);

		try {
			// 4. Increment Security Counter (Rate Limiting)
			const newAttempts = request.attempts + 1;
			await saveCollectionData(collections.requests, request.id, { attempts: newAttempts });
			setRequest((prev) => ({ ...prev, attempts: newAttempts }));

			// 5. Upload to Storage
			const savedFilePath = await saveFile(UploadType.applicationAttachment, request.applicationID, request.attachmentType, file);
			const fileLink = await getDownloadLinkForFile(savedFilePath);

			if (savedFilePath) {
				// 6. Update Application Attachments
				await saveCollectionData(collections.attachments, request.attachmentsID, {
					[request.attachmentType]: {
						displayName: file.name,
						home: fileLink,
						refLoc: savedFilePath,
						uploadedBy: 'request',
					},
				});

				// 7. Mark Request as Completed
				await saveCollectionData(collections.requests, request.id, { completed: true, uploadedAt: new Date() });

				setRequest((prev) => ({ ...prev, completed: true }));
				setUploadComplete(true);
			} else {
				showAlert({ message: 'Failed to upload the file. Please try again.', type: 'error' });
			}
		} catch (error) {
			console.error('Upload Error:', error.message);
			showAlert({ message: 'An unexpected error occurred during upload.', type: 'error' });
		} finally {
			setUploading(false);
		}
	};

	const handleNavigateHome = () => {
		navigate(generatePath(paths.home));
	};

	const handleClosePage = () => {
		window.close();
	};

	if (loading) return <Loader />;

	// Validate if the requested attachment type is still valid in config
	const attachmentInfo = request && LettersOfRecommendation[request.attachmentType];
	if (!attachmentInfo && validToken) {
		setValidToken(false);
	}

	return (
		<Box display='flex' flexDirection='column' justifyContent='center' alignItems='center' bgcolor='background.main' color='secondary.main' sx={{ height: '100vh' }}>
			<Box width='35rem' height='auto' padding={3} bgcolor='background.main' color='secondary.main' sx={{ borderRadius: 4, boxShadow: boxShadow }}>
				<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 'calc(100vh - 200px)' }}>
					<Avatar sx={{ m: 1, bgcolor: 'secondary' }}>
						<UploadIcon />
					</Avatar>

					<UploadCenterContent validToken={validToken} uploadComplete={uploadComplete} request={request} attachmentInfo={attachmentInfo} givenPin={givenPin} setGivenPin={setGivenPin} uploading={uploading} handleUpload={handleUpload} handleNavigateHome={handleNavigateHome} handleClosePage={handleClosePage} />

					<Divider sx={{ my: 3 }} />
				</Box>
				<CopyrightFooter sx={{ mt: 4, mb: 4 }} />
			</Box>
		</Box>
	);
};

export default UploadCenter;