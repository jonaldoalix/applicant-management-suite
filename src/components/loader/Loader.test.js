import React from 'react';
import { render } from '@testing-library/react';
import Loader from './Loader';

describe('Loader Component', () => {
	test('renders circular progress', () => {
		const { container } = render(<Loader />);
		// Check if MUI CircularProgress class exists
		expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
	});
});
