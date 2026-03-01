import React from 'react';
import { render, screen } from '@testing-library/react';
import EmailBody from './EmailBody';
import { useProcessedEmailContent } from '../../hooks/useProcessedEmailContent';

// Mock the hook
jest.mock('../../hooks/useProcessedEmailContent');

const mockEmail = {
	id: 'email123',
	folderId: 'folder1',
	content: '<p>Hello</p>',
	inlineAttachments: [],
};

const mockProps = {
	email: mockEmail,
	darkMode: false,
	cardStyles: {},
	cardContentStyles: {},
};

describe('EmailBody', () => {
	it('shows loading spinner when content is loading', () => {
		useProcessedEmailContent.mockReturnValue({
			processedContent: '',
			contentLoading: true,
		});

		render(<EmailBody {...mockProps} />);
		expect(screen.getByRole('progressbar')).toBeInTheDocument();
		expect(screen.getByText('Loading email content...')).toBeInTheDocument();
	});

	it('renders processed HTML content when loading is complete', () => {
		useProcessedEmailContent.mockReturnValue({
			processedContent: '<div>Processed HTML Content</div>',
			contentLoading: false,
		});

		render(<EmailBody {...mockProps} />);
		expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
		expect(screen.getByText('Processed HTML Content')).toBeInTheDocument();
	});
});
