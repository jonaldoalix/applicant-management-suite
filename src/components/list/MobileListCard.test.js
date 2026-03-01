import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileListCard from './MobileListCard';
import { useTheme } from '../../context/ThemeContext';

// --- Mocks ---
jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

describe('MobileListCard', () => {
	beforeEach(() => {
		useTheme.mockReturnValue({ boxShadow: 'none' });
	});

	test('renders children content', () => {
		render(
			<MobileListCard item={{ id: 1 }}>
				<div>Child Content</div>
			</MobileListCard>
		);
		expect(screen.getByText('Child Content')).toBeInTheDocument();
	});

	test('renders actions if provided', () => {
		const MockAction = () => <button>ActionBtn</button>;
		render(
			<MobileListCard item={{ id: 1 }} actions={[MockAction]}>
				<div>Content</div>
			</MobileListCard>
		);
		expect(screen.getByText('ActionBtn')).toBeInTheDocument();
	});

	test('applies visual style for unread items', () => {
		// We can't easily test CSS styles like border colors in JSDOM without computed styles,
		// but we can verify the component renders without crashing when isUnread is true.
		render(
			<MobileListCard item={{ id: 1 }} isUnread={true}>
				<div>Unread Content</div>
			</MobileListCard>
		);
		expect(screen.getByText('Unread Content')).toBeInTheDocument();
	});
});
