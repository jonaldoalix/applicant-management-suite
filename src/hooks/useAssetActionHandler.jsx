/**
 * ASSET ACTION CONTROLLER HOOK
 * ---------------------------------------------------------------------------
 * This hook provides a unified handler for performing actions on data assets
 * (Applicants, Members, Applications). It powers the "Action Buttons" found
 * in tables and profile views.
 *
 * * CAPABILITIES:
 * 1. Navigation: Redirects to a generated path (e.g. 'View Profile').
 * 2. Execution: Runs a raw function (e.g. 'Delete Item').
 * 3. Dialogs: Opens complex modals (e.g. 'Change Email').
 *
 * * USAGE:
 * const handleAction = useAssetActionHandler();
 * handleAction({ navTo: (asset) => ({ path: '/edit/:id', params: { id: asset.id } }) }, user);
 */

import { useNavigate } from 'react-router-dom';

// Context & Utils
import { generatePath } from '../config/navigation/routeUtils';
import { useDialog } from '../context/DialogContext';
import { useAlert } from '../context/AlertContext';
import { changeUserEmail } from '../config/data/firebase';

/**
 * @param {string} errorContext - The logging context tag if an error occurs.
 */
export const useAssetActionHandler = (errorContext = 'updateLoginEmail') => {
	const navigate = useNavigate();
	const { showDialog } = useDialog();
	const { showAlert, handleError } = useAlert();

	/**
	 * Executes the requested action on the target asset.
	 * @param {object} action - The action configuration object.
	 * @param {function} [action.navTo] - Returns { path, params } for routing.
	 * @param {function} [action.onClick] - Direct function to execute.
	 * @param {string} [action.dialogId] - ID of a dialog to open (e.g. 'changeLoginEmail').
	 * @param {object} asset - The data object (User, Application) being acted upon.
	 */
	const handleAction = async (action, asset) => {
		// --- 1. Navigation Actions ---
		if (action.navTo) {
			const { path, params } = action.navTo(asset);
			navigate(generatePath(path, params));
			return;
		}

		// --- 2. Direct Execution Actions ---
		if (action.onClick) {
			action.onClick();
			return;
		}

		// --- 3. Dialog Actions ---
		const dialogId = action.dialogId;

		// Specialized Logic: Change Login Email
		// This requires a specific Cloud Function call via 'changeUserEmail'
		if (dialogId === 'changeLoginEmail') {
			showDialog({
				id: 'changeLoginEmail',
				callback: async (result) => {
					if (result?.newEmail) {
						try {
							await changeUserEmail({ uid: asset.id, newEmail: result.newEmail.trim() });
							showAlert({ message: 'Login email updated successfully!', type: 'success' });
						} catch (error) {
							handleError(error, errorContext);
						}
					}
				},
			});
		} else if (dialogId) {
			// Fallback: If a dialog ID is provided but not handled specifically here,
			// it usually means it's handled genericly or missing implementation.
			console.error(`No specific handler defined in useAssetActionHandler for ID: ${dialogId}`);
		}
	};

	return handleAction;
};