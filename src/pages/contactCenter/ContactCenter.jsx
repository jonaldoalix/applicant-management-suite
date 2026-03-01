/**
 * CONTACT CENTER (Bulk Messaging)
 * ---------------------------------------------------------------------------
 * This page allows Admins (Members) to send Emails and SMS to various user groups.
 *
 * * FEATURES:
 * 1. Audience Segmentation: Automatically groups users by Application Type (New vs. Returning).
 * 2. Template System: Renders buttons for pre-defined messages (Acceptance, Rejection, Nudges).
 * 3. Custom Blasts: Allows writing free-form HTML emails to ad-hoc lists.
 * 4. Preset Loaders: "Add Preset" buttons quickly populate the recipient list with bulk groups.
 */

import React, { useEffect, useCallback, useReducer, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import { doc, setDoc, collection } from 'firebase/firestore';

// UI Components
import { Box, Button, Typography, TextField, Autocomplete, Chip, Select, MenuItem, FormControl, InputLabel, FormControlLabel, Switch, Grid, Menu } from '@mui/material';
import { FiberNewOutlined as NewIcon, KeyboardReturnOutlined as ReturningIcon, SchoolOutlined as SchoolIcon, GroupAddOutlined as GroupAddIcon, CloseOutlined, AlternateEmail as AliasIcon, ArrowDropDown as ArrowDropDownIcon } from '@mui/icons-material';

// Contexts
import { useTheme } from '../../context/ThemeContext';
import { useTitle } from '../../context/HelmetContext';
import { useConfig } from '../../context/ConfigContext';
import { useAlert } from '../../context/AlertContext';
import { useDialog } from '../../context/DialogContext';
import { useAuth } from '../../context/AuthContext';
import { useMailbox } from '../../context/MailboxContext';

// Backend & Config
import { send, templates } from '../../config/content/push';
import { getRealTimeApplicationsByWindow, getRealTimeCollection, getRealTimeApplicantsByApplicationID, db } from '../../config/data/firebase';
import { brand, emailHeader, staticEmailFooter, senders as staticSenders } from '../../config/Constants';
import { ApplicationType, collections } from '../../config/data/collections';
import '../memberDash/memberDash.scss';

// =============================================================================
//  STATE MANAGEMENT (Reducer)
// =============================================================================

const initialState = {
	recipients: [], // Selected To: list
	sender: '', // Selected From: address
	cc: [], // Selected CC: list
	smsRecipients: [], // Selected SMS list
	override: false, // If true, ignores user's "Unsubscribe" preferences

	// Calculated Lists (Available for Presets)
	applicantEmails: [],
	applicantCells: [],
	newApplicantEmails: [],
	newApplicantCells: [],
	returningApplicantEmails: [],
	returningApplicantCells: [],
	scholarshipApplicantEmails: [],
	scholarshipApplicantCells: [],
	memberEmails: [],
	memberCells: [],
	memberAliases: [],

	// Combined Lists (For Autocomplete Options)
	allUserEmails: [],
	allCC: [],
	allUserCells: [],
	availableSenders: [],
};

/**
 * Merges two lists of user objects, removing duplicates based on ID or Email.
 */
const combineUnique = (list1 = [], list2 = []) => {
	const map = new Map();
	for (const item of [...list1, ...list2]) {
		if (item && (item.id || item.email)) {
			map.set(item.email || item.id, item);
		}
	}
	return Array.from(map.values());
};

function reducer(state, action) {
	switch (action.type) {
		case 'SET_FIELD':
			return { ...state, [action.field]: action.payload };

		case 'SET_DATA_LISTS': {
			// updates the "pool" of available users when Firestore data changes
			const { applicants = state.applicantEmails, members = state.memberEmails, prefilled = [] } = action.payload;

			const applicantCells = applicants.map((u) => ({ id: u.id, name: u.name, cell: u.cell })).filter((u) => u.cell);
			const memberCells = members.map((u) => ({ id: u.id, name: u.name, cell: u.cell })).filter((u) => u.cell);
			const memberAliases = members.map((u) => ({ id: u.id, name: u.name, email: u.alias })).filter((u) => u.alias);

			return {
				...state,
				applicantEmails: applicants,
				memberEmails: members,
				applicantCells,
				memberCells,
				memberAliases,
				allUserEmails: combineUnique(combineUnique(applicants, members), prefilled),
				allUserCells: combineUnique(
					combineUnique(applicantCells, memberCells),
					prefilled.filter((p) => p.cell)
				),
				allCC: combineUnique(
					members,
					state.availableSenders.filter((s) => !s.isSystem)
				),
			};
		}

		case 'PREFILL_DATA': {
			// Called when navigating from another page (e.g., "Email This User" button)
			const { prefilledRecipients = [], prefilledSms = [] } = action.payload;
			return {
				...state,
				recipients: prefilledRecipients,
				smsRecipients: prefilledSms,
				allUserEmails: combineUnique(state.allUserEmails, prefilledRecipients),
				allUserCells: combineUnique(state.allUserCells, prefilledSms),
			};
		}

		case 'INITIALIZE_SENDERS':
			return {
				...state,
				availableSenders: action.payload,
				allCC: combineUnique(
					state.memberEmails,
					action.payload.filter((s) => !s.isSystem)
				),
			};

		case 'RESET_FORM':
			return { ...state, recipients: [], cc: [], smsRecipients: [], sender: '' };

		default:
			throw new Error(`Unhandled action type: ${action.type}`);
	}
}

// =============================================================================
//  HELPER LOGIC
// =============================================================================

/**
 * Groups active applications by type (New vs. Returning) to populate the preset lists.
 */
const processApplications = (currentApplications, appTypeMap) => {
	// 1. Buckets IDs into Sets based on application type
	for (const app of currentApplications) {
		if (appTypeMap[app.type]?.ids && app.completedBy) {
			appTypeMap[app.type].ids.add(app.completedBy);
		}
	}

	// 2. Fetches the actual applicant profiles for those IDs
	const innerUnsubs = Object.values(appTypeMap)
		.map((typeInfo) => {
			if (typeInfo.ids.size > 0) {
				return getRealTimeApplicantsByApplicationID(Array.from(typeInfo.ids), typeInfo.handler);
			}
			typeInfo.handler([]);
			return null;
		})
		.filter(Boolean);

	return () => {
		for (const unsub of innerUnsubs) {
			unsub?.();
		}
	};
};

// =============================================================================
//  MAIN COMPONENT
// =============================================================================

const ContactCenter = () => {
	// --- Contexts ---
	const { darkMode, boxShadow } = useTheme();
	const { showAlert, handleError } = useAlert();
	const { showDialog } = useDialog();
	const { member } = useAuth();
	const { permittedAliases } = useMailbox();
	const config = useConfig();

	// --- Navigation & State ---
	const location = useLocation();
	const navigate = useNavigate();
	const [state, dispatch] = useReducer(reducer, initialState);

	// Local state for Presets Dropdown Menus
	const [allMembersData, setAllMembersData] = useState([]);
	const [recipientPresetAnchorEl, setRecipientPresetAnchorEl] = useState(null);
	const [ccPresetAnchorEl, setCcPresetAnchorEl] = useState(null);
	const [smsPresetAnchorEl, setSmsPresetAnchorEl] = useState(null);

	useTitle({ title: 'Contact Center', appear: false });

	// --- Data Transformers ---

	const createHandler = useCallback(
		(filter) => (data) => {
			return data
				.filter((u) => state.override || (filter === 'email' ? u.notifications?.email : u.notifications?.sms))
				.map((u) => ({
					id: u.id,
					name: `${u.firstName} ${u.lastName}`,
					email: u.email,
					cell: u.cell,
					alias: u.alias,
				}));
		},
		[state.override]
	);

	// --- Effect 1: Handle Pre-filled Data (from Navigation State) ---
	useEffect(() => {
		const prefilledState = location.state;
		if (prefilledState && (prefilledState.prefilledRecipients || prefilledState.prefilledSms)) {
			dispatch({ type: 'PREFILL_DATA', payload: prefilledState });
			// Clear state so refresh doesn't re-trigger
			navigate(location.pathname, { replace: true, state: {} });
		}
	}, [location.state, navigate, location.pathname]);

	// --- Effect 2: Initialize "From" Senders ---
	useEffect(() => {
		const dynamicSenders = staticSenders.map((s) => ({ ...s, isSystem: true }));

		// Add User's Personal Alias
		if (member?.alias) {
			dynamicSenders.push({
				id: member.id,
				name: `${member.firstName} | ${brand.organizationShortName}`,
				email: member.alias,
				isSystem: false,
			});
		}

		// Add Permitted Group Aliases (e.g. admin@)
		for (const alias of permittedAliases) {
			const groupEmail = `${alias}@${brand.emailDomain}`;
			if (!dynamicSenders.some((s) => s.email === groupEmail)) {
				dynamicSenders.push({
					id: alias,
					name: brand.organizationShortName,
					email: groupEmail,
					isSystem: false,
				});
			}
		}

		dispatch({ type: 'INITIALIZE_SENDERS', payload: dynamicSenders });
	}, [member, permittedAliases]);

	// --- Effect 3: Fetch Real-Time User Lists ---
	useEffect(() => {
		const unsubApplicants = getRealTimeCollection(collections.applicants, (data) => {
			dispatch({ type: 'SET_DATA_LISTS', payload: { applicants: createHandler('email')(data) } });
		});

		const unsubMembers = getRealTimeCollection(collections.members, (data) => {
			setAllMembersData(data);
			dispatch({ type: 'SET_DATA_LISTS', payload: { members: createHandler('email')(data) } });
		});

		return () => {
			unsubApplicants?.();
			unsubMembers?.();
		};
	}, [state.override, createHandler, dispatch]);

	// --- Effect 4: Segment Applicants by Type (New vs Returning) ---
	const createApplicantUpdateHandler = useCallback(
		(emailField, cellField) => (applicants) => {
			const emails = applicants.filter((u) => state.override || u.notifications?.email).map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email }));

			const cells = applicants.filter((u) => state.override || u.notifications?.sms).map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, cell: u.cell }));

			dispatch({ type: 'SET_FIELD', field: emailField, payload: emails });
			dispatch({ type: 'SET_FIELD', field: cellField, payload: cells });
		},
		[state.override]
	);

	useEffect(() => {
		if (!config?.APPLICATION_DEADLINE) return;

		const appTypeMap = {
			[ApplicationType.newApplication]: { ids: new Set(), handler: createApplicantUpdateHandler('newApplicantEmails', 'newApplicantCells') },
			[ApplicationType.returningGrant]: { ids: new Set(), handler: createApplicantUpdateHandler('returningApplicantEmails', 'returningApplicantCells') },
			[ApplicationType.scholarship]: { ids: new Set(), handler: createApplicantUpdateHandler('scholarshipApplicantEmails', 'scholarshipApplicantCells') },
		};

		const unsub = getRealTimeApplicationsByWindow(config.APPLICATION_DEADLINE, true, (currentApplications) => {
			return processApplications(currentApplications, appTypeMap);
		});
		return () => unsub?.();
	}, [config, state.override, createApplicantUpdateHandler]);

	// --- Actions ---

	const handleSend = useCallback(
		async (templateKey, data = {}) => {
			const { recipients, smsRecipients, sender, cc } = state;
			if (!recipients.length && !smsRecipients.length) {
				showAlert({ message: 'Please add at least one recipient.', type: 'warning' });
				return { success: false };
			}
			if (!sender?.email) {
				showAlert({ message: 'Please select a sender.', type: 'warning' });
				return { success: false };
			}
			try {
				const result = await send(templateKey, recipients, sender, cc, smsRecipients, data);
				if (result.success) {
					showAlert({ message: 'Message queued for sending!', type: 'success' });
					dispatch({ type: 'RESET_FORM' });
				} else {
					throw result.error;
				}
				return result;
			} catch (error) {
				handleError(error, 'contact-center-send');
				return { success: false, error: error };
			}
		},
		[state, showAlert, handleError]
	);

	const handleCustomMessageSend = async (formData) => {
		if (!formData) return;
		const { recipients, sender, cc, smsRecipients } = state;
		const { subject = '', emailBody = '', smsBody = '' } = formData;

		if (!recipients.length && !smsRecipients.length) {
			showAlert({ message: 'Please add at least one recipient.', type: 'warning' });
			return;
		}
		if (!sender?.email) {
			showAlert({ message: 'Please select a sender.', type: 'warning' });
			return;
		}

		try {
			const ccRecipients = cc.map((c) => `${c.name} <${c.email}>`);

			// 1. Send Emails
			if (recipients.length > 0) {
				const parser = new DOMParser();
				const htmlDoc = parser.parseFromString(emailBody, 'text/html');
				const text = htmlDoc.body.textContent || '';

				for (const recipient of recipients) {
					const email = {
						to: `${recipient.name} <${recipient.email}>`,
						from: `${sender.name} <${sender.email}>`,
						replyTo: config.SYSTEM_REPLY_TO,
						cc: ccRecipients,
						message: {
							subject,
							text,
							html: emailHeader + emailBody + staticEmailFooter,
						},
					};
					await setDoc(doc(collection(db, collections.emails)), email);
				}
			}

			// 2. Send SMS
			if (smsRecipients.length > 0) {
				for (const recipient of smsRecipients) {
					const sms = {
						to: `+1${recipient.cell}`,
						body: smsBody || subject,
					};
					await setDoc(doc(collection(db, collections.sms)), sms);
				}
			}
			showAlert({ message: 'Custom message queued for sending!', type: 'success' });
			dispatch({ type: 'RESET_FORM' });
		} catch (error) {
			handleError(error, 'contact-center-custom-send');
		}
	};

	const handleOpenTemplateDialog = (template) => {
		if (template.requiredFields?.length > 0) {
			// If template requires variables (e.g. rejection reason), ask for them
			showDialog({
				id: 'templatedMessage',
				data: { title: `Enter Required Data for ${template.label}`, inputs: template.requiredFields },
				callback: (formData) => {
					if (formData) {
						handleSend(template.name, formData);
					}
				},
			});
		} else {
			// Otherwise just send immediately
			handleSend(template.name, {});
		}
	};

	// --- List Management Handlers ---

	const handleListChange = useCallback(
		(fieldName) =>
			(event, newValue = []) => {
				const isEmailField = fieldName === 'recipients' || fieldName === 'cc';
				const property = isEmailField ? 'email' : 'cell';

				// Handle "Free Text" entries (user typed an email manually)
				const updated = newValue.map((item) => (typeof item === 'string' ? { id: uuid(), name: '', [property]: item } : item));
				dispatch({ type: 'SET_FIELD', field: fieldName, payload: updated });
			},
		[]
	);
	const handleRecipientsChange = handleListChange('recipients');
	const handleCCChange = handleListChange('cc');
	const handleCellChange = handleListChange('smsRecipients');

	const removeFromList = useCallback(
		(fieldName, itemToRemove) => {
			const currentList = state[fieldName] || [];
			const updatedList = currentList.filter((item) => item.id !== itemToRemove.id);
			dispatch({ type: 'SET_FIELD', field: fieldName, payload: updatedList });
		},
		[state]
	);
	const removeRecipient = (item) => removeFromList('recipients', item);
	const removeCC = (item) => removeFromList('cc', item);
	const removeCell = (item) => removeFromList('smsRecipients', item);

	// --- Preset Handlers ---

	const addPresetToList = useCallback(
		(fieldName, presetList) => {
			const currentList = state[fieldName] || [];
			const existingIds = new Set(currentList.map((item) => item.id));
			const newItems = presetList.filter((item) => (item.email || item.cell) && !existingIds.has(item.id));
			dispatch({ type: 'SET_FIELD', field: fieldName, payload: [...currentList, ...newItems] });
		},
		[state]
	);
	const addPresetRecipients = (list) => addPresetToList('recipients', list);
	const addPresetCCs = (list) => addPresetToList('cc', list);
	const addPresetCells = (list) => addPresetToList('smsRecipients', list);

	const addPresetMemberAliases = useCallback(() => {
		const aliasRecipients = allMembersData
			.filter((m) => m.alias)
			.map((m) => ({
				id: m.id + '-alias',
				name: `${m.firstName} ${m.lastName}`,
				email: m.alias,
			}));
		addPresetToList('recipients', aliasRecipients);
	}, [allMembersData, addPresetToList]);

	const handlePresetMenuOpen = (setter) => (event) => setter(event.currentTarget);
	const handlePresetMenuClose = (setter) => () => setter(null);
	const handlePresetAction = (actionFn, value, menuCloser) => {
		actionFn(value);
		menuCloser();
	};

	return (
		<Box sx={{ p: 2, pb: 6 }} display='flex' flexDirection='column' gap={3}>
			{/* Page Header */}
			<Box borderRadius='12px' boxShadow={boxShadow} bgcolor={darkMode ? 'background.main' : 'white'} display='flex' alignItems='center' justifyContent='left' padding={1} paddingX={2}>
				<Typography fontSize='24px' color={darkMode ? 'primary.main' : 'highlight.main'}>
					Contact Center
				</Typography>
			</Box>

			<Grid container spacing={3}>
				{/* 1. Configuration Panel (Recipients & Sender) */}
				<Grid item xs={12}>
					<Box display='flex' flexDirection='column' padding={2} gap='10px' bgcolor='background.main' color='text.primary' style={{ borderRadius: '12px', boxShadow: boxShadow }}>
						{/* Header & Override Toggle */}
						<Box display='flex' flexDirection='row' flexWrap='nowrap' justifyContent='space-between' alignItems='center'>
							<Typography component='h2' variant='span' color='text.secondary'>
								Headers
							</Typography>
							<FormControlLabel control={<Switch checked={state.override} onChange={() => dispatch({ type: 'SET_FIELD', field: 'override', payload: !state.override })} />} label='Ignore Preferences?' />
						</Box>

						{/* RECIPIENTS FIELD */}
						<Autocomplete
							multiple
							freeSolo
							options={state.allUserEmails}
							value={state.recipients}
							getOptionLabel={(option) => (typeof option === 'string' ? option : `${option.name} <${option.email}>`)}
							isOptionEqualToValue={(option, value) => option.id === value.id}
							renderTags={(value, getTagProps) =>
								value.map((option, index) => {
									const { key, ...tagProps } = getTagProps({ index });
									return <Chip key={option.id || key} label={`${option.name} <${option.email}>`} {...tagProps} onDelete={() => removeRecipient(option)} deleteIcon={<CloseOutlined />} sx={{ backgroundColor: darkMode ? 'primary.main' : 'highlight.main' }} color={'secondary'} />;
								})
							}
							onChange={handleRecipientsChange}
							renderInput={(params) => (
								<Box display='flex' flexDirection='row' flexWrap='nowrap' alignItems='center' gap={1}>
									<TextField {...params} label='Recipients (email@example.com)' variant='outlined' fullWidth InputProps={{ ...params.InputProps, sx: { flexWrap: 'wrap' } }} />
									<Button variant='outlined' size='small' onClick={handlePresetMenuOpen(setRecipientPresetAnchorEl)} endIcon={<ArrowDropDownIcon />} sx={{ whiteSpace: 'nowrap', height: '56px', p: 3 }}>
										Add Preset
									</Button>
									<Menu anchorEl={recipientPresetAnchorEl} open={Boolean(recipientPresetAnchorEl)} onClose={handlePresetMenuClose(setRecipientPresetAnchorEl)}>
										<MenuItem onClick={() => handlePresetAction(addPresetRecipients, state.memberEmails, handlePresetMenuClose(setRecipientPresetAnchorEl))}>
											<GroupAddIcon sx={{ mr: 1 }} /> Members (Email)
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetMemberAliases, null, handlePresetMenuClose(setRecipientPresetAnchorEl))}>
											<AliasIcon sx={{ mr: 1 }} /> Members (Alias)
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetRecipients, state.applicantEmails, handlePresetMenuClose(setRecipientPresetAnchorEl))}>
											<GroupAddIcon sx={{ mr: 1 }} /> Applicants
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetRecipients, state.newApplicantEmails, handlePresetMenuClose(setRecipientPresetAnchorEl))}>
											<NewIcon sx={{ mr: 1 }} /> New Apps
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetRecipients, state.returningApplicantEmails, handlePresetMenuClose(setRecipientPresetAnchorEl))}>
											<ReturningIcon sx={{ mr: 1 }} /> Returning Apps
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetRecipients, state.scholarshipApplicantEmails, handlePresetMenuClose(setRecipientPresetAnchorEl))}>
											<SchoolIcon sx={{ mr: 1 }} /> 4-Year Apps
										</MenuItem>
									</Menu>
								</Box>
							)}
						/>

						{/* SENDER SELECT */}
						<FormControl fullWidth variant='outlined'>
							<InputLabel id='sender-select-label'>Sender</InputLabel>
							<Select labelId='sender-select-label' value={state.sender} onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'sender', payload: e.target.value })} label='Sender' renderValue={(selected) => (selected ? `${selected.name} <${selected.email}>` : '')}>
								{state.availableSenders.map((s) => (
									<MenuItem key={s.id || s.email} value={s}>{`${s.name} <${s.email}>`}</MenuItem>
								))}
							</Select>
						</FormControl>

						{/* CC FIELD */}
						<Autocomplete
							multiple
							freeSolo
							options={state.allCC}
							value={state.cc}
							getOptionLabel={(option) => (typeof option === 'string' ? option : `${option.name} <${option.email}>`)}
							isOptionEqualToValue={(option, value) => option.id === value.id}
							renderTags={(value, getTagProps) =>
								value.map((option, index) => {
									const { key, ...tagProps } = getTagProps({ index });
									return <Chip key={option.id || key} label={`${option.name} <${option.email}>`} {...tagProps} onDelete={() => removeCC(option)} deleteIcon={<CloseOutlined />} sx={{ backgroundColor: darkMode ? 'primary.main' : 'highlight.main' }} color={'secondary'} />;
								})
							}
							onChange={handleCCChange}
							renderInput={(params) => (
								<Box display='flex' flexDirection='row' flexWrap='nowrap' alignItems='center' gap={1}>
									<TextField {...params} label='CCs (email@example.com)' variant='outlined' fullWidth InputProps={{ ...params.InputProps, sx: { flexWrap: 'wrap' } }} />
									<Button variant='outlined' size='small' onClick={handlePresetMenuOpen(setCcPresetAnchorEl)} endIcon={<ArrowDropDownIcon />} sx={{ whiteSpace: 'nowrap', height: '56px', p: 3 }}>
										Add Preset
									</Button>
									<Menu anchorEl={ccPresetAnchorEl} open={Boolean(ccPresetAnchorEl)} onClose={handlePresetMenuClose(setCcPresetAnchorEl)}>
										<MenuItem onClick={() => handlePresetAction(addPresetCCs, state.memberEmails, handlePresetMenuClose(setCcPresetAnchorEl))}>
											<GroupAddIcon sx={{ mr: 1 }} /> Members (Email)
										</MenuItem>
									</Menu>
								</Box>
							)}
						/>

						{/* SMS RECIPIENTS FIELD */}
						<Autocomplete
							multiple
							freeSolo
							options={state.allUserCells}
							value={state.smsRecipients}
							getOptionLabel={(option) => (typeof option === 'string' ? option : `${option.name} <+1${option.cell}>`)}
							isOptionEqualToValue={(option, value) => option.id === value.id}
							renderTags={(value, getTagProps) =>
								value.map((option, index) => {
									const { key, ...tagProps } = getTagProps({ index });
									return <Chip key={option.id || key} label={`${option.name} <+1${option.cell}>`} {...tagProps} onDelete={() => removeCell(option)} deleteIcon={<CloseOutlined />} sx={{ backgroundColor: darkMode ? 'primary.main' : 'highlight.main' }} color={'secondary'} />;
								})
							}
							onChange={handleCellChange}
							renderInput={(params) => (
								<Box display='flex' flexDirection='row' flexWrap='nowrap' alignItems='center' gap={1}>
									<TextField {...params} label='Cell Numbers (9781230456)' variant='outlined' fullWidth InputProps={{ ...params.InputProps, sx: { flexWrap: 'wrap' } }} />
									<Button variant='outlined' size='small' onClick={handlePresetMenuOpen(setSmsPresetAnchorEl)} endIcon={<ArrowDropDownIcon />} sx={{ whiteSpace: 'nowrap', height: '56px', p: 3 }}>
										Add Preset
									</Button>
									<Menu anchorEl={smsPresetAnchorEl} open={Boolean(smsPresetAnchorEl)} onClose={handlePresetMenuClose(setSmsPresetAnchorEl)}>
										<MenuItem onClick={() => handlePresetAction(addPresetCells, state.memberCells, handlePresetMenuClose(setSmsPresetAnchorEl))}>
											<GroupAddIcon sx={{ mr: 1 }} /> Members
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetCells, state.applicantCells, handlePresetMenuClose(setSmsPresetAnchorEl))}>
											<GroupAddIcon sx={{ mr: 1 }} /> Applicants
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetCells, state.newApplicantCells, handlePresetMenuClose(setSmsPresetAnchorEl))}>
											<NewIcon sx={{ mr: 1 }} /> New Apps
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetCells, state.returningApplicantCells, handlePresetMenuClose(setSmsPresetAnchorEl))}>
											<ReturningIcon sx={{ mr: 1 }} /> Returning Apps
										</MenuItem>
										<MenuItem onClick={() => handlePresetAction(addPresetCells, state.scholarshipApplicantCells, handlePresetMenuClose(setSmsPresetAnchorEl))}>
											<SchoolIcon sx={{ mr: 1 }} /> 4-Year Apps
										</MenuItem>
									</Menu>
								</Box>
							)}
						/>
					</Box>
				</Grid>

				{/* 2. Template Buttons */}
				{templates.map((template) => (
					<Grid item xs={12} sm={6} md={template.title === 'Application Status' ? 8 : 4} key={template.title}>
						<Box display='flex' flexDirection='column' gap='10px' bgcolor='background.main' color={darkMode ? 'text.active' : 'secondary.main'} sx={{ padding: '20px', borderRadius: '12px', boxShadow: boxShadow, height: '310px' }}>
							<Typography component='h2' variant='span' color='text.secondary'>
								{template.title}
							</Typography>
							{template.options.map((option) => (
								<Button key={option.name} variant='contained' sx={{ backgroundColor: darkMode ? 'primary.main' : 'highlight.main' }} onClick={() => handleOpenTemplateDialog(option)}>
									{option.label}
								</Button>
							))}
						</Box>
					</Grid>
				))}

				{/* 3. Custom Message Box */}
				<Grid item xs={12} sm={6} md={4}>
					<Box display='flex' flexDirection='column' bgcolor='background.main' color={darkMode ? 'text.active' : 'secondary.main'} sx={{ padding: '20px', borderRadius: '12px', boxShadow: boxShadow, height: '310px' }}>
						<Typography component='h2' variant='span' color='text.secondary'>
							Send a Custom Message
						</Typography>
						<Box mt='auto' pt={2}>
							<Button variant='contained' fullWidth sx={{ backgroundColor: darkMode ? 'primary.main' : 'highlight.main' }} onClick={() => showDialog({ id: 'customMessage', callback: handleCustomMessageSend })}>
								Compose Message
							</Button>
						</Box>
					</Box>
				</Grid>
			</Grid>
		</Box>
	);
};

export default ContactCenter;