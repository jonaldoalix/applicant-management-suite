// @ts-nocheck
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const SimpleApplicantsTable = ({ data }) => {
	const navigate = useNavigate();
	const { darkMode } = useTheme();
	const tableHeaderCellStyles = {
		color: 'text.primary',
		fontWeight: 'bold',
		borderBottom: darkMode ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(0, 0, 0, 0.2)',
	};

	return (
		<TableContainer
			component={Paper}
			sx={{
				maxHeight: '80vh',
				boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
				borderRadius: '12px',
				mt: 2,
			}}>
			<Table aria-label='new applicants table'>
				<TableHead>
					<TableRow>
						<TableCell sx={tableHeaderCellStyles}>Name</TableCell>
						<TableCell sx={tableHeaderCellStyles}>Email</TableCell>
						<TableCell sx={tableHeaderCellStyles}>Cell</TableCell>
						<TableCell sx={tableHeaderCellStyles}>Account Created</TableCell>
						<TableCell sx={tableHeaderCellStyles} align="center">Actions</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{data?.map((applicant) => (
						<TableRow key={applicant.id}>
							<TableCell>{applicant.name}</TableCell>
							<TableCell>{applicant.email}</TableCell>
							<TableCell>{applicant.cell || 'N/A'}</TableCell>
							<TableCell>
								{applicant.accountCreated
									? new Date(applicant.accountCreated.seconds * 1000).toLocaleDateString()
									: 'N/A'}
							</TableCell>
							<TableCell align="center">
								<Button 
									variant="outlined" 
									size="small" 
									onClick={() => navigate(`/applicants/view/${applicant.id}`)}>
									View Details
								</Button>
							</TableCell>
						</TableRow>
					))}
					{(!data || data.length === 0) && (
						<TableRow>
							<TableCell colSpan={5} align="center">
								No new applicants found for this year.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</TableContainer>
	);
};

SimpleApplicantsTable.propTypes = {
	data: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default SimpleApplicantsTable;
