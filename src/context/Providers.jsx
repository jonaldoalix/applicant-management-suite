/**
 * GLOBAL CONTEXT COMPOSER
 * ---------------------------------------------------------------------------
 * This component wraps the entire application with all necessary Context Providers.
 *
 * * ARCHITECTURE (THE DEPENDENCY CASCADE):
 * The order of these providers is CRITICAL. Data flows downwards.
 *
 * 1. ConfigProvider: Fetches global settings (blocking load).
 * 2. AuthProvider: Identifies the user (depends on Firebase).
 * 3. ThemeProvider: Styles the app (depends on Config for colors, Auth for preferences).
 * 4. SidebarProvider: Manages navigation (depends on Auth permissions).
 * 5. UI Utilities (Alert, Dialog): Global interactive elements.
 * 6. Feature Contexts (Mailbox, Helmet): Specialized global features.
 * 7. Router: Enables navigation.
 *
 * * NOTE:
 * Contexts like 'ApplicationContext' and 'MeetingContext' are NOT listed here.
 * They are "Scoped Contexts" applied only to specific routes to improve performance.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Context Imports
import { ConfigProvider } from './ConfigContext';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { SidebarProvider } from './SidebarContext';
import { AlertProvider } from './AlertContext';
import { DialogProvider } from './DialogContext';
import { MailboxProvider } from './MailboxContext';
import { PageTitleProvider } from './HelmetContext';

export const Providers = ({ children }) => {
	return (
		// 1. Data Layer (Settings & Identity)
		<ConfigProvider>
			<AuthProvider>
				{/* 2. Visual Layer (Theme & Navigation) */}
				<ThemeProvider>
					<SidebarProvider>
						{/* 3. Interaction Layer (Popups & Toasts) */}
						<AlertProvider>
							<DialogProvider>
								{/* 4. Feature Layer (Messaging & SEO) */}
								<MailboxProvider>
									<HelmetProvider>
										<PageTitleProvider>
											{/* 5. Routing Layer */}
											<BrowserRouter>{children}</BrowserRouter>
										</PageTitleProvider>
									</HelmetProvider>
								</MailboxProvider>
							</DialogProvider>
						</AlertProvider>
					</SidebarProvider>
				</ThemeProvider>
			</AuthProvider>
		</ConfigProvider>
	);
};

Providers.propTypes = {
	children: PropTypes.node.isRequired,
};