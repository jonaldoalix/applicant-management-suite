// src/context/HelmetContext.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { PageTitleProvider, useTitle } from './HelmetContext';

// Mock constants
jest.mock('../config/Constants', () => ({
	brand: {
		organizationShortName: 'Org',
		metaDescription: 'Desc',
		url: 'http://test.com',
		ogImage: '/img.jpg',
	},
}));

const TestComponent = () => {
	useTitle({ title: 'New Page', appear: true });
	return <div>Page Loaded</div>;
};

describe('HelmetContext', () => {
	test('updates title via hook', () => {
		// We wrap in HelmetProvider because HelmetContext uses Helmet
		render(
			<HelmetProvider>
				<PageTitleProvider>
					<TestComponent />
				</PageTitleProvider>
			</HelmetProvider>
		);

		expect(screen.getByText('Page Loaded')).toBeInTheDocument();
		// Since React Helmet is asynchronous and modifies the head,
		// checking document.title is the integration test way.
		// Ideally, we wait for the title to change.
		return expect(
			new Promise((resolve) => {
				setTimeout(() => {
					resolve(document.title);
				}, 100);
			})
		).resolves.toBe('New Page | Org');
	});
});
