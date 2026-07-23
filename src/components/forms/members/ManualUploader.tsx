import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
	Autocomplete,
	Box,
	Button,
	CircularProgress,
	FormControl,
	MenuItem,
	Select,
	Stack,
	TextField,
	Typography,
} from '@mui/material';
import { useTheme } from '../../../context/ThemeContext';
import { useAlert } from '../../../context/AlertContext';
import { useTitle } from '../../../context/HelmetContext';
import {
	getRealTimeCollection,
	getApplicationsForApplicant,
	getCollectionData,
	saveFile,
	getDownloadLinkForFile,
	saveCollectionData,
	resolveApplicationCycleYear,
} from '../../../config/data/firebase';
import { collections, UploadType } from '../../../config/data/collections';
import { attachmentFields } from '../../../config/Constants';
import {
	adminToolPageSx,
	adminPageHeaderSx,
	adminPagePanelSx,
	getAdminPageTitleProps,
} from '../../../config/ui/adminPageStyles';
import {
	adminFormActionsSx,
	adminFormFilePreviewSx,
	adminFormInputSx,
	adminFormGridSx,
} from '../../../config/ui/adminFormStyles';
import { maybePromoteApplicationToCompleted } from '../../../config/data/applicationAttachments';
import { v4 as uuid } from 'uuid';
import AdminFormField from '../AdminFormField';
import Loader from '../../loader/Loader';
import { VisuallyHiddenInput } from '../../visuallyHiddenInput/VisuallyHiddenInput';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import IconButton from '@mui/material/IconButton';
import { useNavigate } from 'react-router-dom';

interface ApplicantOption {
	id: string;
	label: string;
}

interface ApplicationOption {
	id: string;
	label: string;
	type: string;
	status?: string;
	cycleYear: number | null;
}

interface AttachmentField {
	key: string;
	label: string;
	requiredBy: string[];
}

interface SelectedApplication {
	type: string;
	status?: string;
	attachments?: string;
	[key: string]: unknown;
}

interface FormData {
	applicantId: string;
	applicationId: string;
	attachmentType: string;
	file: File | null;
}

const emptyForm: FormData = {
	applicantId: '',
	applicationId: '',
	attachmentType: '',
	file: null,
};

const formatFileSize = (bytes: number) => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};


const ensureApplicationAttachmentsId = async (
	applicationId: string,
	application: Record<string, unknown>,
	applicantId: string,
): Promise<string> => {
	const existingId = typeof application.attachments === 'string' ? application.attachments.trim() : '';
	if (existingId) {
		const existing = await getCollectionData(existingId, collections.attachments, existingId);
		if (existing) return existingId;
	}

	const attachmentsId = uuid();
	const ownerId =
		(typeof application.completedBy === 'string' && application.completedBy) || applicantId;
	const created = await saveCollectionData(collections.attachments, attachmentsId, {
		attachmentsID: attachmentsId,
		completedBy: ownerId,
	});
	if (created === false) throw new Error('Could not create an attachment record for this application.');

	const linked = await saveCollectionData(collections.applications, applicationId, {
		attachments: attachmentsId,
	});
	if (linked === false) {
		throw new Error('Created attachment record, but could not link it to the application.');
	}

	return attachmentsId;
};

const ManualUploader: React.FC = () => {
	const navigate = useNavigate();
	const { darkMode, boxShadow } = useTheme();
	const { showAlert, handleError } = useAlert();
	const [allApplicants, setAllApplicants] = useState<ApplicantOption[]>([]);
	const [applicantApplications, setApplicantApplications] = useState<ApplicationOption[]>([]);
	const [selectedApplication, setSelectedApplication] = useState<SelectedApplication | null>(null);
	const [formData, setFormData] = useState<FormData>(emptyForm);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);

	useTitle({ title: 'Manual Uploader', appear: false });

	useEffect(() => {
		const unsub = getRealTimeCollection(collections.applicants, (raw: unknown) => {
			const data = raw as Record<string, unknown>[];
			const options = data.map((app) => ({ id: app.id as string, label: `${app.firstName} ${app.lastName}` }));
			setAllApplicants(options);
			setLoading(false);
		});
		return () => unsub();
	}, []);

	const attachmentOptions = useMemo(() => {
		if (!selectedApplication) return [];
		return (attachmentFields as unknown as AttachmentField[])
			.filter((field) => field.requiredBy.includes(selectedApplication.type))
			.map((field) => ({ value: field.key, label: field.label }));
	}, [selectedApplication]);

	const selectedApplicant = useMemo(
		() => allApplicants.find((applicant) => applicant.id === formData.applicantId) ?? null,
		[allApplicants, formData.applicantId],
	);

	const selectedApplicationOption = useMemo(
		() => applicantApplications.find((app) => app.id === formData.applicationId) ?? null,
		[applicantApplications, formData.applicationId],
	);

	const handleApplicantChange = useCallback(
		async (applicantId: string) => {
			setFormData({ applicantId, applicationId: '', attachmentType: '', file: null });
			setSelectedApplication(null);
			setApplicantApplications([]);

			if (!applicantId) return;

			try {
				const apps = await getApplicationsForApplicant(applicantId, null);
				const appOptions = (apps as Record<string, unknown>[]).map((app) => {
					const year = resolveApplicationCycleYear(app);
					const status = typeof app.status === 'string' ? app.status : '';
					const type = typeof app.type === 'string' ? app.type : 'Application';
					const statusSuffix = status ? ` — ${status}` : '';
					return {
						id: app.id as string,
						label: `${type}${year ? ` (${year})` : ''}${statusSuffix}`,
						type,
						status,
						cycleYear: year,
					};
				});
				setApplicantApplications(appOptions);
			} catch (error) {
				handleError(error, 'manual-upload-load-applications');
			}
		},
		[handleError],
	);

	const handleApplicationChange = useCallback(
		async (applicationId: string) => {
			setFormData((prev) => ({ ...prev, applicationId, attachmentType: '', file: null }));
			setSelectedApplication(null);

			if (!applicationId) return;

			try {
				const app = await getCollectionData(applicationId, collections.applications, applicationId);
				setSelectedApplication(app as SelectedApplication);
			} catch (error) {
				handleError(error, 'manual-upload-load-application');
			}
		},
		[handleError],
	);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const { applicantId, applicationId, attachmentType, file } = formData;

		if (!applicantId || !applicationId || !attachmentType || !file) {
			showAlert({ message: 'Please complete every field before uploading.', type: 'error' });
			return;
		}

		setSubmitting(true);
		try {
			const application = (await getCollectionData(applicationId, collections.applications, applicationId)) as Record<string, unknown> | null;
			if (!application) throw new Error('Could not load the selected application.');

			const attachmentsId = await ensureApplicationAttachmentsId(applicationId, application, applicantId);

			const savedFileRef = await saveFile(UploadType.applicationAttachment, applicationId, attachmentType, file);
			if (!savedFileRef) throw new Error('File upload failed. Please try again.');

			const downloadLink = await getDownloadLinkForFile(savedFileRef);
			if (!downloadLink) throw new Error('Could not generate a download link for the uploaded file.');

			const saved = await saveCollectionData(collections.attachments, attachmentsId, {
				[attachmentType]: {
					displayName: file.name,
					home: downloadLink,
					refLoc: savedFileRef,
					uploadedBy: 'admin',
				},
			});
			if (saved === false) throw new Error('File uploaded to storage, but attaching it to the application failed.');

			const promoted = await maybePromoteApplicationToCompleted(applicationId);

			showAlert({
				message: promoted
					? 'File uploaded and application marked completed!'
					: 'File uploaded and attached successfully!',
				type: 'success',
			});
			setFormData(emptyForm);
			setSelectedApplication(null);
			setApplicantApplications([]);
		} catch (error) {
			handleError(error, 'manual-upload-submit', true);
		} finally {
			setSubmitting(false);
		}
	};

	if (loading && allApplicants.length === 0) return <Loader />;

	const titleProps = getAdminPageTitleProps(darkMode);
	const applicationReady = Boolean(formData.applicationId && selectedApplication);
	const attachmentReady = applicationReady && attachmentOptions.length > 0;

	return (
		<Box sx={adminToolPageSx}>
			<Box sx={{ ...adminPageHeaderSx(boxShadow ?? ''), gap: 1.5 }}>
				<IconButton onClick={() => navigate(-1)} aria-label='Go back' sx={{ color: 'secondary.main' }}>
					<ArrowBackIcon />
				</IconButton>
				<Box sx={{ flex: 1, minWidth: 0 }}>
					<Typography component='h1' {...titleProps} sx={{ ...titleProps.sx, lineHeight: 1.2 }}>
						Manual Attachment Uploader
					</Typography>
					<Typography variant='body2' sx={{ color: 'text.secondary', mt: 0.5, display: { xs: 'none', sm: 'block' } }}>
						Upload documents on behalf of an applicant and attach them directly to their application.
					</Typography>
				</Box>
				<CloudUploadOutlinedIcon sx={{ color: 'secondary.main', fontSize: 32, opacity: 0.85, display: { xs: 'none', sm: 'block' } }} />
			</Box>

			<Box
				component='form'
				onSubmit={handleSubmit}
				noValidate
				sx={{
					...adminPagePanelSx(boxShadow ?? ''),
					p: { xs: 2, md: 2.5 },
					position: 'relative',
				}}>
				{submitting && (
					<Box
						sx={{
							position: 'absolute',
							inset: 0,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							bgcolor: 'rgba(0,0,0,0.35)',
							borderRadius: '12px',
							zIndex: 2,
						}}>
						<CircularProgress color='secondary' />
					</Box>
				)}

				<Box sx={adminFormGridSx}>
					<AdminFormField
						id='manual-upload-applicant'
						label='Applicant'
						required
						helperText='Search by first or last name.'>
						<Autocomplete
							id='manual-upload-applicant'
							options={allApplicants}
							value={selectedApplicant}
							onChange={(_event, option) => void handleApplicantChange(option?.id ?? '')}
							getOptionLabel={(option) => option.label}
							isOptionEqualToValue={(option, value) => option.id === value.id}
							fullWidth
							disabled={submitting}
							renderInput={(params) => (
								<TextField
									{...params}
									placeholder='Start typing a name…'
									sx={adminFormInputSx}
								/>
							)}
						/>
					</AdminFormField>

					<AdminFormField
						id='manual-upload-application'
						label='Application'
						required
						disabled={!formData.applicantId}
						helperText={
							!formData.applicantId
								? 'Select an applicant first.'
								: applicantApplications.length === 0
									? 'No applications found for this applicant.'
									: 'Choose the cycle and application type for this upload.'
						}>
						<Autocomplete
							id='manual-upload-application'
							options={applicantApplications}
							value={selectedApplicationOption}
							onChange={(_event, option) => void handleApplicationChange(option?.id ?? '')}
							getOptionLabel={(option) => option.label}
							isOptionEqualToValue={(option, value) => option.id === value.id}
							fullWidth
							disabled={!formData.applicantId || applicantApplications.length === 0 || submitting}
							renderInput={(params) => (
								<TextField
									{...params}
									placeholder={formData.applicantId ? 'Choose an application…' : 'Waiting for applicant'}
									sx={adminFormInputSx}
								/>
							)}
						/>
					</AdminFormField>

					<AdminFormField
						id='manual-upload-attachment-type'
						label='Attachment type'
						required
						disabled={!attachmentReady}
						helperText={
							!applicationReady
								? 'Select an application first.'
								: attachmentOptions.length === 0
									? 'No attachment slots are configured for this application type.'
									: 'Pick the document slot this file should fill.'
						}>
						<FormControl fullWidth disabled={!attachmentReady || submitting} sx={adminFormInputSx}>
							<Select
								id='manual-upload-attachment-type'
								displayEmpty
								value={formData.attachmentType}
								onChange={(event) =>
									setFormData((prev) => ({
										...prev,
										attachmentType: event.target.value,
										file: null,
									}))
								}
								renderValue={(selected) => {
									if (!selected) {
										return (
											<Typography component='span' sx={{ color: 'text.secondary' }}>
												Choose attachment type…
											</Typography>
										);
									}
									return attachmentOptions.find((option) => option.value === selected)?.label ?? selected;
								}}>
								{attachmentOptions.map((option) => (
									<MenuItem key={option.value} value={option.value}>
										{option.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</AdminFormField>

					<AdminFormField
						id='manual-upload-file'
						label='File to upload'
						required
						disabled={!formData.attachmentType}
						helperText={
							!formData.attachmentType
								? 'Choose an attachment type first.'
								: 'PDF is typical for committee documents.'
						}>
						<Stack spacing={1.5}>
							<Button
								component='label'
								variant='outlined'
								startIcon={<FileUploadOutlinedIcon />}
								fullWidth
								disabled={!formData.attachmentType || submitting}
								sx={{
									textTransform: 'none',
									py: 1.25,
									borderStyle: formData.file ? 'solid' : 'dashed',
									color: 'text.primary',
									borderColor: formData.file ? 'divider' : 'action.disabled',
								}}>
								{formData.file ? 'Change file' : 'Select file'}
								<VisuallyHiddenInput
									type='file'
									onChange={(event) => {
										const file = event.target.files?.[0] ?? null;
										setFormData((prev) => ({ ...prev, file }));
									}}
								/>
							</Button>
							{formData.file && (
								<Box sx={adminFormFilePreviewSx}>
									<InsertDriveFileOutlinedIcon sx={{ color: 'secondary.main', flexShrink: 0 }} />
									<Box sx={{ minWidth: 0, flex: 1 }}>
										<Typography variant='body2' noWrap sx={{ fontWeight: 600, color: 'text.primary' }}>
											{formData.file.name}
										</Typography>
										<Typography variant='caption' sx={{ color: 'text.secondary' }}>
											{formatFileSize(formData.file.size)}
										</Typography>
									</Box>
								</Box>
							)}
						</Stack>
					</AdminFormField>

					<Box sx={adminFormActionsSx}>
						<Button variant='outlined' onClick={() => navigate(-1)} disabled={submitting}>
							Cancel
						</Button>
						<Button type='submit' variant='contained' disabled={submitting}>
							Upload attachment
						</Button>
					</Box>
				</Box>
			</Box>
		</Box>
	);
};

export default ManualUploader;
