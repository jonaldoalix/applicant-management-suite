import React from 'react';
import { render, screen } from '@testing-library/react';
import { VisuallyHiddenInput } from './VisuallyHiddenInput'; // It's a named export

describe('VisuallyHiddenInput Component', () => {
	test('renders as an input element and accepts props', () => {
		// Render the component with some standard input props
		render(<VisuallyHiddenInput type='file' data-testid='file-input' />);

		// Find the element
		const input = screen.getByTestId('file-input');

		// Check that it is, in fact, an input
		expect(input.tagName).toBe('INPUT');

		// Check that it accepted the props
		expect(input).toHaveAttribute('type', 'file');
	});
});
