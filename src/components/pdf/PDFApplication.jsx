/**
 * PDF Application View
 * Renders a full Applicant "Packet" optimized for printing or PDF generation.
 * Features:
 * - Aggregates data from 8+ Firestore collections (Profile, Family, Finances, etc.).
 * - Embedded CSS for print layout (@media print).
 * - Renders attachments (PDFs/Images) at the end of the document.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Box, Typography, Button, Table, TableHead, TableRow, TableBody, TableCell } from '@mui/material';

// Firebase & Storage
import { ref, getBlob } from 'firebase/storage';
import { getCollectionData, getApplication, getAwardsData, storage } from '../../config/data/firebase';

// Config & Context
import { templateApp, blankApplicant } from '../../config/data/Validation';
import { useAuth } from '../../context/AuthContext';
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { collections } from '../../config/data/collections';
import { brand, convertPDFBlobToImages } from '../../config/Constants';

// Components
import Loader from '../loader/Loader';
import NotFound from '../layout/NotFound';
import PDFPreview from './PDFPreview';

// --- Helpers ---

const formatMoney = (amount) => {
	if (amount === undefined || amount === null || amount === '') return '';
	// If it's already formatted (contains $), return as is
	if (typeof amount === 'string' && amount.includes('$')) return amount;

	const num = parseFloat(amount);
	return isNaN(num) ? amount : `$${num.toLocaleString()}`;
};

const calculateAge = (dob) => {
	if (!dob) return '';
	const birthDate = new Date(dob);
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
		age--;
	}
	return String(age);
};

const currentOrgString = (data) => {
	const currentIndex = parseInt(data.currentOrganization, 10);
	const currentPos = Array.isArray(data.positions) ? data.positions[currentIndex] : null;
	return currentPos ? `${currentPos.role} | ${currentPos.organization}` : 'N/A';
};

// --- Main Component ---

export const PDFApplication = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const dataID = useParams().id;

	// State
	const [application, setApplication] = useState(templateApp);
	const [applicant, setApplicant] = useState(blankApplicant);

	// Sub-sections
	const [profile, setProfile] = useState(templateApp.profile);
	const [family, setFamily] = useState(templateApp.family);
	const [education, setEducation] = useState(templateApp.education);
	const [experience, setExperience] = useState(templateApp.experience);
	const [expenses, setExpenses] = useState(templateApp.expenses);
	const [incomes, setIncomes] = useState(templateApp.incomes);
	const [contributions, setContributions] = useState(templateApp.contributions);
	const [projections, setProjections] = useState(templateApp.projections);
	const [awards, setAwards] = useState([]);

	// Attachments & UI
	const [attachmentPreviews, setAttachmentPreviews] = useState({});
	const [loading, setLoading] = useState(false);
	const [wasNotFound, setWasNotFound] = useState(false);

	// Auth Check
	useEffect(() => {
		if (!user) navigate(generatePath(paths.login));
	}, [user, navigate]);

	// Data Fetching
	useEffect(() => {
		const fetchAttachmentPreviews = async (attachmentsData) => {
			if (!attachmentsData || Object.keys(attachmentsData).length === 0) return;

			const previews = {};

			await Promise.all(
				Object.entries(attachmentsData).map(async ([key, meta]) => {
					if (!meta?.refLoc) return;

					try {
						const blob = await getBlob(ref(storage, meta.refLoc));
						let pages = [];

						if (meta.displayName?.toLowerCase().endsWith('.pdf')) {
							pages = await convertPDFBlobToImages(blob);
						} else {
							const url = URL.createObjectURL(blob);
							pages = [url];
						}

						previews[key] = {
							displayName: meta.displayName || key,
							pages,
						};
					} catch (err) {
						console.error(`Failed to process ${key}:`, err.message);
					}
				})
			);

			setAttachmentPreviews(previews);
		};

		const fetch = async () => {
			try {
				setLoading(true);

				if (!dataID) {
					setWasNotFound(true);
					return;
				}

				const applicationIn = await getApplication(dataID, dataID);
				if (!applicationIn) {
					setWasNotFound(true);
					return;
				}

				setApplication(applicationIn);

				// Parallel fetch of all sub-collections
				const { completedBy, profile, family, education, experience, expenses, incomes, contributions, projections, attachments, awards } = applicationIn;

				const [profileData, familyData, eduData, expData, expnData, incData, contData, projData, attachData, applicantData] = await Promise.all([getCollectionData(completedBy, collections.profiles, profile), getCollectionData(completedBy, collections.families, family), getCollectionData(completedBy, collections.education, education), getCollectionData(completedBy, collections.experience, experience), getCollectionData(completedBy, collections.expenses, expenses), getCollectionData(completedBy, collections.incomes, incomes), getCollectionData(completedBy, collections.contributions, contributions), getCollectionData(completedBy, collections.projections, projections), getCollectionData(completedBy, collections.attachments, attachments), getCollectionData(completedBy, collections.applicants, completedBy)]);

				setProfile(profileData);
				setFamily(familyData);
				setEducation(eduData);
				setExperience(expData);
				setExpenses(expnData);
				setIncomes(incData);
				setContributions(contData);
				setProjections(projData);
				setApplicant(applicantData);

				// Fetch Attachments & Awards separately
				fetchAttachmentPreviews(attachData);

				if (Array.isArray(awards) && awards.length > 0) {
					const awardsData = await getAwardsData(completedBy, awards);
					setAwards(awardsData);
				} else {
					setAwards([]);
				}
			} catch (err) {
				console.error(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetch();
	}, [dataID]);

	if (loading) return <Loader />;
	if (wasNotFound) return <NotFound />;

	return (
		<Box bgcolor='background.passive' color='text.active'>
			<style>
				{`
                @media print {
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                    }

                    body * {
                        visibility: hidden;
                    }

                    #printable, #printable * {
                        visibility: visible;
                    }

                    #printable {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 0.0in;
                        box-sizing: border-box;
                        background-color: white;
                        color: black;
                    }

                    button, a[href] {
                        display: none !important;
                    }

                    table {
                        width: 100% !important;
                        table-layout: fixed;
                        border-collapse: collapse;
                    }

                    th, td {
                        font-size: 10pt;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }

                    .MuiBox-root {
                        page-break-inside: avoid;
                    }
                }
                `}
			</style>

			<Box display='flex' gap='10px' padding='20px'>
				<Button variant='outlined' onClick={() => navigate(-1)}>
					← Back
				</Button>
				<Button
					variant='contained'
					onClick={() => {
						globalThis.print();
					}}>
					Print / Save as PDF
				</Button>
			</Box>

			<Box id='printable' padding='20px'>
				<Typography variant='h4' gutterBottom>{`${brand.organizationShortName} Application`}</Typography>
				<Typography variant='subtitle1'>Application ID: {application.id}</Typography>
				<Typography>Status: {application.status}</Typography>

				{/* Section: Applicant Info */}
				<Box display='flex' gap={3} mt={4}>
					<Box flex={1} minWidth='250px'>
						<Typography variant='h5' gutterBottom>
							Applicant Information
						</Typography>
						<Typography>
							Name: {applicant.firstName} {applicant.lastName}
						</Typography>
						<Typography>Nickname: {applicant.callMe}</Typography>
						<Typography>Email: {applicant.email}</Typography>
						<Typography>Phone: {applicant.cell}</Typography>
						<Typography>
							School: {applicant.school} ({applicant.gradYear})
						</Typography>
						<Typography>Major: {applicant.major}</Typography>
						<Typography>Organization: {applicant.organization}</Typography>
					</Box>

					{awards?.length > 0 && (
						<Box flex={1} minWidth='250px'>
							<Typography variant='h5' gutterBottom>
								Award History
							</Typography>
							<Table size='small'>
								<TableHead>
									<TableRow>
										<TableCell>Type</TableCell>
										<TableCell>$$</TableCell>
										<TableCell>Year</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{awards.map((award) => (
										<TableRow key={award.awardID}>
											<TableCell>{award.type}</TableCell>
											<TableCell>{formatMoney(award.awardAmount)}</TableCell>
											<TableCell>{dayjs(award.deadline).year()}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Box>
					)}
				</Box>

				{/* Section: Profile & Family */}
				<Box display='flex' gap={3} mt={4}>
					{profile && (
						<Box flex={1} minWidth='250px'>
							<Typography variant='h5' gutterBottom>
								Profile
							</Typography>
							<Typography>
								Full Name: {profile.applicantFirstName} {profile.applicantMiddleInitial} {profile.applicantLastName}
							</Typography>
							<Typography>DOB: {`${dayjs(profile.applicantDOB).add(12, 'hour').format('M/D/YYYY')} (${calculateAge(profile.applicantDOB)} years old)`}</Typography>
							<Typography>Address: {profile.applicantMailingAddress?.description}</Typography>
							<Typography>Phone: {profile.applicantCellPhone}</Typography>
							<Typography>Email: {profile.applicantEmailAddress}</Typography>
						</Box>
					)}

					{family?.familyMembers?.length > 0 && (
						<Box flex={1} minWidth='250px'>
							<Typography variant='h5' gutterBottom>
								Family Members
							</Typography>
							<Table size='small'>
								<TableHead>
									<TableRow>
										<TableCell>Name</TableCell>
										<TableCell>Occupation</TableCell>
										<TableCell>Age</TableCell>
										<TableCell>Relation</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{family.familyMembers.map((member) => (
										<TableRow key={member.fullName}>
											<TableCell>{member.fullName}</TableCell>
											<TableCell>{member.occupation}</TableCell>
											<TableCell>{member.age}</TableCell>
											<TableCell>{member.relation}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Box>
					)}
				</Box>

				{/* Section: Education & Experience */}
				<Box display='flex' gap={3} mt={4}>
					{education && (
						<Box flex={1} minWidth='250px'>
							<Typography variant='h5' gutterBottom>
								Education
							</Typography>
							<Typography>School: {education.schoolName}</Typography>
							<Typography>Major: {education.major}</Typography>
							<Typography>Expected Graduation: {dayjs(education.expectedGraduationDate).year()}</Typography>
							<Typography>GPA: {education.currentGPA}</Typography>
							<Typography>History:</Typography>
							{education.previousSchools?.length > 0 && (
								<Table size='small'>
									<TableHead>
										<TableRow>
											<TableCell>Previous Schools Attended</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{education.previousSchools.map((school) => (
											<TableRow key={school}>
												<TableCell>{school}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</Box>
					)}

					{experience && (
						<Box flex={1} minWidth='250px'>
							<Typography variant='h5' gutterBottom>
								Experience
							</Typography>
							<Typography>Current Organization: {currentOrgString(experience)}</Typography>
							<Typography>History:</Typography>
							{experience?.positions?.length > 0 && (
								<Table size='small' sx={{ mt: 1 }}>
									<TableHead>
										<TableRow>
											<TableCell>Organization</TableCell>
											<TableCell>Location</TableCell>
											<TableCell>Role</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{experience.positions.map((pos) => (
											<TableRow key={`${pos.type}-${pos.organization}`}>
												<TableCell>
													{pos.type} - {pos.organization}
												</TableCell>
												<TableCell>{pos.location}</TableCell>
												<TableCell>{pos.role}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</Box>
					)}
				</Box>

				{/* Section: Finances (Income & Expenses) */}
				<Box display='flex' gap={3} mt={4}>
					{incomes && (
						<Box flex={1} minWidth='250px'>
							<Typography variant='h5' gutterBottom>
								Incomes
							</Typography>
							<Table size='small'>
								<TableBody>
									<TableRow>
										<TableCell>Summer</TableCell>
										<TableCell align='right'>{formatMoney(incomes.summerEarnings)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Fall</TableCell>
										<TableCell align='right'>{formatMoney(incomes.fallEarnings)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Winter</TableCell>
										<TableCell align='right'>{formatMoney(incomes.winterEarnings)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Spring</TableCell>
										<TableCell align='right'>{formatMoney(incomes.springEarnings)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Earnings Applied</TableCell>
										<TableCell align='right'>{formatMoney(incomes.earningsAppliedToEducation)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Savings Applied</TableCell>
										<TableCell align='right'>{formatMoney(incomes.savingsAppliedToEducation)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>College Award</TableCell>
										<TableCell align='right'>{formatMoney(incomes.collegeAward)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Loans</TableCell>
										<TableCell align='right'>{formatMoney(incomes.loansAmount)}</TableCell>
									</TableRow>
								</TableBody>
							</Table>

							{incomes.otherIncomeSources?.length > 0 && (
								<>
									<Typography mt={2}>Other Sources</Typography>
									<Table size='small' sx={{ mt: 1 }}>
										<TableHead>
											<TableRow>
												<TableCell>Source</TableCell>
												<TableCell align='right'>Amount</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{incomes.otherIncomeSources.map((src) => (
												<TableRow key={src.title}>
													<TableCell>{src.title}</TableCell>
													<TableCell align='right'>{formatMoney(src.amount)}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</>
							)}
						</Box>
					)}

					{expenses && (
						<Box flex={1} minWidth='250px'>
							<Typography variant='h5' gutterBottom>
								Expenses
							</Typography>
							<Table size='small'>
								<TableBody>
									<TableRow>
										<TableCell>Tuition</TableCell>
										<TableCell align='right'>{formatMoney(expenses.tuitionCost)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Room & Board</TableCell>
										<TableCell align='right'>{formatMoney(expenses.roomAndBoardCost)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Books</TableCell>
										<TableCell align='right'>{formatMoney(expenses.bookCost)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Commuting</TableCell>
										<TableCell align='right'>{formatMoney(expenses.commutingCost)}</TableCell>
									</TableRow>
								</TableBody>
							</Table>

							{expenses.otherExpenses?.length > 0 && (
								<>
									<Typography mt={2}>Other Expenses</Typography>
									<Table size='small' sx={{ mt: 1 }}>
										<TableHead>
											<TableRow>
												<TableCell>Description</TableCell>
												<TableCell align='right'>Amount</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{expenses.otherExpenses.map((exp) => (
												<TableRow key={exp.title}>
													<TableCell>{exp.title}</TableCell>
													<TableCell align='right'>{formatMoney(exp.amount)}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</>
							)}
						</Box>
					)}
				</Box>

				{/* Section: Contributions & Projections */}
				<Box display='flex' gap={3} mt={4}>
					{contributions && (
						<Box flex={1} minWidth='250px'>
							<Typography variant='h5' gutterBottom>
								Parental Contributions
							</Typography>
							<Table size='small'>
								<TableBody>
									<TableRow>
										<TableCell>Parent 1 Income</TableCell>
										<TableCell align='right'>{formatMoney(contributions.p1ExpectedAnnualIncome)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Parent 2 Income</TableCell>
										<TableCell align='right'>{formatMoney(contributions.p2ExpectedAnnualIncome)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Investment Income</TableCell>
										<TableCell align='right'>{formatMoney(contributions.parentInvestmentIncome)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Own or Rent Home</TableCell>
										<TableCell align='right'>{contributions.parentsOwnOrRentHome}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Marital Status</TableCell>
										<TableCell align='right'>{contributions.parentsMaritalStatus}</TableCell>
									</TableRow>
								</TableBody>
							</Table>

							{contributions.siblingSchools?.length > 0 && (
								<>
									<Typography mt={2}>Sibling Schools</Typography>
									<Table size='small' sx={{ mt: 1 }}>
										<TableHead>
											<TableRow>
												<TableCell>School Name</TableCell>
												<TableCell align='right'>Cost</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{contributions.siblingSchools.map((school) => (
												<TableRow key={school.title}>
													<TableCell>{school.title}</TableCell>
													<TableCell align='right'>{formatMoney(school.cost)}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</>
							)}
						</Box>
					)}

					{projections && (
						<Box flex={1} minWidth='250px'>
							<Typography variant='h5' gutterBottom>
								Financial Projections
							</Typography>
							<Table size='small'>
								<TableBody>
									<TableRow>
										<TableCell>Applicant Earnings</TableCell>
										<TableCell align='right'>{formatMoney(projections.applicantEarnings)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Applicant Savings</TableCell>
										<TableCell align='right'>{formatMoney(projections.applicantSavings)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Family Contributions</TableCell>
										<TableCell align='right'>{formatMoney(projections.applicantFamily)}</TableCell>
									</TableRow>
									<TableRow>
										<TableCell>Requested from Fund</TableCell>
										<TableCell align='right'>{formatMoney(projections.request)}</TableCell>
									</TableRow>
								</TableBody>
							</Table>

							{contributions.anyExtraordinaryExpenses && (
								<>
									<Typography variant='h5' gutterBottom mt={4}>
										Extraordinary Circumstances
									</Typography>
									<Typography variant='body1' sx={{ whiteSpace: 'pre-line' }}>
										{contributions.anyExtraordinaryExpenses}
									</Typography>
								</>
							)}
						</Box>
					)}
				</Box>

				{/* Section: Attachments */}
				{attachmentPreviews && (
					<Box mt={4}>
						<Typography variant='h5' gutterBottom>
							Attachments
						</Typography>

						{Object.keys(attachmentPreviews).length > 0 ? (
							Object.entries(attachmentPreviews).map(([key, { displayName, pages }]) =>
								pages && pages.length > 0 ? (
									<PDFPreview key={key} displayName={displayName} pages={pages} />
								) : (
									<Box key={key} sx={{ mb: 2, p: 2, border: '1px dashed', borderColor: 'text.disabled', borderRadius: 1 }}>
										<Typography variant='subtitle1'>{displayName}</Typography>
										<Typography variant='body2' color='text.secondary'>
											Preview not available for this file type.
										</Typography>
									</Box>
								)
							)
						) : (
							<Typography variant='body1' color='text.secondary' sx={{ fontStyle: 'italic' }}>
								No attachments to render.
							</Typography>
						)}
					</Box>
				)}
			</Box>
		</Box>
	);
};