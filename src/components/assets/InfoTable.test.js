import React from 'react';
import { render, screen } from '@testing-library/react';
import InfoTable from './InfoTable';
import { useTheme } from '../../context/ThemeContext';

jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

describe('InfoTable Component', () => {
	beforeEach(() => {
		useTheme.mockReturnValue({ darkMode: false });
	});

	test('renders nothing if data is empty or null', () => {
		const { container } = render(<InfoTable data={[]} />);
		expect(container).toBeEmptyDOMElement();

		const { container: containerNull } = render(<InfoTable data={null} />);
		expect(containerNull).toBeEmptyDOMElement();
	});

	test('renders valid data rows', () => {
		const testData = [
			{ label: 'Name', value: 'John' },
			{ label: 'Age', value: 30 },
		];
		render(<InfoTable data={testData} />);

		expect(screen.getByText('Name:')).toBeInTheDocument();
		expect(screen.getByText('John')).toBeInTheDocument();
		expect(screen.getByText('Age:')).toBeInTheDocument();
		expect(screen.getByText('30')).toBeInTheDocument();
	});

	test('skips rows where value is missing', () => {
		const testData = [
			{ label: 'Name', value: 'John' },
			{ label: 'Empty', value: null },
			{ label: 'Undefined', value: undefined },
			{ label: 'BlankString', value: '' }, // Depending on logic, empty string might be falsy
		];
		render(<InfoTable data={testData} />);

		expect(screen.getByText('Name:')).toBeInTheDocument();
		expect(screen.queryByText('Empty:')).not.toBeInTheDocument();
		expect(screen.queryByText('Undefined:')).not.toBeInTheDocument();
		expect(screen.queryByText('BlankString:')).not.toBeInTheDocument();
	});
});
