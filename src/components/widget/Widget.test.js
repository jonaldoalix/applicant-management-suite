import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom'; // Use MemoryRouter to wrap
import Widget from './Widget';
import { useTheme } from '../../context/ThemeContext';

// Mock Dependencies
jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

// Mock a simple icon
const MockIcon = () => <div data-testid='mock-icon' />;

describe('Widget Component', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
	});

	const requiredProps = {
		title: 'Test Widget',
		linkText: 'See all',
		link: '/test-link',
		IconComponent: MockIcon,
		color: 'blue',
	};

	it('renders with default "N/A" data if info prop is missing', () => {
		render(
			<MemoryRouter>
				<Widget {...requiredProps} />
			</MemoryRouter>
		);

		expect(screen.getByText('Test Widget')).toBeInTheDocument();
		expect(screen.getByText('N/A')).toBeInTheDocument(); // Default amount
		expect(screen.getByText('-')).toBeInTheDocument(); // Default percent
	});

	it('renders provided info and link', () => {
		const info = { amount: 123, percent: 10, gain: true };
		render(
			<MemoryRouter>
				<Widget {...requiredProps} info={info} />
			</MemoryRouter>
		);

		expect(screen.getByText('123')).toBeInTheDocument();
		expect(screen.getByText('10%')).toBeInTheDocument();

		const link = screen.getByRole('link', { name: 'See all' });
		expect(link).toHaveAttribute('href', '/test-link');
	});

	it('formats amount as money if isMoney is true', () => {
		const info = { amount: 123, percent: 10, gain: true };
		render(
			<MemoryRouter>
				<Widget {...requiredProps} info={info} isMoney={true} />
			</MemoryRouter>
		);

		expect(screen.getByText('$123')).toBeInTheDocument();
	});

	it('shows ArrowUp icon when gain is true', () => {
		const info = { amount: 123, percent: 10, gain: true };
		render(
			<MemoryRouter>
				<Widget {...requiredProps} info={info} />
			</MemoryRouter>
		);

		// The icon is inside the "10%" button
		const gainBox = screen.getByText('10%').closest('div');
		expect(gainBox.querySelector('svg[data-testid="KeyboardArrowUpIcon"]')).toBeInTheDocument();
		expect(gainBox.querySelector('svg[data-testid="KeyboardArrowDownIcon"]')).not.toBeInTheDocument();
	});

	it('shows ArrowDown icon when gain is false', () => {
		const info = { amount: 123, percent: 10, gain: false };
		render(
			<MemoryRouter>
				<Widget {...requiredProps} info={info} />
			</MemoryRouter>
		);

		const lossBox = screen.getByText('10%').closest('div');
		expect(lossBox.querySelector('svg[data-testid="KeyboardArrowDownIcon"]')).toBeInTheDocument();
		expect(lossBox.querySelector('svg[data-testid="KeyboardArrowUpIcon"]')).not.toBeInTheDocument();
	});

	it('renders the custom IconComponent', () => {
		render(
			<MemoryRouter>
				<Widget {...requiredProps} />
			</MemoryRouter>
		);
		expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
	});
});
