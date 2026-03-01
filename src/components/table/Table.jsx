/**
 * Collapsable Application Table
 * A complex table component that displays a summary list of applications.
 * Features:
 * - Expandable rows (Accordion style).
 * - On-demand data fetching for expanded rows (Profile, Family, Finances, etc.).
 * - Embedded "Notes" and "Attachment Viewer" for detailed review.
 */

import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Button, Box, Collapse, Typography, Divider, CircularProgress } from '@mui/material';
import { KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon, SchoolOutlined } from '@mui/icons-material';

// Context
import { useTheme } from '../../context/ThemeContext';

// Config & Backend
import { collections } from '../../config/data/collections';
import { getCollectionData, getApplication, getAwardsData } from '../../config/data/firebase';

// Components
import AttachmentViewer from '../interviews/AttachmentViewer';
import NotesSection from '../notes/NotesSection';

// --- Constants & Helpers ---

const detailTableHeadStyles = {
	fontWeight: 'bold',
	color: 'text.primary',
	bgcolor: 'action.hover',
};

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

// --- Custom Hook for Data Fetching ---

const useApplicationData = (id) => {
	const [data, setData] = useState({
		app: null,
		profile: null,
		family: null,
		education: null,
		experience: null,
		expenses: null,
		incomes: null,
		contributions: null,
		projections: null,
		attachments: null,
		awards: [],
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchAllData = async () => {
			if (!id) return;
			setLoading(true);
			try {
				// 1. Fetch Main Application Doc
				const app = await getApplication(id, id);
				if (!app) {
					setLoading(false);
					return;
				}

				// 2. Fetch all related sub-documents in parallel
				const [profile, family, education, experience, expenses, incomes, contributions, projections, attachments, awards] = await Promise.all([getCollectionData(app.completedBy, collections.profiles, app.profile), getCollectionData(app.completedBy, collections.families, app.family), getCollectionData(app.completedBy, collections.education, app.education), getCollectionData(app.completedBy, collections.experience, app.experience), getCollectionData(app.completedBy, collections.expenses, app.expenses), getCollectionData(app.completedBy, collections.incomes, app.incomes), getCollectionData(app.completedBy, collections.contributions, app.contributions), getCollectionData(app.completedBy, collections.projections, app.projections), getCollectionData(app.completedBy, collections.attachments, app.attachments), getAwardsData(app.completedBy, app.awards || [])]);

				setData({
					app,
					profile,
					family,
					education,
					experience,
					expenses,
					incomes,
					contributions,
					projections,
					attachments,
					awards,
				});
			} catch (error) {
				console.error('Failed to fetch application data:', error.message);
			} finally {
				setLoading(false);
			}
		};
		fetchAllData();
	}, [id]);

	const totalAwarded = useMemo(() => {
		if (!Array.isArray(data.awards)) return 0;
		return data.awards.reduce((sum, award) => sum + (Number.parseFloat(award.awardAmount) || 0), 0);
	}, [data.awards]);

	return { ...data, totalAwarded, loading };
};

// --- Sub-Components (Detail Views) ---

export const DetailSection = ({ title, children }) => {
	const { darkMode } = useTheme();
	return (
		<Box sx={{ marginY: '15px' }}>
			<Typography variant='h6' gutterBottom component='div' color={darkMode ? 'primary.main' : 'highlight.main'} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
				{title}
			</Typography>
			{children}
		</Box>
	);
};

DetailSection.propTypes = {
	title: PropTypes.string.isRequired,
	children: PropTypes.node.isRequired,
};

export const ProfileDetails = ({ data }) => (
	<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
		<Table size='small' aria-label='Profile'>
			<TableHead>
				<TableRow>
					<TableCell sx={detailTableHeadStyles}>Name</TableCell>
					<TableCell sx={detailTableHeadStyles}>DOB &amp; Age</TableCell>
					<TableCell sx={detailTableHeadStyles}>Address</TableCell>
					<TableCell sx={detailTableHeadStyles}>Cell Number</TableCell>
					<TableCell sx={detailTableHeadStyles}>Email Address</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				<TableRow>
					<TableCell component='th' scope='row'>{`${data.applicantFirstName} ${data.applicantMiddleInitial || ''} ${data.applicantLastName}`}</TableCell>
					<TableCell>{`${dayjs(data.applicantDOB).add(12, 'hour').format('M/D/YYYY')} (${calculateAge(data.applicantDOB)})`}</TableCell>
					<TableCell>{data.applicantMailingAddress?.description || 'N/A'}</TableCell>
					<TableCell>{data.applicantCellPhone}</TableCell>
					<TableCell>{data.applicantEmailAddress}</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	</TableContainer>
);

ProfileDetails.propTypes = { data: PropTypes.object.isRequired };

export const FamilyDetails = ({ data }) => (
	<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
		<Table size='small' aria-label='family'>
			<TableHead>
				<TableRow>
					<TableCell sx={detailTableHeadStyles}>Name</TableCell>
					<TableCell sx={detailTableHeadStyles}>Occupation</TableCell>
					<TableCell sx={detailTableHeadStyles}>Age</TableCell>
					<TableCell sx={detailTableHeadStyles}>Relation</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				{data.familyMembers?.length > 0 ? (
					data.familyMembers.map((entry) => (
						<TableRow key={`${entry.relation}-${entry.fullName}`}>
							<TableCell>{entry.fullName}</TableCell>
							<TableCell>{entry.occupation}</TableCell>
							<TableCell>{entry.age}</TableCell>
							<TableCell>{entry.relation}</TableCell>
						</TableRow>
					))
				) : (
					<TableRow>
						<TableCell colSpan={4}>No family reported.</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	</TableContainer>
);

FamilyDetails.propTypes = { data: PropTypes.object.isRequired };

export const EducationDetails = ({ data }) => (
	<>
		<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider', marginBottom: '10px' }}>
			<Table size='small' aria-label='education'>
				<TableHead>
					<TableRow>
						<TableCell sx={detailTableHeadStyles}>Current School Name</TableCell>
						<TableCell sx={detailTableHeadStyles}>Current Major</TableCell>
						<TableCell sx={detailTableHeadStyles}>Grad Date</TableCell>
						<TableCell sx={detailTableHeadStyles}>GPA</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell>{data.schoolName}</TableCell>
						<TableCell>{data.major}</TableCell>
						<TableCell>{data.expectedGraduationDate ? dayjs(data.expectedGraduationDate).add(12, 'hour').format('MMMM YYYY') : 'N/A'}</TableCell>
						<TableCell>{data.currentGPA}</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
		<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
			<Table size='small' aria-label='previousEducation'>
				<TableHead>
					<TableRow>
						<TableCell sx={detailTableHeadStyles}>Previous Schools Attended</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{data.previousSchools?.length > 0 ? (
						data.previousSchools.map((school) => (
							<TableRow key={school}>
								<TableCell>{school}</TableCell>
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell>No previous education reported.</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</TableContainer>
	</>
);

EducationDetails.propTypes = { data: PropTypes.object.isRequired };

export const ExperienceDetails = ({ data }) => {
	const currentIndex = parseInt(data.currentOrganization, 10);
	const currentPos = Array.isArray(data.positions) ? data.positions[currentIndex] : null;

	const currentOrgString = currentPos ? `${currentPos.role} | ${currentPos.organization}` : 'N/A';

	return (
		<>
			<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider', marginBottom: '10px' }}>
				<Table size='small' aria-label='experience'>
					<TableHead>
						<TableRow>
							<TableCell sx={detailTableHeadStyles}>Current Organization</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						<TableRow>
							<TableCell>{currentOrgString}</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</TableContainer>
			<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
				<Table size='small' aria-label='experiences'>
					<TableHead>
						<TableRow>
							<TableCell sx={detailTableHeadStyles}>Organization</TableCell>
							<TableCell sx={detailTableHeadStyles}>Location</TableCell>
							<TableCell sx={detailTableHeadStyles}>Role</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{data.positions?.length > 0 ? (
							data.positions?.map((pos) => (
								<TableRow key={`${pos.type}-${pos.organization}`}>
									<TableCell>{`${pos.type} - ${pos.organization}`}</TableCell>
									<TableCell>{pos.location}</TableCell>
									<TableCell>{pos.role}</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={3}>No experience reported.</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</TableContainer>
		</>
	);
};

ExperienceDetails.propTypes = { data: PropTypes.object.isRequired };

export const ExpensesDetails = ({ data }) => (
	<>
		<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider', marginBottom: '10px' }}>
			<Table size='small' aria-label='expenses'>
				<TableHead>
					<TableRow>
						<TableCell sx={detailTableHeadStyles}>Tuition Costs</TableCell>
						<TableCell sx={detailTableHeadStyles}>Room &amp; Board</TableCell>
						<TableCell sx={detailTableHeadStyles}>Books</TableCell>
						<TableCell sx={detailTableHeadStyles}>Commuting</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell>{data.tuitionCost}</TableCell>
						<TableCell>{data.roomAndBoardCost}</TableCell>
						<TableCell>{data.bookCost}</TableCell>
						<TableCell>{data.commutingCost}</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
		<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
			<Table size='small' aria-label='otherExpenses'>
				<TableHead>
					<TableRow>
						<TableCell sx={detailTableHeadStyles}>Description</TableCell>
						<TableCell sx={detailTableHeadStyles}>Amount</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{data.otherExpenses?.length > 0 ? (
						data.otherExpenses.map((exp) => (
							<TableRow key={exp.title}>
								<TableCell>{exp.title}</TableCell>
								<TableCell>{exp.amount}</TableCell>
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={2}>No other expenses reported.</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</TableContainer>
	</>
);

ExpensesDetails.propTypes = { data: PropTypes.object.isRequired };

export const IncomesDetails = ({ data }) => (
	<>
		<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider', marginBottom: '10px' }}>
			<Table size='small' aria-label='incomes'>
				<TableHead>
					<TableRow>
						<TableCell sx={detailTableHeadStyles}>Summer Earnings</TableCell>
						<TableCell sx={detailTableHeadStyles}>Fall Earnings</TableCell>
						<TableCell sx={detailTableHeadStyles}>Winter Earnings</TableCell>
						<TableCell sx={detailTableHeadStyles}>Spring Earnings</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell>{data.summerEarnings}</TableCell>
						<TableCell>{data.fallEarnings}</TableCell>
						<TableCell>{data.winterEarnings}</TableCell>
						<TableCell>{data.springEarnings}</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
		<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider', marginBottom: '10px' }}>
			<Table size='small' aria-label='accumulatedIncomes'>
				<TableHead>
					<TableRow>
						<TableCell sx={detailTableHeadStyles}>Earnings Applied</TableCell>
						<TableCell sx={detailTableHeadStyles}>Savings Applied</TableCell>
						<TableCell sx={detailTableHeadStyles}>School Awards</TableCell>
						<TableCell sx={detailTableHeadStyles}>Loans</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell>{data.earningsAppliedToEducation}</TableCell>
						<TableCell>{data.savingsAppliedToEducation}</TableCell>
						<TableCell>{data.collegeAward}</TableCell>
						<TableCell>{data.loansAmount}</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
		<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
			<Table size='small' aria-label='otherIncomes'>
				<TableHead>
					<TableRow>
						<TableCell sx={detailTableHeadStyles}>Description</TableCell>
						<TableCell sx={detailTableHeadStyles}>Amount</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{data.otherIncomeSources?.length > 0 ? (
						data.otherIncomeSources.map((income) => (
							<TableRow key={income.title}>
								<TableCell>{income.title}</TableCell>
								<TableCell>{income.amount}</TableCell>
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={2}>No other income sources reported.</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</TableContainer>
	</>
);

IncomesDetails.propTypes = { data: PropTypes.object.isRequired };

export const ContributionsDetails = ({ data }) => (
	<>
		<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider', marginBottom: '10px' }}>
			<Table size='small' aria-label='contributions'>
				<TableHead>
					<TableRow>
						<TableCell sx={detailTableHeadStyles}>Parent 1 Income</TableCell>
						<TableCell sx={detailTableHeadStyles}>Parent 2 Income</TableCell>
						<TableCell sx={detailTableHeadStyles}>Investment Income</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell>{data.p1ExpectedAnnualIncome}</TableCell>
						<TableCell>{data.p2ExpectedAnnualIncome}</TableCell>
						<TableCell>{data.parentInvestmentIncome}</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
		<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider', marginBottom: '10px' }}>
			<Table size='small' aria-label='parentFinances'>
				<TableHead>
					<TableRow>
						<TableCell sx={detailTableHeadStyles}>Parent&apos;s Own Home?</TableCell>
						<TableCell sx={detailTableHeadStyles}>Parent&apos;s Married?</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell>{data.parentsOwnOrRentHome}</TableCell>
						<TableCell>{data.parentsMaritalStatus}</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
		<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider', marginBottom: '10px' }}>
			<Table size='small' aria-label='siblingSchools'>
				<TableHead>
					<TableRow>
						<TableCell sx={detailTableHeadStyles}>School Name</TableCell>
						<TableCell sx={detailTableHeadStyles}>Cost</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{data.siblingSchools?.length > 0 ? (
						data.siblingSchools.map((school) => (
							<TableRow key={school.title}>
								<TableCell>{school.title}</TableCell>
								<TableCell>{school.cost}</TableCell>
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell colSpan={2}>No sibling school expenses reported.</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</TableContainer>
		<Typography gutterBottom paddingTop={1} color='primary'>
			Extraordinary Circumstances &amp; Expenses
		</Typography>
		<Typography gutterBottom component='div'>
			{data.anyExtraordinaryExpenses || 'None reported.'}
		</Typography>
	</>
);

ContributionsDetails.propTypes = { data: PropTypes.object.isRequired };

export const ProjectionsDetails = ({ data }) => (
	<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
		<Table size='small' aria-label='projections'>
			<TableHead>
				<TableRow>
					<TableCell sx={detailTableHeadStyles}>Applicant Earnings</TableCell>
					<TableCell sx={detailTableHeadStyles}>Applicant Savings</TableCell>
					<TableCell sx={detailTableHeadStyles}>Family Contributions</TableCell>
					<TableCell sx={detailTableHeadStyles}>Request from Fund</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				<TableRow>
					<TableCell>{data.applicantEarnings}</TableCell>
					<TableCell>{data.applicantSavings}</TableCell>
					<TableCell>{data.applicantFamily}</TableCell>
					<TableCell>{data.request}</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	</TableContainer>
);

ProjectionsDetails.propTypes = { data: PropTypes.object.isRequired };

export const AttachmentDetails = ({ data }) => (
	<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
		<Table size='small' aria-label='attachments'>
			<TableHead>
				<TableRow>
					<TableCell sx={detailTableHeadStyles}>Personal Letter</TableCell>
					<TableCell sx={detailTableHeadStyles}>Academic Rec</TableCell>
					<TableCell sx={detailTableHeadStyles}>Religious Rec</TableCell>
					<TableCell sx={detailTableHeadStyles}>Experience Rec</TableCell>
					<TableCell sx={detailTableHeadStyles}>Student Aid Report</TableCell>
					<TableCell sx={detailTableHeadStyles}>Transcript</TableCell>
					<TableCell sx={detailTableHeadStyles}>Acceptance Letter</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				<TableRow>
					{['applicantPersonalLetter', 'academicRecommendationLetter', 'religiousRecommendationLetter', 'scoutRecommendationLetter', 'studentAidReport', 'academicTranscript', 'acceptanceLetter'].map((key) => (
						<TableCell key={key}>
							{data?.[key]?.home ? (
								<Button variant='outlined' href={data[key].home} target='_blank' rel='noopener noreferrer'>
									View
								</Button>
							) : (
								'None'
							)}
						</TableCell>
					))}
				</TableRow>
			</TableBody>
		</Table>
	</TableContainer>
);

AttachmentDetails.propTypes = { data: PropTypes.object };

export const AwardsDetails = ({ data }) => (
	<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
		<Table size='small' aria-label='awards'>
			<TableHead>
				<TableRow>
					<TableCell sx={detailTableHeadStyles}>Date</TableCell>
					<TableCell sx={detailTableHeadStyles}>Type</TableCell>
					<TableCell sx={detailTableHeadStyles}>Award Amount</TableCell>
					<TableCell sx={detailTableHeadStyles}>Message</TableCell>
				</TableRow>
			</TableHead>
			<TableBody>
				{data.map((award) => (
					<TableRow key={award.awardID}>
						<TableCell>{dayjs(award.createdOn).toDate().toLocaleDateString()}</TableCell>
						<TableCell>{award.type}</TableCell>
						<TableCell>
							{Number(award.awardAmount || 0).toLocaleString('en-US', {
								style: 'currency',
								currency: 'USD',
							})}
						</TableCell>
						<TableCell>{award.message}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	</TableContainer>
);

AwardsDetails.propTypes = { data: PropTypes.array.isRequired };

// --- Main Row Component ---

const ApplicationRow = ({ id, attachments: showExtraDetails = false }) => {
	const [open, setOpen] = useState(false);
	const { darkMode } = useTheme();
	const { app, profile, family, education, experience, expenses, incomes, contributions, projections, attachments, awards, totalAwarded, loading } = useApplicationData(id);

	const tableCellStyles = {
		color: 'text.primary',
		fontWeight: 500,
		borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
	};

	if (loading) {
		return (
			<TableRow>
				<TableCell colSpan={7} align='center'>
					<CircularProgress size={24} />
				</TableCell>
			</TableRow>
		);
	}

	return (
		<React.Fragment>
			{/* Summary Row */}
			<TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
				<TableCell sx={tableCellStyles}>
					<IconButton aria-label='expand row' size='small' onClick={() => setOpen(!open)}>
						{open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
					</IconButton>
				</TableCell>
				<TableCell component='th' sx={tableCellStyles}>
					{app?.type || 'Unknown'}
				</TableCell>
				<TableCell sx={tableCellStyles}>{app?.window ? new Date(app.window).getFullYear() : 'N/A'}</TableCell>
				<TableCell sx={tableCellStyles}>{app?.status}</TableCell>
				<TableCell sx={tableCellStyles}>{app?.submittedOn ? new Date(app.submittedOn).toLocaleString() : 'N/A'}</TableCell>
				<TableCell sx={tableCellStyles}>{`${education?.schoolName || 'N/A'} | ${education?.expectedGraduationDate ? new Date(education.expectedGraduationDate).getFullYear() : 'N/A'}`}</TableCell>
				<TableCell sx={tableCellStyles}>
					{totalAwarded.toLocaleString('en-US', {
						style: 'currency',
						currency: 'USD',
					})}
				</TableCell>
			</TableRow>

			{/* Collapsed Details Row */}
			<TableRow>
				<TableCell
					sx={{
						paddingBottom: 0,
						paddingTop: 0,
						backgroundColor: darkMode ? 'background.paper' : 'custom.white',
					}}
					colSpan={7}>
					<Collapse in={open} timeout='auto' unmountOnExit>
						<Box
							sx={{
								margin: 2,
								padding: 2,
								borderRadius: '8px',
								border: '1px solid',
								borderColor: 'divider',
								// Restored original background color logic
								backgroundColor: 'background.main',
							}}>
							{profile && (
								<DetailSection title='Profile'>
									<ProfileDetails data={profile} />
								</DetailSection>
							)}
							{family && (
								<DetailSection title='Family'>
									<FamilyDetails data={family} />
								</DetailSection>
							)}
							{education && (
								<DetailSection title='Education'>
									<EducationDetails data={education} />
								</DetailSection>
							)}
							{experience && (
								<DetailSection title='Experience'>
									<ExperienceDetails data={experience} />
								</DetailSection>
							)}
							{expenses && (
								<DetailSection title='Expenses'>
									<ExpensesDetails data={expenses} />
								</DetailSection>
							)}
							{incomes && (
								<DetailSection title='Incomes'>
									<IncomesDetails data={incomes} />
								</DetailSection>
							)}
							{contributions && (
								<DetailSection title='Contributions'>
									<ContributionsDetails data={contributions} />
								</DetailSection>
							)}
							{projections && (
								<DetailSection title='Projections'>
									<ProjectionsDetails data={projections} />
								</DetailSection>
							)}
							{attachments && (
								<DetailSection title='Attachments'>
									<AttachmentDetails data={attachments} />
								</DetailSection>
							)}
							{awards?.length > 0 && (
								<DetailSection title='Awards'>
									<AwardsDetails data={awards} />
								</DetailSection>
							)}

							<Box sx={{ marginY: '15px' }}>
								<Typography variant='h6' gutterBottom component='div'>
									Completed By
								</Typography>
								<Typography gutterBottom>{app?.completedBy}</Typography>
							</Box>

							{/* Extra Review Tools */}
							{showExtraDetails && (
								<>
									<Divider sx={{ mb: 2 }} />
									<NotesSection targetId={app.id} targetCollection={collections.applications} />
									<AttachmentViewer application={app} />
								</>
							)}
						</Box>
					</Collapse>
				</TableCell>
			</TableRow>
		</React.Fragment>
	);
};

ApplicationRow.propTypes = {
	id: PropTypes.string.isRequired,
	attachments: PropTypes.bool,
};

// --- Main Table Component ---

const CollapsableTable = ({ data, attachments = false }) => {
	const { darkMode } = useTheme();

	const tableHeaderCellStyles = {
		color: 'text.primary',
		fontWeight: 'bold',
		// Restored original specific borders
		borderBottom: darkMode ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(0, 0, 0, 0.2)',
	};

	return (
		<TableContainer
			component={Paper}
			sx={{
				maxHeight: '80vh',
				// Restored specific custom shadow for depth
				boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
				borderRadius: '12px',
				mt: 2,
			}}>
			<Table aria-label='collapsible application table' stickyHeader>
				<TableHead>
					<TableRow>
						<TableCell sx={tableHeaderCellStyles}>
							<SchoolOutlined />
						</TableCell>
						<TableCell sx={tableHeaderCellStyles}>Application Type</TableCell>
						<TableCell sx={tableHeaderCellStyles}>Window</TableCell>
						<TableCell sx={tableHeaderCellStyles}>Status</TableCell>
						<TableCell sx={tableHeaderCellStyles}>Date</TableCell>
						<TableCell sx={tableHeaderCellStyles}>School &amp; Class</TableCell>
						<TableCell sx={tableHeaderCellStyles}>Awards</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{data?.map((id) => (
						<ApplicationRow key={id} id={id} attachments={attachments} />
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
};

CollapsableTable.propTypes = {
	data: PropTypes.arrayOf(PropTypes.string).isRequired,
	attachments: PropTypes.bool,
};

export default CollapsableTable;
