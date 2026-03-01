/**
 * GLOBAL CONSTANTS & CONFIGURATION
 * ---------------------------------------------------------------------------
 * This file serves as the "Identity Hub" for the application.
 * It contains:
 * 1. Branding Definitions (Names, Logos, Colors, Contact Info).
 * 2. Asset Mappings (Images, Animations).
 * 3. System Constants (Route Keys, Alert Messages).
 * 4. Critical Utilities (Encryption, PDF Conversion, Link Generation).
 *
 * * REBRANDING GUIDE:
 * To adapt this software for a new organization, focus primarily on the
 * 'brand' object and the 'Assets' imports below.
 */

import { PersonOutlined as PersonOutlinedIcon, School as SchoolIcon, Church as ChurchIcon, Forest as ForestIcon, Savings as SavingsIcon, History as HistoryIcon, Apartment as CommunityIcon } from '@mui/icons-material';

import CryptoJS from 'crypto-js';
import * as pdfjsLib from 'pdfjs-dist/webpack.mjs';
import { getConfigFromDb } from './data/firebase';
import { ApplicationType } from './data/collections';

// --- Assets Imports ---
// To rebrand, replace these files in 'src/assets/images/'
import lightModeHero from '../assets/images/lightModeHero.png';
import lightModeLogo from '../assets/images/lightModeHeader.png';
import darkModeLogo from '../assets/images/darkModeHeader.png';
import darkModeHero from '../assets/images/darkModeHero.png';
import header from '../assets/images/header.png';
import logo from '../assets/images/logo.png';

// Lottie Animations
import accessDeniedAnimation from '../assets/lotties/AccessDenied.json';
import underConstructionAnimation from '../assets/lotties/UnderConstruction.json';
import contentNotFoundAnimation from '../assets/lotties/NotFound.json';

// --- 1. Branding Configuration ---

/**
 * Defines the visible identity of the organization.
 * Used in Email Templates, Footers, Page Titles, and Meta Tags.
 */
export const brand = {
	// Identity
	theOrganizationName: 'The Application Management Suite', // Formal name (e.g. "The Smith Foundation")
	organizationName: 'Application Management Suite', // Standard name
	organizationShortName: 'AMS', // Abbreviation (used in subject lines/nav)
	internalName: 'AMS', // Internal system code
	boardName: 'Review Committee', // Name of the group reviewing apps

	// Marketing & Content
	tagline: 'To facilitate the administration and review of applications, interviews, and deliberations.',
	broughtToYouBy: 'Full Stack Boston', // "Powered By" footer text

	// Contact Information (Displayed in Footers/Help pages)
	organizationAddress: 'Application Management Suite<br />Attn: AMS Board<br />123 Main St<br />City, ST 01234',
	organizationEstablished: 'City, State | Established 2000',
	contactEmail: 'demo@fullstackboston.com',
	helpEmail: 'demo@fullstackboston.com',
	contactTelephone: '+1-978-238-9832',

	// Web Presence
	url: 'https://ams.fullstackboston.com',
	domain: 'ams.fullstackboston.com',
	emailDomain: 'fullstackboston.com', // Used for validation logic

	// SEO / Meta Data
	metaAuthor: 'Full Stack Boston',
	keywords: 'Grant management software, Scholarship application system, AMS, Full Stack Boston, Applicant tracking',
	shortDescription: 'A comprehensive suite for managing grants, scholarships, and complex application workflows.',
	metaDescription: 'The Application Management Suite (AMS) by Full Stack Boston streamlines the intake, review, and awarding process.',
	contactType: 'Full Stack Boston',

	// Icons & Assets (Filenames in /public/)
	ogImage: 'header1200.png', // Open Graph Image (Social Sharing)
	favIcon: 'favicon-32x32.png',
	appleTouchIcon: 'android-chrome-192x192.png',

	// Theme Overrides (Environment Variables)
	themeColor: process.env.REACT_APP_THEME_COLOR,
	lightBackgroundColor: process.env.REACT_APP_PRELOAD_BG_LIGHT,
	darkBackgroundColor: process.env.REACT_APP_PRELOAD_BG_DARK,
};

/**
 * Defines the "From" addresses for system emails.
 * These are displayed in the Admin Dashboard for reference.
 */
export const senders = [
	{ id: '1', name: `${brand.organizationName} Demo`, email: brand.contactEmail },
	{ id: '2', name: 'AMS Webmaster', email: 'webmaster@fullstackboston.com' },
	{ id: '3', name: brand.organizationName, email: 'noreply@fullstackboston.com' },
];

/**
 * Maps logical asset keys to imported files.
 */
export const Assets = {
	logo: logo, // Square/Icon logo
	logoLM: lightModeLogo, // Header logo (Light Mode)
	logoDM: darkModeLogo, // Header logo (Dark Mode)
	heroLM: lightModeHero, // Login Screen Hero Image (Light Mode)
	heroDM: darkModeHero, // Login Screen Hero Image (Dark Mode)
	header: header, // Generic Header Image (Email Templates)
	accessDeniedLottie: accessDeniedAnimation,
	underConstructionLottie: underConstructionAnimation,
	notFoundLottie: contentNotFoundAnimation,
};

// --- 2. Feature Configuration ---

/**
 * Configurations for Letter of Recommendation requirements.
 * Defines the "Types" of letters applicants can/must request.
 */
export const LettersOfRecommendation = {
	religiousRecommendationLetter: {
		name: 'Religious Letter of Recommendation',
		purpose: 'attest the applicant takes an active role in their faith and religious community',
		icon: <ChurchIcon />,
		requiredBy: [ApplicationType.newApplication],
	},
	academicRecommendationLetter: {
		name: 'Academic Letter of Recommendation',
		purpose: 'attest the applicant excels in their academic pursuits',
		icon: <SchoolIcon />,
		requiredBy: [ApplicationType.newApplication, ApplicationType.returningGrant],
	},
	serviceRecommendationLetter: {
		name: 'Service Letter of Recommendation',
		purpose: "attest to the applicant's leadership and service in their organization or community",
		icon: <ForestIcon />,
		requiredBy: [ApplicationType.newApplication],
	},
};

/**
 * Aggregates all file attachment requirements for the "Attachments" page of the application.
 * Merges fixed requirements (Personal Letter, Transcript) with dynamic ones (Letters of Rec).
 */
export const attachmentFields = [
	{
		key: 'applicantPersonalLetter',
		label: 'Personal Letter',
		icon: <PersonOutlinedIcon />,
		requiredBy: [ApplicationType.newApplication, ApplicationType.returningGrant, ApplicationType.scholarship],
	},
	// Spread the LORs defined above
	...Object.keys(LettersOfRecommendation).map((key) => ({
		label: LettersOfRecommendation[key].name,
		key: key,
		icon: LettersOfRecommendation[key].icon,
		requiredBy: LettersOfRecommendation[key].requiredBy,
	})),
	{
		key: 'studentAidReport',
		label: 'Student Aid Report',
		icon: <SavingsIcon />,
		requiredBy: [ApplicationType.newApplication, ApplicationType.returningGrant],
	},
	{
		key: 'acceptanceLetter',
		label: 'School Acceptance Letter',
		icon: <CommunityIcon />,
		requiredBy: [ApplicationType.newApplication],
	},
	{
		key: 'academicTranscript',
		label: 'Most Recent Academic Transcript',
		icon: <HistoryIcon />,
		requiredBy: [ApplicationType.newApplication, ApplicationType.returningGrant, ApplicationType.scholarship],
	},
];

// --- 3. Routing Keys ---

/**
 * Internal Registry of Route IDs.
 * Used by the Sidebar and RouteUtils to refer to pages without hardcoding paths.
 */
export const Pages = {
	// Catch-alls
	caRoot: 'rootCatchAll',
	caApps: 'applicationsCatchAll',
	caMembers: 'membersCatchAll',
	caApplicants: 'applicantsCatchAll',
	notFound: '404',
	caAccessDenied: 'accessDenied',
	adminAccessDenied: 'adminAccessDenied',

	// Public / Auth
	root: 'root',
	logout: 'logout',
	redirect: 'redirect',
	home: 'home',
	applyHome: 'applyHome',
	login: 'login',

	// Application Process
	createApplication: 'createApplication',
	updateApplication: 'updateApplication',
	registerApplicant: 'registerApplicant',
	registerMember: 'registerMember',

	// Applicant Management
	allApplicants: 'allApplicants',
	viewApplicant: 'viewApplicant',
	editApplicant: 'editApplicant',
	newApplicant: 'newApplicant',

	// Member Management
	memberDash: 'memberDash',
	contactCenter: 'contactCenter',
	allMembers: 'allMembers',
	siteSettings: 'siteSettings',
	financeCenter: 'financeCenter',
	viewMember: 'viewMember',
	editMember: 'editMember',
	newMember: 'newMember',

	// Application Review
	reviewApp: 'reviewApp',
	allApps: 'allApps',
	applicationYear: 'applicationYear',
	allAppsInYear: 'allAppsInYear',
	newAppsInYear: 'newAppsInYear',
	returningAppsInYear: 'returningAppsInYear',
	scholarshipAppsInYear: 'scholarshipAppsInYear',
	completedApps: 'completedApps',
	eligibleApps: 'eligibleApps',
	invitedApps: 'invitedApps',
	awardedApps: 'awardedApps',
	rejectedApps: 'rejectedApps',
	deletedApps: 'deletedApps',
	incompleteApps: 'incompleteApps',
	viewApp: 'viewApp',
	exportApp: 'exportApp',
	archives: 'archives',

	// Utilities
	unsubscribe: 'unsub',
	requests: 'requests',
	allRequests: 'allRequests',
	editRequest: 'editRequest',
	newRequest: 'newRequest',

	// Interview Module
	interviews: 'interviews',
	scheduling: 'scheduling',
	waitingRoom: 'waitingRoom',
	interviewRoom: 'interviewRoom',
	deliberationRoom: 'deliberationRoom',
	interviewDash: 'interviewDash',
	rsvp: 'rsvp',
	aiReview: 'aiReview',

	// Messaging
	inbox: 'inbox',
	viewEmail: 'viewEmail',
};

// --- 4. System Messages ---

/**
 * Toast Notification Dictionary.
 * Grouped by feature for easy maintenance of system feedback text.
 */
export const AlertMessages = {
	general: {
		incomplete: { message: 'One or more required fields are incomplete!', type: 'warning' },
		unauthorized: { message: 'You cannot access this at this time.', type: 'error' },
		revoked: { message: 'Your access to the system is revoked.', type: 'error' },
		maintenance: { message: 'The system is down for maintenance. Please try again later.', type: 'error' },
		success: { message: 'Operation successfully completed.', type: 'success' },
	},
	login: {
		success: { message: 'You have successfully logged in!', type: 'success' },
		failed: { message: 'Error logging you in!', type: 'error' },
	},
	register: {
		success: { message: 'You have successfully registered!', type: 'success' },
		exists: { message: 'This email address is already registered. Try logging in instead!', type: 'info' },
		notmatching: { message: 'Your passwords do not match!', type: 'error' },
		failed: { message: 'Error registering for an account!', type: 'error' },
		password: { message: 'Passwords must be 8+ characters, including uppercase, lowercase, number, and symbol.', type: 'error' },
	},
	upload: {
		success: { message: 'Your upload was successful!', type: 'success' },
		failed: { message: 'Your upload has failed.', type: 'error' },
		incompatible: { message: 'Your file type is incompatible!', type: 'error' },
		unavailable: { message: 'Access to this file is unavailable.', type: 'warning' },
		missing: { message: 'The file could not be opened.', type: 'error' },
		deleted: { message: 'Your file was deleted successfully.', type: 'success' },
		type: { message: 'Files must be of PDF type only!', type: 'error' },
		size: { message: 'File size exceeds the limit. Please select a file smaller than 25MB.', type: 'error' },
		requested: { message: 'Your request was sent successfully!', type: 'success' },
	},
	settings: {
		success: { message: 'Your settings were updated successfully.', type: 'success' },
		failed: { message: 'The setting could not be updated.', type: 'error' },
	},
	application: {
		saved: { message: 'Your application progress has been saved!', type: 'success' },
		failed: { message: 'Failed to save your application progress.', type: 'error' },
		updated: { message: 'Step saved successfully!', type: 'success' },
		enabled: { message: 'This application is fully modifiable.', type: 'info' },
		disabled: { message: 'You cannot make changes to this application.', type: 'info' },
		submitted: { message: 'Your application was submitted successfully!', type: 'success' },
		error: { message: 'Error saving application!', type: 'error' },
		completed: { message: 'Your application is now complete!', type: 'success' },
		incomplete: { message: 'Your application is incomplete', type: 'warning' },
		deleted: { message: 'Your application was deleted.', type: 'success' },
	},
	applicant: {
		updated: { message: 'Applicant data updated successfully!', type: 'success' },
		failed: { message: 'Applicant update failed.', type: 'error' },
	},
	validation: {
		fields: { message: 'Please complete all required fields!', type: 'warning' },
		missing: { message: 'You must add at least one!', type: 'warning' },
	},
};

// --- 5. Utilities ---

const getDomain = () => globalThis.location.origin;
const ENV = process.env.REACT_APP_environment;
export const domain = ENV === 'development' ? 'https://localhost:3000' : getDomain();

// -- String Helpers --

export const capitalize = (s) => {
	if (typeof s !== 'string' || !s) return '';
	return s.charAt(0).toUpperCase() + s.slice(1);
};

export const generate6DigitNumber = () => {
	const randomNumber = Math.floor(Math.random() * 1000000);
	return String(randomNumber).padStart(6, '0');
};

// -- Security & Link Generation --

/**
 * Generates a secure, hashed PIN for verify-by-email flows.
 */
export const generateSecurePin = async (pin) => {
	const config = await getConfigFromDb();
	const hash = CryptoJS.HmacSHA256(pin, config.PIN_KEY).toString();
	const payload = `${pin}:${hash}`;
	return btoa(payload);
};

/**
 * Validates a PIN against its hash to prevent tampering.
 */
export const validatePin = async (pin) => {
	try {
		const config = await getConfigFromDb();
		const decodedPayload = atob(pin);
		const [code, hash] = decodedPayload.split(':');
		const recalculatedHash = CryptoJS.HmacSHA256(code, config.PIN_KEY).toString();
		return hash === recalculatedHash;
	} catch (error) {
		console.error('Error validating pin: ', error);
		return false;
	}
};

/**
 * Generates a secure "One-Click Upload" link for Reference Requests.
 */
export const generateUploadLink = async (requestID) => {
	const config = await getConfigFromDb();
	const hash = CryptoJS.HmacSHA256(requestID, config.UPLOAD_KEY).toString();
	const payload = `${requestID}:${hash}`;
	const encodedLink = btoa(payload);
	return `${domain}/requests/${encodedLink}`;
};

export const validateRequest = async (token) => {
	try {
		const config = await getConfigFromDb();
		const decodedPayload = atob(token);
		const [id, hash] = decodedPayload.split(':');
		const recalculatedHash = CryptoJS.HmacSHA256(id, config.UPLOAD_KEY).toString();
		const isValid = hash === recalculatedHash;
		return { result: isValid, id };
	} catch (error) {
		console.error('Error validating upload link:', error);
		return { result: false, error: error.message };
	}
};

/**
 * Generates a secure Unsubscribe link for emails.
 */
export const unsubscribeLink = async (id) => {
	const config = await getConfigFromDb();
	const hash = CryptoJS.HmacSHA256(id, config.UNSUB_KEY).toString();
	const payload = `${id}:${hash}`;
	const encodedLink = btoa(payload);
	return `${domain}/unsubscribe/${encodedLink}`;
};

export const validateLink = async (encID) => {
	try {
		const config = await getConfigFromDb();
		const decodedPayload = atob(encID);
		const [id, hash] = decodedPayload.split(':');
		const recalculatedHash = CryptoJS.HmacSHA256(id, config.UNSUB_KEY).toString();
		return { result: hash === recalculatedHash, id };
	} catch (error) {
		console.error('Error validating unsubscribe link:', error);
		return { result: false, error: error.message };
	}
};

// -- PDF Utilities --

/**
 * Converts the first page of a PDF Blob into an Image URL.
 * Used for generating thumbnails in the "Attachment Preview" view.
 */
export const convertPDFBlobToImages = async (blob) => {
	const objectURL = URL.createObjectURL(blob);
	const pdf = await pdfjsLib.getDocument(objectURL).promise;
	const pageCount = pdf.numPages;
	const imageURLs = [];

	// Render all pages
	for (let i = 1; i <= pageCount; i++) {
		const page = await pdf.getPage(i);
		const viewport = page.getViewport({ scale: 2 }); // High res

		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		canvas.height = viewport.height;
		canvas.width = viewport.width;

		await page.render({ canvasContext: context, viewport }).promise;

		const dataURL = canvas.toDataURL();
		imageURLs.push(dataURL);
	}

	URL.revokeObjectURL(objectURL);
	return imageURLs;
};

export const createBlobUrl = (blob) => URL.createObjectURL(blob);
export const revokeBlobUrl = (url) => URL.revokeObjectURL(url);

// --- 6. Email Templates ---

/**
 * Standard Email Header HTML.
 * Injects the brand logo, name, and tagline.
 */
export const emailHeader = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to ${brand.organizationShortName}</title></head><body style="width: 100%; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif;"><header><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px; margin-bottom: 20px; font-family: Arial, Helvetica, sans-serif;"><tr><td align="center"><table cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; padding: 20px; border-radius: 5px;"><tr><td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333; padding: 10px;"><h1 style="font-size: 24px; color: #006B3F; margin: 0;">${brand.theOrganizationName}</h1><p style="font-size: 16px; color: #666666; margin: 5px 0 20px;">${brand.tagline}</p></td></tr><tr><td style="border-top: 2px solid #006B3F; padding-top: 10px;"><p style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #666666; text-align: center;">${brand.organizationEstablished}</p></td></tr></table></td></tr></table></header>`;

/**
 * Dynamic Email Footer HTML (Includes Unsubscribe Link).
 */
export const emailFooter = (unsubLink) => {
	return `<footer><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px; margin-top: 20px; font-family: Arial, Helvetica, sans-serif;"><tr><td style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #666666; padding: 20px 0 10px; text-align: center;"><p>You are receiving this email because you opted in at our website.<br /><a href=${unsubLink} style="color: #006B3F;">Unsubscribe</a> | <a href="#" style="color: #006B3F;">Privacy Policy</a></p><p>© ${new Date().getFullYear()} ${brand.theOrganizationName}. All rights reserved.</p></td></tr></table></footer></body></html>`;
};

/**
 * Static Email Footer HTML (No Unsubscribe Link - for transactional emails).
 */
export const staticEmailFooter = `<footer><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px; margin-top: 20px; font-family: Arial, Helvetica, sans-serif;"><tr><td style="font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #666666; padding: 20px 0 10px; text-align: center;"><p>You are receiving this email because you opted in at our website.<br /><a href="#" style="color: #006B3F;">Privacy Policy</a></p><p>© ${new Date().getFullYear()} ${brand.theOrganizationName}. All rights reserved.</p></td></tr></table></footer></body></html>`;
