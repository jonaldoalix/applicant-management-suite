/**
 * Generic Form Page Component
 * Renders a complete form section, including standard fields, lists (arrays), and file management.
 * Contains internal definitions for ArrayFieldForm and ArrayFieldList to handle list data.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import { Box, Typography, Grid, Button, Card, IconButton } from '@mui/material';
import { DeleteForever as DeleteForeverIcon } from '@mui/icons-material';

// Config & Context
import { appFormConfig } from '../../config/ui/formConfig';
import { UploadType } from '../../config/data/collections';
import { blankAttachment } from '../../config/data/Validation';
import { saveFile, getDownloadLinkForFile, deleteFile, invalidateRequest } from '../../config/data/firebase';
import { useAlert } from '../../context/AlertContext';

// Components
import DynamicField from './DynamicField';
import Loader from '../loader/Loader';

// --- Internal Helper Functions ---

const getNestedValue = (obj, path) => path?.split('.').reduce((acc, part) => acc?.[part], obj);

const setNestedValue = (obj, path, value) => {
	const newObj = structuredClone(obj);
	const keys = path.split('.');

	let current = newObj;
	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (current[key] === undefined || current[key] === null) current[key] = {};
		current = current[key];
	}
	current[keys.at(-1)] = value;
	return newObj;
};

const checkArrayError = (sectionConfig, application, sectionName) => {
	const arrayField = sectionConfig.arrayField;
	if (arrayField?.required) {
		const currentArray = getNestedValue(application, `${sectionName}.${arrayField.name}`) || [];
		if (currentArray.length === 0) return true;
	}
	return false;
};

const processValidationOutcome = ({ hasFieldErrors, isArrayError, attemptRef, onValidationSuccess, onValidationFailure, showAlert }) => {
	if (!hasFieldErrors && !isArrayError) {
		if (!attemptRef.current.success) {
			onValidationSuccess?.();
			attemptRef.current.success = true;
		}
	} else if (!attemptRef.current.failure) {
		if (isArrayError) showAlert('validation', 'missing');
		else onValidationFailure?.();
		attemptRef.current.failure = true;
	}
};

const useFormValidation = ({ submissionAttempted, fieldErrors, application, sectionConfig, onValidationSuccess, onValidationFailure, showAlert }) => {
	const attemptRef = useRef({ success: false, failure: false });

	useEffect(() => {
		if (!submissionAttempted) {
			attemptRef.current = { success: false, failure: false };
		}
	}, [submissionAttempted]);

	useEffect(() => {
		if (submissionAttempted) {
			const hasFieldErrors = Object.values(fieldErrors).some(Boolean);
			const isArrayError = checkArrayError(sectionConfig, application, sectionConfig?.name);

			processValidationOutcome({
				hasFieldErrors,
				isArrayError,
				attemptRef,
				onValidationSuccess,
				onValidationFailure,
				showAlert,
			});
		}
	}, [submissionAttempted, fieldErrors, onValidationSuccess, onValidationFailure, sectionConfig, application, showAlert]);
};

// --- Internal Helper Components ---

const ArrayFieldForm = ({ arrayFieldConfig, onAdd, onFileAction }) => {
	const [arrayItemInput, setArrayItemInput] = useState({});
	const [arrayInputKey, setArrayInputKey] = useState(0);

	const handleInputChange = (fieldName, value) => setArrayItemInput((prev) => ({ ...prev, [fieldName]: value }));

	const handleAddItem = () => {
		onAdd(arrayItemInput);
		setArrayItemInput({});
		setArrayInputKey((prev) => prev + 1);
	};

	return (
		<Box key='array-form'>
			<Typography variant='h6' gutterBottom>
				{arrayFieldConfig.label}
			</Typography>
			<Box key={arrayInputKey}>
				{arrayFieldConfig.fields.map((field) => (
					<DynamicField key={field.name} fieldConfig={field} application={{ temp: arrayItemInput }} onFieldUpdate={(path, value) => handleInputChange(field.name, value)} onErrorUpdate={() => {}} sectionName='temp' forceValidate={false} onFileAction={onFileAction} />
				))}
			</Box>
			<Button variant='outlined' onClick={handleAddItem} sx={{ mt: 2 }}>
				Add
			</Button>
		</Box>
	);
};

ArrayFieldForm.propTypes = {
	arrayFieldConfig: PropTypes.object.isRequired,
	onAdd: PropTypes.func.isRequired,
	onFileAction: PropTypes.func,
};

const ArrayFieldList = ({ arrayFieldConfig, arrayData, onRemove }) => (
	<Box mt={3} sx={{ maxHeight: '40vh', overflowY: 'auto' }} key='array-list'>
		{arrayData.length > 0 ? (
			arrayData.map((item, index) => (
				<Card key={item.id || index} sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<Box>
						{typeof item === 'string' ? (
							<Typography variant='subtitle1' fontWeight='bold'>
								{item}
							</Typography>
						) : (
							<>
								<Typography variant='subtitle1' fontWeight='bold'>
									{item[arrayFieldConfig.cardDisplay?.title] || item.title || item.fullName || item.school}
								</Typography>
								<Typography variant='body2' color='text.secondary'>
									{item[arrayFieldConfig.cardDisplay?.subtitle] || item.relation}
								</Typography>
								{arrayFieldConfig.cardDisplay?.details?.map((detailKey) => (
									<Typography key={detailKey} variant='caption' display='block'>
										{item[detailKey]}
									</Typography>
								))}
							</>
						)}
					</Box>
					<IconButton onClick={() => onRemove(index)}>
						<DeleteForeverIcon />
					</IconButton>
				</Card>
			))
		) : (
			<Card sx={{ p: 2, mb: 2, textAlign: 'center', borderStyle: 'dashed', borderColor: 'grey.400', backgroundColor: 'action.hover' }}>
				<Typography variant='body2' color='text.secondary'>
					No items have been added yet.
				</Typography>
				<Typography variant='caption' color='text.secondary'>
					{arrayFieldConfig.prompt || 'Use the form to add new entries.'}
				</Typography>
			</Card>
		)}
	</Box>
);

ArrayFieldList.propTypes = {
	arrayFieldConfig: PropTypes.object.isRequired,
	arrayData: PropTypes.array.isRequired,
	onRemove: PropTypes.func.isRequired,
};

// --- Main Component ---

const GenericFormPage = ({ sectionName, application, setApplication, setHasErrors, submissionAttempted, onValidationSuccess, onValidationFailure, applicationType }) => {
	const sectionConfig = useMemo(() => ({ ...appFormConfig[sectionName], name: sectionName }), [sectionName]);
	const [fieldErrors, setFieldErrors] = useState({});
	const [uploading, setUploading] = useState(false);
	const { showAlert, handleError } = useAlert();

	useFormValidation({ submissionAttempted, fieldErrors, application, sectionConfig, onValidationSuccess, onValidationFailure, showAlert });

	const fields = useMemo(() => {
		if (!sectionConfig?.fields) return [];
		return typeof sectionConfig.fields === 'function' ? sectionConfig.fields(applicationType, application) : sectionConfig.fields;
	}, [sectionConfig, applicationType, application]);

	const memoizedFields = useMemo(
		() =>
			fields.map((field) => {
				if (!field.optionsSource) return field;
				const sourceArray = getNestedValue(application, `${sectionConfig.name}.${field.optionsSource}`) || [];
				const dynamicOptions = sourceArray.map((item, idx) => ({ label: `${item.type} | ${item.organization} (${item.role})`, value: idx.toString() }));
				dynamicOptions.unshift({ label: 'Not Active', value: 'undefined' });
				return { ...field, options: dynamicOptions };
			}),
		[application, sectionConfig.name, fields]
	);

	const handleErrorUpdate = useCallback((fieldName, isError) => {
		setFieldErrors((prev) => ({ ...prev, [fieldName]: isError }));
	}, []);

	useEffect(() => {
		setHasErrors(Object.values(fieldErrors).some(Boolean));
	}, [fieldErrors, setHasErrors]);

	const handleFieldUpdate = useCallback(
		(fieldPath, value) => {
			setApplication(setNestedValue(application, fieldPath, value));
		},
		[application, setApplication]
	);

	const handleFileAction = useCallback(
		async (action, fieldPath, payload) => {
			const fieldName = fieldPath.split('.').pop();
			setUploading(true);
			try {
				if (action === 'upload') {
					const file = payload;
					if (!file) return;
					if (!file.type.match('application/pdf')) {
						showAlert('upload', 'type');
						return;
					}
					if (file.size > 25 * 1024 * 1024) {
						showAlert('upload', 'size');
						return;
					}
					const savedFileRef = await saveFile(UploadType.applicationAttachment, application.id, fieldName, file);
					const downloadLink = await getDownloadLinkForFile(savedFileRef);
					const newAttachmentData = { displayName: file.name, home: downloadLink, refLoc: savedFileRef, uploadedBy: 'applicant' };
					handleFieldUpdate(fieldPath, newAttachmentData);
					showAlert('upload', 'success');
				} else if (action === 'delete') {
					if (payload.refLoc) await deleteFile(payload.refLoc);
					else if (payload.requestID) await invalidateRequest(payload.requestID);
					handleFieldUpdate(fieldPath, blankAttachment);
					showAlert('upload', 'deleted');
				} else if (action === 'request') {
					handleFieldUpdate(fieldPath, payload);
					showAlert('upload', 'requested');
				}
			} catch (error) {
				handleError(error, `handleFileAction:${action}`);
			} finally {
				setUploading(false);
			}
		},
		[application.id, handleError, showAlert, handleFieldUpdate]
	);

	const handleAddArrayItem = useCallback(
		(arrayItemInput) => {
			const { arrayField } = sectionConfig;
			if (!arrayField) return;

			const isNewItemValid = arrayField.fields.every((field) => !field.required || arrayItemInput[field.name]);
			if (!isNewItemValid) {
				showAlert('validation', 'fields');
				return;
			}
			const currentArray = getNestedValue(application, `${sectionName}.${arrayField.name}`) || [];
			const newItem = arrayField.fields.length > 1 ? { ...arrayItemInput, id: uuidv4() } : arrayItemInput[arrayField.fields[0]?.name];
			setApplication(setNestedValue(application, `${sectionName}.${arrayField.name}`, [...currentArray, newItem]));
		},
		[sectionConfig, application, sectionName, setApplication, showAlert]
	);

	const handleRemoveArrayItem = useCallback(
		(indexToRemove) => {
			const { arrayField } = sectionConfig;
			if (!arrayField) return;
			const currentArray = getNestedValue(application, `${sectionName}.${arrayField.name}`) || [];
			setApplication(
				setNestedValue(
					application,
					`${sectionName}.${arrayField.name}`,
					currentArray.filter((_, i) => i !== indexToRemove)
				)
			);
		},
		[sectionConfig, application, sectionName, setApplication]
	);

	if (!sectionConfig) return <Typography color='error'>Config not found for: {sectionName}</Typography>;
	if (uploading) return <Loader />;

	const layout = sectionConfig.layout || {};
	const arrayData = sectionConfig.arrayField ? getNestedValue(application, `${sectionName}.${sectionConfig.arrayField.name}`) || [] : [];

	const hasRightContent = layout.fields === 'right' || layout.arrayForm === 'right' || layout.arrayList === 'right';

	const formFields = memoizedFields.map((field) => <DynamicField key={field.name} fieldConfig={field} application={application} onFieldUpdate={handleFieldUpdate} onErrorUpdate={handleErrorUpdate} sectionName={sectionName} forceValidate={submissionAttempted} onFileAction={handleFileAction} />);

	const arrayFormComponent = sectionConfig.arrayField ? <ArrayFieldForm arrayFieldConfig={sectionConfig.arrayField} onAdd={handleAddArrayItem} onFileAction={handleFileAction} /> : null;

	const arrayListComponent = sectionConfig.arrayField ? <ArrayFieldList arrayFieldConfig={sectionConfig.arrayField} arrayData={arrayData} onRemove={handleRemoveArrayItem} /> : null;

	return (
		<Box sx={{ p: 2 }}>
			<Box mb={3} borderBottom={1} borderColor='divider' pb={2}>
				<Typography variant='h5' component='h2'>
					{sectionConfig.intro.title}
				</Typography>
				<Typography variant='body1' color='text.secondary'>
					{sectionConfig.intro.description}
				</Typography>
			</Box>

			<Grid container spacing={4} justifyContent='center'>
				<Grid item xs={12} md={hasRightContent ? 6 : 12}>
					{layout.fields !== 'right' && formFields}
					{layout.arrayForm !== 'right' && arrayFormComponent}
					{layout.arrayList !== 'right' && arrayListComponent}
				</Grid>

				{hasRightContent && (
					<Grid item xs={12} md={6}>
						{layout.fields === 'right' && formFields}
						{layout.arrayForm === 'right' && arrayFormComponent}
						{layout.arrayList === 'right' && arrayListComponent}
					</Grid>
				)}
			</Grid>
		</Box>
	);
};

GenericFormPage.propTypes = {
	sectionName: PropTypes.string.isRequired,
	application: PropTypes.object.isRequired,
	setApplication: PropTypes.func.isRequired,
	setHasErrors: PropTypes.func.isRequired,
	submissionAttempted: PropTypes.bool.isRequired,
	onValidationSuccess: PropTypes.func,
	onValidationFailure: PropTypes.func,
	applicationType: PropTypes.string,
};

export default GenericFormPage;
