import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Providers } from './context/Providers';

// Mock ReactDOM.createRoot
jest.mock('react-dom/client', () => ({
	createRoot: jest.fn(),
}));

// Mock the components
jest.mock('./App', () => () => <div data-testid='app-mock' />);
jest.mock('./context/Providers', () => ({
	Providers: ({ children }) => <div data-testid='providers-mock'>{children}</div>,
}));

describe('src/index.js', () => {
	it('renders the App within the Providers component', () => {
		const mockRender = jest.fn();
		const mockRoot = { render: mockRender };
		ReactDOM.createRoot.mockReturnValue(mockRoot);

		// Set up the root element
		const rootElement = document.createElement('div');
		rootElement.id = 'root';
		document.body.appendChild(rootElement);

		// Require the index.js file to execute it
		// We use require here to control *when* it runs
		require('./index.js');

		// Check that createRoot was called with the correct element
		expect(ReactDOM.createRoot).toHaveBeenCalledWith(rootElement);

		// Check that render was called with the correct component tree
		const expectedRender = (
			<Providers>
				<App />
			</Providers>
		);
		expect(mockRender).toHaveBeenCalledWith(expectedRender);
	});
});
