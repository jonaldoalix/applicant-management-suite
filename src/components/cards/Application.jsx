/**
 * Application Detail Card
 * The primary view for reviewing a submitted application.
 * Fetches and displays related data (Family, Education, Financials) and allows status management.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Box, Typography, Chip } from '@mui/material';
import { v4 as uuid } from 'uuid';
import dayjs from 'dayjs';
import { serverTimestamp } from 'firebase/firestore';

// Context & Hooks
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';

// Config & Utils
import { generatePath } from '../../config/navigation/routeUtils';
import { capitalize, attachmentFields } from '../../config/Constants';
import { collections } from '../../config/data/collections';
import { getApplicationActions } from '../../config/ui/buttonActions';
import { ContactTemplate, pushNotice } from '../../config/content/push';
import { getCollectionData, getRealTimeAwardsByIDs, saveCollectionData } from '../../config/data/firebase';

// Components
import SingleAssetPage, { AssetCard } from '../layout/SingleAssetPage';
import Loader from '../loader/Loader';
import NotFound from '../layout/NotFound';
import NotesSection from '../notes/NotesSection';
import Header from '../assets/Header';
import InfoTable from '../assets/InfoTable';
import Section from '../assets/Section';
import DynamicActionGroup from '../dynamicButtons/DynamicButtons';

// --- Sub-components (Helpers) ---

const sumArray = (arr) => {
	if (!arr || !Array.isArray(arr)) return 0;
	return arr.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
};

const FamilyInfo = ({ data }) => (
	<Box>
		{data.familyMembers?.map((member) => (
			<Box key={`${member.relation}-${member.fullName}`} mb={2}>
				<Typography variant='body1' fontWeight='bold'>
					{member.relation}: {member.fullName}, Age {member.age}
				</Typography>
				<Typography variant='body2' color='text.secondary'>
					Occupation: {member.occupation}
				</Typography>
			</Box>
		))}
	</Box>
);

FamilyInfo.propTypes = {
	data: PropTypes.shape({
		familyMembers: PropTypes.arrayOf(PropTypes.object),
	}).isRequired,
};

const EducationInfo = ({ data }) => (
	<InfoTable
		data={[
			{ label: 'School', value: data.schoolName },
			{ label: 'Major', value: data.major },
			{ label: 'Current GPA', value: data.currentGPA },
			{ label: 'Graduation Year', value: data.expectedGraduationDate ? dayjs(data.expectedGraduationDate).year() : 'N/A' },
			{ label: 'Previous Schools', value: data.previousSchools?.join(', ') },
		]}
	/>
);

EducationInfo.propTypes = {
	data: PropTypes.shape({
		schoolName: PropTypes.string,
		major: PropTypes.string,
		currentGPA: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		expectedGraduationDate: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
		previousSchools: PropTypes.arrayOf(PropTypes.string),
	}).isRequired,
};

const ExperienceInfo = ({ data }) => {
	const { darkMode } = useTheme();

	return (
		<Box>
			<Typography variant='h5' gutterBottom color={darkMode ? 'secondary.main' : 'text.highlight'}>
				Record
			</Typography>
			{data.positions?.map((pos, index) => {
				const isCurrent = Number(index === Number(data.currentOrganization));
				let backgroundColor = 'transparent';
				if (isCurrent) {
					backgroundColor = darkMode ? 'custom.green' : 'custom.black';
				}

				let textColor = 'custom.black';
				if (darkMode) {
					textColor = 'custom.white';
				} else if (isCurrent) {
					textColor = 'custom.brightWhite';
				}

				return (
					<Box key={`${pos.type}-${pos.organization}`} mb={2} bgcolor={backgroundColor} padding='10px' borderRadius='8px'>
						<Typography variant='body1' color={textColor} fontWeight='bold'>
							{pos.organization} ({pos.location})
						</Typography>
						<Typography variant='body2' color={textColor === 'custom.black' ? 'text.secondary' : 'custom.white'}>
							Role: {pos.role}
						</Typography>
						<Typography variant='body2' color={textColor === 'custom.black' ? 'text.secondary' : 'custom.white'}>
							{pos.type}
						</Typography>
					</Box>
				);
			})}
		</Box>
	);
};

ExperienceInfo.propTypes = {
	data: PropTypes.object.isRequired,
};

const FinancialTable = ({ title, data, total }) => {
	const { darkMode } = useTheme();
	if (!data) return null;

	const formattedData = Object.entries(data)
		.filter(([key]) => !key.endsWith('ID') && key !== 'completedBy' && key !== 'id')
		.flatMap(([key, value]) => {
			if (Array.isArray(value)) {
				return value.map((item) => ({
					label: capitalize(item.title || 'Other'),
					value: (Number(item.amount) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
				}));
			}
			const numericValue = Number(value) || 0;
			let formattedLabel = key.replaceAll(/([A-Z])/g, ' $1').trim();
			return [
				{
					label: capitalize(formattedLabel),
					value: numericValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
				},
			];
		});

	if (total !== undefined && total !== null) {
		formattedData.push({
			label: 'TOTAL',
			value: Number(total).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
		});
	}

	return (
		<Box flex={1} minWidth='250px'>
			<Typography variant='h5' gutterBottom color={darkMode ? 'secondary.main' : 'text.highlight'}>
				{title}
			</Typography>
			<InfoTable data={formattedData} />
		</Box>
	);
};

FinancialTable.propTypes = {
	title: PropTypes.string.isRequired,
	data: PropTypes.object,
	total: PropTypes.number,
};

// --- Main Component ---

export const Application = ({ application: initialApplication }) => {
	const navigate = useNavigate();
	const { showDialog } = useDialog();
	const { showAlert, handleError } = useAlert();
	const { member } = useAuth();
	const config = useConfig();
	const { darkMode } = useTheme();

	const [application, setApplication] = useState(initialApplication);
	const [applicant, setApplicant] = useState(null);
	const [family, setFamily] = useState(null);
	const [education, setEducation] = useState(null);
	const [experience, setExperience] = useState(null);
	const [incomes, setIncomes] = useState(null);
	const [expenses, setExpenses] = useState(null);
	const [projections, setProjections] = useState(null);
	const [contributions, setContributions] = useState(null);
	const [attachments, setAttachments] = useState(null);
	const [awards, setAwards] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showNotes, setShowNotes] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			if (!application) return;
			setLoading(true);
			try {
				const dataPromises = [getCollectionData(application.completedBy, collections.families, application.family), getCollectionData(application.completedBy, collections.education, application.education), getCollectionData(application.completedBy, collections.experience, application.experience), getCollectionData(application.completedBy, collections.incomes, application.incomes), getCollectionData(application.completedBy, collections.expenses, application.expenses), getCollectionData(application.completedBy, collections.projections, application.projections), getCollectionData(application.completedBy, collections.contributions, application.contributions), getCollectionData(application.completedBy, collections.attachments, application.attachments), getCollectionData(application.completedBy, collections.applicants, application.completedBy)];
				const [familyData, educationData, experienceData, incomesData, expensesData, projectionsData, contributionsData, attachmentsData, applicantData] = await Promise.all(dataPromises);

				setFamily(familyData);
				setEducation(educationData);
				setExperience(experienceData);
				setIncomes(incomesData);
				setExpenses(expensesData);
				setProjections(projectionsData);
				setContributions(contributionsData);
				setAttachments(attachmentsData);
				setApplicant(applicantData);
			} catch (error) {
				console.error('Error fetching application details:', error);
			}
			setLoading(false);
		};
		fetchData();
	}, [application]);

	useEffect(() => {
		if (application?.awards?.length > 0) {
			const unsubscribe = getRealTimeAwardsByIDs(application.awards, setAwards);
			return () => unsubscribe();
		}
	}, [application?.awards]);

	const handleAction = (action, asset) => {
		const dialogId = action.dialogId;

		if (action.navTo) {
			const { path, params } = action.navTo(asset);
			navigate(generatePath(path, params));
			return;
		}

		if (action.onClick) {
			action.onClick();
			return;
		}

		switch (dialogId) {
			case 'changeAppStatus':
				showDialog({
					id: 'changeAppStatus',
					data: { currentStatus: asset.status },
					callback: async (result) => {
						if (result?.status) {
							try {
								await saveCollectionData(collections.applications, asset.id, { status: result.status });
								setApplication((prev) => ({ ...prev, status: result.status }));
								showAlert({ message: 'Application status updated!', type: 'success' });
							} catch (error) {
								handleError(error, 'changeAppStatus-applicationCard');
							}
						}
					},
				});
				break;

			case 'markEligibility':
				showDialog({
					id: 'markEligibility',
					callback: async (result) => {
						if (result) {
							try {
								await saveCollectionData(collections.applications, asset.id, { status: result });
								setApplication((prev) => ({ ...prev, status: result }));
								showAlert({ message: `Application marked as ${result}!`, type: 'success' });
							} catch (error) {
								handleError(error, 'markEligibility-applicationCard');
							}
						}
					},
				});
				break;

			case 'addAward':
				showDialog({
					id: 'addAward',
					callback: async (result) => {
						if (result?.awardAmount && result?.awardName) {
							try {
								const awardId = uuid();
								const awardData = {
									id: awardId,
									memberId: member.id,
									applicationId: asset.id,
									applicantId: asset.completedBy,
									date: serverTimestamp(),
									type: result.awardName,
									amount: result.awardAmount,
									followUp: result.awardFollowUp,
								};
								await saveCollectionData(collections.awards, awardId, awardData);
								await saveCollectionData(collections.applications, asset.id, { status: 'Awarded' });
								await pushNotice(ContactTemplate.appApproved, applicant, { award: awardData });

								setApplication((prev) => ({ ...prev, status: 'Awarded' }));
								showAlert({ message: 'Award added successfully!', type: 'success' });
							} catch (error) {
								handleError(error, 'addAward-applicationCard');
							}
						}
					},
				});
				break;

			default:
				console.error(`No dialog handler for ID: ${dialogId}`);
		}
	};

	const actions = useMemo(() => getApplicationActions(showNotes, setShowNotes, member), [showNotes, member]);

	const requiredAttachments = useMemo(() => {
		if (!application.type) return [];
		return attachmentFields.filter((field) => field.requiredBy.includes(application.type));
	}, [application.type]);

	const calculatedTotals = useMemo(() => {
		if (!expenses || !incomes) return { expenses: 0, income: 0 };

		const expenseSum = (Number(expenses.tuitionCost) || 0) + (Number(expenses.roomAndBoardCost) || 0) + (Number(expenses.bookCost) || 0) + (Number(expenses.commutingCost) || 0) + sumArray(expenses.otherExpenses);
		const incomeSum = (Number(incomes.earningsAppliedToEducation) || 0) + (Number(incomes.savingsAppliedToEducation) || 0) + (Number(incomes.collegeAward) || 0) + (Number(incomes.loansAmount) || 0) + sumArray(incomes.otherIncomeSources);

		return { expenses: expenseSum, income: incomeSum };
	}, [expenses, incomes]);

	if (loading) return <Loader />;
	if (!application) return <NotFound />;

	return (
		<SingleAssetPage>
			<Box display='flex' padding='20px' gap='20px'>
				<AssetCard flex='1'>
					<Header image={applicant?.picture?.home} title={applicant?.callMe} status={application.status} config={config}>
						<InfoTable
							data={[
								{ label: 'Application Type', value: application.type },
								{ label: 'Full Name', value: `${applicant?.firstName} ${applicant?.lastName}` },
								{ label: 'School', value: `${applicant?.school} (${applicant?.gradYear})` },
								{ label: 'Major', value: applicant?.major },
								{ label: 'Organization', value: applicant?.organization },
								{ label: 'Email', value: applicant?.email },
								{ label: 'Phone', value: applicant?.cell },
								{ label: 'Last Updated', value: application.lastUpdated || application.submittedOn || 'N/A' },
							]}
						/>
					</Header>
				</AssetCard>

				<AssetCard flex='1.25' sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
					<Typography component='span' fontSize='16px' color={darkMode ? 'secondary.main' : 'text.highlight'}>
						Functions
					</Typography>
					<DynamicActionGroup actions={actions} asset={application} onAction={handleAction} />
				</AssetCard>
			</Box>

			{showNotes && (
				<Box px='20px' mb='20px'>
					<AssetCard>
						<Section>
							<NotesSection targetId={application?.id} targetCollection={collections.applications} />
						</Section>
					</AssetCard>
				</Box>
			)}

			<Box display='flex' padding='0 20px 20px' gap='20px'>
				{family && (
					<AssetCard flex={1}>
						<Section title='Family'>
							<FamilyInfo data={family} />
						</Section>
					</AssetCard>
				)}
				{education && (
					<AssetCard flex={1}>
						<Section title='Education'>
							<EducationInfo data={education} />
						</Section>
					</AssetCard>
				)}
				{experience && (
					<AssetCard flex={1}>
						<Section title='Experience'>
							<ExperienceInfo data={experience} />
						</Section>
					</AssetCard>
				)}
			</Box>

			{(incomes || expenses || projections) && (
				<Box px='20px' mb='20px'>
					<AssetCard>
						<Section title='Financials'>
							<Box display='flex' flexDirection={{ xs: 'column', md: 'row' }} gap={4} mt={2}>
								<FinancialTable title='Income' data={incomes} total={calculatedTotals.income} />
								<FinancialTable title='Expenses' data={expenses} total={calculatedTotals.expenses} />
								<FinancialTable title='Projections' data={projections} />
							</Box>
							{contributions?.anyExtraordinaryExpenses && (
								<Box mt={2}>
									<Typography variant='h6' gutterBottom>
										Extraordinary Circumstances
									</Typography>
									<Typography variant='body2' sx={{ whiteSpace: 'pre-line' }}>
										{contributions.anyExtraordinaryExpenses}
									</Typography>
								</Box>
							)}
						</Section>
					</AssetCard>
				</Box>
			)}

			{awards?.length > 0 && (
				<Box px='20px' mb='20px'>
					<AssetCard>
						<Section title='Awards'>
							<InfoTable
								data={awards.map((award) => ({
									label: award.type,
									value: `$${award.awardAmount} awarded on ${dayjs(award.createdOn).format('MM/DD/YYYY')}`,
								}))}
							/>
						</Section>
					</AssetCard>
				</Box>
			)}

			{requiredAttachments.length > 0 && (
				<Box pb='20px' px='20px' mb='20px'>
					<AssetCard>
						<Section title='Required Attachments'>
							<Box display='flex' flexWrap='wrap' gap={1}>
								{requiredAttachments.map((field) => {
									const attachmentData = attachments?.[field.key];
									if (attachmentData?.home) {
										return <Chip key={field.key} label={field.label} component='a' href={attachmentData.home} target='_blank' rel='noopener noreferrer' clickable color='success' variant='filled' />;
									} else if (attachmentData?.requestID) {
										return <Chip key={field.key} label={`${field.label} (Requested)`} color='warning' variant='filled' />;
									} else {
										return <Chip key={field.key} label={`${field.label} (Missing)`} color='error' variant='outlined' />;
									}
								})}
							</Box>
						</Section>
					</AssetCard>
				</Box>
			)}
		</SingleAssetPage>
	);
};

Application.propTypes = {
	application: PropTypes.shape({
		id: PropTypes.string,
		family: PropTypes.string,
		education: PropTypes.string,
		experience: PropTypes.string,
		incomes: PropTypes.string,
		expenses: PropTypes.string,
		projections: PropTypes.string,
		contributions: PropTypes.string,
		attachments: PropTypes.string,
		completedBy: PropTypes.string,
		status: PropTypes.string,
		type: PropTypes.string,
		awards: PropTypes.arrayOf(PropTypes.string),
		lastUpdated: PropTypes.string,
		submittedOn: PropTypes.any,
	}).isRequired,
};