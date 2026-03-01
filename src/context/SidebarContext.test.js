import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { useAuth } from './AuthContext';
import { updateUserPreferences } from '../config/data/firebase';

// Mock Auth
jest.mock('./AuthContext', () => ({
	useAuth: jest.fn(),
}));

// Mock Firebase Config
jest.mock('../config/data/firebase', () => ({
	updateUserPreferences: jest.fn(),
}));

jest.mock('../config/data/collections', () => ({
	collections: { members: 'members' },
}));

const TestConsumer = () => {
	const { collapsed, setCollapsed } = useSidebar();
	return (
		<div>
			<div data-testid='state'>{collapsed ? 'COLLAPSED' : 'EXPANDED'}</div>
			<button onClick={() => setCollapsed(!collapsed)}>Toggle</button>
		</div>
	);
};

describe('SidebarContext', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		localStorage.clear();
	});

	test('loads initial state from localStorage', () => {
		localStorage.setItem('pf_sidebar_collapsed', 'true');
		useAuth.mockReturnValue({ member: null, user: null });

		render(
			<SidebarProvider>
				<TestConsumer />
			</SidebarProvider>
		);

		expect(screen.getByTestId('state')).toHaveTextContent('COLLAPSED');
	});

	test('toggles state and saves to localStorage and DB', () => {
		const mockUser = { uid: 'user123' };
		useAuth.mockReturnValue({ member: {}, user: mockUser });

		render(
			<SidebarProvider>
				<TestConsumer />
			</SidebarProvider>
		);

		const toggleBtn = screen.getByText('Toggle');

		// Initial (default false/EXPANDED because localStorage is empty)
		expect(screen.getByTestId('state')).toHaveTextContent('EXPANDED');

		// Click Toggle
		fireEvent.click(toggleBtn);

		// Expect Change
		expect(screen.getByTestId('state')).toHaveTextContent('COLLAPSED');

		// Expect LocalStorage Update
		expect(localStorage.getItem('pf_sidebar_collapsed')).toBe('true');

		// Expect DB Update
		expect(updateUserPreferences).toHaveBeenCalledWith('user123', 'members', { sidebarCollapsed: true });
	});
});
