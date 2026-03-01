/**
 * Area Chart Component
 * Displays application submission trends over time using Recharts.
 * Fetches data dynamically from Firestore on mount.
 */

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Box, Typography } from '@mui/material';

import { getApplicationsByYear } from '../../config/data/firebase';
import Loader from '../loader/Loader';

const Chart = ({ title }) => {
	const [graphData, setGraphData] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const controller = new AbortController();
		const signal = controller.signal;

		const fetchApplicationsData = async () => {
			try {
				const data = await getApplicationsByYear();
				if (!signal.aborted) {
					setGraphData(data);
				}
			} catch (error) {
				if (!signal.aborted) {
					console.error('Error fetching application data:', error);
				}
			} finally {
				if (!signal.aborted) setLoading(false);
			}
		};

		fetchApplicationsData();

		return () => controller.abort();
	}, []);

	const renderGraph = (data) => {
		// Calculate gradient offset based on data range
		const gradientOffset = () => {
			if (!data || data.length === 0) return 0;

			const dataMax = Math.max(...data.map((i) => i.count));
			const dataMin = Math.min(...data.map((i) => i.count));

			if (dataMax <= 0) return 0;
			if (dataMin >= 0) return 1;

			return dataMax / (dataMax - dataMin);
		};

		const off = gradientOffset();

		return (
			<ResponsiveContainer width='100%' height='100%'>
				<AreaChart width={500} height={400} data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
					<CartesianGrid strokeDasharray='3 3' className='chartGrid' />
					<XAxis dataKey='year' stroke='gray' />
					<YAxis />
					<Tooltip />
					<defs>
						<linearGradient id='splitColor' x1='0' y1='0' x2='0' y2='1'>
							<stop offset={off} stopColor='green' stopOpacity={1} />
							<stop offset={off} stopColor='red' stopOpacity={1} />
						</linearGradient>
					</defs>
					<Area type='monotone' dataKey='count' stroke='#000' fill='url(#splitColor)' />
				</AreaChart>
			</ResponsiveContainer>
		);
	};

	return (
		<Box
			flex={1}
			width='100%'
			height='100%'
			sx={{
				minHeight: 180,
				maxHeight: 520,
				paddingY: 2,
				bgcolor: 'background.paper',
				color: 'text.secondary',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				boxSizing: 'border-box',
				borderRadius: '12px',
				boxShadow: 1,
			}}>
			<Box display='flex' justifyContent='left' alignItems='center' width='100%'>
				<Typography fontWeight='bold' fontSize='15px' color='text.secondary' paddingX={3} paddingBottom={2}>
					{title}
				</Typography>
			</Box>

			<Box sx={{ flexGrow: 1, width: '100%', overflow: 'hidden', minHeight: 0 }}>{loading ? <Loader /> : renderGraph(graphData)}</Box>
		</Box>
	);
};

Chart.propTypes = {
	title: PropTypes.string.isRequired,
};

export default Chart;
