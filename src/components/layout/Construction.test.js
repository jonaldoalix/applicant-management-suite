import React from 'react';
import { render, screen } from '@testing-library/react';
import Construction from './Construction';

// --- Mocks ---
vi.mock('lottie-react', () => ({
	default: function MockLottie() {
		return <div data-testid='lottie-animation'>Under Construction Animation</div>;
	},
}));

vi.mock('../../config/Constants', () => ({
	Assets: { underContructionLottie: 'mock-data' },
}));

describe('Construction Component', () => {
	test('renders the lottie animation', () => {
		render(<Construction />);
		expect(screen.getByTestId('lottie-animation')).toBeInTheDocument();
	});
});
