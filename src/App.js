/**
 * Main Application Component
 * Handles client-side routing, layout rendering, and global event logging.
 */

import './app.scss';
import { useEffect, useRef } from 'react';
import { useLocation, Route, Routes } from 'react-router-dom';
import { Box } from '@mui/material';

import { useConfig } from './context/ConfigContext';
import { Pages } from './config/Constants';
import { siteManifest } from './config/navigation/siteManifest';
import { logEvent } from './config/data/firebase';

// Component: Logs route changes to Firebase Analytics
const RouteChangeLogger = () => {
	const location = useLocation();
	const previousPath = useRef('');

	useEffect(() => {
		if (previousPath.current !== location.pathname) {
			previousPath.current = location.pathname;
			logEvent(`Mapsd to ${location.pathname}`).catch(console.error);
		}
	}, [location]);

	return null;
};

function App() {
	const config = useConfig();

	// Recursively renders routes from the site manifest
	const renderRoutes = (manifest) => {
		return manifest
			.filter((page) => {
				// Filter out Member Onboarding if disabled in config
				return !(page.urlKey === Pages.registerMember && !config.MEMBER_ONBOARDING_PAGE_ENABLED);
			})
			.map((page) => {
				if (page.children) {
					return (
						<Route key={page.path} path={page.path} element={page.element}>
							{renderRoutes(page.children)}
						</Route>
					);
				}
				return <Route key={page.path} path={page.path} element={page.element} index={page.index} />;
			});
	};

	return (
		<Box sx={{ width: '100%', margin: 0, padding: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
			{config.ROUTE_LOGGING_ENABLED && <RouteChangeLogger />}
			<Routes>{renderRoutes(siteManifest)}</Routes>
		</Box>
	);
}

export default App;
