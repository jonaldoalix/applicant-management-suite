/**
 * Dynamic Field Component
 * Renders various form inputs and display fields based on configuration.
 * Includes specialized sub-components for headers, labels, file uploads, and lists.
 */

import React, { useState, useEffect, useContext, memo } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { v4 as uuidv4 } from 'uuid';
import { Autocomplete, Stack, Avatar, TextField, FormLabel, FormGroup, Checkbox, FormControl, FormControlLabel, FormHelperText, Switch, Select, MenuItem, InputLabel, Box, Typography, Divider, Chip, Grid, Card, Button } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Camera, FileUploadOutlined as FileUploadIcon } from '@mui/icons-material';

// Config & Context
import * as Validators from '../../config/data/Validation';
import { saveCollectionData } from '../../config/data/firebase';
import { collections } from '../../config/data/collections';
import { generateUploadLink, generateSecurePin, generate6DigitNumber } from '../../config/Constants';
import { sendRequest } from '../../config/content/push';
import { useDialog } from '../../context/DialogContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';
import { ApplicationContext } from '../../context/ApplicationContext';

// Components
import { VisuallyHiddenInput } from '../visuallyHiddenInput/VisuallyHiddenInput';
import GoogleMaps from '../autocomplete/GoogleAutoComplete';

dayjs.extend(customParseFormat);

// --- Helper Functions ---

const getNestedValue = (obj, path) => {
	if (!path) return undefined;
	return path.split('.').reduce((acc, part) => acc?.[part], obj);
};

const interpolateString = (template, data) => {
	if (!template?.includes('${')) return template;
	return template.replaceAll(/\${(.*?)}/g, (match, path) => {
		const value = getNestedValue(data, path.trim());
		if (typeof value === 'number') {
			return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
		}
		return value || '...';
	});
};

const formatCurrency = (num) => {
	const number = Number.parseFloat(num);
	if (Number.isNaN(number)) return '$0.00';
	return `$${number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const sumArray = (application, arrayPath, property) => {
	const arr = getNestedValue(application, arrayPath) || [];
	return arr.reduce((acc, item) => acc + (Number.parseFloat(item[property]) || 0), 0);
};

const resolveVariable = (application, variable) => {
	const trimmedVar = variable.trim();

	if (!Number.isNaN(Number(trimmedVar)) && trimmedVar !== '') {
		return Number.parseFloat(trimmedVar);
	}

	if (trimmedVar.startsWith('sumArray')) {
		const match = trimmedVar.match(/sumArray\(([\w.]+),\s*['"]?(\w+)['"]?\)/);
		if (match) return sumArray(application, match[1].trim(), match[2].trim());
	}

	// Common formulas
	const specialFormulas = {
		otherTotalExpenses: "sumArray(expenses.otherExpenses, 'amount')",
		otherIncomeSources: "sumArray(incomes.otherIncomeSources, 'amount')",
		totalExpenses: "expenses.tuitionCost + expenses.roomAndBoardCost + expenses.bookCost + expenses.commutingCost + sumArray(expenses.otherExpenses, 'amount')",
		totalIncome: "incomes.earningsAppliedToEducation + incomes.savingsAppliedToEducation + incomes.collegeAward + incomes.loansAmount + sumArray(incomes.otherIncomeSources, 'amount')",
		totalProjections: 'projections.applicantFamily + projections.request + totalIncome',
	};

	if (specialFormulas[trimmedVar]) {
		return processFormula(application, specialFormulas[trimmedVar], false);
	}
	return Number.parseFloat(getNestedValue(application, trimmedVar)) || 0;
};

const executeCalculation = (parts, application) => {
	let total = resolveVariable(application, parts[0]);
	for (let i = 1; i < parts.length; i += 2) {
		const operator = parts[i];
		const value = resolveVariable(application, parts[i + 1]);
		if (operator === '+') total += value;
		else if (operator === '-') total -= value;
		else if (operator === '*') total *= value;
		else if (operator === '/') total /= value;
	}
	return total;
};

const processFormula = (application, formula, formatAsCurrency = true) => {
	if (!formula) return formatAsCurrency ? '$0.00' : 0;

	try {
		if (formula.includes('===')) {
			const [left, right] = formula.split('===').map((part) => resolveVariable(application, part));
			return Math.abs(left - right) < 0.01 ? 'Yes' : 'No';
		}

		const parts = formula.split(/([+\-*/])/).filter((p) => p.trim());
		const total = executeCalculation(parts, application);

		if (Number.isNaN(total)) return formatAsCurrency ? '$0.00' : 0;
		return formatAsCurrency ? formatCurrency(total) : total;
	} catch (e) {
		console.error('Calculation Error:', e, 'Original Formula:', formula);
		return 'Error';
	}
};

// --- Sub-Components ---

const HeaderField = memo(({ interpolatedLabel }) => (
	<Divider textAlign='center' sx={{ my: 2 }}>
		<Chip label={interpolatedLabel.toUpperCase()} />
	</Divider>
));
HeaderField.displayName = 'HeaderField';
HeaderField.propTypes = { interpolatedLabel: PropTypes.string.isRequired };

const LabelField = memo(({ fieldConfig, value, interpolatedLabel }) => {
	const { name, valueFormatter, dateFormat } = fieldConfig;
	let displayValue = value;

	if (valueFormatter === 'attachmentChip') {
		const attachment = value || {};
		const chipLabel = attachment.displayName || (attachment.requestID ? 'Request Sent' : 'Not Uploaded');
		return (
			<Box display='flex' flexDirection='row' width='100%' gap={1} my={1} alignItems='center'>
				<Typography variant='body1' fontWeight='bold'>
					{interpolatedLabel}:
				</Typography>
				<Chip label={chipLabel} clickable={!!attachment.home} onClick={() => attachment.home && window.open(attachment.home, '_blank')} color={attachment.home ? 'primary' : 'default'} />
			</Box>
		);
	}

	if (valueFormatter === 'currency') displayValue = formatCurrency(value);
	else if (typeof value === 'boolean') displayValue = value ? 'Yes' : 'No';
	else if (name?.includes('DOB') || name?.includes('Date')) displayValue = value ? dayjs(value).format(dateFormat || 'MM/DD/YYYY') : 'N/A';
	else if (name?.includes('MailingAddress')) displayValue = value?.description || 'N/A';

	return (
		<Box display='flex' flexDirection='row' width='100%' gap={1} my={1}>
			<Typography variant='body1' fontWeight='bold'>
				{interpolatedLabel}:
			</Typography>
			<Typography variant='body1'>{displayValue || 'Not Provided'}</Typography>
		</Box>
	);
});
LabelField.displayName = 'LabelField';
LabelField.propTypes = { fieldConfig: PropTypes.object.isRequired, value: PropTypes.any, interpolatedLabel: PropTypes.string.isRequired };

const CalculatedLabelField = memo(({ interpolatedLabel, value }) => (
	<Box display='flex' flexDirection='row' justifyContent='space-between' alignItems='center' width='100%' my={1}>
		<Typography variant='body1' fontWeight='bold'>
			{interpolatedLabel}:
		</Typography>
		<Typography variant='body1' fontWeight='bold'>
			{value}
		</Typography>
	</Box>
));
CalculatedLabelField.displayName = 'CalculatedLabelField';
CalculatedLabelField.propTypes = { interpolatedLabel: PropTypes.string.isRequired, value: PropTypes.any };

const SummaryListField = memo(({ application, fieldConfig, interpolatedLabel }) => {
	const { name, cardDisplay = {} } = fieldConfig;
	const listData = getNestedValue(application, name) || [];
	const currentOrgIndex = getNestedValue(application, 'experience.currentOrganization');
	const hasCurrentOrg = currentOrgIndex !== undefined && currentOrgIndex !== null;

	if (listData.length === 0) {
		return (
			<Box width='100%' my={2}>
				<Typography variant='body1' fontWeight='bold' gutterBottom>
					{interpolatedLabel}
				</Typography>
				<Typography variant='body2' color='text.secondary'>
					No items listed.
				</Typography>
			</Box>
		);
	}

	return (
		<Box width='100%' my={2}>
			<Typography variant='body1' fontWeight='bold' gutterBottom>
				{interpolatedLabel}
			</Typography>
			<Grid container spacing={2}>
				{listData.map((item, index) => {
					const key = item.id || `summary-item-${index}`;
					if (typeof item === 'string' || (typeof item === 'object' && item.school)) {
						return (
							<Grid item key={key}>
								<Chip label={item.school || item} />
							</Grid>
						);
					}
					const isCurrentOrg = name === 'experience.positions' && hasCurrentOrg && index === Number.parseInt(currentOrgIndex, 10);
					return (
						<Grid item xs={12} sm={6} md={4} key={key}>
							<Card variant='outlined' sx={{ p: 2, height: '100%', border: isCurrentOrg ? '3px solid black' : undefined, boxShadow: isCurrentOrg ? 4 : 1 }}>
								{cardDisplay.title && (
									<Typography variant='subtitle1' fontWeight='bold'>
										{item[cardDisplay.title]}
									</Typography>
								)}
								{cardDisplay.subtitle && (
									<Typography variant='body2' color='text.secondary'>
										{fieldConfig.subtitleFormatter === 'currency' ? formatCurrency(item[cardDisplay.subtitle]) : item[cardDisplay.subtitle]}
									</Typography>
								)}
								{cardDisplay.details?.map((detailKey) => (
									<Typography key={detailKey} variant='caption' display='block'>
										{`${detailKey.charAt(0).toUpperCase() + detailKey.slice(1)}: ${item[detailKey]}`}
									</Typography>
								))}
							</Card>
						</Grid>
					);
				})}
			</Grid>
		</Box>
	);
});
SummaryListField.displayName = 'SummaryListField';
SummaryListField.propTypes = { application: PropTypes.object.isRequired, fieldConfig: PropTypes.object.isRequired, interpolatedLabel: PropTypes.string.isRequired };

const FileField = memo(({ fieldConfig, valuePath, onFieldUpdate, application, onFileAction }) => {
	const { showDialog } = useDialog();
	const { showAlert } = useAlert();
	const value = getNestedValue(application, valuePath);

	const handleRequestRecommendation = () => {
		showDialog({
			id: 'requestRecommendation',
			data: {
				fromName: `${application.profile.applicantFirstName} ${application.profile.applicantLastName}`,
				attachmentType: fieldConfig.name,
			},
			callback: async (result) => {
				if (result) {
					try {
						const requestId = uuidv4();
						const pin = generate6DigitNumber();
						const securePin = await generateSecurePin(pin);
						const uploadLink = await generateUploadLink(requestId);

						const requestData = {
							id: requestId,
							...result,
							fromName: `${application.profile.applicantFirstName} ${application.profile.applicantLastName}`,
							fromId: application.profile.applicantID,
							applicationID: application.id,
							attachmentType: fieldConfig.name,
							status: 'Pending',
							expiryDate: dayjs().add(14, 'day').format('MM/DD/YYYY'),
							pin: securePin,
						};

						await saveCollectionData(collections.requests, requestId, requestData);
						await sendRequest(requestData, uploadLink, pin);
						onFieldUpdate(valuePath, { ...value, requestID: requestId });

						showAlert({ message: 'Recommendation request sent!', type: 'success' });
					} catch (err) {
						console.error('Failed to send recommendation request:', err);
						showAlert({ message: 'Failed to send request. Please try again.', type: 'error' });
					}
				}
			},
		});
	};

	return (
		<Card variant='outlined' sx={{ p: 2, my: 1 }}>
			<Typography gutterBottom>{fieldConfig.label}</Typography>
			<Grid container spacing={2} alignItems='center'>
				<Grid item xs={12} sm={value?.displayName ? 6 : 12}>
					<Button component='label' variant='contained' disabled={fieldConfig.readOnly}>
						Upload File
						<VisuallyHiddenInput type='file' accept='.pdf' onChange={(e) => onFileAction('upload', e.target.files[0])} />
					</Button>
					{fieldConfig.allowRequest && (
						<Button variant='outlined' sx={{ ml: 1 }} onClick={handleRequestRecommendation}>
							Request Recommendation
						</Button>
					)}
				</Grid>
				{value?.displayName && (
					<Grid item xs={12} sm={6}>
						<Chip label={value.displayName} onDelete={() => onFileAction('delete', value)} />
					</Grid>
				)}
				{value?.requestID && !value?.displayName && (
					<Grid item xs={12} sm={6}>
						<Chip label='Request Sent' color='secondary' />
					</Grid>
				)}
			</Grid>
		</Card>
	);
});
FileField.displayName = 'FileField';
FileField.propTypes = { fieldConfig: PropTypes.object.isRequired, valuePath: PropTypes.string.isRequired, onFieldUpdate: PropTypes.func.isRequired, application: PropTypes.object.isRequired, onFileAction: PropTypes.func.isRequired };

const PictureUploadField = memo(({ fieldConfig, value, onFileAction }) => {
	const config = useConfig();
	return (
		<Stack direction='row' alignItems='center' spacing={4}>
			<Avatar sx={{ width: 75, height: 75 }} src={value?.home || config.DEFAULT_AVATAR} />
			<Button size='small' component='label' variant='contained' color='secondary' startIcon={<Camera />}>
				{value?.home ? 'Change Picture' : 'Upload Picture'}
				<VisuallyHiddenInput name={fieldConfig.name} onChange={(e) => onFileAction('upload', e.target.files[0])} type='file' accept='image/*' />
			</Button>
		</Stack>
	);
});
PictureUploadField.displayName = 'PictureUploadField';
PictureUploadField.propTypes = { fieldConfig: PropTypes.object.isRequired, value: PropTypes.object, onFileAction: PropTypes.func.isRequired };

const SingleFileField = memo(({ fieldConfig, value, onFieldUpdate }) => {
	const handleFileChange = (event) => {
		const file = event.target.files[0];
		if (file) onFieldUpdate(fieldConfig.name, file);
	};

	return (
		<Stack direction='row' alignItems='center' spacing={2} sx={{ mt: 2 }}>
			<Button component='label' variant='outlined' startIcon={<FileUploadIcon />} sx={{ textTransform: 'none', height: '55px', width: '100%' }}>
				{value ? 'Change File' : 'Select File'}
				<VisuallyHiddenInput type='file' onChange={handleFileChange} />
			</Button>
			{value && (
				<Typography variant='body2' noWrap width='100%'>
					{value.name}
				</Typography>
			)}
		</Stack>
	);
});
SingleFileField.displayName = 'SingleFileField';
SingleFileField.propTypes = { fieldConfig: PropTypes.object.isRequired, value: PropTypes.object, onFieldUpdate: PropTypes.func.isRequired };

const PermissionGroupField = memo(({ fieldConfig, value, onFieldUpdate }) => {
	const handlePermissionChange = (path, checked) => {
		onFieldUpdate(path, checked);
	};

	const getNestedPermission = (obj, path) => path.split('.').reduce((acc, part) => acc?.[part], obj);

	const formatPermissionLabel = (key) => {
		let label = key.split('.').pop();
		if (label.startsWith('can') && label.length > 3) label = label.substring(3);
		return label.charAt(0).toUpperCase() + label.slice(1);
	};

	return (
		<Box color='text.active' sx={{ width: '100%' }}>
			{Object.entries(fieldConfig.groups).map(([groupLabel, permissions]) => (
				<FormControl key={groupLabel} component='fieldset' sx={{ mb: 2, width: '100%' }}>
					<FormLabel component='legend'>{groupLabel}</FormLabel>
					<FormGroup row>
						{permissions.map((permissionKey) => {
							const path = `${fieldConfig.name}.${permissionKey}`;
							const isChecked = getNestedPermission(value, permissionKey) || false;
							const label = formatPermissionLabel(permissionKey);
							return <FormControlLabel key={permissionKey} control={<Checkbox checked={isChecked} onChange={(e) => handlePermissionChange(path, e.target.checked)} />} label={label} />;
						})}
					</FormGroup>
				</FormControl>
			))}
		</Box>
	);
});
PermissionGroupField.displayName = 'PermissionGroupField';
PermissionGroupField.propTypes = { fieldConfig: PropTypes.object.isRequired, value: PropTypes.object, onFieldUpdate: PropTypes.func.isRequired };

// --- Main Component ---

const DynamicField = ({ fieldConfig, application, onFieldUpdate, sectionName, onErrorUpdate, forceValidate, onFileAction, permissions }) => {
	const { name, type, required, validator, helperText, calculatedValue } = fieldConfig;
	const { allowEditing } = useContext(ApplicationContext) || { allowEditing: true };

	const isSpecialType = ['header', 'label', 'summaryList', 'calculatedLabel'].includes(type);
	const valuePath = isSpecialType || sectionName === 'attachments' ? name : `${sectionName}.${name}`;
	const value = calculatedValue ? processFormula(application, calculatedValue) : getNestedValue(application, valuePath);
	const interpolatedLabel = interpolateString(fieldConfig.label, application);

	const [touched, setTouched] = useState(false);
	const [error, setError] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const isDynamicallyDisabled = fieldConfig.disableOn ? fieldConfig.disableOn(permissions) : false;

	useEffect(() => {
		if (['header', 'label', 'calculatedLabel', 'summaryList', 'file'].includes(type)) {
			onErrorUpdate(name, false);
			return;
		}

		let isInvalid = false;
		let msg = '';
		const isEmpty = value === null || value === undefined || value === '';

		if (required && isEmpty) {
			isInvalid = true;
			msg = 'This field is required.';
		} else if (!isEmpty && validator) {
			const validatorFunc = Validators[validator];
			if (validatorFunc && !validatorFunc(value)) {
				isInvalid = true;
				msg = helperText || `Invalid input.`;
			}
		}

		const shouldShowError = (touched || forceValidate) && isInvalid;
		setError(shouldShowError);
		setErrorMessage(shouldShowError ? msg : '');
		onErrorUpdate(name, isInvalid);
	}, [value, required, validator, name, onErrorUpdate, touched, forceValidate, helperText, type]);

	const handleChange = (eventOrValue) => {
		onFieldUpdate(valuePath, eventOrValue?.target ? eventOrValue.target.value : eventOrValue);
	};

	const handleBlur = () => setTouched(true);

	const handleFileAction = (action, payload) => {
		if (onFileAction) onFileAction(action, valuePath, payload);
	};

	const commonTextFieldProps = {
		fullWidth: true,
		margin: 'normal',
		required,
		error,
		helperText: error ? errorMessage : helperText,
		onBlur: handleBlur,
		disabled: !allowEditing || fieldConfig.readOnly || isDynamicallyDisabled,
	};

	const fieldProps = {
		fieldConfig,
		application,
		value,
		interpolatedLabel,
		allowEditing,
		commonTextFieldProps,
		handleChange,
		handleBlur,
		valuePath,
		onFieldUpdate,
		onFileAction: handleFileAction,
	};

	switch (type) {
		case 'header':
			return <HeaderField {...fieldProps} />;
		case 'label':
			return <LabelField {...fieldProps} />;
		case 'calculatedLabel':
			return <CalculatedLabelField {...fieldProps} />;
		case 'summaryList':
			return <SummaryListField {...fieldProps} />;
		case 'file':
			return <FileField {...fieldProps} />;
		case 'singleFile':
			return <SingleFileField fieldConfig={fieldConfig} value={value} onFieldUpdate={onFieldUpdate} />;
		case 'pictureUpload':
			return <PictureUploadField fieldConfig={fieldConfig} value={value} onFileAction={(action, payload) => onFileAction(action, valuePath, payload)} />;
		case 'permissionGroup':
			return <PermissionGroupField fieldConfig={fieldConfig} value={value} onFieldUpdate={onFieldUpdate} />;

		case 'text':
		case 'email':
			return <TextField {...commonTextFieldProps} label={interpolatedLabel} name={name} value={value || ''} onChange={handleChange} multiline={fieldConfig.multiline} rows={fieldConfig.rows} />;
		case 'number':
			return <TextField {...commonTextFieldProps} type='text' label={interpolatedLabel} name={name} value={value || ''} onChange={handleChange} />;
		case 'autocomplete':
			return <Autocomplete options={fieldConfig.options || []} getOptionLabel={(option) => option.label || ''} value={fieldConfig.options?.find((opt) => opt.id === value) || null} onChange={(event, newValue) => handleChange(newValue?.id || '')} isOptionEqualToValue={(option, value) => option.id === value.id} renderInput={(params) => <TextField {...params} label={interpolatedLabel} {...commonTextFieldProps} />} disabled={!allowEditing || fieldConfig.readOnly} />;
		case 'date':
			return (
				<LocalizationProvider dateAdapter={AdapterDayjs}>
					<DatePicker label={interpolatedLabel} value={value ? dayjs(value) : null} onChange={(newValue) => handleChange(newValue && newValue.isValid() ? newValue.format('YYYY-MM-DD') : null)} onClose={handleBlur} slotProps={{ textField: { ...commonTextFieldProps } }} disabled={!allowEditing || fieldConfig.readOnly} views={fieldConfig.dateFormat === 'MM/YYYY' ? ['month', 'year'] : ['year', 'month', 'day']} />
				</LocalizationProvider>
			);
		case 'address':
			return <GoogleMaps label={interpolatedLabel} location={value} changeLocation={(addressObject) => onFieldUpdate(valuePath, addressObject)} disabled={!allowEditing || fieldConfig.readOnly} />;
		case 'switch':
			return <FormControlLabel control={<Switch checked={!!value} onChange={(e) => handleChange(e.target.checked)} name={name} disabled={!allowEditing || fieldConfig.readOnly} />} label={interpolatedLabel} sx={{ mt: 2 }} />;
		case 'dropdown': {
			const { helperText: fieldHelperText, error: isError, required: isRequired, onBlur: onFieldBlur, disabled: isDisabled, fullWidth: isFullWidth, margin: fieldMargin } = commonTextFieldProps;
			return (
				<FormControl fullWidth={isFullWidth} margin={fieldMargin} required={isRequired} error={isError} disabled={isDisabled}>
					<InputLabel>{interpolatedLabel}</InputLabel>
					<Select name={name} value={value || ''} onChange={handleChange} onBlur={onFieldBlur} label={interpolatedLabel}>
						{(fieldConfig.options || []).map((opt) => (
							<MenuItem key={typeof opt === 'object' ? opt.value : opt} value={typeof opt === 'object' ? opt.value : opt}>
								{typeof opt === 'object' ? opt.label : opt}
							</MenuItem>
						))}
					</Select>
					{fieldHelperText && <FormHelperText>{fieldHelperText}</FormHelperText>}
				</FormControl>
			);
		}
		default:
			return <p>Unsupported field type: {type}</p>;
	}
};

DynamicField.propTypes = {
	fieldConfig: PropTypes.object.isRequired,
	application: PropTypes.object.isRequired,
	onFieldUpdate: PropTypes.func.isRequired,
	onErrorUpdate: PropTypes.func.isRequired,
	sectionName: PropTypes.string.isRequired,
	forceValidate: PropTypes.bool.isRequired,
	onFileAction: PropTypes.func,
	permissions: PropTypes.object,
};

export default DynamicField;
