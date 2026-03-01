import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApplicationViewer from './ApplicationViewer';
import { useTheme } from '@mui/material/styles';

// Mock Dependencies
jest.mock('@mui/material/styles', () => ({
	...jest.requireActual('@mui/material/styles'),
	useTheme: jest.fn(),
}));

jest.mock('../table/Table', () => (props) => <div data-testid='mock-collapsable-table'>{props.data.length} Applications</div>);

describe('ApplicationViewer Component', () => {
	const mockOnClose = jest.fn();
	const mockApplications = ['app1', 'app2'];

	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ palette: { mode: 'light' } });
	});

	it('renders the table when open and applications are provided', () => {
		render(<ApplicationViewer open={true} onClose={mockOnClose} applications={mockApplications} />);

		expect(screen.getByText('Application File')).toBeInTheDocument();
		const table = screen.getByTestId('mock-collapsable-table');
		expect(table).toBeInTheDocument();
	});

	it('calls onClose when the close button is clicked', () => {
		render(<ApplicationViewer open={true} onClose={mockOnClose} applications={[]} />);

		const closeButton = screen.getByTestId('CloseIcon');
		fireEvent.click(closeButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	// --- THIS IS THE FIX ---
	it('is hidden when open is false', async () => {
		const { rerender } = render(<ApplicationViewer open={true} onClose={mockOnClose} applications={[]} />);

		// Find the drawer paper element
		const drawerPaper = screen.getByText('Application File').closest('.MuiDrawer-paper');

		// When open, it should be visible (or not have visibility: hidden)
		expect(drawerPaper).not.toHaveStyle('visibility: hidden');

		// Re-render with open={false}
		rerender(<ApplicationViewer open={false} onClose={mockOnClose} applications={[]} />);
        // MUI adds `visibility: hidden` when a persistent drawer is closed
        // We must WAIT for the transition animation to finish
        await waitFor(() => {
            expect(drawerPaper).toHaveStyle('visibility: hidden');
        });
	});
});
