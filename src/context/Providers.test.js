import React from 'react';
import { render, screen } from '@testing-library/react';
import { Providers } from './Providers';

// Mock all child providers to isolate the testing of the Providers wrapper itself
jest.mock('./ConfigContext', () => ({ ConfigProvider: ({ children }) => <div>Config {children}</div> }));
jest.mock('./AuthContext', () => ({ AuthProvider: ({ children }) => <div>Auth {children}</div> }));
jest.mock('./ThemeContext', () => ({ ThemeProvider: ({ children }) => <div>Theme {children}</div> }));
jest.mock('./SidebarContext', () => ({ SidebarProvider: ({ children }) => <div>Sidebar {children}</div> }));
jest.mock('./AlertContext', () => ({ AlertProvider: ({ children }) => <div>Alert {children}</div> }));
jest.mock('./DialogContext', () => ({ DialogProvider: ({ children }) => <div>Dialog {children}</div> }));
jest.mock('./MailboxContext', () => ({ MailboxProvider: ({ children }) => <div>Mailbox {children}</div> }));
jest.mock('./HelmetContext', () => ({ PageTitleProvider: ({ children }) => <div>PageTitle {children}</div> }));
jest.mock('react-helmet-async', () => ({ HelmetProvider: ({ children }) => <div>Helmet {children}</div> }));
jest.mock('react-router-dom', () => ({ BrowserRouter: ({ children }) => <div>Router {children}</div> }));

describe('Providers', () => {
	test('renders the provider tree correctly', () => {
		render(
			<Providers>
				<div data-testid='app-content'>App</div>
			</Providers>
		);

		expect(screen.getByTestId('app-content')).toBeInTheDocument();
		// Verify nesting
		expect(screen.getByText(/Config/)).toBeInTheDocument();
		expect(screen.getByText(/Auth/)).toBeInTheDocument();
		expect(screen.getByText(/Theme/)).toBeInTheDocument();
	});
});
