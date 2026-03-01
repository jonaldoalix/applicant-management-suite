import React from 'react';
import { render, screen } from '@testing-library/react';
import InterviewLayout from './InterviewLayout';

// --- Mocks ---
jest.mock('../../context/MeetingContext', () => ({
	MeetingProvider: ({ children }) => <div data-testid='meeting-provider'>{children}</div>,
}));

describe('InterviewLayout Component', () => {
	test('wraps children in MeetingProvider', () => {
		render(
			<InterviewLayout>
				<div>Interview Content</div>
			</InterviewLayout>
		);

		expect(screen.getByTestId('meeting-provider')).toBeInTheDocument();
		expect(screen.getByText('Interview Content')).toBeInTheDocument();
	});
});
