import React from 'react';
import { PersonOutline, DescriptionOutlined, HelpOutline, MailOutline, AttachFileOutlined } from '@mui/icons-material';

import { generatePath } from '../navigation/routeUtils';
import { paths } from '../navigation/paths';
import { capitalize } from '../Constants';
import { highlightMatch, sanitizeEmailString, findRelevantFamilyMember, findRelevantExperience } from './utils';

export const searchConfig = {
	members: {
		icon: <PersonOutline fontSize='small' />,
		title: 'Administrators',
		getPath: (item) => generatePath(paths.viewMember, { id: item.id }),
		getText: (item, term) => ({
			primary: highlightMatch(`${item.firstName} ${item.lastName}`, term),
			secondary: highlightMatch(`${item.position} | ${item.since}`, term),
		}),
	},
	applicants: {
		icon: <PersonOutline fontSize='small' />,
		title: 'Applicants',
		getPath: (item) => generatePath(paths.viewApplicant, { id: item.id }),
		getText: (item, term) => ({
			primary: highlightMatch(`${item.firstName} ${item.lastName}`, term),
			secondary: highlightMatch(`${item.email} | ${item.cell}`, term),
		}),
	},
	profiles: {
		icon: <PersonOutline fontSize='small' />,
		title: 'Applicant Profiles',
		getPath: (item) => generatePath(paths.viewApplicant, { id: item.id }),
		getText: (item, term) => ({
			primary: highlightMatch(`${item.applicantFirstName} ${item.applicantLastName}`, term),
			secondary: highlightMatch(item.applicantMailingAddress.structured_formatting.secondary_text, term),
		}),
	},
	applications: {
		icon: <DescriptionOutlined fontSize='small' />,
		title: 'Applications',
		getPath: (item) => generatePath(paths.viewApp, { id: item.id }),
		getText: (item, term) => ({
			primary: highlightMatch(`${item.status || 'N/A'} ${item.type || 'App'}`, term),
			secondary: highlightMatch(new Date(item.window).getFullYear(), term),
		}),
	},
	requests: {
		icon: <HelpOutline fontSize='small' />,
		title: 'Reference Requests',
		getPath: (item) => (item.applicationID ? generatePath(paths.viewApp, { id: item.applicationID }) : null),
		getText: (item, term) => ({
			primary: highlightMatch(`${capitalize(item.attachmentType)} for ${item.fromName}`, term),
			secondary: highlightMatch(`${item.name} <${item.email}>`, term),
		}),
	},
	mail: {
		icon: <MailOutline fontSize='small' />,
		title: 'Mail',
		getPath: (item) => (item.id ? generatePath(paths.viewEmail, { id: item.id }) : null),
		getText: (item, term) => ({
			primary: highlightMatch(item.subject || '(No Subject)', term),
			secondary: highlightMatch(`In: ${capitalize(item.folderName)} | From: ${sanitizeEmailString(item.sender) || 'Unknown'} | To: ${sanitizeEmailString(item.to) || 'Unknown'}`, term),
		}),
	},
	attachments: {
		icon: <AttachFileOutlined fontSize='small' />,
		title: 'Attachments',
		getPath: (item) => {
			if (!item.completedBy || typeof item.completedBy !== 'string') {
				return null;
			}
			return generatePath(paths.viewApplicant, { id: item.completedBy });
		},
		getText: (item, term) => {
			let relevantDisplayName = 'Attachment Record';
			const utilityKeys = new Set(['attachmentsID', 'completedBy', 'id', 'searchableTerms']);

			for (const key in item) {
				if (utilityKeys.has(key) || typeof item[key] !== 'object' || item[key] === null) {
					continue;
				}
				const attachmentData = item[key];
				if (attachmentData?.displayName) {
					if (term && attachmentData.displayName.toLowerCase().includes(term.toLowerCase())) {
						relevantDisplayName = attachmentData.displayName;
						break;
					}
				}
			}
			return {
				primary: highlightMatch(relevantDisplayName, term),
				secondary: `Applicant: ${item.completedBy || 'Unknown'}`,
			};
		},
	},
	education: {
		icon: <DescriptionOutlined fontSize='small' />,
		title: 'Education Records',
		getPath: (item) => (item.completedBy ? generatePath(paths.viewApplicant, { id: item.completedBy }) : null),
		getText: (item, term) => ({
			primary: highlightMatch(item.schoolName || 'Unknown School', term),
			secondary: `Major: ${highlightMatch(item.major || 'N/A', term)} | Grad Year: ${item.searchableTerms?.find((t) => /^\d{4}$/.test(t)) || 'N/A'}`,
		}),
	},
	families: {
		icon: <DescriptionOutlined fontSize='small' />,
		title: 'Family Records',
		getPath: (item) => (item.completedBy ? generatePath(paths.viewApplicant, { id: item.completedBy }) : null),
		getText: (item, term) => {
			const relevantMember = findRelevantFamilyMember(item.familyMembers, term);
			return {
				primary: highlightMatch(relevantMember?.fullName || 'Family Record', term),
				secondary: highlightMatch(relevantMember?.occupation || `Record ID: ${item.id}`, term),
			};
		},
	},
	experience: {
		icon: <DescriptionOutlined fontSize='small' />,
		title: 'Experience Records',
		getPath: (item) => (item.completedBy ? generatePath(paths.viewApplicant, { id: item.completedBy }) : null),
		getText: (item, term) => {
			const relevantExp = findRelevantExperience(item.positions, term);
			return {
				primary: highlightMatch(relevantExp?.organization || 'Experience Record', term),
				secondary: relevantExp ? `${highlightMatch(relevantExp.role, term)} | ${highlightMatch(relevantExp.location, term)}` : `Record ID: ${item.id}`,
			};
		},
	},
};
