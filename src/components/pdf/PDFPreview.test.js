import React from 'react';
import { render, screen, act } from '@testing-library/react';
import PDFPreview from './PDFPreview';

// Mock URL.revokeObjectURL globally
global.URL.revokeObjectURL = jest.fn();

describe('PDFPreview Component', () => {
	const mockPages = ['img1.jpg', 'img2.jpg'];

	test('renders loading state initially', () => {
		// Render with empty pages initially implies loading in many contexts,
		// but component logic says if pages is passed, loading becomes false via useEffect.
		// To capture loading, we might need to delay the prop update or just check structure.
		// Actually, the component sets loading=true, then useEffect sets it to false if pages exist.

		// We can render with null pages first
		render(<PDFPreview displayName='Test PDF' pages={null} />);
		expect(screen.getByText('Loading Test PDF...')).toBeInTheDocument();
	});

	test('renders images when pages are provided', () => {
		render(<PDFPreview displayName='Test PDF' pages={mockPages} />);

		expect(screen.getByText('Test PDF')).toBeInTheDocument();
		expect(screen.getAllByRole('img')).toHaveLength(2);
		expect(screen.getByAltText('Test PDF - Page 1')).toHaveAttribute('src', 'img1.jpg');
	});

	test('cleans up blob URLs on unmount', () => {
		const blobPages = ['blob:http://localhost/123', 'http://normal-url.com'];
		const { unmount } = render(<PDFPreview displayName='Test' pages={blobPages} />);

		unmount();

		expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/123');
		expect(global.URL.revokeObjectURL).not.toHaveBeenCalledWith('http://normal-url.com');
	});
});
