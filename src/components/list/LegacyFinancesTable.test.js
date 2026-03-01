import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LegacyFinancesTable from './LegacyFinancesTable';
import { useTheme } from '../../context/ThemeContext';

// --- Mocks ---
jest.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

describe('LegacyFinancesTable', () => {
	const mockData = [
		{
			id: 'row1',
			year: 2023,
			total_allotted_disbursement: 5000,
			prior_year_clawback: 0,
			renewable_scholarships: [{ scout_name: 'Scout A', grade: 12, total_disbursement: 1000 }],
			non_renewable_grants: [],
			non_sg_items: [],
			financial_summary: {
				scholarships_grants: { amount_available: 4000 },
				non_scholarship_items: { amount_available: 1000 },
			},
		},
	];

	beforeEach(() => {
		useTheme.mockReturnValue({ darkMode: false, boxShadow: 'none' });
	});

	test('renders table headers and data', () => {
		render(<LegacyFinancesTable data={mockData} />);

		expect(screen.getByText('Year')).toBeInTheDocument();
		expect(screen.getByText('2023')).toBeInTheDocument();
		expect(screen.getByText('$5,000.00')).toBeInTheDocument(); // formatted currency
	});

	test('renders detail view on expand', () => {
		render(<LegacyFinancesTable data={mockData} />);

		const expandBtn = screen.getByRole('button', { name: /expand row/i });
		fireEvent.click(expandBtn);

		// Check for content inside the collapsible area
		expect(screen.getByText('Renewable Scholarships')).toBeInTheDocument();
		expect(screen.getByText('Scout A')).toBeInTheDocument();
	});

	test('renders provided title if prop passed', () => {
		render(<LegacyFinancesTable data={mockData} titleIn='Historical Data' />);
		expect(screen.getByText('Historical Data')).toBeInTheDocument();
	});
});
