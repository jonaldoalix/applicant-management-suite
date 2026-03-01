/**
 * Google Maps Autocomplete Component
 * Wraps the Google Maps Places API to provide address suggestions in a MUI Autocomplete input.
 * Dynamically loads the Google Maps script if not already present.
 */

import React, { useState, useEffect } from 'react';
import { TextField, Autocomplete } from '@mui/material';
import PropTypes from 'prop-types';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_googleApiKey || 'NO_KEY_GIVEN';

// Helper: Dynamically load the Google Maps script
function loadScript(src, position, id) {
	if (!position) return;
	const script = document.createElement('script');
	script.async = true;
	script.defer = true;
	script.id = id;
	script.src = src;
	script.onload = () => {};
	script.onerror = () => console.error('Google Maps script failed to load');
	position.appendChild(script);
}

const autocompleteService = { current: null };

export default function GoogleMaps({ label, location, changeLocation, disabled }) {
	const [inputValue, setInputValue] = useState(location?.description || '');
	const [options, setOptions] = useState([]);
	const [scriptLoaded, setScriptLoaded] = useState(false);

	// Effect 1: Load Script on mount
	useEffect(() => {
		if (typeof globalThis !== 'undefined' && !document.querySelector('#google-maps')) {
			loadScript(`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`, document.querySelector('head'), 'google-maps');
		}
	}, []);

	// Effect 2: Initialize Service and Fetch Predictions
	useEffect(() => {
		if (!globalThis.google?.maps) return;

		if (!scriptLoaded) {
			setScriptLoaded(true);
			return;
		}

		if (!autocompleteService.current) {
			autocompleteService.current = new globalThis.google.maps.places.AutocompleteService();
		}

		// Guard: Handle empty input
		if (inputValue === '') {
			setOptions(location ? [location] : []);
			return;
		}

		// Guard: Prevent re-fetching if input matches selected location
		if (location && inputValue === location.description) {
			setOptions([location]);
			return;
		}

		autocompleteService.current.getPlacePredictions({ input: inputValue }, (results, status) => {
			if (status === globalThis.google.maps.places.PlacesServiceStatus.OK && results) {
				setOptions(results);
			} else {
				setOptions([]);
			}
		});
	}, [scriptLoaded, inputValue, location, setOptions, setScriptLoaded]);

	return (
		<Autocomplete
			id='google-autocomplete'
			fullWidth
			sx={{ height: 50, my: 2 }}
			getOptionLabel={(option) => option?.description || ''}
			options={options}
			disabled={disabled}
			value={location || null}
			inputValue={inputValue}
			isOptionEqualToValue={(option, value) => (option?.description || '') === (value?.description || '')}
			onChange={(event, newValue) => {
				setOptions(newValue ? [newValue, ...options] : options);
				changeLocation(newValue);
			}}
			onInputChange={(event, newInputValue, reason) => {
				if (reason === 'input') {
					setInputValue(newInputValue);
				}
			}}
			renderInput={(params) => <TextField {...params} label={label} placeholder='Start typing address...' />}
		/>
	);
}

GoogleMaps.propTypes = {
	label: PropTypes.string.isRequired,
	disabled: PropTypes.bool,
	location: PropTypes.object,
	changeLocation: PropTypes.func.isRequired,
};
