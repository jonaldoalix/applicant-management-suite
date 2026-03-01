import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import AttachmentViewer from './AttachmentViewer';
import { getCollectionData } from '../../config/data/firebase';
import { getBlob } from 'firebase/storage';
import { createBlobUrl } from '../../config/Constants';

// Mock Dependencies
jest.mock('../../config/data/firebase', () => ({
	getCollectionData: jest.fn(),
	storage: { app: 'mock-storage' },
}));
jest.mock('firebase/storage', () => ({
	ref: jest.fn(),
	getBlob: jest.fn(),
}));
jest.mock('../../config/Constants', () => ({
	convertPDFBlobToImages: jest.fn(),
	createBlobUrl: jest.fn(),
}));
jest.mock('../../config/data/collections', () => ({
	collections: {
		attachments: 'attachments',
	},
}));

describe('AttachmentViewer Component', () => {
	const mockApplication = { attachments: 'attach_id_123', completedBy: 'user_123' };
	const mockPdfBlob = new Blob(['pdf-content'], { type: 'application/pdf' });
	const mockImgBlob = new Blob(['img-content'], { type: 'image/png' });

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders a loading state initially', () => {
		getCollectionData.mockReturnValue(new Promise(() => {}));
		render(<AttachmentViewer application={mockApplication} />);
		expect(screen.getByRole('progressbar')).toBeInTheDocument();
	});

	it('renders an error message on fetch failure', async () => {
		getCollectionData.mockRejectedValue(new Error('Failed to fetch'));
		render(<AttachmentViewer application={mockApplication} />);
		expect(await screen.findByText('Failed to load attachment data.')).toBeInTheDocument();
	});

	it('fetches, processes, and renders an image attachment', async () => {
		const mockAttachmentData = {
			transcript: { refLoc: 'path/to/image.png', displayName: 'Transcript.png' },
		};
		getCollectionData.mockResolvedValue(mockAttachmentData);
		getBlob.mockResolvedValue(mockImgBlob);

        createBlobUrl.mockReturnValue('blob-image-url.jpg');

		render(<AttachmentViewer application={mockApplication} />);

		// Wait for the text to appear
		expect(await screen.findByText('Transcript.png')).toBeInTheDocument();

		// --- THIS IS THE FIX ---
		// Wait *for the assertion itself* to pass
		await waitFor(() => {
			expect(screen.getByAltText('Transcript.png - Page 1')).toHaveAttribute('src', 'blob-image-url.jpg');
		});

		// Now we can safely check other conditions
		expect(createBlobUrl).toHaveBeenCalledWith(mockImgBlob);
        expect(screen.getAllByRole('img')).toHaveLength(1);
	});
});
