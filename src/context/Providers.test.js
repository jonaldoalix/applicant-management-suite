import React from 'react';
import { render, screen } from '@testing-library/react';
import { Providers } from './Providers';

// Mock all child providers to isolate the testing of the Providers wrapper itself
vi.mock('./ConfigContext', () => ({ ConfigProvider: ({ children }) => <div>Config {children}</div>  }));
vi.mock('./AuthContext', () => ({ AuthProvider: ({ children }) => <div>Auth {children}</div>  }));
vi.mock('./ThemeContext', () => ({ ThemeProvider: ({ children }) => <div>Theme {children}</div>  }));
vi.mock('./SidebarContext', () => ({ SidebarProvider: ({ children }) => <div>Sidebar {children}</div>  }));
vi.mock('./AlertContext', () => ({ AlertProvider: ({ children }) => <div>Alert {children}</div>  }));
vi.mock('./DialogContext', () => ({ DialogProvider: ({ children }) => <div>Dialog {children}</div>  }));
vi.mock('./MailboxContext', () => ({ MailboxProvider: ({ children }) => <div>Mailbox {children}</div>  }));
vi.mock('./HelmetContext', () => ({ PageTitleProvider: ({ children }) => <div>PageTitle {children}</div>  }));
vi.mock('react-helmet-async', () => ({ HelmetProvider: ({ children }) => <div>Helmet {children}</div>  }));
vi.mock('react-router-dom', () => ({ BrowserRouter: ({ children }) => <div>Router {children}</div>  }));

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
