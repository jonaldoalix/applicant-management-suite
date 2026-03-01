/**
 * SITE SETTINGS DASHBOARD
 * ---------------------------------------------------------------------------
 * This page allows Admins to configure global application variables.
 *
 * * ARCHITECTURE:
 * 1. Configuration Source: Reads from 'src/context/ConfigContext' (Firestore 'site_content').
 * 2. Dynamic Grouping: Uses 'groupSettings' to categorize variables based on their
 * key name (e.g. 'SIGNATURE_...') or data type (Boolean -> Toggles).
 * 3. Automations: Specialized UI for configuring backend scheduled tasks.
 * 4. Admin Actions: Triggers for cloud functions defined in 'src/config/admin/index.js'.
 */

import React, { useEffect, useState, useCallback } from 'react';
import dayjs from 'dayjs';

// UI Components
import { Box, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, FormGroup, Button, Typography, Divider, Switch } from '@mui/material';
import { DateTimeField, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Contexts & Hooks
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';

// Backend & Config
import { saveCollectionData, getCollection } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';
import { adminFunctions } from '../../config/admin';
import { capitalize } from '../../config/Constants';
import Loader from '../../components/loader/Loader';

// =============================================================================
//  HELPER: Settings Categorization
// =============================================================================

/**
 * Categorizes settings based on key prefixes and value types.
 * This allows the UI to present a flat JSON object in organized sections.
 */
const groupSettings = (settings) => {
	const groups = {
		'Feature Toggles': [],
		'Important Dates': [],
		'Shared Signatures': [],
		'Contact & Email': [],
		'System Configuration': [],
		'Defaults & Messages': [],
	};

	for (const [key, value] of Object.entries(settings)) {
		if (key === 'automations') continue; // Handled separately

		// Heuristic 1: Key Naming Conventions
		if (key.startsWith('SIGNATURE_')) {
			groups['Shared Signatures'].push([key, value]);
		}
		// Heuristic 2: Data Type
		else if (typeof value === 'boolean') {
			groups['Feature Toggles'].push([key, value]);
		} else if (value instanceof Date) {
			groups['Important Dates'].push([key, value]);
		}
		// Heuristic 3: Domain Keywords
		else if (key.includes('EMAIL') || key.includes('MAIL') || key.includes('TEL')) {
			groups['Contact & Email'].push([key, value]);
		} else if (key.includes('KEY') || key.includes('ID') || key.includes('PIN')) {
			groups['System Configuration'].push([key, value]);
		} else {
			groups['Defaults & Messages'].push([key, value]);
		}
	}
	return groups;
};

// =============================================================================
//  MAIN COMPONENT
// =============================================================================

const SiteSettings = () => {
	// --- Contexts ---
	const config = useConfig();
	const { showAlert, handleError } = useAlert();
	const { showDialog } = useDialog();
	const { darkMode, boxShadow } = useTheme();

	useTitle({ title: 'Site Settings', appear: false });

	// --- State ---
	const [settings, setSettings] = useState(null); // Local mutable copy of settings
	const [groupedSettings, setGroupedSettings] = useState(null);
	const [allApplicants, setAllApplicants] = useState([]); // Cache for Admin Action dropdowns
	const [automations, setAutomations] = useState({});

	const memoizedGroupSettings = useCallback(groupSettings, []);

	// --- Effect: Initialization ---
	useEffect(() => {
		if (config) {
			setSettings(config);
			setGroupedSettings(memoizedGroupSettings(config));

			// Ensure automation arrays are initialized
			const initialAutomations = config.automations || {};
			for (const key in initialAutomations) {
				if (!Array.isArray(initialAutomations[key].recipients)) {
					initialAutomations[key].recipients = [];
				}
			}
			setAutomations(initialAutomations);
		}

		// Fetch applicants in background for potential use in Admin Actions
		const fetchApplicants = async () => {
			try {
				const applicants = await getCollection(collections.applicants);
				setAllApplicants(applicants);
			} catch (error) {
				handleError(error, 'fetchApplicants-settings');
			}
		};
		fetchApplicants();
	}, [config, handleError, memoizedGroupSettings]);

	// --- Handler: Value Updates ---
	const handleSettingChange = (key, value) => {
		// A. Automation Settings (Nested)
		if (key.startsWith('automations.')) {
			const keys = key.split('.');
			const automationName = keys[1];
			const settingName = keys[2];

			setAutomations((prev) => {
				const newAutomations = { ...prev };
				if (!newAutomations[automationName]) {
					newAutomations[automationName] = {};
				}

				// Handle CSV string to Array conversion for recipients
				if (settingName === 'recipients' && typeof value === 'string') {
					newAutomations[automationName][settingName] = value
						.split(',')
						.map((email) => email.trim())
						.filter(Boolean);
				} else {
					newAutomations[automationName][settingName] = value;
				}

				setSettings((prevSettings) => ({ ...prevSettings, automations: newAutomations }));
				return newAutomations;
			});
		}
		// B. Standard Settings (Flat)
		else {
			setSettings((prev) => {
				const newSettings = { ...prev, [key]: value };
				setGroupedSettings(memoizedGroupSettings(newSettings));
				return newSettings;
			});
		}
	};

	const handleSave = async () => {
		try {
			await saveCollectionData(collections.siteConfig, config.CONFIG_ID, settings);
			showAlert({ message: 'Settings saved successfully!', type: 'success' });
		} catch (error) {
			handleError(error, 'saveSettings');
		}
	};

	// --- Handler: Admin Maintenance Functions ---
	const handleAdminAction = (func) => {
		if (func.parameters && func.parameters.length > 0) {
			// 1. Prepare Parameters (Hydrate Select Options)
			const preparedParameters = func.parameters.map((param) => {
				if (param.name === 'userId' && param.type === 'select') {
					return {
						...param,
						options: allApplicants.map((app) => ({
							value: app.id,
							label: `${app.firstName} ${app.lastName} (${app.email})`,
						})),
					};
				}
				return param;
			});

			// 2. Open Dialog to collect inputs
			showDialog({
				id: func.id,
				data: { inputs: preparedParameters },
				callback: async (result) => {
					if (result) {
						try {
							await func.action(result);
							showAlert({ message: `${func.label} executed successfully!`, type: 'success' });
						} catch (err) {
							handleError(err, `adminAction-${func.id}`);
						}
					}
				},
			});
		} else {
			// 3. Simple Confirmation for no-param actions
			showDialog({
				id: 'adminActionConfirmation',
				messageOverride: func.description,
				callback: async (confirmed) => {
					if (confirmed) {
						try {
							await func.action();
							showAlert({ message: `${func.label} executed successfully!`, type: 'success' });
						} catch (err) {
							handleError(err, `adminAction-${func.id}`);
						}
					}
				},
			});
		}
	};

	// --- Render Helpers ---

	const renderControl = (key, value) => {
		const commonProps = {
			label: key.replaceAll('_', ' ').replaceAll(/\b\w/g, (l) => l.toUpperCase()),
		};
		if (typeof value === 'boolean') {
			return <FormControlLabel key={key} control={<Checkbox checked={value} onChange={(e) => handleSettingChange(key, e.target.checked)} />} {...commonProps} />;
		}
		if (value instanceof Date) {
			return (
				<LocalizationProvider dateAdapter={AdapterDayjs}>
					<DateTimeField key={key} value={dayjs(value)} onChange={(newValue) => handleSettingChange(key, newValue.toDate())} {...commonProps} fullWidth />
				</LocalizationProvider>
			);
		}
		return <TextField key={key} value={value} onChange={(e) => handleSettingChange(key, e.target.value)} {...commonProps} fullWidth />;
	};

	const renderAutomationField = (automationKey, field, config) => {
		const value = config[field.name];

		const handleChange = (event) => {
			const newValue = event.target.value;
			const fullKey = `automations.${automationKey}.${field.name}`;

			if (field.type === 'number') {
				handleSettingChange(fullKey, Number.parseInt(newValue, 10) || 0);
			} else {
				handleSettingChange(fullKey, newValue);
			}
		};

		return (
			<Grid item xs={12} sm={field.type === 'select' ? 6 : 12} key={field.name}>
				{field.type === 'select' && (
					<FormControl fullWidth size='small'>
						<InputLabel>{field.label}</InputLabel>
						<Select value={value || field.options[0]} label={field.label} onChange={handleChange}>
							{field.options.map((opt) => (
								<MenuItem key={opt} value={opt}>
									{capitalize(opt)}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				)}
				{field.type === 'text' && <TextField fullWidth size='small' label={field.label} value={Array.isArray(value) ? value.join(', ') : ''} onChange={handleChange} placeholder={field.name === 'recipients' ? 'Name <email1@example.com>, Name <email2@example.com>' : ''} />}
				{field.type === 'number' && <TextField fullWidth size='small' type='number' label={field.label} value={value || 0} onChange={handleChange} InputProps={{ inputProps: { min: 0 } }} />}
			</Grid>
		);
	};

	const renderAutomationControls = () => {
		const automationDetails = {
			memberActivitySummary: {
				label: 'Member Activity Summary',
				fields: [
					{ name: 'schedule', label: 'Frequency', type: 'select', options: ['daily', 'weekly'] },
					{ name: 'recipients', label: 'Recipients (comma-separated)', type: 'text' },
				],
			},
			incompleteCountAlert: {
				label: 'Incomplete Count Alert',
				fields: [
					{ name: 'schedule', label: 'Frequency', type: 'select', options: ['daily', 'weekly'] },
					{ name: 'threshold', label: 'Alert Threshold (Count)', type: 'number' },
					{ name: 'recipients', label: 'Recipients (comma-separated)', type: 'text' },
				],
			},
		};

		return Object.keys(automationDetails).map((key) => {
			const config = automations[key] || {};
			const details = automationDetails[key];

			return (
				<Box key={key} my={2} p={2} border={1} borderColor='divider' borderRadius={1} sx={{ bgcolor: darkMode ? 'background.passive' : 'grey.50' }}>
					<FormControlLabel
						control={<Switch checked={config.enabled || false} onChange={(e) => handleSettingChange(`automations.${key}.enabled`, e.target.checked)} />}
						label={
							<Typography variant='h6' color='text.primary'>
								{details.label}
							</Typography>
						}
					/>
					{config.enabled && (
						<Grid container spacing={2} sx={{ pl: 4, pt: 1 }}>
							{details.fields.map((field) => renderAutomationField(key, field, config))}
						</Grid>
					)}
				</Box>
			);
		});
	};

	if (!settings || !groupedSettings) {
		return <Loader />;
	}

	return (
		<Box p={2} display='flex' flexDirection='column' gap={2}>
			{/* Header */}
			<Box display='flex' flexDirection='row' justifyContent='space-between' alignItems='center' borderRadius='12px' boxShadow={boxShadow} bgcolor={darkMode ? 'background.main' : 'white'} padding={1} paddingX={2}>
				<Typography fontSize='24px' color={darkMode ? 'primary.main' : 'highlight.main'}>
					Site Settings
				</Typography>
				<Button variant='contained' onClick={handleSave}>
					Save Settings
				</Button>
			</Box>

			{/* Configuration Form */}
			<Box display='flex' flexDirection='column' bgcolor={darkMode ? 'background.main' : 'white'} borderRadius={2} boxShadow={boxShadow} color='text.active'>
				<Box p={2}>
					<Grid container spacing={4}>
						<Grid item xs={12} md={6}>
							<FormGroup>
								{groupedSettings['Feature Toggles']?.map(([key, value]) => (
									<Box key={key} my={0.5}>
										{renderControl(key, value)}
									</Box>
								))}
							</FormGroup>
						</Grid>
						<Grid item xs={12} md={6}>
							<FormGroup>
								{groupedSettings['Important Dates']?.map(([key, value]) => (
									<Box key={key} my={1}>
										{renderControl(key, value)}
									</Box>
								))}
								{groupedSettings['Defaults & Messages']?.map(([key, value]) => (
									<Box key={key} my={1}>
										{renderControl(key, value)}
									</Box>
								))}
							</FormGroup>
						</Grid>
						<Grid item xs={12}>
							<Divider sx={{ my: 2 }} />
						</Grid>
						<Grid item xs={12} md={6}>
							<FormGroup>
								{groupedSettings['Contact & Email']?.map(([key, value]) => (
									<Box key={key} my={1}>
										{renderControl(key, value)}
									</Box>
								))}
							</FormGroup>
						</Grid>
						<Grid item xs={12} md={6}>
							<FormGroup>
								{groupedSettings['System Configuration']?.map(([key, value]) => (
									<Box key={key} my={1}>
										{renderControl(key, value)}
									</Box>
								))}
							</FormGroup>
						</Grid>
						<Grid item xs={12}>
							<Divider sx={{ my: 2 }} />
							<Typography variant='h6' sx={{ mb: 1, color: 'text.primary' }}>
								Automated Tasks
							</Typography>
							{renderAutomationControls()}
						</Grid>
						<Grid item xs={12}>
							<Divider sx={{ my: 2 }} />
							<Typography variant='h6' sx={{ mb: 1, color: 'text.primary' }}>
								Shared Signatures
							</Typography>
						</Grid>
						<Grid item xs={12}>
							<FormGroup>
								{groupedSettings['Shared Signatures']?.map(([key, value]) => (
									<Box key={key} my={1}>
										{renderControl(key, value)}
									</Box>
								))}
							</FormGroup>
						</Grid>
					</Grid>
				</Box>
			</Box>

			{/* Admin Functions */}
			<Box color='text.active'>
				<Box display='flex' flexDirection='column' gap={2} mt={2}>
					{adminFunctions.map((func) => (
						<Box key={func.id} bgcolor={darkMode ? 'background.main' : 'white'} p={2} borderRadius={2} boxShadow={boxShadow}>
							<Typography variant='h6'>{func.label}</Typography>
							<Typography variant='body2' sx={{ my: 1 }}>
								{func.description}
							</Typography>
							<Button variant='outlined' onClick={() => handleAdminAction(func)}>
								Execute
							</Button>
						</Box>
					))}
				</Box>
			</Box>
		</Box>
	);
};

export default SiteSettings;