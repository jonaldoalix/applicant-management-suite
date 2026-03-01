/**
 * Member Admin Form
 * used to Add or Edit internal team members.
 * Handles:
 * - Creating new Firebase Auth users (if adding).
 * - Updating Firestore profiles.
 * - Managing Permissions and Profile Pictures.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuid } from 'uuid';

// Context & Hooks
import { useAuth } from '../../../context/AuthContext';
import { useAlert } from '../../../context/AlertContext';

// Config & Firebase
import { saveCollectionData, saveFile, getDownloadLinkForFile, registerUser } from '../../../config/data/firebase';
import { UploadType, collections } from '../../../config/data/collections';
import { memberFormConfig } from '../../../config/ui/formConfig';

// Components
import Loader from '../../loader/Loader';
import GenericAdminForm from '../GenericAdminForm';

const defaultPermissions = {
	admin: false,
	email: false,
	push: false,
	message: false,
	site: false,
	finances: false,
	applications: false,
	members: false,
	audit: false,
	archives: false,
	login: false,
	interviews: { canHost: false, canAccess: false, canSchedule: false },
};

export const MemberForm = ({ member }) => {
	// Initial state setup with default permissions structure
	const [initialData, setInitialData] = useState({
		id: uuid(),
		picture: {},
		permissions: defaultPermissions,
	});

	const [uploading, setUploading] = useState(false);
	const { member: currentUser } = useAuth();
	const { showAlert, handleError } = useAlert();

	// Initialization Effect: Merged logic for data setup and picture normalization
	useEffect(() => {
		if (member) {
			let normalizedPicture = member.picture;

			// Handle legacy data where picture might be a simple string URL
			if (typeof member.picture === 'string') {
				normalizedPicture = {
					home: member.picture,
					displayName: 'Current Profile Picture',
					refLoc: '',
				};
			}

			setInitialData({
				...member,
				id: member.id || uuid(),
				picture: normalizedPicture || {},
				permissions: member.permissions || defaultPermissions,
			});
		}
	}, [member]);

	const handleFileUpload = async (action, fieldPath, file) => {
		if (action !== 'upload' || !file) return;

		setUploading(true);
		try {
			const savedFile = await saveFile(UploadType.memberAvatar, initialData.id, file.name, file);
			const returnedLink = await getDownloadLinkForFile(savedFile);

			if (returnedLink) {
				const newPictureData = {
					displayName: file.name,
					home: returnedLink,
					refLoc: savedFile,
				};
				setInitialData((prev) => ({ ...prev, picture: newPictureData }));
				showAlert({ message: 'Picture uploaded successfully.', type: 'success' });
			} else {
				throw new Error('Failed to get the download link.');
			}
		} catch (error) {
			handleError(error, 'member-upload-picture');
		} finally {
			setUploading(false);
		}
	};

	const handleSubmit = async (formData) => {
		try {
			const dataToSave = { ...initialData, ...formData };

			if (member) {
				// Update Existing Member
				await saveCollectionData(collections.members, dataToSave.id, dataToSave);
				showAlert({ message: 'Member updated successfully.', type: 'success' });
			} else {
				// Create New Member (Auth + Firestore)
				// Note: 'registerUser' creates the Auth record. We use that UID for the Firestore doc.
				const result = await registerUser(dataToSave.email, 'DefaultPassword123!');
				const authID = result.user.uid;

				await saveCollectionData(collections.members, authID, {
					...dataToSave,
					id: authID,
					auth: authID,
				});
				showAlert({ message: 'New member registered successfully.', type: 'success' });
			}
		} catch (error) {
			handleError(error, 'member-form-submit');
		}
	};

	if (uploading) return <Loader />;

	return <GenericAdminForm formConfig={{ ...memberFormConfig, name: 'member' }} initialData={initialData} onSubmit={handleSubmit} onFileUpload={handleFileUpload} permissions={currentUser?.permissions} />;
};

MemberForm.propTypes = {
	member: PropTypes.object,
};
