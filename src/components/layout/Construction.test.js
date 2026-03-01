import React from 'react';
import { render, screen } from '@testing-library/react';
import Construction from './Construction';

// --- Mocks ---
jest.mock('lottie-react', () => {
	return function MockLottie() {
		return <div data-testid='lottie-animation'>Under Construction Animation</div>;
	};
});

jest.mock('../../config/Constants', () => ({
	Assets: { underContructionLottie: 'mock-data' },
}));

describe('Construction Component', () => {
	test('renders the lottie animation', () => {
		render(<Construction />);
		expect(screen.getByTestId('lottie-animation')).toBeInTheDocument();
	});
});
