import React from 'react';
import { render, screen } from '@testing-library/react';
import Section from './Section';

describe('Section Component', () => {
	test('renders title and children', () => {
		render(
			<Section title='My Section'>
				<p>Content</p>
			</Section>
		);

		expect(screen.getByText('My Section')).toBeInTheDocument();
		expect(screen.getByText('Content')).toBeInTheDocument();
		// Check for MUI Divider
		expect(screen.getByRole('separator')).toBeInTheDocument();
	});

	test('returns null if children are missing', () => {
		const { container } = render(<Section title='Empty' />);
		expect(container).toBeEmptyDOMElement();
	});
});
