/**
 * Frontend Entry Point
 * Mounts the React application and wraps it with global context providers.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Providers } from './context/Providers';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
	<Providers>
		<App />
	</Providers>
);