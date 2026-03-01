import { Box, Typography } from '@mui/material';
import { PersonAddAlt as NewIcon, Restore as ReturningIcon, WorkspacePremium as ScholarshipIcon, ReportProblem as IncompleteIcon, CheckCircleOutline as CompletedIcon, ThumbUpAltOutlined as EligibleIcon, MailOutline as InvitedIcon, MilitaryTech as AwardedIcon, CancelPresentation as RejectedIcon, DeleteOutline as DeletedIcon } from '@mui/icons-material';

import { ApplicationType, ApplicationStatus } from '../data/collections';
import { getRealTimeCurrentEligibleApplicationsCountByType, getRealTimeEligibleApplicationsCountByTypeAndWindow, getRealTimeApplicationCountByStatus, getRealTimeRejectedApplications, getRealTimeMostRecentApplicationIDs } from '../data/firebase';

// Components
import Featured from '../../components/featured/Featured';
import Chart from '../../components/chart/Chart';
import InterviewStatusPanel from '../../components/interviews/StatusPanel';
import CollapsableTable from '../../components/table/Table';

const year = new Date().getFullYear();

export const memberDashContent = {
	widgets: [
		{
			id: ApplicationType.newApplication,
			category: 'potentiallyEligible',
			fetcher: (callback) => getRealTimeCurrentEligibleApplicationsCountByType(ApplicationType.newApplication, callback),
			comparisonFetcher: (deadline, callback) => getRealTimeEligibleApplicationsCountByTypeAndWindow(ApplicationType.newApplication, deadline, callback),
			isGainPositive: (current, previous) => current >= previous,
			title: 'STANDARD GRANTS',
			linkText: 'View Queue',
			link: `/applications/${year}/newApplicants`,
			IconComponent: NewIcon,
			color: 'custom.yellow',
		},
		{
			id: ApplicationType.returningGrant,
			category: 'potentiallyEligible',
			fetcher: (callback) => getRealTimeCurrentEligibleApplicationsCountByType(ApplicationType.returningGrant, callback),
			comparisonFetcher: (deadline, callback) => getRealTimeEligibleApplicationsCountByTypeAndWindow(ApplicationType.returningGrant, deadline, callback),
			isGainPositive: (current, previous) => current >= previous,
			title: 'RENEWALS',
			linkText: 'View Queue',
			link: `/applications/${year}/returningGrants`,
			IconComponent: ReturningIcon,
			color: 'custom.blue',
		},
		{
			id: ApplicationType.scholarship,
			category: 'potentiallyEligible',
			fetcher: (callback) => getRealTimeCurrentEligibleApplicationsCountByType(ApplicationType.scholarship, callback),
			comparisonFetcher: (deadline, callback) => getRealTimeEligibleApplicationsCountByTypeAndWindow(ApplicationType.scholarship, deadline, callback),
			isGainPositive: (current, previous) => current >= previous,
			title: 'COMPLIANCE',
			linkText: 'View Check-ins',
			link: `/applications/${year}/scholarshipRecipients`,
			IconComponent: ScholarshipIcon,
			color: 'custom.brown',
		},
		{
			id: ApplicationStatus.incomplete,
			category: 'potentiallyEligible',
			fetcher: (callback) => getRealTimeApplicationCountByStatus(ApplicationStatus.incomplete, callback),
			isGainPositive: (current) => current <= 0,
			title: 'INCOMPLETE',
			linkText: 'View Stalled Apps',
			link: `/applications/incomplete`,
			IconComponent: IncompleteIcon,
			color: 'custom.red',
		},
		{
			id: ApplicationStatus.completed,
			category: 'status',
			fetcher: (callback) => getRealTimeApplicationCountByStatus(ApplicationStatus.completed, callback),
			title: 'COMPLETED',
			linkText: 'Ready for Review',
			link: `/applications/completed`,
			IconComponent: CompletedIcon,
			color: 'custom.yellow',
		},
		{
			id: ApplicationStatus.eligible,
			category: 'status',
			fetcher: (callback) => getRealTimeApplicationCountByStatus(ApplicationStatus.eligible, callback),
			title: 'ELIGIBLE',
			linkText: 'Qualified Candidates',
			link: `/applications/eligible`,
			IconComponent: EligibleIcon,
			color: 'custom.green',
		},
		{
			id: ApplicationStatus.invited,
			category: 'status',
			fetcher: (callback) => getRealTimeApplicationCountByStatus(ApplicationStatus.invited, callback),
			title: 'INVITED',
			linkText: 'Interview Queue',
			link: `/applications/invited`,
			IconComponent: InvitedIcon,
			color: 'custom.green',
		},
		{
			id: ApplicationStatus.awarded,
			category: 'status',
			fetcher: (callback) => getRealTimeApplicationCountByStatus(ApplicationStatus.awarded, callback),
			title: 'AWARDED',
			linkText: 'Finalized Grants',
			link: `/applications/awarded`,
			IconComponent: AwardedIcon,
			color: 'custom.yellow',
		},
		{
			id: 'rejected',
			category: 'status',
			fetcher: (callback) => getRealTimeRejectedApplications(callback),
			title: 'REJECTED',
			linkText: 'View Denials',
			link: `/applications/rejected`,
			IconComponent: RejectedIcon,
			color: 'custom.brown',
		},
		{
			id: ApplicationStatus.deleted,
			category: 'status',
			fetcher: (callback) => getRealTimeApplicationCountByStatus(ApplicationStatus.deleted, callback),
			title: 'DELETED',
			linkText: 'View Trash',
			link: `/applications/deleted`,
			IconComponent: DeletedIcon,
			color: 'custom.red',
		},
	],
	layout: [
		{ id: 'widgets', type: 'widgets' },
		{
			id: 'featuredComponent',
			type: 'customRow',
			containerSx: {
				flexDirection: { xs: 'column', lg: 'row' },
				height: { xs: 'auto', sm: 'auto', md: 'auto', lg: '515px' },
			},
			components: [
				{
					id: 'featured',
					component: Featured,
					wrapperSx: {
						flexGrow: 0,
						flexShrink: 1,
						flexBasis: { xs: '100%', md: '360px' },
					},
				},
				{
					id: 'chart',
					component: Chart,
					props: { title: 'PROGRAM HISTORY' },
					wrapperSx: {
						flexGrow: { xs: 0, md: 1 },
						flexShrink: 1,
						flexBasis: { xs: '100%', md: 'auto' },
						height: '100%',
					},
				},
				{
					id: 'interviews',
					component: InterviewStatusPanel,
					wrapperSx: {
						flexGrow: 0,
						flexShrink: 1,
						flexBasis: { xs: '100%', md: '320px' },
					},
				},
			],
		},
		{
			id: 'recentAppsComponent',
			type: 'customRow',
			display: { xs: 'none', sm: 'flex' },
			containerSx: {
				flexDirection: 'column',
				gap: '14px',
				bgcolor: 'background.paper',
				borderRadius: '12px',
			},
			components: [
				{
					id: 'recentAppsTable',
					component: ({ data }) => (
						<Box display='flex' flexDirection='column' width='100%' mx={1} my={1}>
							<Typography fontWeight='bold' fontSize='15px' color='text.secondary' my={2} pl={3}>
								RECENT ACTIVITY
							</Typography>
							<CollapsableTable data={data} />
						</Box>
					),
					fetcher: (callback) => getRealTimeMostRecentApplicationIDs(callback, 5),
					initialState: [],
				},
			],
		},
	],
};
