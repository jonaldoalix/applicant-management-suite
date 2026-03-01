import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UploadCenter from './UploadCenter';
import { saveFile, getRequestData, saveCollectionData, getDownloadLinkForFile, getApplication } from '../../config/data/firebase';
import { validateRequest, validatePin } from '../../config/Constants';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

// --- Mocks ---

jest.mock('../../config/data/firebase', () => ({
	saveFile: jest.fn(),
	getRequestData: jest.fn(),
	saveCollectionData: jest.fn(),
	getDownloadLinkForFile: jest.fn(),
	getApplication: jest.fn(),
}));

jest.mock('../../config/Constants', () => ({
	validateRequest: jest.fn(),
	validatePin: jest.fn(),
	LettersOfRecommendation: {
		'rec-letter': { name: 'Recommendation Letter', purpose: 'endorse the candidate' },
	},
}));

jest.mock('../../config/data/collections', () => ({
	UploadType: { applicationAttachment: 'applicationAttachment' },
	collections: { requests: 'requests', attachments: 'attachments' },
}));

jest.mock('react-router-dom', () => ({
	useParams: jest.fn(),
	useNavigate: jest.fn(),
}));

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

jest.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

jest.mock('../../components/loader/Loader', () => () => <div data-testid='loader'>Loader</div>);
jest.mock('../../components/footer/CopyrightFooter', () => () => <div data-testid='footer'>Footer</div>);

// FIX: Mock must return an object with the Named Export 'VisuallyHiddenInput'
jest.mock('../../components/visuallyHiddenInput/VisuallyHiddenInput', () => ({
	VisuallyHiddenInput: ({ onChange }) => <input data-testid='file-input' type='file' onChange={onChange} />,
}));

describe('UploadCenter Component', () => {
	const mockNavigate = jest.fn();
	const mockShowAlert = jest.fn();
	const mockToken = 'valid-token-123';
	const mockRequest = {
		id: 'req-1',
		applicationID: 'app-1',
		attachmentsID: 'att-1',
		attempts: 0,
		expiryDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
		completed: false,
		fromName: 'John Doe',
		attachmentType: 'rec-letter',
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useParams.mockReturnValue({ token: mockToken });
		useNavigate.mockReturnValue(mockNavigate);
		useTheme.mockReturnValue({ boxShadow: 'none' });
		const { useAlert } = require('../../context/AlertContext');
		useAlert.mockReturnValue({ showAlert: mockShowAlert });
		window.close = jest.fn();
		validatePin.mockResolvedValue(true);
	});

	test('renders Loader initially', async () => {
		validateRequest.mockReturnValue(new Promise(() => {}));
		render(<UploadCenter />);
		expect(screen.getByTestId('loader')).toBeInTheDocument();
	});

	test('renders error message when token is invalid', async () => {
		validateRequest.mockResolvedValue({ result: false });

		render(<UploadCenter />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(screen.getByText(/You've either attempted to upload too many times/i)).toBeInTheDocument();
	});

	test('renders error message when request is expired', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue({
			...mockRequest,
			expiryDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
		});

		render(<UploadCenter />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());
		expect(screen.getByText(/You've either attempted to upload too many times/i)).toBeInTheDocument();
	});

	test('renders upload form when token is valid', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue(mockRequest);

		render(<UploadCenter />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(screen.getByText('Upload Recommendation Letter for John Doe')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('123456')).toBeInTheDocument();
		expect(screen.getByText(/endorse the candidate/i)).toBeInTheDocument();
	});

	test('renders success message immediately if request is already completed', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue({ ...mockRequest, completed: true });

		render(<UploadCenter />);

		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		expect(screen.getByText(/Thank you for uploading/i)).toBeInTheDocument();
	});

	test('handles file upload success flow', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue(mockRequest);
		getApplication.mockResolvedValue({ attachments: 'att-1' });

		saveFile.mockResolvedValue('path/to/file.pdf');
		getDownloadLinkForFile.mockResolvedValue('http://download-link');

		render(<UploadCenter />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		// 1. Enter Pin
		const pinInput = screen.getByPlaceholderText('123456');
		fireEvent.change(pinInput, { target: { value: '123456' } });

		// 2. Upload File
		const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });
		const input = screen.getByTestId('file-input');

		Object.defineProperty(input, 'files', { value: [file] });
		fireEvent.change(input);

		await waitFor(() => expect(screen.getByText(/Thank you for uploading/i)).toBeInTheDocument());

		expect(saveCollectionData).toHaveBeenCalledWith('requests', 'req-1', expect.objectContaining({ attempts: 1 }));
	});

	test('alerts when file is not a PDF', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue(mockRequest);

		render(<UploadCenter />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });

		const file = new File(['content'], 'test.png', { type: 'image/png' });
		const input = screen.getByTestId('file-input');
		Object.defineProperty(input, 'files', { value: [file] });
		fireEvent.change(input);

		await waitFor(() => expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Please select a PDF file.', type: 'warning' }));
		expect(saveFile).not.toHaveBeenCalled();
	});

	test('alerts when file is too large (>25MB)', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue(mockRequest);

		render(<UploadCenter />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });

		const largeFile = new File([''], 'large.pdf', { type: 'application/pdf' });
		Object.defineProperty(largeFile, 'size', { value: 26 * 1024 * 1024 });

		const input = screen.getByTestId('file-input');
		Object.defineProperty(input, 'files', { value: [largeFile] });
		fireEvent.change(input);

		await waitFor(() => expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('File size exceeds the limit'), type: 'warning' })));
	});

	test('alerts on attachment ID mismatch', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue(mockRequest);
		getApplication.mockResolvedValue({ attachments: 'WRONG-ID' });

		render(<UploadCenter />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		fireEvent.change(screen.getByPlaceholderText('123456'), { target: { value: '123456' } });

		const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
		const input = screen.getByTestId('file-input');
		Object.defineProperty(input, 'files', { value: [file] });
		fireEvent.change(input);

		await waitFor(() => expect(mockShowAlert).toHaveBeenCalledWith({ message: 'Attachment ID mismatch. Please contact support.', type: 'error' }));
	});

	test('Navigation buttons work correctly on success screen', async () => {
		validateRequest.mockResolvedValue({ result: true, id: 'req-1' });
		getRequestData.mockResolvedValue({ ...mockRequest, completed: true });

		render(<UploadCenter />);
		await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

		fireEvent.click(screen.getByText('Home Page'));
		expect(mockNavigate).toHaveBeenCalled();

		fireEvent.click(screen.getByText('Leave'));
		expect(window.close).toHaveBeenCalled();
	});
});
