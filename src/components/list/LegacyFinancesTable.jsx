/**
 * Legacy Finances Table
 * A complex, collapsible table used to display historical financial data.
 * Features:
 * - Nested tables for detailed breakdowns (Scholarships, Grants, Non-S&G Items).
 * - Auto-calculation of "Total Returns".
 * - Theme-aware styling for rows and borders.
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Box, Collapse, Typography } from '@mui/material';
import { KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon, PeopleOutlined, ListAltOutlined } from '@mui/icons-material';

// Context
import { useTheme } from '../../context/ThemeContext';

// --- Helpers ---

const formatCurrency = (value) => {
	const num = Number.parseFloat(value);
	if (Number.isNaN(num) || value === null) return 'N/A';
	return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

// --- Sub-Components ---

const DetailSection = ({ title, icon, children, darkMode }) => (
	<Box sx={{ marginY: '15px' }}>
		<Typography variant='h6' gutterBottom component='div' color={darkMode ? 'primary.main' : 'highlight.main'} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
			{icon}
			{title}
		</Typography>
		{children}
	</Box>
);

DetailSection.propTypes = {
	title: PropTypes.string.isRequired,
	icon: PropTypes.node,
	children: PropTypes.node.isRequired,
	darkMode: PropTypes.bool,
};

const Row = ({ row, darkMode }) => {
	const [open, setOpen] = useState(false);

	// Calculate derived values
	const totalReturns = (row.financial_summary?.scholarships_grants?.amount_returned ?? 0) + (row.financial_summary?.non_scholarship_items?.amount_returned ?? 0);

	const tableCellStyles = {
		color: 'text.primary',
		fontWeight: 500,
		borderBottom: darkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.12)',
	};

	const detailTableHeadStyles = {
		fontWeight: 'bold',
		color: 'text.primary',
		bgcolor: 'action.hover',
	};

	return (
		<React.Fragment>
			{/* Main Summary Row */}
			<TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
				<TableCell>
					<IconButton aria-label='expand row' size='small' onClick={() => setOpen(!open)}>
						{open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
					</IconButton>
				</TableCell>
				<TableCell sx={tableCellStyles} component='th' scope='row'>
					{row.year}
				</TableCell>
				<TableCell align='center' sx={tableCellStyles}>
					{formatCurrency(row.total_allotted_disbursement)}
				</TableCell>
				<TableCell align='center' sx={tableCellStyles}>
					{formatCurrency(row.prior_year_clawback)}
				</TableCell>
				<TableCell align='center' sx={tableCellStyles}>
					{formatCurrency(totalReturns)}
				</TableCell>
				<TableCell align='center' sx={tableCellStyles}>
					<Box display='flex' flexDirection='row' justifyContent='center' alignItems='center' flexWrap='nowrap' width='100%'>
						<PeopleOutlined fontSize='small' sx={{ mr: 0.5 }} />
						<Typography variant='body2'>{row.renewable_scholarships?.length ?? 0} Applicants</Typography>
					</Box>
				</TableCell>
				<TableCell align='center' sx={tableCellStyles}>
					<Box display='flex' flexDirection='row' justifyContent='center' alignItems='center'>
						<PeopleOutlined fontSize='small' sx={{ mr: 0.5 }} />
						<Typography variant='body2'>{row.non_renewable_grants?.length ?? 0} Applicants</Typography>
					</Box>
				</TableCell>
				<TableCell align='center' sx={tableCellStyles}>
					{formatCurrency(row.financial_summary?.scholarships_grants?.amount_available)}
				</TableCell>
				<TableCell align='center' sx={tableCellStyles}>
					{formatCurrency(row.financial_summary?.non_scholarship_items?.amount_available)}
				</TableCell>
			</TableRow>

			{/* Expanded Detail Row */}
			<TableRow>
				<TableCell
					style={{
						paddingBottom: 0,
						paddingTop: 0,
						backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)', // Themed background
					}}
					colSpan={9}>
					<Collapse in={open} timeout='auto' unmountOnExit>
						<Box
							sx={{
								margin: 2,
								padding: 2,
								borderRadius: '8px',
								border: '1px solid',
								borderColor: 'divider',
								backgroundColor: 'background.paper',
							}}>
							{/* Section 1: Non-Scholarship Items */}
							{row.non_sg_items && row.non_sg_items.length > 0 && (
								<DetailSection title='Non-Scholarship Items' icon={<ListAltOutlined />} darkMode={darkMode}>
									<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
										<Table size='small' aria-label='non-scholarship items'>
											<TableHead>
												<TableRow>
													<TableCell sx={detailTableHeadStyles}>Program</TableCell>
													<TableCell align='right' sx={detailTableHeadStyles}>
														Request
													</TableCell>
													<TableCell align='right' sx={detailTableHeadStyles}>
														Disbursement
													</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{row.non_sg_items.map((item) => (
													<TableRow key={item.program}>
														<TableCell component='th' scope='row'>
															{item.program}
														</TableCell>
														<TableCell align='right'>{formatCurrency(item.request)}</TableCell>
														<TableCell align='right'>{formatCurrency(item.disbursement)}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</DetailSection>
							)}

							{/* Section 2: Renewable Scholarships */}
							{row.renewable_scholarships && row.renewable_scholarships.length > 0 && (
								<DetailSection title='Renewable Scholarships' icon={<PeopleOutlined />} darkMode={darkMode}>
									<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
										<Table size='small' aria-label='renewable scholarships'>
											<TableHead>
												<TableRow>
													<TableCell sx={detailTableHeadStyles}>Scout Name</TableCell>
													<TableCell sx={detailTableHeadStyles}>Grade</TableCell>
													<TableCell align='right' sx={detailTableHeadStyles}>
														Committed
													</TableCell>
													<TableCell align='right' sx={detailTableHeadStyles}>
														One-Time Grant
													</TableCell>
													<TableCell align='right' sx={detailTableHeadStyles}>
														Total
													</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{row.renewable_scholarships.map((item) => (
													<TableRow key={item.scout_name}>
														<TableCell component='th' scope='row'>
															{item.scout_name}
														</TableCell>
														<TableCell>{item.grade}</TableCell>
														<TableCell align='right'>{formatCurrency(item.committed_renewal)}</TableCell>
														<TableCell align='right'>{formatCurrency(item.one_time_grant)}</TableCell>
														<TableCell align='right'>{formatCurrency(item.total_disbursement)}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</DetailSection>
							)}

							{/* Section 3: Non-Renewable Grants */}
							{row.non_renewable_grants && row.non_renewable_grants.length > 0 && (
								<DetailSection title='Non-Renewable Grants' icon={<PeopleOutlined />} darkMode={darkMode}>
									<TableContainer component={Paper} sx={{ boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
										<Table size='small' aria-label='non-renewable grants'>
											<TableHead>
												<TableRow>
													<TableCell sx={detailTableHeadStyles}>Scout Name</TableCell>
													<TableCell sx={detailTableHeadStyles}>Grade</TableCell>
													<TableCell align='right' sx={detailTableHeadStyles}>
														Grant Amount
													</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{row.non_renewable_grants.map((item) => (
													<TableRow key={item.scout_name}>
														<TableCell component='th' scope='row'>
															{item.scout_name}
														</TableCell>
														<TableCell>{item.grade}</TableCell>
														<TableCell align='right'>{formatCurrency(item.grant_amount)}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</DetailSection>
							)}
						</Box>
					</Collapse>
				</TableCell>
			</TableRow>
		</React.Fragment>
	);
};

Row.propTypes = {
	row: PropTypes.shape({
		year: PropTypes.number.isRequired,
		total_allotted_disbursement: PropTypes.number,
		prior_year_clawback: PropTypes.number,
		financial_summary: PropTypes.object,
		renewable_scholarships: PropTypes.array,
		non_renewable_grants: PropTypes.array,
		non_sg_items: PropTypes.array,
		id: PropTypes.string,
	}).isRequired,
	darkMode: PropTypes.bool,
};

// --- Main Component ---

const LegacyFinancesTable = ({ data, titleIn }) => {
	const { darkMode, boxShadow } = useTheme();

	const tableCellStyles = {
		color: 'text.primary',
		fontWeight: 'bold',
		borderBottom: darkMode ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(0, 0, 0, 0.2)',
	};

	return (
		<Box sx={{ width: '100%', borderRadius: '12px' }}>
			{titleIn && (
				<Box borderRadius='12px' boxShadow={boxShadow} bgcolor={darkMode ? 'background.main' : 'white'} display='flex' alignItems='center' justifyContent='left' padding={1} paddingX={2} marginBottom={2}>
					<Typography fontSize='24px' color={darkMode ? 'primary.main' : 'highlight.main'}>
						{titleIn}
					</Typography>
				</Box>
			)}

			<TableContainer
				component={Paper}
				sx={{
					maxHeight: '80vh',
					boxShadow: boxShadow,
					borderRadius: '12px',
				}}>
				<Table aria-label='collapsible legacy finances table' stickyHeader>
					<TableHead>
						<TableRow>
							<TableCell />
							<TableCell sx={tableCellStyles}>Year</TableCell>
							<TableCell align='center' sx={tableCellStyles}>
								Total Allotted
							</TableCell>
							<TableCell align='center' sx={tableCellStyles}>
								Clawback
							</TableCell>
							<TableCell align='center' sx={tableCellStyles}>
								Returns
							</TableCell>
							<TableCell align='center' sx={tableCellStyles}>
								Renewables
							</TableCell>
							<TableCell align='center' sx={tableCellStyles}>
								Non-Renewables
							</TableCell>
							<TableCell align='center' sx={tableCellStyles}>
								S&G Available (80%)
							</TableCell>
							<TableCell align='center' sx={tableCellStyles}>
								Non-S&G Available (20%)
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{data?.map((row) => (
							<Row key={row.id} row={row} darkMode={darkMode} />
						))}
					</TableBody>
				</Table>
			</TableContainer>
		</Box>
	);
};

LegacyFinancesTable.propTypes = {
	data: PropTypes.array,
	titleIn: PropTypes.string,
};

export default LegacyFinancesTable;