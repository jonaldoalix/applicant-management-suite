import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RequestForm } from './Requests';
import { useAlert } from '../../../context/AlertContext';
import { useConfig } from '../../../context/ConfigContext';
import { getCollectionData, saveCollectionData, getRealTimeApplications } from '../../../config/data/firebase';

jest.mock('../../../context/AlertContext', () => ({ useAlert: jest.fn() }));
jest.mock('../../../context/ConfigContext', () => ({ useConfig: jest.fn() }));
jest.mock('../../../config/data/firebase', () => ({
	getCollectionData: jest.fn(),
	saveCollectionData: jest.fn(),
	getRealTimeApplications: jest.fn(),
}));

jest.mock('../GenericAdminForm', () => ({ onSubmit }) => <button onClick={() => onSubmit({ applicationID: 'app1', attachmentType: 'letter' })}>Submit Request</button>);

describe('RequestForm Component', () => {
	const mockAlert = { showAlert: jest.fn(), handleError: jest.fn() };

	beforeEach(() => {
		jest.clearAllMocks();
		useAlert.mockReturnValue(mockAlert);
		useConfig.mockReturnValue({ APPLICATION_DEADLINE: '2025-01-01' });

		getRealTimeApplications.mockImplementation((_, callback) => {
			callback([{ id: 'app1', completedBy: 'user1', type: 'Scholarship', window: '2025' }]);
			return jest.fn();
		});
	});

	test('initializes and renders form', async () => {
		render(<RequestForm />);

		// Wait for useEffects
		await waitFor(() => {
			expect(screen.getByText('Submit Request')).toBeInTheDocument();
		});
	});

	test('submits request successfully', async () => {
		getCollectionData.mockImplementation((id, col) => {
			if (col === 'applications') return { completedBy: 'user1', attachments: 'att1' };
			if (col === 'applicants') return { firstName: 'John', lastName: 'Doe' };
			if (col === 'attachments') return {}; // empty attachments doc
			return {};
		});

		render(<RequestForm />);

		const btn = screen.getByText('Submit Request');
		fireEvent.click(btn);

		await waitFor(() => {
			expect(saveCollectionData).toHaveBeenCalledTimes(2); // Attachments + Requests
			expect(mockAlert.showAlert).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
		});
	});
});
