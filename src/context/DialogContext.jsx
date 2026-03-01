/**
 * DIALOG & MODAL CONTEXT
 * ---------------------------------------------------------------------------
 * This context provides a global "showDialog" function to render standardized
 * modals anywhere in the application.
 *
 * * ARCHITECTURE:
 * 1. DialogProvider: Renders a single MUI <Dialog> component at the root.
 * 2. Configuration: Reads UI templates from 'dialogConfig.js'.
 * 3. Dynamic Forms: Can render inputs (Text, Select, Switch) inside the dialog
 * and return the user's input via a callback.
 *
 * * USAGE:
 * const { showDialog } = useDialog();
 *
 * // Simple Confirmation
 * showDialog({
 * id: 'confirmAction',
 * callback: (confirmed) => { if (confirmed) doSomething(); }
 * });
 *
 * // Data Entry
 * showDialog({
 * id: 'changeAppStatus',
 * callback: (formData) => updateStatus(formData.status)
 * });
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, TextField, Select, MenuItem, FormControlLabel, Switch, Box, InputLabel, FormControl } from '@mui/material';

// Config
import { dialogConfig } from '../config/ui/dialogConfig';

const DialogContext = createContext();

export const DialogProvider = ({ children }) => {
	const [dialog, setDialog] = useState(null); // The active dialog configuration
	const [formData, setFormData] = useState({}); // Local state for inputs inside the dialog

	const handleClose = () => {
		setDialog(null);
		setFormData({});
	};

	/**
	 * Opens a dialog.
	 * @param {string} id - The key matching an entry in 'dialogConfig.js'.
	 * @param {function} [callback] - Function to run on close (returns true/false or form data).
	 * @param {object} [data] - Dynamic data to pass to the dialog (e.g., the item being edited).
	 * @param {string} [messageOverride] - Replace the default config message.
	 */
	const showDialog = useCallback(({ id, callback, data, messageOverride }) => {
		const dialogSettings = dialogConfig[id];
		if (!dialogSettings) {
			console.error(`Dialog with id '${id}' not found in dialogConfig.`);
			return;
		}

		// Merge dynamic inputs with default config inputs
		let inputs = data?.inputs || dialogSettings.inputs;

		// Initialize form state with default values
		if (inputs) {
			const initialFormData = inputs.reduce((acc, input) => {
				acc[input.name] = data?.[input.name] ?? input.defaultValue ?? (input.type === 'switch' ? false : '');
				return acc;
			}, {});
			setFormData(initialFormData);
		}

		setDialog({
			config: dialogSettings,
			callback,
			data: { ...data, inputs, component: data?.component || dialogSettings.component },
			messageOverride,
		});
	}, []);

	// --- Action Handlers ---

	const handleActionClick = (value) => {
		if (dialog.callback) {
			dialog.callback(value);
		}
		handleClose();
	};

	const handleFormSubmit = () => {
		if (dialog.callback) {
			dialog.callback(formData);
		}
		handleClose();
	};

	const handleInputChange = (event) => {
		const { name, value, type, checked } = event.target;
		setFormData((prev) => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value,
		}));
	};

	// --- Renderers ---

	const renderInputs = () => {
		const inputsToRender = dialog?.data?.inputs || dialog?.config?.inputs;
		if (!inputsToRender) return null;

		return inputsToRender.map((inputConfig) => {
			// Conditional Rendering: Check if field depends on current data
			if (inputConfig.condition) {
				if (typeof inputConfig.condition === 'function' && !inputConfig.condition(dialog.data)) {
					return null;
				}
			}

			switch (inputConfig.type) {
				case 'text':
					return <TextField key={inputConfig.name} name={inputConfig.name} label={inputConfig.label} value={formData[inputConfig.name] || ''} onChange={handleInputChange} fullWidth margin='dense' variant='outlined' multiline={!!inputConfig.multiline} rows={inputConfig.rows} />;
				case 'select':
					return (
						<FormControl key={inputConfig.name} fullWidth margin='dense'>
							<InputLabel>{inputConfig.label}</InputLabel>
							<Select name={inputConfig.name} value={formData[inputConfig.name] || ''} label={inputConfig.label} onChange={handleInputChange}>
								{inputConfig.options.map((option) => (
									<MenuItem key={option.value} value={option.value}>
										{option.label}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					);
				case 'switch':
					return <FormControlLabel key={inputConfig.name} control={<Switch name={inputConfig.name} checked={!!formData[inputConfig.name]} onChange={handleInputChange} />} label={inputConfig.label} />;
				default:
					return null;
			}
		});
	};

	const renderActions = () => {
		const inputsToRender = dialog?.data?.inputs || dialog?.config?.inputs;

		// Scenario A: Form Mode (Cancel / Submit)
		if (inputsToRender) {
			return (
				<>
					<Button onClick={() => handleActionClick(null)}>Cancel</Button>
					<Button onClick={handleFormSubmit} variant='contained'>
						{dialog.config.actionLabel || 'Submit'}
					</Button>
				</>
			);
		}

		// Scenario B: Custom Actions defined in Config (e.g. "Eligible", "Ineligible")
		if (dialog.config.actions) {
			return (
				<>
					<Button onClick={() => handleActionClick(null)}>Cancel</Button>
					{dialog.config.actions.map((action) => (
						<Button key={action.label} onClick={() => handleActionClick(action.value)} color={action.color || 'primary'}>
							{action.label}
						</Button>
					))}
				</>
			);
		}

		// Scenario C: Default Confirmation (Cancel / Confirm)
		return (
			<>
				<Button onClick={() => handleActionClick(null)}>Cancel</Button>
				<Button onClick={() => handleActionClick(true)} autoFocus>
					Confirm
				</Button>
			</>
		);
	};

	const contextValue = useMemo(() => ({ showDialog }), [showDialog]);

	return (
		<DialogContext.Provider value={contextValue}>
			{children}
			{dialog && (
				<Dialog open={true} onClose={() => handleActionClick(null)} fullWidth maxWidth={dialog.data?.maxWidth || 'sm'}>
					{dialog.data?.component ? (
						// Render Custom Component if provided (e.g. complex form)
						(() => {
							const Component = dialog.data.component;
							return <Component onSuccess={() => handleActionClick(true)} onClose={() => handleActionClick(null)} onCancel={() => handleActionClick(null)} {...dialog.data} />;
						})()
					) : (
						// Render Standard Dialog
						<>
							<DialogTitle>{dialog.data?.title || dialog.config.title}</DialogTitle>
							<DialogContent>
								<DialogContentText sx={{ mb: 2, color: 'text.active' }}>{dialog.messageOverride || dialog.config.message}</DialogContentText>
								<Box component='form' noValidate autoComplete='off'>
									{renderInputs()}
								</Box>
							</DialogContent>
							<DialogActions>{renderActions()}</DialogActions>
						</>
					)}
				</Dialog>
			)}
		</DialogContext.Provider>
	);
};

DialogProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

/**
 * Hook to use the Dialog System.
 */
export const useDialog = () => useContext(DialogContext);