/**
 * PUBLIC UNSUBSCRIBE HANDLER
 * ---------------------------------------------------------------------------
 * This page handles email opt-out requests.
 *
 * * SECURITY:
 * It uses a signed token ('encID') passed in the URL to validate the request.
 * This ensures that users can only unsubscribe themselves and that malicious
 * actors cannot brute-force unsubscribe requests.
 *
 * * LOGIC:
 * 1. Validates 'encID' using 'validateLink'.
 * 2. If valid, updates the target user's 'notifications.email' preference to false.
 * 3. Displays success/error state.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// UI Components
import { Typography, CssBaseline, Box, Avatar, Divider, Button } from '@mui/material';
import { HistoryEdu as HistoryEduIcon } from '@mui/icons-material';

// Contexts
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';

// Components
import CopyrightFooter from '../../components/footer/CopyrightFooter';
import Loader from '../../components/loader/Loader';

// Backend & Config
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { validateLink } from '../../config/Constants';
import { updateApplicantData } from '../../config/data/firebase';

export default function Unsubscribe() {
	// --- Hooks & State ---
	const navigate = useNavigate();
	const { encID } = useParams();
	const { boxShadow } = useTheme();

	const [loading, setLoading] = useState(true);
	const [unsubscribeSuccess, setUnsubscribeSuccess] = useState(false);
	const [unsubscribeError, setUnsubscribeError] = useState(null);

	useTitle({ title: 'Unsubscribe', appear: false });

	// --- Effect: Process Request ---
	useEffect(() => {
		const handleUnsubscribe = async () => {
			try {
				// 1. Verify the Token
				const isValid = await validateLink(encID);

				if (isValid.result) {
					// 2. Perform the Update
					// isValid.id comes from the decoded token, ensuring we target the right user
					await updateApplicantData(isValid.id, { 'notifications.email': false });
					setUnsubscribeSuccess(true);
				} else {
					setUnsubscribeError(`Invalid unsubscribe link. Please use a more recent email or sign in and update your preferences. Error: ${isValid.error}`);
				}
			} catch (error) {
				setUnsubscribeError(error.message || 'An error occurred while trying to unsubscribe.');
			} finally {
				setLoading(false);
			}
		};

		handleUnsubscribe();
	}, [encID]);

	// --- Render States ---

	if (loading) {
		return <Loader />;
	}

	return (
		<Box display='flex' flexDirection='column' justifyContent='center' alignItems='center' bgcolor='background' color='secondary' sx={{ height: '100vh' }}>
			<Box width='75%' height='auto' padding={3} bgcolor='background' color='secondary' sx={{ borderRadius: 4, boxShadow: boxShadow }}>
				<CssBaseline />

				<Box sx={{ width: '100%', textAlign: 'center', padding: 3 }}>
					<Avatar sx={{ m: 1, bgcolor: 'secondary' }}>
						<HistoryEduIcon />
					</Avatar>

					<Typography component='h1' variant='h5'>
						{unsubscribeSuccess ? 'Unsubscribe Successful' : 'Unsubscribe Error'}
					</Typography>

					<Box pt={3}>
						{unsubscribeSuccess ? (
							<Typography variant='body1'>You have successfully unsubscribed from our email notifications. If you change your mind, you can re-enable notifications in your account settings or by reaching out to us.</Typography>
						) : (
							<Typography variant='body1' color='error'>
								{unsubscribeError || 'An error occurred while trying to unsubscribe. Please try again later.'}
							</Typography>
						)}
					</Box>

					<Box mt={3} display='flex' justifyContent='center'>
						<Button variant='contained' color='primary' onClick={() => navigate(generatePath(paths.root))}>
							Go to Homepage
						</Button>
					</Box>
				</Box>

				<Divider sx={{ my: 3 }} />
				<CopyrightFooter sx={{ mt: 4, mb: 4 }} />
			</Box>
		</Box>
	);
}