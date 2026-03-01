import { renderHook, waitFor } from '@testing-library/react';
import { useProcessedEmailContent } from './useProcessedEmailContent';
import { fetchAttachmentContent } from '../config/data/firebase';

// Mock the specific export explicitly
jest.mock('../config/data/firebase', () => ({
	fetchAttachmentContent: jest.fn(),
}));

describe('useProcessedEmailContent', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('returns empty string if email has no content', () => {
		const { result } = renderHook(() => useProcessedEmailContent(null));
		expect(result.current.processedContent).toBe('');
		expect(result.current.contentLoading).toBe(false);
	});

	test('returns original content if no inline attachments', () => {
		const email = { content: '<p>Hello</p>', inlineAttachments: [] };
		const { result } = renderHook(() => useProcessedEmailContent(email));

		expect(result.current.processedContent).toBe('<p>Hello</p>');
		expect(result.current.contentLoading).toBe(false);
	});

	test('replaces CID tags with fetched base64 data', async () => {
		const email = {
			id: 'msg123',
			folderId: 'inbox',
			// UPDATED: Your code's regex expects 'cid=', so we match that format here
			content: '<img src="https://example.com/proxy?cid=image1" />',
			inlineAttachments: [{ cid: '<image1>', attachmentId: 'att1' }],
		};

		// Mock successful fetch
		fetchAttachmentContent.mockResolvedValue({
			data: { contentType: 'image/png', content: 'base64data' },
		});

		const { result } = renderHook(() => useProcessedEmailContent(email));

		// Initially loading
		expect(result.current.contentLoading).toBe(true);

		// Wait for async effect to finish
		await waitFor(() => {
			expect(result.current.contentLoading).toBe(false);
		});

		// Check if URL was replaced
		expect(result.current.processedContent).toContain('src="data:image/png;base64,base64data"');
	});

	test('handles fetch errors gracefully', async () => {
		const email = {
			id: 'msg123',
			// UPDATED: Matching code expectation
			content: '<img src="https://example.com/proxy?cid=image1" />',
			inlineAttachments: [{ cid: 'image1', attachmentId: 'att1' }],
		};

		// Mock error
		fetchAttachmentContent.mockRejectedValue(new Error('Network Error'));
		const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

		const { result } = renderHook(() => useProcessedEmailContent(email));

		await waitFor(() => {
			expect(result.current.contentLoading).toBe(false);
		});

		// Content should remain unchanged (still has cid=image1)
		expect(result.current.processedContent).toContain('cid=image1');
		consoleSpy.mockRestore();
	});
});
