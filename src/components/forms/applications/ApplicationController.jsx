/**
 * Application Controller (The "Wizard")
 * Manages the multi-step application process for applicants.
 * Handles:
 * 1. Data Loading (Fetching existing drafts or creating new ones).
 * 2. Navigation (Next/Back/Save & Exit).
 * 3. Validation (Triggering form validation before proceeding).
 * 4. Persistence (Saving step data to specific Firestore collections).
 */

import React, { useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { v4 as uuidv4 } from 'uuid';
import { Button, CssBaseline, Box, Stepper, Step, StepButton, Typography, useMediaQuery } from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';

// Context & Hooks
import { useAuth } from '../../../context/AuthContext';
import { ApplicationContext } from '../../../context/ApplicationContext';
import { useConfig } from '../../../context/ConfigContext';
import { useTitle } from '../../../context/HelmetContext';
import { useAlert } from '../../../context/AlertContext';
import { useTheme } from '../../../context/ThemeContext';

// Config & Firebase
import { saveCollectionData, getApplication, getCollectionData, getApplicant, addApplicationToApplicant, updateApplicantData } from '../../../config/data/firebase';
import { attachmentFields } from '../../../config/Constants';
import { collections, ApplicationStatus } from '../../../config/data/collections';
import { generatePath } from '../../../config/navigation/routeUtils';
import { paths } from '../../../config/navigation/paths';
import { ContactTemplate, pushNotice } from '../../../config/content/push';
import { applicationConfigurations } from '../../../config/ui/applicationConfig';

// Components
import Loader from '../../loader/Loader';
import NotFound from '../../layout/NotFound';
import CopyrightFooter from '../../footer/CopyrightFooter';
import Crumbs from '../../breadcrumbs/Breadcrumbs';
import GenericFormPage from '../../forms/GenericFormPage';

dayjs.extend(customParseFormat);

// Map string keys from config to actual React components
const componentMap = {
	GenericFormPage,
};

// --- Helpers ---

// Maps section keys (e.g., "education") to the specific ID field name expected by the DB
const getRecordIdKeyForSection = (sectionKey) => {
	const map = {
		profile: 'applicantID',
		family: 'familyID',
		education: 'educationRecordID',
		experience: 'experienceRecordID',
		expenses: 'expensesID',
		incomes: 'incomesReportID',
		contributions: 'contributionsID',
		projections: 'projectionsID',
		attachments: 'attachmentsID',
	};
	return map[sectionKey] || 'id';
};

// Maps section keys to their Firestore collection names
const getCollectionNameForSection = (sectionKey) => {
	const map = {
		profile: collections.profiles,
		family: collections.families,
		education: collections.education,
		experience: collections.experience,
		expenses: collections.expenses,
		incomes: collections.incomes,
		contributions: collections.contributions,
		projections: collections.projections,
		attachments: collections.attachments,
	};
	return map[sectionKey];
};

// Validates if all required attachments are present
const checkApplicationCompleteness = (applicationData, appConfig) => {
	let attachmentsComplete = true;
	const requiredAttachments = attachmentFields.filter((field) => field.requiredBy.includes(appConfig.type)).map((field) => field.key);

	for (const key of requiredAttachments) {
		const attachment = applicationData.attachments?.[key];
		// Must exist and have either a displayName (uploaded) or requestID (requested)
		if (!attachment || (!attachment.displayName && !attachment.requestID)) {
			attachmentsComplete = false;
			break;
		}
	}

	return attachmentsComplete ? ApplicationStatus.completed : ApplicationStatus.incomplete;
};

// Creates an update object for the Applicant Profile based on Application Data
const buildApplicantUpdate = (appState, applicantState) => {
	const update = {};

	// Sync Profile Info
	if (appState.profile) {
		update.firstName = appState.profile.applicantFirstName || applicantState?.firstName;
		update.lastName = appState.profile.applicantLastName || applicantState?.lastName;
		update.email = appState.profile.applicantEmailAddress || applicantState?.email;
		update.cell = appState.profile.applicantCellPhone || applicantState?.cell;
	}

	// Sync Education Info
	if (appState.education) {
		update.school = appState.education.schoolName || applicantState?.school;
		update.major = appState.education.major || applicantState?.major;
		if (appState.education.expectedGraduationDate) {
			update.gradYear = Number(new Date(appState.education.expectedGraduationDate).getFullYear());
		}
	}

	// Sync Organization/Role
	if (appState.experience?.positions) {
		const currentIndex = appState.experience.currentOrganization;
		if (currentIndex !== 'undefined' && appState.experience.positions[currentIndex]) {
			const unit = appState.experience.positions[currentIndex];
			update.organization = `${unit.role} | ${unit.organization}`;
		}
	}
	return update;
};

const loadExistingApplication = async (appId, userId, appConfig, handleError) => {
	try {
		const appData = await getApplication(userId, appId);
		if (!appData) return { notFound: true };

		const collectionsToFetch = appConfig.dataCollections || [];
		const fetchedData = {};

		// Fetch linked documents (Family, Education, etc.)
		await Promise.all(
			collectionsToFetch.map(async ({ key, collectionName }) => {
				const recordId = appData[key];
				if (recordId) {
					fetchedData[key] = await getCollectionData(userId, collectionName, recordId);
				}
			})
		);

		const applicant = await getApplicant(userId);
		return {
			application: { ...fetchedData, id: appId },
			completed: appData,
			applicant,
			notFound: false,
		};
	} catch (error) {
		handleError(error, `fetchData`);
		return { notFound: true };
	}
};

const initializeNewApplication = async (userId, handleError) => {
	try {
		const applicantData = await getApplicant(userId);
		return { applicant: applicantData, newId: uuidv4() };
	} catch (error) {
		handleError(error, `fetchApplicant`);
		return { applicant: null, newId: uuidv4() };
	}
};

// --- Main Component ---

export default function ApplicationController() {
	const { applicationType, applicationID: paramID } = useParams();
	const appConfig = useMemo(() => applicationConfigurations[applicationType], [applicationType]);

	// Wizard State
	const [activeStep, setActiveStep] = useState(0);
	const [completed, setCompleted] = useState({}); // Tracks completion of each section (stores IDs)
	const [applicationID, setApplicationID] = useState(paramID || null);

	// Data State
	const [application, setApplication] = useState(appConfig?.template);
	const [applicant, setApplicant] = useState(null);

	// UI State
	const [hasErrors, setHasErrors] = useState(false);
	const [wasNotFound, setWasNotFound] = useState(false);
	const [submissionAttempted, setSubmissionAttempted] = useState(false);

	// Hooks & Context
	const siteConfig = useConfig();
	const { user } = useAuth();
	const { setAllowEditing, loading, setLoading } = useContext(ApplicationContext);
	const navigate = useNavigate();
	const { showAlert, handleError } = useAlert();
	const handleErrorRef = useRef(handleError); // Persist ref to avoid effect dependencies
	const { boxShadow } = useTheme();
	const theme = useMuiTheme();
	const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

	useTitle({ title: appConfig?.title || 'Application', appear: false });

	const steps = useMemo(() => appConfig?.steps || [], [appConfig]);

	useEffect(() => {
		handleErrorRef.current = handleError;
	}, [handleError]);

	// Initialization Effect
	useEffect(() => {
		const initialize = async () => {
			if (!appConfig || !user?.uid) return;
			setLoading(true);

			if (paramID) {
				// Load existing application
				const result = await loadExistingApplication(paramID, user.uid, appConfig, handleErrorRef.current);
				if (result.notFound) {
					setWasNotFound(true);
				} else {
					setApplicant(result.applicant);
					setApplication((prev) => ({ ...prev, ...result.application }));
					setCompleted(result.completed);
					setAllowEditing(result.completed?.status === ApplicationStatus.started);
				}
			} else {
				// Initialize new application
				const { applicant: loadedApplicant, newId } = await initializeNewApplication(user.uid, handleErrorRef.current);
				setApplicant(loadedApplicant);
				setApplicationID(newId);
				setApplication(appConfig.template);
				setAllowEditing(true);
			}
			setLoading(false);
		};
		initialize();
	}, [paramID, user?.uid, appConfig, setAllowEditing, setLoading]);

	// Navigation Helpers
	const totalSteps = useCallback(() => steps.length, [steps]);
	const isLastStep = useCallback(() => activeStep === totalSteps() - 1, [activeStep, totalSteps]);

	const handleNext = useCallback(() => {
		const isLast = activeStep === steps.length - 1;
		const allCompleted = Object.keys(completed).length >= steps.length - 1;

		// Find next incomplete step if at end, otherwise just next
		const newActiveStep = isLast && !allCompleted ? steps.findIndex((step, i) => !completed[appConfig.pages[i]?.section]) : activeStep + 1;

		setActiveStep(newActiveStep);
	}, [activeStep, steps, completed, appConfig]);

	const handleBack = () => setActiveStep((prev) => prev - 1);

	const handleReset = () => {
		setActiveStep(0);
		setCompleted({});
		setApplication(appConfig.template);
	};

	const handleLogout = () => navigate(generatePath(paths.apply));

	// Save Data Helpers
	const updateApplicantAndApplicationRecords = useCallback(
		async (updatedCompleted, currentApplicationState) => {
			try {
				// Update the main Application Record
				const applicationRecord = {
					id: applicationID,
					...updatedCompleted,
					completedBy: user.uid,
					type: appConfig.type,
					status: ApplicationStatus.started,
					window: siteConfig.APPLICATION_DEADLINE,
					lastUpdated: new Date().toLocaleString(),
				};
				await saveCollectionData(collections.applications, applicationID, applicationRecord);

				// Sync critical info back to Applicant Profile
				const applicantUpdate = buildApplicantUpdate(currentApplicationState, applicant || {});
				if (Object.keys(applicantUpdate).length > 0) {
					await updateApplicantData(user.uid, applicantUpdate);
				}

				// Ensure application is linked to user
				await addApplicationToApplicant(user.uid, applicationID);
			} catch (error) {
				handleError(error, `updateRecords`);
			}
		},
		[applicationID, user, appConfig, siteConfig, applicant, handleError]
	);

	// Handler: Validation Passed -> Save & Proceed
	const handleValidationSuccess = useCallback(async () => {
		setSubmissionAttempted(false);

		const currentStepConfig = appConfig.pages[activeStep];

		// Skip saving for informational steps (like Confirmation)
		if (!currentStepConfig || currentStepConfig.section === 'confirmation') {
			handleNext();
			return;
		}

		const sectionKey = currentStepConfig.section;
		const collectionName = getCollectionNameForSection(sectionKey);
		const dataToSave = { ...application[sectionKey], completedBy: user.uid };
		const recordIdKey = getRecordIdKeyForSection(sectionKey);

		// Generate ID if missing
		let recordID = dataToSave[recordIdKey];
		if (!recordID) {
			recordID = uuidv4();
			dataToSave[recordIdKey] = recordID;
		}

		// Special handling for Projections (sync with Incomes)
		if (collectionName === collections.projections) {
			dataToSave['applicantEarnings'] = application.incomes?.earningsAppliedToEducation;
			dataToSave['applicantSavings'] = application.incomes?.savingsAppliedToEducation;
		}

		// Save Step Data
		const isStepSaved = await saveCollectionData(collectionName, recordID, dataToSave);

		if (isStepSaved) {
			const newCompleted = { ...completed, [sectionKey]: recordID };
			setCompleted(newCompleted);

			await updateApplicantAndApplicationRecords(newCompleted, application);

			showAlert('application', 'updated');
			handleNext();
		} else {
			showAlert('application', 'failed');
		}
	}, [activeStep, appConfig, application, completed, handleNext, showAlert, user, updateApplicantAndApplicationRecords]);

	const handleValidationFailure = useCallback(() => {
		setSubmissionAttempted(false);
		showAlert('validation', 'fields');
	}, [showAlert]);

	// Handler: "Next" Button Clicked
	const handleComplete = () => {
		if (isLastStep()) {
			handleNext();
			return;
		}
		if (siteConfig.VALIDATION_OVERRIDE) {
			handleValidationSuccess();
		} else {
			setSubmissionAttempted(true); // Triggers validation in GenericFormPage
		}
	};

	// Handler: Final Submission
	const handleApplicationSubmit = async (event) => {
		event.preventDefault();
		const now = new Date().toLocaleString();

		if (!appConfig) return;
		try {
			// 1. Mark as Submitted
			const submission = {
				id: applicationID,
				...completed,
				completedBy: user.uid,
				type: appConfig.type,
				status: ApplicationStatus.submitted,
				lastUpdated: now,
				submittedOn: now,
				window: siteConfig.APPLICATION_DEADLINE,
			};
			await saveCollectionData(collections.applications, applicationID, submission);
			showAlert('application', 'submitted');

			// 2. Check Completeness (Missing attachments?)
			const finalStatus = checkApplicationCompleteness(application, appConfig);
			await saveCollectionData(collections.applications, applicationID, { status: finalStatus });

			// 3. Send Notifications
			const firstName = application.profile?.applicantFirstName || applicant?.firstName;
			const lastName = application.profile?.applicantLastName || applicant?.lastName;
			const update = {
				id: user.uid,
				firstName: firstName,
				lastName: lastName,
				name: `${firstName} ${lastName}`,
				email: application.profile?.applicantEmailAddress || applicant?.email,
			};

			const template = finalStatus === ApplicationStatus.completed ? ContactTemplate.appCompleted : ContactTemplate.appIncomplete;

			await pushNotice(template, update, {});

			navigate(generatePath(paths.apply));
		} catch (error) {
			handleError(error, `handleSubmit_${applicationType}`);
		}
	};

	const renderActiveStepForm = () => {
		if (!appConfig) return null;
		const stepConfig = appConfig.pages[activeStep];
		if (!stepConfig) return <Typography>Page configuration is missing for this step.</Typography>;

		const PageComponent = componentMap[stepConfig.component];
		if (!PageComponent) return <Typography>Form component "{stepConfig.component}" not found.</Typography>;

		return <PageComponent sectionName={stepConfig.section} application={application} setApplication={setApplication} setHasErrors={setHasErrors} submissionAttempted={submissionAttempted} onValidationSuccess={handleValidationSuccess} onValidationFailure={handleValidationFailure} applicationType={appConfig.type} />;
	};

	const getButtonText = (original, smallScreenText) => (isSmallScreen ? smallScreenText : original);

	if (!appConfig || wasNotFound) return <NotFound />;
	if (loading) return <Loader />;

	return (
		<Box display='flex' flexDirection='column' justifyContent='center' alignItems='center' bgcolor='background.passive' color='secondary.main' sx={{ minHeight: '100vh', width: '100%' }}>
			<Box width={{ xs: '100%', lg: '90%', xl: '80%' }} padding={3} bgcolor='background.main' color='secondary.main' sx={{ borderRadius: { xs: 0, md: 4 }, boxShadow: boxShadow, display: 'flex', flexDirection: 'column', minHeight: { xs: '100vh', md: '95vh' }, marginY: { xs: 0, lg: 3 } }}>
				<CssBaseline />

				{/* Header & Stepper */}
				<Box sx={{ width: '100%', flexShrink: 0 }}>
					<Crumbs title={appConfig.title} />
					<Typography variant='caption' sx={{ display: { xs: 'block', lg: 'none' }, textAlign: 'center', my: 1 }}>
						Step {activeStep + 1} of {steps.length}: {steps[activeStep]}
					</Typography>
					<Stepper activeStep={activeStep} sx={{ display: { xs: 'none', lg: 'flex' }, overflowX: 'hidden', my: 2 }}>
						{steps.map((label, index) => (
							<Step key={label} completed={completed[appConfig.pages[index]?.section] !== undefined}>
								<StepButton color='inherit' onClick={() => setActiveStep(index)}>
									{label}
								</StepButton>
							</Step>
						))}
					</Stepper>
				</Box>

				{/* Main Form Area */}
				<Box sx={{ flexGrow: 1, overflowY: 'auto', width: '100%', px: { xs: 1, md: 2 }, position: 'relative' }}>{renderActiveStepForm()}</Box>

				{/* Footer Controls */}
				<Box sx={{ width: '100%', flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.main', pt: 2, pb: 1 }}>
					{isLastStep() ? (
						<Box sx={{ display: 'flex', flexDirection: 'row', px: 2 }}>
							<Button variant='outlined' color='inherit' onClick={handleLogout} sx={{ mr: 1 }}>
								{getButtonText('Return to Applicant Portal', 'Leave')}
							</Button>
							<Button variant='outlined' color='inherit' onClick={handleReset} sx={{ mr: 1 }}>
								{getButtonText('Clear & Start Over', 'Reset')}
							</Button>
							<Box sx={{ flex: '1 1 auto' }} />
							<Button variant='outlined' color='inherit' onClick={handleApplicationSubmit} disabled={hasErrors}>
								{getButtonText('Confirm & Submit', 'Submit')}
							</Button>
						</Box>
					) : (
						<Box sx={{ display: 'flex', flexDirection: 'row', px: 2 }}>
							<Button variant='outlined' color='inherit' onClick={handleLogout} sx={{ mr: 1 }}>
								{getButtonText('Save & Exit', 'Exit')}
							</Button>
							<Button variant='outlined' color='inherit' disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
								Back
							</Button>
							<Box sx={{ flex: '1 1 auto' }} />
							<Button variant='outlined' type='submit' onClick={handleComplete}>
								{getButtonText('Save & Continue', 'Next')}
							</Button>
						</Box>
					)}
					<CopyrightFooter sx={{ mt: 2, px: 2 }} />
				</Box>
			</Box>
		</Box>
	);
}