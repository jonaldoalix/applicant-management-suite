import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManualUploader from './ManualUploader';
import { useTheme } from '../../../context/ThemeContext';
import { useAlert } from '../../../context/AlertContext';
import * as firebaseConfig from '../../../config/data/firebase';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
	useNavigate: () => mockNavigate,
}));

jest.mock('../../../context/ThemeContext', () => ({ useTheme: jest.fn() }));
jest.mock('../../../context/AlertContext', () => ({ useAlert: jest.fn() }));
jest.mock('../../../context/HelmetContext', () => ({ useTitle: jest.fn() }));

jest.mock('../../../config/data/firebase', () => ({
	__esModule: true,
	getRealTimeCollection: jest.fn(),
	getApplicationsForApplicant: jest.fn(),
	getCollectionData: jest.fn(),
	saveFile: jest.fn(),
	getDownloadLinkForFile: jest.fn(),
	saveCollectionData: jest.fn(),
}));

jest.mock('../GenericAdminForm', () => ({ onSubmit }) => (
	<div data-testid='admin-form'>
		<button
			onClick={() =>
				onSubmit({
					applicantId: 'app1',
					applicationId: 'appl1',
					attachmentType: 'transcript',
					file: { name: 'test.pdf' },
				})
			}>
			Submit Mock
		</button>
	</div>
));

jest.mock('../../loader/Loader', () => () => <div>Loading...</div>);

describe('ManualUploader Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
		const { useAlert } = require('../../../context/AlertContext');
		useAlert.mockReturnValue({ showAlert: jest.fn(), handleError: jest.fn() });
		const { useTitle } = require('../../../context/HelmetContext');
		useTitle.mockImplementation(() => {});

		firebaseConfig.getRealTimeCollection.mockImplementation((col, callback) => {
			callback([{ id: 'app1', firstName: 'John', lastName: 'Doe' }]);
			return jest.fn();
		});
	});

	test('renders loader initially then form', async () => {
		render(<ManualUploader />);
		expect(screen.getByTestId('admin-form')).toBeInTheDocument();
		expect(screen.getByText('Upload Attachment')).toBeInTheDocument();
	});

	test('navigates back on close', () => {
		render(<ManualUploader />);

		// FIX: Find the button that contains the ArrowBackIcon
		const backIcon = screen.getByTestId('ArrowBackIcon');
		const backBtn = backIcon.closest('button');

		fireEvent.click(backBtn);
		expect(mockNavigate).toHaveBeenCalledWith(-1);
	});

	test('submits form data successfully', async () => {
		firebaseConfig.getCollectionData.mockResolvedValue({
			id: 'appl1',
			type: 'Scholarship',
			attachments: 'att1',
		});

		render(<ManualUploader />);

		const submitBtn = screen.getByText('Submit Mock');
		fireEvent.click(submitBtn);

		await waitFor(() => {
			expect(firebaseConfig.saveFile).toHaveBeenCalled();
			expect(firebaseConfig.saveCollectionData).toHaveBeenCalledWith(expect.anything(), 'att1', expect.objectContaining({ transcript: expect.anything() }));
		});
	});
});
