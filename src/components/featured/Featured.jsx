/**
 * Featured Dashboard Widget
 * Displays key metrics: Countdown timer, Progress vs Last Year's Benchmarks, and 3-Year Trends.
 */

import React, { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

// Config & Context
import { ApplicationType } from '../../config/data/collections';
import { getCurrentlyEligibleApplicationsCountByType, getBenchmarkedAwardCounts, getAverageApplicationsPerYearByType } from '../../config/data/firebase';
import { useConfig } from '../../context/ConfigContext';

// Components
import Timer from '../timer/Timer';

// --- Helpers ---

const getAlertLevel = (daysLeft, percent) => {
	if (percent >= 100) return 'success';
	if (daysLeft <= 5 && percent < 50) return 'error';
	if (daysLeft <= 10 && percent < 75) return 'warning';
	return 'neutral';
};

const progressColor = (daysLeft, percent) => {
	const level = getAlertLevel(daysLeft, percent);
	switch (level) {
		case 'success':
			return 'success.main';
		case 'warning':
			return 'warning.main';
		case 'error':
			return 'error.main';
		default:
			return 'grey.500';
	}
};


const Featured = () => {
	const config = useConfig();
	const [currentCounts, setCurrentCounts] = useState({});
	const [benchmarks, setBenchmarks] = useState({});
	const [historyData, setHistoryData] = useState({});
	const [deadlineDate, setDeadlineDate] = useState(null);
	const [daysLeft, setDaysLeft] = useState(0);

	useEffect(() => {
		const controller = new AbortController();
		const signal = controller.signal;

		const fetchData = async () => {
			if (!config.APPLICATION_DEADLINE) return;

			const deadline = new Date(config.APPLICATION_DEADLINE);

			if (!signal.aborted) {
				setDeadlineDate(deadline);
				const now = new Date();
				const daysDiff = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
				setDaysLeft(daysDiff);
			}

			try {
				// Fetch current year counts in parallel
				const [newCount, grantCount, scholarshipCount] = await Promise.all([getCurrentlyEligibleApplicationsCountByType(ApplicationType.newApplication), getCurrentlyEligibleApplicationsCountByType(ApplicationType.returningGrant), getCurrentlyEligibleApplicationsCountByType(ApplicationType.scholarship)]);

				if (!signal.aborted) {
					setCurrentCounts({
						[ApplicationType.newApplication]: newCount,
						[ApplicationType.returningGrant]: grantCount,
						[ApplicationType.scholarship]: scholarshipCount,
					});
				}

				// Fetch prior year benchmarks and history
				const thisYear = new Date(deadline).getFullYear();

				const historyPromises = [3, 2, 1].map(yearsBack => {
					const date = new Date(deadline);
					date.setFullYear(thisYear - yearsBack);
					return getBenchmarkedAwardCounts(date.toLocaleString());
				});

				const averagePromises = [
					getAverageApplicationsPerYearByType(ApplicationType.newApplication, thisYear, 3),
					getAverageApplicationsPerYearByType(ApplicationType.returningGrant, thisYear, 3),
					getAverageApplicationsPerYearByType(ApplicationType.scholarship, thisYear, 3),
				];

				const [hist3, hist2, hist1] = await Promise.all(historyPromises);
				const [avgNew, avgReturning, avgScholarship] = await Promise.all(averagePromises);

				if (!signal.aborted) {
					setBenchmarks({
						[ApplicationType.newApplication]: avgNew || 0,
						[ApplicationType.returningGrant]: avgReturning || 0,
						[ApplicationType.scholarship]: avgScholarship || 0,
					});

					setHistoryData({
						[thisYear - 3]: {
							New: hist3?.[ApplicationType.newApplication] || 0,
							Returning: hist3?.[ApplicationType.returningGrant] || 0,
							Scholarship: hist3?.[ApplicationType.scholarship] || 0,
						},
						[thisYear - 2]: {
							New: hist2?.[ApplicationType.newApplication] || 0,
							Returning: hist2?.[ApplicationType.returningGrant] || 0,
							Scholarship: hist2?.[ApplicationType.scholarship] || 0,
						},
						[thisYear - 1]: {
							New: hist1?.[ApplicationType.newApplication] || 0,
							Returning: hist1?.[ApplicationType.returningGrant] || 0,
							Scholarship: hist1?.[ApplicationType.scholarship] || 0,
						}
					});
				}
			} catch (error) {
				if (!signal.aborted) {
					console.error('Error fetching featured data:', error);
				}
			}
		};

		fetchData();

		return () => controller.abort();
	}, [config.APPLICATION_DEADLINE]);

	const types = [
		{ key: ApplicationType.newApplication, label: 'New Applicants' },
		{ key: ApplicationType.returningGrant, label: 'Returning Grants' },
		{ key: ApplicationType.scholarship, label: 'Scholarships' },
	];

	return (
		<Box
			display='flex'
			flexDirection='column'
			width='100%'
			height='100%'
			sx={{
				bgcolor: 'background.paper',
				paddingX: 3,
				paddingY: 2,
				minHeight: 280,
			}}>
			<Typography fontWeight='bold' fontSize='15px' color='text.secondary' mb={2}>
				BENCHMARK PROGRESS
			</Typography>

			<Typography variant='subtitle2' color='text.active' gutterBottom alignSelf='center'>
				<Timer />
			</Typography>

			{deadlineDate && (
				<Typography variant='caption' align='center' width='100%' display='block' color='text.primary' mb={2}>
					Deadline: {deadlineDate.toLocaleDateString()} ({daysLeft} days left)
				</Typography>
			)}

			{types.map(({ key, label }) => {
				const actual = currentCounts[key] || 0;
				const goal = typeof benchmarks[key] === 'number' ? benchmarks[key] : 0;
				const rawPercent = goal > 0 ? (actual / goal) * 100 : 0;
				const percent = Math.min(Math.round(rawPercent), 100);

				return (
					<Box key={key} mb={2} width='100%'>
						<Typography variant='subtitle2' color='text.primary'>
							{label}: {actual} / {goal} ({percent}%)
						</Typography>
						<LinearProgress
							variant='determinate'
							value={percent}
							sx={{
								width: '100%',
								height: 10,
								borderRadius: 5,
								backgroundColor: 'grey.300',
								'& .MuiLinearProgress-bar': {
									backgroundColor: progressColor(daysLeft, percent),
								},
							}}
						/>
					</Box>
				);
			})}

			{/* 3-Year Trend Visualization */}
			<Box display='flex' flexDirection='column' justifyContent='center' alignItems='center' mt={2} alignSelf='center'>
				<Typography variant='subtitle2' gutterBottom color='text.primary'>
					3-Year Avg Award Trends
				</Typography>
				<Box display='flex' gap={4} alignItems='flex-end' justifyContent='center' height={120}>
					{(() => {
						const MAX_HEIGHT = 80;
						let overallMax = 0;

						// Find the absolute maximum average award across all categories and years
						Object.values(historyData).forEach(values => {
							const maxInYear = Math.max(values.New, values.Returning, values.Scholarship);
							if (maxInYear > overallMax) overallMax = maxInYear;
						});

						// Safety check to prevent division by zero
						if (overallMax === 0) overallMax = 1;

						return Object.entries(historyData).map(([year, values]) => {
							// Calculate heights based on the ratio against the overall maximum
							const heightNew = (values.New / overallMax) * MAX_HEIGHT;
							const heightRet = (values.Returning / overallMax) * MAX_HEIGHT;
							const heightSch = (values.Scholarship / overallMax) * MAX_HEIGHT;

							return (
								<Box key={year} display='flex' flexDirection='column' alignItems='center' justifyContent='flex-end' width={32}>
									<Box display='flex' flexDirection='column' alignItems='center' justifyContent='flex-end' gap={0.5} height={80}>
										<Box width={24} height={heightNew} bgcolor='primary.light' borderRadius={1} title={`New Avg: $${Math.round(values.New)}`} />
										<Box width={24} height={heightRet} bgcolor='secondary.light' borderRadius={1} title={`Returning Avg: $${Math.round(values.Returning)}`} />
										<Box width={24} height={heightSch} bgcolor='custom.green' borderRadius={1} title={`Scholarship Avg: $${Math.round(values.Scholarship)}`} />
									</Box>
									<Typography variant='caption' mt={0.5} color='text.primary'>
										{year}
									</Typography>
								</Box>
							);
						});
					})()}
				</Box>
				<Box display='flex' justifyContent='center' gap={3} mt={1}>
					<Typography variant='caption' sx={{ color: 'primary.light' }}>
						⬤ New
					</Typography>
					<Typography variant='caption' sx={{ color: 'secondary.light' }}>
						⬤ Returning
					</Typography>
					<Typography variant='caption' sx={{ color: 'custom.green' }}>
						⬤ Scholarship
					</Typography>
				</Box>
			</Box>
		</Box>
	);
};

export default Featured;