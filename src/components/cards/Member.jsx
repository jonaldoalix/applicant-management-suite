/**
 * Member Detail Card
 * Administrative view for internal team members.
 * Displays profile info, account functions, personal signature, and permissions.
 */

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Typography, Divider } from '@mui/material';

// Context & Hooks
import { useTheme } from '../../context/ThemeContext';
import { useConfig } from '../../context/ConfigContext';
import { useAlert } from '../../context/AlertContext';
import { useAssetActionHandler } from '../../hooks/useAssetActionHandler';

// Config
import { generatePath } from '../../config/navigation/routeUtils';
import { paths } from '../../config/navigation/paths';
import { getMemberActions } from '../../config/ui/buttonActions';
import { UserLastLogin } from '../../config/ui/tableConfig';
import { memberFormConfig } from '../../config/ui/formConfig';

// Components
import SingleAssetPage, { AssetCard } from '../layout/SingleAssetPage';
import DynamicActionGroup from '../dynamicButtons/DynamicButtons';
import Header from '../assets/Header';
import InfoTable from '../assets/InfoTable';
import MyNotes from '../notes/MyNotes';
import PermissionGroup from '../forms/PermissionGroup';

export const Member = ({ member }) => {
	const { darkMode } = useTheme();
	const { showAlert, handleError } = useAlert();
	const config = useConfig();
	const [showNotes, setShowNotes] = useState(false);
	const [showSignature, setShowSignature] = useState(false);

	const handleAction = useAssetActionHandler('updateLoginEmail');

	const actions = useMemo(() => getMemberActions(showAlert, handleError, showNotes, setShowNotes, showSignature, setShowSignature), [showAlert, handleError, showNotes, showSignature]);

	const memberInfo = [
		{ label: 'Full Name', value: `${member?.firstName} ${member?.lastName}` },
		{ label: 'Email', value: member?.email },
		{ label: 'Alias', value: member?.alias },
		{ label: 'Phone', value: member?.cell },
		{ label: 'Position', value: member?.position },
		{ label: 'Member Since', value: member?.since },
	];

	const permissionGroups = memberFormConfig.fields.find((field) => field.name === 'permissions')?.groups || {};

	return (
		<SingleAssetPage>
			<Box display='flex' padding='20px' gap='20px'>
				<AssetCard flex='1'>
					<Header image={member?.picture?.home} title={member?.displayName || member?.firstName} editPath={generatePath(paths.editMember, { id: member?.id })} config={config}>
						<InfoTable data={memberInfo} />
						<Box mb='10px' fontSize='14px'>
							<Typography component='span' fontWeight='bold' color='text.secondary' mr='5px'>
								Last Login:
							</Typography>
							<Typography component='span' fontWeight='300'>
								<UserLastLogin userId={member?.id} />
							</Typography>
						</Box>
					</Header>
				</AssetCard>

				<AssetCard flex='1.25' sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
					<Typography component='span' fontSize='16px' color={darkMode ? 'secondary.main' : 'text.highlight'} mt={1}>
						Functions
					</Typography>
					<DynamicActionGroup asset={member} actions={actions} onAction={handleAction} />
				</AssetCard>
			</Box>

			{showSignature && (
				<Box margin='0px 20px 20px'>
					<AssetCard sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
						<Typography component='span' fontSize='16px' color={darkMode ? 'secondary.main' : 'text.highlight'}>
							Personal Signature
						</Typography>
						<Divider />
						<Box
							sx={{
								border: `2px solid`,
								borderColor: 'primary.main',
								borderRadius: '4px',
								padding: '10px 15px',
								minHeight: '60px',
								bgcolor: 'background.main',
								color: 'text.active',
							}}>
							{member.personalSignature ? (
								<div dangerouslySetInnerHTML={{ __html: member.personalSignature }} />
							) : (
								<Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>
									No personal signature set.
								</Typography>
							)}
						</Box>
					</AssetCard>
				</Box>
			)}

			{showNotes && (
				<Box margin='0px 20px 20px'>
					<AssetCard>
						<MyNotes id={member.id} />
					</AssetCard>
				</Box>
			)}

			<Box margin='0px 20px 20px'>
				<AssetCard sx={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
					<Typography component='span' fontSize='16px' color={darkMode ? 'secondary.main' : 'text.highlight'}>
						Permissions
					</Typography>
					<PermissionGroup formData={member} onUpdate={() => {}} groups={permissionGroups} disabled={true} />
				</AssetCard>
			</Box>
		</SingleAssetPage>
	);
};

Member.propTypes = {
	member: PropTypes.shape({
		id: PropTypes.string.isRequired,
		firstName: PropTypes.string,
		lastName: PropTypes.string,
		displayName: PropTypes.string,
		alias: PropTypes.string,
		email: PropTypes.string,
		cell: PropTypes.string,
		position: PropTypes.string,
		since: PropTypes.string,
		picture: PropTypes.object,
		personalSignature: PropTypes.string,
		permissions: PropTypes.shape({
			admin: PropTypes.bool,
			email: PropTypes.bool,
			push: PropTypes.bool,
			message: PropTypes.bool,
			site: PropTypes.bool,
			finances: PropTypes.bool,
			applications: PropTypes.bool,
			members: PropTypes.bool,
			audit: PropTypes.bool,
			archives: PropTypes.bool,
			login: PropTypes.bool,
			interviews: PropTypes.shape({
				canHost: PropTypes.bool,
				canAccess: PropTypes.bool,
				canSchedule: PropTypes.bool,
				canDeliberate: PropTypes.bool,
			}),
			emails: PropTypes.object,
		}),
	}).isRequired,
};
