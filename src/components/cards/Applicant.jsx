/**
 * Applicant Card (Single View)
 * Displays the full profile of a specific Applicant.
 * Features:
 * - Header with Photo, Name, and Key Info.
 * - Dynamic Action Buttons (e.g., Edit, Delete, Update Email).
 * - Notes Section.
 * - Application History Table.
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography } from '@mui/material';

// Context
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { useAlert } from '../../context/AlertContext';

// Config & Hooks
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { collections } from '../../config/data/collections';
import { UserLastLogin } from '../../config/ui/tableConfig';
import { getApplicantActions } from '../../config/ui/buttonActions';
import { useAssetActionHandler } from '../../hooks/useAssetActionHandler';

// Components
import SingleAssetPage, { AssetCard } from '../layout/SingleAssetPage';
import Header from '../assets/Header';
import InfoTable from '../assets/InfoTable';
import DynamicActionGroup from '../dynamicButtons/DynamicButtons';
import NotesSection from '../notes/NotesSection';
import CollapsableTable from '../table/Table';

export const Applicant = ({ applicant }) => {
	const { darkMode } = useTheme();
	const { showAlert, handleError } = useAlert();
	const config = useConfig();
	const [showNotes, setShowNotes] = useState(false);

	const handleAction = useAssetActionHandler('updateLoginEmail-applicant');

	const actions = useMemo(() => getApplicantActions(showAlert, handleError, showNotes, setShowNotes), [showAlert, handleError, showNotes]);

	const applicantInfo = [
		{ label: 'Full Name', value: `${applicant?.firstName} ${applicant?.lastName}` },
		{ label: 'School', value: `${applicant?.school} (${applicant?.gradYear})` },
		{ label: 'Major', value: applicant?.major },
		{ label: 'Organization', value: applicant?.organization },
		{ label: 'Email', value: applicant?.email },
		{ label: 'Phone', value: applicant?.cell },
	];

	return (
		<SingleAssetPage>
			{/* Top Section: Header Info & Action Buttons */}
			<Box display='flex' flexDirection={{ xs: 'column', md: 'row' }} padding='20px' gap='20px'>
				{/* Left Card: Basic Info */}
				<AssetCard flex='1'>
					<Header image={applicant?.picture?.home} title={applicant?.callMe || applicant?.firstName} major={applicant?.major} editPath={generatePath(paths.editApplicant, { id: applicant?.id })} config={config}>
						<InfoTable data={applicantInfo} />
						<Box mb='10px' fontSize='14px'>
							<Typography component='span' fontWeight='bold' color='text.secondary' mr='5px'>
								Last Login:
							</Typography>
							<Typography component='span' fontWeight='300'>
								<UserLastLogin userId={applicant?.id} />
							</Typography>
						</Box>
					</Header>
				</AssetCard>

				{/* Right Card: Functions/Actions */}
				<AssetCard flex='1.25' sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
					<Typography variant='span' fontSize='16px' color={darkMode ? 'secondary.main' : 'text.highlight'} mt={1.5}>
						Functions
					</Typography>
					<DynamicActionGroup asset={applicant} actions={actions} onAction={handleAction} />
				</AssetCard>
			</Box>

			{/* Notes Section (Collapsible) */}
			{showNotes && (
				<Box margin='0px 20px 20px'>
					<AssetCard>
						<NotesSection targetId={applicant?.id} targetCollection={collections.applicants} />
					</AssetCard>
				</Box>
			)}

			{/* Bottom Section: Applications Table */}
			<Box margin='0px 20px 20px'>
				<AssetCard sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
					<Typography variant='span' fontSize='16px' color={darkMode ? 'secondary.main' : 'text.highlight'}>
						Applications
					</Typography>

					{applicant?.applications && applicant.applications.length > 0 ? (
						<CollapsableTable data={applicant.applications} />
					) : (
						<Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic', p: 1 }}>
							No application history to show...
						</Typography>
					)}
				</AssetCard>
			</Box>
		</SingleAssetPage>
	);
};

Applicant.propTypes = {
	applicant: PropTypes.shape({
		id: PropTypes.string,
		firstName: PropTypes.string,
		lastName: PropTypes.string,
		callMe: PropTypes.string,
		major: PropTypes.string,
		school: PropTypes.string,
		gradYear: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		organization: PropTypes.string,
		email: PropTypes.string,
		cell: PropTypes.string,
		picture: PropTypes.shape({
			home: PropTypes.string,
		}),
		applications: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.object])),
	}).isRequired,
};