import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GoogleAutoComplete from './GoogleAutoComplete';

const mockGetPlacePredictions = jest.fn();
const mockAutocompleteService = jest.fn(() => ({
	getPlacePredictions: mockGetPlacePredictions,
}));

// Mock the global window.google object
global.window.google = {
	maps: {
		places: {
			AutocompleteService: mockAutocompleteService,
			PlacesServiceStatus: { OK: 'OK' },
		},
	},
};

const originalQuerySelector = document.querySelector.bind(document);

describe('GoogleAutoComplete', () => {
	const mockChangeLocation = jest.fn();
	const baseProps = {
		label: 'Location',
		location: null,
		changeLocation: mockChangeLocation,
		disabled: false,
	};

	beforeEach(() => {
		mockGetPlacePredictions.mockReset();
		mockChangeLocation.mockReset(); // Ensure mock is clean

		global.window.google.maps.places.AutocompleteService = jest.fn(() => ({
			getPlacePredictions: mockGetPlacePredictions,
		}));

		// Mock document.querySelector to handle the script check
		document.querySelector = jest.fn((selector) => {
			if (selector === '#google-maps') return null;
			if (selector === 'head') return document.head;
			return originalQuerySelector(selector);
		});
	});

	test('fetches predictions when user types', async () => {
		const mockPredictions = [{ description: '123 Main St, Anytown, USA' }];

		mockGetPlacePredictions.mockImplementation((request, callback) => {
			if (request.input === '123') {
				callback(mockPredictions, 'OK');
			} else {
				callback([], 'OK');
			}
		});

		render(<GoogleAutoComplete {...baseProps} />);

		// Wait for the service to be ready (it's called on the second render)
		await waitFor(() => {
			expect(global.window.google.maps.places.AutocompleteService).toHaveBeenCalled();
		});

		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: '123' } });

		// Wait for API to be called *with predictions*
		await waitFor(() => {
			expect(mockGetPlacePredictions).toHaveBeenCalledWith({ input: '123' }, expect.any(Function));
		});

		// Wait for the option to appear
		const option = await screen.findByText('123 Main St, Anytown, USA');
		expect(option).toBeInTheDocument();
	});

	test('calls changeLocation when an option is selected', async () => {
		const selectedPrediction = { description: '123 Main St, Anytown, USA' };

		mockGetPlacePredictions.mockImplementation((request, callback) => {
			if (request.input === '123') {
				callback([selectedPrediction], 'OK');
			} else {
				callback([], 'OK');
			}
		});

		render(<GoogleAutoComplete {...baseProps} />);

		// 1. Type in the input
		const input = screen.getByRole('combobox');
		fireEvent.change(input, { target: { value: '123' } });

		// 2. Wait for the option to appear (this implicitly waits for all effects)
		const option = await screen.findByRole('option', {
			name: '123 Main St, Anytown, USA',
		});

		// 3. Click the option
		fireEvent.click(option);

		// 4. Wait for the *result*
		await waitFor(() => {
			expect(mockChangeLocation).toHaveBeenCalledWith(selectedPrediction);
		});
	});

	test('displays existing location value if provided', () => {
		const existingLocation = { description: 'Saved Address' };
		render(<GoogleAutoComplete {...baseProps} location={existingLocation} />);

		// This will now pass because of the component fix
		expect(screen.getByRole('combobox')).toHaveValue('Saved Address');
	});
});
