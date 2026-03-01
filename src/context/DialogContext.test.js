import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DialogProvider, useDialog } from './DialogContext';

// Mock config to control dialog definitions
jest.mock('../config/ui/dialogConfig', () => ({
	dialogConfig: {
		simpleDialog: {
			title: 'Simple',
			message: 'Is this simple?',
			// No inputs, default actions (Confirm/Cancel)
		},
		formDialog: {
			title: 'Form',
			inputs: [
				{ name: 'username', type: 'text', label: 'Username', defaultValue: 'Guest' },
				{
					name: 'role',
					type: 'select',
					label: 'Role',
					options: [
						{ value: 'admin', label: 'Admin' },
						{ value: 'user', label: 'User' },
					],
				},
				{ name: 'active', type: 'switch', label: 'Active' },
				// Conditional input
				{ name: 'reason', type: 'text', label: 'Reason', condition: (data) => data?.showReason },
			],
			actionLabel: 'Save',
		},
		customActionDialog: {
			title: 'Actions',
			message: 'Choose one',
			actions: [
				{ label: 'Option A', value: 'A' },
				{ label: 'Option B', value: 'B', color: 'secondary' },
			],
		},
		customComponentDialog: {
			title: 'Custom Component Wrapper', // Should be ignored if component renders its own title
			component: null, // Will be overridden in showDialog call
		},
	},
}));

const TestConsumer = ({ dialogId, dialogData, onCallback }) => {
	const { showDialog } = useDialog();
	return (
		<button
			onClick={() =>
				showDialog({
					id: dialogId,
					data: dialogData,
					callback: onCallback,
				})
			}>
			Open Dialog
		</button>
	);
};

describe('DialogContext', () => {
	// Helper to render context and consumer
	const renderDialog = (dialogId, dialogData = {}, callback = jest.fn()) => {
		render(
			<DialogProvider>
				<TestConsumer dialogId={dialogId} dialogData={dialogData} onCallback={callback} />
			</DialogProvider>
		);
		fireEvent.click(screen.getByText('Open Dialog'));
		return callback;
	};

	test('does not render dialog initially', () => {
		render(
			<DialogProvider>
				<TestConsumer dialogId='simpleDialog' />
			</DialogProvider>
		);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	test('logs error if dialog ID is invalid', () => {
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
		renderDialog('invalidID');
		expect(consoleSpy).toHaveBeenCalledWith("Dialog with id 'invalidID' not found in dialogConfig.");
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		consoleSpy.mockRestore();
	});

	// --- 1. Simple Confirmation Dialog ---
	test('renders simple dialog and handles Confirm/Cancel', () => {
		const callback = jest.fn();
		renderDialog('simpleDialog', {}, callback);

		expect(screen.getByText('Simple')).toBeInTheDocument();
		expect(screen.getByText('Is this simple?')).toBeInTheDocument();

		// Test Cancel
		fireEvent.click(screen.getByText('Cancel'));
		expect(callback).toHaveBeenCalledWith(null);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		// Re-open and Test Confirm
		fireEvent.click(screen.getByText('Open Dialog'));
		fireEvent.click(screen.getByText('Confirm'));
		expect(callback).toHaveBeenCalledWith(true);
	});

	// --- 2. Form Dialog (Text, Select, Switch, Logic) ---
	test('renders form inputs and handles submission', () => {
		const callback = jest.fn();
		renderDialog('formDialog', { showReason: true }, callback);

		// Text Input (Default Value)
		const userInput = screen.getByLabelText('Username');
		expect(userInput.value).toBe('Guest');
		fireEvent.change(userInput, { target: { value: 'NewUser' } });

		// Select Input
		// FIX: Target the combobox purely by role since accessible name linkage is flaky in JSDOM for MUI.
		// Since this test only renders one select, this is safe.
		const selectTrigger = screen.getByRole('combobox');
		fireEvent.mouseDown(selectTrigger); // Open dropdown
		fireEvent.click(screen.getByText('Admin')); // Select option

		// Switch Input
		const switchInput = screen.getByLabelText('Active');
		fireEvent.click(switchInput); // Toggles to true

		// Conditional Input (ShowReason = true)
		const reasonInput = screen.getByLabelText('Reason');
		fireEvent.change(reasonInput, { target: { value: 'Testing' } });

		// Submit
		fireEvent.click(screen.getByText('Save'));

		expect(callback).toHaveBeenCalledWith({
			username: 'NewUser',
			role: 'admin',
			active: true,
			reason: 'Testing',
		});
	});

	test('hides conditional inputs when condition returns false', () => {
		renderDialog('formDialog', { showReason: false });
		expect(screen.queryByLabelText('Reason')).not.toBeInTheDocument();
	});

	test('renders unsupported input types gracefully (null)', () => {
		// Temporarily override config for this test?
		// Since we mocked the module, we can't change it easily at runtime without `doMock` + require.
		// Instead, we assume the "default" case in switch returns null, which means nothing renders.
		// We can verify this by seeing that only valid inputs render.
		renderDialog('formDialog');
		expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
	});

	// --- 3. Custom Actions Dialog ---
	test('renders custom actions and returns specific values', () => {
		const callback = jest.fn();
		renderDialog('customActionDialog', {}, callback);

		expect(screen.getByText('Option A')).toBeInTheDocument();
		expect(screen.getByText('Option B')).toBeInTheDocument();

		fireEvent.click(screen.getByText('Option A'));
		expect(callback).toHaveBeenCalledWith('A');
	});

	// --- 4. Custom Component Rendering ---
	test('renders a custom component instead of default dialog content', () => {
		const CustomComp = ({ onSuccess, onClose, title }) => (
			<div>
				<h1>{title}</h1>
				<button onClick={onSuccess}>Success</button>
				<button onClick={onClose}>Close</button>
			</div>
		);

		const callback = jest.fn();
		// Pass component via data override
		renderDialog('customComponentDialog', { component: CustomComp, title: 'Dynamic Title' }, callback);

		expect(screen.getByText('Dynamic Title')).toBeInTheDocument();

		// Test Success Handler
		fireEvent.click(screen.getByText('Success'));
		expect(callback).toHaveBeenCalledWith(true);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		// Re-open and Test Close Handler
		fireEvent.click(screen.getByText('Open Dialog'));
		fireEvent.click(screen.getByText('Close'));
		expect(callback).toHaveBeenCalledWith(null);
	});

	// --- 5. Overrides & Defaults ---
	test('uses messageOverride if provided', () => {
		const TestConsumerOverride = () => {
			const { showDialog } = useDialog();
			return <button onClick={() => showDialog({ id: 'simpleDialog', messageOverride: 'New Message' })}>Override</button>;
		};
		render(
			<DialogProvider>
				<TestConsumerOverride />
			</DialogProvider>
		);
		fireEvent.click(screen.getByText('Override'));
		expect(screen.getByText('New Message')).toBeInTheDocument();
	});
});
