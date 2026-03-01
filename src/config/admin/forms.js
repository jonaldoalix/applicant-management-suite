import React from 'react';
import { PersonOutline } from '@mui/icons-material';
import { Typography } from '@mui/material';

import { UserType, collections } from '../data/collections';
import { paths } from '../navigation/paths';
import { memberFormConfig, applicantFormConfig, requestFormConfig } from '../ui/formConfig';

// Form Components
import { EmailForm } from '../../components/forms/members/Emails';
import { MemberForm } from '../../components/forms/members/Members';
import { ApplicantForm } from '../../components/forms/members/Applicants';
import { RequestForm } from '../../components/forms/members/Requests';

// Card Components
import { Member } from '../../components/cards/Member';
import { Applicant } from '../../components/cards/Applicant';
import { Application } from '../../components/cards/Application';
import EmailCard from '../../components/cards/Email';

export const memberRegistrationContent = {
	title: (
		<Typography component='h1' variant='h5' marginBottom={2} textAlign={'center'}>
			Create Admin Account
		</Typography>
	),
	icon: <PersonOutline />,
	fields: [
		{ component: 'TextField', name: 'firstName', label: 'First Name', required: true, autoComplete: 'given-name', autoFocus: true },
		{ component: 'TextField', name: 'lastName', label: 'Last Name', required: true, autoComplete: 'family-name' },
		{ component: 'TextField', name: 'position', label: 'Title / Role', required: true, autoComplete: 'organization-title' },
		{ component: 'TextField', name: 'since', label: 'Start Year', required: true },
		{ component: 'ProfilePictureUpload', name: 'picture' },
		{ component: 'TextField', name: 'email', label: 'Email Address', type: 'email', required: true, autoComplete: 'email' },
		{ component: 'TextField', name: 'cell', label: 'Cell Phone', type: 'tel', autoComplete: 'tel' },
		{ component: 'TextField', name: 'password', label: 'Password', type: 'password', required: true, autoComplete: 'new-password' },
		{ component: 'TextField', name: 'confirmPassword', label: 'Confirm Password', type: 'password', required: true, autoComplete: 'new-password' },
	],
	buttons: [
		{ id: 'submit', label: 'Register Admin', type: 'submit', variant: 'outlined', fullWidth: true },
		{ id: 'home', label: 'Cancel', variant: 'outlined', fullWidth: true, navigationPath: paths.home },
	],
	links: [{ id: 'signIn', label: 'Already have an account? Sign In', navigationPath: paths.login }],
};

export const viewAsset = {
	[UserType.member]: {
		title: 'Admin Profile',
		collection: collections.members,
		renderComponent: (data) => <Member member={data} />,
	},
	[UserType.applicant]: {
		title: 'Applicant Profile',
		collection: collections.applicants,
		renderComponent: (data) => <Applicant applicant={data} />,
	},
	application: {
		title: 'Application',
		collection: collections.applications,
		renderComponent: (data) => <Application application={data} />,
	},
	email: {
		title: 'Email',
		collection: collections.mailCache,
		renderComponent: (data) => <EmailCard email={data} />,
	},
};

export const creatableContent = {
	[UserType.member]: {
		collection: collections.members,
		formConfig: memberFormConfig,
		renderForm: <MemberForm />,
	},
	[UserType.applicant]: {
		collection: collections.applicants,
		formConfig: applicantFormConfig,
		renderForm: <ApplicantForm />,
	},
	email: {
		collection: collections.mailCache,
		formConfig: { title: 'Email' },
		renderForm: <EmailForm />,
	},
};

export const editableContent = {
	[UserType.member]: {
		collection: collections.members,
		formConfig: memberFormConfig,
		renderForm: (data) => <MemberForm member={data} />,
	},
	[UserType.applicant]: {
		collection: collections.applicants,
		formConfig: applicantFormConfig,
		renderForm: (data) => <ApplicantForm applicant={data} />,
	},
	Request: {
		collection: collections.requests,
		formConfig: requestFormConfig,
		renderForm: (data) => <RequestForm request={data} />,
	},
};
